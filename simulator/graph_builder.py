"""
Network topology construction for the Self-Adaptive Computer Network Optimizer.

The simulator represents a computer network as a weighted undirected graph.
Each edge contains multiple network-condition parameters:

    latency       -> milliseconds
    packet_loss   -> percentage
    bandwidth     -> Mbps
    congestion    -> percentage

Routing algorithms are NOT implemented here.
This module is responsible only for creating and inspecting network state.
"""

from __future__ import annotations

import random
from typing import Optional

import networkx as nx


def _add_link(
    graph: nx.Graph,
    u: int,
    v: int,
    latency: float,
    packet_loss: float,
    bandwidth: float,
    congestion: float,
) -> None:
    """Add a network link with its current conditions."""

    graph.add_edge(
        u,
        v,
        latency=float(latency),
        packet_loss=float(packet_loss),
        bandwidth=float(bandwidth),
        congestion=float(congestion),
        enabled=True,
    )


def build_demo_graph() -> nx.Graph:
    """
    Build the deterministic 8-node topology used by the Streamlit demo.

    The topology intentionally contains multiple possible routes between
    source and destination so that network events can cause route changes.
    """

    graph = nx.Graph()

    graph.add_nodes_from(
        (node, {"enabled": True})
        for node in range(8)
    )

    links = [
        # u, v, latency, loss, bandwidth, congestion
        (0, 1, 25, 0.8, 80, 20),
        (0, 2, 35, 1.0, 90, 15),
        (0, 3, 45, 1.2, 70, 25),

        (1, 2, 20, 0.6, 85, 25),
        (1, 4, 30, 0.8, 75, 20),

        (2, 3, 18, 0.5, 95, 15),
        (2, 4, 25, 0.7, 90, 20),
        (2, 5, 35, 1.0, 80, 25),

        (3, 5, 22, 0.6, 85, 20),

        (4, 6, 20, 0.5, 90, 15),
        (5, 6, 25, 0.7, 85, 20),

        (5, 7, 28, 0.8, 80, 20),
        (6, 7, 18, 0.5, 95, 10),
    ]

    for link in links:
        _add_link(graph, *link)

    return graph


def build_experiment_graph(
    num_nodes: int = 25,
    seed: int = 42,
) -> nx.Graph:
    """
    Build a reproducible larger network for experiments.

    Parameters
    ----------
    num_nodes:
        Number of routers/nodes.

    seed:
        Random seed controlling topology and link parameters.

    Returns
    -------
    nx.Graph
        Connected network graph with realistic link attributes.

    Raises
    ------
    ValueError
        If num_nodes is less than 2.
    """

    if num_nodes < 2:
        raise ValueError("num_nodes must be at least 2.")

    rng = random.Random(seed)

    # Start with a random geometric graph. This gives a network with
    # locally connected nodes rather than completely arbitrary connections.
    graph = nx.random_geometric_graph(
        num_nodes,
        radius=0.42,
        seed=seed,
    )
    # Explicitly initialize every router as enabled.
    for node in graph.nodes:
        graph.nodes[node]["enabled"] = True


    # Guarantee connectivity.
    if not nx.is_connected(graph):
        components = list(nx.connected_components(graph))

        for first, second in zip(components, components[1:]):
            u = rng.choice(list(first))
            v = rng.choice(list(second))
            graph.add_edge(u, v)

    # Assign network conditions to every edge.
    for u, v in graph.edges():
        latency = rng.uniform(10.0, 120.0)
        packet_loss = rng.uniform(0.0, 5.0)
        bandwidth = rng.uniform(20.0, 100.0)
        congestion = rng.uniform(5.0, 60.0)

        graph[u][v].update(
            latency=float(latency),
            packet_loss=float(packet_loss),
            bandwidth=float(bandwidth),
            congestion=float(congestion),
            enabled=True,
        )

    return graph


def get_active_graph(graph: nx.Graph) -> nx.Graph:
    """
    Return a copy containing only currently enabled links.

    Disabled links remain in the original graph so that they can later
    be restored by the simulator.
    """

    active = nx.Graph()
    active.add_nodes_from(graph.nodes(data=True))

    for u, v, data in graph.edges(data=True):
        if (
            data.get("enabled", True)
            and graph.nodes[u].get("enabled", True)
            and graph.nodes[v].get("enabled", True)
        ):
            active.add_edge(u, v, **data)

    # Remove isolated nodes only if they are not useful as source/destination.
    # Keeping nodes makes the network state easier to visualize.
    return active


def get_edge_conditions(
    graph: nx.Graph,
    u: int,
    v: int,
) -> Optional[dict]:
    """Return a copy of the current conditions for a link."""

    if not graph.has_edge(u, v):
        return None

    return dict(graph[u][v])