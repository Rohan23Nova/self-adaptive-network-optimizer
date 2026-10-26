import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from simulator.graph_builder import build_demo_graph
from simulator.events import disable_link
from routing.dijkstra_baseline import (
    dijkstra_fuzzy,
    dijkstra_latency,
)


graph = build_demo_graph()

source = 0
destination = 7


print("=" * 70)
print("DIJKSTRA ADAPTATION CHECK")
print("=" * 70)


# ---------------------------------------------------------------------------
# BEFORE FAILURE
# ---------------------------------------------------------------------------

before_latency = dijkstra_latency(
    graph,
    source,
    destination,
)

before_fuzzy = dijkstra_fuzzy(
    graph,
    source,
    destination,
)


print("\nBEFORE LINK FAILURE")
print("-" * 70)

print("Latency Dijkstra:")
print("  Path:", before_latency.path)
print("  Cost:", before_latency.cost)

print("\nFuzzy Dijkstra:")
print("  Path:", before_fuzzy.path)
print("  Cost:", before_fuzzy.cost)


# ---------------------------------------------------------------------------
# FAILURE EVENT
# ---------------------------------------------------------------------------

failed_link = (6, 7)

print("\nDISABLING LINK:", failed_link)

disable_link(
    graph,
    *failed_link,
)


# ---------------------------------------------------------------------------
# AFTER FAILURE
# ---------------------------------------------------------------------------

after_latency = dijkstra_latency(
    graph,
    source,
    destination,
)

after_fuzzy = dijkstra_fuzzy(
    graph,
    source,
    destination,
)


print("\nAFTER LINK FAILURE")
print("-" * 70)

print("Latency Dijkstra:")
print("  Path:", after_latency.path)
print("  Cost:", after_latency.cost)

print("\nFuzzy Dijkstra:")
print("  Path:", after_fuzzy.path)
print("  Cost:", after_fuzzy.cost)


print("\nROUTE CHANGE")

if before_latency.path != after_latency.path:
    print("Latency Dijkstra changed route.")

else:
    print("Latency Dijkstra kept the same route.")


if before_fuzzy.path != after_fuzzy.path:
    print("Fuzzy Dijkstra changed route.")

else:
    print("Fuzzy Dijkstra kept the same route.")