import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import matplotlib.pyplot as plt

from simulator.graph_builder import build_demo_graph
from routing.aco import AntColonyOptimizer


OUTPUT_DIR = Path("plots")
OUTPUT_DIR.mkdir(exist_ok=True)


graph = build_demo_graph()

aco = AntColonyOptimizer(
    alpha=1.0,
    beta=2.0,
    evaporation_rate=0.5,
    num_ants=30,
    num_iterations=50,
    seed=42,
)

result = aco.find_route(
    graph,
    source=0,
    destination=7,
)


iterations = range(
    1,
    len(result.convergence_history) + 1,
)


plt.figure(figsize=(8, 5))

plt.plot(
    iterations,
    result.convergence_history,
)

plt.title("ACO Convergence")
plt.xlabel("Iteration")
plt.ylabel("Best Path Cost")
plt.grid(True, alpha=0.3)
plt.tight_layout()

output_file = OUTPUT_DIR / "aco_convergence.png"

plt.savefig(
    output_file,
    dpi=200,
)

plt.close()

print(f"Saved: {output_file}")