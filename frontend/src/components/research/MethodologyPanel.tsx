import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export const MethodologyPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fuzzy' | 'aco' | 'adaptive' | 'parameters'>(
    'fuzzy'
  );

  return (
    <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-nexus-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-nexus-100">
              Scientific Methodology & Algorithmic Foundations
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Soft Computing Architecture
            </span>
          </div>
          <p className="text-xs text-nexus-400 mt-1 max-w-2xl">
            Mathematical formulation of Mamdani fuzzy inference, ant colony swarm routing, and self-adaptive threshold dispatching.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-nexus-950 p-1.5 rounded-xl border border-nexus-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('fuzzy')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all shrink-0 ${
              activeTab === 'fuzzy'
                ? 'bg-nexus-800 text-violet-300 border border-violet-500/30 shadow-sm'
                : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
            }`}
          >
            1. Mamdani Fuzzy System
          </button>
          <button
            onClick={() => setActiveTab('aco')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all shrink-0 ${
              activeTab === 'aco'
                ? 'bg-nexus-800 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
            }`}
          >
            2. Ant Colony Optimization
          </button>
          <button
            onClick={() => setActiveTab('adaptive')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all shrink-0 ${
              activeTab === 'adaptive'
                ? 'bg-nexus-800 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
            }`}
          >
            3. Self-Adaptive Engine
          </button>
          <button
            onClick={() => setActiveTab('parameters')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all shrink-0 ${
              activeTab === 'parameters'
                ? 'bg-nexus-800 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-nexus-400 hover:text-nexus-200 hover:bg-nexus-900/60'
            }`}
          >
            4. Verified Parameters
          </button>
        </div>
      </div>

      {/* Tab 1: Mamdani Fuzzy Inference */}
      {activeTab === 'fuzzy' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-800 space-y-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">
                Input 1: Physical Latency
              </span>
              <p className="text-xs text-nexus-300">
                Universe of discourse: <code className="text-cyan-300 font-mono">[0, 300] ms</code>.
                Triangular/trapezoidal membership functions: <span className="text-nexus-100 font-mono">Low, Medium, High</span>.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-800 space-y-2">
              <span className="text-xs font-mono text-red-400 uppercase tracking-wider block">
                Input 2: Packet Loss
              </span>
              <p className="text-xs text-nexus-300">
                Universe of discourse: <code className="text-red-300 font-mono">[0, 20]%</code>.
                Quantifies bit-error drops and queue buffer overflows into fuzzy sets.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-800 space-y-2">
              <span className="text-xs font-mono text-amber-400 uppercase tracking-wider block">
                Input 3: Link Congestion
              </span>
              <p className="text-xs text-nexus-300">
                Universe of discourse: <code className="text-amber-300 font-mono">[0, 100]%</code>.
                Evaluates active buffer queue saturation and queuing delays.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-nexus-950 border border-nexus-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-nexus-300 font-sans font-bold text-sm">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Centroid Defuzzification (Center of Area - COA)
              </span>
              <span className="text-xs font-mono text-violet-400">Continuous Defuzzification</span>
            </div>
            <p className="text-nexus-400 font-sans leading-relaxed">
              The aggregated Mamdani fuzzy output surface <span className="font-mono text-violet-300">μ_C(z)</span> is defuzzified into a crisp link quality scalar <span className="font-mono text-violet-300">Q_e ∈ [0, 1]</span> using continuous numerical centroid integration:
            </p>
            <div className="p-3 rounded-lg bg-nexus-900 border border-nexus-700/80 text-center text-sm text-cyan-300 overflow-x-auto">
              {"Q^* = ∫ z · μ_C(z) dz  /  ∫ μ_C(z) dz"}
            </div>
            <p className="text-nexus-400 font-sans leading-relaxed pt-1">
              To transform the quality metric into an additive minimization objective suitable for shortest-path graph algorithms, we apply the strictly unitless inverse cost transformation:
            </p>
            <div className="p-3 rounded-lg bg-nexus-900 border border-nexus-700/80 text-center text-sm text-emerald-300 overflow-x-auto">
              {"w_e = 1 / (Q_e + ε),  where ε = 10⁻⁶ prevents division by zero."}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Ant Colony Optimization */}
      {activeTab === 'aco' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="p-5 rounded-xl bg-nexus-950 border border-nexus-800 space-y-3">
            <div className="flex items-center justify-between text-nexus-100 font-bold text-sm">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Probabilistic Ant State Transition Rule
              </span>
              <span className="text-xs font-mono text-emerald-400">Swarm Intelligence</span>
            </div>
            <p className="text-xs text-nexus-400 leading-relaxed">
              When an artificial ant <span className="font-mono text-nexus-200">k</span> stands at router <span className="font-mono text-nexus-200">i</span>, the probability of selecting an adjacent neighbor <span className="font-mono text-nexus-200">j ∈ N_i^k</span> is determined by combining the trail pheromone intensity <span className="font-mono text-emerald-300">τ_ij</span> with the heuristic visibility <span className="font-mono text-cyan-300">η_ij = 1 / w_ij</span>:
            </p>
            <div className="p-3 rounded-lg bg-nexus-900 border border-nexus-700/80 font-mono text-center text-sm text-emerald-300 overflow-x-auto">
              {"P_ij^k(t) = [τ_ij(t)]^α · [η_ij]^β  /  Σ_{l ∈ N_i^k} [τ_il(t)]^α · [η_il]^β"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-800 space-y-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block">
                Pheromone Evaporation (ρ = 0.50)
              </span>
              <p className="text-xs text-nexus-300 leading-relaxed font-sans">
                Prevents premature convergence by gradually decaying unreinforced paths:
              </p>
              <div className="p-2 rounded bg-nexus-900 font-mono text-xs text-cyan-300 text-center">
                {"τ_ij(t+1) = (1 - ρ) · τ_ij(t) + Σ_{k=1}^m Δτ_ij^k"}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-800 space-y-2">
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block">
                Quality Trail Reinforcement (Q_ant = 100.0)
              </span>
              <p className="text-xs text-nexus-300 leading-relaxed font-sans">
                Ants deposit pheromone inversely proportional to total tour cost <span className="font-mono text-emerald-300">L_k</span>:
              </p>
              <div className="p-2 rounded bg-nexus-900 font-mono text-xs text-emerald-300 text-center">
                {"Δτ_ij^k = Q_ant / L_k   (if edge (i, j) ∈ tour k)"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Self-Adaptive Engine */}
      {activeTab === 'adaptive' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="p-5 rounded-xl bg-nexus-950 border border-nexus-800 space-y-3">
            <div className="flex items-center justify-between text-nexus-100 font-bold text-sm">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Continuous Assessment & Selective Rerouting Architecture
              </span>
              <span className="text-xs font-mono text-cyan-400">O(1) Overhead</span>
            </div>
            <p className="text-xs text-nexus-400 leading-relaxed">
              Standard ACO algorithms impose severe CPU overhead by recalculating tours continuously. NEXUS resolves this via an <strong className="text-nexus-200">Adaptive Decision Filter</strong> that executes in <span className="font-mono text-cyan-300">&lt; 0.1 ms</span>:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-nexus-900 border border-nexus-800 font-mono text-xs space-y-1">
                <span className="text-cyan-400 font-bold block">1. Edge Delta Check</span>
                <span className="text-nexus-300 text-[11px] font-sans block">
                  Checks if modified edges belong to the active route. If not on route, recomputation is immediately bypassed.
                </span>
              </div>
              <div className="p-3 rounded-lg bg-nexus-900 border border-nexus-800 font-mono text-xs space-y-1">
                <span className="text-violet-400 font-bold block">2. Quality Threshold (10%)</span>
                <span className="text-nexus-300 text-[11px] font-sans block">
                  Triggers if relative link degradation exceeds <code className="text-violet-300">|ΔQ_e| ≥ 0.10</code>.
                </span>
              </div>
              <div className="p-3 rounded-lg bg-nexus-900 border border-nexus-800 font-mono text-xs space-y-1">
                <span className="text-emerald-400 font-bold block">3. Path Cost Degradation (20%)</span>
                <span className="text-nexus-300 text-[11px] font-sans block">
                  Triggers if cumulative active route cost increases by <code className="text-emerald-300">ΔC_route ≥ 0.20</code>.
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-nexus-300 space-y-1">
              <div className="font-bold text-nexus-100">Zero-Delay Physical Invalidation:</div>
              <p className="text-nexus-400 leading-relaxed">
                When a physical link failure or router crash occurs on the active forwarding path, the adaptive engine bypasses sensitivity checks and immediately launches ACO swarm rerouting, restoring reachability in under <strong className="text-nexus-200">20 ms</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Verified Parameters */}
      {activeTab === 'parameters' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
              <span className="text-[10px] text-nexus-400 uppercase block">Topology Size</span>
              <span className="text-sm font-bold text-nexus-100 mt-1 block">25 Nodes (Mesh)</span>
            </div>
            <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
              <span className="text-[10px] text-nexus-400 uppercase block">Endpoints</span>
              <span className="text-sm font-bold text-nexus-100 mt-1 block">Source 0 → Dest 24</span>
            </div>
            <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
              <span className="text-[10px] text-nexus-400 uppercase block">Pheromone Alpha (α)</span>
              <span className="text-sm font-bold text-cyan-300 mt-1 block">1.0</span>
            </div>
            <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
              <span className="text-[10px] text-nexus-400 uppercase block">Heuristic Beta (β)</span>
              <span className="text-sm font-bold text-cyan-300 mt-1 block">2.0</span>
            </div>
            <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
              <span className="text-[10px] text-nexus-400 uppercase block">Evaporation Rate (ρ)</span>
              <span className="text-sm font-bold text-emerald-400 mt-1 block">0.50</span>
            </div>
            <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
              <span className="text-[10px] text-nexus-400 uppercase block">Ant Colony Size</span>
              <span className="text-sm font-bold text-emerald-400 mt-1 block">20 Ants</span>
            </div>
            <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
              <span className="text-[10px] text-nexus-400 uppercase block">Iterations</span>
              <span className="text-sm font-bold text-violet-400 mt-1 block">50 Iterations</span>
            </div>
            <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
              <span className="text-[10px] text-nexus-400 uppercase block">Base Random Seed</span>
              <span className="text-sm font-bold text-violet-400 mt-1 block">42</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800 text-xs text-nexus-400">
            Experiment run benchmark timestamp: <code className="text-nexus-200 font-mono">2026-10-26T22:01:43.654997</code>. Total execution duration across all benchmark scenarios: <strong className="text-nexus-200">3.174 seconds</strong>.
          </div>
        </div>
      )}
    </div>
  );
};
