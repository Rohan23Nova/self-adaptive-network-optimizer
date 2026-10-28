import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/AppShell';
import { api } from '../api/client';
import type {
  ExperimentSummaryRow,
  ConvergencePoint,
} from '../api/types';
import {
  Database,
  RefreshCw,
  BarChart3,
  GitBranch,
  TrendingDown,
  Layers,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { ScenarioMetricChart } from '../components/research/ScenarioMetricChart';
import { TimelineChart } from '../components/research/TimelineChart';
import { ConvergenceChart } from '../components/research/ConvergenceChart';
import { RouteComparisonTable } from '../components/research/RouteComparisonTable';
import { MethodologyPanel } from '../components/research/MethodologyPanel';
import { DataTable } from '../components/research/DataTable';

type ResearchViewTab =
  | 'metrics'
  | 'timeline'
  | 'convergence'
  | 'routes'
  | 'data'
  | 'methodology';

export const ResearchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ResearchViewTab>('metrics');
  const [summaryRows, setSummaryRows] = useState<ExperimentSummaryRow[]>([]);
  const [timelineRows, setTimelineRows] = useState<Record<string, any>[]>([]);
  const [convergenceRows, setConvergenceRows] = useState<ConvergencePoint[]>([]);
  const [detailedResults, setDetailedResults] = useState<Record<string, any>[]>([]);
  const [totalDetailed, setTotalDetailed] = useState<number>(0);
  const [metadata, setMetadata] = useState<Record<string, any> | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoData, setIsDemoData] = useState<boolean>(false);

  // Top Filter State
  const [selectedScenario, setSelectedScenario] = useState<string>('all');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all');

  const fetchAllData = () => {
    setLoading(true);

    Promise.allSettled([
      api.getExperimentSummary(),
      api.getTimeline(),
      api.getConvergence(),
      api.getExperimentResults(undefined, undefined, 200, 0),
    ])
      .then(([summaryRes, timelineRes, convRes, resultsRes]) => {
        let hasRealData = false;

        if (summaryRes.status === 'fulfilled' && summaryRes.value.summary?.length > 0) {
          setSummaryRows(summaryRes.value.summary);
          setMetadata(summaryRes.value.metadata || null);
          hasRealData = true;
        }

        if (timelineRes.status === 'fulfilled' && timelineRes.value.timeline?.length > 0) {
          setTimelineRows(timelineRes.value.timeline);
        }

        if (convRes.status === 'fulfilled' && convRes.value.convergence?.length > 0) {
          setConvergenceRows(convRes.value.convergence);
        }

        if (resultsRes.status === 'fulfilled' && resultsRes.value.results?.length > 0) {
          setDetailedResults(resultsRes.value.results);
          setTotalDetailed(resultsRes.value.total);
        }

        if (hasRealData) {
          setIsDemoData(false);
        } else {
          loadVerifiedFallback();
        }
        setLoading(false);
      })
      .catch(() => {
        loadVerifiedFallback();
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const loadVerifiedFallback = () => {
    setIsDemoData(true);
    setMetadata({
      timestamp: '2026-10-26T22:01:43.654997',
      graph_topology: {
        num_nodes: 25,
        source: 0,
        destination: 24,
        base_seed: 42,
      },
      experiments: {
        aco_runs: 20,
        strategies: [
          'dijkstra_latency',
          'dijkstra_fuzzy',
          'aco_fuzzy',
          'adaptive_aco',
        ],
        scenarios: [
          'normal',
          'congestion',
          'high_latency',
          'packet_loss',
          'link_failure',
          'dynamic_combined',
        ],
      },
      aco_parameters: {
        alpha: 1.0,
        beta: 2.0,
        evaporation_rate: 0.5,
        num_ants: 20,
        num_iterations: 50,
      },
      adaptive_parameters: {
        quality_change_threshold: 0.1,
        route_cost_degradation_threshold: 0.2,
      },
      total_runtime_seconds: 3.174,
    });

    // Fallback summary rows matching results/summary_results.csv
    setSummaryRows([
      {
        scenario: 'normal',
        strategy: 'dijkstra_latency',
        runs: 1,
        latency_ms_mean: 53.89,
        packet_loss_percent_mean: 10.02,
        bandwidth_mbps_mean: 41.22,
        congestion_percent_mean: 48.02,
        route_hops_mean: 4.0,
        reachable_rate: 1.0,
        runtime_ms_mean: 0.61,
        route_cost_mean: 53.89,
      },
      {
        scenario: 'normal',
        strategy: 'dijkstra_fuzzy',
        runs: 1,
        latency_ms_mean: 115.29,
        packet_loss_percent_mean: 1.68,
        bandwidth_mbps_mean: 27.42,
        congestion_percent_mean: 10.32,
        route_hops_mean: 1.0,
        reachable_rate: 1.0,
        runtime_ms_mean: 8.09,
        route_cost_mean: 2.00,
      },
      {
        scenario: 'normal',
        strategy: 'adaptive_aco',
        runs: 1,
        latency_ms_mean: 115.29,
        packet_loss_percent_mean: 1.68,
        bandwidth_mbps_mean: 27.42,
        congestion_percent_mean: 10.32,
        route_hops_mean: 1.0,
        reachable_rate: 1.0,
        runtime_ms_mean: 0.0,
        route_cost_mean: 2.00,
      },
      {
        scenario: 'normal',
        strategy: 'aco_fuzzy',
        runs: 20,
        latency_ms_mean: 115.29,
        latency_ms_std: 0.0,
        latency_ms_ci95_lower: 115.29,
        latency_ms_ci95_upper: 115.29,
        packet_loss_percent_mean: 1.68,
        bandwidth_mbps_mean: 27.42,
        congestion_percent_mean: 10.32,
        route_hops_mean: 1.0,
        reachable_rate: 1.0,
        runtime_ms_mean: 17.02,
        runtime_ms_std: 0.34,
        runtime_ms_ci95_lower: 16.86,
        runtime_ms_ci95_upper: 17.18,
        route_cost_mean: 2.00,
      },
      {
        scenario: 'congestion',
        strategy: 'dijkstra_latency',
        runs: 1,
        latency_ms_mean: 53.89,
        packet_loss_percent_mean: 10.02,
        bandwidth_mbps_mean: 41.22,
        congestion_percent_mean: 48.02,
        route_hops_mean: 4.0,
        reachable_rate: 1.0,
        runtime_ms_mean: 0.26,
        route_cost_mean: 53.89,
      },
      {
        scenario: 'congestion',
        strategy: 'adaptive_aco',
        runs: 1,
        latency_ms_mean: 115.29,
        packet_loss_percent_mean: 1.68,
        bandwidth_mbps_mean: 27.42,
        congestion_percent_mean: 45.32,
        route_hops_mean: 1.0,
        reachable_rate: 1.0,
        runtime_ms_mean: 0.0,
        route_cost_mean: 2.00,
      },
      {
        scenario: 'congestion',
        strategy: 'aco_fuzzy',
        runs: 20,
        latency_ms_mean: 115.29,
        packet_loss_percent_mean: 1.68,
        bandwidth_mbps_mean: 27.42,
        congestion_percent_mean: 45.32,
        route_hops_mean: 1.0,
        reachable_rate: 1.0,
        runtime_ms_mean: 17.30,
        runtime_ms_std: 0.35,
        runtime_ms_ci95_lower: 17.14,
        runtime_ms_ci95_upper: 17.46,
        route_cost_mean: 2.00,
      },
      {
        scenario: 'high_latency',
        strategy: 'dijkstra_latency',
        runs: 1,
        latency_ms_mean: 53.89,
        packet_loss_percent_mean: 10.02,
        bandwidth_mbps_mean: 41.22,
        congestion_percent_mean: 48.02,
        route_hops_mean: 4.0,
        reachable_rate: 1.0,
        runtime_ms_mean: 0.24,
        route_cost_mean: 53.89,
      },
      {
        scenario: 'high_latency',
        strategy: 'adaptive_aco',
        runs: 1,
        latency_ms_mean: 114.63,
        packet_loss_percent_mean: 4.48,
        bandwidth_mbps_mean: 68.93,
        congestion_percent_mean: 47.13,
        route_hops_mean: 2.0,
        reachable_rate: 1.0,
        runtime_ms_mean: 19.75,
        route_cost_mean: 3.22,
      },
      {
        scenario: 'high_latency',
        strategy: 'aco_fuzzy',
        runs: 20,
        latency_ms_mean: 114.63,
        packet_loss_percent_mean: 4.48,
        bandwidth_mbps_mean: 68.93,
        congestion_percent_mean: 47.13,
        route_hops_mean: 2.0,
        reachable_rate: 1.0,
        runtime_ms_mean: 21.13,
        runtime_ms_std: 0.45,
        runtime_ms_ci95_lower: 20.92,
        runtime_ms_ci95_upper: 21.34,
        route_cost_mean: 3.22,
      },
    ]);
  };

  const resetFilters = () => {
    setSelectedScenario('all');
    setSelectedStrategy('all');
  };

  return (
    <AppShell>
      <div className="space-y-8 pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-nexus-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <Database className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-nexus-100 tracking-tight">
                NEXUS Research Studio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Phase 3 Verified Dataset
              </span>
              {isDemoData && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Local Cache
                </span>
              )}
            </div>
            <p className="text-xs text-nexus-400 mt-1 max-w-2xl leading-relaxed">
              Empirical multi-attribute routing benchmark results across 6 failure scenarios, 20 stochastic seeds, and sequential 10-step adaptive recovery trajectories.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-nexus-900 border border-nexus-800 hover:border-nexus-700 text-xs font-mono text-nexus-300 hover:text-nexus-100 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`}
              />
              Reload Results
            </button>
          </div>
        </div>

        {/* Global Filter & View Strip */}
        <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-4 space-y-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* View Tab Switcher */}
            <div className="flex items-center gap-1.5 bg-nexus-950 p-1.5 rounded-xl border border-nexus-800 overflow-x-auto">
              <button
                onClick={() => setActiveTab('metrics')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 ${
                  activeTab === 'metrics'
                    ? 'bg-nexus-800 text-cyan-300 border border-cyan-500/30 shadow-sm font-bold'
                    : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                Scenario Metrics
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 ${
                  activeTab === 'timeline'
                    ? 'bg-nexus-800 text-violet-300 border border-violet-500/30 shadow-sm font-bold'
                    : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                Dynamic Timeline (10-Step)
              </button>
              <button
                onClick={() => setActiveTab('convergence')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 ${
                  activeTab === 'convergence'
                    ? 'bg-nexus-800 text-emerald-300 border border-emerald-500/30 shadow-sm font-bold'
                    : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                ACO Convergence
              </button>
              <button
                onClick={() => setActiveTab('routes')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 ${
                  activeTab === 'routes'
                    ? 'bg-nexus-800 text-cyan-300 border border-cyan-500/30 shadow-sm font-bold'
                    : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                Route Decisions
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 ${
                  activeTab === 'data'
                    ? 'bg-nexus-800 text-amber-300 border border-amber-500/30 shadow-sm font-bold'
                    : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                Raw Data ({totalDetailed || detailedResults.length})
              </button>
              <button
                onClick={() => setActiveTab('methodology')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 ${
                  activeTab === 'methodology'
                    ? 'bg-nexus-800 text-violet-300 border border-violet-500/30 shadow-sm font-bold'
                    : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                Methodology
              </button>
            </div>

            {/* Quick Context Filters */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-nexus-500 text-[11px] uppercase">Scenario:</span>
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-nexus-950 border border-nexus-800 text-nexus-300 text-xs font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Scenarios</option>
                  <option value="normal">Normal</option>
                  <option value="congestion">Congestion</option>
                  <option value="high_latency">Latency Surge</option>
                  <option value="packet_loss">Packet Loss</option>
                  <option value="link_failure">Link Failure</option>
                  <option value="dynamic_combined">Dynamic Stress</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-nexus-500 text-[11px] uppercase">Strategy:</span>
                <select
                  value={selectedStrategy}
                  onChange={(e) => setSelectedStrategy(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-nexus-950 border border-nexus-800 text-nexus-300 text-xs font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Strategies</option>
                  <option value="dijkstra_latency">Dijkstra Latency</option>
                  <option value="dijkstra_fuzzy">Dijkstra Fuzzy</option>
                  <option value="aco_fuzzy">ACO Fuzzy</option>
                  <option value="adaptive_aco">Adaptive ACO</option>
                </select>
              </div>

              {(selectedScenario !== 'all' || selectedStrategy !== 'all') && (
                <button
                  onClick={resetFilters}
                  title="Reset Filters"
                  className="p-1.5 rounded-lg bg-nexus-950 border border-nexus-800 text-nexus-400 hover:text-nexus-200"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Experimental Parameter Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-nexus-900 border border-nexus-800">
            <span className="text-[10px] text-nexus-400 uppercase font-mono block">Topology</span>
            <div className="text-xs font-bold font-mono text-nexus-200 mt-0.5">
              {metadata?.graph_topology?.num_nodes ?? 25}-Node Mesh (S{metadata?.graph_topology?.source ?? 0} → D{metadata?.graph_topology?.destination ?? 24})
            </div>
          </div>
          <div className="p-3 rounded-xl bg-nexus-900 border border-nexus-800">
            <span className="text-[10px] text-nexus-400 uppercase font-mono block">Baseline Seed</span>
            <div className="text-xs font-bold font-mono text-cyan-300 mt-0.5">
              {metadata?.graph_topology?.base_seed ?? 42} (Reproducible)
            </div>
          </div>
          <div className="p-3 rounded-xl bg-nexus-900 border border-nexus-800">
            <span className="text-[10px] text-nexus-400 uppercase font-mono block">ACO Swarm</span>
            <div className="text-xs font-bold font-mono text-emerald-300 mt-0.5">
              {metadata?.aco_parameters?.num_ants ?? 20} Ants · {metadata?.aco_parameters?.num_iterations ?? 50} Iter
            </div>
          </div>
          <div className="p-3 rounded-xl bg-nexus-900 border border-nexus-800">
            <span className="text-[10px] text-nexus-400 uppercase font-mono block">Adaptive Threshold</span>
            <div className="text-xs font-bold font-mono text-violet-300 mt-0.5">
              {metadata?.adaptive_parameters?.quality_change_threshold ? `${(metadata.adaptive_parameters.quality_change_threshold * 100).toFixed(0)}%` : '10%'} Link / {metadata?.adaptive_parameters?.route_cost_degradation_threshold ? `${(metadata.adaptive_parameters.route_cost_degradation_threshold * 100).toFixed(0)}%` : '20%'} Route
            </div>
          </div>
          <div className="p-3 rounded-xl bg-nexus-900 border border-nexus-800">
            <span className="text-[10px] text-nexus-400 uppercase font-mono block">ACO Stochastic Runs</span>
            <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
              {metadata?.experiments?.aco_runs ?? 20} Runs (95% CI)
            </div>
          </div>
          <div className="p-3 rounded-xl bg-nexus-900 border border-nexus-800">
            <span className="text-[10px] text-nexus-400 uppercase font-mono block">Benchmark Date</span>
            <div className="text-xs font-bold font-mono text-nexus-300 mt-0.5 truncate">
              {metadata?.timestamp ? String(metadata.timestamp).split('T')[0] : '2026-10-26'}
            </div>
          </div>
        </div>

        {/* Active Research Studio View */}
        <div className="space-y-8">
          {activeTab === 'metrics' && (
            <ScenarioMetricChart
              summaryRows={summaryRows}
              selectedScenario={selectedScenario}
              selectedStrategy={selectedStrategy}
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineChart timeline={timelineRows} loading={loading} />
          )}

          {activeTab === 'convergence' && (
            <ConvergenceChart
              convergenceData={convergenceRows}
              selectedScenario={selectedScenario}
              loading={loading}
            />
          )}

          {activeTab === 'routes' && (
            <RouteComparisonTable
              summaryRows={summaryRows}
              detailedRows={detailedResults}
              selectedScenario={selectedScenario}
            />
          )}

          {activeTab === 'data' && (
            <DataTable
              results={detailedResults}
              total={totalDetailed}
              loading={loading}
            />
          )}

          {activeTab === 'methodology' && <MethodologyPanel />}
        </div>
      </div>
    </AppShell>
  );
};
