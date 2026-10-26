"""
Unit and integration tests for the Streamlit interactive dashboard and visuals.
"""

from __future__ import annotations

import math
from pathlib import Path

import networkx as nx
import pytest
from streamlit.testing.v1 import AppTest

import config
from dashboard.visuals import (
    build_convergence_figure,
    build_network_figure,
    build_scenario_metric_figure,
    build_strategy_comparison_chart,
    build_timeline_figure,
    format_path_string,
    get_node_positions,
    load_experiment_results,
)
from simulator.adaptive import AdaptiveRoutingEngine
from simulator.graph_builder import build_demo_graph, build_experiment_graph


# ---------------------------------------------------------------------------
# Unit tests for dashboard/visuals.py
# ---------------------------------------------------------------------------

def test_get_node_positions_demo_and_custom():
    """Verify fixed positions for 8-node demo graph and spring layout for arbitrary graph."""
    g_demo = build_demo_graph()
    pos_demo = get_node_positions(g_demo, is_demo=True)
    assert len(pos_demo) == 8
    assert pos_demo[0] == (0.05, 0.50)
    assert pos_demo[7] == (0.95, 0.45)

    g_exp = build_experiment_graph(num_nodes=10, seed=42)
    pos_exp = get_node_positions(g_exp, is_demo=False)
    assert len(pos_exp) == 10
    for node, coords in pos_exp.items():
        assert len(coords) == 2
        assert all(math.isfinite(c) for c in coords)


def test_build_network_figure_structure():
    """Verify network figure constructs valid Plotly figure with expected traces."""
    g = build_demo_graph()
    pos = get_node_positions(g, is_demo=True)
    current_route = [0, 1, 4, 6, 7]

    fig = build_network_figure(
        graph=g,
        current_route=current_route,
        source=0,
        destination=7,
        positions=pos,
    )

    # Check trace count and names
    trace_names = [t.name for t in fig.data if t.name]
    assert "Active Route" in trace_names
    assert "Active Link" in trace_names
    assert "Routers" in trace_names


def test_build_network_figure_with_disabled_elements():
    """Verify disabled links and routers generate disabled traces."""
    g = build_demo_graph()
    pos = get_node_positions(g, is_demo=True)

    # Disable link (0, 1) and router 4
    g[0][1]["enabled"] = False
    g.nodes[4]["enabled"] = False

    fig = build_network_figure(
        graph=g,
        current_route=[],
        source=0,
        destination=7,
        positions=pos,
    )

    trace_names = [t.name for t in fig.data if t.name]
    assert "Disabled Link" in trace_names
    # Active route should not be present since route is empty
    assert "Active Route" not in trace_names


def test_build_strategy_comparison_chart():
    """Verify side-by-side strategy comparison chart generation."""
    comparison_data = [
        {
            "strategy": "dijkstra_latency",
            "strategy_label": "Dijkstra (Latency)",
            "latency_ms": 50.0,
            "packet_loss_percent": 2.0,
            "bandwidth_mbps": 80.0,
            "congestion_percent": 15.0,
        },
        {
            "strategy": "dijkstra_fuzzy",
            "strategy_label": "Dijkstra (Fuzzy Cost)",
            "latency_ms": 65.0,
            "packet_loss_percent": 0.8,
            "bandwidth_mbps": 95.0,
            "congestion_percent": 10.0,
        },
    ]

    fig = build_strategy_comparison_chart(comparison_data)
    assert len(fig.data) == 2
    assert fig.data[0].name == "Dijkstra (Latency)"
    assert fig.data[1].name == "Dijkstra (Fuzzy Cost)"


