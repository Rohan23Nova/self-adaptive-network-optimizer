"""
Dijkstra routing baselines.

Two routing strategies are implemented:

1. Dijkstra using raw latency.
2. Dijkstra using fuzzy-derived link cost.

The second variant uses exactly the same fuzzy quality -> cost
conversion that will later be used by ACO.

This allows a fair comparison:

    Dijkstra (latency)
    Dijkstra (fuzzy cost)
    ACO (fuzzy cost)

Routing is performed only on active links.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import networkx as nx

from fuzzy.inference import calculate_link_cost
from simulator.graph_builder import get_active_graph


@dataclass
class RouteResult:
    """
    Result returned by a routing algorithm.
    """

    path: list[int]
    cost: float
    exists: bool


def _validate_nodes(
    graph: nx.Graph,
    source: int,
    destination: int,
) -> None:
    """Validate source and destination nodes."""

    if source not in graph:
        raise ValueError(f"Source node {source} does not exist.")

    if destination not in graph:
        raise ValueError(f"Destination node {destination} does not exist.")

    if not graph.nodes[source].get("enabled", True):
        raise ValueError(f"Source node {source} is disabled.")

    if not graph.nodes[destination].get("enabled", True):
        raise ValueError(f"Destination node {destination} is disabled.")


def _no_path_result() -> RouteResult:
    """Return a consistent result for a disconnected network."""

    return RouteResult(
        path=[],
        cost=float("inf"),
        exists=False,
    )


def _run_dijkstra(
    graph: nx.Graph,
    source: int,
    destination: int,
    weight_function: Callable[[int, int, dict], float],
) -> RouteResult:
    """
    Run Dijkstra on the active network using a supplied edge-cost function.

    Tie-breaking:
        NetworkX's shortest-path implementation is used for equal-cost
        alternatives. For our deterministic graphs, insertion order provides
        deterministic behavior.

    Disconnected graphs return exists=False instead of raising an error.
    """

    _validate_nodes(graph, source, destination)

    active_graph = get_active_graph(graph)

    # If source and destination are disconnected, return explicitly.
    if not nx.has_path(active_graph, source, destination):
        return _no_path_result()

    # Create a temporary graph containing one scalar routing weight per edge.
    weighted_graph = nx.Graph()
    weighted_graph.add_nodes_from(active_graph.nodes(data=True))

    for u, v, data in active_graph.edges(data=True):
        weight = weight_function(u, v, data)

        if weight < 0:
            raise ValueError(
                f"Negative edge cost encountered on ({u}, {v})."
            )

        weighted_graph.add_edge(
            u,
            v,
            routing_weight=float(weight),
        )

    try:
        path = nx.dijkstra_path(
            weighted_graph,
            source,
            destination,
            weight="routing_weight",
        )

        cost = nx.path_weight(
            weighted_graph,
            path,
            weight="routing_weight",
        )

    except nx.NetworkXNoPath:
        return _no_path_result()

    return RouteResult(
        path=path,
        cost=float(cost),
        exists=True,
    )


def _latency_weight(
    u: int,
    v: int,
    data: dict,
) -> float:
    """Return raw latency as the routing cost."""

    return float(data["latency"])


def _fuzzy_weight(
    u: int,
    v: int,
    data: dict,
) -> float:
    """
    Calculate routing cost from fuzzy link quality.

    The quality-to-cost conversion is deliberately delegated to
    fuzzy.inference.calculate_link_cost().
    """

    _, cost = calculate_link_cost(
        latency=data["latency"],
        packet_loss=data["packet_loss"],
        bandwidth=data["bandwidth"],
        congestion=data["congestion"],
    )

    return float(cost)


def dijkstra_latency(
    graph: nx.Graph,
    source: int,
    destination: int,
) -> RouteResult:
    """
    Dijkstra baseline using raw latency.

    Lower total latency is preferred.
    """

    return _run_dijkstra(
        graph=graph,
        source=source,
        destination=destination,
        weight_function=_latency_weight,
    )


def dijkstra_fuzzy(
    graph: nx.Graph,
    source: int,
    destination: int,
) -> RouteResult:
    """
    Dijkstra using fuzzy-derived routing cost.

    The fuzzy engine evaluates all four network parameters:

        latency
        packet loss
        bandwidth
        congestion

    and converts the resulting quality into routing cost.
    """

    return _run_dijkstra(
        graph=graph,
        source=source,
        destination=destination,
        weight_function=_fuzzy_weight,
    )