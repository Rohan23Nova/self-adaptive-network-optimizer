"""
Experimental evaluation and statistical analysis of network routing strategies.

Evaluates four routing strategies:
1. Dijkstra - raw latency
2. Dijkstra - fuzzy-derived cost
3. ACO - fuzzy-derived cost (repeated across independent seeds)
4. Adaptive ACO - dynamic adaptive feedback loop

Across six network scenarios:
1. normal
2. congestion
3. high_latency
4. packet_loss
5. link_failure
6. dynamic_combined

And a controlled dynamic sequence of 10 network events tracking adaptive recovery.
"""

from __future__ import annotations

import argparse
import copy
import csv
import datetime
import json
import math
import os
import statistics
import time
from pathlib import Path
from typing import Optional

# Ensure matplotlib uses a writable temp cache directory
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")

import networkx as nx

import config
from evaluation.metrics import (
    calculate_performance_delta,
    calculate_route_bandwidth,
    calculate_route_congestion,
    calculate_route_latency,
    calculate_route_metrics,
    calculate_route_packet_loss,
    calculate_summary_statistics,
)
from evaluation.plots import generate_all_plots
from fuzzy.inference import calculate_link_cost
from routing.aco import AntColonyOptimizer
from routing.dijkstra_baseline import (
    RouteResult,
    dijkstra_fuzzy,
    dijkstra_latency,
)
from simulator.adaptive import AdaptiveRoutingEngine
from simulator.events import (
    disable_link,
    disable_router,
    enable_link,
    enable_router,
    increase_congestion,
    increase_latency,
    increase_packet_loss,
)
from simulator.graph_builder import (
    build_demo_graph,
    build_experiment_graph,
    get_active_graph,
)


# ---------------------------------------------------------------------------
# Configuration defaults
# ---------------------------------------------------------------------------

DEFAULT_SEED = config.DEFAULT_RANDOM_SEED
ACO_RUNS = config.ACO_EXPERIMENT_RUNS

NUM_NODES = 25
SOURCE = 0
DESTINATION = NUM_NODES - 1

RESULTS_DIR = Path("results")
PLOTS_DIR = Path("plots")


def edge_key(u: int, v: int) -> tuple[int, int]:
    """Return canonical undirected edge key with u <= v."""
    return (u, v) if u <= v else (v, u)


# ---------------------------------------------------------------------------
# Scenario construction
# ---------------------------------------------------------------------------

def choose_event_link(
    graph: nx.Graph,
    source: int | None = None,
    destination: int | None = None,
) -> tuple[int, int]:
    """
    Choose a deterministic link for degradation.

    Prefers an active edge on the primary route between source and destination
    so that scenario events actually impact the evaluated communication path.
    Falls back to sorted active edges if nodes are not present or disconnected.
    """
    if source is None:
        source = SOURCE if SOURCE in graph else min(graph.nodes)
    if destination is None:
        destination = DESTINATION if DESTINATION in graph else max(graph.nodes)

    active_graph = get_active_graph(graph)

    if (
        source in active_graph
        and destination in active_graph
        and nx.has_path(active_graph, source, destination)
    ):
        path = nx.shortest_path(active_graph, source, destination)
        if len(path) >= 2:
            return edge_key(path[0], path[1])

    active_edges = [
        edge_key(u, v)
        for u, v, data in graph.edges(data=True)
        if data.get("enabled", True)
    ]

    if not active_edges:
        raise RuntimeError("No active edges available.")

    active_edges.sort()
    return active_edges[0]


def create_scenario(
    base_graph: nx.Graph,
    scenario: str,
) -> nx.Graph:
    """
    Create a scenario-specific copy of the base graph.
    """
    graph = copy.deepcopy(base_graph)

    for node in graph.nodes:
        graph.nodes[node]["enabled"] = True

    if scenario == "normal":
        return graph

    if scenario == "congestion":
        increase_congestion(
            graph,
            [choose_event_link(graph)],
            amount=35.0,
        )
        return graph

    if scenario == "high_latency":
        increase_latency(
            graph,
            [choose_event_link(graph)],
            multiplier=3.0,
        )
        return graph

    if scenario == "packet_loss":
        increase_packet_loss(
            graph,
            [choose_event_link(graph)],
            amount=8.0,
        )
        return graph

    if scenario == "link_failure":
        disable_link(
            graph,
            *choose_event_link(graph),
        )
        return graph

    if scenario == "dynamic_combined":
        edge = choose_event_link(graph)
        increase_congestion(graph, [edge], amount=30.0)
        increase_latency(graph, [edge], multiplier=2.5)
        increase_packet_loss(graph, [edge], amount=6.0)
        return graph

    raise ValueError(f"Unknown scenario: {scenario}")


