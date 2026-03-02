import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { BLOCK_WIDTH } from '../blocks/blockFactory';

// Block types that get interactive overlays
const INTERACTIVE_BLOCK_TYPES = new Set(['prompt', 'response', 'research', 'suggestion']);

type OverlayBlock = {
  id: string;
  blockId: string;
  blockType: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

interface BlockOverlayManagerProps {
  elements: any[];
  appState: any;
  excalidrawApi: any;
  onPromptRun: (promptText: string, parentBlockId?: string, position?: { x: number; y: number }) => void;
  onStop: () => void;
  isRunning: boolean;
  activeBlockId: string | null;
  sendMessage?: (msg: any) => void;
}

/**
 * Converts Excalidraw canvas coordinates to screen pixel coordinates.
 */
function canvasToScreen(
  canvasX: number,
  canvasY: number,
  appState: { scrollX?: number; scrollY?: number; zoom?: { value?: number }; offsetLeft?: number; offsetTop?: number },
) {
  const scrollX = appState.scrollX || 0;
  const scrollY = appState.scrollY || 0;
  const zoom = appState.zoom?.value || 1;
  const offsetLeft = appState.offsetLeft || 0;
  const offsetTop = appState.offsetTop || 0;

  return {
    x: (canvasX + scrollX) * zoom + offsetLeft,
    y: (canvasY + scrollY) * zoom + offsetTop,
  };
}

/**
 * Extracts interactive blocks from Excalidraw elements.
 */
function extractBlocks(elements: any[]): OverlayBlock[] {
  const blocks: OverlayBlock[] = [];

  for (const el of elements) {
    if (el.isDeleted) continue;
    const cd = el.customData;
    if (!cd?.blockType || !cd?.blockId) continue;
    if (!INTERACTIVE_BLOCK_TYPES.has(cd.blockType)) continue;

    // Only use rectangle elements (the block container), not text children
    if (el.type !== 'rectangle') continue;

    blocks.push({
      id: el.id,
      blockId: cd.blockId,
      blockType: cd.blockType,
      content: cd.content || '',
      x: el.x,
      y: el.y,
      width: el.width || BLOCK_WIDTH,
      height: el.height || 120,
    });
  }

  return blocks;
}

// === Individual Block Overlays ===

function PromptBlockOverlay({
  block,
  screenPos,
  zoom,
  onRun,
  isRunning,
  isActive,
}: {
  block: OverlayBlock;
  screenPos: { x: number; y: number };
  zoom: number;
  onRun: (text: string) => void;
  isRunning: boolean;
  isActive: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(block.content);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const scale = Math.min(zoom, 1.2);

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: screenPos.x,
        top: screenPos.y + block.height * zoom + 4,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        zIndex: 30,
      }}
    >
      <div className="flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-blue-500/30 rounded-lg shadow-lg px-1.5 py-1">
        {editing ? (
          <div className="flex items-center gap-1">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (text.trim()) { onRun(text.trim()); setEditing(false); }
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              className="w-48 text-[11px] bg-transparent border-none outline-none resize-none text-foreground px-1 py-0.5"
              rows={2}
              placeholder="Edit prompt..."
            />
            <button
              onClick={() => { if (text.trim()) { onRun(text.trim()); setEditing(false); } }}
              disabled={isRunning || !text.trim()}
              className="shrink-0 text-[10px] px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"
            >
              Run
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
              title="Edit prompt"
            >
              Edit
            </button>
            <button
              onClick={() => onRun(block.content)}
              disabled={isRunning}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 disabled:opacity-40"
              title="Run this prompt"
            >
              {isActive && isRunning ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  Running
                </span>
              ) : 'Run'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ResponseBlockOverlay({
  block,
  screenPos,
  zoom,
  onBranch,
  onRerun,
  isRunning,
}: {
  block: OverlayBlock;
  screenPos: { x: number; y: number };
  zoom: number;
  onBranch: () => void;
  onRerun: () => void;
  isRunning: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const scale = Math.min(zoom, 1.2);

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: screenPos.x,
        top: screenPos.y + block.height * zoom + 4,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        zIndex: 30,
      }}
    >
      <div className="flex items-center gap-0.5 bg-card/90 backdrop-blur-sm border border-purple-500/30 rounded-lg shadow-lg px-1 py-0.5">
        <button
          onClick={onBranch}
          disabled={isRunning}
          className="text-[10px] px-1.5 py-0.5 rounded text-purple-400 hover:bg-purple-500/10 disabled:opacity-40"
          title="Branch: create a new prompt from this response"
        >
          Branch
        </button>
        <span className="text-border">|</span>
        <button
          onClick={onRerun}
          disabled={isRunning}
          className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40"
          title="Rerun the prompt that created this response"
        >
          Rerun
        </button>
        <span className="text-border">|</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(block.content).catch(() => {});
          }}
          className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
          title="Copy content"
        >
          Copy
        </button>
        <span className="text-border">|</span>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="text-[10px] px-1 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          ...
        </button>
      </div>

      {/* Extended menu */}
      {showMenu && (
        <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[120px]">
          <button
            onClick={() => { onBranch(); setShowMenu(false); }}
            className="block w-full text-left text-[11px] px-3 py-1.5 text-foreground hover:bg-muted/50"
          >
            Branch from here
          </button>
          <button
            onClick={() => { onRerun(); setShowMenu(false); }}
            className="block w-full text-left text-[11px] px-3 py-1.5 text-foreground hover:bg-muted/50"
          >
            Rerun prompt
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(block.content).catch(() => {});
              setShowMenu(false);
            }}
            className="block w-full text-left text-[11px] px-3 py-1.5 text-foreground hover:bg-muted/50"
          >
            Copy content
          </button>
        </div>
      )}
    </div>
  );
}

