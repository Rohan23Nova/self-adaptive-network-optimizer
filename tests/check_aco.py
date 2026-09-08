from simulator.graph_builder import build_demo_graph

from routing.aco import AntColonyOptimizer
from routing.dijkstra_baseline import dijkstra_fuzzy


graph = build_demo_graph()

source = 0
destination = 7


print("=" * 70)
print("ACO VS DIJKSTRA FUZZY-COST CHECK")
print("=" * 70)


# ---------------------------------------------------------------------------
# Dijkstra
# ---------------------------------------------------------------------------

dijkstra_result = dijkstra_fuzzy(
    graph,
    source,
    destination,
)


print("\nDIJKSTRA - FUZZY COST")
print("-" * 70)
print("Path:", dijkstra_result.path)
print("Cost:", dijkstra_result.cost)


# ---------------------------------------------------------------------------
# ACO
# ---------------------------------------------------------------------------

aco = AntColonyOptimizer(
    alpha=1.0,
    beta=2.0,
    evaporation_rate=0.5,
    num_ants=30,
    num_iterations=50,
    initial_pheromone=1.0,
    min_pheromone=0.01,
    max_pheromone=10.0,
    seed=42,
)

aco_result = aco.find_route(
    graph,
    source,
    destination,
)


print("\nACO - FUZZY COST")
print("-" * 70)
print("Path:", aco_result.path)
print("Cost:", aco_result.cost)
print("Iterations:", aco_result.iterations)


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------

print("\nCOMPARISON")
print("-" * 70)

if dijkstra_result.exists and aco_result.exists:

    print(
        "Cost difference:",
        aco_result.cost - dijkstra_result.cost,
    )

    if aco_result.cost == dijkstra_result.cost:
        print("ACO found the same-cost route as Dijkstra.")

    elif aco_result.cost < dijkstra_result.cost:
        print("ACO found a lower-cost route.")

    else:
        print("Dijkstra found a lower-cost route.")

else:
    print("One or both algorithms found no route.")


# ---------------------------------------------------------------------------
# Convergence
# ---------------------------------------------------------------------------

print("\nCONVERGENCE")
print("-" * 70)

history = aco_result.convergence_history

if history:
    print("Initial best cost:", history[0])
    print("Final best cost:", history[-1])

    print("\nFirst 10 iterations:")

    for iteration, cost in enumerate(history[:10], start=1):
        print(
            f"Iteration {iteration:>2}: "
            f"{cost:.6f}"
        )