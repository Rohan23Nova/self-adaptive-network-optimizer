import React, { useState } from 'react';
import {
  Compass,
  ArrowRight,
  Info,
} from 'lucide-react';
import type { ExperimentSummaryRow } from '../../api/types';

interface RouteComparisonTableProps {
  summaryRows: ExperimentSummaryRow[];
  detailedRows?: Record<string, any>[];
  selectedScenario?: string;
}

const STRATEGY_DATA: Record<
  string,
  { label: string; badge: string; color: string; costUnit: string }
> = {
  dijkstra_latency: {
    label: 'Dijkstra Raw Latency',
    badge: 'Single-Objective',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    costUnit: 'ms (latency)',
  },
  dijkstra_fuzzy: {
    label: 'Dijkstra Fuzzy Cost',
    badge: 'Deterministic Multi-Metric',
    color: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
    costUnit: 'unitless (1/Q)',
  },
  aco_fuzzy: {
    label: 'ACO Fuzzy (Ant Colony)',
    badge: 'Stochastic Swarm (n=20)',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    costUnit: 'unitless (1/Q)',
  },
  adaptive_aco: {
    label: 'Adaptive ACO (NEXUS)',
    badge: 'Self-Adaptive Hybrid',
    color: 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10',
    costUnit: 'unitless (1/Q)',
  },
};

const SCENARIOS = [
  { id: 'all', label: 'All Scenarios' },
  { id: 'normal', label: 'Baseline Normal' },
  { id: 'congestion', label: 'Heavy Congestion' },
  { id: 'high_latency', label: 'Latency Surge' },
  { id: 'packet_loss', label: 'Packet Loss' },
  { id: 'link_failure', label: 'Link Failure' },
  { id: 'dynamic_combined', label: 'Dynamic Stress' },
];

// Pre-verified paths from detailed_results.csv
const VERIFIED_PATHS: Record<string, Record<string, string>> = {
  normal: {
    dijkstra_latency: '[0, 9, 12, 14, 24]',
    dijkstra_fuzzy: '[0, 24]',
    aco_fuzzy: '[0, 24]',
    adaptive_aco: '[0, 24]',
  },
  congestion: {
    dijkstra_latency: '[0, 9, 12, 14, 24]',
    dijkstra_fuzzy: '[0, 24]',
    aco_fuzzy: '[0, 24]',
    adaptive_aco: '[0, 24]',
  },
  high_latency: {
    dijkstra_latency: '[0, 9, 12, 14, 24]',
    dijkstra_fuzzy: '[0, 9, 24]',
    aco_fuzzy: '[0, 9, 24]',
    adaptive_aco: '[0, 9, 24]',
  },
  packet_loss: {
    dijkstra_latency: '[0, 9, 12, 14, 24]',
    dijkstra_fuzzy: '[0, 9, 24]',
    aco_fuzzy: '[0, 9, 24]',
    adaptive_aco: '[0, 9, 24]',
  },
  link_failure: {
    dijkstra_latency: '[0, 9, 12, 14, 24]',
    dijkstra_fuzzy: '[0, 9, 24]',
    aco_fuzzy: '[0, 9, 24]',
    adaptive_aco: '[0, 9, 24]',
  },
  dynamic_combined: {
    dijkstra_latency: '[0, 9, 12, 14, 24]',
    dijkstra_fuzzy: '[0, 9, 24]',
    aco_fuzzy: '[0, 9, 24]',
    adaptive_aco: '[0, 9, 24]',
  },
};

