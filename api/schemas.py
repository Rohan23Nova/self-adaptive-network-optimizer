"""
Pydantic schemas for request and response validation in NEXUS API.
"""

from __future__ import annotations

import math
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator


def safe_float(val: Any) -> Optional[float]:
    """Helper to convert potentially infinite or NaN values to None."""
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 4)
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Health Schema
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str = "healthy"
    app_name: str
    version: str
    timestamp: str
    active_sessions: int


# ---------------------------------------------------------------------------
# Network Topology Schemas
# ---------------------------------------------------------------------------

class NodeModel(BaseModel):
    id: int
    enabled: bool = True
    role: str = "intermediate"
    incident_links: int = 0


class EdgeModel(BaseModel):
    source: int
    target: int
    latency: float
    packet_loss: float
    bandwidth: float
    congestion: float
    enabled: bool = True
    quality: Optional[float] = None
    cost: Optional[float] = None
    on_route: bool = False


class TopologyResponse(BaseModel):
    topology_type: str
    num_nodes: int
    num_edges: int
    nodes: list[NodeModel]
    edges: list[EdgeModel]


# ---------------------------------------------------------------------------
# Metrics Schema
# ---------------------------------------------------------------------------

class MetricsModel(BaseModel):
    latency_ms: Optional[float] = None
    packet_loss_percent: Optional[float] = None
    bandwidth_mbps: Optional[float] = None
    congestion_percent: Optional[float] = None
    route_cost: Optional[float] = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> MetricsModel:
        return cls(
            latency_ms=safe_float(data.get("latency_ms")),
            packet_loss_percent=safe_float(data.get("packet_loss_percent")),
            bandwidth_mbps=safe_float(data.get("bandwidth_mbps")),
            congestion_percent=safe_float(data.get("congestion_percent")),
            route_cost=safe_float(data.get("route_cost")),
        )


# ---------------------------------------------------------------------------
# Session Schemas
# ---------------------------------------------------------------------------

class CreateSessionRequest(BaseModel):
    topology_type: str = Field(default="demo", description="'demo' (8 nodes) or 'experiment' (25 nodes)")
    source: Optional[int] = Field(default=None, description="Starting router ID")
    destination: Optional[int] = Field(default=None, description="Target router ID")
    quality_threshold: Optional[float] = Field(default=None, ge=0.01, le=1.0, description="Relative quality drop threshold")
    cost_threshold: Optional[float] = Field(default=None, ge=0.01, le=1.0, description="Route cost degradation threshold")
    seed: Optional[int] = Field(default=42, description="Random seed for deterministic initialization")

    @field_validator("topology_type")
    @classmethod
    def validate_topology(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in ("demo", "experiment"):
            raise ValueError("topology_type must be either 'demo' or 'experiment'.")
        return clean


class UpdateEndpointsRequest(BaseModel):
    source: int = Field(ge=0, description="New source router node ID")
    destination: int = Field(ge=0, description="New destination router node ID")


class SessionResponse(BaseModel):
    session_id: str
    topology_type: str
    source: int
    destination: int
    quality_threshold: float
    cost_threshold: float
    current_route: list[int]
    current_route_cost: Optional[float] = None
    reachable: bool
    metrics: MetricsModel
    total_route_changes: int
    history_count: int
    created_at: str
    updated_at: str
    topology: Optional[TopologyResponse] = None


# ---------------------------------------------------------------------------
# Event Schemas
# ---------------------------------------------------------------------------

class EventRequest(BaseModel):
    event_type: str = Field(
        description="One of: 'congestion', 'latency', 'packet_loss', 'link_failure', "
                    "'link_restoration', 'router_failure', 'router_restoration', 'combined', 'reset'"
    )
    edges: Optional[list[list[int]]] = Field(default=None, description="List of [u, v] pairs for QoS degradation")
    edge: Optional[list[int]] = Field(default=None, description="Single [u, v] pair for link failure/restoration")
    node: Optional[int] = Field(default=None, description="Router ID for node failure/restoration")
    amount: Optional[float] = Field(default=None, description="Amount to add (e.g. +30% congestion or +5% loss)")
    multiplier: Optional[float] = Field(default=None, description="Multiplier for latency (e.g. 2.0x)")
    # For combined events:
    congestion_edges: Optional[list[list[int]]] = None
    latency_edges: Optional[list[list[int]]] = None
    loss_edges: Optional[list[list[int]]] = None
    failed_link: Optional[list[int]] = None
    failed_router: Optional[int] = None


class EventResponse(BaseModel):
    event_name: str
    changed_edges: list[list[int]]
    changed_nodes: list[int]
    previous_route: list[int]
    previous_route_cost: Optional[float] = None
    triggered: bool
    trigger_reason: str
    new_route: list[int]
    new_route_cost: Optional[float] = None
    previous_metrics: MetricsModel
    new_metrics: MetricsModel
    performance_delta: dict[str, Optional[float]]
    route_changed: bool
    processing_time_ms: float
    reroute_time_ms: float
    unreachable: bool
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Strategy Comparison Schemas
# ---------------------------------------------------------------------------

class CompareRequest(BaseModel):
    aco_seed: Optional[int] = None
    num_ants: Optional[int] = Field(default=None, ge=1, le=100)
    num_iterations: Optional[int] = Field(default=None, ge=1, le=200)


class StrategyResultModel(BaseModel):
    strategy: str
    strategy_label: str
    objective: str
    cost_type: str
    reachable: bool
    path: list[int]
    hops: int
    route_cost: Optional[float] = None
    latency_ms: Optional[float] = None
    packet_loss_percent: Optional[float] = None
    bandwidth_mbps: Optional[float] = None
    congestion_percent: Optional[float] = None
    runtime_ms: float


class CompareStrategiesResponse(BaseModel):
    session_id: str
    source: int
    destination: int
    strategies: list[StrategyResultModel]


# ---------------------------------------------------------------------------
# Experiments Schemas
# ---------------------------------------------------------------------------

class ExperimentSummaryResponse(BaseModel):
    summary: list[dict[str, Any]]
    metadata: Optional[dict[str, Any]] = None


class ExperimentResultsResponse(BaseModel):
    results: list[dict[str, Any]]
    total: int
    limit: int
    offset: int


class ConvergenceResponse(BaseModel):
    convergence: list[dict[str, Any]]
    total: int
    scenario: Optional[str] = None


class TimelineResponse(BaseModel):
    timeline: list[dict[str, Any]]
    total: int
