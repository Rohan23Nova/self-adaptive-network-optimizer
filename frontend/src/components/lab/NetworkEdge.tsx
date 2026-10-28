import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
} from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

export interface NetworkEdgeData {
  source: number;
  target: number;
  latency: number;
  packetLoss: number;
  bandwidth: number;
  congestion: number;
  enabled: boolean;
  quality?: number | null;
  cost?: number | null;
  isOnRoute: boolean;
  isSelected: boolean;
  onSelect: (edge: [number, number]) => void;
}

export const NetworkEdge: React.FC<EdgeProps> = memo((props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    selected,
  } = props;

  const edgeData = data as unknown as NetworkEdgeData;
  const isEnabled = edgeData?.enabled ?? true;
  const isOnRoute = edgeData?.isOnRoute ?? false;
  const isCongested = (edgeData?.congestion ?? 0) >= 60;
  const isSelected = selected || edgeData?.isSelected;

  // Use straight path for direct mesh topology links
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  // Calculate colors
  let strokeColor = '#334155'; // Steel slate for normal inactive link
  let strokeWidth = 1.8;
  let strokeDasharray: string | undefined = undefined;

  if (!isEnabled) {
    strokeColor = '#EF4444';
    strokeWidth = 2.2;
    strokeDasharray = '5 5';
  } else if (isOnRoute) {
    strokeColor = '#06B6D4';
    strokeWidth = 3.5;
  } else if (isCongested) {
    strokeColor = '#F59E0B';
    strokeWidth = 2.0;
    strokeDasharray = '4 2';
  }

  if (isSelected) {
    strokeWidth = Math.max(strokeWidth, 3.5);
    strokeColor = isOnRoute ? '#22D3EE' : '#38BDF8';
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (edgeData?.onSelect) {
      edgeData.onSelect([edgeData.source, edgeData.target]);
    }
  };

  return (
    <>
      {/* Invisible wider hit-area for easy clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
        onClick={handleClick}
      />

      {/* Route Glow Underlay */}
      {isOnRoute && isEnabled && (
        <path
          d={edgePath}
          fill="none"
          stroke="#06B6D4"
          strokeWidth={8}
          strokeOpacity={0.25}
          className="pointer-events-none"
        />
      )}

      {/* Main BaseEdge Line */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
          transition: 'stroke 0.3s ease, stroke-width 0.2s ease',
        }}
      />

      {/* Edge Metrics Badge */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          onClick={handleClick}
          className={`cursor-pointer select-none rounded px-1.5 py-0.5 text-[9px] font-mono border transition-all ${
            !isEnabled
              ? 'bg-nexus-950 border-accent-coral text-accent-coral font-bold'
              : isOnRoute
              ? 'bg-nexus-950/95 border-accent-cyan text-accent-cyan font-bold shadow-sm'
              : isSelected
              ? 'bg-nexus-900 border-sky-400 text-sky-200'
              : 'bg-nexus-950/80 border-nexus-800 text-nexus-400 hover:border-nexus-700'
          }`}
          title={`Link (${edgeData?.source}, ${edgeData?.target}): Latency ${edgeData?.latency}ms, Loss ${edgeData?.packetLoss}%, Congestion ${edgeData?.congestion}%`}
        >
          {!isEnabled ? (
            <span>CUT</span>
          ) : (
            <span>{edgeData?.latency}ms</span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

NetworkEdge.displayName = 'NetworkEdge';
