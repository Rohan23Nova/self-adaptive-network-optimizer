"""
Configuration settings for NEXUS Network Intelligence FastAPI backend.
"""

from __future__ import annotations

import os
from pathlib import Path

# Project root directory
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# API Metadata
API_TITLE = "NEXUS Network Intelligence API"
API_DESCRIPTION = (
    "Production-grade FastAPI backend for the Self-Adaptive Computer Network Optimizer. "
    "Coordinates Mamdani fuzzy link evaluation, Ant Colony Optimization routing, "
    "dynamic network event simulation, and empirical performance analytics."
)
API_VERSION = "1.0.0"

# CORS configuration: allows override via environment variables (comma-separated)
_env_origins = os.environ.get("ALLOWED_ORIGINS", os.environ.get("CORS_ORIGINS", ""))
if _env_origins:
    CORS_ORIGINS = [o.strip() for o in _env_origins.split(",") if o.strip()]
else:
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

# In-memory session capacity & limits
MAX_SESSIONS = int(os.environ.get("MAX_SESSIONS", "100"))
SESSION_TTL_SECONDS = int(os.environ.get("SESSION_TTL_SECONDS", "86400"))  # 24 hours

# Results directory containing Phase 3 artifacts
RESULTS_DIR = Path(os.environ.get("RESULTS_DIR", str(PROJECT_ROOT / "results")))

# Server defaults
DEFAULT_HOST = os.environ.get("HOST", "127.0.0.1")
DEFAULT_PORT = int(os.environ.get("PORT", "8000"))
