import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ErrorBar,
} from 'recharts';
import type { ExperimentSummaryRow } from '../../api/types';
import { Info, HelpCircle } from 'lucide-react';

interface ScenarioMetricChartProps {
  summaryRows: ExperimentSummaryRow[];
  selectedScenario: string;
  selectedStrategy: string;
}

type MetricKey =
  | 'latency'
  | 'packet_loss'
  | 'bandwidth'
  | 'congestion'
  | 'reachability'
  | 'hops'
  | 'runtime';

interface MetricDef {
  id: MetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  meanKey: string;
  stdKey: string;
  ciLowerKey: string;
  ciUpperKey: string;
  better: 'lower' | 'higher';
  description: string;
}

const METRICS: MetricDef[] = [
  {
    id: 'latency',
    label: 'End-to-End Latency',
    shortLabel: 'Latency',
    unit: 'ms',
    meanKey: 'latency_ms_mean',
    stdKey: 'latency_ms_std',
    ciLowerKey: 'latency_ms_ci95_lower',
    ciUpperKey: 'latency_ms_ci95_upper',
    better: 'lower',
    description: 'Total path propagation and transmission delay. Lower is better.',
  },
  {
    id: 'packet_loss',
    label: 'Packet Loss',
    shortLabel: 'Packet Loss',
    unit: '%',
    meanKey: 'packet_loss_percent_mean',
    stdKey: 'packet_loss_percent_std',
    ciLowerKey: 'packet_loss_percent_ci95_lower',
    ciUpperKey: 'packet_loss_percent_ci95_upper',
    better: 'lower',
    description: 'Cumulative packet drop probability across route edges. Lower is better.',
  },
  {
    id: 'bandwidth',
    label: 'Bottleneck Bandwidth',
    shortLabel: 'Bandwidth',
    unit: 'Mbps',
    meanKey: 'bandwidth_mbps_mean',
    stdKey: 'bandwidth_mbps_std',
    ciLowerKey: 'bandwidth_mbps_ci95_lower',
    ciUpperKey: 'bandwidth_mbps_ci95_upper',
    better: 'higher',
    description: 'Minimum throughput capacity along the selected route. Higher is better.',
  },
  {
    id: 'congestion',
    label: 'Average Congestion',
    shortLabel: 'Congestion',
    unit: '%',
    meanKey: 'congestion_percent_mean',
    stdKey: 'congestion_percent_std',
    ciLowerKey: 'congestion_percent_ci95_lower',
    ciUpperKey: 'congestion_percent_ci95_upper',
    better: 'lower',
    description: 'Buffer queue occupancy percentage along selected route. Lower is better.',
  },
  {
    id: 'reachability',
    label: 'Reachability Rate',
    shortLabel: 'Reachability',
    unit: '%',
    meanKey: 'reachable_rate',
    stdKey: '',
    ciLowerKey: '',
    ciUpperKey: '',
    better: 'higher',
    description: 'Percentage of runs where a valid, loop-free path reached the destination.',
  },
  {
    id: 'hops',
    label: 'Route Hop Count',
    shortLabel: 'Hops',
    unit: 'hops',
    meanKey: 'route_hops_mean',
    stdKey: 'route_hops_std',
    ciLowerKey: 'route_hops_ci95_lower',
    ciUpperKey: 'route_hops_ci95_upper',
    better: 'lower',
    description: 'Number of forwarding hops between source and destination.',
  },
  {
    id: 'runtime',
    label: 'Execution Runtime',
    shortLabel: 'Runtime',
    unit: 'ms',
    meanKey: 'runtime_ms_mean',
    stdKey: 'runtime_ms_std',
    ciLowerKey: 'runtime_ms_ci95_lower',
    ciUpperKey: 'runtime_ms_ci95_upper',
    better: 'lower',
    description: 'Mean calculation time taken to compute path. Lower is better.',
  },
];

const STRATEGY_CONFIG: Record<
  string,
  { label: string; color: string; isStochastic: boolean }
