"""
Publication-quality plotting module for network routing evaluation.

Generates seven core figures:
1. Latency comparison across strategies and scenarios.
2. Packet loss comparison across strategies and scenarios.
3. Bottleneck bandwidth comparison across strategies and scenarios.
4. Congestion comparison across strategies and scenarios.
5. Dynamic recovery timeline under sequential network events.
6. ACO convergence curves across iterations.
7. Reachability rate comparison across strategies and scenarios.
"""

from __future__ import annotations

import csv
import os
from pathlib import Path
from typing import Optional

# Ensure matplotlib uses a writable temp cache directory to avoid macOS sandbox permission warnings
os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")

import matplotlib.pyplot as plt
import numpy as np


# ---------------------------------------------------------------------------
# Styling constants
# ---------------------------------------------------------------------------

STRATEGY_COLORS = {
    "dijkstra_latency": "#1f77b4",  # Blue
    "dijkstra_fuzzy": "#ff7f0e",    # Orange
    "aco_fuzzy": "#2ca02c",         # Green
    "adaptive_aco": "#d62728",      # Red
}

STRATEGY_LABELS = {
    "dijkstra_latency": "Dijkstra (Latency)",
    "dijkstra_fuzzy": "Dijkstra (Fuzzy Cost)",
    "aco_fuzzy": "ACO (Fuzzy Cost)",
    "adaptive_aco": "Adaptive ACO",
}

SCENARIO_LABELS = {
    "normal": "Normal",
    "congestion": "Congestion",
    "high_latency": "High Latency",
    "packet_loss": "Packet Loss",
    "link_failure": "Link Failure",
    "dynamic_combined": "Combined",
}


def _read_csv(filepath: Path) -> list[dict]:
    """Helper to read CSV into a list of dictionaries."""
    if not filepath.exists():
        raise FileNotFoundError(f"Required CSV not found: {filepath}")
    with filepath.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


# ---------------------------------------------------------------------------
# 1-4. Grouped Scenario Comparison Plots
# ---------------------------------------------------------------------------

def plot_scenario_metric_comparison(
    summary_rows: list[dict],
    metric_name: str,
    y_label: str,
    title: str,
    output_path: Path,
    use_log: bool = False,
) -> None:
    """
    Generate a grouped bar chart comparing a metric across all scenarios and strategies.
    """
    scenarios = list(SCENARIO_LABELS.keys())
    strategies = [s for s in STRATEGY_LABELS.keys() if any(r["strategy"] == s for r in summary_rows)]

    # Map (scenario, strategy) -> (mean, error)
    data: dict[tuple[str, str], tuple[float, float]] = {}
    for r in summary_rows:
        scen = r["scenario"]
        strat = r["strategy"]
        mean_val = float(r.get(f"{metric_name}_mean", 0.0))
        # Use CI margin or std for error bar if available
        ci_lower = float(r.get(f"{metric_name}_ci95_lower", mean_val))
        ci_upper = float(r.get(f"{metric_name}_ci95_upper", mean_val))
        err = max(0.0, (ci_upper - ci_lower) / 2.0)
        data[(scen, strat)] = (mean_val, err)

    x = np.arange(len(scenarios))
    num_strats = len(strategies)
    width = 0.8 / max(1, num_strats)

    fig, ax = plt.subplots(figsize=(10, 5.5), dpi=300)

    for i, strat in enumerate(strategies):
        offsets = x - 0.4 + (i + 0.5) * width
        means = []
        errors = []
        for scen in scenarios:
            val, err = data.get((scen, strat), (0.0, 0.0))
            means.append(val if np.isfinite(val) else 0.0)
            errors.append(err if np.isfinite(err) else 0.0)

        color = STRATEGY_COLORS.get(strat, "#333333")
        label = STRATEGY_LABELS.get(strat, strat)
        ax.bar(
            offsets,
            means,
            width,
            yerr=errors,
            capsize=3,
            label=label,
            color=color,
            alpha=0.9,
            edgecolor="black",
            linewidth=0.5,
        )

    ax.set_title(title, fontsize=13, fontweight="bold", pad=12)
    ax.set_ylabel(y_label, fontsize=11, fontweight="medium")
    ax.set_xticks(x)
    ax.set_xticklabels([SCENARIO_LABELS.get(s, s) for s in scenarios], fontsize=10)
    ax.legend(frameon=True, facecolor="white", edgecolor="none", fontsize=9, loc="upper right")
    ax.grid(True, linestyle="--", alpha=0.3, axis="y")

    if use_log:
        ax.set_yscale("log")

    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=300)
    plt.close()


