"""
Automated unit and integration tests for the AdaptiveRoutingEngine.
"""

from __future__ import annotations

import networkx as nx
import pytest

from routing.aco import ACOResult, AntColonyOptimizer
from simulator.adaptive import AdaptiveRoutingEngine, canonical_edge
from simulator.graph_builder import build_demo_graph


def test_initial_route_and_metrics():
    engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)

    assert len(engine.current_route) >= 2
    assert engine.current_route[0] == 0
    assert engine.current_route[-1] == 7
    assert 0.0 < engine.current_route_cost < float("inf")

    metrics = engine.current_metrics
    assert "route_cost" in metrics
    assert "latency_ms" in metrics
    assert "packet_loss_percent" in metrics
    assert "bandwidth_mbps" in metrics
    assert "congestion_percent" in metrics

    assert metrics["latency_ms"] > 0
    assert 0.0 <= metrics["packet_loss_percent"] <= 100.0
    assert metrics["bandwidth_mbps"] > 0
    assert 0.0 <= metrics["congestion_percent"] <= 100.0
    assert engine.total_route_changes == 0


def test_congestion_event_applied_and_updates_metrics():
    engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)
    edge = (0, 1)
    old_congestion = engine.graph[0][1]["congestion"]

    res = engine.apply_congestion([edge], amount=25.0)

    assert engine.graph[0][1]["congestion"] == pytest.approx(old_congestion + 25.0)
    cached = engine.link_cache[canonical_edge(0, 1)]
    assert cached["congestion"] == pytest.approx(old_congestion + 25.0)
    assert res.changed_edges == [edge]


def test_latency_and_packet_loss_events_applied():
    engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)
    edge = (0, 1)
    old_lat = engine.graph[0][1]["latency"]
    old_loss = engine.graph[0][1]["packet_loss"]

    res_lat = engine.apply_latency([edge], multiplier=2.5)
    assert engine.graph[0][1]["latency"] == pytest.approx(old_lat * 2.5)
    assert res_lat.changed_edges == [edge]

    res_loss = engine.apply_packet_loss([edge], amount=6.0)
    assert engine.graph[0][1]["packet_loss"] == pytest.approx(old_loss + 6.0)
    assert res_loss.changed_edges == [edge]


def test_small_quality_changes_do_not_trigger_rerouting():
    engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)
    initial_route = list(engine.current_route)
    edge_on_route = (initial_route[0], initial_route[1])

    # Apply 1% congestion (very minor change, well below 10% quality threshold)
    res = engine.apply_congestion([edge_on_route], amount=1.0)

    assert res.triggered is False
    assert res.trigger_reason == "thresholds_not_exceeded"
    assert res.route_changed is False
    assert res.new_route == initial_route
    assert engine.current_route == initial_route
    assert engine.total_route_changes == 0
    assert res.reroute_time_seconds == 0.0


def test_quality_threshold_triggers_rerouting():
    engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)
    initial_route = list(engine.current_route)
    first_hop = (initial_route[0], initial_route[1])

    # Massive latency increase will cause link quality to plummet into HIGH latency range
    res = engine.apply_latency([first_hop], multiplier=8.0)

    assert res.triggered is True
    assert "quality_drop" in res.trigger_reason or "route_cost_degradation" in res.trigger_reason
    assert res.new_route[0] == 0
    assert res.new_route[-1] == 7
    assert res.new_route_cost < float("inf")


def test_route_cost_degradation_triggers_rerouting():
    # Set high quality threshold so only cost degradation triggers
    engine = AdaptiveRoutingEngine(
        source=0,
        destination=7,
        quality_threshold=0.99,
        cost_threshold=0.15,
        seed=42,
    )
    initial_route = list(engine.current_route)
    first_hop = (initial_route[0], initial_route[1])

    # Latency spike causes cost to increase by more than 15%
    res = engine.apply_latency([first_hop], multiplier=8.0)

    assert res.triggered is True
    assert "route_cost_degradation" in res.trigger_reason


def test_link_failure_on_current_route_triggers_immediate_rerouting():
    engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)
    initial_route = list(engine.current_route)
    failed_link = (initial_route[0], initial_route[1])

    res = engine.apply_link_failure(*failed_link)

    assert res.triggered is True
    assert "disabled_on_current_route" in res.trigger_reason
    assert res.route_changed is True
    # The new route must not contain the failed link
    for u, v in zip(res.new_route, res.new_route[1:]):
        assert canonical_edge(u, v) != canonical_edge(*failed_link)
    assert engine.total_route_changes == 1


def test_router_failure_excludes_all_incident_edges():
    engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)
    initial_route = list(engine.current_route)
    # Pick intermediate router on route
    failed_node = initial_route[1]

    res = engine.apply_router_failure(failed_node)

    assert res.triggered is True
    assert f"router_{failed_node}_disabled" in res.trigger_reason
    # Neither the node nor its incident edges can be in the new route
    assert failed_node not in res.new_route
    assert engine.graph.nodes[failed_node]["enabled"] is False


