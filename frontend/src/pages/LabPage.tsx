import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppShell } from '../components/AppShell';
import { api } from '../api/client';
import type {
  SessionResponse,
  EventRequest,
  EventResponse,
  CreateSessionRequest,
} from '../api/types';

import { NetworkGraph } from '../components/lab/NetworkGraph';
import { InspectorPanel } from '../components/lab/InspectorPanel';
import { EventControls } from '../components/lab/EventControls';
import { DecisionPanel } from '../components/lab/DecisionPanel';
import { EventHistory } from '../components/lab/EventHistory';

import {
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

export const LabPage: React.FC = () => {
  // Core Session State
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Graph Selection State
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<[number, number] | null>(null);

  // Event State
  const [lastEvent, setLastEvent] = useState<EventResponse | null>(null);
  const [eventHistory, setEventHistory] = useState<EventResponse[]>([]);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState<boolean>(false);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);

  // Endpoints Form State
  const [sourceInput, setSourceInput] = useState<number>(0);
  const [destInput, setDestInput] = useState<number>(7);
  const [isUpdatingEndpoints, setIsUpdatingEndpoints] = useState<boolean>(false);

  // Feedback State
  const [copiedSessionId, setCopiedSessionId] = useState<boolean>(false);
  const [sideTab, setSideTab] = useState<'inspector' | 'controls'>('controls');

  // Initialization Guard for React 18 StrictMode
  const initStartedRef = useRef<boolean>(false);

  // Initialize or restore session
  const initializeSession = useCallback(async (topologyType: 'demo' | 'experiment' = 'demo') => {
    setLoadingSession(true);
    setSessionError(null);

    try {
      const savedId = sessionStorage.getItem('nexus_session_id');

      if (savedId && topologyType === 'demo') {
        try {
          const existing = await api.getSession(savedId);
          setSession(existing);
          setSourceInput(existing.source);
          setDestInput(existing.destination);
          setLoadingSession(false);
          return;
        } catch {
          // If session expired or 404, fall through and create fresh session
          sessionStorage.removeItem('nexus_session_id');
        }
      }

      // Create fresh session
      const req: CreateSessionRequest = {
        topology_type: topologyType,
        source: topologyType === 'demo' ? 0 : 0,
        destination: topologyType === 'demo' ? 7 : 24,
        quality_threshold: 0.15,
        cost_threshold: 0.20,
        seed: 42,
      };

      const newSession = await api.createSession(req);
      setSession(newSession);
      setSourceInput(newSession.source);
      setDestInput(newSession.destination);
      sessionStorage.setItem('nexus_session_id', newSession.session_id);
    } catch (err: any) {
      setSessionError(err?.message || 'Failed to initialize simulation session.');
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    if (!initStartedRef.current) {
      initStartedRef.current = true;
      initializeSession('demo');
    }
  }, [initializeSession]);

  // Handler: Apply Dynamic Event
  const handleApplyEvent = async (req: EventRequest) => {
    if (!session || isSubmittingEvent) return;

    setIsSubmittingEvent(true);
    setSessionError(null);

    try {
      const res = await api.triggerEvent(session.session_id, req);
      setLastEvent(res);
      setEventHistory((prev) => [res, ...prev]);
      setSelectedHistoryIndex(0);

      // Refresh session state to get updated topology and route
      const updated = await api.getSession(session.session_id);
      setSession(updated);
    } catch (err: any) {
      setSessionError(err?.message || 'Failed to apply dynamic event.');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // Handler: Reset Network
  const handleResetNetwork = async () => {
    if (!session || isSubmittingEvent) return;

    setIsSubmittingEvent(true);
    setSessionError(null);

    try {
      const resetSessionRes = await api.resetSession(session.session_id);
      setSession(resetSessionRes);

      // Generate synthetic reset event response for decision display
      const resetEvent: EventResponse = {
        event_name: 'reset',
        changed_edges: [],
        changed_nodes: [],
        previous_route: resetSessionRes.current_route,
        previous_route_cost: resetSessionRes.current_route_cost,
        triggered: true,
        trigger_reason: 'manual_session_reset',
        new_route: resetSessionRes.current_route,
        new_route_cost: resetSessionRes.current_route_cost,
        previous_metrics: resetSessionRes.metrics,
        new_metrics: resetSessionRes.metrics,
        performance_delta: {},
        route_changed: false,
        processing_time_ms: 0.1,
        reroute_time_ms: 0.0,
        unreachable: !resetSessionRes.reachable,
      };

      setLastEvent(resetEvent);
      setEventHistory((prev) => [resetEvent, ...prev]);
      setSelectedHistoryIndex(0);
      setSelectedNode(null);
      setSelectedEdge(null);
    } catch (err: any) {
      setSessionError(err?.message || 'Failed to reset network.');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // Handler: Update Endpoints
  const handleUpdateEndpoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || isUpdatingEndpoints) return;

    setIsUpdatingEndpoints(true);
    setSessionError(null);

    try {
      const updated = await api.updateEndpoints(session.session_id, {
        source: sourceInput,
        destination: destInput,
      });
      setSession(updated);
      setSelectedNode(null);
      setSelectedEdge(null);
    } catch (err: any) {
      setSessionError(err?.message || 'Failed to update endpoints.');
    } finally {
      setIsUpdatingEndpoints(false);
    }
  };

  // Handler: Switch Topology
  const handleSwitchTopology = (newType: 'demo' | 'experiment') => {
    if (session?.topology_type === newType) return;
    setEventHistory([]);
    setLastEvent(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    initializeSession(newType);
  };

  const copySessionId = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.session_id);
    setCopiedSessionId(true);
    setTimeout(() => setCopiedSessionId(false), 2000);
  };

  return (
    <AppShell
      title="Interactive Network Laboratory"
      subtitle="Real-time soft-computing workbench for topology inspection, chaos injection, and adaptive self-healing."
    >
      <div className="space-y-6">
        {/* TOP STATUS & CONTROL STRIP */}
        <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-4 space-y-3 shadow-md">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Left: Session ID and Topology selector */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Session ID Pill */}
              <div className="flex items-center gap-2 bg-nexus-950 px-3 py-1.5 rounded-xl border border-nexus-800 text-xs font-mono">
                <span className="text-nexus-500">Session:</span>
                <span className="text-accent-cyan font-bold truncate max-w-[140px] sm:max-w-[200px]">
                  {session?.session_id || 'Initializing...'}
                </span>
                <button
                  onClick={copySessionId}
                  className="text-nexus-400 hover:text-white transition-colors"
                  title="Copy session UUID"
                >
                  {copiedSessionId ? (
                    <Check className="w-3.5 h-3.5 text-accent-emerald" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Topology Selector Buttons */}
              <div className="flex items-center gap-1 bg-nexus-950 p-1 rounded-xl border border-nexus-800 text-xs font-mono">
                <button
                  onClick={() => handleSwitchTopology('demo')}
                  className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                    session?.topology_type === 'demo'
                      ? 'bg-nexus-850 text-accent-cyan border border-nexus-700 font-bold shadow-sm'
                      : 'text-nexus-400 hover:text-nexus-200'
                  }`}
                >
                  Demo (8 Routers)
                </button>
                <button
                  onClick={() => handleSwitchTopology('experiment')}
                  className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                    session?.topology_type === 'experiment'
                      ? 'bg-nexus-850 text-accent-cyan border border-nexus-700 font-bold shadow-sm'
                      : 'text-nexus-400 hover:text-nexus-200'
                  }`}
                >
                  Experiment (25 Routers)
                </button>
              </div>
            </div>

            {/* Right: Endpoints & Reset */}
            <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
              {/* Endpoints Quick Form */}
              {session && (
                <form
                  onSubmit={handleUpdateEndpoints}
                  className="flex items-center gap-2 text-xs font-mono bg-nexus-950 p-1.5 rounded-xl border border-nexus-800"
                >
                  <span className="text-nexus-500">Endpoints:</span>
                  <input
                    type="number"
                    value={sourceInput}
                    onChange={(e) => setSourceInput(parseInt(e.target.value) || 0)}
                    min={0}
                    max={session.topology_type === 'demo' ? 7 : 24}
                    className="w-12 px-1.5 py-0.5 rounded bg-nexus-900 border border-nexus-800 text-accent-emerald text-center font-bold focus:outline-none"
                    title="Source Router ID"
                  />
                  <ArrowRight className="w-3 h-3 text-nexus-500" />
                  <input
                    type="number"
                    value={destInput}
                    onChange={(e) => setDestInput(parseInt(e.target.value) || 0)}
                    min={0}
                    max={session.topology_type === 'demo' ? 7 : 24}
                    className="w-12 px-1.5 py-0.5 rounded bg-nexus-900 border border-nexus-800 text-accent-violet text-center font-bold focus:outline-none"
                    title="Destination Router ID"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingEndpoints}
                    className="px-2 py-0.5 rounded bg-nexus-850 text-nexus-200 hover:text-accent-cyan transition-colors"
                  >
                    {isUpdatingEndpoints ? '...' : 'Set'}
                  </button>
                </form>
              )}

              {/* Reset Network Button */}
              <button
                onClick={handleResetNetwork}
                disabled={isSubmittingEvent}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono bg-nexus-950 border border-nexus-800 text-nexus-300 hover:text-white hover:border-nexus-700 transition-all shadow-sm disabled:opacity-50"
                title="Restore nominal graph state and ACO pheromones"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubmittingEvent ? 'animate-spin' : ''}`} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Active Route Strip */}
          {session && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-nexus-850 text-xs font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-nexus-400">Active Transmission Path:</span>
                {session.current_route.length > 0 ? (
                  <div className="flex items-center gap-1 bg-nexus-950 px-2.5 py-1 rounded-lg border border-nexus-800 font-bold text-nexus-100">
                    {session.current_route.map((nodeId, idx) => (
                      <React.Fragment key={nodeId}>
                        <span
                          className={
                            nodeId === session.source
                              ? 'text-accent-emerald'
                              : nodeId === session.destination
                              ? 'text-accent-violet'
                              : 'text-accent-cyan'
                          }
                        >
                          R{nodeId}
                        </span>
                        {idx < session.current_route.length - 1 && (
                          <span className="text-nexus-600">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-accent-coral-subtle border border-accent-coral/30 text-accent-coral font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>DESTINATION UNREACHABLE</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-nexus-400 text-[11px]">
                <div>
                  Latency:{' '}
                  <span className="text-nexus-100 font-bold">
                    {session.metrics.latency_ms?.toFixed(1) ?? 'N/A'} ms
                  </span>
                </div>
                <div>
                  Loss:{' '}
                  <span className="text-nexus-100 font-bold">
                    {session.metrics.packet_loss_percent?.toFixed(1) ?? 'N/A'}%
                  </span>
                </div>
                <div>
                  Cost:{' '}
                  <span className="text-accent-violet font-bold">
                    {session.current_route_cost?.toFixed(3) ?? 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Error Alert */}
        {sessionError && (
          <div className="p-4 rounded-xl bg-accent-coral-subtle border border-accent-coral/40 text-accent-coral text-xs flex items-start gap-2.5 font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Engine Communication Error</strong>
              <span>{sessionError}</span>
            </div>
          </div>
        )}

        {/* MAIN WORKSPACE GRID */}
        {loadingSession ? (
          <div className="h-96 rounded-2xl bg-nexus-900/60 border border-nexus-800 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-accent-cyan border-t-transparent animate-spin" />
            <p className="font-mono text-xs text-nexus-400">
              Initializing isolated session with FastAPI backend...
            </p>
          </div>
        ) : session && session.topology ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Interactive Topology Graph */}
            <div className="lg:col-span-7 space-y-3">
              <NetworkGraph
                topology={session.topology}
                currentRoute={session.current_route}
                source={session.source}
                destination={session.destination}
                selectedNode={selectedNode}
                selectedEdge={selectedEdge}
                onSelectNode={(id) => {
                  setSelectedNode(id);
                  setSelectedEdge(null);
                  setSideTab('inspector');
                }}
                onSelectEdge={(edge) => {
                  setSelectedEdge(edge);
                  setSelectedNode(null);
                  setSideTab('inspector');
                }}
              />

              <div className="flex items-center justify-between text-[11px] font-mono text-nexus-500 px-1">
                <span>
                  Tip: Click routers or links to inspect telemetry or apply targeted chaos.
                </span>
                <span>
                  Nodes: {session.topology.num_nodes} | Links: {session.topology.num_edges}
                </span>
              </div>
            </div>

            {/* Right 5 Columns: Side Panel (Inspector & Event Controls) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Tab Switcher */}
              <div className="flex items-center justify-between bg-nexus-900 border border-nexus-800 p-1 rounded-xl text-xs font-mono">
                <button
                  onClick={() => setSideTab('inspector')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    sideTab === 'inspector'
                      ? 'bg-nexus-850 text-accent-cyan font-bold shadow-sm'
                      : 'text-nexus-400 hover:text-nexus-200'
                  }`}
                >
                  Telemetry & Inspector
                </button>
                <button
                  onClick={() => setSideTab('controls')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    sideTab === 'controls'
                      ? 'bg-nexus-850 text-accent-cyan font-bold shadow-sm'
                      : 'text-nexus-400 hover:text-nexus-200'
                  }`}
                >
                  Event & Chaos Controls
                </button>
              </div>

              {/* Inspector Tab */}
              {sideTab === 'inspector' && (
                <InspectorPanel
                  session={session}
                  selectedNode={selectedNode}
                  selectedEdge={selectedEdge}
                  onClearSelection={() => {
                    setSelectedNode(null);
                    setSelectedEdge(null);
                  }}
                />
              )}

              {/* Event Controls Tab */}
              {sideTab === 'controls' && (
                <EventControls
                  session={session}
                  selectedNode={selectedNode}
                  selectedEdge={selectedEdge}
                  onApplyEvent={handleApplyEvent}
                  onResetNetwork={handleResetNetwork}
                  isSubmitting={isSubmittingEvent}
                />
              )}
            </div>
          </div>
        ) : null}

        {/* BOTTOM PANELS: DECISION PLAYBACK & EVENT HISTORY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Decision Playback (6 cols) */}
          <div className="lg:col-span-6">
            <DecisionPanel
              lastEvent={lastEvent}
              isSubmitting={isSubmittingEvent}
            />
          </div>

          {/* Chronological Event History (6 cols) */}
          <div className="lg:col-span-6">
            <EventHistory
              events={eventHistory}
              onSelectEvent={(ev) => {
                setLastEvent(ev);
                const idx = eventHistory.indexOf(ev);
                setSelectedHistoryIndex(idx >= 0 ? idx : null);
              }}
              selectedEventIndex={selectedHistoryIndex}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
};
