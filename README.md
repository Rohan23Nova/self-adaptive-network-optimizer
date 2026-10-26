# Self-Adaptive Computer Network Optimizer

A Soft Computing project that simulates a dynamic computer network and combines:

- Fuzzy Logic for multi-parameter link-quality assessment
- Ant Colony Optimization for adaptive routing
- Dijkstra for baseline comparison
- NetworkX for graph simulation
- Streamlit for interactive visualization

## Core Parameters

Each network link is characterized by:

- Latency
- Packet loss
- Bandwidth
- Congestion

The fuzzy inference system converts these uncertain network parameters into a link-quality score between 0 and 1.

The quality score is then explicitly converted into routing cost.

Three routing strategies are evaluated:

1. Dijkstra using raw latency
2. Dijkstra using fuzzy-derived cost
3. Custom Ant Colony Optimization using fuzzy-derived cost

## Adaptive Behavior

When network conditions change, the system:

1. Detects changed network conditions
2. Recomputes fuzzy scores for affected links
3. Checks whether adaptive rerouting is necessary
4. Runs the routing algorithm when required
5. Compares the old and new route
6. Measures the performance change

## Hardware

Designed to run locally on an Apple Silicon MacBook without GPU or cloud dependencies.

## Project Structure

```text
simulator/      Network generation and events
fuzzy/          Fuzzy membership functions and inference
routing/        Dijkstra and custom ACO
evaluation/     Metrics and experiments
dashboard/      Streamlit interface
tests/          Correctness tests
results/        Experimental CSV output
plots/          Generated visualizations
```

## Adaptive Routing Engine API

The `simulator/adaptive.py` module coordinates dynamic network changes, evaluates fuzzy cost changes, triggers on-demand ACO rerouting, and measures before/after performance deltas.

### Class: `AdaptiveRoutingEngine`

```python
engine = AdaptiveRoutingEngine(
    graph=None,               # Defaults to deterministic 8-node demo graph
    source=0,
    destination=7,
    quality_threshold=0.10,   # Trigger if any active route link drops >= 10% in quality
    cost_threshold=0.20,      # Trigger if current route cost degrades >= 20% vs reference
    seed=42,
)
```

### Supported Events

- `apply_congestion(edges, amount=30.0)`
- `apply_latency(edges, multiplier=2.0)`
- `apply_packet_loss(edges, amount=5.0)`
- `apply_link_failure(u, v)`
- `apply_link_restoration(u, v)`
- `apply_router_failure(node)`
- `apply_router_restoration(node)`
- `apply_combined_event(...)`
- `reset()`

Each event returns an `AdaptiveEventResult` dataclass with detailed telemetry:
`event_name`, `changed_edges`, `changed_nodes`, `previous_route`, `previous_route_cost`, `triggered`, `trigger_reason`, `new_route`, `new_route_cost`, `previous_metrics`, `new_metrics`, `performance_delta`, `route_changed`, `processing_time_seconds`, `reroute_time_seconds`, `unreachable`, and `error`.

### Trigger Semantics

1. **Topological Invalidation (Immediate)**: If any router or link along the active path is disabled or removed, rerouting triggers immediately regardless of numeric thresholds.
2. **Quality Degradation**: If any link on the current route suffers a relative drop in fuzzy quality exceeding `quality_threshold` ($\Delta Q / Q_{\text{old}} \ge \theta_q$), rerouting is triggered.
3. **Route Cost Degradation**: If the total fuzzy cost of the current route under new conditions degrades by $\ge \theta_c$ compared to its established reference baseline, rerouting is triggered.
4. **Tolerance**: Small fluctuations below both thresholds do not trigger rerouting, avoiding route flapping.

### Minimal Runnable Example

```python
from simulator.adaptive import AdaptiveRoutingEngine

# Initialize engine on default demo topology (0 -> 7)
engine = AdaptiveRoutingEngine(source=0, destination=7, seed=42)
print("Initial Route:", engine.current_route, "Cost:", engine.current_route_cost)

# Apply a link failure on the active route
first_hop = (engine.current_route[0], engine.current_route[1])
result = engine.apply_link_failure(*first_hop)

print("Triggered:", result.triggered, f"({result.trigger_reason})")
print("Rerouted Path:", result.new_route, "New Cost:", result.new_route_cost)
print("Route Changed:", result.route_changed)
print("Recovery Time:", f"{result.processing_time_seconds * 1000:.2f} ms")
```

### Known Limitations

- **Centralized Execution**: The simulator runs in a centralized environment; distributed protocol messaging (e.g. OSPF/BGP overhead) is simulated via link parameters rather than raw packet queues.
- **Single-Path Routing**: Optimization evaluates unicast paths between a single source and destination pair at a time rather than multipath traffic splitting.
- **Dashboard Deferred**: The interactive Streamlit UI is scheduled for implementation in a later phase.

## Running Tests and Experiments

Activate the Python virtual environment:

```bash
source .venv/bin/activate
```

Run test suite:

```bash
python -m pytest -v
```

Run live terminal adaptive demonstration:

```bash
python -m simulator.adaptive
```

Run routing experiments:

```bash
python -m evaluation.experiments --seed 42 --aco-runs 2
```