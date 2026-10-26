import networkx as nx

from simulator.graph_builder import (
    build_demo_graph,
    build_experiment_graph,
    get_active_graph,
)
from simulator.events import (
    increase_congestion,
    increase_latency,
    increase_packet_loss,
    disable_link,
    disable_router,
    enable_link,
    enable_router,
)


def test_demo_graph():
    graph = build_demo_graph()

    assert graph.number_of_nodes() == 8
    assert graph.number_of_edges() > 0

    for u, v, data in graph.edges(data=True):
        assert "latency" in data
        assert "packet_loss" in data
        assert "bandwidth" in data
        assert "congestion" in data
        assert data["enabled"] is True


def test_demo_graph_is_connected():
    graph = build_demo_graph()

    assert nx.is_connected(get_active_graph(graph))


def test_experiment_graph_is_reproducible():
    graph_a = build_experiment_graph(num_nodes=25, seed=42)
    graph_b = build_experiment_graph(num_nodes=25, seed=42)

    assert set(graph_a.edges()) == set(graph_b.edges())

    for edge in graph_a.edges():
        assert graph_a.edges[edge]["latency"] == graph_b.edges[edge]["latency"]


def test_congestion_event():
    graph = build_demo_graph()

    old = graph[0][1]["congestion"]

    increase_congestion(graph, [(0, 1)], amount=30)

    assert graph[0][1]["congestion"] == old + 30


def test_latency_event():
    graph = build_demo_graph()

    old = graph[0][1]["latency"]

    increase_latency(graph, [(0, 1)], multiplier=2)

    assert graph[0][1]["latency"] == old * 2


def test_packet_loss_event():
    graph = build_demo_graph()

    old = graph[0][1]["packet_loss"]

    increase_packet_loss(graph, [(0, 1)], amount=5)

    assert graph[0][1]["packet_loss"] == old + 5


def test_link_failure_and_restore():
    graph = build_demo_graph()

    disable_link(graph, 0, 1)

    assert graph[0][1]["enabled"] is False

    active = get_active_graph(graph)

    assert not active.has_edge(0, 1)

    enable_link(graph, 0, 1)

    assert graph[0][1]["enabled"] is True


def test_router_failure_and_restore():
    graph = build_demo_graph()

    disable_router(graph, 2)

    assert graph.nodes[2]["enabled"] is False

    active = get_active_graph(graph)

    for neighbor in graph.neighbors(2):
        assert not active.has_edge(2, neighbor)

    enable_router(graph, 2)

    assert graph.nodes[2]["enabled"] is True


def test_get_active_graph_excludes_edges_of_disabled_node():
    graph = build_demo_graph()
    graph.nodes[1]["enabled"] = False
    active = get_active_graph(graph)
    for neighbor in graph.neighbors(1):
        assert not active.has_edge(1, neighbor)