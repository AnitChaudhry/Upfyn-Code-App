// Block element factories — creates grouped Excalidraw elements with customData metadata

const BLOCK_WIDTH = 240;
const BLOCK_HEIGHT = 120;
const HEADER_HEIGHT = 32;
const BORDER_RADIUS = 12;

export type BlockType = 'note' | 'pdf' | 'summary' | 'prompt' | 'response' | 'research' | 'suggestion';

const BLOCK_COLORS: Record<BlockType, { bg: string; border: string; text: string; accent: string }> = {
  note:       { bg: '#f8fafc', border: '#3b82f6', text: '#1e293b', accent: '#2563eb' },
  pdf:        { bg: '#fef2f2', border: '#ef4444', text: '#1e293b', accent: '#dc2626' },
  summary:    { bg: '#f0fdf4', border: '#22c55e', text: '#1e293b', accent: '#16a34a' },
  prompt:     { bg: '#eff6ff', border: '#3b82f6', text: '#1e293b', accent: '#2563eb' },
  response:   { bg: '#f5f3ff', border: '#8b5cf6', text: '#1e293b', accent: '#7c3aed' },
  research:   { bg: '#f0fdfa', border: '#14b8a6', text: '#1e293b', accent: '#0d9488' },
  suggestion: { bg: '#fffbeb', border: '#f59e0b', text: '#1e293b', accent: '#d97706' },
};

export { BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_COLORS };

function uid(): string {
  return crypto.randomUUID();
}

function makeRect(
  x: number, y: number, w: number, h: number,
  opts: { id: string; groupIds: string[]; bg: string; border: string; customData?: any }
) {
  return {
    id: opts.id,
    type: 'rectangle' as const,
    x, y,
    width: w,
    height: h,
    angle: 0,
    strokeColor: opts.border,
    backgroundColor: opts.bg,
    fillStyle: 'solid' as const,
    strokeWidth: 2,
    roughness: 0,
    opacity: 100,
    groupIds: opts.groupIds,
    roundness: { type: 3, value: BORDER_RADIUS },
    isDeleted: false,
    boundElements: null,
    locked: false,
    customData: opts.customData,
    version: 1,
    versionNonce: Math.floor(Math.random() * 1e9),
    seed: Math.floor(Math.random() * 1e9),
  };
}

function makeText(
  x: number, y: number, text: string,
  opts: { id: string; groupIds: string[]; color: string; fontSize?: number; width?: number; height?: number; customData?: any }
) {
  const fontSize = opts.fontSize ?? 14;
  return {
    id: opts.id,
    type: 'text' as const,
    x, y,
    width: opts.width ?? BLOCK_WIDTH - 24,
    height: opts.height ?? fontSize + 6,
    angle: 0,
    strokeColor: opts.color,
    backgroundColor: 'transparent',
    fillStyle: 'solid' as const,
    strokeWidth: 1,
    roughness: 0,
    opacity: 100,
    groupIds: opts.groupIds,
    roundness: null,
    isDeleted: false,
    boundElements: null,
    locked: false,
    text,
    fontSize,
    fontFamily: 1,
    textAlign: 'left' as const,
    verticalAlign: 'top' as const,
    containerId: null,
    originalText: text,
    autoResize: false,
    lineHeight: 1.25,
    customData: opts.customData,
    version: 1,
    versionNonce: Math.floor(Math.random() * 1e9),
    seed: Math.floor(Math.random() * 1e9),
  };
}

const BLOCK_HEADERS: Record<BlockType, string> = {
  note: '\u{1F4DD} Note',
  pdf: '\u{1F4C4} PDF',
  summary: '\u{2728} Summary',
  prompt: '\u{1F4AC} Prompt',
  response: '\u{1F916} Response',
  research: '\u{1F50D} Research',
  suggestion: '\u{1F4A1} Suggestion',
};

