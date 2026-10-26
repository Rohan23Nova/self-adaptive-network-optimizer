"""
Unit and integration tests for experimental evaluation, statistical analysis,
and visualization modules.
"""

from __future__ import annotations

import csv
import json
import math
from pathlib import Path

import pytest

from evaluation.experiments import (
    create_summary,
    run_dynamic_experiment,
    run_evaluation_pipeline,
    run_experiments,
)
from evaluation.metrics import (
    calculate_confidence_interval,
    calculate_summary_statistics,
)
from evaluation.plots import generate_all_plots


def test_confidence_interval_calculation():
    """Verify confidence interval mathematics, edge cases, and bounds."""
    # Empty list
    low, high = calculate_confidence_interval([])
    assert math.isnan(low)
    assert math.isnan(high)

    # Single value
    low, high = calculate_confidence_interval([42.0])
    assert low == 42.0
    assert high == 42.0

    # Zero standard deviation (identical values)
    low, high = calculate_confidence_interval([15.0, 15.0, 15.0])
    assert low == 15.0
    assert high == 15.0

    # Finite sample with variance
    values = [10.0, 12.0, 9.0, 11.0, 10.5]
    mean_val = sum(values) / len(values)
    low_95, high_95 = calculate_confidence_interval(values, confidence=0.95)
    low_99, high_99 = calculate_confidence_interval(values, confidence=0.99)

    assert low_95 < mean_val < high_95
    # 99% CI must be strictly wider than 95% CI
    assert (high_99 - low_99) > (high_95 - low_95)


def test_summary_statistics_structure():
    """Verify all statistical keys and computed values for descriptive statistics."""
    sample = [10.0, 20.0, 30.0]
    stats = calculate_summary_statistics(sample)

    expected_keys = {
        "count",
        "mean",
        "std",
        "median",
        "min",
        "max",
        "ci_95_lower",
        "ci_95_upper",
    }
    assert expected_keys.issubset(stats.keys())
    assert stats["count"] == 3
    assert stats["mean"] == 20.0
    assert stats["median"] == 20.0
    assert stats["min"] == 10.0
    assert stats["max"] == 30.0
    assert stats["std"] == 10.0
    assert stats["ci_95_lower"] < 20.0 < stats["ci_95_upper"]


def test_experiments_output_columns_and_scenarios(tmp_path: Path):
    """
    Run miniature experiment runner and verify that all 6 scenarios,
    4 strategies, and required CSV and JSON artifacts are created with correct columns.
    """
    res_dir = tmp_path / "results"
    plots_dir = tmp_path / "plots"

    results = run_evaluation_pipeline(
        seed=42,
        aco_runs=2,
        results_dir=res_dir,
        plots_dir=plots_dir,
        generate_plots=False,
    )
    detailed_rows = results["detailed_rows"]

    # Verify all expected artifacts exist on disk
    expected_files = [
        res_dir / "detailed_results.csv",
        res_dir / "summary_results.csv",
        res_dir / "aggregate_comparison.csv",
        res_dir / "dynamic_timeline.csv",
        res_dir / "aco_convergence.csv",
        res_dir / "experiment_metadata.json",
    ]
    for ef in expected_files:
        assert ef.exists(), f"Expected artifact missing: {ef}"

    # Verify scenarios present
    scenarios = {r["scenario"] for r in detailed_rows}
    expected_scenarios = {
        "normal",
        "congestion",
        "high_latency",
        "packet_loss",
        "link_failure",
        "dynamic_combined",
    }
    assert scenarios == expected_scenarios

    # Verify strategies present
    strategies = {r["strategy"] for r in detailed_rows}
    expected_strategies = {
        "dijkstra_latency",
        "dijkstra_fuzzy",
        "aco_fuzzy",
        "adaptive_aco",
    }
    assert strategies == expected_strategies

    # Verify columns in detailed_results.csv
    with (res_dir / "detailed_results.csv").open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames or []
        required_cols = [
            "scenario",
            "strategy",
            "seed",
            "run",
            "reachable",
            "route_hops",
            "route_cost",
            "latency_ms",
            "packet_loss_percent",
            "bandwidth_mbps",
            "congestion_percent",
            "runtime_ms",
            "recovery_time_ms",
        ]
        for col in required_cols:
            assert col in fields, f"Missing column in detailed_results: {col}"

    # Verify metadata JSON structure
    with (res_dir / "experiment_metadata.json").open("r", encoding="utf-8") as f:
        meta = json.load(f)
        assert meta["graph_topology"]["num_nodes"] == 25
        assert meta["experiments"]["aco_runs"] == 2
        assert meta["graph_topology"]["base_seed"] == 42
        assert len(meta["experiments"]["strategies"]) == 4
        assert len(meta["experiments"]["scenarios"]) == 6