def test_build_timeline_and_convergence_figures():
    """Verify dynamic timeline and convergence figures render without errors."""
    mock_timeline = [
        {
            "step": 1,
            "event_name": "baseline_normal",
            "latency_after_ms": 115.0,
            "processing_time_ms": 0.05,
            "reroute_time_ms": 0.0,
        },
        {
            "step": 2,
            "event_name": "latency_spike",
            "latency_after_ms": 140.0,
            "processing_time_ms": 0.08,
            "reroute_time_ms": 15.0,
        },
    ]
    fig_time = build_timeline_figure(mock_timeline)
    assert len(fig_time.data) == 3  # Latency curve, reroute time, processing time

    mock_conv = [
        {"iteration": 1, "best_cost": 5.0, "scenario": "normal"},
        {"iteration": 2, "best_cost": 3.5, "scenario": "normal"},
        {"iteration": 3, "best_cost": 2.8, "scenario": "normal"},
    ]
    fig_conv = build_convergence_figure(mock_conv, scenario="normal")
    assert len(fig_conv.data) >= 2


def test_load_experiment_results_valid_and_missing(tmp_path: Path):
    """Verify safe loading of results and graceful handling of missing directories."""
    # Test nonexistent directory
    missing_dir = tmp_path / "nonexistent"
    res_missing = load_experiment_results(missing_dir)
    assert res_missing["loaded"] is False
    assert "does not exist" in res_missing["error"]
    assert res_missing["summary_rows"] == []

    # Test real project results directory
    real_results = Path(__file__).resolve().parent.parent / "results"
    res_real = load_experiment_results(real_results)
    if (real_results / "summary_results.csv").exists():
        assert res_real["loaded"] is True
        assert len(res_real["summary_rows"]) > 0
        assert res_real["metadata"] is not None


def test_format_path_string():
    """Verify route path formatting."""
    assert format_path_string([]) == "None (Unreachable)"
    assert format_path_string([0, 1, 4, 6, 7]) == "0 → 1 → 4 → 6 → 7"


# ---------------------------------------------------------------------------
# Integration tests for dashboard/app.py with Streamlit AppTest
# ---------------------------------------------------------------------------

def test_dashboard_app_initial_load():
    """Verify Streamlit app initializes, sets session state, and executes without exceptions."""
    app_path = str(Path(__file__).resolve().parent.parent / "dashboard" / "app.py")
    at = AppTest.from_file(app_path)
    at.run()

    # Verify no unhandled exceptions occurred
    assert not at.exception

    # Check title and engine state
    assert len(at.title) >= 1
    assert "engine" in at.session_state
    engine: AdaptiveRoutingEngine = at.session_state["engine"]
    assert engine.source == 0
    assert engine.destination == 7
    assert len(engine.current_route) > 0


def test_dashboard_app_navigation_sections():
    """Verify all 6 sidebar navigation sections can be navigated to without errors."""
    app_path = str(Path(__file__).resolve().parent.parent / "dashboard" / "app.py")
    sections = [
        "Overview",
        "Live Network Simulator",
        "Routing Strategy Comparison",
        "Experimental Results",
        "Adaptive Explainability",
        "Event History",
    ]

    for sec in sections:
        at = AppTest.from_file(app_path)
        at.run()
        # Radio button 0 is the navigation selector in sidebar
        at.sidebar.radio[0].set_value(sec).run()
        assert not at.exception, f"Exception while navigating to {sec}"


def test_dashboard_engine_event_application_and_reset():
    """Verify that applying an event updates the underlying graph and engine recovers on reset."""
    app_path = str(Path(__file__).resolve().parent.parent / "dashboard" / "app.py")
    at = AppTest.from_file(app_path)
    at.run()

    engine: AdaptiveRoutingEngine = at.session_state["engine"]
    orig_route = list(engine.current_route)
    orig_cost = engine.current_route_cost

    # Apply link failure on active hop
    first_hop = (orig_route[0], orig_route[1])
    res = engine.apply_link_failure(*first_hop)

    assert res.triggered is True
    assert engine.graph[first_hop[0]][first_hop[1]]["enabled"] is False

    # Reset engine
    engine.reset()
    assert engine.graph[first_hop[0]][first_hop[1]]["enabled"] is True
    assert engine.current_route == orig_route
    assert math.isclose(engine.current_route_cost, orig_cost, rel_tol=1e-3)
