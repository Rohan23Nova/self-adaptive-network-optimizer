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

## Experimental Evaluation & Statistical Analysis (Phase 3)

The project includes an empirical evaluation pipeline that benchmarks four routing strategies across six network scenarios and a 10-step sequential dynamic event timeline.

### Evaluated Routing Strategies

1. **`dijkstra_latency`**: Baseline Dijkstra shortest-path algorithm minimizing raw path latency (ms). Single deterministic run.
2. **`dijkstra_fuzzy`**: Dijkstra algorithm operating on composite fuzzy link costs ($C_e = 1 / (Q_e + \epsilon)$). Single deterministic run.
3. **`aco_fuzzy`**: Custom Ant Colony Optimization metaheuristic minimizing composite fuzzy link costs. Evaluated across 20 independent random seeds per scenario ($N = 20$).
4. **`adaptive_aco`**: Event-driven `AdaptiveRoutingEngine` monitoring link-quality drops ($\ge 10\%$) and route-cost degradation ($\ge 20\%$), triggering on-demand ACO rerouting and self-healing.

### Evaluated Network Scenarios

- **`normal`**: Baseline operating conditions (moderate latency, low loss, high bandwidth, low congestion).
- **`congestion`**: Congestion surge on primary active links.
- **`high_latency`**: 4× latency spike applied to critical links.
- **`packet_loss`**: Concentrated packet loss surge (+8%) on primary route hops.
- **`link_failure`**: Complete topological failure (disabling) of the primary route's bottleneck link.
- **`dynamic_combined`**: Simultaneous compound degradation combining congestion, latency spikes, and packet loss across multiple alternate paths.

### 10-Step Sequential Dynamic Timeline

To evaluate event-driven reactivity and stability over time, a controlled 10-step dynamic sequence is executed on the 25-node topology:

1. `baseline_normal`: Network initialization and initial route discovery.
2. `minor_congestion`: Small congestion change (+5%) below threshold; triggers tolerance (no reroute).
3. `high_congestion`: Elevated congestion (+40%) below composite fuzzy trigger threshold.
4. `latency_spike`: 4× latency spike exceeding the quality-change threshold; triggers adaptive ACO reroute.
5. `packet_loss_surge`: +8% packet loss surge on active route hop; triggers adaptive reroute.
6. `link_failure`: Active link disabled; immediate topological reroute away from failed link.
7. `router_failure`: Active intermediate router disabled; immediate reroute excluding all incident edges.
8. `network_disconnection`: Destination router disabled; engine detects complete unreachability and records explicit failure.
9. `network_recovery`: Destination restored; engine discovers newly available path and recovers connectivity.
10. `full_reset`: Network topology and metrics restored to baseline.

### Metric Aggregations & Formulas

- **End-to-End Latency**: Additive across path links:
  $$\text{Latency}_{\text{route}} = \sum_{e \in P} \text{latency}_e \quad (\text{ms})$$
- **End-to-End Packet Loss**: Independent link success probability product:
  $$\text{Loss}_{\text{route}} = 100 \times \left( 1 - \prod_{e \in P} \left(1 - \frac{\text{loss}_e}{100}\right) \right) \quad (\%)$$
- **Bottleneck Bandwidth**: Minimum capacity along the path:
  $$\text{Bandwidth}_{\text{route}} = \min_{e \in P} \text{bandwidth}_e \quad (\text{Mbps})$$
- **Average Route Congestion**: Arithmetic mean of link congestions:
  $$\text{Congestion}_{\text{route}} = \frac{1}{|P|} \sum_{e \in P} \text{congestion}_e \quad (\%)$$
- **Fuzzy Routing Cost**: Multi-criteria cost derived from Mamdani inference quality $Q_e \in [0, 1]$:
  $$\text{Cost}_{\text{route}} = \sum_{e \in P} \frac{1}{Q_e + 10^{-6}}$$
  *(Note: Raw latency in ms and fuzzy cost are distinct metrics with different units and scales; they are evaluated and plotted separately).*

### Statistical Rigor & Confidence Intervals

