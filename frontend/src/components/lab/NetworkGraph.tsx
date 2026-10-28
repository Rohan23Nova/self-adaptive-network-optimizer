import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { RouterNode } from './RouterNode';
import { NetworkEdge } from './NetworkEdge';
import { getNodePosition } from './graphLayout';
import type { TopologyResponse } from '../../api/types';

interface NetworkGraphProps {
  topology: TopologyResponse;
  currentRoute: number[];
  source: number;
  destination: number;
  selectedNode: number | null;
  selectedEdge: [number, number] | null;
  onSelectNode: (id: number) => void;
  onSelectEdge: (edge: [number, number]) => void;
}

const nodeTypes = {
  router: RouterNode,
};

const edgeTypes = {
  networkEdge: NetworkEdge,
};

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  topology,
  currentRoute,
  source,
  destination,
  selectedNode,
  selectedEdge,
  onSelectNode,
  onSelectEdge,
}) => {
  // Compute route edges set for fast lookup
  const routeEdgeSet = useMemo(() => {
    const s = new Set<string>();
    if (currentRoute && currentRoute.length >= 2) {
      for (let i = 0; i < currentRoute.length - 1; i++) {
        const u = currentRoute[i];
        const v = currentRoute[i + 1];
        s.add(`${Math.min(u, v)}-${Math.max(u, v)}`);
      }
    }
    return s;
  }, [currentRoute]);

  // Convert nodes to React Flow nodes
  const nodes: Node[] = useMemo(() => {
    return topology.nodes.map((n) => {
      const isSrc = n.id === source;
      const isDst = n.id === destination;
      const role = isSrc ? 'source' : isDst ? 'destination' : 'intermediate';
      const isOnRoute = currentRoute.includes(n.id);
      const isSelected = selectedNode === n.id;
      const pos = getNodePosition(n.id, topology.topology_type, topology.num_nodes);

      return {
        id: String(n.id),
        type: 'router',
        position: pos,
        data: {
          id: n.id,
          label: `R${n.id}`,
          role,
          enabled: n.enabled,
          incidentLinks: n.incident_links,
          isOnRoute,
          isSelected,
          onSelect: onSelectNode,
        },
      };
    });
  }, [topology, currentRoute, source, destination, selectedNode, onSelectNode]);

  // Convert edges to React Flow edges
  const edges: Edge[] = useMemo(() => {
    return topology.edges.map((e) => {
      const u = Math.min(e.source, e.target);
      const v = Math.max(e.source, e.target);
      const key = `${u}-${v}`;
      const isOnRoute = routeEdgeSet.has(key);
      const isSelected =
        selectedEdge !== null &&
        ((selectedEdge[0] === u && selectedEdge[1] === v) ||
          (selectedEdge[0] === v && selectedEdge[1] === u));

      return {
        id: `e-${u}-${v}`,
        source: String(u),
        target: String(v),
        type: 'networkEdge',
        data: {
          source: u,
          target: v,
          latency: e.latency,
          packetLoss: e.packet_loss,
          bandwidth: e.bandwidth,
          congestion: e.congestion,
          enabled: e.enabled,
          quality: e.quality,
          cost: e.cost,
          isOnRoute,
          isSelected,
          onSelect: onSelectEdge,
        },
      };
    });
  }, [topology, routeEdgeSet, selectedEdge, onSelectEdge]);

  return (
    <div className="relative w-full h-[520px] rounded-2xl bg-nexus-950 border border-nexus-800 overflow-hidden shadow-inner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.3}
        maxZoom={2.0}
        proOptions={{ hideAttribution: true }}
        className="select-none"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#1E293B"
        />
        <Controls
          showInteractive={false}
          className="!bg-nexus-900 !border-nexus-800 !rounded-lg !shadow-lg [&>button]:!bg-nexus-900 [&>button]:!border-nexus-800 [&>button]:!text-nexus-300 [&>button:hover]:!bg-nexus-800"
        />
        <MiniMap
          nodeColor={(n) => {
            const data = n.data as any;
            if (!data?.enabled) return '#EF4444';
            if (data?.role === 'source') return '#10B981';
            if (data?.role === 'destination') return '#8B5CF6';
            if (data?.isOnRoute) return '#06B6D4';
            return '#334155';
          }}
          className="!bg-nexus-900/90 !border !border-nexus-800 !rounded-lg hidden sm:block"
          maskColor="rgba(11, 15, 25, 0.7)"
        />
      </ReactFlow>

      {/* Interactive Legend Overlay */}
      <div className="absolute top-3 right-3 bg-nexus-900/90 border border-nexus-800 rounded-xl p-3 shadow-lg backdrop-blur-sm z-10 text-[10px] font-mono space-y-1.5 hidden md:block">
        <span className="text-nexus-400 font-semibold uppercase text-[9px] block border-b border-nexus-800 pb-1">
          Topology Legend
        </span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-emerald ring-1 ring-accent-emerald/40" />
          <span className="text-nexus-200">Source Router</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-violet ring-1 ring-accent-violet/40" />
          <span className="text-nexus-200">Destination Router</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 bg-accent-cyan rounded" />
          <span className="text-nexus-200">Active ACO Route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 bg-nexus-600 rounded" />
          <span className="text-nexus-400">Alternative Link</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 border-t-2 border-dashed border-accent-coral" />
          <span className="text-accent-coral">Disabled / Cut Link</span>
        </div>
      </div>
    </div>
  );
};
