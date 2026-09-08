import networkx as nx

from routing.aco import AntColonyOptimizer


def build_known_graph() -> nx.Graph:
    """
    Create a small graph whose optimal route is known.

    Network:

        0 ---- 1 ---- 3
         \           /
          2 --------

    Costs:
        0 -> 1 = 2
        1 -> 3 = 2

        0 -> 2 = 5
        2 -> 3 = 5

    Therefore:

        0 -> 1 -> 3 = 4

    is the known optimal route.
    """

    graph = nx.Graph()

    graph.add_edge(
        0,
        1,
        latency=20,
        packet_loss=0,
        bandwidth=100,
        congestion=0,
        enabled=True,
    )

    graph.add_edge(
        1,
        3,
        latency=20,
        packet_loss=0,
        bandwidth=100,
        congestion=0,
        enabled=True,
    )

    graph.add_edge(
        0,
        2,
        latency=150,
        packet_loss=8,
        bandwidth=30,
        congestion=70,
        enabled=True,
    )

    graph.add_edge(
        2,
        3,
        latency=150,
        packet_loss=8,
        bandwidth=30,
        congestion=70,
        enabled=True,
    )

    return graph


def test_aco_finds_a_valid_route():
    graph = build_known_graph()

    aco = AntColonyOptimizer(
        alpha=1.0,
        beta=2.0,
        evaporation_rate=0.5,
        num_ants=30,
        num_iterations=50,
        seed=42,
    )

    result = aco.find_route(
        graph,
        source=0,
        destination=3,
    )

    assert result.exists is True
    assert result.path[0] == 0
    assert result.path[-1] == 3
    assert result.cost < float("inf")


def test_aco_finds_known_optimal_route():
    graph = build_known_graph()

    aco = AntColonyOptimizer(
        alpha=1.0,
        beta=2.0,
        evaporation_rate=0.5,
        num_ants=50,
        num_iterations=100,
        seed=42,
    )

    result = aco.find_route(
        graph,
        source=0,
        destination=3,
    )

    assert result.exists is True
    assert result.path == [0, 1, 3]


def test_aco_handles_disconnected_graph():
    graph = nx.Graph()

    graph.add_edge(
        0,
        1,
        latency=20,
        packet_loss=0,
        bandwidth=100,
        congestion=0,
        enabled=True,
    )

    graph.add_node(3)

    aco = AntColonyOptimizer(
        num_ants=10,
        num_iterations=10,
        seed=42,
    )

    result = aco.find_route(
        graph,
        source=0,
        destination=3,
    )

    assert result.exists is False
    assert result.path == []
    assert result.cost == float("inf")
    assert result.iterations == 0


def test_aco_respects_disabled_links():
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
        latency=20,
        packet_loss=0,
        bandwidth=100,
        congestion=0,
        enabled=True,
    )

    graph.add_edge(
        2,
        1,
        latency=20,
        packet_loss=0,
        bandwidth=100,
        congestion=0,
        enabled=True,
    )

    aco = AntColonyOptimizer(
        num_ants=20,
        num_iterations=30,
        seed=42,
    )

    result = aco.find_route(
        graph,
        source=0,
        destination=1,
    )

    assert result.exists is True
    assert result.path == [0, 2, 1]


def test_convergence_history_has_expected_length():
    graph = build_known_graph()

    iterations = 25

    aco = AntColonyOptimizer(
        num_ants=10,
        num_iterations=iterations,
        seed=42,
    )

    result = aco.find_route(
        graph,
        source=0,
        destination=3,
    )

    assert len(result.convergence_history) == iterations


def test_same_seed_is_reproducible():
    graph = build_known_graph()

    aco_a = AntColonyOptimizer(
        num_ants=20,
        num_iterations=30,
        seed=123,
    )

    aco_b = AntColonyOptimizer(
        num_ants=20,
        num_iterations=30,
        seed=123,
    )

    result_a = aco_a.find_route(graph, 0, 3)
    result_b = aco_b.find_route(graph, 0, 3)

    assert result_a.path == result_b.path
    assert result_a.cost == result_b.cost
    assert result_a.convergence_history == result_b.convergence_history