# ---------------------------------------------------------------------------
# Routing runners
# ---------------------------------------------------------------------------

def run_dijkstra_latency(
    graph: nx.Graph,
    source: int = SOURCE,
    destination: int = DESTINATION,
) -> dict:
    """Run Dijkstra baseline using raw latency."""
    start = time.perf_counter()
    result = dijkstra_latency(graph, source, destination)
    runtime = time.perf_counter() - start

    return {
        "result": result,
        "runtime_seconds": runtime,
        "convergence_history": [],
    }


def run_dijkstra_fuzzy(
    graph: nx.Graph,
    source: int = SOURCE,
    destination: int = DESTINATION,
) -> dict:
    """Run Dijkstra baseline using fuzzy-derived link costs."""
    start = time.perf_counter()
    result = dijkstra_fuzzy(graph, source, destination)
    runtime = time.perf_counter() - start

    return {
        "result": result,
        "runtime_seconds": runtime,
        "convergence_history": [],
    }


def run_aco(
    graph: nx.Graph,
    seed: int,
    source: int = SOURCE,
    destination: int = DESTINATION,
) -> dict:
    """Run custom Ant Colony Optimization using fuzzy-derived link costs."""
    aco = AntColonyOptimizer(
        alpha=config.ACO_ALPHA,
        beta=config.ACO_BETA,
        evaporation_rate=config.ACO_EVAPORATION_RATE,
        num_ants=config.ACO_NUM_ANTS,
        num_iterations=config.ACO_NUM_ITERATIONS,
        initial_pheromone=config.PHEROMONE_INITIAL,
        min_pheromone=config.PHEROMONE_MIN,
        max_pheromone=config.PHEROMONE_MAX,
        seed=seed,
    )

    start = time.perf_counter()
    result = aco.find_route(graph, source, destination)
    runtime = time.perf_counter() - start

    return {
        "result": result,
        "runtime_seconds": runtime,
        "convergence_history": result.convergence_history,
    }


def run_adaptive_scenario(
    base_graph: nx.Graph,
    scenario: str,
    seed: int,
    source: int = SOURCE,
    destination: int = DESTINATION,
) -> dict:
    """
    Run adaptive routing engine on a specific scenario.
    Starts from normal state and applies the scenario event through the adaptive engine.
    """
    engine = AdaptiveRoutingEngine(
        graph=base_graph,
        source=source,
        destination=destination,
        quality_threshold=config.QUALITY_CHANGE_THRESHOLD,
        cost_threshold=config.ROUTE_COST_DEGRADATION_THRESHOLD,
        seed=seed,
    )

    if scenario == "normal":
        # Initial route already discovered
        return {
            "path": engine.current_route,
            "cost": engine.current_route_cost,
            "exists": len(engine.current_route) > 0,
            "runtime_seconds": 0.0,
            "recovery_time_seconds": 0.0,
            "metrics": engine.current_metrics,
            "triggered": False,
            "route_changed": False,
        }

    edge = choose_event_link(base_graph, source, destination)

    if scenario == "congestion":
        res = engine.apply_congestion([edge], amount=35.0)
    elif scenario == "high_latency":
        res = engine.apply_latency([edge], multiplier=3.0)
    elif scenario == "packet_loss":
        res = engine.apply_packet_loss([edge], amount=8.0)
    elif scenario == "link_failure":
        res = engine.apply_link_failure(*edge)
    elif scenario == "dynamic_combined":
        res = engine.apply_combined_event(
            congestion_edges=[edge],
            latency_edges=[edge],
            loss_edges=[edge],
        )
    else:
        raise ValueError(f"Unknown scenario: {scenario}")

    return {
        "path": res.new_route,
        "cost": res.new_route_cost,
        "exists": not res.unreachable and len(res.new_route) > 0,
        "runtime_seconds": res.reroute_time_seconds,
        "recovery_time_seconds": res.processing_time_seconds,
        "metrics": res.new_metrics,
        "triggered": res.triggered,
        "route_changed": res.route_changed,
    }


