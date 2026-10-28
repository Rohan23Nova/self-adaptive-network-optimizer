import React, { useState } from 'react';
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface DataTableProps {
  results: Record<string, any>[];
  total?: number;
  loading?: boolean;
  onFilterChange?: (scenario?: string, strategy?: string) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  results,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scenarioFilter, setScenarioFilter] = useState<string>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const rowsPerPage = 15;

  // Filter rows locally if needed
  const filteredRows = results.filter((r) => {
    if (scenarioFilter !== 'all' && String(r.scenario).toLowerCase() !== scenarioFilter.toLowerCase()) {
      return false;
    }
    if (strategyFilter !== 'all' && String(r.strategy).toLowerCase() !== strategyFilter.toLowerCase()) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchScen = String(r.scenario || '').toLowerCase().includes(term);
      const matchStrat = String(r.strategy || '').toLowerCase().includes(term);
      const matchPath = String(r.route_path || '').toLowerCase().includes(term);
      const matchSeed = String(r.seed || '').includes(term);
      if (!matchScen && !matchStrat && !matchPath && !matchSeed) {
        return false;
      }
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // CSV Export
  const handleExportCSV = () => {
    if (!filteredRows.length) return;

    const headers = [
      'scenario',
      'strategy',
      'seed',
      'run',
      'reachable',
      'latency_ms',
      'packet_loss_percent',
      'bandwidth_mbps',
      'congestion_percent',
      'route_hops',
      'runtime_ms',
      'route_cost',
      'route_path',
    ];

    const csvLines = [headers.join(',')];

    filteredRows.forEach((row) => {
      const line = [
        row.scenario ?? '',
        row.strategy ?? '',
        row.seed ?? '',
        row.run ?? '',
        row.reachable ?? '',
        row.latency_ms ?? '',
        row.packet_loss_percent ?? '',
        row.bandwidth_mbps ?? '',
        row.congestion_percent ?? '',
        row.route_hops ?? '',
        row.runtime_ms ?? '',
        row.route_cost ?? '',
        `"${String(row.route_path ?? '').replace(/"/g, '""')}"`,
      ].join(',');
      csvLines.push(line);
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nexus_research_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-6 space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-nexus-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-nexus-100">
              Run-Level Benchmark Data Records
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {filteredRows.length} Records
            </span>
          </div>
          <p className="text-xs text-nexus-400 mt-1 max-w-2xl">
            Granular execution metrics for every trial across seeds, scenarios, and algorithmic configurations.
          </p>
        </div>

        {/* CSV Export Button */}
        <button
          onClick={handleExportCSV}
          disabled={filteredRows.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-nexus-950 border border-nexus-700 hover:border-cyan-500/50 hover:bg-nexus-900 text-xs font-mono text-cyan-300 transition-all shadow-sm shrink-0 disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          Export CSV ({filteredRows.length})
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nexus-500" />
          <input
            type="text"
            placeholder="Search scenario, strategy, seed, or path..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-200 placeholder-nexus-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Scenario Filter */}
          <select
            value={scenarioFilter}
            onChange={(e) => setScenarioFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Scenarios</option>
            <option value="normal">Normal</option>
            <option value="congestion">Congestion</option>
            <option value="high_latency">Latency Surge</option>
            <option value="packet_loss">Packet Loss</option>
            <option value="link_failure">Link Failure</option>
            <option value="dynamic_combined">Dynamic Stress</option>
          </select>

          {/* Strategy Filter */}
          <select
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-nexus-950 border border-nexus-800 text-nexus-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Strategies</option>
            <option value="dijkstra_latency">Dijkstra Latency</option>
            <option value="dijkstra_fuzzy">Dijkstra Fuzzy</option>
            <option value="aco_fuzzy">ACO Fuzzy</option>
            <option value="adaptive_aco">Adaptive ACO</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-nexus-800 overflow-hidden bg-nexus-950/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-nexus-950 text-nexus-400 border-b border-nexus-800">
              <tr>
                <th className="py-2.5 px-3 font-normal">Scenario</th>
                <th className="py-2.5 px-3 font-normal">Strategy</th>
                <th className="py-2.5 px-2 font-normal text-center">Run</th>
                <th className="py-2.5 px-2 font-normal text-center">Reachable</th>
                <th className="py-2.5 px-3 font-normal text-right">Latency</th>
                <th className="py-2.5 px-3 font-normal text-right">Loss</th>
                <th className="py-2.5 px-3 font-normal text-right">Bandwidth</th>
                <th className="py-2.5 px-3 font-normal text-right">Congestion</th>
                <th className="py-2.5 px-2 font-normal text-center">Hops</th>
                <th className="py-2.5 px-3 font-normal text-right">Runtime</th>
                <th className="py-2.5 px-3 font-normal">Route Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexus-800/60">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-nexus-500 font-mono">
                    Loading run-level data records...
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-nexus-500 font-mono">
                    No matching records found.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, idx) => {
                  const isReachable =
                    row.reachable === 1 ||
                    row.reachable === true ||
                    row.reachable === '1' ||
                    row.reachable === 'True';

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-nexus-900/50 transition-colors"
                    >
                      <td className="py-2 px-3 text-nexus-200 capitalize">
                        {String(row.scenario || '').replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 px-3 text-cyan-300">
                        {String(row.strategy || '').replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 px-2 text-center text-nexus-400">
                        {row.run ?? 1}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {isReachable ? (
                          <span className="text-emerald-400 font-bold">Yes</span>
                        ) : (
                          <span className="text-red-400 font-bold">No</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-nexus-200">
                        {typeof row.latency_ms === 'number'
                          ? `${row.latency_ms.toFixed(1)} ms`
                          : row.latency_ms ?? 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-right text-red-400">
                        {typeof row.packet_loss_percent === 'number'
                          ? `${row.packet_loss_percent.toFixed(2)}%`
                          : row.packet_loss_percent ?? 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-400">
                        {typeof row.bandwidth_mbps === 'number'
                          ? `${row.bandwidth_mbps.toFixed(1)} Mbps`
                          : row.bandwidth_mbps ?? 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-400">
                        {typeof row.congestion_percent === 'number'
                          ? `${row.congestion_percent.toFixed(1)}%`
                          : row.congestion_percent ?? 'N/A'}
                      </td>
                      <td className="py-2 px-2 text-center text-nexus-300">
                        {row.route_hops ?? 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-right text-nexus-400">
                        {typeof row.runtime_ms === 'number'
                          ? `${row.runtime_ms.toFixed(2)} ms`
                          : row.runtime_ms ?? 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-nexus-300 font-mono text-[11px] truncate max-w-xs">
                        {String(row.route_path || '[]')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-nexus-400 pt-1">
        <span>
          Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
          {Math.min(currentPage * rowsPerPage, filteredRows.length)} of {filteredRows.length} records
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-nexus-950 border border-nexus-800 text-nexus-300 hover:bg-nexus-900 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-nexus-950 border border-nexus-800 text-nexus-300 hover:bg-nexus-900 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
