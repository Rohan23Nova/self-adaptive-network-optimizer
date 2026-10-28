"""
Session Manager for NEXUS Network Intelligence API.

Maintains isolated, stateful simulation sessions in memory.
Each session encapsulates its own graph topology, adaptive engine,
history, and endpoint configuration.
"""

from __future__ import annotations

import copy
import datetime
import math
import threading
import time
import uuid
from typing import Any, Optional

import networkx as nx

import config
from api.schemas import (
    CompareRequest,
    CompareStrategiesResponse,
    EdgeModel,
    EventRequest,
    EventResponse,
    MetricsModel,
    NodeModel,
    SessionResponse,
    StrategyResultModel,
    TopologyResponse,
    safe_float,
)
from evaluation.metrics import calculate_route_metrics
from routing.aco import AntColonyOptimizer
from routing.dijkstra_baseline import dijkstra_fuzzy, dijkstra_latency
from simulator.adaptive import AdaptiveEventResult, AdaptiveRoutingEngine, canonical_edge
from simulator.graph_builder import (
    build_demo_graph,
    build_experiment_graph,
    get_active_graph,
)


class SessionNotFoundError(Exception):
    """Raised when a requested session_id does not exist."""
    pass


class InvalidEventError(ValueError):
    """Raised when an invalid event type or parameter is submitted."""
    pass


