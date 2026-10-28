"""
Experiments router for NEXUS Network Intelligence API.

Serves precomputed empirical results, convergence curves, and sequential dynamic
timelines generated during Phase 3 benchmarking.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any, Optional
from fastapi import APIRouter, Query

from api.config import RESULTS_DIR
from api.schemas import (
    ConvergenceResponse,
    ExperimentResultsResponse,
    ExperimentSummaryResponse,
    TimelineResponse,
)

router = APIRouter()


def _read_csv(filepath: Path) -> list[dict[str, Any]]:
    """Helper to safely read CSV into a list of dictionaries with numeric conversions."""
    if not filepath.exists():
        return []
    rows: list[dict[str, Any]] = []
    with filepath.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            parsed: dict[str, Any] = {}
            for k, v in r.items():
                if v is None or v == "":
                    parsed[k] = None
                    continue
                # Try int
                try:
                    parsed[k] = int(v)
                    continue
                except ValueError:
                    pass
                # Try float
                try:
                    parsed[k] = float(v)
                    continue
                except ValueError:
                    pass
                parsed[k] = v
            rows.append(parsed)
    return rows


@router.get(
    "/experiments/summary",
    response_model=ExperimentSummaryResponse,
    summary="Get Experiment Summary and Metadata",
    description="Retrieve aggregated descriptive statistics and 95% confidence intervals from summary_results.csv alongside metadata.json.",
)
def get_experiment_summary() -> ExperimentSummaryResponse:
    """Return summary results and execution metadata."""
    summary_file = RESULTS_DIR / "summary_results.csv"
    metadata_file = RESULTS_DIR / "experiment_metadata.json"

    summary_rows = _read_csv(summary_file)

    metadata = None
    if metadata_file.exists():
        try:
            with metadata_file.open("r", encoding="utf-8") as f:
                metadata = json.load(f)
        except Exception:
            metadata = None

    return ExperimentSummaryResponse(
        summary=summary_rows,
        metadata=metadata,
    )


@router.get(
    "/experiments/results",
    response_model=ExperimentResultsResponse,
    summary="Get Detailed Experiment Results",
    description="Retrieve individual run records from detailed_results.csv with optional filtering by scenario and strategy.",
)
def get_experiment_results(
    scenario: Optional[str] = Query(default=None, description="Filter by scenario name (e.g. 'normal', 'congestion')"),
    strategy: Optional[str] = Query(default=None, description="Filter by routing strategy (e.g. 'dijkstra_latency', 'aco_fuzzy')"),
    limit: int = Query(default=100, ge=1, le=1000, description="Max rows to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
) -> ExperimentResultsResponse:
    """Return detailed run-level experiment data."""
    detailed_file = RESULTS_DIR / "detailed_results.csv"
    rows = _read_csv(detailed_file)

    if scenario:
        clean_scen = scenario.strip().lower()
        rows = [r for r in rows if str(r.get("scenario", "")).lower() == clean_scen]

    if strategy:
        clean_strat = strategy.strip().lower()
        rows = [r for r in rows if str(r.get("strategy", "")).lower() == clean_strat]

    total = len(rows)
    paged = rows[offset : offset + limit]

    return ExperimentResultsResponse(
        results=paged,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/experiments/convergence",
    response_model=ConvergenceResponse,
    summary="Get ACO Iteration Convergence Histories",
    description="Retrieve iteration-by-iteration cost progression from aco_convergence.csv for convergence curve plotting.",
)
def get_aco_convergence(
    scenario: Optional[str] = Query(default=None, description="Filter convergence by scenario name"),
    limit: int = Query(default=1000, ge=1, le=10000, description="Max rows to return"),
) -> ConvergenceResponse:
    """Return ACO iteration convergence records."""
    conv_file = RESULTS_DIR / "aco_convergence.csv"
    rows = _read_csv(conv_file)

    if scenario:
        clean_scen = scenario.strip().lower()
        rows = [r for r in rows if str(r.get("scenario", "")).lower() == clean_scen]

    total = len(rows)
    paged = rows[:limit]

    return ConvergenceResponse(
        convergence=paged,
        total=total,
        scenario=scenario,
    )


@router.get(
    "/experiments/timeline",
    response_model=TimelineResponse,
    summary="Get Sequential Dynamic Timeline",
    description="Retrieve step-by-step state and timing records from dynamic_timeline.csv covering the 10-step dynamic lifecycle.",
)
def get_dynamic_timeline() -> TimelineResponse:
    """Return sequential dynamic timeline records."""
    timeline_file = RESULTS_DIR / "dynamic_timeline.csv"
    rows = _read_csv(timeline_file)

    return TimelineResponse(
        timeline=rows,
        total=len(rows),
    )
