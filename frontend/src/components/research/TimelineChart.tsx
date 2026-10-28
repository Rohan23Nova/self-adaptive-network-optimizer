import React, { useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Activity,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface TimelineChartProps {
  timeline: Record<string, any>[];
  loading?: boolean;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({
  timeline,
  loading = false,
}) => {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(3); // Default step 4 (latency_spike)

  if (loading) {
    return (
      <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-8 flex flex-col items-center justify-center min-h-[400px]">
        <Activity className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-sm font-mono text-nexus-400 mt-3">
          Loading dynamic sequential trajectory...
        </span>
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-8 text-center text-nexus-400 font-mono text-sm">
        No dynamic timeline records available. Run Phase 3 experiments to generate dynamic_timeline.csv.
      </div>
    );
  }

  // Sanitize data for Recharts (convert 'inf' to null or visual ceiling)
  const chartData = timeline.map((row) => {
    const isUnreachable = row.unreachable === true || row.unreachable === 'True';
    const latencyAfter =
      row.latency_after_ms === 'inf' || isUnreachable
        ? null
        : typeof row.latency_after_ms === 'number'
        ? Number(row.latency_after_ms.toFixed(2))
        : null;

    const processingTime =
      typeof row.processing_time_ms === 'number'
        ? Number(row.processing_time_ms.toFixed(3))
        : 0;

    const rerouteTime =
      typeof row.reroute_time_ms === 'number'
        ? Number(row.reroute_time_ms.toFixed(3))
        : 0;

    const lossAfter =
      row.loss_after_percent === 'inf' || isUnreachable
        ? null
        : typeof row.loss_after_percent === 'number'
        ? Number(row.loss_after_percent.toFixed(2))
        : null;

    const stepLabel = `Step ${row.step}: ${String(row.event_name || '').replace(/_/g, ' ')}`;

    return {
      step: row.step,
      stepShort: `S${row.step}`,
      stepLabel,
      eventName: row.event_name,
      latency: latencyAfter,
      loss: lossAfter,
      processingTime,
      rerouteTime,
      triggered: row.triggered === true || row.triggered === 'True',
      routeChanged: row.route_changed === true || row.route_changed === 'True',
      unreachable: isUnreachable,
      raw: row,
    };
  });

  const activeStep = chartData[selectedStepIndex] || chartData[0];
  const activeRaw = activeStep.raw;

  return (
    <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-nexus-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-nexus-100">
              10-Step Dynamic Event Recovery Trajectory
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Sequential Adaptive Lifecycle
            </span>
          </div>
          <p className="text-xs text-nexus-400 mt-1 max-w-2xl">
            Simulates consecutive link congestions, latency degradation, physical link disconnects, router crashes, and topological recovery with instantaneous inspection versus reactive ACO rerouting.
          </p>
        </div>

        {/* Step Selector Pills */}
        <div className="flex items-center gap-1 bg-nexus-950 p-1.5 rounded-xl border border-nexus-800 overflow-x-auto max-w-full">
          {chartData.map((d, idx) => {
            const isSelected = idx === selectedStepIndex;
            return (
              <button
                key={d.step}
                onClick={() => setSelectedStepIndex(idx)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all shrink-0 flex items-center gap-1 ${
                  isSelected
                    ? 'bg-nexus-800 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
                }`}
              >
                <span>{d.stepShort}</span>
                {d.unreachable ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                ) : d.triggered ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-nexus-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dual-Axis Synchronized Chart */}
      <div className="h-[340px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis
              dataKey="stepShort"
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            />
            {/* Left Axis: Latency in ms */}
            <YAxis
              yAxisId="left"
              unit=" ms"
              tick={{ fill: '#38BDF8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#38BDF8' }}
              tickLine={{ stroke: '#38BDF8' }}
              domain={[80, 220]}
            />
            {/* Right Axis: Processing / Reroute Time in ms */}
            <YAxis
              yAxisId="right"
              orientation="right"
              unit=" ms"
              tick={{ fill: '#34D399', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#34D399' }}
              tickLine={{ stroke: '#34D399' }}
              domain={[0, 30]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-nexus-950 border border-nexus-800 rounded-xl p-3 shadow-2xl font-mono text-xs space-y-2 max-w-xs">
                    <div className="font-bold text-nexus-100 border-b border-nexus-800 pb-1.5 flex items-center justify-between">
                      <span>{d.stepLabel}</span>
                      {d.unreachable ? (
                        <span className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          Unreachable
                        </span>
                      ) : d.triggered ? (
                        <span className="text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          Triggered
                        </span>
                      ) : (
                        <span className="text-nexus-400 bg-nexus-800 px-1.5 py-0.5 rounded text-[10px]">
                          Nominal
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-nexus-400">Post Latency:</span>
                        <span className="text-cyan-300 font-bold">
                          {d.latency !== null ? `${d.latency} ms` : '∞ (Disconnected)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nexus-400">Post Loss:</span>
                        <span className="text-red-400 font-bold">
                          {d.loss !== null ? `${d.loss}%` : '100%'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nexus-400">ACO Reroute Time:</span>
                        <span className="text-emerald-400 font-bold">
                          {d.rerouteTime > 0 ? `${d.rerouteTime} ms` : '0.00 ms (Bypassed)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nexus-400">Inspection Overhead:</span>
                        <span className="text-violet-400 font-bold">
                          {d.processingTime} ms
                        </span>
                      </div>
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
            {/* Bars for Reroute Time and Processing Overhead */}
            <Bar
              yAxisId="right"
              dataKey="rerouteTime"
              name="ACO Reroute Runtime (ms)"
              fill="#10B981"
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
            />
            <Bar
              yAxisId="right"
              dataKey="processingTime"
              name="Inspection Overhead (ms)"
              fill="#8B5CF6"
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
            />
            {/* Line for Latency After */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="latency"
              name="End-to-End Latency (ms)"
              stroke="#06B6D4"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#06B6D4' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Selected Step Detail Card */}
      <div className="rounded-xl bg-nexus-950 border border-nexus-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-nexus-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-nexus-900 border border-nexus-700 text-xs font-mono font-bold text-cyan-300">
              {activeStep.step}
            </span>
            <div>
              <h4 className="text-sm font-bold text-nexus-100 uppercase tracking-wide">
                {String(activeStep.eventName || '').replace(/_/g, ' ')}
              </h4>
              <p className="text-xs text-nexus-400 font-mono mt-0.5">
                Trigger Reason: {String(activeRaw.trigger_reason || 'N/A')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeStep.unreachable ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-mono">
                <ShieldAlert className="w-3.5 h-3.5" />
                Destination Disconnected
              </span>
            ) : activeStep.routeChanged ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-mono">
                <Zap className="w-3.5 h-3.5" />
                Adaptive Reroute Executed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Route Intact (Below Threshold)
              </span>
            )}
          </div>
        </div>

        {/* Route Path Transition Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-nexus-900/60 border border-nexus-800 font-mono text-xs space-y-1.5">
            <span className="text-nexus-500 text-[11px] block uppercase tracking-wider">
              Route Path Before
            </span>
            <div className="text-nexus-200 font-bold truncate">
              {String(activeRaw.previous_route || '[]')}
            </div>
            <div className="flex items-center gap-4 text-nexus-400 text-[11px] pt-1">
              <span>Latency: {activeRaw.latency_before_ms ?? 'N/A'} ms</span>
              <span>Loss: {activeRaw.loss_before_percent ?? 'N/A'}%</span>
              <span>Bandwidth: {activeRaw.bandwidth_before_mbps ?? 'N/A'} Mbps</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-nexus-900/60 border border-nexus-800 font-mono text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 text-[11px] block uppercase tracking-wider">
                Route Path After Transition
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-cyan-200 font-bold truncate">
              {activeStep.unreachable ? '[] (No Path)' : String(activeRaw.new_route || '[]')}
            </div>
            <div className="flex items-center gap-4 text-nexus-400 text-[11px] pt-1">
              <span>
                Latency:{' '}
                {activeStep.unreachable ? '∞' : `${activeRaw.latency_after_ms ?? 'N/A'} ms`}
              </span>
              <span>
                Loss: {activeStep.unreachable ? '100%' : `${activeRaw.loss_after_percent ?? 'N/A'}%`}
              </span>
              <span>
                Bandwidth:{' '}
                {activeStep.unreachable ? '0 Mbps' : `${activeRaw.bandwidth_after_mbps ?? 'N/A'} Mbps`}
              </span>
            </div>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-2.5 rounded-lg bg-nexus-900 border border-nexus-800 text-center">
            <div className="text-[10px] text-nexus-400 uppercase font-mono">Inspection Overhead</div>
            <div className="text-sm font-bold font-mono text-violet-400 mt-0.5">
              {activeRaw.processing_time_ms ?? 0} ms
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-nexus-900 border border-nexus-800 text-center">
            <div className="text-[10px] text-nexus-400 uppercase font-mono">ACO Reroute Time</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
              {activeRaw.reroute_time_ms ?? 0} ms
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-nexus-900 border border-nexus-800 text-center">
            <div className="text-[10px] text-nexus-400 uppercase font-mono">Changed Edges</div>
            <div className="text-sm font-bold font-mono text-nexus-200 mt-0.5 truncate">
              {activeRaw.changed_edges && activeRaw.changed_edges !== '[]'
                ? activeRaw.changed_edges
                : 'None'}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-nexus-900 border border-nexus-800 text-center">
            <div className="text-[10px] text-nexus-400 uppercase font-mono">Cost Delta</div>
            <div className="text-sm font-bold font-mono text-nexus-200 mt-0.5">
              {activeStep.unreachable
                ? '∞'
                : typeof activeRaw.cost_after === 'number' && typeof activeRaw.cost_before === 'number'
                ? `${(activeRaw.cost_after - activeRaw.cost_before).toFixed(4)}`
                : '0.0000'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
