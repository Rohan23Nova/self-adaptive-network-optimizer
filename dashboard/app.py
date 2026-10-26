"""
Self-Adaptive Computer Network Optimizer
Streamlit Interactive Dashboard (Phase 4)

A desktop-first technical dashboard visualizing dynamic network simulation,
Mamdani fuzzy link-quality assessment, Ant Colony Optimization routing,
and event-driven adaptive self-healing.
"""

from __future__ import annotations

import copy
import datetime
import math
import os
import sys
import time
from pathlib import Path
from typing import Optional

# Ensure matplotlib uses writable temporary cache directory
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import networkx as nx
import pandas as pd
import streamlit as st

import config
from dashboard.visuals import (
    THEME_BG,
    THEME_CARD_BG,
    THEME_BORDER,
    COLOR_ROUTE,
    COLOR_SRC,
    COLOR_DST,
    COLOR_DISABLED,
    build_convergence_figure,
    build_network_figure,
    build_scenario_metric_figure,
    build_strategy_comparison_chart,
    build_timeline_figure,
    format_path_string,
    get_node_positions,
    load_experiment_results,
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

RESULTS_DIR = PROJECT_ROOT / "results"

# ---------------------------------------------------------------------------
# Page Configuration & Custom CSS
# ---------------------------------------------------------------------------

st.set_page_config(
    page_title="Self-Adaptive Network Optimizer",
    page_icon="🌐",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    /* Dark navy / charcoal technical dashboard theme */
    .stApp {
        background-color: #0B0F19;
        color: #F8FAFC;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    header[data-testid="stHeader"] {
        background-color: #0B0F19;
    }
    section[data-testid="stSidebar"] {
        background-color: #111827;
        border-right: 1px solid #1E293B;
    }
    div[data-testid="stMetricValue"] {
        font-size: 1.45rem !important;
        font-weight: 700;
        color: #06B6D4;
    }
    div[data-testid="stMetricLabel"] {
        font-size: 0.85rem !important;
        color: #94A3B8;
        font-weight: 500;
    }
    .kpi-card {
        background-color: #111827;
        border: 1px solid #1E293B;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
    }
    .status-badge-healthy {
        background-color: rgba(16, 185, 129, 0.15);
        color: #10B981;
        padding: 4px 10px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.85rem;
        border: 1px solid rgba(16, 185, 129, 0.3);
        display: inline-block;
    }
    .status-badge-triggered {
        background-color: rgba(245, 158, 11, 0.15);
        color: #F59E0B;
        padding: 4px 10px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.85rem;
        border: 1px solid rgba(245, 158, 11, 0.3);
        display: inline-block;
    }
    .status-badge-failed {
        background-color: rgba(239, 68, 68, 0.15);
        color: #EF4444;
        padding: 4px 10px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.85rem;
        border: 1px solid rgba(239, 68, 68, 0.3);
        display: inline-block;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 6px;
        padding: 8px 16px;
        background-color: #111827;
        border: 1px solid #1E293B;
        color: #94A3B8;
    }
    .stTabs [aria-selected="true"] {
        background-color: #1E293B !important;
        color: #06B6D4 !important;
        border-color: #06B6D4 !important;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


# ---------------------------------------------------------------------------
# Session State Management
# ---------------------------------------------------------------------------

def init_session_state() -> None:
    """Initialize persistent session state variables."""
    if "topology_name" not in st.session_state:
        st.session_state["topology_name"] = "8-Node Demo Network"

    if "engine" not in st.session_state:
        base_graph = build_demo_graph()
        st.session_state["engine"] = AdaptiveRoutingEngine(
            graph=base_graph,
            source=0,
            destination=7,
            quality_threshold=config.QUALITY_CHANGE_THRESHOLD,
            cost_threshold=config.ROUTE_COST_DEGRADATION_THRESHOLD,
            seed=config.DEFAULT_RANDOM_SEED,
        )

    if "node_positions" not in st.session_state:
        engine: AdaptiveRoutingEngine = st.session_state["engine"]
        is_demo = st.session_state["topology_name"] == "8-Node Demo Network"
        st.session_state["node_positions"] = get_node_positions(engine.graph, is_demo=is_demo)

    if "session_history" not in st.session_state:
        st.session_state["session_history"] = []

    if "last_event_result" not in st.session_state:
        st.session_state["last_event_result"] = None


init_session_state()
engine: AdaptiveRoutingEngine = st.session_state["engine"]


def switch_topology(new_name: str) -> None:
    """Safely switch topology between 8-node demo and 25-node experiment graph."""
    if new_name == "8-Node Demo Network":
        g = build_demo_graph()
        src, dst = 0, 7
        is_demo = True
    else:
        g = build_experiment_graph(num_nodes=25, seed=42)
        src, dst = 0, 24
        is_demo = False

    st.session_state["topology_name"] = new_name
    st.session_state["engine"] = AdaptiveRoutingEngine(
        graph=g,
        source=src,
        destination=dst,
        quality_threshold=config.QUALITY_CHANGE_THRESHOLD,
        cost_threshold=config.ROUTE_COST_DEGRADATION_THRESHOLD,
        seed=config.DEFAULT_RANDOM_SEED,
    )
    st.session_state["node_positions"] = get_node_positions(g, is_demo=is_demo)
    st.session_state["last_event_result"] = None


# ---------------------------------------------------------------------------
# Sidebar Navigation & Quick Controls
# ---------------------------------------------------------------------------

st.sidebar.markdown(
    """
    <div style="padding-bottom: 12px; border-bottom: 1px solid #1E293B; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 1.15rem; color: #06B6D4; letter-spacing: 0.5px;">
            NETWORK OPTIMIZER
        </h2>
        <span style="font-size: 0.75rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px;">
            Self-Adaptive Routing System
        </span>
    </div>
    """,
    unsafe_allow_html=True,
)

# Topology Selector
topo_choice = st.sidebar.selectbox(
    "Active Network Topology",
    ["8-Node Demo Network", "25-Node Experiment Network"],
    index=0 if st.session_state["topology_name"] == "8-Node Demo Network" else 1,
    help="Select between the standard 8-node demo topology and the 25-node benchmark topology.",
)
if topo_choice != st.session_state["topology_name"]:
    switch_topology(topo_choice)
    st.rerun()

# Section Navigation
nav_section = st.sidebar.radio(
    "Navigation",
    [
        "Overview",
        "Live Network Simulator",
        "Routing Strategy Comparison",
        "Experimental Results",
        "Adaptive Explainability",
        "Event History",
    ],
    index=0,
)

st.sidebar.markdown("---")

# Quick Engine Telemetry in Sidebar
has_path = len(engine.current_route) > 0 and math.isfinite(engine.current_route_cost)
status_html = (
    '<span class="status-badge-healthy">ACTIVE ROUTE</span>'
    if has_path
    else '<span class="status-badge-failed">UNREACHABLE</span>'
)

st.sidebar.markdown(
    f"""
    <div style="font-size: 0.85rem; color: #94A3B8; line-height: 1.6;">
        <div><b>Status:</b> {status_html}</div>
        <div><b>Routers:</b> {engine.graph.number_of_nodes()} &nbsp;|&nbsp; <b>Links:</b> {engine.graph.number_of_edges()}</div>
        <div><b>Source:</b> Node {engine.source} → <b>Dest:</b> Node {engine.destination}</div>
        <div><b>Route Changes:</b> {engine.total_route_changes}</div>
    </div>
    """,
    unsafe_allow_html=True,
)

if st.sidebar.button("Reset Entire Network", type="secondary", use_container_width=True):
    engine.reset()
    st.session_state["last_event_result"] = None
    st.sidebar.success("Network restored to initial baseline.")
    st.rerun()


# ---------------------------------------------------------------------------
# Section A: Overview
# ---------------------------------------------------------------------------

if nav_section == "Overview":
    st.title("Network Overview & Telemetry")
    st.markdown(
        "Real-time operational status of the simulated network, current active route, "
        "and multi-criteria Quality of Service (QoS) telemetry."
    )

    is_unreachable = len(engine.current_route) == 0 or not math.isfinite(engine.current_route_cost)

    if is_unreachable:
        st.error(
            f"⚠️ Destination Node {engine.destination} is unreachable from Source Node {engine.source}. "
            "All candidate paths are disrupted or intermediate routers are disabled."
        )

    # Top KPI Metrics Row
    m1, m2, m3, m4, m5, m6 = st.columns(6)

    m1.metric("Active Routers", f"{engine.graph.number_of_nodes()}")
    m2.metric("Total Links", f"{engine.graph.number_of_edges()}")

    route_hops = len(engine.current_route) - 1 if len(engine.current_route) >= 2 else 0
    m3.metric("Route Hops", f"{route_hops}" if not is_unreachable else "N/A")

    lat_val = engine.current_metrics.get("latency_ms", 0.0)
    m4.metric("Latency", f"{lat_val:.1f} ms" if not is_unreachable else "∞ ms")

    loss_val = engine.current_metrics.get("packet_loss_percent", 0.0)
    m5.metric("Packet Loss", f"{loss_val:.2f}%" if not is_unreachable else "∞ %")

    bw_val = engine.current_metrics.get("bandwidth_mbps", 0.0)
    m6.metric("Bottleneck BW", f"{bw_val:.1f} Mbps" if not is_unreachable else "0 Mbps")

    st.markdown("<br>", unsafe_allow_html=True)

    # Detailed Status & Path Cards
    col_left, col_right = st.columns([1.2, 1.0])

    with col_left:
        st.markdown(
            f"""
            <div class="kpi-card">
                <h4 style="margin: 0 0 10px 0; color: #06B6D4;">Current Route Path</h4>
                <div style="font-size: 1.15rem; font-weight: 600; color: #F8FAFC; margin-bottom: 8px;">
                    {format_path_string(engine.current_route)}
                </div>
                <div style="font-size: 0.85rem; color: #94A3B8;">
                    Source: <b style="color: #10B981;">Node {engine.source}</b> &nbsp;|&nbsp;
                    Destination: <b style="color: #8B5CF6;">Node {engine.destination}</b> &nbsp;|&nbsp;
                    Hops: <b>{route_hops}</b>
                </div>
                <hr style="border-color: #1E293B; margin: 12px 0;">
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                    <span>Fuzzy Composite Routing Cost:</span>
                    <b style="color: #38BDF8;">
                        {f"{engine.current_route_cost:.4f}" if not is_unreachable else "Infinite (Unreachable)"}
                    </b>
                </div>
                <div style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">
                    * Cost is derived from Mamdani fuzzy quality assessment: Cost = Σ 1/(Quality + 10⁻⁶).
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with col_right:
        last_res: Optional[AdaptiveEventResult] = st.session_state["last_event_result"]
        last_reason = last_res.trigger_reason if last_res else "Baseline Initialization"
        last_event = last_res.event_name.replace("_", " ").title() if last_res else "None"
        last_proc = f"{last_res.processing_time_seconds * 1000.0:.2f} ms" if last_res else "0.00 ms"
        last_reroute = f"{last_res.reroute_time_seconds * 1000.0:.2f} ms" if last_res else "0.00 ms"

        st.markdown(
            f"""
            <div class="kpi-card">
                <h4 style="margin: 0 0 10px 0; color: #8B5CF6;">Adaptive Engine Status</h4>
                <div style="font-size: 0.9rem; line-height: 1.8;">
                    <div><b>Operational State:</b> {'🟢 Normal / Stable' if not is_unreachable else '🔴 Disrupted'}</div>
                    <div><b>Most Recent Event:</b> {last_event}</div>
                    <div><b>Trigger Reason:</b> <code>{last_reason}</code></div>
                    <div><b>Total Route Reroutes:</b> {engine.total_route_changes}</div>
                    <div><b>Last Inspection Time:</b> {last_proc} &nbsp;|&nbsp; <b>ACO Reroute Time:</b> {last_reroute}</div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    # Core Architecture Principles
    st.markdown("### Soft Computing Architecture Summary")
    c1, c2, c3 = st.columns(3)

    with c1:
        st.markdown(
            """
            <div class="kpi-card" style="height: 100%;">
                <h4 style="color: #38BDF8; margin-top: 0;">1. Fuzzy Quality Inference</h4>
                <p style="font-size: 0.85rem; color: #94A3B8;">
                    Evaluates four uncertain parameters per link (latency, packet loss, bandwidth, and congestion)
                    using Mamdani fuzzy sets and centroid defuzzification into link quality score Q ∈ [0, 1].
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with c2:
        st.markdown(
            """
            <div class="kpi-card" style="height: 100%;">
                <h4 style="color: #4ADE80; margin-top: 0;">2. Ant Colony Optimization</h4>
                <p style="font-size: 0.85rem; color: #94A3B8;">
                    Stochastic multi-ant search using pheromone trails (α=1.0) and fuzzy inverse-cost heuristic (β=2.0)
                    with evaporation (ρ=0.5) to discover resilient routes under changing conditions.
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with c3:
        st.markdown(
            """
            <div class="kpi-card" style="height: 100%;">
                <h4 style="color: #F43F5E; margin-top: 0;">3. Event-Driven Adaptation</h4>
                <p style="font-size: 0.85rem; color: #94A3B8;">
                    Incremental edge cache avoids unnecessary recalculations. Sensitivity thresholds (10% quality drop,
                    20% cost degradation) prevent route flapping on minor noise while instantly recovering from failure.
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )


# ---------------------------------------------------------------------------
# Section B: Live Network Simulator
# ---------------------------------------------------------------------------

elif nav_section == "Live Network Simulator":
    st.title("Live Network Simulator & Event Control")
    st.markdown(
        "Interactive topology visualization with dynamic event injection. "
        "Apply QoS degradations, link failures, or router failures to observe real-time adaptive rerouting."
    )

    # Endpoint selection row
    nodes_list = sorted(list(engine.graph.nodes()))
    ep1, ep2, ep3 = st.columns([1.5, 1.5, 3.0])

    with ep1:
        new_src = st.selectbox(
            "Source Router",
            nodes_list,
            index=nodes_list.index(engine.source) if engine.source in nodes_list else 0,
            key="src_selector",
        )
    with ep2:
        dest_candidates = [n for n in nodes_list if n != new_src]
        default_dst_idx = (
            dest_candidates.index(engine.destination)
            if engine.destination in dest_candidates
            else len(dest_candidates) - 1
        )
        new_dst = st.selectbox(
            "Destination Router",
            dest_candidates,
            index=default_dst_idx,
            key="dst_selector",
        )

    if new_src != engine.source or new_dst != engine.destination:
        try:
            engine.set_endpoints(new_src, new_dst)
            st.rerun()
        except Exception as e:
            st.error(f"Failed to update endpoints: {e}")

    with ep3:
        st.markdown(
            f"""
            <div style="padding-top: 24px; font-size: 0.9rem; color: #94A3B8;">
                Current Path: <b style="color: #06B6D4;">{format_path_string(engine.current_route)}</b>
            </div>
            """,
            unsafe_allow_html=True,
        )

    # Unreachable destination alert
    is_unreachable = len(engine.current_route) == 0 or not math.isfinite(engine.current_route_cost)
    if is_unreachable:
        st.error(
            f"⚠️ Destination Router {engine.destination} is unreachable from Source {engine.source}. "
            "No active path exists on the active network."
        )

    # Render Network Topology
    fig_net = build_network_figure(
        graph=engine.graph,
        current_route=engine.current_route,
        source=engine.source,
        destination=engine.destination,
        positions=st.session_state["node_positions"],
        link_cache=engine.link_cache,
    )
    st.plotly_chart(fig_net, use_container_width=True)

    # Dynamic Event Controls Deck
    st.markdown("### Dynamic Network Event Controls")

    tab_qos, tab_link, tab_node, tab_comb, tab_reset = st.tabs(
        [
            "⚡ Link QoS Degradation",
            "🔌 Link Failure / Restore",
            "🛑 Router Failure / Restore",
            "🌪️ Combined Event",
            "🔄 Reset Simulation",
        ]
    )

    # All canonical edge pairs in the graph
    available_edges = [
        canonical_edge(u, v)
        for u, v in sorted(engine.graph.edges())
    ]
    edge_labels = {
        e: f"Link ({e[0]} ↔ {e[1]})" + (" [ON ROUTE]" if e in zip(engine.current_route, engine.current_route[1:]) or (e[1], e[0]) in zip(engine.current_route, engine.current_route[1:]) else "")
        for e in available_edges
    }

    # Tab 1: QoS Degradation
    with tab_qos:
        col_q1, col_q2, col_q3 = st.columns(3)
        with col_q1:
            target_edge = st.selectbox(
                "Target Link",
                available_edges,
                format_func=lambda e: edge_labels.get(e, str(e)),
                key="qos_edge",
            )
            data_curr = engine.graph[target_edge[0]][target_edge[1]]
            st.caption(
                f"Current: Latency {data_curr['latency']:.1f}ms, Loss {data_curr['packet_loss']:.1f}%, Congestion {data_curr['congestion']:.1f}%"
            )

        with col_q2:
            event_type = st.radio(
                "Degradation Type",
                ["Congestion Increase", "Latency Spike", "Packet Loss Increase"],
                key="qos_type",
            )

        with col_q3:
            if event_type == "Congestion Increase":
                cong_amount = st.slider("Congestion Increase (%)", 10.0, 80.0, 30.0, 5.0)
                if st.button("Apply Congestion Surge", type="primary", use_container_width=True):
                    res = engine.apply_congestion([target_edge], amount=cong_amount)
                    st.session_state["last_event_result"] = res
                    st.session_state["session_history"].append(res)
                    st.rerun()

            elif event_type == "Latency Spike":
                lat_mult = st.slider("Latency Multiplier", 1.5, 5.0, 2.5, 0.5)
                if st.button("Apply Latency Spike", type="primary", use_container_width=True):
                    res = engine.apply_latency([target_edge], multiplier=lat_mult)
                    st.session_state["last_event_result"] = res
                    st.session_state["session_history"].append(res)
                    st.rerun()

            else:
                loss_amount = st.slider("Packet Loss Increase (%)", 1.0, 15.0, 5.0, 1.0)
                if st.button("Apply Packet Loss Surge", type="primary", use_container_width=True):
                    res = engine.apply_packet_loss([target_edge], amount=loss_amount)
                    st.session_state["last_event_result"] = res
                    st.session_state["session_history"].append(res)
                    st.rerun()

    # Tab 2: Link Failure / Restore
    with tab_link:
        col_l1, col_l2 = st.columns(2)
        with col_l1:
            target_link = st.selectbox(
                "Select Link to Toggle",
                available_edges,
                format_func=lambda e: f"Link ({e[0]} ↔ {e[1]})" + (" [DISABLED]" if not engine.graph[e[0]][e[1]].get("enabled", True) else " [ENABLED]"),
                key="link_toggle_edge",
            )
            is_link_up = engine.graph[target_link[0]][target_link[1]].get("enabled", True)

        with col_l2:
            st.markdown("<br>", unsafe_allow_html=True)
            if is_link_up:
                if st.button("🔴 Disable Link (Simulate Failure)", type="primary", use_container_width=True):
                    res = engine.apply_link_failure(*target_link)
                    st.session_state["last_event_result"] = res
                    st.session_state["session_history"].append(res)
                    st.rerun()
            else:
                if st.button("🟢 Restore Link (Simulate Repair)", type="secondary", use_container_width=True):
                    res = engine.apply_link_restoration(*target_link)
                    st.session_state["last_event_result"] = res
                    st.session_state["session_history"].append(res)
                    st.rerun()

    # Tab 3: Router Failure / Restore
    with tab_node:
        col_n1, col_n2 = st.columns(2)
        with col_n1:
            target_router = st.selectbox(
                "Select Router Node to Toggle",
                nodes_list,
                format_func=lambda n: f"Router {n}" + (" [DISABLED]" if not engine.graph.nodes[n].get("enabled", True) else " [ENABLED]"),
                key="router_toggle_node",
            )
            is_node_up = engine.graph.nodes[target_router].get("enabled", True)

        with col_n2:
            st.markdown("<br>", unsafe_allow_html=True)
            if is_node_up:
                if st.button("🔴 Disable Router (Node Failure)", type="primary", use_container_width=True):
                    res = engine.apply_router_failure(target_router)
                    st.session_state["last_event_result"] = res
                    st.session_state["session_history"].append(res)
                    st.rerun()
            else:
                if st.button("🟢 Restore Router (Node Repair)", type="secondary", use_container_width=True):
                    res = engine.apply_router_restoration(target_router)
                    st.session_state["last_event_result"] = res
                    st.session_state["session_history"].append(res)
                    st.rerun()

    # Tab 4: Combined Event
    with tab_comb:
        st.markdown("Apply compound dynamic events simulating severe network degradation.")
        c_edges = st.multiselect("Congestion Links (+30%)", available_edges, default=[available_edges[0]], format_func=lambda e: f"({e[0]}, {e[1]})")
        l_edges = st.multiselect("Latency Spike Links (2.5x)", available_edges, default=[available_edges[1]] if len(available_edges) > 1 else [], format_func=lambda e: f"({e[0]}, {e[1]})")
        fail_link_choice = st.selectbox("Simultaneous Link Failure", [None] + available_edges, format_func=lambda e: "None" if e is None else f"({e[0]}, {e[1]})")

        if st.button("Apply Combined Scenario", type="primary"):
            res = engine.apply_combined_event(
                congestion_edges=c_edges if c_edges else None,
                latency_edges=l_edges if l_edges else None,
                failed_link=fail_link_choice,
            )
            st.session_state["last_event_result"] = res
            st.session_state["session_history"].append(res)
            st.rerun()

    # Tab 5: Reset
    with tab_reset:
        st.markdown("Restore network topology and all link attributes to baseline configuration.")
        if st.button("Restore Network to Baseline", type="secondary"):
            engine.reset()
            st.session_state["last_event_result"] = None
            st.success("Simulation graph and ACO state restored.")
            st.rerun()

    # Telemetry card of last applied event
    last_res: Optional[AdaptiveEventResult] = st.session_state["last_event_result"]
    if last_res:
        st.markdown("---")
        st.markdown("#### Latest Event Telemetry")
        trig_badge = (
            '<span class="status-badge-triggered">REROUTE TRIGGERED</span>'
            if last_res.triggered
            else '<span class="status-badge-healthy">BELOW THRESHOLD (TOLERATED)</span>'
        )

        st.markdown(
            f"""
            <div class="kpi-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 1.05rem; font-weight: 600;">{last_res.event_name.replace('_', ' ').title()}</span>
                    {trig_badge}
                </div>
                <div style="font-size: 0.85rem; color: #94A3B8; margin-bottom: 8px;">
                    Trigger Reason: <code style="color: #38BDF8;">{last_res.trigger_reason}</code>
                </div>
                <div style="display: flex; gap: 30px; font-size: 0.85rem;">
                    <div>Previous Route: <b>{format_path_string(last_res.previous_route)}</b></div>
                    <div>New Route: <b>{format_path_string(last_res.new_route)}</b></div>
                    <div>Route Changed: <b>{'Yes' if last_res.route_changed else 'No'}</b></div>
                    <div>Processing: <b>{last_res.processing_time_seconds * 1000.0:.2f} ms</b></div>
                    <div>Reroute Time: <b>{last_res.reroute_time_seconds * 1000.0:.2f} ms</b></div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


# ---------------------------------------------------------------------------
# Section C: Routing Strategy Comparison
# ---------------------------------------------------------------------------

elif nav_section == "Routing Strategy Comparison":
    st.title("Routing Strategy Comparison")
    st.markdown(
        "Direct head-to-head evaluation of all four routing strategies under **identical active network conditions**. "
        "Observes how single-objective latency minimization compares against multi-criteria fuzzy quality routing."
    )

    active_graph = get_active_graph(engine.graph)
    can_route = (
        engine.source in active_graph
        and engine.destination in active_graph
        and nx.has_path(active_graph, engine.source, engine.destination)
    )

    if not can_route:
        st.warning("⚠️ Current network state is disconnected. Some or all algorithms may return unreachable.")

    # 1. Dijkstra Latency
    t0 = time.perf_counter()
    res_dijk_lat = dijkstra_latency(engine.graph, engine.source, engine.destination)
    t_dijk_lat = (time.perf_counter() - t0) * 1000.0
    m_dijk_lat = calculate_route_metrics(engine.graph, res_dijk_lat.path, res_dijk_lat.cost)

    # 2. Dijkstra Fuzzy
    t0 = time.perf_counter()
    res_dijk_fuz = dijkstra_fuzzy(engine.graph, engine.source, engine.destination)
    t_dijk_fuz = (time.perf_counter() - t0) * 1000.0
    m_dijk_fuz = calculate_route_metrics(engine.graph, res_dijk_fuz.path, res_dijk_fuz.cost)

    # 3. ACO Fuzzy
    t0 = time.perf_counter()
    aco_temp = AntColonyOptimizer(
        alpha=config.ACO_ALPHA,
        beta=config.ACO_BETA,
        evaporation_rate=config.ACO_EVAPORATION_RATE,
        num_ants=config.ACO_NUM_ANTS,
        num_iterations=config.ACO_NUM_ITERATIONS,
        seed=engine.seed,
    )
    res_aco = aco_temp.find_route(engine.graph, engine.source, engine.destination)
    t_aco = (time.perf_counter() - t0) * 1000.0
    m_aco = calculate_route_metrics(engine.graph, res_aco.path, res_aco.cost)

    # 4. Adaptive ACO (engine's active route)
    last_res = st.session_state["last_event_result"]
    t_adapt = (last_res.reroute_time_seconds * 1000.0) if last_res else t_aco
    m_adapt = dict(engine.current_metrics)

    comparison_rows = [
        {
            "strategy": "dijkstra_latency",
            "strategy_label": "Dijkstra (Latency)",
            "objective": "Minimize Raw Latency (ms)",
            "reachable": res_dijk_lat.exists,
            "path": res_dijk_lat.path,
            "latency_ms": m_dijk_lat["latency_ms"],
            "packet_loss_percent": m_dijk_lat["packet_loss_percent"],
            "bandwidth_mbps": m_dijk_lat["bandwidth_mbps"],
            "congestion_percent": m_dijk_lat["congestion_percent"],
            "hops": len(res_dijk_lat.path) - 1 if res_dijk_lat.path else 0,
            "runtime_ms": t_dijk_lat,
        },
        {
            "strategy": "dijkstra_fuzzy",
            "strategy_label": "Dijkstra (Fuzzy Cost)",
            "objective": "Minimize Composite Fuzzy Cost",
            "reachable": res_dijk_fuz.exists,
            "path": res_dijk_fuz.path,
            "latency_ms": m_dijk_fuz["latency_ms"],
            "packet_loss_percent": m_dijk_fuz["packet_loss_percent"],
            "bandwidth_mbps": m_dijk_fuz["bandwidth_mbps"],
            "congestion_percent": m_dijk_fuz["congestion_percent"],
            "hops": len(res_dijk_fuz.path) - 1 if res_dijk_fuz.path else 0,
            "runtime_ms": t_dijk_fuz,
        },
        {
            "strategy": "aco_fuzzy",
            "strategy_label": "ACO (Fuzzy Cost)",
            "objective": "Metaheuristic Fuzzy Optimization",
            "reachable": res_aco.exists,
            "path": res_aco.path,
            "latency_ms": m_aco["latency_ms"],
            "packet_loss_percent": m_aco["packet_loss_percent"],
            "bandwidth_mbps": m_aco["bandwidth_mbps"],
            "congestion_percent": m_aco["congestion_percent"],
            "hops": len(res_aco.path) - 1 if res_aco.path else 0,
            "runtime_ms": t_aco,
        },
        {
            "strategy": "adaptive_aco",
            "strategy_label": "Adaptive ACO",
            "objective": "Threshold-Triggered Self-Healing",
            "reachable": len(engine.current_route) > 0 and math.isfinite(engine.current_route_cost),
            "path": engine.current_route,
            "latency_ms": m_adapt.get("latency_ms", float("inf")),
            "packet_loss_percent": m_adapt.get("packet_loss_percent", float("inf")),
            "bandwidth_mbps": m_adapt.get("bandwidth_mbps", 0.0),
            "congestion_percent": m_adapt.get("congestion_percent", float("inf")),
            "hops": len(engine.current_route) - 1 if engine.current_route else 0,
            "runtime_ms": t_adapt,
        },
    ]

    # Render Visual Comparison Chart
    st.markdown("#### Real-Time Metric Comparison")
    fig_comp = build_strategy_comparison_chart(comparison_rows)
    st.plotly_chart(fig_comp, use_container_width=True)

    # Detailed Table
    st.markdown("#### Strategy Performance Matrix")
    display_rows = []
    for r in comparison_rows:
        display_rows.append(
            {
                "Strategy": r["strategy_label"],
                "Objective": r["objective"],
                "Status": "Reachable" if r["reachable"] else "Unreachable",
                "Path": format_path_string(r["path"]),
                "Latency (ms)": f"{r['latency_ms']:.1f}" if math.isfinite(r["latency_ms"]) else "∞",
                "Loss (%)": f"{r['packet_loss_percent']:.2f}%" if math.isfinite(r["packet_loss_percent"]) else "∞",
                "Bandwidth (Mbps)": f"{r['bandwidth_mbps']:.1f}" if math.isfinite(r["bandwidth_mbps"]) else "0.0",
                "Congestion (%)": f"{r['congestion_percent']:.1f}%" if math.isfinite(r["congestion_percent"]) else "∞",
                "Hops": r["hops"],
                "Runtime (ms)": f"{r['runtime_ms']:.2f}",
            }
        )

    st.dataframe(pd.DataFrame(display_rows), hide_index=True, use_container_width=True)

    st.markdown(
        """
        > [!NOTE]
        > **Scale Separation Notice**: Dijkstra (Latency) minimizes raw latency in milliseconds,
        > whereas fuzzy routing minimizes a composite dimensionless penalty function.
        > Comparing raw latency cost directly against fuzzy cost is invalid; comparison must be based
        > on actual end-to-end network attributes (latency, loss, bottleneck capacity, congestion).
        """
    )


# ---------------------------------------------------------------------------
# Section D: Experimental Results
# ---------------------------------------------------------------------------

elif nav_section == "Experimental Results":
    st.title("Empirical Evaluation & Statistical Results")
    st.markdown(
        "Precomputed results loaded directly from Phase 3 experimental evaluation "
        "across all six network scenarios and 20 independent ACO seeds."
    )

    data = load_experiment_results(RESULTS_DIR)

    if not data["loaded"]:
        st.warning(
            f"⚠️ Could not load precomputed results from `{RESULTS_DIR}`: {data.get('error')}.<br>"
            "To generate the experimental datasets, execute in your terminal:<br>"
            "<code>python -m evaluation.experiments --seed 42 --aco-runs 20</code>",
            icon="⚠️",
        )
    else:
        meta = data.get("metadata")
        if meta:
            col_m1, col_m2, col_m3, col_m4, col_m5 = st.columns(5)
            col_m1.metric("Graph Nodes", f"{meta['graph_topology']['num_nodes']}")
            col_m2.metric("ACO Seeds / Scenario", f"{meta['experiments']['aco_runs']}")
            col_m3.metric("Scenarios Tested", f"{len(meta['experiments']['scenarios'])}")
            col_m4.metric("Strategies Tested", f"{len(meta['experiments']['strategies'])}")
            col_m5.metric("Pipeline Runtime", f"{meta.get('total_runtime_seconds', 0.0):.2f} s")

        tab_scen, tab_dyn, tab_aco, tab_data = st.tabs(
            [
                "📊 Scenario Benchmarks",
                "📈 10-Step Dynamic Timeline",
                "🐜 ACO Convergence Curves",
                "📋 Raw Dataset Tables",
            ]
        )

        with tab_scen:
            metric_choice = st.selectbox(
                "Select Performance Metric to Plot",
                [
                    ("latency_ms", "Latency (ms)", "End-to-End Route Latency across Network Scenarios"),
                    ("packet_loss_percent", "Packet Loss (%)", "End-to-End Packet Loss across Scenarios"),
                    ("bandwidth_mbps", "Bottleneck Bandwidth (Mbps)", "Bottleneck Capacity across Scenarios"),
                    ("congestion_percent", "Route Congestion (%)", "Average Route Congestion across Scenarios"),
                ],
                format_func=lambda x: x[1],
            )
            fig_metric = build_scenario_metric_figure(
                summary_rows=data["summary_rows"],
                metric_key=metric_choice[0],
                y_title=metric_choice[1],
                chart_title=metric_choice[2],
            )
            st.plotly_chart(fig_metric, use_container_width=True)

        with tab_dyn:
            st.markdown("#### Sequential Event Trajectory & Adaptation Latency")
            st.markdown(
                "Tracks end-to-end latency trajectory and adaptive event inspection vs. ACO rerouting time "
                "across the controlled 10-step dynamic lifecycle."
            )
            fig_time = build_timeline_figure(data["dynamic_rows"])
            st.plotly_chart(fig_time, use_container_width=True)

        with tab_aco:
            st.markdown("#### Ant Colony Optimization Iterative Convergence")
            scen_pick = st.selectbox(
                "Filter Convergence by Scenario",
                ["normal", "congestion", "high_latency", "packet_loss", "link_failure", "dynamic_combined"],
            )
            fig_conv = build_convergence_figure(data["convergence_rows"], scenario=scen_pick)
            st.plotly_chart(fig_conv, use_container_width=True)

        with tab_data:
            st.markdown("#### Summary Results Table (`summary_results.csv`)")
            if data["summary_rows"]:
                st.dataframe(pd.DataFrame(data["summary_rows"]), use_container_width=True)
            st.markdown("#### Dynamic Timeline Table (`dynamic_timeline.csv`)")
            if data["dynamic_rows"]:
                st.dataframe(pd.DataFrame(data["dynamic_rows"]), use_container_width=True)


# ---------------------------------------------------------------------------
# Section E: Adaptive Explainability
# ---------------------------------------------------------------------------

elif nav_section == "Adaptive Explainability":
    st.title("Adaptive Decision Explainability")
    st.markdown(
        "Plain-English diagnostic breakdown of the engine's most recent routing decision. "
        "Inspects whether conditions triggered sensitivity thresholds, topological invalidation, or tolerance."
    )

    last_res: Optional[AdaptiveEventResult] = st.session_state["last_event_result"]

    if last_res is None:
        st.info(
            "ℹ️ No dynamic network event has been applied in this session yet. "
            "Go to the **Live Network Simulator** tab to apply a degradation or failure event, "
            "then return here to inspect the plain-English explanation."
        )
    else:
        # Decision Badge
        if last_res.unreachable:
            badge_html = '<span class="status-badge-failed">UNREACHABLE / DESTINATION SEVERED</span>'
        elif last_res.triggered:
            badge_html = '<span class="status-badge-triggered">ADAPTIVE REROUTE TRIGGERED</span>'
        else:
            badge_html = '<span class="status-badge-healthy">TOLERATED (BELOW SENSITIVITY THRESHOLD)</span>'

        st.markdown(
            f"""
            <div class="kpi-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 style="margin: 0; color: #06B6D4;">Event: {last_res.event_name.replace('_', ' ').title()}</h3>
                    {badge_html}
                </div>
                <div style="font-size: 1.05rem; line-height: 1.6; color: #F8FAFC;">
                    <b>Trigger Reason:</b> <code>{last_res.trigger_reason}</code>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown("### Plain-English Decision Breakdown")

        # Natural language narrative construction
        narrative_parts = []
        if last_res.changed_nodes:
            narrative_parts.append(
                f"Router **Node {last_res.changed_nodes[0]}** was toggled or failed, affecting its incident links."
            )
        elif last_res.changed_edges:
            edges_str = ", ".join(f"({u}, {v})" for u, v in last_res.changed_edges)
            narrative_parts.append(f"Network conditions were modified on link(s): **{edges_str}**.")

        if last_res.unreachable:
            narrative_parts.append(
                "Because all active paths between source and destination are severed, the adaptive engine "
                "halted route search and explicitly reported unreachability in **"
                f"{last_res.processing_time_seconds * 1000.0:.2f} ms** without hanging."
            )
        elif last_res.triggered:
            if "disabled" in last_res.trigger_reason:
                narrative_parts.append(
                    "**Immediate Topological Invalidation**: An active link or router along the current route was disabled. "
                    "The engine bypassed numeric thresholds and immediately launched ACO rerouting away from the broken component."
                )
            elif "quality_drop" in last_res.trigger_reason:
                narrative_parts.append(
                    f"**Fuzzy Quality Drop**: Fuzzy inference detected link quality degradation exceeding the configured "
                    f"sensitivity threshold ({engine.quality_threshold:.1%}). This triggered adaptive ACO rerouting."
                )
            elif "route_cost_degradation" in last_res.trigger_reason:
                narrative_parts.append(
                    f"**Route Cost Degradation**: Total route fuzzy cost increased beyond the degradation threshold "
                    f"({engine.cost_threshold:.1%}) relative to baseline reference cost."
                )
            narrative_parts.append(
                f"The ACO router converged on new path **{format_path_string(last_res.new_route)}** "
                f"in **{last_res.reroute_time_seconds * 1000.0:.2f} ms**."
            )
        else:
            narrative_parts.append(
                "**Tolerance / Stability Filter**: Although network conditions degraded, the relative drop remained "
                f"below the {engine.quality_threshold:.1%} sensitivity threshold. The engine preserved current route "
                f"**{format_path_string(last_res.previous_route)}** to prevent route flapping, completing inspection in **"
                f"{last_res.processing_time_seconds * 1000.0:.2f} ms**."
            )

        st.markdown(
            f"""
            <div class="kpi-card" style="font-size: 0.95rem; line-height: 1.8; color: #E2E8F0;">
                {"<br><br>".join(narrative_parts)}
            </div>
            """,
            unsafe_allow_html=True,
        )

        # Before / After Performance Deltas
        st.markdown("### Before vs. After Performance Impact")
        c_lat, c_loss, c_bw, c_cong = st.columns(4)

        prev_lat = last_res.previous_metrics.get("latency_ms", 0.0)
        new_lat = last_res.new_metrics.get("latency_ms", 0.0)
        c_lat.metric("Latency", f"{new_lat:.1f} ms", f"{new_lat - prev_lat:+.1f} ms", delta_color="inverse")

        prev_loss = last_res.previous_metrics.get("packet_loss_percent", 0.0)
        new_loss = last_res.new_metrics.get("packet_loss_percent", 0.0)
        c_loss.metric("Packet Loss", f"{new_loss:.2f}%", f"{new_loss - prev_loss:+.2f}%", delta_color="inverse")

        prev_bw = last_res.previous_metrics.get("bandwidth_mbps", 0.0)
        new_bw = last_res.new_metrics.get("bandwidth_mbps", 0.0)
        c_bw.metric("Bottleneck BW", f"{new_bw:.1f} Mbps", f"{new_bw - prev_bw:+.1f} Mbps", delta_color="normal")

        prev_cong = last_res.previous_metrics.get("congestion_percent", 0.0)
        new_cong = last_res.new_metrics.get("congestion_percent", 0.0)
        c_cong.metric("Route Congestion", f"{new_cong:.1f}%", f"{new_cong - prev_cong:+.1f}%", delta_color="inverse")


# ---------------------------------------------------------------------------
# Section F: Event History
# ---------------------------------------------------------------------------

elif nav_section == "Event History":
    st.title("Session Event History")
    st.markdown(
        "Chronological audit trail of all dynamic network events applied during the current dashboard session. "
        "Inspect event triggers, route transitions, and inspection vs. rerouting latencies."
    )

    history = st.session_state["session_history"]

    col_btn1, col_btn2, _ = st.columns([1.5, 1.5, 4.0])
    with col_btn1:
        if st.button("Clear Session History", type="secondary"):
            st.session_state["session_history"] = []
            st.session_state["last_event_result"] = None
            st.success("Session event history cleared.")
            st.rerun()

    if not history:
        st.info("ℹ️ No events recorded in the current session history.")
    else:
        hist_rows = []
        for i, ev in enumerate(history, 1):
            target_str = (
                f"Router {ev.changed_nodes[0]}"
                if ev.changed_nodes
                else ", ".join(f"({u},{v})" for u, v in ev.changed_edges)
            )
            lat_before = ev.previous_metrics.get("latency_ms", 0.0)
            lat_after = ev.new_metrics.get("latency_ms", 0.0)

            hist_rows.append(
                {
                    "#": i,
                    "Event": ev.event_name.replace("_", " ").title(),
                    "Target": target_str,
                    "Triggered?": "YES" if ev.triggered else "NO (Tolerated)",
                    "Trigger Reason": ev.trigger_reason,
                    "Route Changed?": "YES" if ev.route_changed else "NO",
                    "Previous Route": format_path_string(ev.previous_route),
                    "New Route": format_path_string(ev.new_route),
                    "Latency (ms)": f"{lat_before:.1f} → {lat_after:.1f}",
                    "Inspection (ms)": f"{ev.processing_time_seconds * 1000.0:.2f}",
                    "Reroute (ms)": f"{ev.reroute_time_seconds * 1000.0:.2f}",
                    "Status": "UNREACHABLE" if ev.unreachable else "OK",
                }
            )

        df_hist = pd.DataFrame(hist_rows)
        st.dataframe(df_hist, hide_index=True, use_container_width=True)

        # CSV Download Button
        csv_data = df_hist.to_csv(index=False).encode("utf-8")
        st.download_button(
            label="Download Session Event History (CSV)",
            data=csv_data,
            file_name=f"session_history_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv",
        )
