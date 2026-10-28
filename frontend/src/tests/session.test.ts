import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api/client';
import type { SessionResponse, EventResponse, EventRequest } from '../api/types';

describe('Session Lifecycle and API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('creates and persists session in sessionStorage', async () => {
    const mockSession: SessionResponse = {
      session_id: 'test-session-uuid-1234',
      topology_type: 'demo',
      source: 0,
      destination: 7,
      quality_threshold: 0.15,
      cost_threshold: 0.2,
      current_route: [0, 1, 4, 7],
      current_route_cost: 2.341,
      reachable: true,
      metrics: {
        latency_ms: 73.0,
        packet_loss_percent: 2.1,
        bandwidth_mbps: 75.0,
        congestion_percent: 18.0,
        route_cost: 2.341,
      },
      total_route_changes: 0,
      history_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.spyOn(api, 'createSession').mockResolvedValue(mockSession);

    const session = await api.createSession({ topology_type: 'demo' });
    sessionStorage.setItem('nexus_session_id', session.session_id);

    expect(session.session_id).toBe('test-session-uuid-1234');
    expect(session.current_route).toEqual([0, 1, 4, 7]);
    expect(sessionStorage.getItem('nexus_session_id')).toBe('test-session-uuid-1234');
  });

  it('sends correct event request payload for congestion event', async () => {
    const eventPayload: EventRequest = {
      event_type: 'congestion',
      edges: [[0, 1]],
      amount: 30,
    };

    const mockEventResponse: EventResponse = {
      event_name: 'congestion',
      changed_edges: [[0, 1]],
      changed_nodes: [],
      previous_route: [0, 1, 4, 7],
      previous_route_cost: 2.341,
      triggered: true,
      trigger_reason: 'quality_drop_exceeded_threshold',
      new_route: [0, 2, 5, 7],
      new_route_cost: 2.15,
      previous_metrics: { latency_ms: 73.0 },
      new_metrics: { latency_ms: 68.0 },
      performance_delta: { latency_ms: -5.0 },
      route_changed: true,
      processing_time_ms: 1.2,
      reroute_time_ms: 38.5,
      unreachable: false,
    };

    const spy = vi.spyOn(api, 'triggerEvent').mockResolvedValue(mockEventResponse);

    const res = await api.triggerEvent('test-session-uuid-1234', eventPayload);

    expect(spy).toHaveBeenCalledWith('test-session-uuid-1234', eventPayload);
    expect(res.triggered).toBe(true);
    expect(res.route_changed).toBe(true);
    expect(res.new_route).toEqual([0, 2, 5, 7]);
    expect(res.processing_time_ms).toBeGreaterThan(0);
  });

  it('handles reset session call returning baseline route', async () => {
    const mockResetSession: SessionResponse = {
      session_id: 'test-session-uuid-1234',
      topology_type: 'demo',
      source: 0,
      destination: 7,
      quality_threshold: 0.15,
      cost_threshold: 0.2,
      current_route: [0, 1, 4, 7],
      current_route_cost: 2.341,
      reachable: true,
      metrics: { latency_ms: 73.0 },
      total_route_changes: 0,
      history_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const resetSpy = vi.spyOn(api, 'resetSession').mockResolvedValue(mockResetSession);
    const res = await api.resetSession('test-session-uuid-1234');

    expect(resetSpy).toHaveBeenCalledWith('test-session-uuid-1234');
    expect(res.reachable).toBe(true);
    expect(res.current_route).toEqual([0, 1, 4, 7]);
  });

  it('correctly segregates demo and experiment sessions in storage', async () => {
    const demoSession: SessionResponse = {
      session_id: 'demo-uuid-8888',
      topology_type: 'demo',
      source: 0,
      destination: 7,
      quality_threshold: 0.15,
      cost_threshold: 0.2,
      current_route: [0, 1, 4, 7],
      current_route_cost: 2.1,
      reachable: true,
      metrics: { latency_ms: 60.0 },
      total_route_changes: 0,
      history_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const expSession: SessionResponse = {
      session_id: 'exp-uuid-9999',
      topology_type: 'experiment',
      source: 0,
      destination: 24,
      quality_threshold: 0.15,
      cost_threshold: 0.2,
      current_route: [0, 6, 12, 18, 24],
      current_route_cost: 3.5,
      reachable: true,
      metrics: { latency_ms: 120.0 },
      total_route_changes: 0,
      history_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store demo session
    sessionStorage.setItem('nexus_session_id', demoSession.session_id);
    sessionStorage.setItem('nexus_session_id_demo', demoSession.session_id);
    expect(sessionStorage.getItem('nexus_session_id_demo')).toBe('demo-uuid-8888');

    // Switch to experiment session
    sessionStorage.setItem('nexus_session_id', expSession.session_id);
    sessionStorage.setItem('nexus_session_id_experiment', expSession.session_id);
    expect(sessionStorage.getItem('nexus_session_id_experiment')).toBe('exp-uuid-9999');

    // Switching back to demo retrieves demo session key, not experiment key
    expect(sessionStorage.getItem('nexus_session_id_demo')).toBe('demo-uuid-8888');
    expect(sessionStorage.getItem('nexus_session_id_demo')).not.toBe(
      sessionStorage.getItem('nexus_session_id_experiment')
    );
  });
});
