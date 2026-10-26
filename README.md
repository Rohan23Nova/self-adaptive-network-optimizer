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

## Running Tests and Experiments

Activate the Python virtual environment:

```bash
source .venv/bin/activate
```

Run test suite:

```bash
python -m pytest -v
```

Run routing experiments:

```bash
python -m evaluation.experiments --seed 42 --aco-runs 2
```