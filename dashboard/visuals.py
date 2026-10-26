"""
Interactive visualization and data loading utilities for the Streamlit dashboard.

Implements Plotly-based network topology rendering, strategy comparison charts,
and experimental result visualizers.
"""

from __future__ import annotations

import csv
import json
import math
import os
from pathlib import Path
from typing import Any, Optional

import networkx as nx
import numpy as np
import pandas as pd
import plotly.graph_objects as go

# Fixed 2D layout coordinates for the 8-node demo topology for consistent rendering
DEMO_NODE_POSITIONS = {
    0: (0.05, 0.50),   # Source (far left)
    1: (0.30, 0.85),   # Upper tier
    2: (0.30, 0.50),   # Mid-left tier
    3: (0.30, 0.15),   # Lower tier
    4: (0.65, 0.80),   # Upper-mid tier
    5: (0.65, 0.25),   # Lower-mid tier
    6: (0.85, 0.65),   # Pre-destination upper
    7: (0.95, 0.45),   # Destination (far right)
}

# Theme Palette (Dark Navy & Technical Dashboard Aesthetic)
THEME_BG = "#0B0F19"
THEME_CARD_BG = "#111827"
THEME_BORDER = "#1E293B"
COLOR_SRC = "#10B981"       # Emerald Green for Source
COLOR_DST = "#8B5CF6"       # Violet for Destination
COLOR_ROUTE = "#06B6D4"     # Bright Cyan for Active Route
COLOR_DISABLED = "#EF4444"  # Coral Red for Disabled / Failed
COLOR_ACTIVE_EDGE = "#334155" # Steel Slate for Normal Edges
COLOR_NODE = "#1E293B"      # Dark Slate for Normal Routers
COLOR_TEXT = "#F8FAFC"      # Off-white Text
COLOR_MUTED = "#94A3B8"     # Muted Slate Text

STRATEGY_COLORS = {
    "dijkstra_latency": "#38BDF8",  # Sky Blue
    "dijkstra_fuzzy": "#FB923C",    # Amber / Orange
    "aco_fuzzy": "#4ADE80",         # Green
    "adaptive_aco": "#F43F5E",      # Rose Red
}

STRATEGY_NAMES = {
    "dijkstra_latency": "Dijkstra (Latency)",
    "dijkstra_fuzzy": "Dijkstra (Fuzzy Cost)",
    "aco_fuzzy": "ACO (Fuzzy Cost)",
    "adaptive_aco": "Adaptive ACO",
}


def get_node_positions(graph: nx.Graph, is_demo: bool = True) -> dict[int, tuple[float, float]]:
    """
    Get deterministic 2D layout coordinates for graph nodes.
    Uses fixed positions for the 8-node demo graph and spring_layout for others.
    """
    if is_demo and set(graph.nodes) == set(range(8)):
        return dict(DEMO_NODE_POSITIONS)

    # Use deterministic spring layout for larger or custom graphs
    pos = nx.spring_layout(graph, seed=42, k=0.45, iterations=60)
    return {node: (float(coords[0]), float(coords[1])) for node, coords in pos.items()}


