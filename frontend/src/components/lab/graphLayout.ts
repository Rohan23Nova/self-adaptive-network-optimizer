/**
 * Stable node coordinates for deterministic topology visualization.
 */

// Canonical 2D layout for the 8-node demo mesh (Source: 0, Destination: 7)
export const DEMO_POSITIONS: Record<number, { x: number; y: number }> = {
  0: { x: 70, y: 260 },   // Source (far left)
  1: { x: 250, y: 100 },  // Upper tier
  2: { x: 250, y: 260 },  // Mid tier
  3: { x: 250, y: 420 },  // Lower tier
  4: { x: 500, y: 100 },  // Upper-mid
  5: { x: 500, y: 420 },  // Lower-mid
  6: { x: 670, y: 170 },  // Pre-destination
  7: { x: 780, y: 260 },  // Destination (far right)
};

/**
 * Returns deterministic x, y coordinates for any node ID in either demo or experiment topology.
 */
export function getNodePosition(
  nodeId: number,
  topologyType: string,
  _totalNodes?: number
): { x: number; y: number } {
  if (topologyType === 'demo' && nodeId in DEMO_POSITIONS) {
    return DEMO_POSITIONS[nodeId];
  }

  // For 25-node experiment topology (or general graphs),
  // layout in a 5-column layered structure from source (0) to destination (totalNodes - 1)
  const cols = 5;
  const col = nodeId % cols;
  const row = Math.floor(nodeId / cols);

  const startX = 60;
  const startY = 80;
  const spacingX = 180;
  const spacingY = 95;

  // Add deterministic staggering for visual organic feel without overlap
  const stagger = (nodeId % 2 === 1) ? 20 : -10;

  return {
    x: startX + col * spacingX,
    y: startY + row * spacingY + stagger,
  };
}
