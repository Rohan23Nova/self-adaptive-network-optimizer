"""
Experimental evaluation of the three routing strategies.

Strategies:

1. Dijkstra - raw latency
2. Dijkstra - fuzzy-derived cost
3. ACO - fuzzy-derived cost

Scenarios:

1. normal
2. congestion
3. high_latency
4. packet_loss
5. link_failure
6. dynamic_combined

ACO is stochastic, so each ACO scenario is repeated using multiple
explicit random seeds.

All reported values are produced by actually executing the algorithms.
"""

from __future__ import annotations

import argparse
import csv
import copy
import statistics
import time
from pathlib import Path

import networkx as nx

from fuzzy.inference import calculate_link_cost
from routing.aco import AntColonyOptimizer
from routing.dijkstra_baseline import (
    RouteResult,
    dijkstra_fuzzy,
    dijkstra_latency,
)
from simulator.events import (
    disable_link,
    disable_router,
    increase_congestion,
    increase_latency,
    increase_packet_loss,
)
from simulator.graph_builder import build_experiment_graph


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_SEED = 42
ACO_RUNS = 20

NUM_NODES = 25

SOURCE = 0
DESTINATION = NUM_NODES - 1

RESULTS_DIR = Path("results")


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def edge_key(u: int, v: int) -> tuple[int, int]:
    """Return canonical key for an undirected edge."""

    return (u, v) if u <= v else (v, u)


def calculate_fuzzy_edge_costs(
    graph: nx.Graph,
) -> dict[tuple[int, int], float]:
    """
    Calculate fuzzy-derived cost for every active edge.
    """

    costs = {}

    for u, v, data in graph.edges(data=True):

        if not data.get("enabled", True):
            continue

        _, cost = calculate_link_cost(
            latency=data["latency"],
            packet_loss=data["packet_loss"],
            bandwidth=data["bandwidth"],
            congestion=data["congestion"],
        )

        costs[edge_key(u, v)] = cost

    return costs


def choose_event_link(
    graph: nx.Graph,
) -> tuple[int, int]:
    """
    Choose a deterministic link for degradation.

    The selected link is chosen from active edges.
    """

    active_edges = [
        (u, v)
        for u, v, data in graph.edges(data=True)
        if data.get("enabled", True)
    ]

    if not active_edges:
        raise RuntimeError("No active edges available.")

    # Deterministic selection.
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

    # Make sure all nodes begin enabled.
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

        increase_congestion(
            graph,
            [edge],
            amount=30.0,
        )

        increase_latency(
            graph,
            [edge],
            multiplier=2.5,
        )

        increase_packet_loss(
            graph,
            [edge],
            amount=6.0,
        )

        return graph

    raise ValueError(
        f"Unknown scenario: {scenario}"
    )


# ---------------------------------------------------------------------------
# Routing execution
# ---------------------------------------------------------------------------

def run_dijkstra_latency(
    graph: nx.Graph,
) -> dict:
    """Run the raw-latency Dijkstra baseline."""

    start = time.perf_counter()

    result = dijkstra_latency(
        graph,
        SOURCE,
        DESTINATION,
    )

    runtime = time.perf_counter() - start

    return {
        "result": result,
        "runtime_seconds": runtime,
        "convergence_history": [],
    }


def run_dijkstra_fuzzy(
    graph: nx.Graph,
) -> dict:
    """Run Dijkstra using fuzzy-derived cost."""

    start = time.perf_counter()

    result = dijkstra_fuzzy(
        graph,
        SOURCE,
        DESTINATION,
    )

    runtime = time.perf_counter() - start

    return {
        "result": result,
        "runtime_seconds": runtime,
        "convergence_history": [],
    }


def run_aco(
    graph: nx.Graph,
    seed: int,
) -> dict:
    """Run custom ACO using fuzzy-derived cost."""

    aco = AntColonyOptimizer(
        alpha=1.0,
        beta=2.0,
        evaporation_rate=0.5,
        num_ants=20,
        num_iterations=50,
        initial_pheromone=1.0,
        min_pheromone=0.01,
        max_pheromone=10.0,
        seed=seed,
    )

    start = time.perf_counter()

    result = aco.find_route(
        graph,
        SOURCE,
        DESTINATION,
    )

    runtime = time.perf_counter() - start

    return {
        "result": result,
        "runtime_seconds": runtime,
        "convergence_history": result.convergence_history,
    }


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def route_metrics(
    graph: nx.Graph,
    result: RouteResult,
) -> dict[str, float]:
    """
    Calculate route-level metrics.

    The cost in RouteResult is already the correct strategy-specific
    routing cost.
    """

    if not result.exists:

        return {
            "route_cost": float("inf"),
            "latency_ms": float("inf"),
            "packet_loss_percent": float("inf"),
            "bandwidth_mbps": 0.0,
            "congestion_percent": float("inf"),
            "route_hops": 0,
        }

    path = result.path

    latency = 0.0
    success_probability = 1.0
    bandwidths = []
    congestion_values = []

    for u, v in zip(path, path[1:]):

        data = graph[u][v]

        latency += data["latency"]

        success_probability *= (
            1.0 - data["packet_loss"] / 100.0
        )

        bandwidths.append(
            data["bandwidth"]
        )

        congestion_values.append(
            data["congestion"]
        )

    packet_loss = (
        1.0 - success_probability
    ) * 100.0

    return {
        "route_cost": float(result.cost),
        "latency_ms": float(latency),
        "packet_loss_percent": float(packet_loss),
        "bandwidth_mbps": float(min(bandwidths)),
        "congestion_percent": float(
            statistics.mean(congestion_values)
        ),
        "route_hops": len(path) - 1,
    }