// === Inline Prompt Input (for Ask AI anywhere) ===

function InlinePromptInput({
  position,
  zoom,
  onSubmit,
  onCancel,
  isRunning,
}: {
  position: { x: number; y: number };
  zoom: number;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  isRunning: boolean;
}) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scale = Math.min(zoom, 1.2);

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left: position.x, top: position.y, transform: `scale(${scale})`, transformOrigin: 'top left', zIndex: 40 }}
    >
      <div className="bg-card border border-primary/30 rounded-xl shadow-xl p-2 w-64">
        <div className="text-[10px] text-muted-foreground mb-1 font-medium">Ask AI</div>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) onSubmit(text.trim());
            }
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Ask about the canvas..."
          rows={2}
          className="w-full text-xs bg-muted/30 border border-border/30 rounded-lg px-2 py-1.5 outline-none resize-none text-foreground placeholder-muted-foreground/50 focus:border-primary/30"
        />
        <div className="flex items-center justify-end gap-1 mt-1.5">
          <button
            onClick={onCancel}
            className="text-[10px] px-2 py-0.5 rounded text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (text.trim()) onSubmit(text.trim()); }}
            disabled={!text.trim() || isRunning}
            className="text-[10px] px-2.5 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  );
}

// === Main Overlay Manager ===

export function BlockOverlayManager({
  elements,
  appState,
  excalidrawApi,
  onPromptRun,
  onStop,
  isRunning,
  activeBlockId,
  sendMessage,
}: BlockOverlayManagerProps) {
  const [inlinePrompt, setInlinePrompt] = useState<{ x: number; y: number; parentBlockId?: string } | null>(null);

  const blocks = useMemo(() => extractBlocks(elements), [elements]);
  const zoom = appState?.zoom?.value || 1;

  // Find the original prompt content for a response block (walk back via context-links)
  const findParentPrompt = useCallback((blockId: string): string | null => {
    for (const el of elements) {
      if (el.isDeleted) continue;
      if (el.customData?.blockType === 'context-link' && el.customData?.targetId === blockId) {
        const sourceId = el.customData.sourceId;
        // Find the source block's content
        for (const srcEl of elements) {
          if (srcEl.customData?.blockId === sourceId && srcEl.customData?.blockType === 'prompt') {
            return srcEl.customData.content || null;
          }
        }
      }
    }
    return null;
  }, [elements]);

  const handleBranch = useCallback((block: OverlayBlock) => {
    // Open inline prompt positioned below the response block
    const screenPos = canvasToScreen(block.x, block.y + block.height + 40, appState);
    setInlinePrompt({ x: screenPos.x, y: screenPos.y, parentBlockId: block.blockId });
  }, [appState]);

  const handleRerun = useCallback((block: OverlayBlock) => {
    const parentPrompt = findParentPrompt(block.blockId);
    if (parentPrompt) {
      onPromptRun(parentPrompt, undefined, { x: block.x + block.width + 40, y: block.y });
    }
  }, [findParentPrompt, onPromptRun]);

  const handleInlineSubmit = useCallback((text: string) => {
    if (!inlinePrompt) return;
    const parentBlockId = inlinePrompt.parentBlockId;

    // Convert screen position back to canvas coordinates for block placement
    const scrollX = appState.scrollX || 0;
    const scrollY = appState.scrollY || 0;
    const offsetLeft = appState.offsetLeft || 0;
    const offsetTop = appState.offsetTop || 0;
    const canvasX = (inlinePrompt.x - offsetLeft) / zoom - scrollX;
    const canvasY = (inlinePrompt.y - offsetTop) / zoom - scrollY;

    onPromptRun(text, parentBlockId, { x: canvasX, y: canvasY });
    setInlinePrompt(null);
  }, [inlinePrompt, appState, zoom, onPromptRun]);

  // Don't render overlays if zoomed out too far
  if (zoom < 0.3) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 25 }}>
      {blocks.map((block) => {
        const screenPos = canvasToScreen(block.x, block.y, appState);

        // Skip blocks that are off-screen
        if (screenPos.x < -200 || screenPos.y < -200 || screenPos.x > window.innerWidth + 200 || screenPos.y > window.innerHeight + 200) {
          return null;
        }

        if (block.blockType === 'prompt') {
          return (
            <PromptBlockOverlay
              key={block.blockId}
              block={block}
              screenPos={screenPos}
              zoom={zoom}
              onRun={(text) => onPromptRun(text, undefined, { x: block.x, y: block.y })}
              isRunning={isRunning}
              isActive={activeBlockId === block.blockId}
            />
          );
        }

        if (block.blockType === 'response' || block.blockType === 'research' || block.blockType === 'suggestion') {
          return (
            <ResponseBlockOverlay
              key={block.blockId}
              block={block}
              screenPos={screenPos}
              zoom={zoom}
              onBranch={() => handleBranch(block)}
              onRerun={() => handleRerun(block)}
              isRunning={isRunning}
            />
          );
        }

        return null;
      })}

      {/* Inline prompt input (Ask AI / Branch) */}
      {inlinePrompt && (
        <InlinePromptInput
          position={inlinePrompt}
          zoom={zoom}
          onSubmit={handleInlineSubmit}
          onCancel={() => setInlinePrompt(null)}
          isRunning={isRunning}
        />
      )}
    </div>
  );
}