export const RouteComparisonTable: React.FC<RouteComparisonTableProps> = ({
  summaryRows,
  detailedRows,
  selectedScenario = 'all',
}) => {
  const [activeScenario, setActiveScenario] = useState<string>(selectedScenario);

  const displayScenarios =
    activeScenario === 'all'
      ? ['normal', 'congestion', 'high_latency', 'packet_loss', 'link_failure', 'dynamic_combined']
      : [activeScenario];

  const getPath = (scen: string, strat: string): string => {
    if (detailedRows && detailedRows.length > 0) {
      const match = detailedRows.find(
        (r) =>
          String(r.scenario).toLowerCase() === scen.toLowerCase() &&
          String(r.strategy).toLowerCase() === strat.toLowerCase()
      );
      if (match && match.route_path) {
        return String(match.route_path);
      }
    }
    return VERIFIED_PATHS[scen]?.[strat] || '[0, 24]';
  };

  const formatPathNodes = (pathStr: string) => {
    try {
      const nodes: number[] = JSON.parse(pathStr);
      return nodes.map((node, i) => (
        <React.Fragment key={i}>
          <span className="px-1.5 py-0.5 rounded bg-nexus-900 border border-nexus-700 text-nexus-200 font-mono text-xs">
            {node}
          </span>
          {i < nodes.length - 1 && (
            <ArrowRight className="w-3 h-3 text-nexus-500 shrink-0 mx-0.5" />
          )}
        </React.Fragment>
      ));
    } catch {
      return <span className="font-mono text-nexus-300">{pathStr}</span>;
    }
  };

  return (
    <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-nexus-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-nexus-100">
              Path Selection & Algorithmic Trade-Off Matrix
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Comparative Routing Decisions
            </span>
          </div>
          <p className="text-xs text-nexus-400 mt-1 max-w-2xl">
            Examines how each algorithm navigates the topology graph under distinct failure and congestion modes.
          </p>
        </div>

        {/* Scenario Filter */}
        <div className="flex items-center gap-1 bg-nexus-950 p-1.5 rounded-xl border border-nexus-800 overflow-x-auto">
          {SCENARIOS.map((scen) => {
            const isActive = scen.id === activeScenario;
            return (
              <button
                key={scen.id}
                onClick={() => setActiveScenario(scen.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 ${
                  isActive
                    ? 'bg-nexus-800 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
                }`}
              >
                {scen.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trade-Off Insight Callout */}
      <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-800/80 text-xs text-nexus-400 space-y-2">
        <div className="flex items-center gap-2 font-bold text-nexus-200">
          <Info className="w-4 h-4 text-cyan-400" />
          The Single-Objective vs. Multi-Attribute Paradox:
        </div>
        <p className="leading-relaxed">
          <strong className="text-cyan-300">Dijkstra Raw Latency</strong> relentlessly minimizes propagation delay, selecting path{' '}
          <code className="text-nexus-200 font-mono bg-nexus-900 px-1 py-0.5 rounded">[0, 9, 12, 14, 24]</code> (4 hops, 53.89 ms). However, this route suffers from{' '}
          <strong className="text-red-400">10.02% packet loss</strong>, low bandwidth (41.22 Mbps), and 48.02% congestion.
        </p>
        <p className="leading-relaxed">
          In contrast, <strong className="text-emerald-300">Fuzzy & Adaptive ACO</strong> evaluate quality holistically. When link <code className="text-nexus-200 font-mono bg-nexus-900 px-1 py-0.5 rounded">(0, 24)</code> experiences degradation, they reroute via{' '}
          <code className="text-nexus-200 font-mono bg-nexus-900 px-1 py-0.5 rounded">[0, 9, 24]</code> (2 hops), achieving <strong className="text-emerald-400">68.93 Mbps throughput</strong> and reducing packet loss to <strong className="text-emerald-400">4.48%</strong>.
        </p>
      </div>

      {/* Tables Per Scenario */}
      <div className="space-y-6">
        {displayScenarios.map((scen) => {
          const scenRows = summaryRows.filter((r) => r.scenario === scen);

          return (
            <div
              key={scen}
              className="rounded-xl border border-nexus-800 overflow-hidden bg-nexus-950/60"
            >
              <div className="px-4 py-3 bg-nexus-950 border-b border-nexus-800 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-nexus-200 uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  Scenario: {scen.replace(/_/g, ' ')}
                </span>
                <span className="text-[11px] font-mono text-nexus-400">
                  Target: Node 0 → Node 24
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-nexus-900/80 text-nexus-400 border-b border-nexus-800">
                    <tr>
                      <th className="py-2.5 px-4 font-normal">Strategy</th>
                      <th className="py-2.5 px-4 font-normal">Calculated Path</th>
                      <th className="py-2.5 px-3 font-normal text-center">Hops</th>
                      <th className="py-2.5 px-3 font-normal text-right">Latency</th>
                      <th className="py-2.5 px-3 font-normal text-right">Packet Loss</th>
                      <th className="py-2.5 px-3 font-normal text-right">Bandwidth</th>
                      <th className="py-2.5 px-3 font-normal text-right">Congestion</th>
                      <th className="py-2.5 px-4 font-normal text-right">Route Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexus-800/60">
                    {Object.keys(STRATEGY_DATA).map((stratKey) => {
                      const stratMeta = STRATEGY_DATA[stratKey];
                      const row = scenRows.find((r) => r.strategy === stratKey);
                      const pathStr = getPath(scen, stratKey);

                      return (
                        <tr
                          key={stratKey}
                          className="hover:bg-nexus-900/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-nexus-200">
                              {stratMeta.label}
                            </div>
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] border mt-0.5 ${stratMeta.color}`}
                            >
                              {stratMeta.badge}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 flex-wrap">
                              {formatPathNodes(pathStr)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center text-nexus-300 font-bold">
                            {row?.route_hops_mean ?? 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-right text-cyan-300">
                            {row?.latency_ms_mean !== undefined
                              ? `${Number(row.latency_ms_mean).toFixed(1)} ms`
                              : 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-right text-red-400">
                            {row?.packet_loss_percent_mean !== undefined
                              ? `${Number(row.packet_loss_percent_mean).toFixed(2)}%`
                              : 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-400">
                            {row?.bandwidth_mbps_mean !== undefined
                              ? `${Number(row.bandwidth_mbps_mean).toFixed(1)} Mbps`
                              : 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-right text-amber-400">
                            {row?.congestion_percent_mean !== undefined
                              ? `${Number(row.congestion_percent_mean).toFixed(1)}%`
                              : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-nexus-100">
                              {row?.route_cost_mean !== undefined
                                ? Number(row.route_cost_mean).toFixed(4)
                                : 'N/A'}
                            </span>
                            <span className="block text-[10px] text-nexus-500 font-sans">
                              {stratMeta.costUnit}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
