"""
Unit and integration tests for NEXUS Network Intelligence FastAPI backend.
"""

from __future__ import annotations

import math
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.session_manager import session_manager


@pytest.fixture(autouse=True)
def clean_sessions():
    """Ensure session registry is clean before and after each test."""
    session_manager.clear_all()
    yield
    session_manager.clear_all()


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# Health and Root Endpoints
# ---------------------------------------------------------------------------

def test_health_endpoint(client: TestClient):
    """Verify GET /api/health returns operational status and telemetry."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "NEXUS" in data["app_name"]
    assert data["version"] == "1.0.0"
    assert "timestamp" in data
    assert data["active_sessions"] == 0


def test_root_endpoint(client: TestClient):
    """Verify GET / returns API index and documentation links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["docs_url"] == "/docs"
    assert data["health_check"] == "/api/health"


# ---------------------------------------------------------------------------
# Network Topology Endpoint
# ---------------------------------------------------------------------------

def test_network_topology_endpoint(client: TestClient):
    """Verify GET /api/network/topology for demo and experiment graphs."""
    # Demo topology (8 nodes, 13 edges)
    resp_demo = client.get("/api/network/topology?type=demo")
    assert resp_demo.status_code == 200
    data_demo = resp_demo.json()
    assert data_demo["topology_type"] == "demo"
    assert data_demo["num_nodes"] == 8
    assert data_demo["num_edges"] == 13
    assert len(data_demo["nodes"]) == 8
    assert len(data_demo["edges"]) == 13

    # Experiment topology (25 nodes)
    resp_exp = client.get("/api/network/topology?type=experiment&seed=42")
    assert resp_exp.status_code == 200
    data_exp = resp_exp.json()
    assert data_exp["topology_type"] == "experiment"
    assert data_exp["num_nodes"] == 25
    assert data_exp["num_edges"] > 25

    # Invalid topology type returns 400
    resp_inv = client.get("/api/network/topology?type=invalid_type")
    assert resp_inv.status_code == 400
    assert "Invalid topology type" in resp_inv.json()["detail"]


# ---------------------------------------------------------------------------
# Session Creation, Retrieval, and Isolation
# ---------------------------------------------------------------------------

def test_session_creation_and_retrieval(client: TestClient):
    """Verify session lifecycle: create, fetch, and handle unknown session IDs."""
    # Create demo session
    create_resp = client.post(
        "/api/sessions",
        json={
            "topology_type": "demo",
            "source": 0,
            "destination": 7,
            "quality_threshold": 0.10,
            "cost_threshold": 0.20,
            "seed": 42,
        },
    )
    assert create_resp.status_code == 201
    sess_data = create_resp.json()
    sid = sess_data["session_id"]
    assert sess_data["topology_type"] == "demo"
    assert sess_data["source"] == 0
    assert sess_data["destination"] == 7
    assert sess_data["reachable"] is True
    assert len(sess_data["current_route"]) >= 2
    assert sess_data["current_route"][0] == 0
    assert sess_data["current_route"][-1] == 7

    # Fetch session
    get_resp = client.get(f"/api/sessions/{sid}")
    assert get_resp.status_code == 200
    assert get_resp.json()["session_id"] == sid
    assert get_resp.json()["metrics"]["latency_ms"] > 0

    # Unknown session ID returns 404
    bad_resp = client.get("/api/sessions/00000000-0000-0000-0000-000000000000")
    assert bad_resp.status_code == 404
    assert "not found" in bad_resp.json()["detail"]


def test_independent_sessions(client: TestClient):
    """Verify that multiple simulation sessions are strictly isolated in memory."""
    # Create Session A and Session B
    res_a = client.post("/api/sessions", json={"topology_type": "demo", "seed": 42})
    sid_a = res_a.json()["session_id"]

    res_b = client.post("/api/sessions", json={"topology_type": "demo", "seed": 42})
    sid_b = res_b.json()["session_id"]
    assert sid_a != sid_b

    route_b_initial = res_b.json()["current_route"]
    cost_b_initial = res_b.json()["current_route_cost"]

    # Inject link failure on Session A
    first_hop_a = [res_a.json()["current_route"][0], res_a.json()["current_route"][1]]
    fail_resp = client.post(
        f"/api/sessions/{sid_a}/events",
        json={"event_type": "link_failure", "edge": first_hop_a},
    )
    assert fail_resp.status_code == 200
    assert fail_resp.json()["triggered"] is True

    # Verify Session B is completely untouched
    sess_b_after = client.get(f"/api/sessions/{sid_b}").json()
    assert sess_b_after["current_route"] == route_b_initial
    assert sess_b_after["current_route_cost"] == cost_b_initial
    assert sess_b_after["history_count"] == 0
    assert sess_b_after["total_route_changes"] == 0


# ---------------------------------------------------------------------------
# Event Injections and Validation
# ---------------------------------------------------------------------------

