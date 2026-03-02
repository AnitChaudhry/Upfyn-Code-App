// Auto-layout engine — dagre (fast hierarchical) + ELK.js (complex layouts)
// Both are lazy-loaded to avoid crashing on startup (mermaid/dagre TDZ issues)
import type { Node, Edge } from '@xyflow/react';

const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 150;

// Lazy dagre loader
let dagreModule: typeof import('dagre') | null = null;
async function getDagre() {
  if (!dagreModule) {
    dagreModule = await import('dagre');
  }
  return dagreModule.default;
}

// ── dagre layout (default — fast, now async due to lazy load) ────────────────

export async function layoutWithDagre(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): Promise<Node[]> {
  if (nodes.length === 0) return nodes;

  const dagre = await getDagre();
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 100,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, {
      width: node.measured?.width || node.width || DEFAULT_NODE_WIDTH,
      height: node.measured?.height || node.height || DEFAULT_NODE_HEIGHT,
    });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    const w = node.measured?.width || node.width || DEFAULT_NODE_WIDTH;
    const h = node.measured?.height || node.height || DEFAULT_NODE_HEIGHT;
    return {
      ...node,
      position: {
        x: pos.x - w / 2,
        y: pos.y - h / 2,
      },
    };
  });
}

// ── ELK.js layout (complex — async, multiple algorithms) ────────────────────

let elkInstance: any = null;
async function getElk() {
  if (!elkInstance) {
    const ELK = (await import('elkjs/lib/elk.bundled.js')).default;
    elkInstance = new ELK();
  }
  return elkInstance;
}

export type ElkAlgorithm = 'layered' | 'force' | 'stress' | 'mrtree' | 'radial';

export async function layoutWithElk(
  nodes: Node[],
  edges: Edge[],
  algorithm: ElkAlgorithm = 'layered',
): Promise<Node[]> {
  if (nodes.length === 0) return nodes;

  const elk = await getElk();

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': algorithm,
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.direction': 'DOWN',
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.measured?.width || node.width || DEFAULT_NODE_WIDTH,
      height: node.measured?.height || node.height || DEFAULT_NODE_HEIGHT,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const result = await elk.layout(graph);

  const posMap = new Map<string, { x: number; y: number }>();
  for (const child of result.children || []) {
    posMap.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }

  return nodes.map((node) => {
    const pos = posMap.get(node.id);
    if (!pos) return node;
    return { ...node, position: pos };
  });
}

// ── Smart placement for new AI response nodes ───────────────────────────────

export function getPlacementPosition(
  existingNodes: Node[],
  parentNodeId?: string,
  offset: { dx: number; dy: number } = { dx: 320, dy: 0 },
): { x: number; y: number } {
  if (parentNodeId) {
    const parent = existingNodes.find((n) => n.id === parentNodeId);
    if (parent) {
      return {
        x: parent.position.x + offset.dx,
        y: parent.position.y + offset.dy,
      };
    }
  }

  // Default: place to the right of all existing nodes
  if (existingNodes.length === 0) return { x: 100, y: 100 };

  let maxRight = -Infinity;
  let topY = Infinity;
  for (const node of existingNodes) {
    const w = node.measured?.width || node.width || DEFAULT_NODE_WIDTH;
    const right = node.position.x + w;
    if (right > maxRight) maxRight = right;
    if (node.position.y < topY) topY = node.position.y;
  }

  return { x: maxRight + 80, y: topY };
}
