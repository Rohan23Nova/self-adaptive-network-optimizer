import React from 'react';
import type { StrategyResultModel } from '../../api/types';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Gauge,
  Wifi,
  Percent,
} from 'lucide-react';

interface StrategyComparisonCardProps {
  strategy: StrategyResultModel;
  isBaseline?: boolean;
  isWinner?: boolean;
}

export const StrategyComparisonCard: React.FC<StrategyComparisonCardProps> = ({
  strategy,
  isWinner,
}) => {
  const isReachable = strategy.reachable;

  // Visual accents
  let badgeColor = 'bg-nexus-800 text-nexus-300';
  let borderColor = 'border-nexus-800';

  if (strategy.strategy === 'adaptive_aco') {
    badgeColor = 'bg-accent-cyan-subtle text-accent-cyan border border-accent-cyan/30';
    borderColor = 'border-accent-cyan/50 shadow-lg shadow-accent-cyan/5';
  } else if (strategy.strategy === 'aco_fuzzy') {
    badgeColor = 'bg-accent-emerald-subtle text-accent-emerald border border-accent-emerald/30';
    borderColor = 'border-accent-emerald/40';
  } else if (strategy.strategy === 'dijkstra_fuzzy') {
    badgeColor = 'bg-accent-violet-subtle text-accent-violet border border-accent-violet/30';
    borderColor = 'border-accent-violet/40';
  } else if (strategy.strategy === 'dijkstra_latency') {
    badgeColor = 'bg-nexus-800 text-nexus-400 border border-nexus-700';
  }

  return (
    <div
      className={`rounded-2xl bg-nexus-900 border ${borderColor} p-5 space-y-4 flex flex-col justify-between transition-all hover:border-nexus-700`}
    >
      {/* Top Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${badgeColor}`}>
            {strategy.strategy_label}
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase flex items-center gap-1 ${
              isReachable
                ? 'bg-accent-emerald-subtle text-accent-emerald'
                : 'bg-accent-coral-subtle text-accent-coral'
            }`}
          >
            {isReachable ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>Reachable</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3" />
                <span>Unreachable</span>
              </>
            )}
          </span>
        </div>

        <div>
          <h3 className="font-bold text-base text-nexus-100 flex items-center gap-2">
            <span>{strategy.strategy_label}</span>
            {isWinner && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent-cyan text-nexus-950 font-extrabold uppercase">
                Best Agility
              </span>
            )}
          </h3>
          <p className="text-xs text-nexus-400 mt-0.5 line-clamp-2">
            {strategy.objective}
          </p>
        </div>
      </div>

      {/* Path Display */}
      <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-850 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-nexus-500 uppercase">
          <span>Calculated Route Path</span>
          <span className="text-nexus-400 font-bold">{strategy.hops} Hops</span>
        </div>
        <div className="text-xs font-mono font-bold text-nexus-200 flex items-center gap-1.5 flex-wrap">
          {strategy.path && strategy.path.length > 0 ? (
            strategy.path.map((nodeId, idx) => (
              <React.Fragment key={idx}>
                <span
                  className={
                    idx === 0
                      ? 'text-accent-emerald'
                      : idx === strategy.path.length - 1
                      ? 'text-accent-violet'
                      : 'text-accent-cyan'
                  }
                >
                  R{nodeId}
                </span>
                {idx < strategy.path.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-nexus-600 inline shrink-0" />
                )}
              </React.Fragment>
            ))
          ) : (
            <span className="text-accent-coral text-[11px]">
              No valid path exists
            </span>
          )}
        </div>
      </div>

      {/* Primary Metrics Grid (Strict Unit Separation) */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        {/* Latency */}
        <div className="p-2.5 rounded-lg bg-nexus-950 border border-nexus-850 space-y-0.5">
          <span className="text-[10px] uppercase text-nexus-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-accent-cyan" />
            <span>Latency</span>
          </span>
          <div className="text-sm font-bold text-nexus-100">
            {strategy.latency_ms !== null && strategy.latency_ms !== undefined
              ? `${strategy.latency_ms.toFixed(1)} ms`
              : 'N/A'}
          </div>
        </div>

        {/* Packet Loss */}
        <div className="p-2.5 rounded-lg bg-nexus-950 border border-nexus-850 space-y-0.5">
          <span className="text-[10px] uppercase text-nexus-500 flex items-center gap-1">
            <Percent className="w-3 h-3 text-accent-coral" />
            <span>Loss Rate</span>
          </span>
          <div className="text-sm font-bold text-nexus-100">
            {strategy.packet_loss_percent !== null && strategy.packet_loss_percent !== undefined
              ? `${strategy.packet_loss_percent.toFixed(2)}%`
              : 'N/A'}
          </div>
        </div>

        {/* Bottleneck Bandwidth */}
        <div className="p-2.5 rounded-lg bg-nexus-950 border border-nexus-850 space-y-0.5">
          <span className="text-[10px] uppercase text-nexus-500 flex items-center gap-1">
            <Wifi className="w-3 h-3 text-accent-emerald" />
            <span>Bandwidth</span>
          </span>
          <div className="text-sm font-bold text-nexus-100">
            {strategy.bandwidth_mbps !== null && strategy.bandwidth_mbps !== undefined
              ? `${strategy.bandwidth_mbps.toFixed(1)} Mbps`
              : 'N/A'}
          </div>
        </div>

        {/* Congestion */}
        <div className="p-2.5 rounded-lg bg-nexus-950 border border-nexus-850 space-y-0.5">
          <span className="text-[10px] uppercase text-nexus-500 flex items-center gap-1">
            <Gauge className="w-3 h-3 text-accent-amber" />
            <span>Congestion</span>
          </span>
          <div className="text-sm font-bold text-nexus-100">
            {strategy.congestion_percent !== null && strategy.congestion_percent !== undefined
              ? `${strategy.congestion_percent.toFixed(1)}%`
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Distinct Cost & Runtime Strip */}
      <div className="pt-2 border-t border-nexus-850 text-xs font-mono space-y-1.5">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-nexus-500">
            Cost ({strategy.cost_type}):
          </span>
          <span className="text-accent-violet font-bold">
            {strategy.route_cost !== null && strategy.route_cost !== undefined
              ? strategy.route_cost.toFixed(3)
              : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-nexus-500">Algorithm Runtime:</span>
          <span className="text-nexus-300 font-semibold">
            {strategy.runtime_ms.toFixed(2)} ms
          </span>
        </div>
      </div>
    </div>
  );
};
