import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import matplotlib.pyplot as plt

from fuzzy.membership import plot_membership_functions


OUTPUT_DIR = Path("plots")
OUTPUT_DIR.mkdir(exist_ok=True)


data = plot_membership_functions()


# ---------------------------------------------------------------------------
# Latency
# ---------------------------------------------------------------------------

plt.figure(figsize=(8, 5))

for name in ["low", "medium", "high"]:
    plt.plot(
        data["latency"]["universe"],
        data["latency"][name],
        label=name.capitalize(),
    )

plt.title("Latency Membership Functions")
plt.xlabel("Latency (ms)")
plt.ylabel("Membership Degree")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "latency_membership.png", dpi=200)
plt.close()


# ---------------------------------------------------------------------------
# Packet loss
# ---------------------------------------------------------------------------

plt.figure(figsize=(8, 5))

for name in ["low", "medium", "high"]:
    plt.plot(
        data["packet_loss"]["universe"],
        data["packet_loss"][name],
        label=name.capitalize(),
    )

plt.title("Packet Loss Membership Functions")
plt.xlabel("Packet Loss (%)")
plt.ylabel("Membership Degree")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "packet_loss_membership.png", dpi=200)
plt.close()


# ---------------------------------------------------------------------------
# Bandwidth
# ---------------------------------------------------------------------------

plt.figure(figsize=(8, 5))

for name in ["low", "medium", "high"]:
    plt.plot(
        data["bandwidth"]["universe"],
        data["bandwidth"][name],
        label=name.capitalize(),
    )

plt.title("Bandwidth Membership Functions")
plt.xlabel("Bandwidth (Mbps)")
plt.ylabel("Membership Degree")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "bandwidth_membership.png", dpi=200)
plt.close()


# ---------------------------------------------------------------------------
# Congestion
# ---------------------------------------------------------------------------

plt.figure(figsize=(8, 5))

for name in ["low", "medium", "high"]:
    plt.plot(
        data["congestion"]["universe"],
        data["congestion"][name],
        label=name.capitalize(),
    )

plt.title("Congestion Membership Functions")
plt.xlabel("Congestion (%)")
plt.ylabel("Membership Degree")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "congestion_membership.png", dpi=200)
plt.close()


# ---------------------------------------------------------------------------
# Quality output
# ---------------------------------------------------------------------------

plt.figure(figsize=(8, 5))

for name in ["poor", "average", "good"]:
    plt.plot(
        data["quality"]["universe"],
        data["quality"][name],
        label=name.capitalize(),
    )

plt.title("Link Quality Membership Functions")
plt.xlabel("Link Quality")
plt.ylabel("Membership Degree")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "quality_membership.png", dpi=200)
plt.close()


print("Membership-function plots generated:")
print(f"  {OUTPUT_DIR / 'latency_membership.png'}")
print(f"  {OUTPUT_DIR / 'packet_loss_membership.png'}")
print(f"  {OUTPUT_DIR / 'bandwidth_membership.png'}")
print(f"  {OUTPUT_DIR / 'congestion_membership.png'}")
print(f"  {OUTPUT_DIR / 'quality_membership.png'}")