def test_disconnected_network_returns_explicit_unreachable():
    engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)

    # Disable destination node 7 completely
    res = engine.apply_router_failure(7)

    assert res.triggered is True
    assert res.unreachable is True
    assert res.new_route == []
    assert res.new_route_cost == float("inf")
    assert engine.current_route == []
    assert engine.current_route_cost == float("inf")


def test_reset_restores_original_network_and_state():
    engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)
    orig_route = list(engine.current_route)
    orig_cost = float(engine.current_route_cost)

    # Apply multiple disruptive events
    first_hop = (orig_route[0], orig_route[1])
    engine.apply_link_failure(*first_hop)
    engine.apply_congestion([(0, 1)], amount=40.0)

    assert engine.current_route != orig_route or engine.total_route_changes > 0

    # Reset
    engine.reset()

    assert engine.current_route == orig_route
    assert engine.current_route_cost == pytest.approx(orig_cost)
    assert engine.total_route_changes == 0
    assert len(engine.history) == 0

    # Check edge conditions in graph are restored
    for u, v, data in engine.base_graph.edges(data=True):
        assert engine.graph[u][v]["latency"] == data["latency"]
        assert engine.graph[u][v]["congestion"] == data["congestion"]
        assert engine.graph[u][v]["enabled"] is True


def test_repeated_events_do_not_corrupt_state():
    engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)

    res1 = engine.apply_congestion([(0, 1)], amount=10.0)
    res2 = engine.apply_latency([(1, 4)], multiplier=1.5)
    res3 = engine.apply_packet_loss([(2, 5)], amount=3.0)
    res4 = engine.apply_link_restoration(0, 1)

    assert len(engine.history) == 4
    for res in [res1, res2, res3, res4]:
        assert isinstance(res.processing_time_seconds, float)
        assert res.processing_time_seconds >= 0.0
        assert isinstance(res.reroute_time_seconds, float)
        assert res.reroute_time_seconds >= 0.0


def test_multiple_engine_instances_do_not_share_state():
    engine1 = AdaptiveRoutingEngine(source=0, destination=7, seed=42)
    engine2 = AdaptiveRoutingEngine(source=0, destination=7, seed=42)

    # Disable link on engine1
    engine1.apply_link_failure(0, 2)

    assert engine1.graph[0][2]["enabled"] is False
    assert engine2.graph[0][2]["enabled"] is True
    assert engine2.link_cache[canonical_edge(0, 2)]["enabled"] is True


def test_route_change_count_is_correct():
    engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)
    initial_route = list(engine.current_route)

    # Event that doesn't trigger
    engine.apply_congestion([(initial_route[0], initial_route[1])], amount=0.5)
    assert engine.total_route_changes == 0

    # Event that forces reroute
    res = engine.apply_link_failure(initial_route[0], initial_route[1])
    assert res.route_changed is True
    assert engine.total_route_changes == 1


def test_fixed_seed_yields_reproducible_behavior():
    engine_a = AdaptiveRoutingEngine(source=0, destination=7, seed=99)
    engine_b = AdaptiveRoutingEngine(source=0, destination=7, seed=99)

    assert engine_a.current_route == engine_b.current_route
    assert engine_a.current_route_cost == pytest.approx(engine_b.current_route_cost)


def test_processing_and_recovery_time_are_finite_and_nonnegative():
    engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)
    res = engine.apply_congestion([(0, 1)], amount=5.0)

    assert 0.0 <= res.processing_time_seconds < 10.0
    assert 0.0 <= res.reroute_time_seconds < 10.0


def test_aco_failure_does_not_report_success():
    class FailingACO(AntColonyOptimizer):
        def find_route(self, graph, source, destination):
            return ACOResult(
                path=[],
                cost=float("inf"),
                exists=False,
                convergence_history=[],
                iterations=0,
            )

    failing_aco = FailingACO()
    # Graph is connected, but ACO fails
    engine = AdaptiveRoutingEngine(
        source=0,
        destination=7,
        aco_optimizer=failing_aco,
    )

    assert engine.current_route == []
    assert engine.current_route_cost == float("inf")

    # Trigger reroute via failure
    res = engine.apply_link_failure(0, 1)
    assert res.triggered is True
    assert res.new_route == []
    assert res.new_route_cost == float("inf")
    assert res.error is not None
    assert "ACO failed" in res.error


def test_configurable_thresholds():
    engine = AdaptiveRoutingEngine(
        source=0,
        destination=7,
        quality_threshold=0.05,
        cost_threshold=0.12,
    )

    assert engine.quality_threshold == pytest.approx(0.05)
    assert engine.cost_threshold == pytest.approx(0.12)
