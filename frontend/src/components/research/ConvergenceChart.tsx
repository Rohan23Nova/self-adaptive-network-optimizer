import React, { useState, useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';
import type { ConvergencePoint } from '../../api/types';
import { Zap } from 'lucide-react';

interface ConvergenceChartProps {
  convergenceData: ConvergencePoint[];
  selectedScenario?: string;
  onScenarioChange?: (scenario: string) => void;
  loading?: boolean;
}

const SCENARIOS = [
  { id: 'normal', label: 'Baseline Normal' },
  { id: 'congestion', label: 'Heavy Congestion' },
  { id: 'high_latency', label: 'Latency Surge' },
  { id: 'packet_loss', label: 'Packet Loss' },
  { id: 'link_failure', label: 'Link Failure' },
  { id: 'dynamic_combined', label: 'Dynamic Stress' },
];

export const ConvergenceChart: React.FC<ConvergenceChartProps> = ({
  convergenceData,
  selectedScenario = 'normal',
  onScenarioChange,
}) => {
  const [activeScenario, setActiveScenario] = useState<string>(
    selectedScenario === 'all' ? 'normal' : selectedScenario
  );

  const handleScenarioChange = (scen: string) => {
    setActiveScenario(scen);
    if (onScenarioChange) {
      onScenarioChange(scen);
    }
  };

  // Filter and aggregate convergence data by iteration
  const chartData = useMemo(() => {
    if (!convergenceData || convergenceData.length === 0) return [];

    const filtered = convergenceData.filter((pt) => {
      if (!pt.scenario) return true;
      return pt.scenario.toLowerCase() === activeScenario.toLowerCase();
    });

    // Group by iteration (1 to 50)
    const iterationMap: Record<
      number,
      { iteration: number; costs: number[]; bestCosts: number[] }
    > = {};

    filtered.forEach((pt) => {
      const iter = pt.iteration;
      if (!iterationMap[iter]) {
        iterationMap[iter] = { iteration: iter, costs: [], bestCosts: [] };
      }
      if (typeof pt.best_cost === 'number') {
        iterationMap[iter].bestCosts.push(pt.best_cost);
      }
      if (typeof pt.mean_cost === 'number') {
        iterationMap[iter].costs.push(pt.mean_cost);
      }
    });

    const result = Object.values(iterationMap)
      .sort((a, b) => a.iteration - b.iteration)
      .map((item) => {
        const bests = item.bestCosts.length > 0 ? item.bestCosts : [0];
        const minCost = Math.min(...bests);
        const maxCost = Math.max(...bests);
        const meanBestCost = bests.reduce((a, b) => a + b, 0) / bests.length;

        return {
          iteration: item.iteration,
          meanBestCost: Number(meanBestCost.toFixed(4)),
          minCost: Number(minCost.toFixed(4)),
          maxCost: Number(maxCost.toFixed(4)),
          // Spread for shaded variance band
          spread: [Number(minCost.toFixed(4)), Number(maxCost.toFixed(4))],
          runCount: bests.length,
        };
      });

    return result;
  }, [convergenceData, activeScenario]);

  // Initial and final convergence values
  const initialCost = chartData[0]?.meanBestCost ?? 0;
  const finalCost = chartData[chartData.length - 1]?.meanBestCost ?? 0;

  return (
    <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-6 space-y-6">
      {/* Header and Scenario Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-nexus-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-nexus-100">
              Ant Colony Optimization Convergence Curve
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              50 Iterations · 20 Stochastic Seeds
            </span>
          </div>
          <p className="text-xs text-nexus-400 mt-1 max-w-2xl">
            Tracks iteration-by-iteration minimization of defuzzified multi-attribute route cost{' '}
            <span className="font-mono text-cyan-300">w_e = 1/Q_e</span> across 20 independent ant colony trials.
          </p>
        </div>

        {/* Scenario Selector Pills */}
        <div className="flex items-center gap-1 bg-nexus-950 p-1.5 rounded-xl border border-nexus-800 overflow-x-auto">
          {SCENARIOS.map((scen) => {
            const isActive = scen.id === activeScenario;
            return (
              <button
                key={scen.id}
                onClick={() => handleScenarioChange(scen.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 ${
                  isActive
                    ? 'bg-nexus-800 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
                }`}
              >
                {scen.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Convergence Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
          <div className="text-[10px] text-nexus-400 uppercase font-mono">Initial Best Cost (Iter 1)</div>
          <div className="text-base font-bold font-mono text-nexus-200 mt-0.5">
            {initialCost.toFixed(4)}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
          <div className="text-[10px] text-nexus-400 uppercase font-mono">Final Best Cost (Iter 50)</div>
          <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
            {finalCost.toFixed(4)}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
          <div className="text-[10px] text-nexus-400 uppercase font-mono">Pheromone Evaporation (ρ)</div>
          <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
            0.50
          </div>
        </div>
        <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
          <div className="text-[10px] text-nexus-400 uppercase font-mono">Ant Heuristic (α=1.0, β=2.0)</div>
          <div className="text-base font-bold font-mono text-violet-400 mt-0.5">
            20 Ants / Iter
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[340px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis
              dataKey="iteration"
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              label={{
                value: 'ACO Iteration (1 to 50)',
                position: 'insideBottom',
                offset: -10,
                fill: '#64748B',
                fontSize: 11,
                fontFamily: 'JetBrains Mono',
              }}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              domain={['auto', 'auto']}
              label={{
                value: 'Fuzzy Route Cost (Unitless)',
                angle: -90,
                position: 'insideLeft',
                fill: '#64748B',
                fontSize: 11,
                fontFamily: 'JetBrains Mono',
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-nexus-950 border border-nexus-800 rounded-xl p-3 shadow-2xl font-mono text-xs space-y-1.5 max-w-xs">
                    <div className="font-bold text-nexus-100 border-b border-nexus-800 pb-1 flex justify-between">
                      <span>Iteration {d.iteration}</span>
                      <span className="text-[10px] text-emerald-400 font-normal">
                        {d.runCount} Runs Sampled
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nexus-400">Mean Best Cost:</span>
                      <span className="text-emerald-300 font-bold">{d.meanBestCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nexus-400">Min Observed Cost:</span>
                      <span className="text-cyan-300">{d.minCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nexus-400">Max Observed Cost:</span>
                      <span className="text-violet-300">{d.maxCost}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 16 }}
              formatter={(value) => (
                <span className="text-xs text-nexus-300 font-mono">{value}</span>
              )}
            />
            {/* Shaded Area for variance band */}
            <Area
              type="monotone"
              dataKey="maxCost"
              stroke="transparent"
              fill="#10B981"
              fillOpacity={0.1}
              name="Run Variance Envelope"
            />
            {/* Mean Best Cost Line */}
            <Line
              type="monotone"
              dataKey="meanBestCost"
              name="Mean Best Route Cost (n=20)"
              stroke="#10B981"
              strokeWidth={2.5}
              dot={{ r: 2, fill: '#10B981' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Explanatory Note */}
      <div className="px-4 py-3 rounded-xl bg-nexus-950/70 border border-nexus-800/80 text-xs text-nexus-400 flex items-start gap-2.5">
        <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-nexus-200">Algorithmic Convergence:</strong> Ant Colony Optimization establishes strong pheromone reinforcement on Pareto-optimal multi-metric routes within 5 to 10 iterations. Pheromone evaporation prevents convergence to local minima.
        </span>
      </div>
    </div>
  );
};
