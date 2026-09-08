"""
Evaluation metrics for the Self-Adaptive Computer Network Optimizer.

This module contains metrics used to compare:

1. Dijkstra using raw latency
2. Dijkstra using fuzzy-derived cost
3. ACO using fuzzy-derived cost

All metrics are calculated from actual graph and route data.
No experimental values are generated or fabricated here.
"""

from __future__ import annotations

from typing import Iterable

import networkx as nx


def calculate_route_latency(
    graph: nx.Graph,
    path: list[int],
) -> float:
    """
    Calculate total latency along a route.

    Returns infinity if the route does not exist.
    """

    if not path:
        return float("inf")

    total_latency = 0.0

    for u, v in zip(path, path[1:]):
        if not graph.has_edge(u, v):
            return float("inf")

        if not graph[u][v].get("enabled", True):
            return float("inf")

        total_latency += graph[u][v]["latency"]

    return float(total_latency)


def calculate_route_packet_loss(
    graph: nx.Graph,
    path: list[int],
) -> float:
    """
    Estimate end-to-end packet-loss probability.

    Each edge stores packet loss as a percentage.

    Assuming independent losses, the probability of successful
    transmission across the complete route is:

        product(1 - p_i)

    Therefore:

        route_loss = 1 - product(1 - p_i)

    Result is returned as a percentage.
    """

    if not path:
        return float("inf")

    success_probability = 1.0

    for u, v in zip(path, path[1:]):
        if not graph.has_edge(u, v):
            return float("inf")

        if not graph[u][v].get("enabled", True):
            return float("inf")

        loss_fraction = graph[u][v]["packet_loss"] / 100.0

        success_probability *= 1.0 - loss_fraction

    route_loss = (1.0 - success_probability) * 100.0

    return float(route_loss)


def calculate_route_bandwidth(
    graph: nx.Graph,
    path: list[int],
) -> float:
    """
    Calculate bottleneck bandwidth.

    End-to-end bandwidth is limited by the lowest-bandwidth
    link on the selected route.
    """

    if not path:
        return 0.0

    bandwidths = []

    for u, v in zip(path, path[1:]):
        if not graph.has_edge(u, v):
            return 0.0

        if not graph[u][v].get("enabled", True):
            return 0.0

        bandwidths.append(
            graph[u][v]["bandwidth"]
        )

    if not bandwidths:
        return 0.0

    return float(min(bandwidths))


def calculate_route_congestion(
    graph: nx.Graph,
    path: list[int],
) -> float:
    """
    Calculate average congestion across the route.
    """

    if not path:
        return float("inf")

    congestion_values = []

    for u, v in zip(path, path[1:]):
        if not graph.has_edge(u, v):
            return float("inf")

        if not graph[u][v].get("enabled", True):
            return float("inf")

        congestion_values.append(
            graph[u][v]["congestion"]
        )

    if not congestion_values:
        return 0.0

    return float(
        sum(congestion_values)
        / len(congestion_values)
    )


def count_route_changes(
    previous_route: list[int] | None,
    current_route: list[int] | None,
) -> int:
    """
    Return 1 if the route changed, otherwise 0.

    A missing route and a valid route are considered different.
    """

    previous_route = previous_route or []
    current_route = current_route or []

    return int(previous_route != current_route)


def calculate_route_cost(
    edge_costs: dict[tuple[int, int], float],
    path: list[int],
) -> float:
    """
    Calculate total routing cost for a path.

    Edge keys are treated as undirected.
    """

    if not path:
        return float("inf")

    total = 0.0

    for u, v in zip(path, path[1:]):

        key = (u, v)

        if key not in edge_costs:
            key = (v, u)

        if key not in edge_costs:
            return float("inf")

        total += edge_costs[key]

    return float(total)


def calculate_route_metrics(
    graph: nx.Graph,
    path: list[int],
    route_cost: float,
) -> dict[str, float]:
    """
    Calculate all major metrics for one route.
    """

    return {
        "route_cost": float(route_cost),
        "latency_ms": calculate_route_latency(
            graph,
            path,
        ),
        "packet_loss_percent": calculate_route_packet_loss(
            graph,
            path,
        ),
        "bandwidth_mbps": calculate_route_bandwidth(
            graph,
            path,
        ),
        "congestion_percent": calculate_route_congestion(
            graph,
            path,
        ),
    }


def calculate_performance_delta(
    old_metrics: dict[str, float],
    new_metrics: dict[str, float],
) -> dict[str, float]:
    """
    Calculate before/after performance changes.

    Positive latency/loss/cost delta means degradation.

    Positive bandwidth delta means improvement.
    """

    return {
        "latency_delta_ms": (
            new_metrics["latency_ms"]
            - old_metrics["latency_ms"]
        ),
        "packet_loss_delta_percent": (
            new_metrics["packet_loss_percent"]
            - old_metrics["packet_loss_percent"]
        ),
        "bandwidth_delta_mbps": (
            new_metrics["bandwidth_mbps"]
            - old_metrics["bandwidth_mbps"]
        ),
        "route_cost_delta": (
            new_metrics["route_cost"]
            - old_metrics["route_cost"]
        ),
    }