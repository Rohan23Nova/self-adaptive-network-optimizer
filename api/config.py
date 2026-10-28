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

# CORS configuration for local React / Vite development
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

# Results directory containing Phase 3 artifacts
RESULTS_DIR = Path(os.environ.get("RESULTS_DIR", str(PROJECT_ROOT / "results")))

# Server defaults
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000
