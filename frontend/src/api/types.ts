/**
 * TypeScript types matching FastAPI Pydantic models from api/schemas.py.
 */

export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  timestamp: string;
  active_sessions: number;
}

export interface NodeModel {
  id: number;
  enabled: boolean;
  role: 'source' | 'destination' | 'intermediate' | string;
  incident_links: number;
}

export interface EdgeModel {
  source: number;
  target: number;
  latency: number;
  packet_loss: number;
  bandwidth: number;
  congestion: number;
  enabled: boolean;
  quality?: number | null;
  cost?: number | null;
  on_route?: boolean;
}

export interface TopologyResponse {
  topology_type: string;
  num_nodes: number;
  num_edges: number;
  nodes: NodeModel[];
  edges: EdgeModel[];
}

export interface MetricsModel {
  latency_ms?: number | null;
  packet_loss_percent?: number | null;
  bandwidth_mbps?: number | null;
  congestion_percent?: number | null;
  route_cost?: number | null;
}

export interface CreateSessionRequest {
  topology_type?: 'demo' | 'experiment';
  source?: number | null;
  destination?: number | null;
  quality_threshold?: number | null;
  cost_threshold?: number | null;
  seed?: number | null;
}

export interface UpdateEndpointsRequest {
  source: number;
  destination: number;
}

export interface SessionResponse {
  session_id: string;
  topology_type: string;
  source: number;
  destination: number;
  quality_threshold: number;
  cost_threshold: number;
  current_route: number[];
  current_route_cost?: number | null;
  reachable: boolean;
  metrics: MetricsModel;
  total_route_changes: number;
  history_count: number;
  created_at: string;
  updated_at: string;
  topology?: TopologyResponse | null;
}

export interface EventRequest {
  event_type:
    | 'congestion'
    | 'latency'
    | 'packet_loss'
    | 'link_failure'
    | 'link_restoration'
    | 'router_failure'
    | 'router_restoration'
    | 'combined'
    | 'reset';
  edges?: [number, number][];
  edge?: [number, number];
  node?: number;
  amount?: number;
  multiplier?: number;
  congestion_edges?: [number, number][];
  latency_edges?: [number, number][];
  loss_edges?: [number, number][];
  failed_link?: [number, number];
  failed_router?: number;
}

export interface EventResponse {
  event_name: string;
  changed_edges: [number, number][];
  changed_nodes: number[];
  previous_route: number[];
  previous_route_cost?: number | null;
  triggered: boolean;
  trigger_reason: string;
  new_route: number[];
  new_route_cost?: number | null;
  previous_metrics: MetricsModel;
  new_metrics: MetricsModel;
  performance_delta: Record<string, number | null>;
  route_changed: boolean;
  processing_time_ms: float;
  reroute_time_ms: float;
  unreachable: boolean;
  error?: string | null;
}

// float alias
export type float = number;

export interface CompareRequest {
  aco_seed?: number | null;
  num_ants?: number | null;
  num_iterations?: number | null;
}

export interface StrategyResultModel {
  strategy: string;
  strategy_label: string;
  objective: string;
  cost_type: string;
  reachable: boolean;
  path: number[];
  hops: number;
  route_cost?: number | null;
  latency_ms?: number | null;
  packet_loss_percent?: number | null;
  bandwidth_mbps?: number | null;
  congestion_percent?: number | null;
  runtime_ms: number;
}

export interface CompareStrategiesResponse {
  session_id: string;
  source: number;
  destination: number;
  strategies: StrategyResultModel[];
}

export interface ExperimentSummaryRow {
  strategy?: string;
  strategy_label?: string;
  scenario?: string;
  mean_latency?: number;
  std_latency?: number;
  mean_packet_loss?: number;
  mean_bandwidth?: number;
  mean_hops?: number;
  pdr?: number;
  reroute_events?: number;
  reroute_time_ms?: number;
  [key: string]: any;
}

export interface ExperimentSummaryResponse {
  summary: ExperimentSummaryRow[];
  metadata?: Record<string, any> | null;
}

export interface ExperimentResultsResponse {
  results: Record<string, any>[];
  total: number;
  limit: number;
  offset: number;
}

export interface ConvergencePoint {
  iteration: number;
  best_cost: number;
  mean_cost: number;
  run_id?: number;
  scenario?: string;
  [key: string]: any;
}

export interface ConvergenceResponse {
  convergence: ConvergencePoint[];
  total: number;
  scenario?: string | null;
}

export interface TimelineResponse {
  timeline: Record<string, any>[];
  total: number;
}