def build_network_figure(
    graph: nx.Graph,
    current_route: list[int],
    source: int,
    destination: int,
    positions: dict[int, tuple[float, float]],
    link_cache: Optional[dict] = None,
) -> go.Figure:
    """
    Construct an interactive Plotly figure visualizing network topology,
    active vs disabled links/routers, and highlighted route path.
    """
    fig = go.Figure()

    route_edge_set = set()
    if len(current_route) >= 2:
        for u, v in zip(current_route, current_route[1:]):
            route_edge_set.add((min(u, v), max(u, v)))

    # 1. Edge traces: Separate active non-route, route, and disabled edges
    edge_x_normal, edge_y_normal = [], []
    edge_x_route, edge_y_route = [], []
    edge_x_disabled, edge_y_disabled = [], []

    # Edge hover marker coordinates and text
    mid_x, mid_y, mid_text = [], [], []

    for u, v, data in graph.edges(data=True):
        if u not in positions or v not in positions:
            continue

        x0, y0 = positions[u]
        x1, y1 = positions[v]
        xm, ym = (x0 + x1) / 2.0, (y0 + y1) / 2.0

        is_link_enabled = data.get("enabled", True)
        u_enabled = graph.nodes[u].get("enabled", True)
        v_enabled = graph.nodes[v].get("enabled", True)
        is_active = is_link_enabled and u_enabled and v_enabled

        edge_key = (min(u, v), max(u, v))
        is_on_route = edge_key in route_edge_set

        # Hover text data
        lat = data.get("latency", 0.0)
        loss = data.get("packet_loss", 0.0)
        bw = data.get("bandwidth", 0.0)
        cong = data.get("congestion", 0.0)

        quality_str = "N/A"
        cost_str = "N/A"
        if link_cache and edge_key in link_cache:
            q_val = link_cache[edge_key].get("quality")
            c_val = link_cache[edge_key].get("cost")
            if q_val is not None:
                quality_str = f"{q_val:.3f}"
            if c_val is not None:
                cost_str = f"{c_val:.4f}"

        status_str = "ACTIVE" if is_active else "DISABLED / FAILED"
        route_status = " ⭐ ON CURRENT ROUTE" if is_on_route else ""

        hover_info = (
            f"<b>Link ({u} ↔ {v})</b>{route_status}<br>"
            f"Status: <b>{status_str}</b><br>"
            f"Latency: <b>{lat:.1f} ms</b><br>"
            f"Packet Loss: <b>{loss:.2f}%</b><br>"
            f"Bandwidth: <b>{bw:.1f} Mbps</b><br>"
            f"Congestion: <b>{cong:.1f}%</b><br>"
            f"Fuzzy Quality: <b>{quality_str}</b><br>"
            f"Fuzzy Cost: <b>{cost_str}</b>"
        )
        mid_x.append(xm)
        mid_y.append(ym)
        mid_text.append(hover_info)

        if not is_active:
            edge_x_disabled.extend([x0, x1, None])
            edge_y_disabled.extend([y0, y1, None])
        elif is_on_route:
            edge_x_route.extend([x0, x1, None])
            edge_y_route.extend([y0, y1, None])
        else:
            edge_x_normal.extend([x0, x1, None])
            edge_y_normal.extend([y0, y1, None])

    # Add Normal Inactive/Disabled Edges
    if edge_x_disabled:
        fig.add_trace(
            go.Scatter(
                x=edge_x_disabled,
                y=edge_y_disabled,
                mode="lines",
                line=dict(width=2.0, color=COLOR_DISABLED, dash="dot"),
                hoverinfo="none",
                name="Disabled Link",
                showlegend=True,
            )
        )

    # Add Active Non-Route Edges
    if edge_x_normal:
        fig.add_trace(
            go.Scatter(
                x=edge_x_normal,
                y=edge_y_normal,
                mode="lines",
                line=dict(width=2.0, color=COLOR_ACTIVE_EDGE),
                hoverinfo="none",
                name="Active Link",
                showlegend=True,
            )
        )

    # Add Active Route Edges (Highlighted)
    if edge_x_route:
        fig.add_trace(
            go.Scatter(
                x=edge_x_route,
                y=edge_y_route,
                mode="lines",
                line=dict(width=5.0, color=COLOR_ROUTE),
                hoverinfo="none",
                name="Active Route",
                showlegend=True,
            )
        )

    # Add Edge Info Hover Points
    if mid_x:
        fig.add_trace(
            go.Scatter(
                x=mid_x,
                y=mid_y,
                mode="markers",
                marker=dict(size=8, color="#475569", opacity=0.3),
                text=mid_text,
                hoverinfo="text",
                name="Link Details",
                showlegend=False,
            )
        )

    # 2. Node traces
    node_x, node_y, node_color, node_size, node_text, node_hover = [], [], [], [], [], []
    route_set = set(current_route)

    for node in graph.nodes():
        if node not in positions:
            continue
        x, y = positions[node]
        node_x.append(x)
        node_y.append(y)

        is_enabled = graph.nodes[node].get("enabled", True)
        incident_count = len(list(graph.neighbors(node)))

        if not is_enabled:
            node_color.append(COLOR_DISABLED)
            node_size.append(34)
            node_text.append(f"X ({node})")
            role_desc = "DISABLED ROUTER"
        elif node == source:
            node_color.append(COLOR_SRC)
            node_size.append(38)
            node_text.append(f"SRC ({node})")
            role_desc = "SOURCE ROUTER"
        elif node == destination:
            node_color.append(COLOR_DST)
            node_size.append(38)
            node_text.append(f"DST ({node})")
            role_desc = "DESTINATION ROUTER"
        elif node in route_set:
            node_color.append(COLOR_ROUTE)
            node_size.append(34)
            node_text.append(str(node))
            role_desc = "INTERMEDIATE ROUTE HOP"
        else:
            node_color.append(COLOR_NODE)
            node_size.append(30)
            node_text.append(str(node))
            role_desc = "ROUTER"

        h_text = (
            f"<b>Router {node}</b><br>"
            f"Role: <b>{role_desc}</b><br>"
            f"Status: <b>{'ENABLED' if is_enabled else 'DISABLED / FAILED'}</b><br>"
            f"Connected Links: <b>{incident_count}</b>"
        )
        node_hover.append(h_text)

    fig.add_trace(
        go.Scatter(
            x=node_x,
            y=node_y,
            mode="markers+text",
            text=node_text,
            textposition="middle center",
            textfont=dict(color=COLOR_TEXT, size=11, family="Inter, system-ui, sans-serif"),
            hovertext=node_hover,
            hoverinfo="text",
            marker=dict(
                size=node_size,
                color=node_color,
                line=dict(width=2.5, color="#F8FAFC"),
            ),
            name="Routers",
            showlegend=False,
        )
    )

    # Layout styling
    fig.update_layout(
        paper_bgcolor=THEME_BG,
        plot_bgcolor=THEME_BG,
        showlegend=True,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1.0,
            font=dict(color=COLOR_MUTED, size=11),
            bgcolor="rgba(0,0,0,0)",
        ),
        margin=dict(l=20, r=20, t=30, b=20),
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        height=520,
    )

    return fig