All aggregate metrics report:
- Sample Mean ($\bar{x}$)
- Sample Standard Deviation ($s$)
- Median, Minimum, Maximum
- Two-sided 95% Confidence Interval via Student's $t$-distribution:
  $$\text{CI}_{95\%} = \bar{x} \pm t_{n-1, \, 0.975} \cdot \frac{s}{\sqrt{n}}$$
- Explicit Reachability Rate ($\frac{n_{\text{reachable}}}{n_{\text{total}}}$). Non-reachable runs report infinite metric values and are excluded from finite metric means while tracked in reachability statistics.

### Generated Artifacts

Executing the experimental pipeline creates organized data and figures:

- **`results/detailed_results.csv`**: Run-level metrics for all 138 evaluated runs (scenarios × strategies × runs).
- **`results/summary_results.csv`**: Full descriptive statistics and 95% CIs across all scenarios and strategies.
- **`results/aggregate_comparison.csv`**: Aggregated performance summary table.
- **`results/dynamic_timeline.csv`**: Step-by-step telemetry, deltas, and processing/reroute times across the 10 dynamic stages.
- **`results/aco_convergence.csv`**: Per-iteration best and average cost convergence histories across ACO iterations (6,000 records).
- **`results/experiment_metadata.json`**: Machine-readable run parameters, ACO hyperparameters, thresholds, seeds, and execution timestamp.
- **`plots/latency_comparison.png`**: Multi-panel bar chart comparing latency with 95% CI error bars.
- **`plots/packet_loss_comparison.png`**: Packet loss comparison highlighting multi-criteria fuzzy benefits.
- **`plots/bandwidth_comparison.png`**: Bottleneck bandwidth across scenarios.
- **`plots/congestion_comparison.png`**: Average path congestion comparison.
- **`plots/dynamic_recovery_timeline.png`**: Dual-axis recovery timeline showing latency trajectory and processing latency.
- **`plots/aco_convergence_curves.png`**: Iterative convergence envelopes showing rapid ACO optimization.
- **`plots/reachability_comparison.png`**: Reachability rates across all strategies.

### Key Empirical Findings

1. **Multi-Criteria Optimization Trade-Off**: Dijkstra on raw latency consistently achieves the lowest latency in unconstrained scenarios (e.g. 53.89 ms vs. 114.63 ms), but suffers substantially higher packet loss (10.02% vs. 4.48%) and lower bottleneck bandwidth (41.22 Mbps vs. 68.93 Mbps) compared to fuzzy-cost routing (`dijkstra_fuzzy`, `aco_fuzzy`, `adaptive_aco`).
2. **Metaheuristic Stability**: Across 20 independent random seeds, `aco_fuzzy` converges reliably to optimal fuzzy-cost routes within 15–20 iterations, demonstrating low variance ($s < 0.5$) on the 25-node benchmark topology.
3. **Adaptive Efficiency**: The `AdaptiveRoutingEngine` filters minor non-critical fluctuations (processing latency $< 0.1$ ms without invoking rerouting), while reacting within 19–24 ms to genuine quality degradation or topology failures.
4. **Resilience & Self-Healing**: Under complete destination isolation, the adaptive engine explicitly flags unreachability in 1.3 ms, then immediately recovers valid routing upon destination restoration.

### Threats to Validity & Limitations

- **Centralized Simulation**: Graph modifications and metric updates occur with centralized visibility; distributed signaling delays (e.g. OSPF LSA flooding or BGP convergence) are abstracted through link parameters.
- **Single-Pair Unicast Flow**: Experiments evaluate unicast traffic between a fixed source-destination pair ($0 \to 24$); network-wide multi-commodity flow queuing effects are not modeled.
- **Synthetic Network Topology**: Evaluated on a deterministic 25-node small-world network; enterprise or ISP topologies may exhibit differing path diversity and degree distributions.

## Interactive Streamlit Dashboard (Phase 4)

A desktop-first interactive web application built with Streamlit and Plotly, styled with a premium dark navy/charcoal technical aesthetic for live academic demonstrations and viva presentations.

### Dashboard Sections

