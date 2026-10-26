import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fuzzy.inference import calculate_link_quality, quality_to_cost


cases = [
    {
        "name": "Excellent",
        "latency": 20,
        "packet_loss": 0.2,
        "bandwidth": 90,
        "congestion": 10,
    },
    {
        "name": "Good",
        "latency": 50,
        "packet_loss": 1.0,
        "bandwidth": 75,
        "congestion": 25,
    },
    {
        "name": "Average",
        "latency": 120,
        "packet_loss": 5,
        "bandwidth": 50,
        "congestion": 50,
    },
    {
        "name": "Poor",
        "latency": 220,
        "packet_loss": 10,
        "bandwidth": 25,
        "congestion": 75,
    },
    {
        "name": "Very Poor",
        "latency": 280,
        "packet_loss": 14,
        "bandwidth": 10,
        "congestion": 95,
    },
]


print("=" * 70)
print("FUZZY LINK QUALITY SANITY CHECK")
print("=" * 70)

for case in cases:
    quality = calculate_link_quality(
        latency=case["latency"],
        packet_loss=case["packet_loss"],
        bandwidth=case["bandwidth"],
        congestion=case["congestion"],
    )

    cost = quality_to_cost(quality)

    print(
        f"{case['name']:<12} | "
        f"Latency={case['latency']:>6.1f} ms | "
        f"Loss={case['packet_loss']:>5.1f}% | "
        f"Bandwidth={case['bandwidth']:>6.1f} Mbps | "
        f"Congestion={case['congestion']:>5.1f}% | "
        f"Quality={quality:.4f} | "
        f"Cost={cost:.4f}"
    )