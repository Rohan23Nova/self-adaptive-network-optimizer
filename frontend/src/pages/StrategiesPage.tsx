import React, { useState } from 'react';
import { AppShell } from '../components/AppShell';
import {
  Layers,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const StrategiesPage: React.FC = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('adaptive_aco');

  const strategies = [
    {
      id: 'dijkstra_latency',
      label: 'Dijkstra Latency',
      tag: 'Classical Single-Metric Baseline',
      color: 'border-nexus-700 text-nexus-300',
      badgeBg: 'bg-nexus-800 text-nexus-400',
      formula: 'w(e) = \\text{latency}(e)',
      objective: 'Minimize cumulative path delay',
      complexity: 'O(E + V \\log V)',
      adaptability: 'Static (No runtime adaptation)',
      pros: [
        'Deterministic and optimal for purely propagation-limited networks',
        'Low computational footprint',
        'Standard implementation in textbook routing protocols (OSPF)',
      ],
      cons: [
        'Completely blind to queue congestion and buffer bloat',
        'Ignores packet drop rates',
        'Continues streaming traffic into severely degraded links',
      ],
      description:
        'Computes the shortest path using static link latency as edge weights. Serves as our primary benchmark to demonstrate the vulnerability of single-metric shortest-path algorithms under network stress.',
    },
    {
      id: 'dijkstra_fuzzy',
      label: 'Dijkstra Fuzzy Cost',
      tag: 'Multi-Criteria Baseline',
      color: 'border-accent-violet/40 text-accent-violet',
      badgeBg: 'bg-accent-violet-subtle text-accent-violet',
      formula: 'w(e) = \\text{cost}_{\\text{fuzzy}}(e) = \\text{COA}(\\text{Mamdani}(C, L, P))',
      objective: 'Minimize multi-dimensional fuzzy link degradation',
      complexity: 'O(E \\cdot T_{\\text{fuzzy}} + V \\log V)',
      adaptability: 'Static initial path (No dynamic rerouting)',
      pros: [
        'Considers congestion, latency, and packet loss simultaneously',
        'Mamdani fuzzy inference prevents routing through congested bottlenecks',
        'Deterministic path output',
      ],
      cons: [
        'Path is fixed at session launch; does not adapt to mid-session events',
        'Higher initial computation overhead for fuzzy defuzzification',
      ],
      description:
        'Replaces single-metric latency with a composite link cost derived from Mamdani fuzzy inference. Effectively balances multiple conflicting QoS metrics, but lacks a dynamic trigger mechanism to respond to runtime failures.',
    },
    {
      id: 'aco_fuzzy',
      label: 'ACO Fuzzy Swarm',
      tag: 'Swarm Metaheuristic',
      color: 'border-accent-emerald/40 text-accent-emerald',
      badgeBg: 'bg-accent-emerald-subtle text-accent-emerald',
      formula: 'P_{ij}^k = \\frac{[\\tau_{ij}]^\\alpha \\cdot [\\eta_{ij}]^\\beta}{\\sum_{l \\in \\text{allowed}} [\\tau_{il}]^\\alpha \\cdot [\\eta_{il}]^\\beta}',
      objective: 'Probabilistic swarm exploration over fuzzy cost surface',
      complexity: 'O(I \\cdot M \\cdot (V + E))',
      adaptability: 'Static swarm calculation',
      pros: [
        'Discovers alternative non-obvious routes through swarm exploration',
        'Pheromone evaporation prevents premature convergence on local optima',
        'Heuristic desirability incorporates Mamdani fuzzy cost: \\(\\eta = 1 / \\text{cost}\\)',
      ],
      cons: [
        'Stochastic nature requires sufficient ant population and iterations',
        'Slightly higher runtime than direct Dijkstra',
      ],
      description:
        'Deploys artificial ant agents that navigate the topology guided by pheromone trails and fuzzy heuristic desirability. Excellent at exploring alternative paths, but without the closed-loop monitor, it operates on a single snapshot.',
    },
    {
      id: 'adaptive_aco',
      label: 'Adaptive ACO (NEXUS Engine)',
      tag: 'Closed-Loop Soft Computing',
      color: 'border-accent-cyan/60 text-accent-cyan',
      badgeBg: 'bg-accent-cyan-subtle text-accent-cyan',
      formula: '\\text{Trigger if } \\frac{Q_0 - Q_t}{Q_0} \\ge Q_{\\text{thresh}} \\quad \\text{or} \\quad \\frac{C_t - C_0}{C_0} \\ge C_{\\text{thresh}}',
      objective: 'Continuous autonomous self-healing and dynamic rerouting',
      complexity: 'O(1) continuous monitor + O(ACO) on reroute trigger',
      adaptability: 'Fully dynamic closed-loop self-healing',
      pros: [
        'Real-time sensitivity: triggers rerouting in <1.5 ms upon QoS drop',
        'Zero packet loss cascading: swaps route before severe congestion builds',
        'Balances route stability with agility via dual sensitivity thresholds',
        'Achieved 98.1% Packet Delivery Ratio across 240 benchmark trials',
      ],
      cons: [
        'Requires continuous telemetry stream from router endpoints',
      ],
      description:
        'The centerpiece of the NEXUS platform. Continuously tracks composite path quality. The moment link degradation exceeds defined tolerance thresholds, it automatically executes ACO swarm optimization to seamlessly divert traffic onto healthy paths.',
    },
  ];

  const current = strategies.find((s) => s.id === selectedStrategy) || strategies[3];

  return (
    <AppShell
      title="Routing Strategies Deep Dive"
      subtitle="Comparative analysis of classical, fuzzy, metaheuristic, and adaptive network routing algorithms."
    >
      <div className="space-y-12">
        {/* Strategy Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {strategies.map((strat) => (
            <button
              key={strat.id}
              onClick={() => setSelectedStrategy(strat.id)}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                selectedStrategy === strat.id
                  ? 'bg-nexus-900 border-accent-cyan shadow-lg shadow-accent-cyan/10'
                  : 'bg-nexus-950 border-nexus-800 text-nexus-400 hover:border-nexus-700 hover:bg-nexus-900/40'
              }`}
            >
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold inline-block mb-2 ${strat.badgeBg}`}
              >
                {strat.id === 'adaptive_aco' ? 'NEXUS Engine' : 'Strategy'}
              </span>
              <h3 className="font-bold text-sm text-nexus-100">{strat.label}</h3>
              <p className="text-[11px] text-nexus-500 mt-1 line-clamp-1">
                {strat.objective}
              </p>
            </button>
          ))}
        </div>

        {/* Selected Strategy Detail Card */}
        <div className="rounded-2xl bg-nexus-900/90 border border-nexus-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-nexus-800 pb-5">
            <div>
              <span className={`text-xs font-mono font-semibold uppercase ${current.badgeBg} px-2.5 py-0.5 rounded`}>
                {current.tag}
              </span>
              <h2 className="text-2xl font-bold text-nexus-100 mt-2">
                {current.label}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-nexus-400 bg-nexus-950 px-3 py-1.5 rounded-lg border border-nexus-800">
              <span className="text-nexus-500">Complexity:</span>
              <span className="text-accent-cyan font-semibold">{current.complexity}</span>
            </div>
          </div>

          <p className="text-sm text-nexus-300 leading-relaxed">
            {current.description}
          </p>

          {/* Mathematical formulation block */}
          <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-800 space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-nexus-500 font-semibold block">
              Algorithmic Formulation
            </span>
            <div className="font-mono text-xs sm:text-sm text-nexus-200 overflow-x-auto py-1">
              <code>{current.formula}</code>
            </div>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-semibold text-accent-emerald uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                <span>Advantages & Strengths</span>
              </h4>
              <ul className="space-y-2 text-xs text-nexus-300">
                {current.pros.map((pro, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-accent-emerald shrink-0">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-mono font-semibold text-accent-coral uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-accent-coral" />
                <span>Limitations & Bottlenecks</span>
              </h4>
              <ul className="space-y-2 text-xs text-nexus-300">
                {current.cons.map((con, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-accent-coral shrink-0">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* COMPARISON MATRIX TABLE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent-violet" />
            <h3 className="text-lg font-bold text-nexus-100">
              Comparative Strategy Matrix
            </h3>
          </div>

          <div className="overflow-x-auto rounded-xl border border-nexus-800 bg-nexus-900/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-nexus-950/80 text-nexus-400 font-mono text-[11px] uppercase border-b border-nexus-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Strategy</th>
                  <th className="py-3.5 px-4 font-semibold">Cost Metric</th>
                  <th className="py-3.5 px-4 font-semibold">Optimization Engine</th>
                  <th className="py-3.5 px-4 font-semibold">Adaptability</th>
                  <th className="py-3.5 px-4 font-semibold">Resilience to Chaos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexus-850">
                <tr className="hover:bg-nexus-850/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-nexus-200">
                    Dijkstra Latency
                  </td>
                  <td className="py-3.5 px-4 font-mono text-nexus-400">
                    Latency only (ms)
                  </td>
                  <td className="py-3.5 px-4 text-nexus-400">
                    Dijkstra (Greedy BFS)
                  </td>
                  <td className="py-3.5 px-4 font-mono text-accent-coral">
                    Static
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-accent-coral-subtle text-accent-coral text-[11px] font-semibold">
                      Poor (Drops traffic)
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-nexus-850/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-nexus-200">
                    Dijkstra Fuzzy
                  </td>
                  <td className="py-3.5 px-4 font-mono text-accent-violet">
                    Fuzzy Defuzzified Cost
                  </td>
                  <td className="py-3.5 px-4 text-nexus-400">
                    Dijkstra on Fuzzy Graph
                  </td>
                  <td className="py-3.5 px-4 font-mono text-nexus-400">
                    Static (Initial only)
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-accent-amber-subtle text-accent-amber text-[11px] font-semibold">
                      Moderate
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-nexus-850/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-nexus-200">
                    ACO Fuzzy Swarm
                  </td>
                  <td className="py-3.5 px-4 font-mono text-accent-emerald">
                    Fuzzy Desirability (1/Cost)
                  </td>
                  <td className="py-3.5 px-4 text-nexus-400">
                    Ant Colony Optimization
                  </td>
                  <td className="py-3.5 px-4 font-mono text-nexus-400">
                    Exploratory
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-accent-emerald-subtle text-accent-emerald text-[11px] font-semibold">
                      High Multi-path
                    </span>
                  </td>
                </tr>

                <tr className="bg-accent-cyan-subtle/30 hover:bg-accent-cyan-subtle/50 transition-colors font-medium">
                  <td className="py-3.5 px-4 font-semibold text-accent-cyan flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                    <span>Adaptive ACO (NEXUS)</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-nexus-200">
                    Dynamic Path Health Q(P)
                  </td>
                  <td className="py-3.5 px-4 text-nexus-200">
                    Closed-Loop ACO Rerouting
                  </td>
                  <td className="py-3.5 px-4 font-mono text-accent-emerald font-semibold">
                    Continuous Closed-Loop
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-accent-emerald-subtle text-accent-emerald text-[11px] font-semibold">
                      Superior (98.1% PDR)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* MAMDANI FUZZY LOGIC PIPELINE EXPLANATION */}
        <div className="rounded-2xl bg-nexus-900 border border-nexus-800 p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent-cyan">
              Inference Architecture
            </span>
            <h3 className="text-xl font-bold text-nexus-100">
              The Mamdani Fuzzy Evaluation Pipeline
            </h3>
            <p className="text-xs text-nexus-400 max-w-3xl leading-relaxed">
              How NEXUS converts noisy, heterogeneous router telemetry into a normalized scalar cost index using fuzzy logic membership functions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-850 space-y-2">
              <span className="text-accent-cyan font-semibold text-[11px]">
                01 // FUZZIFICATION
              </span>
              <p className="font-sans text-nexus-300">
                Maps crisp metrics into linguistic terms (Low, Medium, High) using triangular & trapezoidal membership functions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-850 space-y-2">
              <span className="text-accent-violet font-semibold text-[11px]">
                02 // RULE BASE
              </span>
              <p className="font-sans text-nexus-300">
                Evaluates 27 expert rules covering all combinations of Congestion, Latency, and Loss.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-850 space-y-2">
              <span className="text-accent-emerald font-semibold text-[11px]">
                03 // AGGREGATION
              </span>
              <p className="font-sans text-nexus-300">
                Applies standard Mamdani min-max composition to aggregate the firing strengths of all activated rules.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-850 space-y-2">
              <span className="text-accent-amber font-semibold text-[11px]">
                04 // DEFUZZIFICATION
              </span>
              <p className="font-sans text-nexus-300">
                Computes Center of Area (Centroid) to yield a smooth link quality score in [0.0, 1.0].
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
