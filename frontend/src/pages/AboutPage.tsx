import React from 'react';
import { AppShell } from '../components/AppShell';
import {
  Layers,
  Radio,
  Github,
  Terminal,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const phases = [
    {
      num: 'Phase 01',
      title: 'Foundation Audit & Stabilization',
      desc: 'Validated network simulator, deterministic topology graph builder (NetworkX), Mamdani fuzzy membership functions, and test suite.',
    },
    {
      num: 'Phase 02',
      title: 'Adaptive Routing Engine',
      desc: 'Engineered closed-loop feedback monitor with dual degradation sensitivity thresholds and seamless ACO rerouting.',
    },
    {
      num: 'Phase 03',
      title: 'Experimental Evaluation & Statistical Analytics',
      desc: 'Conducted 240 benchmark trials across 6 chaos scenarios with statistical PDR, latency, and packet loss evaluation.',
    },
    {
      num: 'Phase 04',
      title: 'Interactive Streamlit Dashboard',
      desc: 'Created dynamic parameter tuning, live topology inspection, and chaos simulation interface.',
    },
    {
      num: 'Phase 05',
      title: 'Production FastAPI Backend',
      desc: 'Constructed asynchronous REST API with session management, chaos injection endpoints, and Pydantic validation.',
    },
    {
      num: 'Phase 06',
      title: 'NEXUS React Frontend & Landing Page',
      desc: 'Engineered full-stack design system, landing page, responsive shell, typed API client, and simulation workbench.',
    },
  ];

  return (
    <AppShell
      title="Methodology & Project Context"
      subtitle="Soft Computing Techniques project documentation, mathematical architecture, and system design."
    >
      <div className="space-y-12">
        {/* Project Overview Card */}
        <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-nexus-100">
                NEXUS: Self-Adaptive Network Intelligence
              </h2>
              <span className="text-xs font-mono text-nexus-400">
                Soft Computing Techniques Course Project
              </span>
            </div>
          </div>

          <p className="text-sm text-nexus-300 leading-relaxed">
            NEXUS is an autonomous routing intelligence system that addresses a fundamental flaw in traditional computer networking: single-metric shortest path algorithms (like standard Dijkstra in OSPF) rely on static, crisp measurements and cannot detect buffer bloat, packet drop degradation, or dynamic topological bottlenecks until severe outages occur.
          </p>

          <p className="text-sm text-nexus-300 leading-relaxed">
            By fusing <strong className="text-accent-cyan font-semibold">Mamdani Fuzzy Inference</strong> (which models continuous, uncertain link degradation without binary thresholds) with <strong className="text-accent-emerald font-semibold">Ant Colony Optimization</strong> (a bio-inspired swarm metaheuristic that discovers alternative non-interfering routes), NEXUS creates a closed-loop self-healing routing mesh that autonomously bypasses failures in milliseconds.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono">
            <a
              href="https://github.com/Rohan23Nova/self-adaptive-network-optimizer.git"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-950 border border-nexus-800 text-nexus-200 hover:text-accent-cyan transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub Repository</span>
              <ExternalLink className="w-3 h-3 text-nexus-500" />
            </a>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-950 border border-nexus-800 text-nexus-400">
              <ShieldCheck className="w-4 h-4 text-accent-emerald" />
              <span>100% Deterministic Seeded Simulation</span>
            </div>
          </div>
        </div>

        {/* Phase Evolution Timeline */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent-violet" />
            <h3 className="text-lg font-bold text-nexus-100">
              Engineering Evolution (Phases 1–6)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {phases.map((phase) => (
              <div
                key={phase.num}
                className="p-5 rounded-xl bg-nexus-900/80 border border-nexus-800 space-y-2 hover:border-nexus-750 transition-all"
              >
                <span className="text-[10px] font-mono font-semibold uppercase text-accent-cyan px-2 py-0.5 rounded bg-accent-cyan-subtle border border-accent-cyan/20">
                  {phase.num}
                </span>
                <h4 className="text-sm font-bold text-nexus-100 pt-1">
                  {phase.title}
                </h4>
                <p className="text-xs text-nexus-400 leading-relaxed">
                  {phase.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Mathematical Foundations */}
        <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent-emerald">
              Mathematical Rigor
            </span>
            <h3 className="text-xl font-bold text-nexus-100">
              Theoretical Principles
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-nexus-300">
            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-850 space-y-3">
              <h4 className="font-bold text-sm text-nexus-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-cyan" />
                <span>1. Mamdani Fuzzy Center of Area</span>
              </h4>
              <p className="text-nexus-400 leading-relaxed">
                Rather than using discontinuous step functions, link quality is evaluated by defuzzifying the combined membership output across 27 rules:
              </p>
              <div className="font-mono text-[11px] p-2 rounded bg-nexus-900 text-nexus-200">
                Quality = (∑ x_i · μ(x_i)) / (∑ μ(x_i))
              </div>
              <p className="text-nexus-400 leading-relaxed">
                Cost is subsequently normalized as w(e) = 1.0 - Quality + ε.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-850 space-y-3">
              <h4 className="font-bold text-sm text-nexus-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-violet" />
                <span>2. Ant Colony Optimization (ACO)</span>
              </h4>
              <p className="text-nexus-400 leading-relaxed">
                At each router i, an artificial ant chooses next hop j using the random proportional transition rule:
              </p>
              <div className="font-mono text-[11px] p-2 rounded bg-nexus-900 text-nexus-200">
                P_ij = (τ_ij^α · η_ij^β) / ∑_k (τ_ik^α · η_ik^β)
              </div>
              <p className="text-nexus-400 leading-relaxed">
                Where τ is pheromone intensity and η = 1 / cost is the fuzzy heuristic desirability.
              </p>
            </div>
          </div>
        </div>

        {/* Local Execution & Reproducibility */}
        <div className="p-6 rounded-2xl bg-nexus-900/60 border border-nexus-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-nexus-200">
            <Terminal className="w-4 h-4 text-accent-cyan" />
            <span>Local Developer Execution</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-850 space-y-2">
              <span className="text-accent-cyan text-[11px] font-semibold">
                FastAPI Backend:
              </span>
              <pre className="text-nexus-300 leading-relaxed">
                source .venv/bin/activate{'\n'}
                python -m uvicorn api.main:app --port 8000
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-850 space-y-2">
              <span className="text-accent-violet text-[11px] font-semibold">
                React + Vite Frontend:
              </span>
              <pre className="text-nexus-300 leading-relaxed">
                cd frontend{'\n'}
                npm run dev -- --port 5173
              </pre>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
