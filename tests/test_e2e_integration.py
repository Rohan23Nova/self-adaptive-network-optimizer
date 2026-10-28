"""
End-to-End Integration and QA Tests for NEXUS Network Intelligence.

Verifies the complete 20-step full-stack integration sequence:
1. Root / Landing index check
2. Health status and telemetry
3. Session provisioning
4. Topology inspection
5. Minor congestion event
6. Threshold tolerance verification
7. Severe latency/loss degradation
8. Adaptive rerouting verification
9. Link failure on current route
10. Intermediate router failure
11. Destination disconnection and unreachable state
12. Connectivity restoration
13. Session reset back to baseline
14. Strategy comparison across all 4 algorithms
15. Research summary retrieval
16. Run-level results filtering
17. ACO convergence curves
18. Input validation and error isolation
19. Multi-session state isolation
20. Session persistence and state recovery
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.session_manager import session_manager


@pytest.fixture(autouse=True)
def clean_sessions():
    session_manager.clear_all()
    yield
    session_manager.clear_all()


@pytest.fixture
def client():
    return TestClient(app)


def test_complete_20_step_e2e_integration_flow(client: TestClient):
    """Execute complete 20-step end-to-end integration checklist."""

    # 1. Open landing page / root endpoint
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"

    # 2. Check backend health
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    # 3. Create a simulation session
    res = client.post("/api/sessions", json={"topology_type": "demo", "seed": 42})
    assert res.status_code == 201
    session_data = res.json()
    session_id = session_data["session_id"]
    initial_route = session_data["current_route"]
    assert len(initial_route) >= 2
    assert session_data["reachable"] is True

    # 4. Inspect topology
    res = client.get(f"/api/sessions/{session_id}")
    assert res.status_code == 200
    topo = res.json()["topology"]
    assert topo["num_nodes"] == 8
    assert topo["num_edges"] == 13

    # 5. Apply minor congestion (5% on link)
    target_link = [initial_route[0], initial_route[1]]
    res = client.post(
        f"/api/sessions/{session_id}/events",
        json={
            "event_type": "congestion",
            "edge": target_link,
            "amount": 5.0,
        },
    )
    assert res.status_code == 200
    event_res = res.json()

    # 6. Verify threshold tolerance (below 10% threshold -> not triggered)
    assert event_res["triggered"] is False
    assert event_res["route_changed"] is False
    assert event_res["new_route"] == initial_route

    # 7. Apply severe latency degradation (8.0x multiplier on active link)
    res = client.post(
        f"/api/sessions/{session_id}/events",
        json={
            "event_type": "latency",
            "edges": [target_link],
            "multiplier": 8.0,
        },
    )
    assert res.status_code == 200
    latency_res = res.json()

    # 8. Verify adaptive rerouting triggered
    assert latency_res["triggered"] is True
    assert latency_res["processing_time_ms"] >= 0
    active_route = latency_res["new_route"]

    # 9. Disable a link on the active route
    cut_link = [active_route[0], active_route[1]]
    res = client.post(
        f"/api/sessions/{session_id}/events",
        json={
            "event_type": "link_failure",
            "edge": cut_link,
        },
    )
    assert res.status_code == 200
    link_cut_res = res.json()
    assert link_cut_res["triggered"] is True
    assert link_cut_res["route_changed"] is True
    assert link_cut_res["unreachable"] is False

    # 10. Disable an intermediate router on the new route
    intermediate_route = link_cut_res["new_route"]
    if len(intermediate_route) > 2:
        inter_node = intermediate_route[1]
        res = client.post(
            f"/api/sessions/{session_id}/events",
            json={
                "event_type": "router_failure",
                "node": inter_node,
            },
        )
        assert res.status_code == 200
        router_fail_res = res.json()
        assert router_fail_res["triggered"] is True

    # 11. Disconnect the destination router and verify unreachable state
    dest_node = session_data["destination"]
    res = client.post(
        f"/api/sessions/{session_id}/events",
        json={
            "event_type": "router_failure",
            "node": dest_node,
        },
    )
    assert res.status_code == 200
    dest_cut_res = res.json()
    assert dest_cut_res["unreachable"] is True
    assert dest_cut_res["new_route"] == []

    # 12. Restore connectivity to destination
    res = client.post(
        f"/api/sessions/{session_id}/events",
        json={
            "event_type": "router_restoration",
            "node": dest_node,
        },
    )
    assert res.status_code == 200
    restored_res = res.json()
    assert restored_res["unreachable"] is False

    # 13. Reset the simulation session
    res = client.post(f"/api/sessions/{session_id}/reset")
    assert res.status_code == 200
    reset_data = res.json()
    assert reset_data["reachable"] is True
    assert reset_data["current_route"] == initial_route

    # 14. Compare all four strategies on the session snapshot
    res = client.post(
        f"/api/sessions/{session_id}/compare",
        json={"aco_seed": 42, "num_ants": 20, "num_iterations": 30},
    )
    assert res.status_code == 200
    compare_data = res.json()
    assert len(compare_data["strategies"]) == 4
    strat_keys = [s["strategy"] for s in compare_data["strategies"]]
    assert "dijkstra_latency" in strat_keys
    assert "dijkstra_fuzzy" in strat_keys
    assert "aco_fuzzy" in strat_keys
    assert "adaptive_aco" in strat_keys

    # 15. Open research summary
    res = client.get("/api/experiments/summary")
    assert res.status_code == 200
    summary_data = res.json()
    assert len(summary_data["summary"]) > 0

    # 16. Filter research results by scenario and strategy
    res = client.get("/api/experiments/results?scenario=normal&strategy=dijkstra_latency")
    assert res.status_code == 200
    results_data = res.json()
    assert results_data["total"] >= 1
    for row in results_data["results"]:
        assert str(row["scenario"]).lower() == "normal"
        assert str(row["strategy"]).lower() == "dijkstra_latency"

    # 17. Inspect ACO convergence histories
    res = client.get("/api/experiments/convergence?scenario=normal")
    assert res.status_code == 200
    conv_data = res.json()
    assert len(conv_data["convergence"]) > 0

    # 18. Test invalid inputs and error handling
    # Non-existent event type
    res = client.post(
        f"/api/sessions/{session_id}/events",
        json={"event_type": "invalid_magic_event"},
    )
    assert res.status_code == 400
    assert "Unsupported event type" in res.json().get("detail", "")

    # Non-existent session 404
    res = client.get("/api/sessions/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404

    # 19. Verify two sessions do not share mutable state
    res_a = client.post("/api/sessions", json={"topology_type": "demo", "seed": 42})
    res_b = client.post("/api/sessions", json={"topology_type": "demo", "seed": 42})
    id_a = res_a.json()["session_id"]
    id_b = res_b.json()["session_id"]
    route_a = res_a.json()["current_route"]
    first_link_a = [route_a[0], route_a[1]]

    # Modify Session A with severe latency on its active route
    res_mod_a = client.post(
        f"/api/sessions/{id_a}/events",
        json={"event_type": "latency", "edges": [first_link_a], "multiplier": 8.0},
    )
    assert res_mod_a.status_code == 200
    assert res_mod_a.json()["triggered"] is True

    # Verify Session B metrics and topology are completely untouched
    snap_b = client.get(f"/api/sessions/{id_b}").json()
    assert snap_b["total_route_changes"] == 0
    edge_a_in_b = next(
        e for e in snap_b["topology"]["edges"]
        if (e["source"] == first_link_a[0] and e["target"] == first_link_a[1])
        or (e["source"] == first_link_a[1] and e["target"] == first_link_a[0])
    )
    # Session B edge latency was not multiplied by 8.0
    snap_a = client.get(f"/api/sessions/{id_a}").json()
    edge_a_in_a = next(
        e for e in snap_a["topology"]["edges"]
        if (e["source"] == first_link_a[0] and e["target"] == first_link_a[1])
        or (e["source"] == first_link_a[1] and e["target"] == first_link_a[0])
    )
    assert edge_a_in_a["latency"] == edge_a_in_b["latency"] * 8.0

    # 20. Verify session recovery on reload
    snap_a_reloaded = client.get(f"/api/sessions/{id_a}").json()
    assert snap_a_reloaded["session_id"] == id_a
    assert snap_a_reloaded["total_route_changes"] >= 1