> = {
  dijkstra_latency: {
    label: 'Dijkstra Latency',
    color: '#38BDF8', // cyan-400
    isStochastic: false,
  },
  dijkstra_fuzzy: {
    label: 'Dijkstra Fuzzy',
    color: '#A78BFA', // violet-400
    isStochastic: false,
  },
  aco_fuzzy: {
    label: 'ACO Fuzzy (n=20)',
    color: '#34D399', // emerald-400
    isStochastic: true,
  },
  adaptive_aco: {
    label: 'Adaptive ACO',
    color: '#22D3EE', // cyan-300
    isStochastic: false,
  },
};

const SCENARIO_LABELS: Record<string, string> = {
  normal: 'Baseline Normal',
  congestion: 'Heavy Congestion',
  high_latency: 'Latency Surge',
  packet_loss: 'Packet Loss',
  link_failure: 'Link Failure',
  dynamic_combined: 'Dynamic Stress',
};

export const ScenarioMetricChart: React.FC<ScenarioMetricChartProps> = ({
  summaryRows,
  selectedScenario,
  selectedStrategy,
}) => {
  const [metricKey, setMetricKey] = useState<MetricKey>('latency');
  const [showCI, setShowCI] = useState<boolean>(true);

  const activeMetric = METRICS.find((m) => m.id === metricKey) || METRICS[0];

  // Filter rows based on scenario/strategy
  const filteredRows = summaryRows.filter((r) => {
    if (selectedScenario !== 'all' && r.scenario !== selectedScenario) {
      return false;
    }
    if (selectedStrategy !== 'all' && r.strategy !== selectedStrategy) {
      return false;
    }
    return true;
  });

  // Unique scenarios in dataset
  const scenarios = Array.from(
    new Set(filteredRows.map((r) => r.scenario || 'normal'))
  );

  // Build chart dataset
  // Format for Recharts:
  // [
  //   {
  //     scenario: 'normal',
  //     scenarioLabel: 'Baseline Normal',
  //     dijkstra_latency: 53.89,
  //     dijkstra_fuzzy: 115.29,
  //     aco_fuzzy: 115.29,
  //     aco_fuzzy_ci_error: 0.15,
  //     adaptive_aco: 115.29,
  //     ...
  //   }
  // ]
  const chartData = scenarios.map((scen) => {
    const item: Record<string, any> = {
      scenario: scen,
      scenarioLabel: SCENARIO_LABELS[scen] || scen,
    };

    const scenRows = summaryRows.filter((r) => r.scenario === scen);

    scenRows.forEach((r) => {
      const strat = r.strategy || '';
      let val = r[activeMetric.meanKey];

      // Reachability rate is 0-1.0 in CSV, convert to %
      if (activeMetric.id === 'reachability' && typeof val === 'number') {
        val = val <= 1.0 ? val * 100 : val;
      }

      item[strat] = typeof val === 'number' ? Number(val.toFixed(2)) : 0;

      // Extract 95% CI error bar margin for stochastic algorithms (aco_fuzzy)
      const runs = Number(r.runs || 1);
      if (runs > 1 && r[activeMetric.ciUpperKey] !== undefined && typeof val === 'number') {
        const upper = Number(r[activeMetric.ciUpperKey]);
        const lower = Number(r[activeMetric.ciLowerKey]);
        const margin = Math.max(0, (upper - lower) / 2);
        item[`${strat}_error`] = Number(margin.toFixed(3));
        item[`${strat}_ci_lower`] = Number(lower.toFixed(2));
        item[`${strat}_ci_upper`] = Number(upper.toFixed(2));
      } else {
        item[`${strat}_error`] = 0;
      }

      item[`${strat}_std`] = typeof r[activeMetric.stdKey] === 'number' ? Number(r[activeMetric.stdKey].toFixed(3)) : 0;
      item[`${strat}_runs`] = runs;
    });

    return item;
  });

  // Determine active strategies to show as bars
  const visibleStrategies = Object.keys(STRATEGY_CONFIG).filter((strat) => {
    if (selectedStrategy !== 'all') {
      return strat === selectedStrategy;
    }
    return true;
  });

  return (
    <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-nexus-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-nexus-100">
              Cross-Scenario Performance Analysis
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Phase 3 Benchmarks
            </span>
          </div>
          <p className="text-xs text-nexus-400 mt-1 max-w-2xl">
            {activeMetric.description}{' '}
            <span className="text-nexus-300 font-medium">
              Objective: {activeMetric.better === 'lower' ? 'Lower' : 'Higher'} is superior.
            </span>
          </p>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex items-center gap-1.5 flex-wrap bg-nexus-950 p-1.5 rounded-xl border border-nexus-800">
          {METRICS.map((m) => {
            const isActive = m.id === metricKey;
            return (
              <button
                key={m.id}
                onClick={() => setMetricKey(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-nexus-800 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
                }`}
              >
                {m.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Statistical Note & Error Bar Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-nexus-950/70 border border-nexus-800/80 text-xs text-nexus-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-nexus-200">Confidence Discipline:</strong> Error bars represent rigorous 95% Confidence Intervals (Student&apos;s t, df=19) on repeated stochastic trials (ACO Fuzzy, n=20). Deterministic runs (n=1) reflect exact observed values.
          </span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 font-mono text-[11px] text-nexus-300">
          <input
            type="checkbox"
            checked={showCI}
            onChange={(e) => setShowCI(e.target.checked)}
            className="rounded border-nexus-700 bg-nexus-900 text-cyan-500 focus:ring-0"
          />
          Show 95% CI Bars
        </label>
      </div>

      {/* Chart Canvas */}
      <div className="h-[360px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
            barGap={4}
            barCategoryGap={20}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis
              dataKey="scenarioLabel"
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              unit={` ${activeMetric.unit}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="bg-nexus-950 border border-nexus-800 rounded-xl p-3 shadow-2xl font-mono text-xs space-y-2 max-w-xs">
                    <div className="font-bold text-nexus-100 border-b border-nexus-800 pb-1.5 flex items-center justify-between">
                      <span>{label}</span>
                      <span className="text-[10px] text-nexus-400 font-normal">
                        Unit: {activeMetric.unit}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {payload.map((entry: any) => {
                        const stratKey = entry.dataKey;
                        const stratConfig = STRATEGY_CONFIG[stratKey] || {
                          label: stratKey,
                          color: '#CBD5E1',
                          isStochastic: false,
                        };
                        const rowData = entry.payload;
                        const err = rowData[`${stratKey}_error`];
                        const runs = rowData[`${stratKey}_runs`] || 1;
                        const std = rowData[`${stratKey}_std`];

                        return (
                          <div
                            key={stratKey}
                            className="flex items-center justify-between gap-4 py-0.5"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-sm inline-block"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-nexus-300 font-sans text-xs">
                                {stratConfig.label}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-nexus-100">
                                {entry.value} {activeMetric.unit}
                              </span>
                              {runs > 1 && err > 0 && (
                                <div className="text-[10px] text-nexus-400">
                                  ±{err} (CI 95%, s={std})
                                </div>
                              )}
                              {runs === 1 && (
                                <div className="text-[10px] text-nexus-500">
                                  (deterministic, n=1)
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 16 }}
              formatter={(value) => {
                const conf = STRATEGY_CONFIG[value];
                return (
                  <span className="text-xs text-nexus-300 font-mono">
                    {conf ? conf.label : value}
                  </span>
                );
              }}
            />
            {visibleStrategies.map((stratKey) => {
              const conf = STRATEGY_CONFIG[stratKey];
              return (
                <Bar
                  key={stratKey}
                  dataKey={stratKey}
                  fill={conf.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                >
                  {showCI && conf.isStochastic && (
                    <ErrorBar
                      dataKey={`${stratKey}_error`}
                      width={4}
                      strokeWidth={2}
                      stroke="#F8FAFC"
                    />
                  )}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Explanatory Footer Pill */}
      <div className="flex items-center justify-between text-xs text-nexus-400 pt-2 border-t border-nexus-800/80">
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-nexus-500" />
          Latency uses physical delay (ms); packet loss and congestion are bounded percentages (0-100%).
        </span>
        <span className="font-mono text-nexus-500">
          Source: results/summary_results.csv
        </span>
      </div>
    </div>
  );
};
