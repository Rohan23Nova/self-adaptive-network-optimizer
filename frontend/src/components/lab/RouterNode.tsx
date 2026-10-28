import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Radio, AlertOctagon, ArrowRight } from 'lucide-react';

export interface RouterNodeData {
  id: number;
  label: string;
  role: 'source' | 'destination' | 'intermediate';
  enabled: boolean;
  incidentLinks: number;
  isOnRoute: boolean;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

export const RouterNode: React.FC<NodeProps> = memo(({ data }) => {
  const nodeData = data as unknown as RouterNodeData;
  const isSource = nodeData.role === 'source';
  const isDest = nodeData.role === 'destination';
  const isEnabled = nodeData.enabled;
  const isOnRoute = nodeData.isOnRoute;
  const isSelected = nodeData.isSelected;

  // Determine styling
  let borderColor = 'border-nexus-700';
  let bgColor = 'bg-nexus-900';
  let badgeColor = 'bg-nexus-800 text-nexus-400';
  let halo = '';

  if (!isEnabled) {
    borderColor = 'border-accent-coral';
    bgColor = 'bg-nexus-950/90';
    badgeColor = 'bg-accent-coral-subtle text-accent-coral';
  } else if (isSource) {
    borderColor = 'border-accent-emerald';
    bgColor = 'bg-nexus-900';
    badgeColor = 'bg-accent-emerald-subtle text-accent-emerald';
    halo = 'shadow-[0_0_20px_rgba(16,185,129,0.35)]';
  } else if (isDest) {
    borderColor = 'border-accent-violet';
    bgColor = 'bg-nexus-900';
    badgeColor = 'bg-accent-violet-subtle text-accent-violet';
    halo = 'shadow-[0_0_20px_rgba(139,92,246,0.35)]';
  } else if (isOnRoute) {
    borderColor = 'border-accent-cyan';
    bgColor = 'bg-nexus-900';
    badgeColor = 'bg-accent-cyan-subtle text-accent-cyan';
    halo = 'shadow-[0_0_15px_rgba(6,182,212,0.3)]';
  }

  if (isSelected) {
    borderColor = 'border-white ring-2 ring-accent-cyan/80';
  }

  return (
    <div
      onClick={() => nodeData.onSelect(nodeData.id)}
      className={`relative rounded-xl border-2 ${borderColor} ${bgColor} ${halo} p-2.5 min-w-[110px] text-center select-none cursor-pointer transition-all duration-200 hover:scale-105 group`}
    >
      {/* Target & Source handles centered for omnidirectional mesh routing */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-nexus-500 opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-nexus-500 opacity-0"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-nexus-500 opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-nexus-500 opacity-0"
      />

      {/* Top micro badge: status or role */}
      <div className="flex items-center justify-between gap-1 text-[9px] font-mono mb-1">
        <span
          className={`px-1.5 py-0.2 rounded font-semibold uppercase ${badgeColor}`}
        >
          {isSource ? 'SRC' : isDest ? 'DST' : !isEnabled ? 'CUT' : `R${nodeData.id}`}
        </span>
        <span className="text-nexus-500 text-[10px]" title="Incident links">
          {nodeData.incidentLinks}L
        </span>
      </div>

      {/* Center Icon & Router ID */}
      <div className="flex items-center justify-center gap-1.5 my-0.5">
        {!isEnabled ? (
          <AlertOctagon className="w-4 h-4 text-accent-coral shrink-0" />
        ) : isSource ? (
          <Radio className="w-4 h-4 text-accent-emerald shrink-0" />
        ) : isDest ? (
          <ArrowRight className="w-4 h-4 text-accent-violet shrink-0" />
        ) : (
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isOnRoute ? 'bg-accent-cyan' : 'bg-nexus-600'
            }`}
          />
        )}
        <span className="font-mono text-xs font-bold text-nexus-100 tracking-tight">
          {isSource ? `R${nodeData.id} (Src)` : isDest ? `R${nodeData.id} (Dst)` : `Router ${nodeData.id}`}
        </span>
      </div>

      {/* Active route indicator pill */}
      {isOnRoute && isEnabled && (
        <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-mono text-accent-cyan font-medium bg-accent-cyan-subtle/80 px-1 rounded">
          <span className="w-1 h-1 rounded-full bg-accent-cyan animate-pulse" />
          <span>Active Route</span>
        </div>
      )}

      {/* Disabled overlay status */}
      {!isEnabled && (
        <div className="mt-1 text-[9px] font-mono text-accent-coral font-bold uppercase tracking-wider">
          OFFLINE
        </div>
      )}
    </div>
  );
});

RouterNode.displayName = 'RouterNode';
