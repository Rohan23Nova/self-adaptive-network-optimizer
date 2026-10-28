import React from 'react';
import type { EventResponse } from '../../api/types';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Cpu,
  ShieldAlert,
} from 'lucide-react';

interface DecisionPanelProps {
  lastEvent: EventResponse | null;
  isSubmitting: boolean;
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({
  lastEvent,
  isSubmitting,
}) => {
  if (isSubmitting) {
    return (
      <div className="rounded-2xl bg-nexus-900/90 border border-accent-cyan/40 p-6 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent-cyan border-t-transparent animate-spin" />
        <div className="space-y-1">
          <h4 className="font-mono text-sm font-bold text-nexus-100">
            Adaptive Engine Evaluating QoS Telemetry...
          </h4>
          <p className="text-xs text-nexus-400 font-mono">
            Probing Mamdani fuzzy link quality & running swarm path verification.
          </p>
        </div>
      </div>
    );
  }

  if (!lastEvent) {
    return (
      <div className="rounded-2xl bg-nexus-900/40 border border-dashed border-nexus-800 p-6 text-center space-y-2 text-xs text-nexus-500 font-mono">
        <Cpu className="w-6 h-6 mx-auto text-nexus-600" />
        <p>No event applied in current session.</p>
        <p className="text-[11px] text-nexus-600">
          Inject an event from the panel above to observe the closed-loop adaptive decision sequence.
        </p>
      </div>
    );
  }

  const isTriggered = lastEvent.triggered;
  const isUnreachable = lastEvent.unreachable;
  const isRouteChanged = lastEvent.route_changed;

  // Format natural language narrative explanation
  const getNarrativeExplanation = () => {
    if (isUnreachable) {
      return `Destination isolation detected. All potential multi-hop physical paths between the endpoints are severed. The engine flagged unreachability in ${lastEvent.processing_time_ms.toFixed(2)} ms and purged active route transmission.`;
    }

    if (lastEvent.event_name === 'reset') {
      return 'Session was reset to baseline nominal parameters. Original graph state and ACO pheromones restored.';
    }

    if (lastEvent.trigger_reason.includes('link_failure') || lastEvent.trigger_reason.includes('router_failure')) {
      return `Topological invalidation detected on active path (${lastEvent.trigger_reason}). The adaptive controller immediately initiated an emergency ACO swarm reroute in ${lastEvent.processing_time_ms.toFixed(2)} ms, discovering a healthy alternate bypass in ${lastEvent.reroute_time_ms.toFixed(2)} ms.`;
    }

    if (isTriggered) {
      return `Quality degradation triggered autonomous rerouting (${lastEvent.trigger_reason}). Link health fell beyond tolerance thresholds. The swarm discovered a Pareto-superior alternative route, swapping the active transmission path in ${lastEvent.reroute_time_ms.toFixed(2)} ms.`;
    }

    return `The engine evaluated the event in ${lastEvent.processing_time_ms.toFixed(2)} ms and determined that quality degradation remained below defined tolerance thresholds (${lastEvent.trigger_reason}). The current route was intentionally preserved to prevent unnecessary route flapping.`;
  };

  return (
    <div className="rounded-2xl bg-nexus-900/90 border border-nexus-800 p-6 space-y-5">
      {/* Top status bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-nexus-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isUnreachable
                ? 'bg-accent-coral/20 text-accent-coral border border-accent-coral/30'
                : isTriggered
                ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                : 'bg-accent-amber/20 text-accent-amber border border-accent-amber/30'
            }`}
          >
            {isUnreachable ? (
              <ShieldAlert className="w-4 h-4" />
            ) : isTriggered ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-nexus-100 uppercase tracking-tight">
                {isUnreachable
                  ? 'Destination Unreachable'
                  : isTriggered
                  ? 'Adaptive Reroute Triggered'
                  : 'Change Tolerated (Below Threshold)'}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                  isUnreachable
                    ? 'bg-accent-coral-subtle text-accent-coral border border-accent-coral/20'
                    : isTriggered
                    ? 'bg-accent-emerald-subtle text-accent-emerald border border-accent-emerald/20'
                    : 'bg-accent-amber-subtle text-accent-amber border border-accent-amber/20'
                }`}
              >
                {lastEvent.event_name.toUpperCase()}
              </span>
            </div>
            <span className="text-xs font-mono text-nexus-500">
              Trigger Reason: {lastEvent.trigger_reason}
            </span>
          </div>
        </div>

        {/* Latency timing badge */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-nexus-950 px-2.5 py-1 rounded-lg border border-nexus-800 text-nexus-300">
            <span className="text-nexus-500">Processing: </span>
            <span className="text-accent-cyan font-bold">
              {lastEvent.processing_time_ms.toFixed(2)} ms
            </span>
          </div>
          {lastEvent.reroute_time_ms > 0 && (
            <div className="bg-nexus-950 px-2.5 py-1 rounded-lg border border-nexus-800 text-nexus-300">
              <span className="text-nexus-500">Reroute: </span>
              <span className="text-accent-violet font-bold">
                {lastEvent.reroute_time_ms.toFixed(2)} ms
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Narrative Explanation */}
      <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-850 space-y-1.5">
        <span className="text-[10px] uppercase font-mono font-semibold text-accent-cyan tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Adaptive Explainability Diagnosis</span>
        </span>
        <p className="text-xs text-nexus-300 leading-relaxed font-sans">
          {getNarrativeExplanation()}
        </p>
      </div>

      {/* Quantitative Before vs After Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        {/* Route Path */}
        <div className="col-span-2 sm:col-span-4 p-3 rounded-xl bg-nexus-950 border border-nexus-850 space-y-1">
          <span className="text-[10px] uppercase text-nexus-500 font-semibold block">
            Transmission Route Transition
          </span>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="text-nexus-400">
              Before:{' '}
              <span className="text-nexus-200 font-semibold">
                {lastEvent.previous_route.length > 0
                  ? lastEvent.previous_route.join(' → ')
                  : 'None'}
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
            <div className="text-nexus-400">
              After:{' '}
              <span
                className={`font-semibold ${
                  isRouteChanged ? 'text-accent-cyan' : 'text-nexus-200'
                }`}
              >
                {lastEvent.new_route.length > 0
                  ? lastEvent.new_route.join(' → ')
                  : 'Unreachable'}
              </span>
            </div>
          </div>
        </div>

        {/* Latency */}
        <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-850 space-y-1">
          <span className="text-[10px] uppercase text-nexus-500 font-semibold block">
            Latency (ms)
          </span>
          <div className="text-nexus-200">
            {lastEvent.previous_metrics.latency_ms?.toFixed(1) ?? 'N/A'} →{' '}
            <span className="font-bold text-nexus-100">
              {lastEvent.new_metrics.latency_ms?.toFixed(1) ?? 'N/A'}
            </span>
          </div>
          {lastEvent.performance_delta?.latency_ms !== undefined &&
            lastEvent.performance_delta?.latency_ms !== null && (
              <span
                className={`text-[10px] block ${
                  lastEvent.performance_delta.latency_ms > 0
                    ? 'text-accent-coral'
                    : 'text-accent-emerald'
                }`}
              >
                {lastEvent.performance_delta.latency_ms > 0 ? '+' : ''}
                {lastEvent.performance_delta.latency_ms.toFixed(1)} ms
              </span>
            )}
        </div>

        {/* Packet Loss */}
        <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-850 space-y-1">
          <span className="text-[10px] uppercase text-nexus-500 font-semibold block">
            Loss Rate (%)
          </span>
          <div className="text-nexus-200">
            {lastEvent.previous_metrics.packet_loss_percent?.toFixed(1) ?? 'N/A'}% →{' '}
            <span className="font-bold text-nexus-100">
              {lastEvent.new_metrics.packet_loss_percent?.toFixed(1) ?? 'N/A'}%
            </span>
          </div>
          {lastEvent.performance_delta?.packet_loss_percent !== undefined &&
            lastEvent.performance_delta?.packet_loss_percent !== null && (
              <span
                className={`text-[10px] block ${
                  lastEvent.performance_delta.packet_loss_percent > 0
                    ? 'text-accent-coral'
                    : 'text-accent-emerald'
                }`}
              >
                {lastEvent.performance_delta.packet_loss_percent > 0 ? '+' : ''}
                {lastEvent.performance_delta.packet_loss_percent.toFixed(2)}%
              </span>
            )}
        </div>

        {/* Bandwidth */}
        <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-850 space-y-1">
          <span className="text-[10px] uppercase text-nexus-500 font-semibold block">
            Bandwidth (Mbps)
          </span>
          <div className="text-nexus-200">
            {lastEvent.previous_metrics.bandwidth_mbps?.toFixed(1) ?? 'N/A'} →{' '}
            <span className="font-bold text-nexus-100">
              {lastEvent.new_metrics.bandwidth_mbps?.toFixed(1) ?? 'N/A'}
            </span>
          </div>
        </div>

        {/* Route Cost */}
        <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-850 space-y-1">
          <span className="text-[10px] uppercase text-nexus-500 font-semibold block">
            Fuzzy Cost
          </span>
          <div className="text-nexus-200">
            {lastEvent.previous_route_cost?.toFixed(3) ?? 'N/A'} →{' '}
            <span className="font-bold text-accent-violet">
              {lastEvent.new_route_cost?.toFixed(3) ?? 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