def test_event_validation_errors(client: TestClient):
    """Verify validation errors for invalid events, edges, and node IDs."""
    res = client.post("/api/sessions", json={"topology_type": "demo"})
    sid = res.json()["session_id"]

    # Unsupported event type
    r1 = client.post(f"/api/sessions/{sid}/events", json={"event_type": "alien_attack"})
    assert r1.status_code == 400
    assert "Unsupported event type" in r1.json()["detail"]

    # Nonexistent node
    r2 = client.post(
        f"/api/sessions/{sid}/events",
        json={"event_type": "router_failure", "node": 999},
    )
    assert r2.status_code == 400
    assert "does not exist" in r2.json()["detail"]

    # Nonexistent edge
    r3 = client.post(
        f"/api/sessions/{sid}/events",
        json={"event_type": "link_failure", "edge": [0, 999]},
    )
    assert r3.status_code == 400
    assert "does not exist" in r3.json()["detail"]


def test_event_applications(client: TestClient):
    """Verify execution of congestion, latency, loss, link and router failures."""
    res = client.post("/api/sessions", json={"topology_type": "demo"})
    sid = res.json()["session_id"]

    # 1. Congestion increase
    r_cong = client.post(
        f"/api/sessions/{sid}/events",
        json={"event_type": "congestion", "edges": [[0, 1]], "amount": 25.0},
    )
    assert r_cong.status_code == 200
    d_cong = r_cong.json()
    assert d_cong["event_name"] == "congestion_increase"
    assert d_cong["processing_time_ms"] >= 0.0
    assert d_cong["reroute_time_ms"] >= 0.0

    # 2. Latency spike
    r_lat = client.post(
        f"/api/sessions/{sid}/events",
        json={"event_type": "latency", "edges": [[0, 2]], "multiplier": 3.0},
    )
    assert r_lat.status_code == 200

    # 3. Packet loss surge
    r_loss = client.post(
        f"/api/sessions/{sid}/events",
        json={"event_type": "packet_loss", "edges": [[1, 4]], "amount": 6.0},
    )
    assert r_loss.status_code == 200

    # 4. Link failure and restoration
    r_fail = client.post(
        f"/api/sessions/{sid}/events",
        json={"event_type": "link_failure", "edge": [2, 3]},
    )
    assert r_fail.status_code == 200
    assert r_fail.json()["event_name"] == "link_failure"

    r_rest = client.post(
        f"/api/sessions/{sid}/events",
        json={"event_type": "link_restoration", "edge": [2, 3]},
    )
    assert r_rest.status_code == 200
    assert r_rest.json()["event_name"] == "link_restoration"

    # 5. Router failure and restoration
    r_rfail = client.post(
        f"/api/sessions/{sid}/events",
        json={"event_type": "router_failure", "node": 3},
    )
    assert r_rfail.status_code == 200

    r_rrest = client.post(
        f"/api/sessions/{sid}/events",
        json={"event_type": "router_restoration", "node": 3},
    )
    assert r_rrest.status_code == 200


# ---------------------------------------------------------------------------
# Reset and Endpoint Changes
# ---------------------------------------------------------------------------

def test_reset_behavior(client: TestClient):
    """Verify POST /api/sessions/{session_id}/reset restores initial baseline state."""
    res = client.post("/api/sessions", json={"topology_type": "demo"})
    sid = res.json()["session_id"]
    initial_route = res.json()["current_route"]
    initial_cost = res.json()["current_route_cost"]

    # Disable link on active route
    first_hop = [initial_route[0], initial_route[1]]
    client.post(
        f"/api/sessions/{sid}/events",
        json={"event_type": "link_failure", "edge": first_hop},
    )

    # Call reset
    reset_resp = client.post(f"/api/sessions/{sid}/reset")
    assert reset_resp.status_code == 200
    data = reset_resp.json()
    assert data["current_route"] == initial_route
    assert math.isclose(data["current_route_cost"], initial_cost, rel_tol=1e-3)
    assert data["total_route_changes"] == 0
    assert data["history_count"] == 0


def test_update_endpoints(client: TestClient):
    """Verify PUT /api/sessions/{session_id}/endpoints updates source/destination and recomputes route."""
    res = client.post("/api/sessions", json={"topology_type": "demo", "source": 0, "destination": 7})
    sid = res.json()["session_id"]

    # Change to source 1, destination 6
    up_resp = client.put(
        f"/api/sessions/{sid}/endpoints",
        json={"source": 1, "destination": 6},
    )
    assert up_resp.status_code == 200
    data = up_resp.json()
    assert data["source"] == 1
    assert data["destination"] == 6
    assert data["current_route"][0] == 1
    assert data["current_route"][-1] == 6

    # Error when source == destination
    bad_resp = client.put(
        f"/api/sessions/{sid}/endpoints",
        json={"source": 2, "destination": 2},
    )
    assert bad_resp.status_code == 400
    assert "distinct" in bad_resp.json()["detail"]