def test_dynamic_experiment_timeline_structure():
    """Verify 10-step sequential dynamic timeline tracking and delta reporting."""
    timeline = run_dynamic_experiment(seed=42)

    assert len(timeline) == 10
    steps = [row["step"] for row in timeline]
    assert steps == list(range(1, 11))

    required_keys = [
        "step",
        "event_name",
        "changed_edges",
        "changed_nodes",
        "triggered",
        "trigger_reason",
        "route_changed",
        "unreachable",
        "previous_route",
        "new_route",
        "latency_before_ms",
        "latency_after_ms",
        "loss_before_percent",
        "loss_after_percent",
        "bandwidth_before_mbps",
        "bandwidth_after_mbps",
        "congestion_before_percent",
        "congestion_after_percent",
        "cost_before",
        "cost_after",
        "processing_time_ms",
        "reroute_time_ms",
    ]
    for row in timeline:
        for k in required_keys:
            assert k in row, f"Missing key '{k}' in timeline row {row['step']}"

    # Step 1 is baseline normal
    assert timeline[0]["event_name"] == "baseline_normal"
    assert timeline[0]["triggered"] == "False"
    assert timeline[0]["unreachable"] == "False"

    # Link failure at step 6 must trigger adaptive reroute
    assert timeline[5]["event_name"] == "link_failure"
    assert timeline[5]["triggered"] == "True"


def test_unreachable_handling():
    """Verify unreachable routes are marked explicitly with reachable=0 and handled without crashing."""
    # Test calculate_summary_statistics with non-finite values
    stats_empty = calculate_summary_statistics([float("inf"), float("nan")])
    assert stats_empty["count"] == 0
    assert math.isnan(stats_empty["mean"])

    # Test create_summary with mixed reachable and unreachable runs
    mock_rows = [
        {
            "scenario": "link_failure",
            "strategy": "aco_fuzzy",
            "reachable": 1,
            "route_cost": 15.0,
            "latency_ms": 25.0,
            "packet_loss_percent": 1.0,
            "bandwidth_mbps": 80.0,
            "congestion_percent": 20.0,
            "route_hops": 3,
            "runtime_ms": 12.0,
            "recovery_time_ms": 12.0,
        },
        {
            "scenario": "link_failure",
            "strategy": "aco_fuzzy",
            "reachable": 0,
            "route_cost": float("inf"),
            "latency_ms": float("inf"),
            "packet_loss_percent": float("inf"),
            "bandwidth_mbps": 0.0,
            "congestion_percent": float("inf"),
            "route_hops": 0,
            "runtime_ms": 5.0,
            "recovery_time_ms": 5.0,
        },
    ]

    summary = create_summary(mock_rows)
    assert len(summary) == 1
    s = summary[0]
    assert s["runs"] == 2
    assert s["reachable_runs"] == 1
    assert s["reachable_rate"] == 0.5
    # Stats for finite metrics should only consider finite values
    assert s["latency_ms_mean"] == 25.0
    assert s["route_cost_mean"] == 15.0


def test_plots_generation(tmp_path: Path):
    """Verify that generate_all_plots produces all 7 required publication-quality figures."""
    res_dir = tmp_path / "results"
    plots_dir = tmp_path / "plots"

    results = run_evaluation_pipeline(
        seed=42,
        aco_runs=2,
        results_dir=res_dir,
        plots_dir=plots_dir,
        generate_plots=True,
    )

    expected_plot_names = [
        "latency_comparison.png",
        "packet_loss_comparison.png",
        "bandwidth_comparison.png",
        "congestion_comparison.png",
        "dynamic_recovery_timeline.png",
        "aco_convergence_curves.png",
        "reachability_comparison.png",
    ]

    generated_plots = results["generated_plots"]
    assert len(generated_plots) == 7
    for name in expected_plot_names:
        p = plots_dir / name
        assert p.exists(), f"Plot not found: {p}"
        assert p.stat().st_size > 1000, f"Plot file seems truncated or empty: {p}"
