import React, { useState } from 'react';
import type { SessionResponse, EventRequest } from '../../api/types';
import {
  Zap,
  AlertTriangle,
  RefreshCw,
  Power,
  TrendingUp,
  Percent,
  Clock,
} from 'lucide-react';

interface EventControlsProps {
  session: SessionResponse;
  selectedNode: number | null;
  selectedEdge: [number, number] | null;
  onApplyEvent: (req: EventRequest) => Promise<void>;
  onResetNetwork: () => Promise<void>;
  isSubmitting: boolean;
}

export const EventControls: React.FC<EventControlsProps> = ({
  session,
  selectedNode,
  selectedEdge,
  onApplyEvent,
  onResetNetwork,
  isSubmitting,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'router' | 'compound'>('link');

  // Link event parameters
  const [targetEdge, setTargetEdge] = useState<string>(
    selectedEdge ? `${Math.min(selectedEdge[0], selectedEdge[1])}-${Math.max(selectedEdge[0], selectedEdge[1])}` : '0-1'
  );
  const [congestionAmount, setCongestionAmount] = useState<number>(30);
  const [latencyMultiplier, setLatencyMultiplier] = useState<number>(2.5);
  const [lossAmount, setLossAmount] = useState<number>(5);

  // Router event parameters
  const [targetNode, setTargetNode] = useState<number>(
    selectedNode !== null ? selectedNode : 1
  );

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Keep targetEdge in sync if selectedEdge changes externally
  React.useEffect(() => {
    if (selectedEdge) {
      setTargetEdge(`${Math.min(selectedEdge[0], selectedEdge[1])}-${Math.max(selectedEdge[0], selectedEdge[1])}`);
      setActiveTab('link');
    }
  }, [selectedEdge]);

  // Keep targetNode in sync if selectedNode changes externally
  React.useEffect(() => {
    if (selectedNode !== null) {
      setTargetNode(selectedNode);
      setActiveTab('router');
    }
  }, [selectedNode]);

  const parseEdgeString = (str: string): [number, number] => {
    const parts = str.split('-').map(Number);
    return [parts[0], parts[1]];
  };

  // Handlers for Link Events
  const handleApplyCongestion = () => {
    const edge = parseEdgeString(targetEdge);
    onApplyEvent({
      event_type: 'congestion',
      edges: [edge],
      amount: congestionAmount,
    });
  };

  const handleApplyLatency = () => {
    const edge = parseEdgeString(targetEdge);
    onApplyEvent({
      event_type: 'latency',
      edges: [edge],
      multiplier: latencyMultiplier,
    });
  };

  const handleApplyLoss = () => {
    const edge = parseEdgeString(targetEdge);
    onApplyEvent({
      event_type: 'packet_loss',
      edges: [edge],
      amount: lossAmount,
    });
  };

  const handleToggleLink = (disable: boolean) => {
    const edge = parseEdgeString(targetEdge);
    if (disable) {
      setConfirmModal({
        open: true,
        title: `Cut Physical Link (${edge[0]} ↔ ${edge[1]})?`,
        description: `This simulates a fiber cut. Traffic will immediately fail if this link is on the active route, forcing the engine to search for a bypass.`,
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, open: false }));
          onApplyEvent({
            event_type: 'link_failure',
            edge,
          });
        },
      });
    } else {
      onApplyEvent({
        event_type: 'link_restoration',
        edge,
      });
    }
  };

  // Handlers for Router Events
  const handleToggleRouter = (disable: boolean) => {
    if (disable) {
      const isSrcOrDst = targetNode === session.source || targetNode === session.destination;
      setConfirmModal({
        open: true,
        title: `Crash Router R${targetNode}?`,
        description: isSrcOrDst
          ? `WARNING: Router R${targetNode} is the active ${targetNode === session.source ? 'SOURCE' : 'DESTINATION'}. Disabling it will cause total unreachability until restored.`
          : `This will disable Router R${targetNode} and sever all its incident links. The adaptive engine will attempt to route around it.`,
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, open: false }));
          onApplyEvent({
            event_type: 'router_failure',
            node: targetNode,
          });
        },
      });
    } else {
      onApplyEvent({
        event_type: 'router_restoration',
        node: targetNode,
      });
    }
  };

  // Handler for Compound Stress Event
  const handleApplyCompound = () => {
    setConfirmModal({
      open: true,
      title: 'Apply Compound Chaos Scenario?',
      description:
        'Injects simultaneous congestion (+40%), latency spike (2.5x), packet loss (+8%), and cuts an active link to test swarm self-healing resilience.',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        // Select edges from current route if available
        const currentRoute = session.current_route;
        let cEdge: [number, number] = [0, 1];
        let lEdge: [number, number] = [1, 2];
        let fLink: [number, number] = [2, 4];

        if (currentRoute.length >= 3) {
          cEdge = [currentRoute[0], currentRoute[1]];
          lEdge = [currentRoute[1], currentRoute[2]];
          if (currentRoute.length >= 4) {
            fLink = [currentRoute[2], currentRoute[3]];
          }
        }

        onApplyEvent({
          event_type: 'combined',
          congestion_edges: [cEdge],
          latency_edges: [lEdge],
          failed_link: fLink,
        });
      },
    });
  };

  const currentEdgeDisabled = () => {
    const edge = parseEdgeString(targetEdge);
    const u = Math.min(edge[0], edge[1]);
    const v = Math.max(edge[0], edge[1]);
    const found = session.topology?.edges.find(
      (e) => Math.min(e.source, e.target) === u && Math.max(e.source, e.target) === v
    );
    return found ? !found.enabled : false;
  };

  const currentNodeDisabled = () => {
    const found = session.topology?.nodes.find((n) => n.id === targetNode);
    return found ? !found.enabled : false;
  };

  return (
    <div className="rounded-2xl bg-nexus-900/90 border border-nexus-800 p-5 space-y-4">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-nexus-800 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent-cyan" />
          <h3 className="font-semibold text-sm text-nexus-100">
            Chaos & Event Injection
          </h3>
        </div>
        <div className="flex items-center gap-1 bg-nexus-950 p-0.5 rounded-lg border border-nexus-800 text-[11px] font-mono">
          <button
            onClick={() => setActiveTab('link')}
            className={`px-2 py-1 rounded transition-colors ${
              activeTab === 'link'
                ? 'bg-nexus-850 text-accent-cyan font-bold'
                : 'text-nexus-400 hover:text-nexus-200'
            }`}
          >
            Link Events
          </button>
          <button
            onClick={() => setActiveTab('router')}
            className={`px-2 py-1 rounded transition-colors ${
              activeTab === 'router'
                ? 'bg-nexus-850 text-accent-cyan font-bold'
                : 'text-nexus-400 hover:text-nexus-200'
            }`}
          >
            Router Events
          </button>
          <button
            onClick={() => setActiveTab('compound')}
            className={`px-2 py-1 rounded transition-colors ${
              activeTab === 'compound'
                ? 'bg-nexus-850 text-accent-violet font-bold'
                : 'text-nexus-400 hover:text-nexus-200'
            }`}
          >
            Compound
          </button>
        </div>
      </div>

      {/* TAB 1: LINK EVENTS */}
      {activeTab === 'link' && (
        <div className="space-y-4 text-xs font-mono">
          {/* Edge Selector */}
          <div className="space-y-1">
            <label className="text-nexus-400 block text-[11px]">
              Target Link (u ↔ v):
            </label>
            <select
              value={targetEdge}
              onChange={(e) => setTargetEdge(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-nexus-950 border border-nexus-800 text-nexus-200 font-mono focus:border-accent-cyan focus:outline-none"
            >
              {session.topology?.edges.map((e) => {
                const u = Math.min(e.source, e.target);
                const v = Math.max(e.source, e.target);
                const isRoute = e.on_route ? ' [ON ROUTE]' : '';
                const isCut = !e.enabled ? ' [CUT]' : '';
                return (
                  <option key={`${u}-${v}`} value={`${u}-${v}`}>
                    Link ({u} ↔ {v}) — {e.latency}ms{isRoute}{isCut}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quick Event Buttons */}
          <div className="space-y-3 pt-1">
            {/* Congestion Surge */}
            <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-850 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-nexus-300 font-semibold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-accent-amber" />
                  <span>Queue Congestion Surge</span>
                </span>
                <span className="text-accent-amber font-bold">
                  +{congestionAmount}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={congestionAmount}
                onChange={(e) => setCongestionAmount(parseInt(e.target.value))}
                className="w-full accent-accent-amber cursor-pointer"
              />
              <button
                onClick={handleApplyCongestion}
                disabled={isSubmitting || currentEdgeDisabled()}
                className="w-full py-1.5 rounded-lg bg-accent-amber-subtle border border-accent-amber/40 text-accent-amber font-semibold hover:bg-accent-amber/20 transition-all disabled:opacity-40"
              >
                Apply Congestion Surge (+{congestionAmount}%)
              </button>
            </div>

            {/* Latency Spike */}
            <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-850 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-nexus-300 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Latency Spike Multiplier</span>
                </span>
                <span className="text-accent-cyan font-bold">
                  {latencyMultiplier.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="1.5"
                max="5.0"
                step="0.5"
                value={latencyMultiplier}
                onChange={(e) => setLatencyMultiplier(parseFloat(e.target.value))}
                className="w-full accent-accent-cyan cursor-pointer"
              />
              <button
                onClick={handleApplyLatency}
                disabled={isSubmitting || currentEdgeDisabled()}
                className="w-full py-1.5 rounded-lg bg-accent-cyan-subtle border border-accent-cyan/40 text-accent-cyan font-semibold hover:bg-accent-cyan/20 transition-all disabled:opacity-40"
              >
                Apply Latency Spike ({latencyMultiplier.toFixed(1)}x)
              </button>
            </div>

            {/* Packet Loss Increase */}
            <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-850 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-nexus-300 font-semibold flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-accent-coral" />
                  <span>Packet Loss Surge</span>
                </span>
                <span className="text-accent-coral font-bold">+{lossAmount}%</span>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                step="1"
                value={lossAmount}
                onChange={(e) => setLossAmount(parseInt(e.target.value))}
                className="w-full accent-accent-coral cursor-pointer"
              />
              <button
                onClick={handleApplyLoss}
                disabled={isSubmitting || currentEdgeDisabled()}
                className="w-full py-1.5 rounded-lg bg-accent-coral-subtle border border-accent-coral/40 text-accent-coral font-semibold hover:bg-accent-coral/20 transition-all disabled:opacity-40"
              >
                Apply Loss Surge (+{lossAmount}%)
              </button>
            </div>

            {/* Link Failure / Restoration */}
            <div className="pt-1 flex gap-2">
              {!currentEdgeDisabled() ? (
                <button
                  onClick={() => handleToggleLink(true)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 rounded-lg bg-nexus-950 border border-accent-coral/40 text-accent-coral font-semibold hover:bg-accent-coral-subtle transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Cut Link ({targetEdge})</span>
                </button>
              ) : (
                <button
                  onClick={() => handleToggleLink(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 rounded-lg bg-nexus-950 border border-accent-emerald/40 text-accent-emerald font-semibold hover:bg-accent-emerald-subtle transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restore Link ({targetEdge})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROUTER EVENTS */}
      {activeTab === 'router' && (
        <div className="space-y-4 text-xs font-mono">
          <div className="space-y-1">
            <label className="text-nexus-400 block text-[11px]">
              Target Router:
            </label>
            <select
              value={targetNode}
              onChange={(e) => setTargetNode(parseInt(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg bg-nexus-950 border border-nexus-800 text-nexus-200 font-mono focus:border-accent-cyan focus:outline-none"
            >
              {session.topology?.nodes.map((n) => {
                const isSrc = n.id === session.source ? ' [SOURCE]' : '';
                const isDst = n.id === session.destination ? ' [DEST]' : '';
                const isOff = !n.enabled ? ' [OFFLINE]' : '';
                return (
                  <option key={n.id} value={n.id}>
                    Router R{n.id}{isSrc}{isDst}{isOff}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-850 space-y-3">
            <span className="text-[11px] font-semibold text-nexus-200 block">
              Router Failure / Reboot Control
            </span>
            <p className="text-[11px] text-nexus-400 leading-relaxed font-sans">
              Crashing a router excludes all its incident edges simultaneously. The engine immediately flags topological invalidation.
            </p>

            {!currentNodeDisabled() ? (
              <button
                onClick={() => handleToggleRouter(true)}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-nexus-950 border border-accent-coral text-accent-coral font-semibold hover:bg-accent-coral-subtle transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Power className="w-4 h-4" />
                <span>Crash Router R{targetNode}</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggleRouter(false)}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-nexus-950 border border-accent-emerald text-accent-emerald font-semibold hover:bg-accent-emerald-subtle transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reboot Router R{targetNode}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COMPOUND SCENARIO */}
      {activeTab === 'compound' && (
        <div className="space-y-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-nexus-950 border border-accent-violet/30 space-y-3">
            <span className="text-accent-violet font-bold text-sm block">
              Multi-Vector Chaos Injection
            </span>
            <p className="text-[11px] text-nexus-400 leading-relaxed font-sans">
              Injects simultaneous congestion, latency spikes, and a physical link break on active hops to evaluate ACO swarm adaptation under maximum operational stress.
            </p>
            <button
              onClick={handleApplyCompound}
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent-violet to-accent-cyan text-nexus-950 font-bold hover:opacity-95 transition-all shadow-md shadow-accent-violet/20 disabled:opacity-40"
            >
              Inject Compound Stress Scenario
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={onResetNetwork}
              disabled={isSubmitting}
              className="w-full py-2 rounded-lg bg-nexus-950 border border-nexus-750 text-nexus-300 font-semibold hover:text-white hover:border-nexus-600 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Entire Network to Baseline</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-nexus-900 border border-accent-coral/60 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-accent-coral font-bold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{confirmModal.title}</span>
            </div>
            <p className="text-xs text-nexus-300 leading-relaxed">
              {confirmModal.description}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-lg text-xs font-mono bg-nexus-950 border border-nexus-800 text-nexus-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded-lg text-xs font-mono bg-accent-coral text-white font-bold hover:bg-red-600 transition-colors"
              >
                Confirm Cut
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