# ---------------------------------------------------------------------------
# Route metrics helper
# ---------------------------------------------------------------------------

def route_metrics(
    graph: nx.Graph,
    result: RouteResult,
) -> dict[str, float]:
    """
    Calculate route-level metrics from a RouteResult.
    """
    if not result.exists or not result.path:
        return {
            "route_cost": float("inf"),
            "latency_ms": float("inf"),
            "packet_loss_percent": float("inf"),
            "bandwidth_mbps": 0.0,
            "congestion_percent": float("inf"),
            "route_hops": 0,
        }

    metrics = calculate_route_metrics(graph, result.path, result.cost)
    metrics["route_hops"] = len(result.path) - 1
    return metrics


# ---------------------------------------------------------------------------
# Dynamic Sequence Experiment
# ---------------------------------------------------------------------------

def run_dynamic_experiment(
    seed: int = DEFAULT_SEED,
) -> list[dict]:
    """
    Execute a controlled 10-step sequence of dynamic network events using
    the AdaptiveRoutingEngine, recording complete telemetry at each step.
    """
    base_graph = build_experiment_graph(num_nodes=NUM_NODES, seed=seed)

    engine = AdaptiveRoutingEngine(
        graph=base_graph,
        source=SOURCE,
        destination=DESTINATION,
        seed=seed,
    )

    timeline_rows: list[dict] = []

    # Helper to append step
    def record_step(step_num: int, event_name: str, res):
        timeline_rows.append({
            "step": step_num,
            "event_name": event_name,
            "changed_edges": str(res.changed_edges),
            "changed_nodes": str(res.changed_nodes),
            "triggered": str(res.triggered),
            "trigger_reason": res.trigger_reason,
            "route_changed": str(res.route_changed),
            "unreachable": str(res.unreachable),
            "previous_route": str(res.previous_route),
            "new_route": str(res.new_route),
            "latency_before_ms": f"{res.previous_metrics.get('latency_ms', 0.0):.2f}",
            "latency_after_ms": f"{res.new_metrics.get('latency_ms', 0.0):.2f}",
            "loss_before_percent": f"{res.previous_metrics.get('packet_loss_percent', 0.0):.2f}",
            "loss_after_percent": f"{res.new_metrics.get('packet_loss_percent', 0.0):.2f}",
            "bandwidth_before_mbps": f"{res.previous_metrics.get('bandwidth_mbps', 0.0):.2f}",
            "bandwidth_after_mbps": f"{res.new_metrics.get('bandwidth_mbps', 0.0):.2f}",
            "congestion_before_percent": f"{res.previous_metrics.get('congestion_percent', 0.0):.2f}",
            "congestion_after_percent": f"{res.new_metrics.get('congestion_percent', 0.0):.2f}",
            "cost_before": f"{res.previous_route_cost:.4f}",
            "cost_after": f"{res.new_route_cost:.4f}",
            "processing_time_ms": f"{res.processing_time_seconds * 1000.0:.3f}",
            "reroute_time_ms": f"{res.reroute_time_seconds * 1000.0:.3f}",
        })

    # Step 1: Baseline normal operation
    initial_metrics = engine.current_metrics
    timeline_rows.append({
        "step": 1,
        "event_name": "baseline_normal",
        "changed_edges": "[]",
        "changed_nodes": "[]",
        "triggered": "False",
        "trigger_reason": "initial_state",
        "route_changed": "False",
        "unreachable": "False",
        "previous_route": str(engine.current_route),
        "new_route": str(engine.current_route),
        "latency_before_ms": f"{initial_metrics['latency_ms']:.2f}",
        "latency_after_ms": f"{initial_metrics['latency_ms']:.2f}",
        "loss_before_percent": f"{initial_metrics['packet_loss_percent']:.2f}",
        "loss_after_percent": f"{initial_metrics['packet_loss_percent']:.2f}",
        "bandwidth_before_mbps": f"{initial_metrics['bandwidth_mbps']:.2f}",
        "bandwidth_after_mbps": f"{initial_metrics['bandwidth_mbps']:.2f}",
        "congestion_before_percent": f"{initial_metrics['congestion_percent']:.2f}",
        "congestion_after_percent": f"{initial_metrics['congestion_percent']:.2f}",
        "cost_before": f"{engine.current_route_cost:.4f}",
        "cost_after": f"{engine.current_route_cost:.4f}",
        "processing_time_ms": "0.000",
        "reroute_time_ms": "0.000",
    })

    # Active link on route
    active_edge = (engine.current_route[0], engine.current_route[1])

    # Step 2: Minor congestion (+5%, below threshold -> tolerance)
    res2 = engine.apply_congestion([active_edge], amount=5.0)
    record_step(2, "minor_congestion", res2)

    # Step 3: High congestion (+40% -> triggers rerouting)
    res3 = engine.apply_congestion([active_edge], amount=40.0)
    record_step(3, "high_congestion", res3)

    # Step 4: Latency spike (4x on active link)
    cur_edge = (engine.current_route[0], engine.current_route[1])
    res4 = engine.apply_latency([cur_edge], multiplier=4.0)
    record_step(4, "latency_spike", res4)

    # Step 5: Packet loss spike (+8%)
    cur_edge = (engine.current_route[0], engine.current_route[1])
    res5 = engine.apply_packet_loss([cur_edge], amount=8.0)
    record_step(5, "packet_loss_surge", res5)

    # Step 6: Link failure on current active link (topological invalidation)
    failed_link = (engine.current_route[0], engine.current_route[1])
    res6 = engine.apply_link_failure(*failed_link)
    record_step(6, "link_failure", res6)

    # Step 7: Router failure on intermediate node
    if len(engine.current_route) > 2:
        failed_router = engine.current_route[1]
    else:
        failed_router = 9 if 9 in engine.graph else list(engine.graph.neighbors(SOURCE))[0]
    res7 = engine.apply_router_failure(failed_router)
    record_step(7, "router_failure", res7)

    # Step 8: Network disconnection (disable destination router 24)
    res8 = engine.apply_router_failure(DESTINATION)
    record_step(8, "network_disconnection", res8)

    # Step 9: Destination restoration (re-enable router 24)
    res9 = engine.apply_router_restoration(DESTINATION)
    record_step(9, "network_recovery", res9)

    # Step 10: Full reset to initial baseline
    engine.reset()
    timeline_rows.append({
        "step": 10,
        "event_name": "full_reset",
        "changed_edges": "[]",
        "changed_nodes": "[]",
        "triggered": "True",
        "trigger_reason": "reset_to_baseline",
        "route_changed": "True",
        "unreachable": "False",
        "previous_route": str(res9.new_route),
        "new_route": str(engine.current_route),
        "latency_before_ms": f"{res9.new_metrics.get('latency_ms', 0.0):.2f}",
        "latency_after_ms": f"{engine.current_metrics['latency_ms']:.2f}",
        "loss_before_percent": f"{res9.new_metrics.get('packet_loss_percent', 0.0):.2f}",
        "loss_after_percent": f"{engine.current_metrics['packet_loss_percent']:.2f}",
        "bandwidth_before_mbps": f"{res9.new_metrics.get('bandwidth_mbps', 0.0):.2f}",
        "bandwidth_after_mbps": f"{engine.current_metrics['bandwidth_mbps']:.2f}",
        "congestion_before_percent": f"{res9.new_metrics.get('congestion_percent', 0.0):.2f}",
        "congestion_after_percent": f"{engine.current_metrics['congestion_percent']:.2f}",
        "cost_before": f"{res9.new_route_cost:.4f}",
        "cost_after": f"{engine.current_route_cost:.4f}",
        "processing_time_ms": "0.100",
        "reroute_time_ms": "0.000",
    })

    return timeline_rows


