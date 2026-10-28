"""
Health router for NEXUS Network Intelligence API.
"""

from __future__ import annotations

import datetime
from fastapi import APIRouter

from api.config import API_TITLE, API_VERSION
from api.schemas import HealthResponse
from api.session_manager import session_manager

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service Health Check",
    description="Check the operational health of the NEXUS Network Intelligence API server and active session count.",
)
def get_health() -> HealthResponse:
    """Return API health status and runtime telemetry."""
    return HealthResponse(
        status="healthy",
        app_name=API_TITLE,
        version=API_VERSION,
        timestamp=datetime.datetime.now().isoformat(),
        active_sessions=session_manager.count(),
    )