# ---------------------------------------------------------------------------
# 5. Dynamic Recovery Timeline Plot
# ---------------------------------------------------------------------------

def plot_dynamic_timeline(
    timeline_rows: list[dict],
    output_path: Path,
) -> None:
    """
    Generate a two-panel visualization of the dynamic event sequence.
    Top: Latency & Congestion before/after each event.
    Bottom: Processing and Recovery Time (ms) with trigger/reroute markers.
    """
    if not timeline_rows:
        return

    steps = [int(r["step"]) for r in timeline_rows]
    event_names = [r["event_name"].replace("_", " ").title() for r in timeline_rows]

    latency_after = [float(r["latency_after_ms"]) for r in timeline_rows]
    congestion_after = [float(r["congestion_after_percent"]) for r in timeline_rows]
    recovery_times = [float(r["processing_time_ms"]) for r in timeline_rows]
    reroute_times = [float(r["reroute_time_ms"]) for r in timeline_rows]

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(11, 7.5), dpi=300, sharex=True)

    # Top panel: Network conditions
    color_lat = "#1f77b4"
    ax1.plot(steps, latency_after, marker="o", color=color_lat, linewidth=2, label="Route Latency (ms)")
    ax1.set_ylabel("Latency (ms)", color=color_lat, fontsize=11, fontweight="medium")
    ax1.tick_params(axis="y", labelcolor=color_lat)
    ax1.grid(True, linestyle="--", alpha=0.3)

    ax1_twin = ax1.twinx()
    color_cong = "#ff7f0e"
    ax1_twin.plot(steps, congestion_after, marker="s", color=color_cong, linewidth=2, linestyle="--", label="Route Congestion (%)")
    ax1_twin.set_ylabel("Congestion (%)", color=color_cong, fontsize=11, fontweight="medium")
    ax1_twin.tick_params(axis="y", labelcolor=color_cong)

    ax1.set_title("Dynamic Event Sequence: Route Telemetry & Adaptive Response", fontsize=13, fontweight="bold", pad=12)

    # Combine legends for top panel
    lines_1, labels_1 = ax1.get_legend_handles_labels()
    lines_2, labels_2 = ax1_twin.get_legend_handles_labels()
    ax1.legend(lines_1 + lines_2, labels_1 + labels_2, loc="upper left", frameon=True, fontsize=9)

    # Bottom panel: Recovery and Reroute Time
    bar_width = 0.4
    ax2.bar(
        [s - bar_width / 2 for s in steps],
        recovery_times,
        width=bar_width,
        color="#2ca02c",
        label="Total Processing Time (ms)",
        alpha=0.85,
    )
    ax2.bar(
        [s + bar_width / 2 for s in steps],
        reroute_times,
        width=bar_width,
        color="#d62728",
        label="ACO Reroute Time (ms)",
        alpha=0.85,
    )

    # Highlight steps where rerouting occurred
    for r in timeline_rows:
        step = int(r["step"])
        if r.get("route_changed") == "True":
            ax2.annotate(
                "Rerouted",
                xy=(step, float(r["processing_time_ms"])),
                xytext=(step, float(r["processing_time_ms"]) + max(recovery_times) * 0.1),
                arrowprops=dict(arrowstyle="->", color="black", lw=1),
                fontsize=8,
                ha="center",
                fontweight="bold",
            )
        elif r.get("unreachable") == "True":
            ax2.annotate(
                "Unreachable",
                xy=(step, 0),
                xytext=(step, max(recovery_times) * 0.15),
                arrowprops=dict(arrowstyle="->", color="red", lw=1),
                fontsize=8,
                ha="center",
                color="red",
                fontweight="bold",
            )

    ax2.set_ylabel("Time (ms)", fontsize=11, fontweight="medium")
    ax2.set_xlabel("Event Step Number", fontsize=11, fontweight="medium")
    ax2.set_xticks(steps)
    ax2.set_xticklabels([f"S{s}: {name}" for s, name in zip(steps, event_names)], rotation=30, ha="right", fontsize=8)
    ax2.grid(True, linestyle="--", alpha=0.3)
    ax2.legend(loc="upper left", frameon=True, fontsize=9)

    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=300)
    plt.close()