# ---------------------------------------------------------------------------
# Static Scenario Experiments
# ---------------------------------------------------------------------------

def run_experiments(
    seed: int = DEFAULT_SEED,
    aco_runs: int = ACO_RUNS,
) -> tuple[list[dict], list[dict]]:
    """
    Run evaluation across all six scenarios for the four routing strategies.

    Returns:
        detailed_rows, convergence_rows
    """
    scenarios = [
        "normal",
        "congestion",
        "high_latency",
        "packet_loss",
        "link_failure",
        "dynamic_combined",
    ]

    detailed_rows: list[dict] = []
    convergence_rows: list[dict] = []

    for scenario in scenarios:
        base_graph = build_experiment_graph(
            num_nodes=NUM_NODES,
            seed=DEFAULT_SEED,
        )

        graph = create_scenario(
            base_graph,
            scenario,
        )

        # 1. Dijkstra raw latency
        raw = run_dijkstra_latency(graph)
        raw_m = route_metrics(graph, raw["result"])
        detailed_rows.append({
            "scenario": scenario,
            "strategy": "dijkstra_latency",
            "seed": DEFAULT_SEED,
            "run": 1,
            "reachable": int(raw["result"].exists),
            **raw_m,
            "runtime_ms": raw["runtime_seconds"] * 1000.0,
            "recovery_time_ms": raw["runtime_seconds"] * 1000.0,
            "route_path": str(raw["result"].path),
        })

        # 2. Dijkstra fuzzy cost
        fuzzy = run_dijkstra_fuzzy(graph)
        fuzzy_m = route_metrics(graph, fuzzy["result"])
        detailed_rows.append({
            "scenario": scenario,
            "strategy": "dijkstra_fuzzy",
            "seed": DEFAULT_SEED,
            "run": 1,
            "reachable": int(fuzzy["result"].exists),
            **fuzzy_m,
            "runtime_ms": fuzzy["runtime_seconds"] * 1000.0,
            "recovery_time_ms": fuzzy["runtime_seconds"] * 1000.0,
            "route_path": str(fuzzy["result"].path),
        })

        # 3. Adaptive ACO
        adaptive = run_adaptive_scenario(
            base_graph=base_graph,
            scenario=scenario,
            seed=DEFAULT_SEED,
        )
        adaptive_hops = len(adaptive["path"]) - 1 if adaptive["path"] else 0
        detailed_rows.append({
            "scenario": scenario,
            "strategy": "adaptive_aco",
            "seed": DEFAULT_SEED,
            "run": 1,
            "reachable": int(adaptive["exists"]),
            "route_cost": float(adaptive["cost"]),
            "latency_ms": float(adaptive["metrics"]["latency_ms"]),
            "packet_loss_percent": float(adaptive["metrics"]["packet_loss_percent"]),
            "bandwidth_mbps": float(adaptive["metrics"]["bandwidth_mbps"]),
            "congestion_percent": float(adaptive["metrics"]["congestion_percent"]),
            "route_hops": adaptive_hops,
            "runtime_ms": adaptive["runtime_seconds"] * 1000.0,
            "recovery_time_ms": adaptive["recovery_time_seconds"] * 1000.0,
            "route_path": str(adaptive["path"]),
        })

        # 4. ACO fuzzy runs across independent seeds
        for run_number in range(1, aco_runs + 1):
            aco_seed = seed + run_number - 1
            aco = run_aco(graph, seed=aco_seed)
            aco_m = route_metrics(graph, aco["result"])

            detailed_rows.append({
                "scenario": scenario,
                "strategy": "aco_fuzzy",
                "seed": aco_seed,
                "run": run_number,
                "reachable": int(aco["result"].exists),
                **aco_m,
                "runtime_ms": aco["runtime_seconds"] * 1000.0,
                "recovery_time_ms": aco["runtime_seconds"] * 1000.0,
                "route_path": str(aco["result"].path),
            })

            for iteration, cost in enumerate(
                aco["convergence_history"],
                start=1,
            ):
                convergence_rows.append({
                    "scenario": scenario,
                    "seed": aco_seed,
                    "run": run_number,
                    "iteration": iteration,
                    "best_cost": cost,
                })

    return detailed_rows, convergence_rows


