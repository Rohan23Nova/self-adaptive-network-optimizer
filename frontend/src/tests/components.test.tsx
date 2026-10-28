import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InspectorPanel } from '../components/lab/InspectorPanel';
import { EventControls } from '../components/lab/EventControls';
import { DecisionPanel } from '../components/lab/DecisionPanel';
import { EventHistory } from '../components/lab/EventHistory';
import type { SessionResponse, EventResponse } from '../api/types';

const mockDemoSession: SessionResponse = {
  session_id: 'test-session-123',
  topology_type: 'demo',
  source: 0,
  destination: 7,
  quality_threshold: 0.15,
  cost_threshold: 0.20,
  current_route: [0, 1, 4, 7],
  current_route_cost: 2.145,
  reachable: true,
  metrics: {
    latency_ms: 73.0,
    packet_loss_percent: 2.1,
    bandwidth_mbps: 75.0,
    congestion_percent: 18.0,
    route_cost: 2.145,
  },
  total_route_changes: 0,
  history_count: 0,
  created_at: '2026-10-28T12:00:00Z',
  updated_at: '2026-10-28T12:00:00Z',
  topology: {
    topology_type: 'demo',
    num_nodes: 8,
    num_edges: 13,
    nodes: [
      { id: 0, enabled: true, role: 'source', incident_links: 3 },
      { id: 1, enabled: true, role: 'intermediate', incident_links: 3 },
      { id: 4, enabled: true, role: 'intermediate', incident_links: 3 },
      { id: 7, enabled: true, role: 'destination', incident_links: 2 },
    ],
    edges: [
      {
        source: 0,
        target: 1,
        latency: 25.0,
        packet_loss: 0.8,
        bandwidth: 80.0,
        congestion: 20.0,
        enabled: true,
        quality: 0.88,
        cost: 1.13,
        on_route: true,
      },
      {
        source: 1,
        target: 4,
        latency: 30.0,
        packet_loss: 0.8,
        bandwidth: 75.0,
        congestion: 20.0,
        enabled: true,
        quality: 0.85,
        cost: 1.17,
        on_route: true,
      },
      {
        source: 4,
        target: 7,
        latency: 18.0,
        packet_loss: 0.5,
        bandwidth: 95.0,
        congestion: 10.0,
        enabled: true,
        quality: 0.95,
        cost: 1.05,
        on_route: true,
      },
    ],
  },
};

