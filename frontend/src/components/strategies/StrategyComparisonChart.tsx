import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { StrategyResultModel } from '../../api/types';

interface StrategyComparisonChartProps {
  strategies: StrategyResultModel[];
}

export const StrategyComparisonChart: React.FC<StrategyComparisonChartProps> = ({
  strategies,
}) => {
  const [metric, setMetric] = useState<'latency' | 'loss' | 'bandwidth' | 'congestion' | 'runtime'>('latency');

  const metricConfigs = {
    latency: {
      label: 'End-to-End Latency',
      unit: 'ms',
      getter: (s: StrategyResultModel) => s.latency_ms ?? 0,
      color: '#38BDF8',
      description: 'Propagation and queuing delay across path links (Lower is better).',
    },
    loss: {
      label: 'End-to-End Packet Loss',
      unit: '%',
      getter: (s: StrategyResultModel) => s.packet_loss_percent ?? 0,
      color: '#EF4444',
      description: 'Compound transmission packet drop probability (Lower is better).',
    },
    bandwidth: {
      label: 'Bottleneck Bandwidth',
      unit: 'Mbps',
      getter: (s: StrategyResultModel) => s.bandwidth_mbps ?? 0,
      color: '#10B981',
      description: 'Minimum link capacity along the calculated path (Higher is better).',
    },
    congestion: {
      label: 'Average Congestion',
      unit: '%',
      getter: (s: StrategyResultModel) => s.congestion_percent ?? 0,
      color: '#F59E0B',
      description: 'Mean buffer queue saturation along path (Lower is better).',
    },
    runtime: {
      label: 'Algorithm Execution Time',
      unit: 'ms',
      getter: (s: StrategyResultModel) => s.runtime_ms ?? 0,
      color: '#8B5CF6',
      description: 'Time taken to compute path from graph snapshot (Lower is better).',
    },
  };

  const activeConfig = metricConfigs[metric];

  const chartData = strategies.map((s) => ({
    name: s.strategy_label.replace(/\s*\(.*\)/, ''),
    fullName: s.strategy_label,
    value: activeConfig.getter(s),
    reachable: s.reachable,
    strategy: s.strategy,
  }));

  const getBarColor = (strategyKey: string) => {
    switch (strategyKey) {
      case 'dijkstra_latency':
        return '#38BDF8';
      case 'dijkstra_fuzzy':
        return '#A78BFA';
      case 'aco_fuzzy':
        return '#34D399';
      case 'adaptive_aco':
        return '#22D3EE';
      default:
        return '#64748B';
    }
  };

  return (
    <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-6 space-y-5">
      {/* Header and Metric Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-nexus-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-nexus-100">
            Head-to-Head Metric Benchmark: {activeConfig.label}
          </h3>
          <p className="text-xs text-nexus-400 mt-0.5">
            {activeConfig.description}
          </p>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex items-center gap-1 bg-nexus-950 p-1 rounded-xl border border-nexus-800 text-xs font-mono flex-wrap">
          <button
            onClick={() => setMetric('latency')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              metric === 'latency'
                ? 'bg-nexus-850 text-sky-400 font-bold border border-nexus-700 shadow-sm'
                : 'text-nexus-400 hover:text-nexus-200'
            }`}
          >
            Latency (ms)
          </button>
          <button
            onClick={() => setMetric('loss')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              metric === 'loss'
                ? 'bg-nexus-850 text-accent-coral font-bold border border-nexus-700 shadow-sm'
                : 'text-nexus-400 hover:text-nexus-200'
            }`}
          >
            Loss (%)
          </button>
          <button
            onClick={() => setMetric('bandwidth')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              metric === 'bandwidth'
                ? 'bg-nexus-850 text-accent-emerald font-bold border border-nexus-700 shadow-sm'
                : 'text-nexus-400 hover:text-nexus-200'
            }`}
          >
            Bandwidth (Mbps)
          </button>
          <button
            onClick={() => setMetric('congestion')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              metric === 'congestion'
                ? 'bg-nexus-850 text-accent-amber font-bold border border-nexus-700 shadow-sm'
                : 'text-nexus-400 hover:text-nexus-200'
            }`}
          >
            Congestion (%)
          </button>
          <button
            onClick={() => setMetric('runtime')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              metric === 'runtime'
                ? 'bg-nexus-850 text-accent-violet font-bold border border-nexus-700 shadow-sm'
                : 'text-nexus-400 hover:text-nexus-200'
            }`}
          >
            Runtime (ms)
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748B"
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
            />
            <YAxis
              stroke="#64748B"
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
              unit={` ${activeConfig.unit}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-nexus-950 border border-nexus-800 p-3 rounded-xl shadow-xl text-xs font-mono space-y-1">
                    <span className="font-bold text-nexus-100 block">{d.fullName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-nexus-400">{activeConfig.label}:</span>
                      <span className="text-accent-cyan font-bold">
                        {d.value.toFixed(2)} {activeConfig.unit}
                      </span>
                    </div>
                    <div className="text-[10px] text-nexus-500">
                      Reachability: {d.reachable ? 'Reachable' : 'Unreachable'}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.strategy)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
