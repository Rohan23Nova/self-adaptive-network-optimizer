import networkx as nx

from routing.dijkstra_baseline import (
    dijkstra_fuzzy,
    dijkstra_latency,
)


def test_dijkstra_latency_finds_shortest_latency_path():
    graph = nx.Graph()

    graph.add_edge(
        0,
        1,
        latency=10,
        packet_loss=1,
        bandwidth=80,
        congestion=10,
        enabled=True,
    )

    graph.add_edge(
        1,
        2,
        latency=10,
        packet_loss=1,
        bandwidth=80,
        congestion=10,
        enabled=True,
    )

    graph.add_edge(
        0,
        2,
        latency=30,
        packet_loss=1,
        bandwidth=80,
        congestion=10,
        enabled=True,
    )

    result = dijkstra_latency(graph, 0, 2)

    assert result.exists is True
    assert result.path == [0, 1, 2]
    assert result.cost == 20


def test_dijkstra_fuzzy_returns_valid_route():
    graph = nx.Graph()

    graph.add_edge(
        0,
        1,
        latency=20,
        packet_loss=0.5,
        bandwidth=90,
        congestion=10,
        enabled=True,
    )

    graph.add_edge(
        1,
        2,
        latency=20,
        packet_loss=0.5,
        bandwidth=90,
        congestion=10,
        enabled=True,
    )

    graph.add_edge(
        0,
        2,
        latency=200,
        packet_loss=10,
        bandwidth=20,
        congestion=80,
        enabled=True,
    )

    result = dijkstra_fuzzy(graph, 0, 2)

    assert result.exists is True
    assert result.path == [0, 1, 2]
    assert result.cost > 0


def test_disabled_link_is_not_used():
    graph = nx.Graph()

    graph.add_edge(
        0,
        1,
        latency=1,
        packet_loss=0,
        bandwidth=100,
        congestion=0,
        enabled=False,
    )

    graph.add_edge(
        0,
        2,
        latency=10,
        packet_loss=0,
        bandwidth=100,
        congestion=0,
        enabled=True,
    )

    graph.add_edge(
        2,
        1,
        latency=10,
        packet_loss=0,
        bandwidth=100,
        congestion=0,
        enabled=True,
    )

    result = dijkstra_latency(graph, 0, 1)

    assert result.exists is True
    assert result.path == [0, 2, 1]


def test_disconnected_graph_returns_no_path():
    graph = nx.Graph()

    graph.add_edge(
        0,
        1,
        latency=10,
        packet_loss=1,
        bandwidth=80,
        congestion=10,
        enabled=True,
    )

    graph.add_node(2)

    result = dijkstra_latency(graph, 0, 2)

    assert result.exists is False
    assert result.path == []
    assert result.cost == float("inf")


def test_disabled_destination_is_rejected():
    graph = nx.Graph()

    graph.add_edge(
        0,
        1,
        latency=10,
        packet_loss=1,
        bandwidth=80,
        congestion=10,
        enabled=True,
    )

    graph.nodes[1]["enabled"] = False

    try:
        dijkstra_latency(graph, 0, 1)
        assert False, "Expected ValueError"
    except ValueError as exc:
        assert "disabled" in str(exc)