# ---------------------------------------------------------------------------
# 6. ACO Convergence Curves Plot
# ---------------------------------------------------------------------------

def plot_aco_convergence(
    convergence_rows: list[dict],
    output_path: Path,
) -> None:
    """
    Plot ACO convergence curves by iteration across scenarios with shaded std dev envelope.
    """
    if not convergence_rows:
        return

    # Group by (scenario, iteration) -> list of best_cost
    grouped: dict[tuple[str, int], list[float]] = {}
    scenarios_present: list[str] = []

    for r in convergence_rows:
        scen = r["scenario"]
        iter_num = int(r["iteration"])
        cost = float(r["best_cost"])
        if scen not in scenarios_present:
            scenarios_present.append(scen)
        grouped.setdefault((scen, iter_num), []).append(cost)

    fig, ax = plt.subplots(figsize=(9, 5.5), dpi=300)

    scenario_colors = {
        "normal": "#1f77b4",
        "congestion": "#ff7f0e",
        "high_latency": "#2ca02c",
        "packet_loss": "#d62728",
        "link_failure": "#9467bd",
        "dynamic_combined": "#8c564b",
    }

    for scen in scenarios_present:
        iterations = sorted(list({k[1] for k in grouped.keys() if k[0] == scen}))
        means = []
        stds = []
        for it in iterations:
            vals = grouped[(scen, it)]
            means.append(np.mean(vals))
            stds.append(np.std(vals))

        means = np.array(means)
        stds = np.array(stds)
        color = scenario_colors.get(scen, "#333333")
        label = SCENARIO_LABELS.get(scen, scen)

        ax.plot(iterations, means, label=label, color=color, linewidth=2)
        ax.fill_between(iterations, means - stds, means + stds, color=color, alpha=0.15)

    ax.set_title("ACO Optimization Convergence Across Network Scenarios", fontsize=13, fontweight="bold", pad=12)
    ax.set_xlabel("Iteration", fontsize=11, fontweight="medium")
    ax.set_ylabel("Global Best Route Cost (Fuzzy Metric)", fontsize=11, fontweight="medium")
    ax.grid(True, linestyle="--", alpha=0.3)
    ax.legend(frameon=True, fontsize=9, loc="upper right")

    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=300)
    plt.close()


# ---------------------------------------------------------------------------
# 7. Reachability Comparison Plot
# ---------------------------------------------------------------------------