# ---------------------------------------------------------------------------
# Single scenario
# ---------------------------------------------------------------------------

def run_single_scenario(
    scenario: str,
    seed: int,
) -> list[dict]:
    """
    Run all three strategies for one scenario.

    Dijkstra is run once.

    ACO is run once here. The main experiment runner repeats ACO
    using multiple seeds.
    """

    base_graph = build_experiment_graph(
        num_nodes=NUM_NODES,
        seed=DEFAULT_SEED,
    )

    graph = create_scenario(
        base_graph,
        scenario,
    )

    rows = []

    # ---------------------------------------------------------------
    # Dijkstra raw latency
    # ---------------------------------------------------------------

    dijkstra_latency_result = run_dijkstra_latency(graph)

    latency_metrics = route_metrics(
        graph,
        dijkstra_latency_result["result"],
    )

    rows.append(
        {
            "scenario": scenario,
            "strategy": "dijkstra_latency",
            "seed": DEFAULT_SEED,
            "run": 1,
            **latency_metrics,
            "runtime_seconds": (
                dijkstra_latency_result["runtime_seconds"]
            ),
        }
    )

    # ---------------------------------------------------------------
    # Dijkstra fuzzy cost
    # ---------------------------------------------------------------

    dijkstra_fuzzy_result = run_dijkstra_fuzzy(graph)

    fuzzy_metrics = route_metrics(
        graph,
        dijkstra_fuzzy_result["result"],
    )

    rows.append(
        {
            "scenario": scenario,
            "strategy": "dijkstra_fuzzy",
            "seed": DEFAULT_SEED,
            "run": 1,
            **fuzzy_metrics,
            "runtime_seconds": (
                dijkstra_fuzzy_result["runtime_seconds"]
            ),
        }
    )

    # ---------------------------------------------------------------
    # ACO
    # ---------------------------------------------------------------

    aco_result = run_aco(
        graph,
        seed=seed,
    )

    aco_metrics = route_metrics(
        graph,
        aco_result["result"],
    )

    rows.append(
        {
            "scenario": scenario,
            "strategy": "aco_fuzzy",
            "seed": seed,
            "run": 1,
            **aco_metrics,
            "runtime_seconds": (
                aco_result["runtime_seconds"]
            ),
        }
    )

    return rows


# ---------------------------------------------------------------------------
# Main experiment
# ---------------------------------------------------------------------------

