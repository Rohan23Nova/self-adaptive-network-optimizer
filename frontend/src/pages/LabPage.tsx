import React, { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { useApiHealth } from '../api/useApiHealth';
import { api } from '../api/client';
import type { SessionResponse, CreateSessionRequest } from '../api/types';
import {
  Server,
  Play,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Radio,
  ExternalLink,
} from 'lucide-react';

export const LabPage: React.FC = () => {
  const { status, data: healthData, refetch: refetchHealth } = useApiHealth(15000);

  // Session form state
  const [topologyType, setTopologyType] = useState<'demo' | 'experiment'>('demo');
  const [source, setSource] = useState<number>(0);
  const [destination, setDestination] = useState<number>(7);
  const [qualityThreshold, setQualityThreshold] = useState<number>(0.15);
  const [costThreshold, setCostThreshold] = useState<number>(0.20);
  const [seed, setSeed] = useState<number>(42);

  // Execution state
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionResponse | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const handleInitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInitializing(true);
    setSessionError(null);

    const payload: CreateSessionRequest = {
      topology_type: topologyType,
      source,
      destination,
      quality_threshold: qualityThreshold,
      cost_threshold: costThreshold,
      seed,
    };

    try {
      const res = await api.createSession(payload);
      setActiveSession(res);
      setSessionError(null);
    } catch (err: any) {
      setSessionError(err?.message || 'Failed to initialize session with backend API.');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <AppShell
      title="Network Laboratory"
      subtitle="Interactive simulation workbench for soft-computing network routing."
    >
      <div className="space-y-8">
        {/* Phase 6 Roadmap Callout */}
        <div className="rounded-2xl bg-gradient-to-r from-nexus-900 via-nexus-850 to-nexus-900 border border-accent-cyan/30 p-5 shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 text-accent-cyan" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-nexus-100">
                    Simulation Workbench Shell — Phase 6 Foundation
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-cyan-subtle text-accent-cyan border border-accent-cyan/20">
                    Phase 6 Active
                  </span>
                </div>
                <p className="text-xs text-nexus-400 leading-relaxed max-w-3xl">
                  This shell connects to the verified FastAPI backend, provisions live simulation sessions, and verifies end-to-end telemetry. The interactive SVG topology canvas, live chaos injection, and ant colony path animations arrive in Phase 7.
                </p>
              </div>
            </div>

            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-nexus-300 hover:text-accent-cyan bg-nexus-900 border border-nexus-750 shrink-0"
            >
              <span>Swagger API Docs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Grid: Live Connection Status & Session Creation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Session Configuration Form (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-nexus-900/90 border border-nexus-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-nexus-800 pb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-accent-cyan" />
                <h3 className="font-semibold text-base text-nexus-100">
                  Initialize Simulation Session
                </h3>
              </div>
              <span className="text-xs font-mono text-nexus-500">
                POST /api/sessions
              </span>
            </div>

            <form onSubmit={handleInitSession} className="space-y-5 text-xs">
              {/* Topology selection */}
              <div className="space-y-2">
                <label className="font-mono text-nexus-300 block font-medium">
                  Network Topology:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTopologyType('demo');
                      setSource(0);
                      setDestination(7);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      topologyType === 'demo'
                        ? 'border-accent-cyan bg-nexus-850 text-nexus-100 shadow-sm'
                        : 'border-nexus-800 bg-nexus-950 text-nexus-400 hover:border-nexus-700'
                    }`}
                  >
                    <div className="font-bold text-sm">Demo Mesh (8 Nodes)</div>
                    <div className="text-[11px] text-nexus-500 mt-0.5">
                      14 links • 0 (Src) to 7 (Dst)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTopologyType('experiment');
                      setSource(0);
                      setDestination(24);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      topologyType === 'experiment'
                        ? 'border-accent-cyan bg-nexus-850 text-nexus-100 shadow-sm'
                        : 'border-nexus-800 bg-nexus-950 text-nexus-400 hover:border-nexus-700'
                    }`}
                  >
                    <div className="font-bold text-sm">Experiment Mesh (25 Nodes)</div>
                    <div className="text-[11px] text-nexus-500 mt-0.5">
                      50+ links • Multi-hop stress
                    </div>
                  </button>
                </div>
              </div>

              {/* Endpoints */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono text-nexus-400 block">Source Router ID:</label>
                  <input
                    type="number"
                    value={source}
                    onChange={(e) => setSource(parseInt(e.target.value) || 0)}
                    min={0}
                    max={topologyType === 'demo' ? 7 : 24}
                    className="w-full px-3 py-2 rounded-lg bg-nexus-950 border border-nexus-800 text-nexus-100 font-mono focus:border-accent-cyan focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-nexus-400 block">
                    Destination Router ID:
                  </label>
                  <input
                    type="number"
                    value={destination}
                    onChange={(e) => setDestination(parseInt(e.target.value) || 0)}
                    min={0}
                    max={topologyType === 'demo' ? 7 : 24}
                    className="w-full px-3 py-2 rounded-lg bg-nexus-950 border border-nexus-800 text-nexus-100 font-mono focus:border-accent-cyan focus:outline-none"
                  />
                </div>
              </div>

              {/* Threshold Sliders */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono">
                    <span className="text-nexus-400">Quality Drop Threshold (ΔQ thresh):</span>
                    <span className="text-accent-cyan font-bold">
                      {(qualityThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.50"
                    step="0.01"
                    value={qualityThreshold}
                    onChange={(e) => setQualityThreshold(parseFloat(e.target.value))}
                    className="w-full accent-accent-cyan bg-nexus-950 cursor-pointer"
                  />
                  <span className="text-[11px] text-nexus-500 block">
                    Triggers ACO swarm rerouting when fuzzy link quality dips by this margin.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono">
                    <span className="text-nexus-400">Cost Degradation Threshold (ΔC thresh):</span>
                    <span className="text-accent-violet font-bold">
                      {(costThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.50"
                    step="0.01"
                    value={costThreshold}
                    onChange={(e) => setCostThreshold(parseFloat(e.target.value))}
                    className="w-full accent-accent-violet bg-nexus-950 cursor-pointer"
                  />
                  <span className="text-[11px] text-nexus-500 block">
                    Triggers rerouting if cumulative route cost inflates beyond this ratio.
                  </span>
                </div>
              </div>

              {/* Random Seed */}
              <div className="space-y-1.5">
                <label className="font-mono text-nexus-400 block">
                  Deterministic Random Seed:
                </label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-nexus-950 border border-nexus-800 text-nexus-100 font-mono focus:border-accent-cyan focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isInitializing}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-accent-cyan to-accent-cyan-hover text-nexus-950 shadow-md shadow-accent-cyan/15 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isInitializing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Contacting FastAPI Engine...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Initialize Simulation Session</span>
                  </>
                )}
              </button>

              {sessionError && (
                <div className="p-3 rounded-lg bg-accent-coral-subtle border border-accent-coral/30 text-accent-coral text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Session Initialization Failed</strong>
                    <span>{sessionError}</span>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Right Column: Engine Telemetry & Active Session (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Backend Telemetry Card */}
            <div className="rounded-2xl bg-nexus-900/90 border border-nexus-800 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-nexus-800 pb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-accent-cyan" />
                  <h3 className="font-semibold text-sm text-nexus-100">
                    FastAPI Engine Telemetry
                  </h3>
                </div>
                <button
                  onClick={() => refetchHealth()}
                  className="text-xs font-mono text-nexus-400 hover:text-accent-cyan flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Probe</span>
                </button>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-nexus-850">
                  <span className="text-nexus-500">Service:</span>
                  <span className="text-nexus-200">
                    {healthData?.app_name || 'NEXUS Network Intelligence API'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-nexus-850">
                  <span className="text-nexus-500">Version:</span>
                  <span className="text-nexus-200">{healthData?.version || '1.0.0'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-nexus-850">
                  <span className="text-nexus-500">Engine Status:</span>
                  <span
                    className={
                      status === 'connected'
                        ? 'text-accent-emerald font-semibold'
                        : 'text-accent-amber font-semibold'
                    }
                  >
                    {status === 'connected' ? '● Connected' : '○ Offline'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-nexus-850">
                  <span className="text-nexus-500">Active Sessions:</span>
                  <span className="text-nexus-200">
                    {healthData?.active_sessions ?? 0}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-nexus-500">Server Timestamp:</span>
                  <span className="text-nexus-400 text-[10px]">
                    {healthData?.timestamp || 'N/A'}
                  </span>
                </div>
              </div>

              {status === 'offline' && (
                <div className="p-3 rounded-lg bg-nexus-950 border border-nexus-800 text-[11px] text-nexus-400 space-y-1.5">
                  <div className="text-accent-amber font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Backend is not responding</span>
                  </div>
                  <p>To run the live algorithmic backend locally:</p>
                  <pre className="p-2 rounded bg-nexus-900 text-nexus-200 font-mono text-[10px] overflow-x-auto">
                    source .venv/bin/activate
                    uvicorn api.main:app --port 8000
                  </pre>
                </div>
              )}
            </div>

            {/* Active Session Card (if created) */}
            {activeSession ? (
              <div className="rounded-2xl bg-nexus-900 border border-accent-cyan/40 p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-nexus-800 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                    <h3 className="font-semibold text-sm text-nexus-100">
                      Active Simulation Session
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-emerald-subtle text-accent-emerald">
                    Ready
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-nexus-500">Session ID:</span>
                    <span className="text-accent-cyan font-bold truncate max-w-[180px]">
                      {activeSession.session_id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nexus-500">Route:</span>
                    <span className="text-nexus-100 font-semibold">
                      {activeSession.current_route.join(' → ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nexus-500">Route Cost:</span>
                    <span className="text-nexus-200">
                      {activeSession.current_route_cost?.toFixed(3) ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nexus-500">Latency:</span>
                    <span className="text-nexus-200">
                      {activeSession.metrics.latency_ms?.toFixed(1) ?? 'N/A'} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nexus-500">Packet Loss:</span>
                    <span className="text-nexus-200">
                      {activeSession.metrics.packet_loss_percent !== undefined
                        ? `${activeSession.metrics.packet_loss_percent}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nexus-500">Congestion:</span>
                    <span className="text-nexus-200">
                      {activeSession.metrics.congestion_percent !== undefined
                        ? `${activeSession.metrics.congestion_percent}%`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-nexus-900/40 border border-dashed border-nexus-800 p-8 text-center space-y-2 text-xs text-nexus-500">
                <Radio className="w-6 h-6 mx-auto text-nexus-600" />
                <p>No active session loaded.</p>
                <p className="text-[11px] text-nexus-600">
                  Configure endpoints and click &quot;Initialize Simulation Session&quot; above.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
