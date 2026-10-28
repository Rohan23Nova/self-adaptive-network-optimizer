import React from 'react';
import { Radio, Github, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-nexus-950 border-t border-nexus-800/80 text-nexus-400 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        {/* Col 1: Brand & Mission */}
        <div className="space-y-3 md:col-span-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center">
              <Radio className="w-4 h-4 text-accent-cyan" />
            </div>
            <span className="font-mono font-bold text-nexus-100 tracking-wider">
              NEXUS
            </span>
          </div>
          <p className="text-xs text-nexus-400 leading-relaxed">
            Self-adaptive network routing intelligence combining Mamdani fuzzy inference and Ant Colony Optimization for autonomous failure detection and dynamic rerouting.
          </p>
          <div className="pt-2">
            <a
              href="https://github.com/Rohan23Nova/self-adaptive-network-optimizer.git"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-nexus-300 hover:text-accent-cyan transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="font-mono">Rohan23Nova/self-adaptive-network-optimizer</span>
            </a>
          </div>
        </div>

        {/* Col 2: Soft Computing Architecture */}
        <div className="space-y-2 text-xs">
          <h4 className="font-mono font-semibold text-nexus-200 uppercase tracking-wider text-[11px]">
            Soft Computing Pillars
          </h4>
          <ul className="space-y-1.5 text-nexus-400">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
              <span>Mamdani Fuzzy Inference Engine</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-violet" />
              <span>Centroid Defuzzification (COA)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
              <span>Ant Colony Optimization (ACO)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
              <span>Dijkstra Shortest Path Baselines</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-nexus-400" />
              <span>Closed-Loop Dynamic Feedback</span>
            </li>
          </ul>
        </div>

        {/* Col 3: System Navigation */}
        <div className="space-y-2 text-xs">
          <h4 className="font-mono font-semibold text-nexus-200 uppercase tracking-wider text-[11px]">
            Platform Modules
          </h4>
          <ul className="space-y-1.5">
            <li>
              <Link to="/lab" className="hover:text-accent-cyan transition-colors">
                Network Laboratory Shell
              </Link>
            </li>
            <li>
              <Link to="/strategies" className="hover:text-accent-cyan transition-colors">
                Routing Strategies Deep Dive
              </Link>
            </li>
            <li>
              <Link to="/research" className="hover:text-accent-cyan transition-colors">
                Empirical Research Analytics
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-accent-cyan transition-colors">
                Methodology & Course Context
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Academic Attribution */}
        <div className="space-y-2 text-xs">
          <h4 className="font-mono font-semibold text-nexus-200 uppercase tracking-wider text-[11px]">
            Course Context
          </h4>
          <p className="text-xs text-nexus-400 leading-relaxed">
            Engineered for <strong className="text-nexus-200">Soft Computing Techniques</strong> course research. Evaluates swarm intelligence and fuzzy logic resilience under network stress.
          </p>
          <div className="pt-1 flex items-center gap-2 text-[11px] text-nexus-500 font-mono">
            <span>Python 3.12</span>
            <span>•</span>
            <span>FastAPI</span>
            <span>•</span>
            <span>React + Vite</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-6 border-t border-nexus-850 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-nexus-500">
        <div>
          © 2026 NEXUS Network Intelligence. Academic research simulator.
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1 text-nexus-400">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-emerald" />
            <span>Deterministic Seeded Simulation</span>
          </span>
          <span className="text-nexus-600">|</span>
          <span className="text-nexus-400 font-mono">MIT License</span>
        </div>
      </div>
    </footer>
  );
};
