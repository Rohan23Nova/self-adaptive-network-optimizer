from fuzzy.inference import (
    calculate_link_quality,
    quality_to_cost,
)


def test_quality_is_between_zero_and_one():
    quality = calculate_link_quality(
        latency=50,
        packet_loss=1,
        bandwidth=80,
        congestion=20,
    )

    assert 0.0 <= quality <= 1.0


def test_good_network_has_reasonable_quality():
    quality = calculate_link_quality(
        latency=20,
        packet_loss=0.2,
        bandwidth=90,
        congestion=10,
    )

    assert quality > 0.6


def test_bad_network_has_lower_quality():
    quality = calculate_link_quality(
        latency=280,
        packet_loss=13,
        bandwidth=10,
        congestion=95,
    )

    assert quality < 0.5


def test_cost_decreases_when_quality_increases():
    high_quality_cost = quality_to_cost(0.9)
    low_quality_cost = quality_to_cost(0.2)

    assert high_quality_cost < low_quality_cost


def test_quality_to_cost_is_positive():
    for quality in [0.0, 0.2, 0.5, 0.8, 1.0]:
        assert quality_to_cost(quality) > 0