class SimulationSession:
    """
    Isolated stateful simulation session holding an independent AdaptiveRoutingEngine.
    """

    def __init__(
        self,
        session_id: str,
        topology_type: str = "demo",
        source: Optional[int] = None,
        destination: Optional[int] = None,
        quality_threshold: Optional[float] = None,
        cost_threshold: Optional[float] = None,
        seed: int = 42,
    ) -> None:
        self.session_id = session_id
        self.topology_type = topology_type
        self.seed = seed

        # Build initial base graph
        if topology_type == "demo":
            base_graph = build_demo_graph()
            default_src = 0
            default_dst = 7
        else:
            base_graph = build_experiment_graph(num_nodes=25, seed=seed)
            default_src = 0
            default_dst = 24

        src = source if source is not None else default_src
        dst = destination if destination is not None else default_dst

        q_thresh = quality_threshold if quality_threshold is not None else config.QUALITY_CHANGE_THRESHOLD
        c_thresh = cost_threshold if cost_threshold is not None else config.ROUTE_COST_DEGRADATION_THRESHOLD

        self.engine = AdaptiveRoutingEngine(
            graph=base_graph,
            source=src,
            destination=dst,
            quality_threshold=q_thresh,
            cost_threshold=c_thresh,
            seed=seed,
        )

        now = datetime.datetime.now().isoformat()
        self.created_at = now
        self.updated_at = now
        self.lock = threading.Lock()

    def get_topology_snapshot(self) -> TopologyResponse:
        """Serialize current working graph topology with route highlights and status."""
        graph = self.engine.graph
        route_edges = set()
        if len(self.engine.current_route) >= 2:
            for u, v in zip(self.engine.current_route, self.engine.current_route[1:]):
                route_edges.add((min(u, v), max(u, v)))

        nodes: list[NodeModel] = []
        for n in graph.nodes():
            is_enabled = bool(graph.nodes[n].get("enabled", True))
            role = "intermediate"
            if n == self.engine.source:
                role = "source"
            elif n == self.engine.destination:
                role = "destination"

            nodes.append(
                NodeModel(
                    id=int(n),
                    enabled=is_enabled,
                    role=role,
                    incident_links=len(list(graph.neighbors(n))),
                )
            )

        edges: list[EdgeModel] = []
        for u, v, data in graph.edges(data=True):
            canon = (min(u, v), max(u, v))
            is_on_route = canon in route_edges
            is_enabled = bool(
                data.get("enabled", True)
                and graph.nodes[u].get("enabled", True)
                and graph.nodes[v].get("enabled", True)
            )

            # Extract quality and cost from cache if present
            cached = self.engine.link_cache.get(canon)
            quality = cached.get("quality") if cached else None
            cost = cached.get("cost") if cached else None

            edges.append(
                EdgeModel(
                    source=canon[0],
                    target=canon[1],
                    latency=round(float(data["latency"]), 2),
                    packet_loss=round(float(data["packet_loss"]), 2),
                    bandwidth=round(float(data["bandwidth"]), 2),
                    congestion=round(float(data["congestion"]), 2),
                    enabled=is_enabled,
                    quality=safe_float(quality),
                    cost=safe_float(cost),
                    on_route=is_on_route,
                )
            )

        return TopologyResponse(
            topology_type=self.topology_type,
            num_nodes=graph.number_of_nodes(),
            num_edges=graph.number_of_edges(),
            nodes=nodes,
            edges=edges,
        )

    def to_response(self, include_topology: bool = True) -> SessionResponse:
        """Convert session state to Pydantic SessionResponse."""
        is_reachable = len(self.engine.current_route) > 0 and math.isfinite(self.engine.current_route_cost)

        topology_snap = self.get_topology_snapshot() if include_topology else None

        return SessionResponse(
            session_id=self.session_id,
            topology_type=self.topology_type,
            source=self.engine.source,
            destination=self.engine.destination,
            quality_threshold=self.engine.quality_threshold,
            cost_threshold=self.engine.cost_threshold,
            current_route=list(self.engine.current_route),
            current_route_cost=safe_float(self.engine.current_route_cost),
            reachable=is_reachable,
            metrics=MetricsModel.from_dict(self.engine.current_metrics),
            total_route_changes=self.engine.total_route_changes,
            history_count=len(self.engine.history),
            created_at=self.created_at,
            updated_at=self.updated_at,
            topology=topology_snap,
        )

    def set_endpoints(self, source: int, destination: int) -> SessionResponse:
        """Update source and destination endpoints."""
        with self.lock:
            if source not in self.engine.graph:
                raise ValueError(f"Source router {source} does not exist in graph.")
            if destination not in self.engine.graph:
                raise ValueError(f"Destination router {destination} does not exist in graph.")
            if source == destination:
                raise ValueError("Source and destination routers must be distinct.")

            self.engine.set_endpoints(source, destination)
            self.updated_at = datetime.datetime.now().isoformat()
            return self.to_response()

    def reset(self) -> SessionResponse:
        """Reset simulation session to initial state."""
        with self.lock:
            self.engine.reset()
            self.updated_at = datetime.datetime.now().isoformat()
            return self.to_response()

    def apply_event(self, req: EventRequest) -> EventResponse:
        """Execute a dynamic network event against the session's adaptive engine."""
        with self.lock:
            ev_type = req.event_type.strip().lower()

            if ev_type == "congestion":
                edges = self._extract_edges(req)
                amount = float(req.amount) if req.amount is not None else 30.0
                if amount < 0:
                    raise InvalidEventError("Congestion amount must be non-negative.")
                result = self.engine.apply_congestion(edges, amount=amount)

            elif ev_type == "latency":
                edges = self._extract_edges(req)
                mult = float(req.multiplier) if req.multiplier is not None else 2.0
                if mult <= 0:
                    raise InvalidEventError("Latency multiplier must be greater than zero.")
                result = self.engine.apply_latency(edges, multiplier=mult)

            elif ev_type == "packet_loss":
                edges = self._extract_edges(req)
                amount = float(req.amount) if req.amount is not None else 5.0
                if amount < 0:
                    raise InvalidEventError("Packet loss amount must be non-negative.")
                result = self.engine.apply_packet_loss(edges, amount=amount)

            elif ev_type == "link_failure":
                u, v = self._extract_single_edge(req)
                result = self.engine.apply_link_failure(u, v)

            elif ev_type == "link_restoration":
                u, v = self._extract_single_edge(req)
                result = self.engine.apply_link_restoration(u, v)

            elif ev_type == "router_failure":
                node = self._extract_node(req)
                result = self.engine.apply_router_failure(node)

            elif ev_type == "router_restoration":
                node = self._extract_node(req)
                result = self.engine.apply_router_restoration(node)

            elif ev_type == "combined":
                c_edges = [canonical_edge(e[0], e[1]) for e in req.congestion_edges] if req.congestion_edges else None
                l_edges = [canonical_edge(e[0], e[1]) for e in req.latency_edges] if req.latency_edges else None
                p_edges = [canonical_edge(e[0], e[1]) for e in req.loss_edges] if req.loss_edges else None
                f_link = canonical_edge(req.failed_link[0], req.failed_link[1]) if req.failed_link else None
                f_node = int(req.failed_router) if req.failed_router is not None else None

                result = self.engine.apply_combined_event(
                    congestion_edges=c_edges,
                    latency_edges=l_edges,
                    loss_edges=p_edges,
                    failed_link=f_link,
                    failed_router=f_node,
                )

            elif ev_type == "reset":
                self.engine.reset()
                self.updated_at = datetime.datetime.now().isoformat()
                init_m = self.engine.current_metrics
                return EventResponse(
                    event_name="reset",
                    changed_edges=[],
                    changed_nodes=[],
                    previous_route=list(self.engine.current_route),
                    previous_route_cost=safe_float(self.engine.current_route_cost),
                    triggered=True,
                    trigger_reason="manual_session_reset",
                    new_route=list(self.engine.current_route),
                    new_route_cost=safe_float(self.engine.current_route_cost),
                    previous_metrics=MetricsModel.from_dict(init_m),
                    new_metrics=MetricsModel.from_dict(init_m),
                    performance_delta={},
                    route_changed=False,
                    processing_time_ms=0.0,
                    reroute_time_ms=0.0,
                    unreachable=False,
                )

            else:
                raise InvalidEventError(f"Unsupported event type: '{req.event_type}'.")

            self.updated_at = datetime.datetime.now().isoformat()

            # Format deltas safely
            perf_delta: dict[str, Optional[float]] = {}
            for k, v in result.performance_delta.items():
                perf_delta[k] = safe_float(v)

            return EventResponse(
                event_name=result.event_name,
                changed_edges=[list(e) for e in result.changed_edges],
                changed_nodes=list(result.changed_nodes),
                previous_route=list(result.previous_route),
                previous_route_cost=safe_float(result.previous_route_cost),
                triggered=bool(result.triggered),
                trigger_reason=result.trigger_reason,
                new_route=list(result.new_route),
                new_route_cost=safe_float(result.new_route_cost),
                previous_metrics=MetricsModel.from_dict(result.previous_metrics),
                new_metrics=MetricsModel.from_dict(result.new_metrics),
                performance_delta=perf_delta,
                route_changed=bool(result.route_changed),
                processing_time_ms=round(result.processing_time_seconds * 1000.0, 3),
                reroute_time_ms=round(result.reroute_time_seconds * 1000.0, 3),
                unreachable=bool(result.unreachable),
                error=result.error,
            )

    def compare_strategies(self, req: Optional[CompareRequest] = None) -> CompareStrategiesResponse:
        """
        Compare all four routing strategies against an isolated snapshot of current graph conditions.
        Crucially, this operation does NOT mutate the session's active graph or engine.
        """
        with self.lock:
            # Snapshot of graph state
            graph_copy = copy.deepcopy(self.engine.graph)
            src = self.engine.source
            dst = self.engine.destination

            seed = req.aco_seed if (req and req.aco_seed is not None) else self.engine.seed
            num_ants = req.num_ants if (req and req.num_ants is not None) else config.ACO_NUM_ANTS
            num_iters = req.num_iterations if (req and req.num_iterations is not None) else config.ACO_NUM_ITERATIONS

        # 1. Dijkstra raw latency
        t0 = time.perf_counter()
        res_dijk_lat = dijkstra_latency(graph_copy, src, dst)
        t_dijk_lat = (time.perf_counter() - t0) * 1000.0
        m_dijk_lat = calculate_route_metrics(graph_copy, res_dijk_lat.path, res_dijk_lat.cost)

        # 2. Dijkstra fuzzy cost
        t0 = time.perf_counter()
        res_dijk_fuz = dijkstra_fuzzy(graph_copy, src, dst)
        t_dijk_fuz = (time.perf_counter() - t0) * 1000.0
        m_dijk_fuz = calculate_route_metrics(graph_copy, res_dijk_fuz.path, res_dijk_fuz.cost)

        # 3. ACO fuzzy
        t0 = time.perf_counter()
        aco_router = AntColonyOptimizer(
            alpha=config.ACO_ALPHA,
            beta=config.ACO_BETA,
            evaporation_rate=config.ACO_EVAPORATION_RATE,
            num_ants=num_ants,
            num_iterations=num_iters,
            seed=seed,
        )
        res_aco = aco_router.find_route(graph_copy, src, dst)
        t_aco = (time.perf_counter() - t0) * 1000.0
        m_aco = calculate_route_metrics(graph_copy, res_aco.path, res_aco.cost)

        # 4. Adaptive ACO (current session route)
        with self.lock:
            active_route = list(self.engine.current_route)
            active_cost = self.engine.current_route_cost
            active_metrics = dict(self.engine.current_metrics)
            last_res = self.engine.history[-1] if self.engine.history else None
            t_adapt = (last_res.reroute_time_seconds * 1000.0) if last_res else t_aco

        strat_models = [
            StrategyResultModel(
                strategy="dijkstra_latency",
                strategy_label="Dijkstra (Latency)",
                objective="Minimize Raw End-to-End Latency",
                cost_type="latency_ms",
                reachable=bool(res_dijk_lat.exists),
                path=list(res_dijk_lat.path),
                hops=len(res_dijk_lat.path) - 1 if res_dijk_lat.path else 0,
                route_cost=safe_float(res_dijk_lat.cost),
                latency_ms=safe_float(m_dijk_lat.get("latency_ms")),
                packet_loss_percent=safe_float(m_dijk_lat.get("packet_loss_percent")),
                bandwidth_mbps=safe_float(m_dijk_lat.get("bandwidth_mbps")),
                congestion_percent=safe_float(m_dijk_lat.get("congestion_percent")),
                runtime_ms=round(t_dijk_lat, 3),
            ),
            StrategyResultModel(
                strategy="dijkstra_fuzzy",
                strategy_label="Dijkstra (Fuzzy Cost)",
                objective="Minimize Composite Fuzzy Quality Cost",
                cost_type="fuzzy_composite",
                reachable=bool(res_dijk_fuz.exists),
                path=list(res_dijk_fuz.path),
                hops=len(res_dijk_fuz.path) - 1 if res_dijk_fuz.path else 0,
                route_cost=safe_float(res_dijk_fuz.cost),
                latency_ms=safe_float(m_dijk_fuz.get("latency_ms")),
                packet_loss_percent=safe_float(m_dijk_fuz.get("packet_loss_percent")),
                bandwidth_mbps=safe_float(m_dijk_fuz.get("bandwidth_mbps")),
                congestion_percent=safe_float(m_dijk_fuz.get("congestion_percent")),
                runtime_ms=round(t_dijk_fuz, 3),
            ),
            StrategyResultModel(
                strategy="aco_fuzzy",
                strategy_label="ACO (Fuzzy Cost)",
                objective="Multi-Agent Heuristic Fuzzy Optimization",
                cost_type="fuzzy_composite",
                reachable=bool(res_aco.exists),
                path=list(res_aco.path),
                hops=len(res_aco.path) - 1 if res_aco.path else 0,
                route_cost=safe_float(res_aco.cost),
                latency_ms=safe_float(m_aco.get("latency_ms")),
                packet_loss_percent=safe_float(m_aco.get("packet_loss_percent")),
                bandwidth_mbps=safe_float(m_aco.get("bandwidth_mbps")),
                congestion_percent=safe_float(m_aco.get("congestion_percent")),
                runtime_ms=round(t_aco, 3),
            ),
            StrategyResultModel(
                strategy="adaptive_aco",
                strategy_label="Adaptive ACO",
                objective="Threshold-Triggered Dynamic Self-Healing",
                cost_type="fuzzy_composite",
                reachable=bool(len(active_route) > 0 and math.isfinite(active_cost)),
                path=active_route,
                hops=len(active_route) - 1 if active_route else 0,
                route_cost=safe_float(active_cost),
                latency_ms=safe_float(active_metrics.get("latency_ms")),
                packet_loss_percent=safe_float(active_metrics.get("packet_loss_percent")),
                bandwidth_mbps=safe_float(active_metrics.get("bandwidth_mbps")),
                congestion_percent=safe_float(active_metrics.get("congestion_percent")),
                runtime_ms=round(t_adapt, 3),
            ),
        ]

        return CompareStrategiesResponse(
            session_id=self.session_id,
            source=src,
            destination=dst,
            strategies=strat_models,
        )

    # -----------------------------------------------------------------------
    # Helper Validation Methods
    # -----------------------------------------------------------------------

    def _extract_edges(self, req: EventRequest) -> list[tuple[int, int]]:
        raw_edges = req.edges or ([req.edge] if req.edge else None)
        if not raw_edges:
            raise InvalidEventError("Event requires 'edges' or 'edge' list of [u, v] pairs.")

        clean_edges = []
        for e in raw_edges:
            if len(e) != 2:
                raise InvalidEventError(f"Each edge must be a [u, v] pair, got {e}.")
            u, v = int(e[0]), int(e[1])
            if not self.engine.graph.has_edge(u, v):
                raise InvalidEventError(f"Edge ({u}, {v}) does not exist in network topology.")
            clean_edges.append(canonical_edge(u, v))
        return clean_edges

    def _extract_single_edge(self, req: EventRequest) -> tuple[int, int]:
        raw = req.edge or (req.edges[0] if req.edges else None)
        if not raw or len(raw) != 2:
            raise InvalidEventError("Event requires single 'edge' [u, v] pair.")
        u, v = int(raw[0]), int(raw[1])
        if not self.engine.graph.has_edge(u, v):
            raise InvalidEventError(f"Edge ({u}, {v}) does not exist in network topology.")
        return u, v

    def _extract_node(self, req: EventRequest) -> int:
        if req.node is None:
            raise InvalidEventError("Event requires 'node' router ID.")
        node = int(req.node)
        if node not in self.engine.graph:
            raise InvalidEventError(f"Router node {node} does not exist in network topology.")
        return node


