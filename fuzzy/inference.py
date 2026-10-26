"""
Mamdani fuzzy inference engine for network link quality.

The system evaluates:

    latency
    packet loss
    bandwidth
    congestion

and produces a link-quality score in [0, 1].

Inference type:
    Mamdani

Defuzzification:
    Centroid

The fuzzy quality is explicitly converted into routing cost by
quality_to_cost(). Routing modules must use that function rather
than independently interpreting quality values.
"""

from __future__ import annotations

import numpy as np
import skfuzzy as fuzz

from fuzzy.membership import (
    BANDWIDTH_HIGH,
    BANDWIDTH_LOW,
    BANDWIDTH_MEDIUM,
    BANDWIDTH_UNIVERSE,
    CONGESTION_HIGH,
    CONGESTION_LOW,
    CONGESTION_MEDIUM,
    CONGESTION_UNIVERSE,
    LATENCY_HIGH,
    LATENCY_LOW,
    LATENCY_MEDIUM,
    LATENCY_UNIVERSE,
    PACKET_LOSS_HIGH,
    PACKET_LOSS_LOW,
    PACKET_LOSS_MEDIUM,
    PACKET_LOSS_UNIVERSE,
    QUALITY_AVERAGE,
    QUALITY_GOOD,
    QUALITY_POOR,
    QUALITY_UNIVERSE,
)


EPSILON = 1e-6


def _membership_degree(
    value: float,
    universe: np.ndarray,
    membership_function: np.ndarray,
) -> float:
    """
    Calculate the membership degree of a crisp value.

    The value is clipped to the valid universe range.
    """

    value = float(np.clip(value, universe[0], universe[-1]))

    return float(
        fuzz.interp_membership(
            universe,
            membership_function,
            value,
        )
    )


def _fuzzy_memberships(
    latency: float,
    packet_loss: float,
    bandwidth: float,
    congestion: float,
) -> dict[str, dict[str, float]]:
    """Calculate all input membership degrees."""

    return {
        "latency": {
            "low": _membership_degree(
                latency,
                LATENCY_UNIVERSE,
                LATENCY_LOW,
            ),
            "medium": _membership_degree(
                latency,
                LATENCY_UNIVERSE,
                LATENCY_MEDIUM,
            ),
            "high": _membership_degree(
                latency,
                LATENCY_UNIVERSE,
                LATENCY_HIGH,
            ),
        },
        "packet_loss": {
            "low": _membership_degree(
                packet_loss,
                PACKET_LOSS_UNIVERSE,
                PACKET_LOSS_LOW,
            ),
            "medium": _membership_degree(
                packet_loss,
                PACKET_LOSS_UNIVERSE,
                PACKET_LOSS_MEDIUM,
            ),
            "high": _membership_degree(
                packet_loss,
                PACKET_LOSS_UNIVERSE,
                PACKET_LOSS_HIGH,
            ),
        },
        "bandwidth": {
            "low": _membership_degree(
                bandwidth,
                BANDWIDTH_UNIVERSE,
                BANDWIDTH_LOW,
            ),
            "medium": _membership_degree(
                bandwidth,
                BANDWIDTH_UNIVERSE,
                BANDWIDTH_MEDIUM,
            ),
            "high": _membership_degree(
                bandwidth,
                BANDWIDTH_UNIVERSE,
                BANDWIDTH_HIGH,
            ),
        },
        "congestion": {
            "low": _membership_degree(
                congestion,
                CONGESTION_UNIVERSE,
                CONGESTION_LOW,
            ),
            "medium": _membership_degree(
                congestion,
                CONGESTION_UNIVERSE,
                CONGESTION_MEDIUM,
            ),
            "high": _membership_degree(
                congestion,
                CONGESTION_UNIVERSE,
                CONGESTION_HIGH,
            ),
        },
    }


