"""
Central configuration for the Self-Adaptive Computer Network Optimizer.

All important simulation, fuzzy, routing, and experiment parameters
should be defined here instead of being scattered across modules.
"""

# ---------------------------------------------------------------------------
# Fuzzy input ranges
# ---------------------------------------------------------------------------

LATENCY_RANGE = (0.0, 300.0)          # milliseconds
PACKET_LOSS_RANGE = (0.0, 15.0)       # percentage
BANDWIDTH_RANGE = (0.0, 100.0)        # Mbps
CONGESTION_RANGE = (0.0, 100.0)       # percentage


# ---------------------------------------------------------------------------
# Adaptive routing thresholds
# ---------------------------------------------------------------------------

# Minimum relative change in fuzzy quality that is considered significant.
QUALITY_CHANGE_THRESHOLD = 0.10

# Trigger rerouting if current route cost increases by this fraction
# compared with the route's original/reference cost.
ROUTE_COST_DEGRADATION_THRESHOLD = 0.20


# ---------------------------------------------------------------------------
# ACO parameters
# ---------------------------------------------------------------------------

ACO_ALPHA = 1.0
ACO_BETA = 2.0
ACO_EVAPORATION_RATE = 0.5

ACO_NUM_ANTS = 20
ACO_NUM_ITERATIONS = 50

PHEROMONE_INITIAL = 1.0
PHEROMONE_MIN = 0.01
PHEROMONE_MAX = 10.0


# ---------------------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------------------

DEFAULT_RANDOM_SEED = 42

# Number of independent ACO runs for statistical evaluation.
ACO_EXPERIMENT_RUNS = 20


# ---------------------------------------------------------------------------
# Simulation
# ---------------------------------------------------------------------------

DEFAULT_SOURCE = 0
DEFAULT_DESTINATION = 7