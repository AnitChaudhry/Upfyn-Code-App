import { useRef, useState, useCallback } from 'react';
import { StickyNote, FileText, Sparkles, ArrowRightLeft, Play, Square, Eraser } from 'lucide-react';
import { createNoteBlock, createPdfBlock, createSummaryBlock, createContextLink } from './blocks/blockFactory';
import { extractPdfText } from './blocks/PdfUploadHandler';

type Props = {
  api: any; // ExcalidrawAPI
  onRun?: () => void;
  onStop?: () => void;
  onClearAi?: () => void;
  isRunning?: boolean;
};

function getViewportCenter(api: any): { x: number; y: number } {
  const appState = api.getAppState();
  const x = (-appState.scrollX + appState.width / 2) / appState.zoom.value;
  const y = (-appState.scrollY + appState.height / 2) / appState.zoom.value;
  return { x: Math.round(x - 120), y: Math.round(y - 60) };
}

function addElements(api: any, newElements: any[]) {
  const existing = api.getSceneElements();
  api.updateScene({ elements: [...existing, ...newElements] });
}

export default function CanvasBlockToolbar({ api, onRun, onStop, onClearAi, isRunning }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleAddNote = useCallback(() => {
    if (!api) return;
    const { x, y } = getViewportCenter(api);
    const block = createNoteBlock(x, y);
    addElements(api, block.elements);
  }, [api]);

  const handleAddPdf = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !api) return;
    e.target.value = '';

    setPdfLoading(true);
    try {
      const { text, pageCount, thumbnail } = await extractPdfText(file);
      const { x, y } = getViewportCenter(api);
      const block = createPdfBlock(x, y, file.name, pageCount, text, thumbnail);
      addElements(api, block.elements);
    } finally {
      setPdfLoading(false);
    }
  }, [api]);

  const handleAddSummary = useCallback(() => {
    if (!api) return;
    const appState = api.getAppState();
    const selectedIds = Object.keys(appState.selectedElementIds || {});
    const elements = api.getSceneElements();
    const sourceIds = elements
      .filter((el: any) => selectedIds.includes(el.id) && el.customData?.blockId)
      .map((el: any) => el.customData.blockId);

    const { x, y } = getViewportCenter(api);
    const block = createSummaryBlock(x + 280, y, sourceIds, sourceIds.length ? 'Summary of selected blocks' : 'Select blocks to summarize');
    addElements(api, block.elements);
  }, [api]);

  const handleConnect = useCallback(() => {
    if (!api) return;
    const appState = api.getAppState();
    const selectedIds = Object.keys(appState.selectedElementIds || {});
    const elements = api.getSceneElements();

    const blockElements = elements.filter(
      (el: any) => selectedIds.includes(el.id) && el.customData?.blockId
    );

    if (blockElements.length === 2) {
      const link = createContextLink(blockElements[0].id, blockElements[1].id);
      addElements(api, [link.element]);
      setConnectMode(false);
    } else {
      setConnectMode(!connectMode);
    }
  }, [api, connectMode]);

  const buttonClass = 'flex items-center justify-center w-9 h-9 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-black/5';

  return (
    <div className="canvas-block-toolbar">
      {/* AI Actions */}
      {isRunning ? (
        <button
          onClick={onStop}
          className={`${buttonClass} text-red-500 hover:text-red-600 hover:bg-red-50`}
          title="Stop AI"
        >
          <Square className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={onRun}
          className={`${buttonClass} text-primary hover:text-primary hover:bg-primary/10`}
          title="Run: Analyze canvas with AI"
        >
          <Play className="w-4 h-4" />
        </button>
      )}

      <button
        onClick={onClearAi}
        className={buttonClass}
        title="Clear AI output blocks"
      >
        <Eraser className="w-4 h-4" />
      </button>

      <div className="w-5 border-t border-black/10 mx-auto" />

      {/* Block Actions */}
      <button onClick={handleAddNote} className={buttonClass} title="Add Note">
        <StickyNote className="w-4 h-4" />
      </button>

      <button onClick={handleAddPdf} className={buttonClass} title="Add PDF" disabled={pdfLoading}>
        <FileText className={`w-4 h-4 ${pdfLoading ? 'animate-pulse' : ''}`} />
      </button>

      <button onClick={handleAddSummary} className={buttonClass} title="Add Summary">
        <Sparkles className="w-4 h-4" />
      </button>

      <div className="w-5 border-t border-black/10 mx-auto" />

      <button
        onClick={handleConnect}
        className={`${buttonClass} ${connectMode ? 'bg-indigo-500/10 text-indigo-500' : ''}`}
        title="Connect Blocks (select 2)"
      >
        <ArrowRightLeft className="w-4 h-4" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelected}
        className="hidden"
      />

      {connectMode && (
        <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-background/90 border border-border rounded-md px-2 py-1 text-xs text-muted-foreground whitespace-nowrap">
          Select 2 blocks, then click Connect
        </div>
      )}
    </div>
  );
}