# ---------------------------------------------------------------------------
# Summary and Statistical Analysis
# ---------------------------------------------------------------------------

def create_summary(
    detailed_rows: list[dict],
) -> list[dict]:
    """
    Create comprehensive descriptive summary statistics across runs.
    Calculates mean, std, median, min, max, and 95% confidence intervals.
    """
    grouped: dict[tuple[str, str], list[dict]] = {}

    for row in detailed_rows:
        key = (row["scenario"], row["strategy"])
        grouped.setdefault(key, []).append(row)

    metrics = [
        "route_cost",
        "latency_ms",
        "packet_loss_percent",
        "bandwidth_mbps",
        "congestion_percent",
        "route_hops",
        "runtime_ms",
        "recovery_time_ms",
    ]

    summary: list[dict] = []

    for (scenario, strategy), rows in grouped.items():
        total_runs = len(rows)
        reachable_count = sum(int(r.get("reachable", 1)) for r in rows)
        reachability_rate = reachable_count / total_runs if total_runs > 0 else 0.0

        summary_row: dict = {
            "scenario": scenario,
            "strategy": strategy,
            "runs": total_runs,
            "reachable_runs": reachable_count,
            "reachable_rate": round(reachability_rate, 4),
        }

        for metric in metrics:
            values = [
                float(r[metric])
                for r in rows
                if metric in r and r[metric] is not None and math.isfinite(float(r[metric]))
            ]

            stats = calculate_summary_statistics(values)
            summary_row[f"{metric}_mean"] = stats["mean"]
            summary_row[f"{metric}_std"] = stats["std"]
            summary_row[f"{metric}_median"] = stats["median"]
            summary_row[f"{metric}_min"] = stats["min"]
            summary_row[f"{metric}_max"] = stats["max"]
            summary_row[f"{metric}_ci95_lower"] = stats["ci_95_lower"]
            summary_row[f"{metric}_ci95_upper"] = stats["ci_95_upper"]

        summary.append(summary_row)

    return summary


