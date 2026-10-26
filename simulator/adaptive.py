"""
Adaptive routing engine for the Self-Adaptive Computer Network Optimizer.

This module coordinates:
1. Dynamic network events (congestion, latency, loss, link/router failure).
2. Incremental fuzzy quality and cost recomputation with edge caching.
3. Rerouting decision triggers (quality drop, cost degradation, topological invalidation).
4. Invocation of Ant Colony Optimization (ACO) on demand.
5. Tracking before/after route metrics and performance deltas.
"""

from __future__ import annotations

import copy
import time
from dataclasses import dataclass, field
from typing import Iterable, Optional

import networkx as nx

import config
from evaluation.metrics import (
    calculate_performance_delta,
    calculate_route_metrics,
)
from fuzzy.inference import calculate_link_cost
from routing.aco import AntColonyOptimizer
from simulator.events import (
    combined_event,
    disable_link,
    disable_router,
    enable_link,
    enable_router,
    increase_congestion,
    increase_latency,
    increase_packet_loss,
)
from simulator.graph_builder import build_demo_graph, get_active_graph


def canonical_edge(u: int, v: int) -> tuple[int, int]:
    """Return canonical undirected edge key with u <= v."""
    return (u, v) if u <= v else (v, u)


@dataclass
class AdaptiveEventResult:
    """
    Structured outcome of applying an event to the adaptive engine.
    """

    event_name: str
    changed_edges: list[tuple[int, int]]
    changed_nodes: list[int]
    previous_route: list[int]
    previous_route_cost: float
    triggered: bool
    trigger_reason: str
    new_route: list[int]
    new_route_cost: float
    previous_metrics: dict[str, float]
    new_metrics: dict[str, float]
    performance_delta: dict[str, float]
    route_changed: bool
    processing_time_seconds: float
    reroute_time_seconds: float
    unreachable: bool
    error: Optional[str] = None