def build_strategy_comparison_chart(comparison_data: list[dict]) -> go.Figure:
    """
    Construct a side-by-side bar chart comparing all 4 strategies
    on the current network across key QoS metrics.
    """
    fig = go.Figure()

    metrics = [
        ("latency_ms", "Latency (ms)"),
        ("packet_loss_percent", "Packet Loss (%)"),
        ("bandwidth_mbps", "Bottleneck BW (Mbps)"),
        ("congestion_percent", "Avg Congestion (%)"),
    ]

    metric_names = [m[1] for m in metrics]

    for item in comparison_data:
        strat = item["strategy"]
        label = item["strategy_label"]
        color = STRATEGY_COLORS.get(strat, "#94A3B8")

        vals = []
        for m_key, _ in metrics:
            val = item.get(m_key, 0.0)
            vals.append(val if math.isfinite(val) else 0.0)

        fig.add_trace(
            go.Bar(
                name=label,
                x=metric_names,
                y=vals,
                marker_color=color,
                text=[f"{v:.1f}" for v in vals],
                textposition="auto",
            )
        )

    fig.update_layout(
        barmode="group",
        paper_bgcolor=THEME_CARD_BG,
        plot_bgcolor=THEME_CARD_BG,
        font=dict(color=COLOR_TEXT, family="Inter, system-ui, sans-serif"),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.05,
            xanchor="center",
            x=0.5,
            bgcolor="rgba(0,0,0,0)",
        ),
        margin=dict(l=40, r=20, t=40, b=30),
        yaxis=dict(
            gridcolor=THEME_BORDER,
            zerolinecolor=THEME_BORDER,
        ),
        xaxis=dict(gridcolor=THEME_BORDER),
        height=380,
    )

    return fig


