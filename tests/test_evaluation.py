from evaluation.experiments import (
    create_scenario,
    create_summary,
)
from simulator.graph_builder import build_experiment_graph


def test_all_scenarios_can_be_created():

    base_graph = build_experiment_graph(
        num_nodes=25,
        seed=42,
    )

    scenarios = [
        "normal",
        "congestion",
        "high_latency",
        "packet_loss",
        "link_failure",
        "dynamic_combined",
    ]

    for scenario in scenarios:

        graph = create_scenario(
            base_graph,
            scenario,
        )

        assert graph.number_of_nodes() == 25


def test_summary_contains_expected_metrics():

    rows = [
        {
            "scenario": "normal",
            "strategy": "dijkstra_latency",
            "route_cost": 10.0,
            "latency_ms": 20.0,
            "packet_loss_percent": 1.0,
            "bandwidth_mbps": 80.0,
            "congestion_percent": 20.0,
            "route_hops": 2,
        },
        {
            "scenario": "normal",
            "strategy": "aco_fuzzy",
            "route_cost": 5.0,
            "latency_ms": 15.0,
            "packet_loss_percent": 0.5,
            "bandwidth_mbps": 90.0,
            "congestion_percent": 10.0,
            "route_hops": 2,
        },
        {
            "scenario": "normal",
            "strategy": "aco_fuzzy",
            "route_cost": 6.0,
            "latency_ms": 16.0,
            "packet_loss_percent": 0.6,
            "bandwidth_mbps": 85.0,
            "congestion_percent": 12.0,
            "route_hops": 2,
        },
    ]

    summary = create_summary(rows)

    assert len(summary) == 2

    aco_summary = next(
        row
        for row in summary
        if row["strategy"] == "aco_fuzzy"
    )

    assert aco_summary["runs"] == 2
    assert aco_summary["route_cost_mean"] == 5.5
    assert aco_summary["route_cost_std"] > 0