class SessionManager:
    """
    Thread-safe in-memory registry of SimulationSessions.
    """

    def __init__(self) -> None:
        self._sessions: dict[str, SimulationSession] = {}
        self._lock = threading.Lock()

    def create_session(
        self,
        topology_type: str = "demo",
        source: Optional[int] = None,
        destination: Optional[int] = None,
        quality_threshold: Optional[float] = None,
        cost_threshold: Optional[float] = None,
        seed: int = 42,
    ) -> SimulationSession:
        """Create and store a new independent simulation session."""
        session_id = str(uuid.uuid4())
        session = SimulationSession(
            session_id=session_id,
            topology_type=topology_type,
            source=source,
            destination=destination,
            quality_threshold=quality_threshold,
            cost_threshold=cost_threshold,
            seed=seed,
        )
        with self._lock:
            self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> SimulationSession:
        """Retrieve an existing session or raise SessionNotFoundError."""
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                raise SessionNotFoundError(f"Session '{session_id}' not found.")
            return session

    def delete_session(self, session_id: str) -> bool:
        """Remove a session from registry."""
        with self._lock:
            return self._sessions.pop(session_id, None) is not None

    def list_session_ids(self) -> list[str]:
        """List all active session IDs."""
        with self._lock:
            return list(self._sessions.keys())

    def count(self) -> int:
        """Return count of active sessions."""
        with self._lock:
            return len(self._sessions)

    def clear_all(self) -> None:
        """Clear all active sessions (e.g. for testing)."""
        with self._lock:
            self._sessions.clear()


# Global singleton instance
session_manager = SessionManager()
