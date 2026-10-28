import React, { useState, useEffect } from 'react';

export const NetworkIllustration: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  // Cycle through states to demonstrate dynamic adaptation:
  // Step 0: Normal primary route (0 -> 1 -> 4 -> 7)
  // Step 1: Link 1-4 degrades / congestion spike
  // Step 2: System senses degradation and reroutes to optimal path (0 -> 2 -> 5 -> 7)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Node coordinates on a 600x380 SVG grid
  const nodes = [
    { id: 0, x: 60, y: 190, label: 'Node 0', role: 'source' },
    { id: 1, x: 200, y: 90, label: 'Node 1', role: 'intermediate' },
    { id: 2, x: 200, y: 290, label: 'Node 2', role: 'intermediate' },
    { id: 3, x: 330, y: 190, label: 'Node 3', role: 'intermediate' },
    { id: 4, x: 440, y: 90, label: 'Node 4', role: 'intermediate' },
    { id: 5, x: 440, y: 290, label: 'Node 5', role: 'intermediate' },
    { id: 6, x: 330, y: 330, label: 'Node 6', role: 'intermediate' },
    { id: 7, x: 550, y: 190, label: 'Node 7', role: 'destination' },
  ];

  // Edges connecting nodes
  const edges = [
    { u: 0, v: 1 },
    { u: 0, v: 2 },
    { u: 1, v: 3 },
    { u: 1, v: 4 }, // Degrades in Step 1
    { u: 2, v: 3 },
    { u: 2, v: 5 },
    { u: 2, v: 6 },
    { u: 3, v: 4 },
    { u: 3, v: 5 },
    { u: 4, v: 7 },
    { u: 5, v: 7 },
    { u: 6, v: 5 },
  ];

  // Current active route depending on adaptation phase
  // Step 0: [0, 1, 4, 7]
  // Step 1: [0, 1, 4, 7] with degraded link (1-4)
  // Step 2: Rerouted to [0, 2, 5, 7]
  const currentPath =
    activeStep === 2 ? [0, 2, 5, 7] : [0, 1, 4, 7];

  const isEdgeInPath = (u: number, v: number, path: number[]) => {
    for (let i = 0; i < path.length - 1; i++) {
      if (
        (path[i] === u && path[i + 1] === v) ||
        (path[i] === v && path[i + 1] === u)
      ) {
        return true;
      }
    }
    return false;
  };

  const isDegradedLink = (u: number, v: number) => {
    return (u === 1 && v === 4) || (u === 4 && v === 1);
  };

  return (
    <div className="relative w-full aspect-[16/10] max-w-2xl mx-auto rounded-2xl bg-gradient-to-b from-nexus-900/90 to-nexus-950/95 border border-nexus-800/80 p-4 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col justify-between">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent-violet/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top telemetry status strip */}
      <div className="flex items-center justify-between z-10 px-2 py-1 text-xs border-b border-nexus-800/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
          <span className="text-nexus-400 font-mono tracking-wider uppercase text-[11px]">
            Topology: 8-Router Mesh
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-nexus-400">
            Phase:{' '}
            <span
              className={
                activeStep === 0
                  ? 'text-accent-emerald font-semibold'
                  : activeStep === 1
                  ? 'text-accent-coral font-semibold'
                  : 'text-accent-cyan font-semibold'
              }
            >
              {activeStep === 0
                ? 'Nominal Transmission'
                : activeStep === 1
                ? 'Congestion Detected (Link 1-4)'
                : 'Self-Healed (ACO Fuzzy Reroute)'}
            </span>
          </span>
          <div className="hidden sm:flex items-center gap-1.5 bg-nexus-850 px-2 py-0.5 rounded text-[11px] border border-nexus-750">
            <span className="text-nexus-400">PDR:</span>
            <span className="font-mono text-nexus-200">
              {activeStep === 1 ? '78.4%' : '98.6%'}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 flex items-center justify-center py-2">
        <svg
          viewBox="0 0 600 380"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cyanVioletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="coralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-coral" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render background/inactive edges */}
          {edges.map((e, idx) => {
            const uNode = nodes[e.u];
            const vNode = nodes[e.v];
            const inPath = isEdgeInPath(e.u, e.v, currentPath);
            const isDegraded = isDegradedLink(e.u, e.v);

            if (inPath) return null; // Rendered separately for pulsing effect

            return (
              <line
                key={`edge-${idx}`}
                x1={uNode.x}
                y1={uNode.y}
                x2={vNode.x}
                y2={vNode.y}
                stroke={
                  isDegraded && activeStep === 1
                    ? '#EF4444'
                    : '#1E293B'
                }
                strokeWidth={isDegraded && activeStep === 1 ? 2.5 : 1.5}
                strokeDasharray={isDegraded && activeStep === 1 ? '4 4' : undefined}
                className="transition-all duration-500"
              />
            );
          })}

          {/* Render active route edges with glowing animation */}
          {edges.map((e, idx) => {
            const uNode = nodes[e.u];
            const vNode = nodes[e.v];
            const inPath = isEdgeInPath(e.u, e.v, currentPath);
            const isDegraded = isDegradedLink(e.u, e.v);

            if (!inPath) return null;

            const isWarning = isDegraded && activeStep === 1;

            return (
              <g key={`active-edge-${idx}`}>
                {/* Glow underlay */}
                <line
                  x1={uNode.x}
                  y1={uNode.y}
                  x2={vNode.x}
                  y2={vNode.y}
                  stroke={isWarning ? '#EF4444' : '#06B6D4'}
                  strokeWidth={6}
                  strokeOpacity={0.25}
                  filter={isWarning ? 'url(#glow-coral)' : 'url(#glow-cyan)'}
                />
                {/* Primary route line */}
                <line
                  x1={uNode.x}
                  y1={uNode.y}
                  x2={vNode.x}
                  y2={vNode.y}
                  stroke={isWarning ? '#EF4444' : 'url(#cyanVioletGrad)'}
                  strokeWidth={2.5}
                  strokeDasharray={isWarning ? '5 5' : undefined}
                />
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const isSource = node.role === 'source';
            const isDest = node.role === 'destination';
            const isOnPath = currentPath.includes(node.id);

            let nodeColor = '#334155';
            let strokeColor = '#1E293B';
            let glow = false;

            if (isSource) {
              nodeColor = '#10B981';
              strokeColor = '#059669';
              glow = true;
            } else if (isDest) {
              nodeColor = '#8B5CF6';
              strokeColor = '#7C3AED';
              glow = true;
            } else if (isOnPath) {
              nodeColor = activeStep === 1 && (node.id === 1 || node.id === 4)
                ? '#EF4444'
                : '#06B6D4';
              strokeColor = activeStep === 1 && (node.id === 1 || node.id === 4)
                ? '#DC2626'
                : '#0891B2';
              glow = true;
            }

            return (
              <g key={`node-${node.id}`} className="transition-all duration-300">
                {/* Outer halo for endpoints and active nodes */}
                {glow && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={18}
                    fill={nodeColor}
                    fillOpacity={0.15}
                    className="animate-pulse"
                  />
                )}

                {/* Main router circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSource || isDest ? 14 : 11}
                  fill="#0F172A"
                  stroke={strokeColor}
                  strokeWidth={2.5}
                />

                {/* Inner core */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={4}
                  fill={nodeColor}
                />

                {/* Node Label */}
                <text
                  x={node.x}
                  y={node.y - (isSource || isDest ? 20 : 16)}
                  textAnchor="middle"
                  className="text-[11px] font-mono fill-nexus-300 font-medium"
                >
                  {isSource ? 'R0 (Src)' : isDest ? 'R7 (Dst)' : `R${node.id}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Route Indicator */}
      <div className="z-10 flex flex-wrap items-center justify-between gap-2 px-2 pt-2 border-t border-nexus-800/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-nexus-400 font-mono">Active Path:</span>
          <div className="flex items-center gap-1 font-mono font-medium text-nexus-100 bg-nexus-900 px-2 py-0.5 rounded border border-nexus-800">
            {currentPath.map((nodeId, i) => (
              <React.Fragment key={nodeId}>
                <span
                  className={
                    nodeId === 0
                      ? 'text-accent-emerald'
                      : nodeId === 7
                      ? 'text-accent-violet'
                      : 'text-accent-cyan'
                  }
                >
                  R{nodeId}
                </span>
                {i < currentPath.length - 1 && (
                  <span className="text-nexus-500">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-nexus-400">
            <span className="w-2 h-2 rounded-full bg-accent-emerald inline-block" />
            <span>Source</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-nexus-400">
            <span className="w-2 h-2 rounded-full bg-accent-violet inline-block" />
            <span>Dest</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-nexus-400">
            <span className="w-2 h-2 rounded-full bg-accent-cyan inline-block" />
            <span>Route</span>
          </div>
        </div>
      </div>
    </div>
  );
};
