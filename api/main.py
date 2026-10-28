"""
NEXUS Network Intelligence FastAPI Backend Application.

Main entry point configuring middleware, routers, exception handlers, and lifecycle hooks.
"""

from __future__ import annotations

import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.config import (
    API_DESCRIPTION,
    API_TITLE,
    API_VERSION,
    CORS_ORIGINS,
    DEFAULT_HOST,
    DEFAULT_PORT,
)
from api.routers import experiments, health, network, sessions
from api.session_manager import InvalidEventError, SessionNotFoundError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nexus-api")

# Create FastAPI application
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS configuration for React / Vite frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Exception Handlers
# ---------------------------------------------------------------------------

@app.exception_handler(SessionNotFoundError)
async def session_not_found_handler(request: Request, exc: SessionNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc), "error_type": "SessionNotFoundError"},
    )


@app.exception_handler(InvalidEventError)
async def invalid_event_handler(request: Request, exc: InvalidEventError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc), "error_type": "InvalidEventError"},
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc), "error_type": "ValueError"},
    )


# ---------------------------------------------------------------------------
# Router Inclusions
# ---------------------------------------------------------------------------

app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(network.router, prefix="/api", tags=["Network Topology"])
app.include_router(sessions.router, prefix="/api", tags=["Simulation Sessions"])
app.include_router(experiments.router, prefix="/api", tags=["Experimental Analytics"])


# ---------------------------------------------------------------------------
# Root Endpoint
# ---------------------------------------------------------------------------

@app.get(
    "/",
    tags=["Root"],
    summary="NEXUS API Index",
    description="Index endpoint returning service identity, version, and documentation links.",
)
def get_root() -> dict[str, str]:
    return {
        "service": API_TITLE,
        "version": API_VERSION,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "health_check": "/api/health",
        "status": "online",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host=DEFAULT_HOST,
        port=DEFAULT_PORT,
        reload=True,
    )
