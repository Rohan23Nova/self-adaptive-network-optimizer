"""
Fuzzy membership functions for network link parameters.

Inference model:
    Mamdani fuzzy inference

Input variables:
    - latency: 0-300 ms
    - packet loss: 0-15 %
    - bandwidth: 0-100 Mbps
    - congestion: 0-100 %

Each input has three linguistic levels:
    LOW, MEDIUM, HIGH

The membership functions use triangular and trapezoidal shapes.
"""

from __future__ import annotations

import numpy as np
import skfuzzy as fuzz


# ---------------------------------------------------------------------------
# Input universes
# ---------------------------------------------------------------------------

LATENCY_UNIVERSE = np.linspace(0, 300, 301)
PACKET_LOSS_UNIVERSE = np.linspace(0, 15, 151)
BANDWIDTH_UNIVERSE = np.linspace(0, 100, 101)
CONGESTION_UNIVERSE = np.linspace(0, 100, 101)

# Output universe
QUALITY_UNIVERSE = np.linspace(0, 1, 101)


# ---------------------------------------------------------------------------
# Latency membership functions
# Lower latency is better.
# ---------------------------------------------------------------------------

LATENCY_LOW = fuzz.trapmf(
    LATENCY_UNIVERSE,
    [0, 0, 30, 80],
)

LATENCY_MEDIUM = fuzz.trimf(
    LATENCY_UNIVERSE,
    [50, 120, 190],
)

LATENCY_HIGH = fuzz.trapmf(
    LATENCY_UNIVERSE,
    [150, 220, 300, 300],
)


# ---------------------------------------------------------------------------
# Packet-loss membership functions
# Lower packet loss is better.
# ---------------------------------------------------------------------------

PACKET_LOSS_LOW = fuzz.trapmf(
    PACKET_LOSS_UNIVERSE,
    [0, 0, 1, 3],
)

PACKET_LOSS_MEDIUM = fuzz.trimf(
    PACKET_LOSS_UNIVERSE,
    [2, 6, 10],
)

PACKET_LOSS_HIGH = fuzz.trapmf(
    PACKET_LOSS_UNIVERSE,
    [8, 12, 15, 15],
)


# ---------------------------------------------------------------------------
# Bandwidth membership functions
# Higher bandwidth is better.
# ---------------------------------------------------------------------------

BANDWIDTH_LOW = fuzz.trapmf(
    BANDWIDTH_UNIVERSE,
    [0, 0, 20, 40],
)

BANDWIDTH_MEDIUM = fuzz.trimf(
    BANDWIDTH_UNIVERSE,
    [25, 50, 75],
)

BANDWIDTH_HIGH = fuzz.trapmf(
    BANDWIDTH_UNIVERSE,
    [60, 80, 100, 100],
)


# ---------------------------------------------------------------------------
# Congestion membership functions
# Lower congestion is better.
# ---------------------------------------------------------------------------

CONGESTION_LOW = fuzz.trapmf(
    CONGESTION_UNIVERSE,
    [0, 0, 20, 40],
)

CONGESTION_MEDIUM = fuzz.trimf(
    CONGESTION_UNIVERSE,
    [25, 50, 75],
)

CONGESTION_HIGH = fuzz.trapmf(
    CONGESTION_UNIVERSE,
    [60, 80, 100, 100],
)


# ---------------------------------------------------------------------------
# Output quality membership functions
# ---------------------------------------------------------------------------

QUALITY_POOR = fuzz.trapmf(
    QUALITY_UNIVERSE,
    [0.0, 0.0, 0.20, 0.40],
)

QUALITY_AVERAGE = fuzz.trimf(
    QUALITY_UNIVERSE,
    [0.25, 0.50, 0.75],
)

QUALITY_GOOD = fuzz.trapmf(
    QUALITY_UNIVERSE,
    [0.60, 0.80, 1.0, 1.0],
)


def plot_membership_functions() -> dict:
    """
    Return all membership functions in a form convenient for plotting.

    Returns
    -------
    dict
        Mapping containing each universe and its associated membership sets.
    """

    return {
        "latency": {
            "universe": LATENCY_UNIVERSE,
            "low": LATENCY_LOW,
            "medium": LATENCY_MEDIUM,
            "high": LATENCY_HIGH,
        },
        "packet_loss": {
            "universe": PACKET_LOSS_UNIVERSE,
            "low": PACKET_LOSS_LOW,
            "medium": PACKET_LOSS_MEDIUM,
            "high": PACKET_LOSS_HIGH,
        },
        "bandwidth": {
            "universe": BANDWIDTH_UNIVERSE,
            "low": BANDWIDTH_LOW,
            "medium": BANDWIDTH_MEDIUM,
            "high": BANDWIDTH_HIGH,
        },
        "congestion": {
            "universe": CONGESTION_UNIVERSE,
            "low": CONGESTION_LOW,
            "medium": CONGESTION_MEDIUM,
            "high": CONGESTION_HIGH,
        },
        "quality": {
            "universe": QUALITY_UNIVERSE,
            "poor": QUALITY_POOR,
            "average": QUALITY_AVERAGE,
            "good": QUALITY_GOOD,
        },
    }