def build_timeline_figure(dynamic_rows: list[dict]) -> go.Figure:
    """
    Build a dual-axis line/scatter chart showing the 10-step sequential dynamic timeline.
    Left Axis: End-to-end Latency (ms).
    Right Axis: Event Processing & Rerouting Latency (ms).
    """
    fig = go.Figure()

    if not dynamic_rows:
        return fig

    steps = [int(r.get("step", i + 1)) for i, r in enumerate(dynamic_rows)]
    event_labels = [r.get("event_name", f"Step {s}") for s, r in zip(steps, dynamic_rows)]

    latency_vals = []
    for r in dynamic_rows:
        v = float(r.get("latency_after_ms", r.get("latency_ms", 0.0)))
        latency_vals.append(v if math.isfinite(v) else None)

    proc_times = [float(r.get("processing_time_ms", 0.0)) for r in dynamic_rows]
    reroute_times = [float(r.get("reroute_time_ms", 0.0)) for r in dynamic_rows]

    # Latency curve (Left Axis)
    fig.add_trace(
        go.Scatter(
            x=steps,
            y=latency_vals,
            mode="lines+markers",
            name="Route Latency (ms)",
            line=dict(color=COLOR_ROUTE, width=3),
            marker=dict(size=8, color=COLOR_ROUTE),
            yaxis="y1",
            text=[f"Event: {e}<br>Latency: {l} ms" for e, l in zip(event_labels, latency_vals)],
            hoverinfo="text",
        )
    )

    # Rerouting Time (Right Axis)
    fig.add_trace(
        go.Bar(
            x=steps,
            y=reroute_times,
            name="ACO Reroute Time (ms)",
            marker_color=COLOR_DST,
            opacity=0.7,
            yaxis="y2",
            text=[f"{t:.1f} ms" for t in reroute_times],
            hoverinfo="text",
        )
    )

    # Processing / Inspection Time (Right Axis)
    fig.add_trace(
        go.Bar(
            x=steps,
            y=proc_times,
            name="Event Inspection Time (ms)",
            marker_color=COLOR_SRC,
            opacity=0.7,
            yaxis="y2",
            text=[f"{t:.2f} ms" for t in proc_times],
            hoverinfo="text",
        )
    )

    fig.update_layout(
        paper_bgcolor=THEME_CARD_BG,
        plot_bgcolor=THEME_CARD_BG,
        font=dict(color=COLOR_TEXT, family="Inter, system-ui, sans-serif"),
        xaxis=dict(
            tickmode="array",
            tickvals=steps,
            ticktext=[f"#{s}: {e.replace('_', ' ').title()}" for s, e in zip(steps, event_labels)],
            tickangle=-25,
            gridcolor=THEME_BORDER,
        ),
        yaxis=dict(
            title=dict(text="Route Latency (ms)", font=dict(color=COLOR_ROUTE)),
            tickfont=dict(color=COLOR_ROUTE),
            gridcolor=THEME_BORDER,
        ),
        yaxis2=dict(
            title=dict(text="Processing Time (ms)", font=dict(color="#A78BFA")),
            tickfont=dict(color="#A78BFA"),
            overlaying="y",
            side="right",
            showgrid=False,
        ),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.05,
            xanchor="center",
            x=0.5,
            bgcolor="rgba(0,0,0,0)",
        ),
        barmode="group",
        margin=dict(l=40, r=40, t=40, b=80),
        height=420,
    )

    return fig


def build_convergence_figure(convergence_rows: list[dict], scenario: str = "normal") -> go.Figure:
    """
    Construct ACO iteration convergence plot showing best cost and mean cost.
    """
    fig = go.Figure()

    filtered = [r for r in convergence_rows if r.get("scenario") == scenario]
    if not filtered:
        filtered = convergence_rows

    if not filtered:
        return fig

    # Group by iteration
    by_iter: dict[int, list[float]] = {}
    for r in filtered:
        it = int(r.get("iteration", 0))
        cost = float(r.get("best_cost", 0.0))
        if math.isfinite(cost):
            by_iter.setdefault(it, []).append(cost)

    iters = sorted(by_iter.keys())
    means = [float(np.mean(by_iter[it])) for it in iters]
    mins = [float(np.min(by_iter[it])) for it in iters]
    maxs = [float(np.max(by_iter[it])) for it in iters]

    # Upper bound
    fig.add_trace(
        go.Scatter(
            x=iters,
            y=maxs,
            mode="lines",
            line=dict(width=0),
            showlegend=False,
            hoverinfo="none",
        )
    )

    # Shaded band
    fig.add_trace(
        go.Scatter(
            x=iters,
            y=mins,
            mode="lines",
            line=dict(width=0),
            fill="tonexty",
            fillcolor="rgba(74, 222, 128, 0.15)",
            name="Min-Max Envelope",
        )
    )

    # Mean curve
    fig.add_trace(
        go.Scatter(
            x=iters,
            y=means,
            mode="lines+markers",
            name="Mean Best Cost",
            line=dict(color="#4ADE80", width=3),
            marker=dict(size=5, color="#4ADE80"),
        )
    )

    fig.update_layout(
        paper_bgcolor=THEME_CARD_BG,
        plot_bgcolor=THEME_CARD_BG,
        font=dict(color=COLOR_TEXT, family="Inter, system-ui, sans-serif"),
        xaxis=dict(title="ACO Iteration", gridcolor=THEME_BORDER),
        yaxis=dict(title="Fuzzy Composite Routing Cost", gridcolor=THEME_BORDER),
        margin=dict(l=40, r=20, t=30, b=40),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="center",
            x=0.5,
            bgcolor="rgba(0,0,0,0)",
        ),
        height=380,
    )

    return fig


