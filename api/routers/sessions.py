"""
Sessions router for NEXUS Network Intelligence API.

Coordinates isolated stateful simulation sessions, dynamic event injections,
endpoint updates, reset operations, and strategy comparisons.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Path

from api.schemas import (
    CompareRequest,
    CompareStrategiesResponse,
    CreateSessionRequest,
    EventRequest,
    EventResponse,
    SessionResponse,
    UpdateEndpointsRequest,
)
from api.session_manager import (
    InvalidEventError,
    SessionNotFoundError,
    session_manager,
)

router = APIRouter()


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=201,
    summary="Create Simulation Session",
    description="Initialize a new isolated network simulation session with independent graph state and adaptive engine.",
)
def create_session(req: CreateSessionRequest) -> SessionResponse:
    """Create a new stateful simulation session."""
    try:
        session = session_manager.create_session(
            topology_type=req.topology_type,
            source=req.source,
            destination=req.destination,
            quality_threshold=req.quality_threshold,
            cost_threshold=req.cost_threshold,
            seed=req.seed or 42,
        )
        return session.to_response()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    summary="Get Session State",
    description="Retrieve the current state, active route, topology snapshot, and QoS metrics for a session.",
)
def get_session(
    session_id: str = Path(..., description="UUID of the simulation session")
) -> SessionResponse:
    """Fetch session details by session_id."""
    try:
        session = session_manager.get_session(session_id)
        return session.to_response()
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")


@router.put(
    "/sessions/{session_id}/endpoints",
    response_model=SessionResponse,
    summary="Update Source and Destination Endpoints",
    description="Change the active source and destination routers for a session and re-evaluate the initial route.",
)
def update_endpoints(
    req: UpdateEndpointsRequest,
    session_id: str = Path(..., description="UUID of the simulation session"),
) -> SessionResponse:
    """Update session endpoints."""
    try:
        session = session_manager.get_session(session_id)
        return session.set_endpoints(req.source, req.destination)
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/sessions/{session_id}/events",
    response_model=EventResponse,
    summary="Inject Dynamic Network Event",
    description="Apply a network event (congestion surge, latency spike, loss increase, link failure/restoration, router failure/restoration, combined, or reset).",
)
def apply_event(
    req: EventRequest,
    session_id: str = Path(..., description="UUID of the simulation session"),
) -> EventResponse:
    """Inject dynamic network event into session."""
    try:
        session = session_manager.get_session(session_id)
        return session.apply_event(req)
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    except (InvalidEventError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/sessions/{session_id}/reset",
    response_model=SessionResponse,
    summary="Reset Simulation Session",
    description="Restore the session's network graph, edge caches, and ACO pheromones back to initial baseline conditions.",
)
def reset_session(
    session_id: str = Path(..., description="UUID of the simulation session")
) -> SessionResponse:
    """Reset session network state."""
    try:
        session = session_manager.get_session(session_id)
        return session.reset()
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")


@router.post(
    "/sessions/{session_id}/compare",
    response_model=CompareStrategiesResponse,
    summary="Compare Routing Strategies",
    description="Execute head-to-head comparison of Dijkstra (Latency), Dijkstra (Fuzzy), ACO (Fuzzy), and Adaptive ACO on an isolated snapshot of current graph conditions without mutating session state.",
)
def compare_strategies(
    session_id: str = Path(..., description="UUID of the simulation session"),
    req: CompareRequest = None,
) -> CompareStrategiesResponse:
    """Run strategy comparison on session graph snapshot."""
    try:
        session = session_manager.get_session(session_id)
        return session.compare_strategies(req)
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
