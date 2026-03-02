// AI-facing canvas block API — exposed as window.__canvasBlockAPI
// The connected AI manipulates canvas blocks via WebSocket commands that call these methods

import {
  createNoteBlock,
  createPdfBlock,
  createSummaryBlock,
  createContextLink,
} from './blockFactory';

type ExcalidrawAPI = {
  getSceneElements: () => readonly any[];
  getAppState: () => any;
  updateScene: (scene: any) => void;
  scrollToContent: (elements?: any[]) => void;
};

function getApi(): ExcalidrawAPI | null {
  return (window as any).__excalidrawAPI ?? null;
}

function addElementsToScene(newElements: any[]) {
  const api = getApi();
  if (!api) return;
  const existing = api.getSceneElements();
  api.updateScene({ elements: [...existing, ...newElements] });
}

function getViewportCenter(): { x: number; y: number } {
  const api = getApi();
  if (!api) return { x: 100, y: 100 };
  const appState = api.getAppState();
  const x = (-appState.scrollX + appState.width / 2) / appState.zoom.value;
  const y = (-appState.scrollY + appState.height / 2) / appState.zoom.value;
  return { x: Math.round(x - 120), y: Math.round(y - 60) };
}

export const canvasBlockApi = {
  addNote(x?: number, y?: number, content?: string) {
    const pos = x != null && y != null ? { x, y } : getViewportCenter();
    const block = createNoteBlock(pos.x, pos.y, content);
    addElementsToScene(block.elements);
    return { blockId: block.blockId };
  },

  addPdf(x: number, y: number, fileName: string, text: string, pageCount: number = 0, thumbnail?: string | null) {
    const block = createPdfBlock(x, y, fileName, pageCount, text, thumbnail);
    addElementsToScene(block.elements);
    return { blockId: block.blockId };
  },

  addSummary(sourceIds: string[], content?: string, x?: number, y?: number) {
    const pos = x != null && y != null ? { x, y } : getViewportCenter();
    const block = createSummaryBlock(pos.x, pos.y, sourceIds, content);
    addElementsToScene(block.elements);
    return { blockId: block.blockId };
  },

  connectBlocks(sourceId: string, targetId: string) {
    const link = createContextLink(sourceId, targetId);
    addElementsToScene([link.element]);
    return { linkId: link.linkId };
  },

  getBlocks() {
    const api = getApi();
    if (!api) return [];
    return api.getSceneElements()
      .filter((el: any) => el.customData?.blockType && el.customData.blockType !== 'context-link')
      .map((el: any) => ({
        id: el.id,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        ...el.customData,
      }));
  },

  getConnections() {
    const api = getApi();
    if (!api) return [];
    return api.getSceneElements()
      .filter((el: any) => el.customData?.blockType === 'context-link')
      .map((el: any) => ({
        id: el.id,
        sourceId: el.customData.sourceId,
        targetId: el.customData.targetId,
      }));
  },

  updateBlockContent(blockId: string, content: string) {
    const api = getApi();
    if (!api) return;
    const elements = api.getSceneElements().map((el: any) => {
      if (el.id === blockId && el.customData) {
        return {
          ...el,
          customData: { ...el.customData, content, generatedContent: content },
        };
      }
      // Update text elements in the same group
      if (el.type === 'text' && el.groupIds?.length) {
        const block = api.getSceneElements().find(
          (b: any) => b.id === blockId && b.groupIds?.some((g: string) => el.groupIds.includes(g))
        );
        if (block && el.y > block.y + 28) {
          return { ...el, text: content, originalText: content };
        }
      }
      return el;
    });
    api.updateScene({ elements });
  },

  removeBlock(blockId: string) {
    const api = getApi();
    if (!api) return;
    const block = api.getSceneElements().find((el: any) => el.id === blockId);
    if (!block) return;
    const groupIds = block.groupIds ?? [];
    const elements = api.getSceneElements().map((el: any) => {
      // Remove all elements in the block's group
      if (el.id === blockId || (groupIds.length && el.groupIds?.some((g: string) => groupIds.includes(g)))) {
        return { ...el, isDeleted: true };
      }
      // Remove connections to/from this block
      if (el.customData?.blockType === 'context-link' &&
          (el.customData.sourceId === blockId || el.customData.targetId === blockId)) {
        return { ...el, isDeleted: true };
      }
      return el;
    });
    api.updateScene({ elements });
  },
};

export function initCanvasBlockApi() {
  (window as any).__canvasBlockAPI = canvasBlockApi;
}

export function destroyCanvasBlockApi() {
  delete (window as any).__canvasBlockAPI;
}

// Handle incoming WebSocket block commands
export function handleBlockCommand(msg: { action: string; params: any }) {
  const { action, params } = msg;
  switch (action) {
    case 'addNote':
      return canvasBlockApi.addNote(params.x, params.y, params.content);
    case 'addPdf':
      return canvasBlockApi.addPdf(params.x, params.y, params.fileName, params.text, params.pageCount, params.thumbnail);
    case 'addSummary':
      return canvasBlockApi.addSummary(params.sourceIds, params.content, params.x, params.y);
    case 'connectBlocks':
      return canvasBlockApi.connectBlocks(params.sourceId, params.targetId);
    case 'updateBlockContent':
      return canvasBlockApi.updateBlockContent(params.blockId, params.content);
    case 'removeBlock':
      return canvasBlockApi.removeBlock(params.blockId);
    case 'getBlocks':
      return canvasBlockApi.getBlocks();
    case 'getConnections':
      return canvasBlockApi.getConnections();
    default:
      console.warn('Unknown canvas block command:', action);
  }
}
