import React from 'react';
import type { SessionResponse, EdgeModel } from '../../api/types';
import {
  Activity,
  Layers,
  AlertCircle,
  CheckCircle2,
  X,
  Gauge,
  Wifi,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface InspectorPanelProps {
  session: SessionResponse;
  selectedNode: number | null;
  selectedEdge: [number, number] | null;
  onClearSelection: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  session,
  selectedNode,
  selectedEdge,
  onClearSelection,
}) => {
  const topology = session.topology;

  // Find selected node details
  const nodeDetail =
    selectedNode !== null
      ? topology?.nodes.find((n) => n.id === selectedNode)
      : null;

  // Find incident links for selected node
  const nodeIncidentEdges =
    selectedNode !== null && topology
      ? topology.edges.filter(
          (e) => e.source === selectedNode || e.target === selectedNode
        )
      : [];

  // Find selected edge details
  let edgeDetail: EdgeModel | null = null;
  if (selectedEdge !== null && topology) {
    const u = Math.min(selectedEdge[0], selectedEdge[1]);
    const v = Math.max(selectedEdge[0], selectedEdge[1]);
    edgeDetail =
      topology.edges.find(
        (e) =>
          Math.min(e.source, e.target) === u &&
          Math.max(e.source, e.target) === v
      ) || null;
  }

  return (
    <div className="rounded-2xl bg-nexus-900/90 border border-nexus-800 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-nexus-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent-cyan" />
          <h3 className="font-semibold text-sm text-nexus-100">
            {selectedNode !== null
              ? `Router R${selectedNode} Telemetry`
              : selectedEdge !== null
              ? `Link (${selectedEdge[0]} ↔ ${selectedEdge[1]}) Telemetry`
              : 'Network Telemetry Overview'}
          </h3>
        </div>
        {(selectedNode !== null || selectedEdge !== null) && (
          <button
            onClick={onClearSelection}
            className="p-1 rounded text-nexus-500 hover:text-nexus-200 hover:bg-nexus-800 transition-colors"
            title="Clear Selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Case 1: Router Selected */}
      {selectedNode !== null && nodeDetail && (
        <div className="space-y-4 text-xs font-mono">
          <div className="space-y-2">
            <div className="flex justify-between py-1 border-b border-nexus-850">
              <span className="text-nexus-500">Router ID:</span>
              <span className="text-nexus-100 font-bold">R{nodeDetail.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-nexus-850">
              <span className="text-nexus-500">Role:</span>
              <span
                className={`uppercase font-semibold ${
                  nodeDetail.role === 'source'
                    ? 'text-accent-emerald'
                    : nodeDetail.role === 'destination'
                    ? 'text-accent-violet'
                    : 'text-nexus-300'
                }`}
              >
                {nodeDetail.role}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-nexus-850">
              <span className="text-nexus-500">Operating Status:</span>
              <span
                className={`font-semibold flex items-center gap-1 ${
                  nodeDetail.enabled ? 'text-accent-emerald' : 'text-accent-coral'
                }`}
              >
                {nodeDetail.enabled ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>ACTIVE</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>DISABLED</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-nexus-850">
              <span className="text-nexus-500">Incident Links:</span>
              <span className="text-nexus-200">{nodeDetail.incident_links}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-nexus-500">On Active Route:</span>
              <span
                className={
                  session.current_route.includes(nodeDetail.id)
                    ? 'text-accent-cyan font-bold'
                    : 'text-nexus-500'
                }
              >
                {session.current_route.includes(nodeDetail.id) ? 'YES' : 'NO'}
              </span>
            </div>
          </div>

          {/* Connected Links Preview */}
          <div className="space-y-1.5 pt-2 border-t border-nexus-800">
            <span className="text-[10px] uppercase text-nexus-500 font-semibold block">
              Connected Neighbor Links ({nodeIncidentEdges.length})
            </span>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {nodeIncidentEdges.map((e, idx) => {
                const neighborId = e.source === selectedNode ? e.target : e.source;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded bg-nexus-950 border border-nexus-850 text-[11px]"
                  >
                    <span className="text-nexus-300">
                      R{selectedNode} ↔ R{neighborId}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-nexus-400">{e.latency}ms</span>
                      <span
                        className={`text-[9px] px-1 rounded ${
                          e.enabled
                            ? 'bg-accent-emerald-subtle text-accent-emerald'
                            : 'bg-accent-coral-subtle text-accent-coral'
                        }`}
                      >
                        {e.enabled ? 'OK' : 'CUT'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Case 2: Link Selected */}
      {selectedEdge !== null && edgeDetail && (
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1 border-b border-nexus-850">
            <span className="text-nexus-500">Endpoints:</span>
            <span className="text-nexus-100 font-bold">
              R{edgeDetail.source} ↔ R{edgeDetail.target}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-nexus-850">
            <span className="text-nexus-500">Link Status:</span>
            <span
              className={`font-semibold ${
                edgeDetail.enabled ? 'text-accent-emerald' : 'text-accent-coral'
              }`}
            >
              {edgeDetail.enabled ? 'OPERATIONAL' : 'DISABLED / CUT'}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-nexus-850">
            <span className="text-nexus-500">On Active Route:</span>
            <span
              className={
                edgeDetail.on_route
                  ? 'text-accent-cyan font-bold'
                  : 'text-nexus-500'
              }
            >
              {edgeDetail.on_route ? 'YES (Active Route)' : 'NO'}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-nexus-850">
            <span className="text-nexus-500">Transmission Latency:</span>
            <span className="text-nexus-200">{edgeDetail.latency} ms</span>
          </div>
          <div className="flex justify-between py-1 border-b border-nexus-850">
            <span className="text-nexus-500">Packet Loss Rate:</span>
            <span
              className={
                edgeDetail.packet_loss > 5.0
                  ? 'text-accent-coral font-bold'
                  : 'text-nexus-200'
              }
            >
              {edgeDetail.packet_loss}%
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-nexus-850">
            <span className="text-nexus-500">Bottleneck Bandwidth:</span>
            <span className="text-nexus-200">{edgeDetail.bandwidth} Mbps</span>
          </div>
          <div className="flex justify-between py-1 border-b border-nexus-850">
            <span className="text-nexus-500">Queue Congestion:</span>
            <span
              className={
                edgeDetail.congestion >= 60
                  ? 'text-accent-amber font-bold'
                  : 'text-nexus-200'
              }
            >
              {edgeDetail.congestion}%
            </span>
          </div>
          {edgeDetail.quality !== null && edgeDetail.quality !== undefined && (
            <div className="flex justify-between py-1 border-b border-nexus-850">
              <span className="text-nexus-500">Mamdani Fuzzy Quality:</span>
              <span className="text-accent-cyan font-bold">
                {edgeDetail.quality.toFixed(3)}
              </span>
            </div>
          )}
          {edgeDetail.cost !== null && edgeDetail.cost !== undefined && (
            <div className="flex justify-between py-1">
              <span className="text-nexus-500">Fuzzy Link Cost:</span>
              <span className="text-accent-violet font-bold">
                {edgeDetail.cost.toFixed(3)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Case 3: Overall Active Route Summary (Nothing selected) */}
      {selectedNode === null && selectedEdge === null && (
        <div className="space-y-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-850 space-y-1.5">
            <span className="text-[10px] uppercase text-nexus-500 font-semibold block">
              Active Transmission Path
            </span>
            <div className="flex items-center gap-1.5 flex-wrap text-nexus-100 font-bold text-sm">
              {session.current_route.length > 0 ? (
                session.current_route.map((nodeId, idx) => (
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
                      <ArrowRight className="w-3 h-3 text-nexus-600 inline" />
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span className="text-accent-coral text-xs">
                  No path available (Destination unreachable)
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex justify-between py-1 border-b border-nexus-850">
              <span className="text-nexus-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                <span>End-to-End Latency:</span>
              </span>
              <span className="text-nexus-100 font-bold">
                {session.metrics.latency_ms !== null &&
                session.metrics.latency_ms !== undefined
                  ? `${session.metrics.latency_ms.toFixed(1)} ms`
                  : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-nexus-850">
              <span className="text-nexus-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-accent-coral" />
                <span>Packet Loss Rate:</span>
              </span>
              <span className="text-nexus-100">
                {session.metrics.packet_loss_percent !== null &&
                session.metrics.packet_loss_percent !== undefined
                  ? `${session.metrics.packet_loss_percent.toFixed(2)}%`
                  : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-nexus-850">
              <span className="text-nexus-500 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-accent-emerald" />
                <span>Bottleneck Bandwidth:</span>
              </span>
              <span className="text-nexus-100">
                {session.metrics.bandwidth_mbps !== null &&
                session.metrics.bandwidth_mbps !== undefined
                  ? `${session.metrics.bandwidth_mbps.toFixed(1)} Mbps`
                  : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-nexus-850">
              <span className="text-nexus-500 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-accent-amber" />
                <span>Avg Congestion:</span>
              </span>
              <span className="text-nexus-100">
                {session.metrics.congestion_percent !== null &&
                session.metrics.congestion_percent !== undefined
                  ? `${session.metrics.congestion_percent.toFixed(1)}%`
                  : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-nexus-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent-violet" />
                <span>Cumulative Fuzzy Cost:</span>
              </span>
              <span className="text-accent-violet font-bold">
                {session.current_route_cost !== null &&
                session.current_route_cost !== undefined
                  ? session.current_route_cost.toFixed(3)
                  : 'N/A'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-nexus-500 pt-2 border-t border-nexus-800">
            Click any router or link in the topology to inspect individual link quality and inject localized events.
          </p>
        </div>
      )}
    </div>
  );
};