def _apply_rules(
    memberships: dict[str, dict[str, float]],
) -> np.ndarray:
    """
    Apply the documented Mamdani rule base.

    Rule structure:

        IF input conditions THEN quality = output_set

    AND is implemented using the minimum operator.

    OR is implemented using the maximum operator.

    The selected rule strengths are accumulated using maximum
    aggregation.
    """

    quality = np.zeros_like(QUALITY_UNIVERSE)

    l = memberships["latency"]
    p = memberships["packet_loss"]
    b = memberships["bandwidth"]
    c = memberships["congestion"]

    def apply_rule(strength: float, output_set: np.ndarray) -> None:
        nonlocal quality

        clipped_output = np.fmin(strength, output_set)
        quality = np.fmax(quality, clipped_output)

    # -----------------------------------------------------------------------
    # GOOD CONDITIONS
    # -----------------------------------------------------------------------

    # Rule 1:
    # Low latency AND low packet loss AND high bandwidth AND low congestion
    # -> GOOD
    apply_rule(
        min(l["low"], p["low"], b["high"], c["low"]),
        QUALITY_GOOD,
    )

    # Rule 2:
    # Low latency AND low packet loss AND high bandwidth AND medium congestion
    # -> GOOD
    apply_rule(
        min(l["low"], p["low"], b["high"], c["medium"]),
        QUALITY_GOOD,
    )

    # Rule 3:
    # Low latency AND medium packet loss AND high bandwidth AND low congestion
    # -> GOOD
    apply_rule(
        min(l["low"], p["medium"], b["high"], c["low"]),
        QUALITY_GOOD,
    )

    # Rule 4:
    # Medium latency AND low packet loss AND high bandwidth AND low congestion
    # -> GOOD
    apply_rule(
        min(l["medium"], p["low"], b["high"], c["low"]),
        QUALITY_GOOD,
    )

    # -----------------------------------------------------------------------
    # AVERAGE CONDITIONS
    # -----------------------------------------------------------------------

    # Rule 5:
    # Medium latency AND medium packet loss AND medium bandwidth
    # AND medium congestion -> AVERAGE
    apply_rule(
        min(l["medium"], p["medium"], b["medium"], c["medium"]),
        QUALITY_AVERAGE,
    )

    # Rule 6:
    # Low latency AND medium packet loss AND medium bandwidth
    # AND medium congestion -> AVERAGE
    apply_rule(
        min(l["low"], p["medium"], b["medium"], c["medium"]),
        QUALITY_AVERAGE,
    )

    # Rule 7:
    # Medium latency AND low packet loss AND medium bandwidth
    # AND medium congestion -> AVERAGE
    apply_rule(
        min(l["medium"], p["low"], b["medium"], c["medium"]),
        QUALITY_AVERAGE,
    )

    # Rule 8:
    # Medium latency AND medium packet loss AND high bandwidth
    # AND high congestion -> AVERAGE
    apply_rule(
        min(l["medium"], p["medium"], b["high"], c["high"]),
        QUALITY_AVERAGE,
    )

    # Rule 9:
    # High latency AND low packet loss AND high bandwidth
    # AND low congestion -> AVERAGE
    apply_rule(
        min(l["high"], p["low"], b["high"], c["low"]),
        QUALITY_AVERAGE,
    )

    # -----------------------------------------------------------------------
    # POOR CONDITIONS
    # -----------------------------------------------------------------------

    # Rule 10:
    # High latency AND high packet loss -> POOR
    apply_rule(
        min(l["high"], p["high"]),
        QUALITY_POOR,
    )

    # Rule 11:
    # High latency AND high congestion -> POOR
    apply_rule(
        min(l["high"], c["high"]),
        QUALITY_POOR,
    )

    # Rule 12:
    # Low bandwidth AND high congestion -> POOR
    apply_rule(
        min(b["low"], c["high"]),
        QUALITY_POOR,
    )

    # Rule 13:
    # Low bandwidth AND high packet loss -> POOR
    apply_rule(
        min(b["low"], p["high"]),
        QUALITY_POOR,
    )

    # Rule 14:
    # High packet loss AND high congestion -> POOR
    apply_rule(
        min(p["high"], c["high"]),
        QUALITY_POOR,
    )

    # Rule 15:
    # High latency AND low bandwidth -> POOR
    apply_rule(
        min(l["high"], b["low"]),
        QUALITY_POOR,
    )

    return quality


def calculate_link_quality(
    latency: float,
    packet_loss: float,
    bandwidth: float,
    congestion: float,
) -> float:
    """
    Calculate link quality using Mamdani fuzzy inference.

    Defuzzification:
        Centroid method.

    Returns
    -------
    float
        Link-quality score between 0 and 1.
    """

    memberships = _fuzzy_memberships(
        latency=latency,
        packet_loss=packet_loss,
        bandwidth=bandwidth,
        congestion=congestion,
    )

    aggregated_quality = _apply_rules(memberships)

    # If no rule fired, return the neutral midpoint instead of allowing
    # defuzzification to fail.
    if np.max(aggregated_quality) <= 0:
        return 0.5

    quality = fuzz.defuzz(
        QUALITY_UNIVERSE,
        aggregated_quality,
        "centroid",
    )

    return float(np.clip(quality, 0.0, 1.0))


def quality_to_cost(
    quality: float,
    epsilon: float = EPSILON,
) -> float:
    """
    Convert fuzzy link quality into routing cost.

    Quality:
        higher is better

    Routing cost:
        lower is better

    Formula:
        cost = 1 / (quality + epsilon)

    Keeping this conversion in one function prevents quality and
    routing cost from being accidentally conflated.
    """

    quality = float(np.clip(quality, 0.0, 1.0))

    return 1.0 / (quality + epsilon)


def calculate_link_cost(
    latency: float,
    packet_loss: float,
    bandwidth: float,
    congestion: float,
) -> tuple[float, float]:
    """
    Calculate both fuzzy quality and routing cost for one link.

    Returns
    -------
    tuple
        (quality, cost)
    """

    quality = calculate_link_quality(
        latency=latency,
        packet_loss=packet_loss,
        bandwidth=bandwidth,
        congestion=congestion,
    )

    cost = quality_to_cost(quality)

    return quality, cost