1. **Overview**: Real-time operational dashboard with compact KPI metrics (Active Routers, Total Links, Route Hops, End-to-End Latency, Packet Loss, Bottleneck Bandwidth, Average Congestion), composite fuzzy routing cost, operational status badges, and academic architecture callouts.
2. **Live Network Simulator**: Interactive Plotly topology visualizer distinguishing active links, highlighted active routes, disabled links (dashed red), and disabled routers (red 'X'). Allows dynamic source/destination selection and provides live event injection (link congestion, latency spikes, packet loss surges, link/router failure and repair, and compound scenarios).
3. **Routing Strategy Comparison**: Real-time evaluation of all four routing algorithms (`dijkstra_latency`, `dijkstra_fuzzy`, `aco_fuzzy`, `adaptive_aco`) under identical network conditions, comparing latency, loss, bandwidth, congestion, hops, and execution runtimes with explicit objective labeling and unit separation.
4. **Experimental Results**: Interactive inspector for precomputed Phase 3 benchmark datasets (`results/summary_results.csv`, `detailed_results.csv`, `dynamic_timeline.csv`, `aco_convergence.csv`, `experiment_metadata.json`), providing scenario metric charts with 95% CIs, dynamic 10-step trajectory curves, ACO convergence envelopes, and raw data viewers.
5. **Adaptive Explainability**: Plain-English diagnostic breakdown of the engine's most recent routing decision, explaining whether the change was tolerated (below sensitivity threshold), triggered by fuzzy quality/cost degradation, or forced by topological failure, complete with quantitative before/after deltas and processing vs rerouting latencies.
6. **Event History**: Chronological audit trail logging every injected event, affected components, trigger status, route transitions, latency changes, and execution timings with CSV export support.

### Launching the Dashboard

Activate the virtual environment and start Streamlit:

```bash
source .venv/bin/activate
streamlit run dashboard/app.py
```

The application will be accessible at `http://localhost:8501`.

### 3-Minute Viva / Demonstration Walkthrough

Follow this concise sequence to demonstrate all core soft-computing and adaptive features during a project presentation:

1. **Step 1 — Baseline Inspection (Overview & Simulator)**:
   - Launch the dashboard and navigate to **Overview**.
   - Show the initial optimal route (`0 → 1 → 4 → 6 → 7`), low packet loss (~1.6%), high bottleneck bandwidth (~75 Mbps), and composite fuzzy cost (~2.0).
2. **Step 2 — Threshold Tolerance / Anti-Flapping (Live Simulator)**:
   - Go to **Live Network Simulator**, select link `(0, 1)`, and apply a minor **Congestion Increase (+10%)**.
   - Observe that the engine evaluates the change in `< 0.1 ms` and reports `TOLERATED (BELOW THRESHOLD)`. Point out that the route does not flap unnecessarily.
3. **Step 3 — Severe Event & Adaptive Rerouting**:
   - In **Live Network Simulator**, select link `(0, 1)` and apply a severe **Latency Spike (3.0x)**.
   - The relative quality drop exceeds the 10% sensitivity threshold $\implies$ `REROUTE TRIGGERED`.
   - The graph immediately highlights the newly selected path bypassing the degraded link.
4. **Step 4 — Topological Link Failure & Failure Recovery**:
   - Switch to **Link Failure / Restore** tab and disable link `(0, 1)`.
   - Show immediate topological invalidation forcing ACO to reroute via alternate hops.
   - Open **Adaptive Explainability** to show the plain-English narrative of why failure forced immediate reroute and inspect the before/after latency and loss deltas.
5. **Step 5 — Routing Strategy Comparison**:
   - Open **Routing Strategy Comparison**.
   - Show how `dijkstra_latency` achieves slightly lower latency at the expense of higher packet loss and lower bandwidth, while `dijkstra_fuzzy` and `aco_fuzzy` balance all four QoS dimensions.
6. **Step 6 — Network Disconnection & Self-Healing (Optional)**:
   - In **Live Network Simulator**, disable router `Node 7` (the destination).
   - Show that the engine detects complete unreachability in `1.3 ms` and displays the `Destination Unreachable` banner.
   - Click **Restore Router** or **Reset Network** to demonstrate seamless self-healing back to baseline.