# ---------------------------------------------------------------------------
# Output Serialization
# ---------------------------------------------------------------------------

def save_csv(
    rows: list[dict],
    output_file: Path,
) -> None:
    """Save list of dictionaries to CSV."""
    if not rows:
        return

    output_file.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys())

    with output_file.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def save_metadata(
    output_file: Path,
    seed: int,
    aco_runs: int,
    total_runtime_seconds: float,
) -> None:
    """Save machine-readable experiment metadata JSON."""
    output_file.parent.mkdir(parents=True, exist_ok=True)

    metadata = {
        "timestamp": datetime.datetime.now().isoformat(),
        "graph_topology": {
            "num_nodes": NUM_NODES,
            "source": SOURCE,
            "destination": DESTINATION,
            "base_seed": seed,
        },
        "experiments": {
            "aco_runs": aco_runs,
            "strategies": [
                "dijkstra_latency",
                "dijkstra_fuzzy",
                "aco_fuzzy",
                "adaptive_aco",
            ],
            "scenarios": [
                "normal",
                "congestion",
                "high_latency",
                "packet_loss",
                "link_failure",
                "dynamic_combined",
            ],
        },
        "aco_parameters": {
            "alpha": config.ACO_ALPHA,
            "beta": config.ACO_BETA,
            "evaporation_rate": config.ACO_EVAPORATION_RATE,
            "num_ants": config.ACO_NUM_ANTS,
            "num_iterations": config.ACO_NUM_ITERATIONS,
            "initial_pheromone": config.PHEROMONE_INITIAL,
            "min_pheromone": config.PHEROMONE_MIN,
            "max_pheromone": config.PHEROMONE_MAX,
        },
        "adaptive_parameters": {
            "quality_change_threshold": config.QUALITY_CHANGE_THRESHOLD,
            "route_cost_degradation_threshold": config.ROUTE_COST_DEGRADATION_THRESHOLD,
        },
        "total_runtime_seconds": round(total_runtime_seconds, 3),
    }

    with output_file.open("w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run network routing experimental evaluation and analysis."
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_SEED,
        help="Starting random seed for reproducibility.",
    )
    parser.add_argument(
        "--aco-runs",
        type=int,
        default=ACO_RUNS,
        help="Number of independent ACO runs per scenario.",
    )
    parser.add_argument(
        "--no-plots",
        action="store_true",
        help="Skip figure generation.",
    )

    args = parser.parse_args()

    if args.aco_runs <= 0:
        raise ValueError("--aco-runs must be greater than zero.")

    print("=" * 70)
    print("SELF-ADAPTIVE NETWORK OPTIMIZER: EXPERIMENTAL EVALUATION")
    print("=" * 70)
    print(f"Graph size: {NUM_NODES} nodes (Source: {SOURCE}, Destination: {DESTINATION})")
    print(f"ACO runs per scenario: {args.aco_runs}")
    print(f"Starting seed: {args.seed}")
    print()