class AdaptiveRoutingEngine:
    """
    Stateful adaptive routing engine that observes dynamic network events,
    evaluates fuzzy-derived link metrics, and triggers ACO rerouting when necessary.
    """

    def __init__(
        self,
        graph: Optional[nx.Graph] = None,
        source: int = config.DEFAULT_SOURCE,
        destination: int = config.DEFAULT_DESTINATION,
        quality_threshold: float = config.QUALITY_CHANGE_THRESHOLD,
        cost_threshold: float = config.ROUTE_COST_DEGRADATION_THRESHOLD,
        aco_optimizer: Optional[AntColonyOptimizer] = None,
        seed: int = config.DEFAULT_RANDOM_SEED,
    ) -> None:
        if graph is None:
            base = build_demo_graph()
        else:
            base = graph

        if source not in base:
            raise ValueError(f"Source node {source} not present in graph.")
        if destination not in base:
            raise ValueError(f"Destination node {destination} not present in graph.")

        self.source = source
        self.destination = destination
        self.quality_threshold = float(quality_threshold)
        self.cost_threshold = float(cost_threshold)
        self.seed = seed

        # Keep base_graph immutable as reference for reset()
        self.base_graph = copy.deepcopy(base)
        # Working mutable graph
        self.graph = copy.deepcopy(base)

        if aco_optimizer is not None:
            self.aco_optimizer = aco_optimizer
        else:
            self.aco_optimizer = AntColonyOptimizer(
                alpha=config.ACO_ALPHA,
                beta=config.ACO_BETA,
                evaporation_rate=config.ACO_EVAPORATION_RATE,
                num_ants=config.ACO_NUM_ANTS,
                num_iterations=config.ACO_NUM_ITERATIONS,
                initial_pheromone=config.PHEROMONE_INITIAL,
                min_pheromone=config.PHEROMONE_MIN,
                max_pheromone=config.PHEROMONE_MAX,
                seed=self.seed,
            )

        # Edge cache: canonical_edge -> {"data": dict, "quality": float, "cost": float}
        self.link_cache: dict[tuple[int, int], dict] = {}
        self.history: list[AdaptiveEventResult] = []
        self.total_route_changes: int = 0

        # Initialize caches and find initial route
        self._update_all_link_caches()
        self._initialize_route()

    # -----------------------------------------------------------------------
    # Cache management
    # -----------------------------------------------------------------------

    def _compute_edge_cost(self, u: int, v: int) -> tuple[float, float]:
        """Compute fuzzy quality and routing cost for an edge from current graph data."""
        data = self.graph[u][v]
        return calculate_link_cost(
            latency=data["latency"],
            packet_loss=data["packet_loss"],
            bandwidth=data["bandwidth"],
            congestion=data["congestion"],
        )

    def _update_all_link_caches(self) -> None:
        """Populate the link cache for all edges in the current graph."""
        self.link_cache.clear()
        for u, v, data in self.graph.edges(data=True):
            key = canonical_edge(u, v)
            quality, cost = self._compute_edge_cost(u, v)
            self.link_cache[key] = {
                "latency": float(data["latency"]),
                "packet_loss": float(data["packet_loss"]),
                "bandwidth": float(data["bandwidth"]),
                "congestion": float(data["congestion"]),
                "enabled": bool(data.get("enabled", True)),
                "quality": float(quality),
                "cost": float(cost),
            }

    def _sync_affected_edges(
        self,
        affected_edges: Iterable[tuple[int, int]],
    ) -> dict[tuple[int, int], tuple[float, float, float, float]]:
        """
        Incrementally update cached quality and cost for affected edges.

        Returns
        -------
        dict
            canonical_edge -> (old_quality, new_quality, old_cost, new_cost)
        """
        changes: dict[tuple[int, int], tuple[float, float, float, float]] = {}

        for u, v in affected_edges:
            key = canonical_edge(u, v)
            if not self.graph.has_edge(u, v):
                if key in self.link_cache:
                    old_q = self.link_cache[key]["quality"]
                    old_c = self.link_cache[key]["cost"]
                    del self.link_cache[key]
                    changes[key] = (old_q, 0.0, old_c, float("inf"))
                continue

            data = self.graph[u][v]
            cached = self.link_cache.get(key)

            if cached is not None:
                # Check whether condition attributes actually changed
                is_same = (
                    cached["latency"] == data["latency"]
                    and cached["packet_loss"] == data["packet_loss"]
                    and cached["bandwidth"] == data["bandwidth"]
                    and cached["congestion"] == data["congestion"]
                    and cached["enabled"] == data.get("enabled", True)
                )
                if is_same:
                    continue
                old_q = cached["quality"]
                old_c = cached["cost"]
            else:
                old_q = 0.5
                old_c = 2.0

            quality, cost = self._compute_edge_cost(u, v)
            self.link_cache[key] = {
                "latency": float(data["latency"]),
                "packet_loss": float(data["packet_loss"]),
                "bandwidth": float(data["bandwidth"]),
                "congestion": float(data["congestion"]),
                "enabled": bool(data.get("enabled", True)),
                "quality": float(quality),
                "cost": float(cost),
            }
            changes[key] = (old_q, quality, old_c, cost)

        return changes

    # -----------------------------------------------------------------------
    # Route initialization & cost calculation
    # -----------------------------------------------------------------------

    def _compute_path_cost(self, path: list[int]) -> float:
        """Calculate total fuzzy-derived routing cost for a path using the cache."""
        if len(path) < 2:
            return 0.0

        total_cost = 0.0
        for u, v in zip(path, path[1:]):
            key = canonical_edge(u, v)
            if key not in self.link_cache:
                return float("inf")
            if not self.link_cache[key]["enabled"]:
                return float("inf")
            total_cost += self.link_cache[key]["cost"]
        return float(total_cost)

    def _initialize_route(self) -> None:
        """Find the initial route using the configured ACO router."""
        active = get_active_graph(self.graph)
        has_connectivity = (
            self.source in active
            and self.destination in active
            and nx.has_path(active, self.source, self.destination)
        )

        if not has_connectivity:
            self.current_route = []
            self.current_route_cost = float("inf")
            self.reference_route_cost = float("inf")
            self.current_metrics = calculate_route_metrics(
                self.graph,
                [],
                float("inf"),
            )
            return

        result = self.aco_optimizer.find_route(
            self.graph,
            self.source,
            self.destination,
        )

        if result.exists:
            self.current_route = list(result.path)
            self.current_route_cost = float(result.cost)
            self.reference_route_cost = float(result.cost)
            self.current_metrics = calculate_route_metrics(
                self.graph,
                self.current_route,
                self.current_route_cost,
            )
        else:
            self.current_route = []
            self.current_route_cost = float("inf")
            self.reference_route_cost = float("inf")
            self.current_metrics = calculate_route_metrics(
                self.graph,
                [],
                float("inf"),
            )

    # -----------------------------------------------------------------------
    # Trigger logic
    # -----------------------------------------------------------------------

    def evaluate_trigger(
        self,
        changed_quality_map: dict[tuple[int, int], tuple[float, float, float, float]],
        changed_nodes: list[int],
    ) -> tuple[bool, str, float]:
        """
        Determine whether adaptive rerouting is necessary.

        Semantics:
        1. Topological invalidation: If any node or edge on the current route
           is disabled or missing, reroute immediately.
        2. Quality threshold: If any edge on the current route experiences a
           relative quality drop >= quality_threshold, trigger rerouting.
        3. Cost degradation: If the updated cost of the current route exceeds
           reference_route_cost by >= cost_threshold (relative degradation),
           trigger rerouting.
        4. Safe handling: Zero reference costs and empty routes are handled
           without division by zero.

        Returns
        -------
        tuple
            (triggered: bool, reason: str, updated_current_cost: float)
        """
        # Case A: Current route is empty but network may have recovered
        if not self.current_route:
            active = get_active_graph(self.graph)
            if (
                self.source in active
                and self.destination in active
                and nx.has_path(active, self.source, self.destination)
            ):
                return True, "network_recovered_path_available", float("inf")
            return False, "network_unreachable_no_route", float("inf")

        # Case B: Router on current route disabled
        for node in self.current_route:
            if not self.graph.nodes[node].get("enabled", True):
                return (
                    True,
                    f"router_{node}_disabled_on_current_route",
                    float("inf"),
                )

        # Case C: Link on current route disabled or removed
        for u, v in zip(self.current_route, self.current_route[1:]):
            if not self.graph.has_edge(u, v):
                return (
                    True,
                    f"link_{canonical_edge(u, v)}_missing_from_route",
                    float("inf"),
                )
            if not self.graph[u][v].get("enabled", True):
                return (
                    True,
                    f"link_{canonical_edge(u, v)}_disabled_on_current_route",
                    float("inf"),
                )

        # Calculate current route cost with new link conditions
        updated_cost = self._compute_path_cost(self.current_route)

        # Case D: Quality drop on any link on the current route
        route_edges = {
            canonical_edge(u, v)
            for u, v in zip(self.current_route, self.current_route[1:])
        }

        for edge, (old_q, new_q, _, _) in changed_quality_map.items():
            if edge in route_edges and new_q < old_q:
                if old_q > 0:
                    relative_drop = (old_q - new_q) / old_q
                else:
                    relative_drop = 1.0

                if relative_drop >= self.quality_threshold:
                    return (
                        True,
                        f"link_{edge}_quality_drop_{relative_drop:.1%}_exceeds_threshold_{self.quality_threshold:.1%}",
                        updated_cost,
                    )

        # Case E: Route cost degradation compared to reference baseline
        if self.reference_route_cost > 0 and self.reference_route_cost < float("inf"):
            cost_degradation = (
                updated_cost - self.reference_route_cost
            ) / self.reference_route_cost

            if cost_degradation >= self.cost_threshold:
                return (
                    True,
                    f"route_cost_degradation_{cost_degradation:.1%}_exceeds_threshold_{self.cost_threshold:.1%}",
                    updated_cost,
                )
        elif self.reference_route_cost <= 0 and updated_cost > 0:
            return True, "route_cost_increased_from_zero", updated_cost

        # Case F: Conditions changed but within tolerance
        return False, "thresholds_not_exceeded", updated_cost

    # -----------------------------------------------------------------------
    # Core event pipeline
    # -----------------------------------------------------------------------

    def _process_event(
        self,
        event_name: str,
        changed_edges: list[tuple[int, int]],
        changed_nodes: list[int],
    ) -> AdaptiveEventResult:
        """
        Execute the adaptive feedback loop for any applied event.
        """
        t_start = time.perf_counter()

        previous_route = list(self.current_route)
        previous_route_cost = float(self.current_route_cost)
        previous_metrics = dict(self.current_metrics)

        # 1. Update cache incrementally for affected links
        changed_quality_map = self._sync_affected_edges(changed_edges)

        # 2. Evaluate trigger condition
        triggered, trigger_reason, updated_cost = self.evaluate_trigger(
            changed_quality_map=changed_quality_map,
            changed_nodes=changed_nodes,
        )

        reroute_time = 0.0
        error: Optional[str] = None
        unreachable = False

        if triggered:
            active_graph = get_active_graph(self.graph)
            can_reach = (
                self.source in active_graph
                and self.destination in active_graph
                and nx.has_path(active_graph, self.source, self.destination)
            )

            if not can_reach:
                unreachable = True
                new_route: list[int] = []
                new_route_cost = float("inf")
                route_changed = previous_route != []
                self.current_route = []
                self.current_route_cost = float("inf")
                self.reference_route_cost = float("inf")
                new_metrics = calculate_route_metrics(self.graph, [], float("inf"))
            else:
                t_algo_start = time.perf_counter()
                aco_result = self.aco_optimizer.find_route(
                    self.graph,
                    self.source,
                    self.destination,
                )
                reroute_time = time.perf_counter() - t_algo_start

                if aco_result.exists:
                    new_route = list(aco_result.path)
                    new_route_cost = float(aco_result.cost)
                    route_changed = new_route != previous_route
                    self.current_route = new_route
                    self.current_route_cost = new_route_cost
                    if route_changed:
                        self.reference_route_cost = new_route_cost
                        self.total_route_changes += 1
                    new_metrics = calculate_route_metrics(
                        self.graph,
                        new_route,
                        new_route_cost,
                    )
                else:
                    unreachable = False
                    error = "ACO failed to find route despite network connectivity."
                    new_route = []
                    new_route_cost = float("inf")
                    route_changed = previous_route != []
                    self.current_route = []
                    self.current_route_cost = float("inf")
                    new_metrics = calculate_route_metrics(self.graph, [], float("inf"))
        else:
            # Route maintained: update cost and metrics under new conditions
            new_route = list(self.current_route)
            new_route_cost = float(updated_cost)
            self.current_route_cost = new_route_cost
            route_changed = False
            new_metrics = calculate_route_metrics(
                self.graph,
                self.current_route,
                self.current_route_cost,
            )

        perf_delta = calculate_performance_delta(previous_metrics, new_metrics)
        processing_time = time.perf_counter() - t_start

        result = AdaptiveEventResult(
            event_name=event_name,
            changed_edges=list(changed_edges),
            changed_nodes=list(changed_nodes),
            previous_route=previous_route,
            previous_route_cost=previous_route_cost,
            triggered=triggered,
            trigger_reason=trigger_reason,
            new_route=new_route,
            new_route_cost=new_route_cost,
            previous_metrics=previous_metrics,
            new_metrics=new_metrics,
            performance_delta=perf_delta,
            route_changed=route_changed,
            processing_time_seconds=processing_time,
            reroute_time_seconds=reroute_time,
            unreachable=unreachable,
            error=error,
        )

        self.history.append(result)
        return result

    # -----------------------------------------------------------------------
    # Public event actions
    # -----------------------------------------------------------------------

    def apply_congestion(
        self,
        edges: Iterable[tuple[int, int]],
        amount: float = 30.0,
    ) -> AdaptiveEventResult:
        """Increase congestion on selected links and execute adaptive loop."""
        changed = increase_congestion(self.graph, edges, amount=amount)
        return self._process_event("congestion_increase", changed, [])

    def apply_latency(
        self,
        edges: Iterable[tuple[int, int]],
        multiplier: float = 2.0,
    ) -> AdaptiveEventResult:
        """Increase latency on selected links and execute adaptive loop."""
        changed = increase_latency(self.graph, edges, multiplier=multiplier)
        return self._process_event("latency_increase", changed, [])

    def apply_packet_loss(
        self,
        edges: Iterable[tuple[int, int]],
        amount: float = 5.0,
    ) -> AdaptiveEventResult:
        """Increase packet loss on selected links and execute adaptive loop."""
        changed = increase_packet_loss(self.graph, edges, amount=amount)
        return self._process_event("packet_loss_increase", changed, [])

    def apply_link_failure(
        self,
        u: int,
        v: int,
    ) -> AdaptiveEventResult:
        """Disable a link and execute adaptive loop."""
        disable_link(self.graph, u, v)
        return self._process_event("link_failure", [(u, v)], [])

    def apply_link_restoration(
        self,
        u: int,
        v: int,
    ) -> AdaptiveEventResult:
        """Restore a previously disabled link and execute adaptive loop."""
        enable_link(self.graph, u, v)
        return self._process_event("link_restoration", [(u, v)], [])

    def apply_router_failure(
        self,
        node: int,
    ) -> AdaptiveEventResult:
        """Disable a router and all connected links, then execute adaptive loop."""
        incident_edges = [
            (node, neighbor)
            for neighbor in self.graph.neighbors(node)
        ]
        disable_router(self.graph, node)
        return self._process_event("router_failure", incident_edges, [node])

    def apply_router_restoration(
        self,
        node: int,
    ) -> AdaptiveEventResult:
        """Restore a disabled router and all connected links, then execute adaptive loop."""
        incident_edges = [
            (node, neighbor)
            for neighbor in self.graph.neighbors(node)
        ]
        enable_router(self.graph, node)
        return self._process_event("router_restoration", incident_edges, [node])

    def apply_combined_event(
        self,
        congestion_edges: Optional[Iterable[tuple[int, int]]] = None,
        latency_edges: Optional[Iterable[tuple[int, int]]] = None,
        loss_edges: Optional[Iterable[tuple[int, int]]] = None,
        failed_link: Optional[tuple[int, int]] = None,
        failed_router: Optional[int] = None,
    ) -> AdaptiveEventResult:
        """Apply combined dynamic events and execute adaptive loop."""
        all_changed_edges: set[tuple[int, int]] = set()
        all_changed_nodes: list[int] = []

        if congestion_edges:
            c_edges = increase_congestion(self.graph, congestion_edges)
            all_changed_edges.update(c_edges)

        if latency_edges:
            l_edges = increase_latency(self.graph, latency_edges)
            all_changed_edges.update(l_edges)

        if loss_edges:
            p_edges = increase_packet_loss(self.graph, loss_edges)
            all_changed_edges.update(p_edges)

        if failed_link:
            disable_link(self.graph, *failed_link)
            all_changed_edges.add(failed_link)

        if failed_router is not None:
            all_changed_nodes.append(failed_router)
            for neighbor in self.graph.neighbors(failed_router):
                all_changed_edges.add((failed_router, neighbor))
            disable_router(self.graph, failed_router)

        return self._process_event(
            "combined_event",
            list(all_changed_edges),
            all_changed_nodes,
        )

    def reset(self) -> None:
        """
        Reset simulation to initial graph state without corrupting base graph.
        """
        self.graph = copy.deepcopy(self.base_graph)
        self.link_cache.clear()
        self.history.clear()
        self.total_route_changes = 0

        # Reset ACO state
        active = get_active_graph(self.graph)
        self.aco_optimizer._initialize_pheromones(active)

        self._update_all_link_caches()
        self._initialize_route()