describe('InspectorPanel Component', () => {
  it('renders overall transmission telemetry when no element is selected', () => {
    render(
      <InspectorPanel
        session={mockDemoSession}
        selectedNode={null}
        selectedEdge={null}
        onClearSelection={vi.fn()}
      />
    );

    expect(screen.getByText('Network Telemetry Overview')).toBeInTheDocument();
    expect(screen.getByText('End-to-End Latency:')).toBeInTheDocument();
    expect(screen.getByText('73.0 ms')).toBeInTheDocument();
    expect(screen.getByText('2.10%')).toBeInTheDocument();
    expect(screen.getByText('75.0 Mbps')).toBeInTheDocument();
  });

  it('renders router details when a node is selected', () => {
    render(
      <InspectorPanel
        session={mockDemoSession}
        selectedNode={0}
        selectedEdge={null}
        onClearSelection={vi.fn()}
      />
    );

    expect(screen.getByText('Router R0 Telemetry')).toBeInTheDocument();
    expect(screen.getByText('source')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('renders link details when an edge is selected', () => {
    render(
      <InspectorPanel
        session={mockDemoSession}
        selectedNode={null}
        selectedEdge={[0, 1]}
        onClearSelection={vi.fn()}
      />
    );

    expect(screen.getByText('Link (0 ↔ 1) Telemetry')).toBeInTheDocument();
    expect(screen.getByText('25 ms')).toBeInTheDocument();
    expect(screen.getByText('0.8%')).toBeInTheDocument();
    expect(screen.getByText('OPERATIONAL')).toBeInTheDocument();
    expect(screen.getByText('0.880')).toBeInTheDocument();
    expect(screen.getByText('1.130')).toBeInTheDocument();
  });
});

describe('EventControls Component', () => {
  it('triggers congestion event callback with correct payload', () => {
    const applySpy = vi.fn();
    render(
      <EventControls
        session={mockDemoSession}
        selectedNode={null}
        selectedEdge={[0, 1]}
        onApplyEvent={applySpy}
        onResetNetwork={vi.fn()}
        isSubmitting={false}
      />
    );

    const applyBtn = screen.getByText(/Apply Congestion Surge/i);
    fireEvent.click(applyBtn);

    expect(applySpy).toHaveBeenCalledWith({
      event_type: 'congestion',
      edges: [[0, 1]],
      amount: 30,
    });
  });

  it('opens confirmation modal before cutting a physical link', () => {
    const applySpy = vi.fn();
    render(
      <EventControls
        session={mockDemoSession}
        selectedNode={null}
        selectedEdge={[0, 1]}
        onApplyEvent={applySpy}
        onResetNetwork={vi.fn()}
        isSubmitting={false}
      />
    );

    const cutBtn = screen.getByText(/Cut Link/i);
    fireEvent.click(cutBtn);

    expect(screen.getByText(/Cut Physical Link/i)).toBeInTheDocument();
    const confirmBtn = screen.getByText('Confirm Cut');
    fireEvent.click(confirmBtn);

    expect(applySpy).toHaveBeenCalledWith({
      event_type: 'link_failure',
      edge: [0, 1],
    });
  });

  it('disables submit buttons while isSubmitting is true', () => {
    render(
      <EventControls
        session={mockDemoSession}
        selectedNode={null}
        selectedEdge={[0, 1]}
        onApplyEvent={vi.fn()}
        onResetNetwork={vi.fn()}
        isSubmitting={true}
      />
    );

    const applyBtn = screen.getByText(/Apply Congestion Surge/i);
    expect(applyBtn).toBeDisabled();
  });
});

describe('DecisionPanel Component', () => {
  it('displays loading state during ongoing engine evaluation', () => {
    render(<DecisionPanel lastEvent={null} isSubmitting={true} />);
    expect(
      screen.getByText(/Adaptive Engine Evaluating QoS Telemetry/i)
    ).toBeInTheDocument();
  });

  it('displays autonomous rerouting diagnosis for triggered event', () => {
    const mockRerouteEvent: EventResponse = {
      event_name: 'latency',
      changed_edges: [[0, 1]],
      changed_nodes: [],
      previous_route: [0, 1, 4, 7],
      previous_route_cost: 2.145,
      triggered: true,
      trigger_reason: 'quality_drop_exceeded_threshold',
      new_route: [0, 2, 5, 7],
      new_route_cost: 2.05,
      previous_metrics: { latency_ms: 73.0, packet_loss_percent: 2.1 },
      new_metrics: { latency_ms: 68.0, packet_loss_percent: 1.8 },
      performance_delta: { latency_ms: -5.0, packet_loss_percent: -0.3 },
      route_changed: true,
      processing_time_ms: 0.9,
      reroute_time_ms: 41.2,
      unreachable: false,
    };

    render(<DecisionPanel lastEvent={mockRerouteEvent} isSubmitting={false} />);

    expect(screen.getByText(/Adaptive Reroute Triggered/i)).toBeInTheDocument();
    expect(screen.getByText(/^LATENCY$/i)).toBeInTheDocument();
    expect(screen.getByText(/0.90/)).toBeInTheDocument();
    expect(screen.getAllByText(/41.20/).length).toBeGreaterThanOrEqual(1);
  });

  it('displays unreachable state cleanly when network partition occurs', () => {
    const mockUnreachableEvent: EventResponse = {
      event_name: 'router_failure',
      changed_edges: [],
      changed_nodes: [7],
      previous_route: [0, 1, 4, 7],
      previous_route_cost: 2.145,
      triggered: true,
      trigger_reason: 'destination_router_disabled',
      new_route: [],
      new_route_cost: null,
      previous_metrics: { latency_ms: 73.0 },
      new_metrics: {},
      performance_delta: {},
      route_changed: true,
      processing_time_ms: 0.5,
      reroute_time_ms: 0.0,
      unreachable: true,
    };

    render(<DecisionPanel lastEvent={mockUnreachableEvent} isSubmitting={false} />);

    expect(screen.getByText(/Destination Unreachable/i)).toBeInTheDocument();
    expect(screen.getByText(/Destination isolation detected/i)).toBeInTheDocument();
  });
});

describe('EventHistory Component', () => {
  it('renders chronological list of events and allows selection', () => {
    const onSelectSpy = vi.fn();
    const mockEvents: EventResponse[] = [
      {
        event_name: 'congestion',
        changed_edges: [[0, 1]],
        changed_nodes: [],
        previous_route: [0, 1, 4, 7],
        previous_route_cost: 2.145,
        triggered: false,
        trigger_reason: 'tolerated_below_threshold',
        new_route: [0, 1, 4, 7],
        new_route_cost: 2.2,
        previous_metrics: { latency_ms: 73.0 },
        new_metrics: { latency_ms: 75.0 },
        performance_delta: { latency_ms: 2.0 },
        route_changed: false,
        processing_time_ms: 0.8,
        reroute_time_ms: 0.0,
        unreachable: false,
      },
    ];

    render(
      <EventHistory
        events={mockEvents}
        onSelectEvent={onSelectSpy}
        selectedEventIndex={0}
      />
    );

    expect(screen.getByText(/Session Event Audit History/i)).toBeInTheDocument();
    expect(screen.getByText(/congestion/i)).toBeInTheDocument();
    expect(screen.getByText(/Tolerated/i)).toBeInTheDocument();

    const detailsBtn = screen.getByText('Details');
    fireEvent.click(detailsBtn);
    expect(onSelectSpy).toHaveBeenCalledWith(mockEvents[0]);
  });
});