def run_experiments(
    seed: int = DEFAULT_SEED,
    aco_runs: int = ACO_RUNS,
) -> tuple[list[dict], list[dict]]:
    """
    Run all six scenarios.

    Returns:

        detailed_rows
        convergence_rows
    """

    scenarios = [
        "normal",
        "congestion",
        "high_latency",
        "packet_loss",
        "link_failure",
        "dynamic_combined",
    ]

    detailed_rows = []
    convergence_rows = []

    # ---------------------------------------------------------------
    # Dijkstra
    # ---------------------------------------------------------------

    for scenario in scenarios:

        base_graph = build_experiment_graph(
            num_nodes=NUM_NODES,
            seed=DEFAULT_SEED,
        )

        graph = create_scenario(
            base_graph,
            scenario,
        )

        # Raw latency
        raw = run_dijkstra_latency(graph)

        raw_metrics = route_metrics(
            graph,
            raw["result"],
        )

        detailed_rows.append(
            {
                "scenario": scenario,
                "strategy": "dijkstra_latency",
                "seed": DEFAULT_SEED,
                "run": 1,
                **raw_metrics,
                "runtime_seconds": raw["runtime_seconds"],
            }
        )

        # Fuzzy cost
        fuzzy = run_dijkstra_fuzzy(graph)

        fuzzy_metrics = route_metrics(
            graph,
            fuzzy["result"],
        )

        detailed_rows.append(
            {
                "scenario": scenario,
                "strategy": "dijkstra_fuzzy",
                "seed": DEFAULT_SEED,
                "run": 1,
                **fuzzy_metrics,
                "runtime_seconds": fuzzy["runtime_seconds"],
            }
        )

    # ---------------------------------------------------------------
    # ACO
    # ---------------------------------------------------------------

    for scenario in scenarios:

        base_graph = build_experiment_graph(
            num_nodes=NUM_NODES,
            seed=DEFAULT_SEED,
        )

        graph = create_scenario(
            base_graph,
            scenario,
        )

        for run_number in range(1, aco_runs + 1):

            aco_seed = seed + run_number - 1

            aco = run_aco(
                graph,
                seed=aco_seed,
            )

            metrics = route_metrics(
                graph,
                aco["result"],
            )

            detailed_rows.append(
                {
                    "scenario": scenario,
                    "strategy": "aco_fuzzy",
                    "seed": aco_seed,
                    "run": run_number,
                    **metrics,
                    "runtime_seconds": aco["runtime_seconds"],
                }
            )

            for iteration, cost in enumerate(
                aco["convergence_history"],
                start=1,
            ):

                convergence_rows.append(
                    {
                        "scenario": scenario,
                        "seed": aco_seed,
                        "run": run_number,
                        "iteration": iteration,
                        "best_cost": cost,
                    }
                )

    return detailed_rows, convergence_rows


# ---------------------------------------------------------------------------
# CSV output
# ---------------------------------------------------------------------------

def save_csv(
    rows: list[dict],
    output_file: Path,
) -> None:
    """Save dictionaries to CSV."""

    if not rows:
        return

    output_file.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    fieldnames = list(rows[0].keys())

    with output_file.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(rows)


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def create_summary(
    detailed_rows: list[dict],
) -> list[dict]:
    """
    Create mean/std summary for ACO and deterministic values for Dijkstra.
    """

    grouped: dict[tuple[str, str], list[dict]] = {}

    for row in detailed_rows:

        key = (
            row["scenario"],
            row["strategy"],
        )

        grouped.setdefault(
            key,
            [],
        ).append(row)

    summary = []

    metrics = [
        "route_cost",
        "latency_ms",
        "packet_loss_percent",
        "bandwidth_mbps",
        "congestion_percent",
        "route_hops",
    ]

    for (scenario, strategy), rows in grouped.items():

        summary_row = {
            "scenario": scenario,
            "strategy": strategy,
            "runs": len(rows),
        }

        for metric in metrics:

            values = [
                row[metric]
                for row in rows
                if row[metric] != float("inf")
            ]

            if not values:

                summary_row[f"{metric}_mean"] = float("inf")
                summary_row[f"{metric}_std"] = float("nan")

            else:

                summary_row[f"{metric}_mean"] = statistics.mean(
                    values
                )

                if len(values) > 1:
                    summary_row[f"{metric}_std"] = (
                        statistics.stdev(values)
                    )
                else:
                    summary_row[f"{metric}_std"] = 0.0

        summary.append(summary_row)

    return summary


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:

    parser = argparse.ArgumentParser(
        description="Run network routing experiments."
    )

    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_SEED,
        help="Starting random seed for ACO runs.",
    )

    parser.add_argument(
        "--aco-runs",
        type=int,
        default=ACO_RUNS,
        help="Number of independent ACO runs per scenario.",
    )

    args = parser.parse_args()

    if args.aco_runs <= 0:
        raise ValueError(
            "--aco-runs must be greater than zero."
        )

    print("=" * 70)
    print("SELF-ADAPTIVE NETWORK OPTIMIZER")
    print("EXPERIMENTAL EVALUATION")
    print("=" * 70)

    print(f"Graph size: {NUM_NODES} nodes")
    print(f"ACO runs per scenario: {args.aco_runs}")
    print(f"Starting seed: {args.seed}")
    print()

    detailed_rows, convergence_rows = run_experiments(
        seed=args.seed,
        aco_runs=args.aco_runs,
    )

    summary_rows = create_summary(
        detailed_rows,
    )

    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    save_csv(
        detailed_rows,
        RESULTS_DIR / "detailed_results.csv",
    )

    save_csv(
        convergence_rows,
        RESULTS_DIR / "aco_convergence.csv",
    )

    save_csv(
        summary_rows,
        RESULTS_DIR / "summary_results.csv",
    )

    print("Experiment complete.")
    print()
    print("Generated files:")
    print("  results/detailed_results.csv")
    print("  results/aco_convergence.csv")
    print("  results/summary_results.csv")


if __name__ == "__main__":
    main()