# ---------------------------------------------------------------------------
# CLI demonstration
# -----------------------------------------------------------------------

def main() -> None:
    """Run interactive demonstration of adaptive engine in terminal."""
    print("=" * 70)
    print("SELF-ADAPTIVE ROUTING ENGINE DEMONSTRATION")
    print("=" * 70)

    engine = AdaptiveRoutingEngine(
        source=0,
        destination=7,
        seed=42,
    )

    print(f"Source Node: {engine.source}")
    print(f"Destination Node: {engine.destination}")
    print(f"Initial Route: {engine.current_route}")
    print(f"Initial Cost: {engine.current_route_cost:.4f}")
    print(f"Initial Latency: {engine.current_metrics['latency_ms']:.1f} ms")
    print(f"Initial Loss: {engine.current_metrics['packet_loss_percent']:.2f}%")
    print(f"Initial Congestion: {engine.current_metrics['congestion_percent']:.1f}%\n")

    # Step 1: Minor congestion (below threshold)
    first_hop = (engine.current_route[0], engine.current_route[1])
    print(f"[Event 1] Applying minor congestion (+5%) on link {first_hop}...")
    res1 = engine.apply_congestion([first_hop], amount=5.0)
    print(f"  Triggered: {res1.triggered} ({res1.trigger_reason})")
    print(f"  Route: {res1.new_route} (Changed: {res1.route_changed})\n")

    # Step 2: Severe latency spike on primary route
    print(f"[Event 2] Applying severe latency spike (7.5x) on link {first_hop}...")
    res2 = engine.apply_latency([first_hop], multiplier=7.5)
    print(f"  Triggered: {res2.triggered} ({res2.trigger_reason})")
    print(f"  Previous Route: {res2.previous_route} (Cost: {res2.previous_route_cost:.4f})")
    print(f"  New Route: {res2.new_route} (Cost: {res2.new_route_cost:.4f})")
    print(f"  Route Changed: {res2.route_changed}")
    print(f"  Recovery Time: {res2.processing_time_seconds * 1000:.2f} ms\n")

    # Step 3: Link failure on active route
    active_link = (engine.current_route[0], engine.current_route[1])
    print(f"[Event 3] Simulating link failure on {active_link}...")
    res3 = engine.apply_link_failure(*active_link)
    print(f"  Triggered: {res3.triggered} ({res3.trigger_reason})")
    print(f"  Rerouted to: {res3.new_route} (Cost: {res3.new_route_cost:.4f})")
    print(f"  Total Route Changes So Far: {engine.total_route_changes}\n")

    # Step 4: Router failure
    target_router = engine.current_route[1]
    print(f"[Event 4] Disabling intermediate router {target_router}...")
    res4 = engine.apply_router_failure(target_router)
    print(f"  Triggered: {res4.triggered} ({res4.trigger_reason})")
    print(f"  Rerouted to: {res4.new_route} (Unreachable: {res4.unreachable})\n")

    # Step 5: Reset
    print("[Event 5] Resetting network to initial state...")
    engine.reset()
    print(f"  Reset Complete. Route: {engine.current_route} (Cost: {engine.current_route_cost:.4f})")
    print(f"  Total Route Changes After Reset: {engine.total_route_changes}")
    print("=" * 70)


if __name__ == "__main__":
    main()