function createGenericBlock(
  type: BlockType, x: number, y: number, content: string,
  extraCustomData?: Record<string, any>,
  widthOverride?: number,
) {
  const groupId = uid();
  const blockId = uid();
  const w = widthOverride ?? BLOCK_WIDTH;
  const lines = content.split('\n');
  const bodyHeight = Math.max(BLOCK_HEIGHT - HEADER_HEIGHT, lines.length * 18 + 16);
  const totalHeight = HEADER_HEIGHT + bodyHeight;
  const colors = BLOCK_COLORS[type];

  const rect = makeRect(x, y, w, totalHeight, {
    id: blockId,
    groupIds: [groupId],
    bg: colors.bg,
    border: colors.border,
    customData: { blockType: type, blockId, content, ...extraCustomData },
  });

  const header = makeText(x + 12, y + 8, BLOCK_HEADERS[type], {
    id: uid(),
    groupIds: [groupId],
    color: colors.accent,
    fontSize: 13,
    width: w - 24,
  });

  const body = makeText(x + 12, y + HEADER_HEIGHT + 4, content, {
    id: uid(),
    groupIds: [groupId],
    color: colors.text,
    fontSize: 13,
    width: w - 24,
    height: bodyHeight - 12,
  });

  return { elements: [rect, header, body], blockId, groupId, totalHeight };
}

export function createNoteBlock(x: number, y: number, content: string = 'New note...') {
  return createGenericBlock('note', x, y, content);
}

export function createPromptBlock(x: number, y: number, content: string) {
  return createGenericBlock('prompt', x, y, content);
}

export function createResponseBlock(x: number, y: number, content: string, width?: number) {
  return createGenericBlock('response', x, y, content, undefined, width ?? 320);
}

export function createResearchBlock(x: number, y: number, content: string, width?: number) {
  return createGenericBlock('research', x, y, content, undefined, width ?? 320);
}

export function createSuggestionBlock(x: number, y: number, content: string, width?: number) {
  return createGenericBlock('suggestion', x, y, content, undefined, width ?? 320);
}

export function createPdfBlock(
  x: number, y: number,
  fileName: string, pageCount: number, extractedText: string, thumbnail?: string | null
) {
  const groupId = uid();
  const blockId = uid();
  const displayName = fileName.length > 28 ? fileName.slice(0, 25) + '...' : fileName;

  const rect = makeRect(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, {
    id: blockId,
    groupIds: [groupId],
    bg: BLOCK_COLORS.pdf.bg,
    border: BLOCK_COLORS.pdf.border,
    customData: { blockType: 'pdf', blockId, fileName, pageCount, extractedText, thumbnail: thumbnail ?? null },
  });

  const header = makeText(x + 12, y + 8, `\u{1F4C4} ${displayName}`, {
    id: uid(),
    groupIds: [groupId],
    color: BLOCK_COLORS.pdf.accent,
    fontSize: 13,
  });

  const meta = makeText(x + 12, y + 32, `${pageCount} page${pageCount !== 1 ? 's' : ''}`, {
    id: uid(),
    groupIds: [groupId],
    color: BLOCK_COLORS.pdf.text,
    fontSize: 12,
  });

  const preview = makeText(x + 12, y + 56, extractedText.slice(0, 80) + (extractedText.length > 80 ? '...' : ''), {
    id: uid(),
    groupIds: [groupId],
    color: '#64748b',
    fontSize: 11,
    height: 48,
  });

  return { elements: [rect, header, meta, preview], blockId, groupId };
}

export function createSummaryBlock(
  x: number, y: number,
  sourceIds: string[], content: string = 'Generating summary...'
) {
  return createGenericBlock('summary', x, y, content, { sourceIds, generatedContent: content });
}

export function createContextLink(sourceId: string, targetId: string) {
  const id = uid();
  return {
    element: {
      id,
      type: 'arrow' as const,
      x: 0,
      y: 0,
      width: 100,
      height: 0,
      angle: 0,
      strokeColor: '#6366f1',
      backgroundColor: 'transparent',
      fillStyle: 'solid' as const,
      strokeWidth: 2,
      roughness: 0,
      opacity: 80,
      groupIds: [],
      roundness: { type: 2 },
      isDeleted: false,
      boundElements: null,
      locked: false,
      points: [[0, 0], [100, 0]] as [number, number][],
      startBinding: { elementId: sourceId, focus: 0, gap: 4 },
      endBinding: { elementId: targetId, focus: 0, gap: 4 },
      startArrowhead: null,
      endArrowhead: 'arrow',
      customData: { blockType: 'context-link', sourceId, targetId },
      version: 1,
      versionNonce: Math.floor(Math.random() * 1e9),
      seed: Math.floor(Math.random() * 1e9),
    },
    linkId: id,
  };
}
