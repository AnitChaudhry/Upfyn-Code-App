// Canvas Context Reader — scans all Excalidraw elements and builds structured text for AI

type ExcalidrawAPI = {
  getSceneElements: () => readonly any[];
  getAppState: () => any;
};

type BlockInfo = {
  id: string;
  type: string;
  x: number;
  y: number;
  content: string;
  label: string;
};

type ConnectionInfo = {
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

function describePosition(x: number, y: number): string {
  return `(${Math.round(x)}, ${Math.round(y)})`;
}

export function readCanvasContext(api: ExcalidrawAPI): string {
  const elements = api.getSceneElements().filter((el: any) => !el.isDeleted);
  if (elements.length === 0) return 'Canvas is empty.';

  const blocks: BlockInfo[] = [];
  const freeTexts: { text: string; x: number; y: number }[] = [];
  const shapes: { type: string; x: number; y: number; width: number; height: number }[] = [];
  const connections: ConnectionInfo[] = [];
  const drawings: { type: string; x: number; y: number }[] = [];

  // First pass: collect blocks (elements with customData.blockType that aren't context-links)
  const blockElementIds = new Set<string>();
  const blockGroupIds = new Set<string>();

  for (const el of elements) {
    if (el.customData?.blockType && el.customData.blockType !== 'context-link') {
      blockElementIds.add(el.id);
      if (el.groupIds) {
        for (const gid of el.groupIds) blockGroupIds.add(gid);
      }
      blocks.push({
        id: el.id,
        type: el.customData.blockType,
        x: el.x,
        y: el.y,
        content: el.customData.content || el.customData.extractedText || el.customData.generatedContent || '',
        label: el.customData.fileName || el.customData.blockType,
      });
    }
  }

  // Build block ID to label map
  const blockLabelMap = new Map<string, string>();
  for (const b of blocks) {
    const label = b.content ? truncate(b.content, 40) : b.type;
    blockLabelMap.set(b.id, label);
  }

  // Second pass: collect everything else
  for (const el of elements) {
    if (blockElementIds.has(el.id)) continue;
    // Skip elements that belong to a block group
    if (el.groupIds?.some((g: string) => blockGroupIds.has(g))) continue;

    if (el.customData?.blockType === 'context-link') {
      connections.push({
        sourceId: el.customData.sourceId,
        targetId: el.customData.targetId,
        sourceLabel: blockLabelMap.get(el.customData.sourceId) || 'unknown',
        targetLabel: blockLabelMap.get(el.customData.targetId) || 'unknown',
      });
    } else if (el.type === 'arrow' && (el.startBinding || el.endBinding)) {
      const srcId = el.startBinding?.elementId;
      const tgtId = el.endBinding?.elementId;
      if (srcId && tgtId) {
        connections.push({
          sourceId: srcId,
          targetId: tgtId,
          sourceLabel: blockLabelMap.get(srcId) || 'element',
          targetLabel: blockLabelMap.get(tgtId) || 'element',
        });
      }
    } else if (el.type === 'text') {
      freeTexts.push({ text: el.text || el.originalText || '', x: el.x, y: el.y });
    } else if (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond') {
      shapes.push({ type: el.type, x: el.x, y: el.y, width: el.width, height: el.height });
    } else if (el.type === 'freedraw' || el.type === 'line') {
      drawings.push({ type: el.type, x: el.x, y: el.y });
    }
  }

  // Build context string
  const parts: string[] = ['## Canvas Context\n'];

  if (blocks.length > 0) {
    parts.push('### Blocks:');
    for (const b of blocks) {
      const contentPreview = b.content ? truncate(b.content, 120) : '(empty)';
      parts.push(`- [${b.type} at ${describePosition(b.x, b.y)}]: "${contentPreview}"`);
    }
    parts.push('');
  }

  if (freeTexts.length > 0) {
    parts.push('### Free Text:');
    for (const t of freeTexts) {
      parts.push(`- Text at ${describePosition(t.x, t.y)}: "${truncate(t.text, 100)}"`);
    }
    parts.push('');
  }

  if (shapes.length > 0) {
    parts.push('### Shapes:');
    for (const s of shapes) {
      parts.push(`- ${s.type} at ${describePosition(s.x, s.y)} (${Math.round(s.width)}x${Math.round(s.height)})`);
    }
    parts.push('');
  }

  if (drawings.length > 0) {
    parts.push('### Drawings:');
    parts.push(`- ${drawings.length} hand-drawn element(s)`);
    parts.push('');
  }

  if (connections.length > 0) {
    parts.push('### Connections:');
    for (const c of connections) {
      parts.push(`- "${c.sourceLabel}" \u2192 "${c.targetLabel}"`);
    }
    parts.push('');
  }

  // Spatial summary
  if (blocks.length > 1) {
    const sorted = [...blocks].sort((a, b) => a.x - b.x || a.y - b.y);
    const leftMost = sorted[0];
    const rightMost = sorted[sorted.length - 1];
    parts.push('### Spatial Layout:');
    parts.push(`- Leftmost: ${leftMost.type} ("${truncate(leftMost.content, 30)}")`);
    parts.push(`- Rightmost: ${rightMost.type} ("${truncate(rightMost.content, 30)}")`);
    parts.push(`- Total blocks: ${blocks.length}`);
    parts.push('');
  }

  return parts.join('\n');
}

/** Read context from only the currently selected elements */
export function readSelectedContext(api: ExcalidrawAPI): string | null {
  const appState = api.getAppState();
  const selectedIds = new Set(Object.keys(appState.selectedElementIds || {}));
  if (selectedIds.size === 0) return null;

  const allElements = api.getSceneElements().filter((el: any) => !el.isDeleted);

  // Expand selection to include group members
  const expandedIds = new Set(selectedIds);
  for (const el of allElements) {
    if (selectedIds.has(el.id) && el.groupIds) {
      for (const gid of el.groupIds) {
        for (const other of allElements) {
          if (other.groupIds?.includes(gid)) expandedIds.add(other.id);
        }
      }
    }
  }

  const selected = allElements.filter((el: any) => expandedIds.has(el.id));
  if (selected.length === 0) return null;

  const parts: string[] = ['## Selected Items Context\n'];

  for (const el of selected) {
    if (el.customData?.blockType && el.customData.blockType !== 'context-link') {
      const content = el.customData.content || el.customData.extractedText || el.customData.generatedContent || '';
      parts.push(`- [${el.customData.blockType}]: "${truncate(content, 150)}"`);
    } else if (el.type === 'text') {
      parts.push(`- Text: "${truncate(el.text || '', 150)}"`);
    } else if (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond') {
      parts.push(`- Shape: ${el.type} (${Math.round(el.width)}x${Math.round(el.height)})`);
    } else if (el.customData?.blockType === 'context-link') {
      parts.push(`- Connection: linked elements`);
    }
  }

  return parts.join('\n');
}

export function getCanvasRightEdge(api: ExcalidrawAPI): { x: number; y: number } {
  const elements = api.getSceneElements().filter((el: any) => !el.isDeleted);
  if (elements.length === 0) {
    const appState = api.getAppState();
    const cx = (-appState.scrollX + appState.width / 2) / appState.zoom.value;
    const cy = (-appState.scrollY + appState.height / 2) / appState.zoom.value;
    return { x: Math.round(cx), y: Math.round(cy) };
  }

  let maxRight = -Infinity;
  let topY = Infinity;
  for (const el of elements) {
    const right = el.x + (el.width || 0);
    if (right > maxRight) maxRight = right;
    if (el.y < topY) topY = el.y;
  }

  return { x: Math.round(maxRight + 60), y: Math.round(topY) };
}
