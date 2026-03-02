// Canvas Context Reader — scans React Flow nodes and builds text for AI
// Enhanced with: variable substitution (Inputs blocks), @mentions, bidirectional context
import type { Node, Edge } from '@xyflow/react';

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

/** Collect all variables from Inputs blocks */
function collectVariables(nodes: Node[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const node of nodes) {
    if (node.type === 'inputs' && node.data?.variables) {
      const nodeVars = node.data.variables as Record<string, string>;
      Object.assign(vars, nodeVars);
    }
  }
  return vars;
}

/** Substitute {{variable}} placeholders in text using Inputs block values */
export function substituteVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in variables ? variables[key] : match;
  });
}

/** Resolve @[Block Name] mentions to actual block content */
export function resolveMentions(text: string, nodes: Node[]): string {
  return text.replace(/@\[([^\]]+)\]/g, (match, blockName) => {
    const node = nodes.find(n =>
      ((n.data as any)?.label || n.type || '').toLowerCase() === blockName.toLowerCase()
    );
    if (node) {
      const content = String(node.data?.content || node.data?.fullContent || node.data?.label || '');
      return `[Context from "${blockName}"]: ${truncate(content, 300)}`;
    }
    return match;
  });
}

/** Get all nodes connected to a given node (upstream + downstream) */
function getConnectedNodes(nodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    if (edge.source === nodeId) connectedIds.add(edge.target);
    if (edge.target === nodeId) connectedIds.add(edge.source);
  }
  return nodes.filter(n => connectedIds.has(n.id));
}

/** Read context for a specific block (its connected nodes only — Spine AI pattern) */
export function readBlockContext(blockId: string, nodes: Node[], edges: Edge[]): string {
  const block = nodes.find(n => n.id === blockId);
  if (!block) return '';

  const connected = getConnectedNodes(blockId, nodes, edges);
  if (connected.length === 0) return '';

  const variables = collectVariables(nodes);
  const parts: string[] = ['### Connected Context:\n'];

  for (const node of connected) {
    const type = node.type || 'note';
    let content = String(node.data?.fullContent || node.data?.content || node.data?.label || '');
    content = substituteVariables(content, variables);
    const preview = truncate(content, 200);
    const modelInfo = node.data?.modelId ? ` (model: ${node.data.modelId})` : '';
    parts.push(`- [${type}${modelInfo}]: "${preview}"`);
  }

  return parts.join('\n');
}

export function readCanvasContext(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) return 'Canvas is empty.';

  const variables = collectVariables(nodes);
  const parts: string[] = ['## Canvas Context\n'];

  // Variables section (from Inputs blocks)
  if (Object.keys(variables).length > 0) {
    parts.push('### Variables:');
    for (const [key, value] of Object.entries(variables)) {
      parts.push(`- {{${key}}} = "${value}"`);
    }
    parts.push('');
  }

  // Blocks section
  parts.push('### Blocks:');
  for (const node of nodes) {
    const type = node.type || 'note';
    let content = String(node.data?.content || node.data?.label || '');
    content = substituteVariables(content, variables);
    const preview = truncate(content, 120);
    const modelInfo = node.data?.modelId ? ` [model: ${node.data.modelId}]` : '';
    parts.push(`- [${type}${modelInfo} at (${Math.round(node.position.x)}, ${Math.round(node.position.y)})]: "${preview}"`);
  }
  parts.push('');

  // Connections (bidirectional representation)
  if (edges.length > 0) {
    parts.push('### Connections:');
    for (const edge of edges) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      const srcLabel = truncate(String(src?.data?.content || src?.type || 'unknown'), 40);
      const tgtLabel = truncate(String(tgt?.data?.content || tgt?.type || 'unknown'), 40);
      parts.push(`- "${srcLabel}" ↔ "${tgtLabel}"`);
    }
    parts.push('');
  }

  // Spatial summary
  if (nodes.length > 1) {
    const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
    const left = sorted[0];
    const right = sorted[sorted.length - 1];
    parts.push('### Spatial Layout:');
    parts.push(`- Leftmost: ${left.type} ("${truncate(String(left.data?.content || ''), 30)}")`);
    parts.push(`- Rightmost: ${right.type} ("${truncate(String(right.data?.content || ''), 30)}")`);
    parts.push(`- Total nodes: ${nodes.length}`);
    parts.push('');
  }

  return parts.join('\n');
}

export function readSelectedContext(nodes: Node[], selectedIds: Set<string>, edges: Edge[]): string | null {
  if (selectedIds.size === 0) return null;
  const selected = nodes.filter((n) => selectedIds.has(n.id));
  if (selected.length === 0) return null;

  const variables = collectVariables(nodes);
  const parts: string[] = ['## Selected Items Context\n'];

  for (const node of selected) {
    let content = String(node.data?.content || node.data?.label || '');
    content = substituteVariables(content, variables);
    parts.push(`- [${node.type}]: "${truncate(content, 150)}"`);
  }

  // Include edges between selected nodes
  const selectedEdges = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target));
  if (selectedEdges.length > 0) {
    parts.push('\n### Connections:');
    for (const edge of selectedEdges) {
      const src = selected.find((n) => n.id === edge.source);
      const tgt = selected.find((n) => n.id === edge.target);
      parts.push(`- "${truncate(String(src?.data?.content || ''), 40)}" ↔ "${truncate(String(tgt?.data?.content || ''), 40)}"`);
    }
  }

  return parts.join('\n');
}
