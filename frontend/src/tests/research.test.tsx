import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StrategyComparisonCard } from '../components/strategies/StrategyComparisonCard';
import { StrategyComparisonChart } from '../components/strategies/StrategyComparisonChart';
import { ScenarioMetricChart } from '../components/research/ScenarioMetricChart';
import { TimelineChart } from '../components/research/TimelineChart';
import { ConvergenceChart } from '../components/research/ConvergenceChart';
import { RouteComparisonTable } from '../components/research/RouteComparisonTable';
import { DataTable } from '../components/research/DataTable';
import { MethodologyPanel } from '../components/research/MethodologyPanel';
import type {
  StrategyResultModel,
  ExperimentSummaryRow,
  ConvergencePoint,
} from '../api/types';

describe('Research Studio & Strategy Comparison Tests', () => {
  // Mock strategy comparison models
  const mockStrategies: StrategyResultModel[] = [
    {
      strategy: 'dijkstra_latency',
      strategy_label: 'Dijkstra Latency',
      objective: 'Minimize physical link latency',
      cost_type: 'latency_ms',
      reachable: true,
      path: [0, 9, 12, 14, 24],
      hops: 4,
      route_cost: 53.89,
      latency_ms: 53.89,
      packet_loss_percent: 10.02,
      bandwidth_mbps: 41.22,
      congestion_percent: 48.02,
      runtime_ms: 0.61,
    },
    {
      strategy: 'dijkstra_fuzzy',
      strategy_label: 'Dijkstra Fuzzy Cost',
      objective: 'Minimize defuzzified quality cost',
      cost_type: 'fuzzy_cost',
      reachable: true,
      path: [0, 24],
      hops: 1,
      route_cost: 2.00,
      latency_ms: 115.29,
      packet_loss_percent: 1.68,
      bandwidth_mbps: 27.42,
      congestion_percent: 10.32,
      runtime_ms: 8.09,
    },
    {
      strategy: 'aco_fuzzy',
      strategy_label: 'ACO Fuzzy (Ant Colony)',
      objective: 'Heuristic swarm route optimization',
      cost_type: 'fuzzy_cost',
      reachable: true,
      path: [0, 24],
      hops: 1,
      route_cost: 2.00,
      latency_ms: 115.29,
      packet_loss_percent: 1.68,
      bandwidth_mbps: 27.42,
      congestion_percent: 10.32,
      runtime_ms: 17.02,
    },
    {
      strategy: 'adaptive_aco',
      strategy_label: 'Adaptive ACO (NEXUS)',
      objective: 'Self-healing threshold-triggered routing',
      cost_type: 'fuzzy_cost',
      reachable: true,
      path: [0, 24],
      hops: 1,
      route_cost: 2.00,
      latency_ms: 115.29,
      packet_loss_percent: 1.68,
      bandwidth_mbps: 27.42,
      congestion_percent: 10.32,
      runtime_ms: 0.0,
    },
  ];

  const mockSummaryRows: ExperimentSummaryRow[] = [
    {
      scenario: 'normal',
      strategy: 'dijkstra_latency',
      runs: 1,
      latency_ms_mean: 53.89,
      latency_ms_std: 0.0,
      packet_loss_percent_mean: 10.02,
      bandwidth_mbps_mean: 41.22,
      congestion_percent_mean: 48.02,
      route_hops_mean: 4.0,
      reachable_rate: 1.0,
      runtime_ms_mean: 0.61,
      route_cost_mean: 53.89,
    },
    {
      scenario: 'normal',
      strategy: 'aco_fuzzy',
      runs: 20,
      latency_ms_mean: 115.29,
      latency_ms_std: 0.45,
      latency_ms_ci95_lower: 115.08,
      latency_ms_ci95_upper: 115.50,
      packet_loss_percent_mean: 1.68,
      bandwidth_mbps_mean: 27.42,
      congestion_percent_mean: 10.32,
      route_hops_mean: 1.0,
      reachable_rate: 1.0,
      runtime_ms_mean: 17.02,
      runtime_ms_std: 0.34,
      runtime_ms_ci95_lower: 16.86,
      runtime_ms_ci95_upper: 17.18,
      route_cost_mean: 2.00,
    },
    {
      scenario: 'high_latency',
      strategy: 'adaptive_aco',
      runs: 1,
      latency_ms_mean: 114.63,
      packet_loss_percent_mean: 4.48,
      bandwidth_mbps_mean: 68.93,
      congestion_percent_mean: 47.13,
      route_hops_mean: 2.0,
      reachable_rate: 1.0,
      runtime_ms_mean: 19.75,
      route_cost_mean: 3.22,
    },
  ];

  const mockTimeline = [
    {
      step: 1,
      event_name: 'baseline_normal',
      changed_edges: '[]',
      triggered: false,
      trigger_reason: 'initial_state',
      route_changed: false,
      unreachable: false,
      previous_route: '[0, 24]',
      new_route: '[0, 24]',
      latency_before_ms: 115.29,
      latency_after_ms: 115.29,
      loss_before_percent: 1.68,
      loss_after_percent: 1.68,
      bandwidth_before_mbps: 27.42,
      bandwidth_after_mbps: 27.42,
      congestion_before_percent: 10.32,
      congestion_after_percent: 10.32,
      cost_before: 2.0,
      cost_after: 2.0,
      processing_time_ms: 0.0,
      reroute_time_ms: 0.0,
    },
    {
      step: 4,
      event_name: 'latency_spike',
      changed_edges: '[(0, 24)]',
      triggered: true,
      trigger_reason: 'link_(0, 24)_quality_drop_65.9%_exceeds_threshold_10.0%',
      route_changed: true,
      unreachable: false,
      previous_route: '[0, 24]',
      new_route: '[0, 9, 24]',
      latency_before_ms: 115.29,
      latency_after_ms: 114.63,
      loss_before_percent: 1.68,
      loss_after_percent: 4.48,
      bandwidth_before_mbps: 27.42,
      bandwidth_after_mbps: 68.93,
      congestion_before_percent: 10.32,
      congestion_after_percent: 47.13,
      cost_before: 2.0,
      cost_after: 3.2207,
      processing_time_ms: 19.98,
      reroute_time_ms: 19.49,
    },
    {
      step: 8,
      event_name: 'network_disconnection',
      changed_edges: '[(24, 0)]',
      triggered: true,
      trigger_reason: 'router_24_disabled_on_current_route',
      route_changed: true,
      unreachable: true,
      previous_route: '[0, 20, 24]',
      new_route: '[]',
      latency_before_ms: 115.29,
      latency_after_ms: 'inf',
      loss_before_percent: 1.68,
      loss_after_percent: 'inf',
      bandwidth_before_mbps: 27.42,
      bandwidth_after_mbps: 0.0,
      congestion_before_percent: 10.32,
      congestion_after_percent: 'inf',
      cost_before: 4.0,
      cost_after: 'inf',
      processing_time_ms: 1.32,
      reroute_time_ms: 0.0,
    },
  ];

  const mockConvergence: ConvergencePoint[] = [
    { iteration: 1, best_cost: 2.85, mean_cost: 3.42, scenario: 'normal', run: 1 },
    { iteration: 5, best_cost: 2.15, mean_cost: 2.45, scenario: 'normal', run: 1 },
    { iteration: 10, best_cost: 2.00, mean_cost: 2.05, scenario: 'normal', run: 1 },
    { iteration: 50, best_cost: 2.00, mean_cost: 2.00, scenario: 'normal', run: 1 },
  ];

  const mockDetailed = [
    {
      scenario: 'normal',
      strategy: 'dijkstra_latency',
      seed: 42,
      run: 1,
      reachable: 1,
      latency_ms: 53.89,
      packet_loss_percent: 10.02,
      bandwidth_mbps: 41.22,
      congestion_percent: 48.02,
      route_hops: 4,
      runtime_ms: 0.61,
      route_cost: 53.89,
      route_path: '[0, 9, 12, 14, 24]',
    },
    {
      scenario: 'normal',
      strategy: 'aco_fuzzy',
      seed: 42,
      run: 1,
      reachable: 1,
      latency_ms: 115.29,
      packet_loss_percent: 1.68,
      bandwidth_mbps: 27.42,
      congestion_percent: 10.32,
      route_hops: 1,
      runtime_ms: 16.43,
      route_cost: 2.0,
      route_path: '[0, 24]',
    },
  ];

  it('renders StrategyComparisonCard with explicit cost unit differentiation', () => {
    // Latency cost card (dijkstra_latency)
    render(<StrategyComparisonCard strategy={mockStrategies[0]} />);
    expect(screen.getAllByText(/Dijkstra Latency/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/latency_ms/i)).toBeInTheDocument();
    expect(screen.getByText(/53\.9\s*ms/i)).toBeInTheDocument();

    // Fuzzy cost card (dijkstra_fuzzy)
    render(<StrategyComparisonCard strategy={mockStrategies[1]} />);
    expect(screen.getAllByText(/Dijkstra Fuzzy Cost/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/fuzzy_cost/i)).toBeInTheDocument();
  });

  it('renders StrategyComparisonChart and switches metric selection', () => {
    render(<StrategyComparisonChart strategies={mockStrategies} />);
    expect(
      screen.getByText(/Head-to-Head Metric Benchmark: End-to-End Latency/i)
    ).toBeInTheDocument();

    // Click on Loss pill
    const lossButton = screen.getByRole('button', { name: /Loss/i });
    fireEvent.click(lossButton);
    expect(
      screen.getByText(/Head-to-Head Metric Benchmark: End-to-End Packet Loss/i)
    ).toBeInTheDocument();

    // Click on Bandwidth pill
    const bwButton = screen.getByRole('button', { name: /Bandwidth/i });
    fireEvent.click(bwButton);
    expect(
      screen.getByText(/Head-to-Head Metric Benchmark: Bottleneck Bandwidth/i)
    ).toBeInTheDocument();
  });

  it('renders ScenarioMetricChart with confidence interval toggle and discipline note', () => {
    render(
      <ScenarioMetricChart
        summaryRows={mockSummaryRows}
        selectedScenario="all"
        selectedStrategy="all"
      />
    );
    expect(screen.getByText(/Cross-Scenario Performance Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidence Discipline:/i)).toBeInTheDocument();

    const ciCheckbox = screen.getByLabelText(/Show 95% CI Bars/i);
    expect(ciCheckbox).toBeChecked();
    fireEvent.click(ciCheckbox);
    expect(ciCheckbox).not.toBeChecked();
  });

  it('renders TimelineChart and handles step scrubbing & unreachable states', () => {
    render(<TimelineChart timeline={mockTimeline} />);
    expect(screen.getByText(/10-Step Dynamic Event Recovery Trajectory/i)).toBeInTheDocument();

    // Check step 1 button
    const step1Btn = screen.getByRole('button', { name: /S1/i });
    expect(step1Btn).toBeInTheDocument();
    fireEvent.click(step1Btn);

    expect(screen.getByText(/BASELINE NORMAL/i)).toBeInTheDocument();
    expect(screen.getByText(/Route Intact \(Below Threshold\)/i)).toBeInTheDocument();

    // Check step 8 button (unreachable)
    const step8Btn = screen.getByRole('button', { name: /S8/i });
    expect(step8Btn).toBeInTheDocument();
    fireEvent.click(step8Btn);

    expect(screen.getByText(/NETWORK DISCONNECTION/i)).toBeInTheDocument();
    expect(screen.getByText(/Destination Disconnected/i)).toBeInTheDocument();
    expect(screen.getByText(/\[\] \(No Path\)/i)).toBeInTheDocument();
  });

  it('renders ConvergenceChart with iteration cost milestones', () => {
    render(<ConvergenceChart convergenceData={mockConvergence} selectedScenario="normal" />);
    expect(screen.getByText(/Ant Colony Optimization Convergence Curve/i)).toBeInTheDocument();
    expect(screen.getByText('2.8500')).toBeInTheDocument(); // Initial cost
    expect(screen.getByText('2.0000')).toBeInTheDocument(); // Final cost
  });

  it('renders RouteComparisonTable displaying multi-attribute vs latency trade-offs', () => {
    render(<RouteComparisonTable summaryRows={mockSummaryRows} selectedScenario="normal" />);
    expect(screen.getByText(/Path Selection & Algorithmic Trade-Off Matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/The Single-Objective vs. Multi-Attribute Paradox:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Dijkstra Raw Latency/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ACO Fuzzy \(Ant Colony\)/i).length).toBeGreaterThan(0);
  });

  it('renders DataTable with pagination, filtering, and export button', () => {
    render(<DataTable results={mockDetailed} total={2} />);
    expect(screen.getByText(/Run-Level Benchmark Data Records/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
    expect(screen.getByText('[0, 9, 12, 14, 24]')).toBeInTheDocument();
    expect(screen.getByText('[0, 24]')).toBeInTheDocument();

    // Filter by strategy
    const searchInput = screen.getByPlaceholderText(/Search scenario, strategy, seed, or path.../i);
    fireEvent.change(searchInput, { target: { value: 'latency' } });
    expect(screen.getByText('[0, 9, 12, 14, 24]')).toBeInTheDocument();
    expect(screen.queryByText('[0, 24]')).not.toBeInTheDocument();
  });

  it('renders MethodologyPanel with all 4 architectural tabs', () => {
    render(<MethodologyPanel />);
    expect(screen.getByText(/Scientific Methodology & Algorithmic Foundations/i)).toBeInTheDocument();

    // Tab 1 (Fuzzy)
    expect(screen.getByText(/Centroid Defuzzification/i)).toBeInTheDocument();

    // Tab 2 (ACO)
    const acoTab = screen.getByRole('button', { name: /2. Ant Colony Optimization/i });
    fireEvent.click(acoTab);
    expect(screen.getByText(/Probabilistic Ant State Transition Rule/i)).toBeInTheDocument();

    // Tab 3 (Adaptive)
    const adaptiveTab = screen.getByRole('button', { name: /3. Self-Adaptive Engine/i });
    fireEvent.click(adaptiveTab);
    expect(screen.getByText(/Continuous Assessment & Selective Rerouting Architecture/i)).toBeInTheDocument();

    // Tab 4 (Parameters)
    const paramsTab = screen.getByRole('button', { name: /4. Verified Parameters/i });
    fireEvent.click(paramsTab);
    expect(screen.getByText(/25 Nodes \(Mesh\)/i)).toBeInTheDocument();
  });
});