### Recommended Report / Viva Screenshots

For the project report and slide deck, capture:
1. **Overview Screen**: KPI metrics and active route telemetry.
2. **Live Network Simulator (Normal Route)**: Full Plotly topology showing highlighted path.
3. **Live Network Simulator (Rerouted State)**: Showing disabled link (dashed red) and new bypass path.
4. **Strategy Comparison Matrix**: Grouped bar chart comparing Latency, Loss, Bandwidth, and Congestion across the 4 strategies.
5. **Dynamic Timeline Plot (Experimental Results)**: Dual-axis chart of the 10-step recovery lifecycle.
6. **Adaptive Explainability Card**: Natural language breakdown and delta impact cards.

## NEXUS FastAPI Backend (Phase 5)

A high-performance asynchronous REST API built with FastAPI that exposes the underlying soft-computing engine to modern web frontends (e.g., React / Vite).

```text
React / Vite Frontend  ──►  FastAPI REST API (api/)  ──►  Python Soft-Computing Engine
   (Web Interface)          (Endpoints & Session Mgr)       (Fuzzy, Dijkstra, ACO, Adaptive)
```

### API Endpoints Contract

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status, uptime timestamp, and active session count. |
| `GET` | `/api/network/topology` | Baseline network topology (`demo` 8-node or `experiment` 25-node). |
| `POST` | `/api/sessions` | Create a new isolated simulation session with custom topology and thresholds. |
| `GET` | `/api/sessions/{session_id}` | Retrieve session state, current route, topology snapshot, and QoS metrics. |
| `PUT` | `/api/sessions/{session_id}/endpoints` | Update active source and destination routers; recomputes optimal route. |
| `POST` | `/api/sessions/{session_id}/events` | Inject dynamic event (congestion, latency, loss, link/router failure, combined). |
| `POST` | `/api/sessions/{session_id}/reset` | Reset session graph, edge cache, and ACO pheromones to baseline. |
| `POST` | `/api/sessions/{session_id}/compare` | Compare all 4 routing strategies on an isolated snapshot of current conditions. |
| `GET` | `/api/experiments/summary` | Retrieve Phase 3 aggregate descriptive statistics and 95% confidence intervals. |
| `GET` | `/api/experiments/results` | Query run-level results with pagination and scenario/strategy filters. |
| `GET` | `/api/experiments/convergence` | Fetch ACO iteration-by-iteration cost convergence histories. |
| `GET` | `/api/experiments/timeline` | Fetch step-by-step telemetry across the 10-step sequential dynamic lifecycle. |

### Session Isolation & Concurrency

- **In-Memory Registry**: Each session is identified by a unique UUID4 and maintains an independent `AdaptiveRoutingEngine` with its own graph, edge caches, ACO router, and event audit history.
- **Thread Safety**: Operations on each session are protected by a session-level lock, ensuring safe concurrent access.
- **Non-Mutating Comparisons**: The `/api/sessions/{session_id}/compare` endpoint runs on an isolated deep copy of the session's active graph, guaranteeing that benchmark comparisons never alter active simulation state.
- **Academic Scope Note**: In-memory session state is ephemeral and resets upon server restart.

### Launching the FastAPI Backend

Activate the virtual environment and start the Uvicorn server:

```bash
source .venv/bin/activate
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive API documentation and schema explorers are available at:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### Example API Requests

#### 1. Create a Simulation Session
```bash
curl -X POST http://127.0.0.1:8000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"topology_type": "demo", "source": 0, "destination": 7, "quality_threshold": 0.10, "cost_threshold": 0.20}'
```

#### 2. Inject a Latency Spike Event
```bash
curl -X POST http://127.0.0.1:8000/api/sessions/<SESSION_ID>/events \
  -H "Content-Type: application/json" \
  -d '{"event_type": "latency", "edge": [0, 1], "multiplier": 3.0}'
```

#### 3. Compare Routing Strategies Live
```bash
curl -X POST http://127.0.0.1:8000/api/sessions/<SESSION_ID>/compare \
  -H "Content-Type: application/json" \
  -d '{"num_ants": 20, "num_iterations": 50}'