# ---------------------------------------------------------------------------
# Strategy Comparison
# ---------------------------------------------------------------------------

def test_strategy_comparison_does_not_mutate_session(client: TestClient):
    """Verify POST /api/sessions/{session_id}/compare runs 4 strategies without mutating active session."""
    res = client.post("/api/sessions", json={"topology_type": "demo"})
    sid = res.json()["session_id"]
    sess_before = client.get(f"/api/sessions/{sid}").json()

    # Call compare
    comp_resp = client.post(
        f"/api/sessions/{sid}/compare",
        json={"num_ants": 10, "num_iterations": 20},
    )
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    assert comp_data["session_id"] == sid
    strategies = comp_data["strategies"]
    assert len(strategies) == 4

    strat_names = {s["strategy"] for s in strategies}
    assert strat_names == {"dijkstra_latency", "dijkstra_fuzzy", "aco_fuzzy", "adaptive_aco"}

    # Verify cost_type separation
    d_lat = next(s for s in strategies if s["strategy"] == "dijkstra_latency")
    d_fuz = next(s for s in strategies if s["strategy"] == "dijkstra_fuzzy")
    assert d_lat["cost_type"] == "latency_ms"
    assert d_fuz["cost_type"] == "fuzzy_composite"

    # Verify session state after comparison is strictly identical
    sess_after = client.get(f"/api/sessions/{sid}").json()
    assert sess_after["current_route"] == sess_before["current_route"]
    assert sess_after["current_route_cost"] == sess_before["current_route_cost"]
    assert sess_after["history_count"] == sess_before["history_count"]
    assert sess_after["total_route_changes"] == sess_before["total_route_changes"]


# ---------------------------------------------------------------------------
# Unreachable Destination Handling
# ---------------------------------------------------------------------------

def test_unreachable_destination(client: TestClient):
    """Verify explicit unreachable handling when destination router is disabled."""
    res = client.post("/api/sessions", json={"topology_type": "demo", "source": 0, "destination": 7})
    sid = res.json()["session_id"]

    # Disable destination router 7
    event_resp = client.post(
        f"/api/sessions/{sid}/events",
        json={"event_type": "router_failure", "node": 7},
    )
    assert event_resp.status_code == 200
    ev = event_resp.json()
    assert ev["unreachable"] is True
    assert ev["new_route"] == []
    assert ev["new_route_cost"] is None

    # Verify session reports unreachable
    sess_resp = client.get(f"/api/sessions/{sid}").json()
    assert sess_resp["reachable"] is False
    assert sess_resp["current_route"] == []
    assert sess_resp["current_route_cost"] is None


# ---------------------------------------------------------------------------
# Experiment Endpoints
# ---------------------------------------------------------------------------

def test_experiment_endpoints(client: TestClient):
    """Verify GET endpoints for summary, detailed results, convergence, and timeline."""
    # Summary
    r_sum = client.get("/api/experiments/summary")
    assert r_sum.status_code == 200
    d_sum = r_sum.json()
    assert "summary" in d_sum
    assert len(d_sum["summary"]) > 0

    # Detailed results with filters and pagination
    r_det = client.get("/api/experiments/results?scenario=normal&strategy=aco_fuzzy&limit=5")
    assert r_det.status_code == 200
    d_det = r_det.json()
    assert len(d_det["results"]) <= 5
    for row in d_det["results"]:
        assert row["scenario"] == "normal"
        assert row["strategy"] == "aco_fuzzy"

    # Convergence
    r_conv = client.get("/api/experiments/convergence?scenario=normal&limit=50")
    assert r_conv.status_code == 200
    d_conv = r_conv.json()
    assert len(d_conv["convergence"]) <= 50

    # Timeline
    r_time = client.get("/api/experiments/timeline")
    assert r_time.status_code == 200
    d_time = r_time.json()
    assert d_time["total"] == 10
    assert len(d_time["timeline"]) == 10


def test_missing_experiment_files_graceful(client: TestClient, monkeypatch, tmp_path: Path):
    """Verify that if results directory is empty or missing, API returns empty structures without 500 error."""
    empty_results = tmp_path / "empty_results"
    empty_results.mkdir()
    monkeypatch.setattr("api.routers.experiments.RESULTS_DIR", empty_results)

    r_sum = client.get("/api/experiments/summary")
    assert r_sum.status_code == 200
    assert r_sum.json()["summary"] == []
    assert r_sum.json()["metadata"] is None

    r_det = client.get("/api/experiments/results")
    assert r_det.status_code == 200
    assert r_det.json()["results"] == []
    assert r_det.json()["total"] == 0

    r_conv = client.get("/api/experiments/convergence")
    assert r_conv.status_code == 200
    assert r_conv.json()["convergence"] == []

    r_time = client.get("/api/experiments/timeline")
    assert r_time.status_code == 200
    assert r_time.json()["timeline"] == []
