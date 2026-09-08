"""
Network events used to simulate changing network conditions.

Events modify the existing graph in-place.

Supported events:

1. Congestion increase
2. Latency spike
3. Packet-loss increase
4. Link failure
5. Router failure
6. Combined dynamic event
"""

from __future__ import annotations

from typing import Iterable

import networkx as nx


def _require_edge(graph: nx.Graph, u: int, v: int) -> None:
    """Raise a clear error if the requested link does not exist."""

    if not graph.has_edge(u, v):
        raise ValueError(f"Link ({u}, {v}) does not exist.")


def increase_congestion(
    graph: nx.Graph,
    edges: Iterable[tuple[int, int]],
    amount: float = 30.0,
) -> list[tuple[int, int]]:
    """
    Increase congestion on selected links.

    Congestion is bounded to [0, 100] percent.

    Returns
    -------
    list
        Links successfully modified.
    """

    changed = []

    for u, v in edges:
        _require_edge(graph, u, v)

        old_value = graph[u][v]["congestion"]
        graph[u][v]["congestion"] = min(100.0, old_value + amount)

        changed.append((u, v))

    return changed


def increase_latency(
    graph: nx.Graph,
    edges: Iterable[tuple[int, int]],
    multiplier: float = 2.0,
) -> list[tuple[int, int]]:
    """
    Increase latency on selected links.

    Parameters
    ----------
    multiplier:
        Multiplicative latency increase.

        Example:
            40 ms × 2 = 80 ms
    """

    if multiplier < 1.0:
        raise ValueError("Latency multiplier must be >= 1.0.")

    changed = []

    for u, v in edges:
        _require_edge(graph, u, v)

        graph[u][v]["latency"] *= multiplier
        changed.append((u, v))

    return changed


def increase_packet_loss(
    graph: nx.Graph,
    edges: Iterable[tuple[int, int]],
    amount: float = 5.0,
) -> list[tuple[int, int]]:
    """
    Increase packet loss on selected links.

    Packet loss is bounded to [0, 100] percent.
    """

    changed = []

    for u, v in edges:
        _require_edge(graph, u, v)

        old_value = graph[u][v]["packet_loss"]
        graph[u][v]["packet_loss"] = min(100.0, old_value + amount)

        changed.append((u, v))

    return changed


def disable_link(
    graph: nx.Graph,
    u: int,
    v: int,
) -> None:
    """
    Disable a network link without deleting it from the graph.

    Keeping the edge allows the simulator to restore it later.
    """

    _require_edge(graph, u, v)

    graph[u][v]["enabled"] = False


def enable_link(
    graph: nx.Graph,
    u: int,
    v: int,
) -> None:
    """Restore a previously disabled link."""

    _require_edge(graph, u, v)

    graph[u][v]["enabled"] = True


def disable_router(
    graph: nx.Graph,
    node: int,
) -> None:
    """
    Disable a router and all links connected to it.

    The node remains in the graph but is marked inactive.
    """

    if node not in graph:
        raise ValueError(f"Router {node} does not exist.")

    graph.nodes[node]["enabled"] = False

    for neighbor in list(graph.neighbors(node)):
        graph[node][neighbor]["enabled"] = False


def enable_router(
    graph: nx.Graph,
    node: int,
) -> None:
    """
    Restore a router and its links.

    The links are restored to enabled state, but their current network
    conditions are preserved.
    """

    if node not in graph:
        raise ValueError(f"Router {node} does not exist.")

    graph.nodes[node]["enabled"] = True

    for neighbor in graph.neighbors(node):
        graph[node][neighbor]["enabled"] = True


def reset_network_node_states(graph: nx.Graph) -> None:
    """Restore all routers and links to enabled state."""

    for node in graph.nodes:
        graph.nodes[node]["enabled"] = True

    for u, v in graph.edges:
        graph[u][v]["enabled"] = True


def combined_event(
    graph: nx.Graph,
    congestion_edges: Iterable[tuple[int, int]] | None = None,
    latency_edges: Iterable[tuple[int, int]] | None = None,
    loss_edges: Iterable[tuple[int, int]] | None = None,
    failed_link: tuple[int, int] | None = None,
    failed_router: int | None = None,
) -> None:
    """
    Apply multiple network changes as one dynamic scenario event.
    """

    if congestion_edges:
        increase_congestion(graph, congestion_edges)

    if latency_edges:
        increase_latency(graph, latency_edges)

    if loss_edges:
        increase_packet_loss(graph, loss_edges)

    if failed_link:
        disable_link(graph, *failed_link)

    if failed_router is not None:
        disable_router(graph, failed_router)