```

## NEXUS React Frontend & Landing Page (Phase 6)

A modern full-stack web interface engineered with React 18, Vite, TypeScript, and Tailwind CSS. Designed with a dark technical aesthetic inspired by high-end developer tools.

```text
React / Vite Web UI (frontend/)  ──►  FastAPI REST API (api/)  ──►  Soft-Computing Engine
(Landing, Lab Shell, Research)        (Async REST Session Mgr)      (Fuzzy, ACO, Baselines)
```

### Visual & Architectural Design

- **Dark Engineering Aesthetic**: Deep midnight/navy base (`#0B0F19`), slate/charcoal panels (`#111827`, `#1E293B`), restrained cyan (`#06B6D4`) and electric violet (`#8B5CF6`) accents, emerald (`#10B981`) for nominal health, and coral/red (`#EF4444`) for faults.
- **Motion & Accessibility**: Subtle transitions with SVG network path illumination; strict compliance with `prefers-reduced-motion`.
- **Honest Connection State**: Live API health monitoring via `useApiHealth`. When the FastAPI server is running, the UI displays real-time session telemetry; when offline, it falls back gracefully to a self-contained demonstration preview.

### Application Pages & Shell

1. **Landing Page (`/`)**:
   - **Hero**: Eyebrow `INTELLIGENT NETWORK SYSTEMS`, headline `Networks that adapt. Intelligence you can see.`, supporting copy, dual CTAs, and a custom animated SVG network topology demonstrating autonomous bypass of congested links.
   - **How It Works**: 3-stage loop: Sense multi-metric QoS $\to$ Evaluate fuzzy link quality $\to$ Adapt via ACO swarm rerouting.
   - **Soft Computing Pillars**: Mamdani linguistic rules, centroid defuzzification, ACO transition probability, and closed-loop feedback.
   - **Chaos Resilience Breakdown**: Comparative analysis of single-metric Dijkstra blackholing vs. NEXUS self-healing.
   - **Empirical Research Highlights**: Real benchmark data table comparing PDR, latency, and packet loss across strategies.
   - **Strategy Comparison Matrix**: Quick-reference table of the 4 algorithms.
   - **Academic Methodology & Course Context**: Soft Computing course attribution.
2. **Network Laboratory Shell (`/lab`)**: Simulation workbench shell with session configuration (topology selection, source/destination routers, sensitivity threshold sliders, random seed), live backend telemetry probe, and session creation pipeline.
3. **Routing Strategies Deep Dive (`/strategies`)**: Interactive selector with algorithmic formulations, execution complexities, strengths, bottlenecks, comparative matrix, and Mamdani inference pipeline breakdown.
4. **Experimental Research (`/research`)**: Empirical analytics viewer with scenario filtering (`baseline_normal`, `heavy_congestion`, `link_failure`, `combined_stress`), trial counts, PDR scores, and scientific takeaways.
5. **About & Methodology (`/about`)**: Complete project history across Phases 1–6, theoretical formulas for Mamdani centroid defuzzification and ACO transition probability, and developer execution instructions.

### Launching the Frontend

Ensure Node.js ($\ge 18$) is installed, navigate to the `frontend/` directory, and run:

```bash
cd frontend
npm install
npm run dev
```

The web application will be accessible at [http://localhost:5173](http://localhost:5173).

To build the production bundle:

```bash
npm run build
```

## Running Tests and Experiments

Activate the Python virtual environment:

```bash
source .venv/bin/activate
```

Run test suite (74 automated tests):

```bash
python -m pytest -v
```

Launch FastAPI backend server:

```bash
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

Launch React + Vite frontend application:

```bash
cd frontend && npm run dev
```

Launch Streamlit interactive dashboard (fallback UI):

```bash
streamlit run dashboard/app.py
```

Run full 20-run experimental evaluation and generate all publication plots:

```bash
python -m evaluation.experiments --seed 42 --aco-runs 20
```

Run live terminal adaptive demonstration:

```bash
python -m simulator.adaptive
```