def build_scenario_metric_figure(
    summary_rows: list[dict],
    metric_key: str,
    y_title: str,
    chart_title: str,
) -> go.Figure:
    """
    Construct a grouped bar chart comparing a metric across all 6 scenarios and strategies.
    """
    fig = go.Figure()

    scenarios = ["normal", "congestion", "high_latency", "packet_loss", "link_failure", "dynamic_combined"]
    strategies = ["dijkstra_latency", "dijkstra_fuzzy", "aco_fuzzy", "adaptive_aco"]

    # Map (scenario, strategy) -> mean_value
    data_map: dict[tuple[str, str], float] = {}
    err_map: dict[tuple[str, str], float] = {}

    for r in summary_rows:
        scen = r.get("scenario")
        strat = r.get("strategy")
        if scen and strat:
            val = float(r.get(f"{metric_key}_mean", r.get(metric_key, 0.0)))
            ci_low = float(r.get(f"{metric_key}_ci95_lower", val))
            ci_high = float(r.get(f"{metric_key}_ci95_upper", val))
            err = max(0.0, (ci_high - ci_low) / 2.0)
            data_map[(scen, strat)] = val if math.isfinite(val) else 0.0
            err_map[(scen, strat)] = err if math.isfinite(err) else 0.0

    scenario_labels = [s.replace("_", " ").title() for s in scenarios]

    for strat in strategies:
        strat_name = STRATEGY_NAMES.get(strat, strat)
        color = STRATEGY_COLORS.get(strat, "#94A3B8")

        vals = [data_map.get((s, strat), 0.0) for s in scenarios]
        errs = [err_map.get((s, strat), 0.0) for s in scenarios]

        fig.add_trace(
            go.Bar(
                name=strat_name,
                x=scenario_labels,
                y=vals,
                error_y=dict(type="data", array=errs, visible=True),
                marker_color=color,
            )
        )

    fig.update_layout(
        title=dict(text=chart_title, font=dict(size=14, color=COLOR_TEXT)),
        barmode="group",
        paper_bgcolor=THEME_CARD_BG,
        plot_bgcolor=THEME_CARD_BG,
        font=dict(color=COLOR_TEXT, family="Inter, system-ui, sans-serif"),
        xaxis=dict(gridcolor=THEME_BORDER),
        yaxis=dict(title=y_title, gridcolor=THEME_BORDER),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.05,
            xanchor="center",
            x=0.5,
            bgcolor="rgba(0,0,0,0)",
        ),
        margin=dict(l=40, r=20, t=50, b=40),
        height=380,
    )

    return fig


def load_experiment_results(results_dir: Path) -> dict[str, Any]:
    """
    Safely load precomputed experimental results from results/ directory.
    Returns dictionary with parsed CSVs and metadata JSON.
    Returns empty structures gracefully if files are missing or malformed.
    """
    out: dict[str, Any] = {
        "summary_rows": [],
        "detailed_rows": [],
        "dynamic_rows": [],
        "convergence_rows": [],
        "metadata": None,
        "loaded": False,
        "error": None,
    }

    try:
        if not results_dir.exists():
            out["error"] = f"Results directory '{results_dir}' does not exist."
            return out

        summary_file = results_dir / "summary_results.csv"
        detailed_file = results_dir / "detailed_results.csv"
        dynamic_file = results_dir / "dynamic_timeline.csv"
        convergence_file = results_dir / "aco_convergence.csv"
        metadata_file = results_dir / "experiment_metadata.json"

        if summary_file.exists():
            with summary_file.open("r", encoding="utf-8") as f:
                out["summary_rows"] = list(csv.DictReader(f))

        if detailed_file.exists():
            with detailed_file.open("r", encoding="utf-8") as f:
                out["detailed_rows"] = list(csv.DictReader(f))

        if dynamic_file.exists():
            with dynamic_file.open("r", encoding="utf-8") as f:
                out["dynamic_rows"] = list(csv.DictReader(f))

        if convergence_file.exists():
            with convergence_file.open("r", encoding="utf-8") as f:
                out["convergence_rows"] = list(csv.DictReader(f))

        if metadata_file.exists():
            with metadata_file.open("r", encoding="utf-8") as f:
                out["metadata"] = json.load(f)

        if out["summary_rows"]:
            out["loaded"] = True
        else:
            out["error"] = "Summary CSV is empty or not found."

    except Exception as e:
        out["error"] = f"Error reading results: {e}"

    return out


def format_path_string(path: list[int]) -> str:
    """Format path list into readable string e.g. '0 → 1 → 4 → 6 → 7'."""
    if not path:
        return "None (Unreachable)"
    return " → ".join(str(n) for n in path)