def run_evaluation_pipeline(
    seed: int = DEFAULT_SEED,
    aco_runs: int = ACO_RUNS,
    results_dir: Path = RESULTS_DIR,
    plots_dir: Path = PLOTS_DIR,
    generate_plots: bool = True,
) -> dict:
    """
    Execute complete end-to-end evaluation pipeline:
    static scenarios, dynamic timeline, statistical aggregation, CSV exports,
    metadata JSON, and publication figures.
    """
    t_start = time.perf_counter()

    # 1. Run static scenario experiments
    print("Running static scenario evaluation across 4 strategies...")
    detailed_rows, convergence_rows = run_experiments(
        seed=seed,
        aco_runs=aco_runs,
    )

    # 2. Run dynamic event sequence
    print("Running 10-step dynamic adaptive timeline experiment...")
    dynamic_rows = run_dynamic_experiment(seed=seed)

    # 3. Create statistical summary
    summary_rows = create_summary(detailed_rows)

    # 4. Save results CSVs
    results_dir.mkdir(parents=True, exist_ok=True)
    detailed_file = results_dir / "detailed_results.csv"
    summary_file = results_dir / "summary_results.csv"
    aggregate_file = results_dir / "aggregate_comparison.csv"
    dynamic_file = results_dir / "dynamic_timeline.csv"
    convergence_file = results_dir / "aco_convergence.csv"
    metadata_file = results_dir / "experiment_metadata.json"

    save_csv(detailed_rows, detailed_file)
    save_csv(summary_rows, summary_file)
    save_csv(summary_rows, aggregate_file)
    save_csv(dynamic_rows, dynamic_file)
    save_csv(convergence_rows, convergence_file)

    total_time = time.perf_counter() - t_start
    save_metadata(metadata_file, seed, aco_runs, total_time)

    print(f"Data saved to {results_dir}/:")
    print(f"  {detailed_file.name} ({len(detailed_rows)} rows)")
    print(f"  {summary_file.name} ({len(summary_rows)} rows)")
    print(f"  {aggregate_file.name} ({len(summary_rows)} rows)")
    print(f"  {dynamic_file.name} ({len(dynamic_rows)} steps)")
    print(f"  {convergence_file.name} ({len(convergence_rows)} rows)")
    print(f"  {metadata_file.name}")
    print()

    plots = []
    # 5. Generate plots
    if generate_plots:
        print(f"Generating publication-quality figures in {plots_dir}/:")
        plots = generate_all_plots(
            summary_file=summary_file,
            detailed_file=detailed_file,
            convergence_file=convergence_file,
            dynamic_file=dynamic_file,
            plots_dir=plots_dir,
        )
        for p in plots:
            print(f"  {p.name}")
        print()

    print(f"Experiment pipeline complete in {total_time:.2f} seconds.")
    print("=" * 70)

    return {
        "detailed_rows": detailed_rows,
        "summary_rows": summary_rows,
        "dynamic_rows": dynamic_rows,
        "convergence_rows": convergence_rows,
        "total_time": total_time,
        "generated_plots": plots,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run network routing experimental evaluation and analysis."
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_SEED,
        help="Starting random seed for reproducibility.",
    )
    parser.add_argument(
        "--aco-runs",
        type=int,
        default=ACO_RUNS,
        help="Number of independent ACO runs per scenario.",
    )
    parser.add_argument(
        "--no-plots",
        action="store_true",
        help="Skip figure generation.",
    )

    args = parser.parse_args()

    if args.aco_runs <= 0:
        raise ValueError("--aco-runs must be greater than zero.")

    print("=" * 70)
    print("SELF-ADAPTIVE NETWORK OPTIMIZER: EXPERIMENTAL EVALUATION")
    print("=" * 70)
    print(f"Graph size: {NUM_NODES} nodes (Source: {SOURCE}, Destination: {DESTINATION})")
    print(f"ACO runs per scenario: {args.aco_runs}")
    print(f"Starting seed: {args.seed}")
    print()

    run_evaluation_pipeline(
        seed=args.seed,
        aco_runs=args.aco_runs,
        results_dir=RESULTS_DIR,
        plots_dir=PLOTS_DIR,
        generate_plots=not args.no_plots,
    )


if __name__ == "__main__":
    main()