def plot_reachability_comparison(
    summary_rows: list[dict],
    output_path: Path,
) -> None:
    """
    Plot reachable route rate (0-100%) across all strategies and scenarios.
    """
    scenarios = list(SCENARIO_LABELS.keys())
    strategies = [s for s in STRATEGY_LABELS.keys() if any(r["strategy"] == s for r in summary_rows)]

    # Map (scenario, strategy) -> reachable_rate
    rates: dict[tuple[str, str], float] = {}
    for r in summary_rows:
        scen = r["scenario"]
        strat = r["strategy"]
        rate = float(r.get("reachable_rate", 1.0)) * 100.0
        rates[(scen, strat)] = rate

    x = np.arange(len(scenarios))
    num_strats = len(strategies)
    width = 0.8 / max(1, num_strats)

    fig, ax = plt.subplots(figsize=(10, 5), dpi=300)

    for i, strat in enumerate(strategies):
        offsets = x - 0.4 + (i + 0.5) * width
        vals = [rates.get((scen, strat), 100.0) for scen in scenarios]
        color = STRATEGY_COLORS.get(strat, "#333333")
        label = STRATEGY_LABELS.get(strat, strat)
        ax.bar(
            offsets,
            vals,
            width,
            label=label,
            color=color,
            alpha=0.9,
            edgecolor="black",
            linewidth=0.5,
        )

    ax.set_title("Route Reachability Rate Across Scenarios", fontsize=13, fontweight="bold", pad=12)
    ax.set_ylabel("Reachability Rate (%)", fontsize=11, fontweight="medium")
    ax.set_ylim(0, 110)
    ax.set_xticks(x)
    ax.set_xticklabels([SCENARIO_LABELS.get(s, s) for s in scenarios], fontsize=10)
    ax.legend(frameon=True, fontsize=9, loc="lower right")
    ax.grid(True, linestyle="--", alpha=0.3, axis="y")

    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=300)
    plt.close()


# ---------------------------------------------------------------------------
# Master generator
# ---------------------------------------------------------------------------

def generate_all_plots(
    summary_file: Path,
    detailed_file: Path,
    convergence_file: Path,
    dynamic_file: Path,
    plots_dir: Path,
) -> list[Path]:
    """
    Generate all seven publication-quality figures and return their file paths.
    """
    plots_dir.mkdir(parents=True, exist_ok=True)
    generated: list[Path] = []

    summary_rows = _read_csv(summary_file)
    convergence_rows = _read_csv(convergence_file)
    dynamic_rows = _read_csv(dynamic_file) if dynamic_file.exists() else []

    # 1. Latency
    p1 = plots_dir / "latency_comparison.png"
    plot_scenario_metric_comparison(
        summary_rows=summary_rows,
        metric_name="latency_ms",
        y_label="Latency (ms)",
        title="End-to-End Route Latency across Network Scenarios",
        output_path=p1,
    )
    generated.append(p1)

    # 2. Packet Loss
    p2 = plots_dir / "packet_loss_comparison.png"
    plot_scenario_metric_comparison(
        summary_rows=summary_rows,
        metric_name="packet_loss_percent",
        y_label="Packet Loss (%)",
        title="End-to-End Packet Loss across Network Scenarios",
        output_path=p2,
    )
    generated.append(p2)

    # 3. Bandwidth
    p3 = plots_dir / "bandwidth_comparison.png"
    plot_scenario_metric_comparison(
        summary_rows=summary_rows,
        metric_name="bandwidth_mbps",
        y_label="Bottleneck Bandwidth (Mbps)",
        title="Bottleneck Bandwidth across Network Scenarios",
        output_path=p3,
    )
    generated.append(p3)

    # 4. Congestion
    p4 = plots_dir / "congestion_comparison.png"
    plot_scenario_metric_comparison(
        summary_rows=summary_rows,
        metric_name="congestion_percent",
        y_label="Average Route Congestion (%)",
        title="Average Route Congestion across Network Scenarios",
        output_path=p4,
    )
    generated.append(p4)

    # 5. Dynamic timeline
    if dynamic_rows:
        p5 = plots_dir / "dynamic_recovery_timeline.png"
        plot_dynamic_timeline(
            timeline_rows=dynamic_rows,
            output_path=p5,
        )
        generated.append(p5)

    # 6. ACO Convergence
    p6 = plots_dir / "aco_convergence_curves.png"
    plot_aco_convergence(
        convergence_rows=convergence_rows,
        output_path=p6,
    )
    generated.append(p6)

    # 7. Reachability
    p7 = plots_dir / "reachability_comparison.png"
    plot_reachability_comparison(
        summary_rows=summary_rows,
        output_path=p7,
    )
    generated.append(p7)

    return generated
