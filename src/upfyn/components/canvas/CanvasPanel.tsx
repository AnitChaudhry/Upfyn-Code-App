import React, { useEffect, useCallback, useState, useRef } from 'react';
import './ExcalidrawStyles.css';
import CanvasBlockToolbar from './CanvasBlockToolbar';
import { initCanvasBlockApi, destroyCanvasBlockApi, handleBlockCommand, canvasBlockApi } from './blocks/canvasBlockApi';
import { readCanvasContext, readSelectedContext, getCanvasRightEdge } from './blocks/canvasContextReader';
import { parseAndPlaceResponse } from './blocks/aiResponseParser';
import { createPromptBlock } from './blocks/blockFactory';
import type { Project } from '../../types/app';

const STORAGE_KEY = 'upfynai-excalidraw-scene';

interface CanvasPanelProps {
  selectedProject?: Project;
  ws?: WebSocket | null;
  sendMessage?: (msg: any) => void;
  latestMessage?: any;
}

const CANVAS_SYSTEM_PROMPT = `You are a visual AI assistant working on an infinite canvas. The user has drawn elements on the canvas and is asking you to analyze and respond.

IMPORTANT: Structure your response using markdown headings so it can be rendered as visual blocks:
- Use ## headings to separate major sections
- Use ### Research: or ### Analysis: for research/analysis sections
- Use ### Suggestions: or ### Ideas: for suggestion sections
- Use > blockquotes for key insights or recommendations
- Use \`\`\`mermaid code blocks for flow diagrams when appropriate
- Keep each section concise (2-4 sentences or bullet points)
- Be visual and structured — your response will appear as blocks on the canvas

Here is the current canvas context:

`;

function CanvasPanel({ selectedProject, ws, sendMessage, latestMessage }: CanvasPanelProps) {
  const [Excalidraw, setExcalidraw] = useState<React.ComponentType<any> | null>(null);
  const [api, setApi] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [selectionCount, setSelectionCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const responseAccumulatorRef = useRef('');
  const promptBlockIdRef = useRef<string | null>(null);
  const promptPositionRef = useRef({ x: 0, y: 0 });
  const chatPanelRef = useRef<HTMLDivElement>(null);

  // Dynamic import (no SSR)
  useEffect(() => {
    // One-time migration: clear ALL stale localStorage scene data
    // (old appState with dark theme or other corrupt state causes lock icon)
    const MIGRATION_KEY = 'upfynai-canvas-v2-migrated';
    if (!localStorage.getItem(MIGRATION_KEY)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(MIGRATION_KEY, '1');
    }

    import('@excalidraw/excalidraw').then((mod) => {
      setExcalidraw(() => mod.Excalidraw);
    });
  }, []);

  const getInitialData = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const scene = JSON.parse(saved);
        return { elements: scene.elements || [], appState: { viewModeEnabled: false, gridModeEnabled: true } };
      }
    } catch { /* ignore */ }
    return { elements: [], appState: { viewModeEnabled: false, gridModeEnabled: true } };
  }, []);

  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ elements }));
    } catch { /* ignore quota errors */ }
    // Track selection count for context indicator
    const selected = Object.keys(appState?.selectedElementIds || {}).length;
    setSelectionCount(selected);
  }, []);

  // Expose API globally + listen for WebSocket canvas updates
  useEffect(() => {
    if (!api) return;
    (window as any).__excalidrawAPI = api;
    initCanvasBlockApi();

    const handleWsMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'canvas-update' && msg.elements && api) {
          api.updateScene({ elements: msg.elements });
        }
        if (msg.type === 'canvas-block-command' && msg.action) {
          handleBlockCommand(msg);
        }
      } catch { /* ignore */ }
    };

    const origWs = (window as any).__upfynWs;
    if (origWs) {
      origWs.addEventListener('message', handleWsMessage);
    }

    return () => {
      delete (window as any).__excalidrawAPI;
      destroyCanvasBlockApi();
      if (origWs) {
        origWs.removeEventListener('message', handleWsMessage);
      }
    };
  }, [api]);

  // Handle AI streaming responses
  useEffect(() => {
    if (!latestMessage || !isRunning) return;

    // Accumulate streaming content
    if (latestMessage.type === 'claude-response' || latestMessage.type === 'assistant') {
      const chunk = latestMessage.content || latestMessage.text || latestMessage.message || '';
      if (chunk) {
        responseAccumulatorRef.current += chunk;
      }
    }

    // On complete, parse and place blocks
    if (latestMessage.type === 'claude-complete' || latestMessage.type === 'message_stop') {
      const fullResponse = responseAccumulatorRef.current.trim();
      if (fullResponse && api) {
        placeResponseBlocks(fullResponse);
        setChatHistory((prev) => [...prev, { role: 'ai', text: fullResponse.slice(0, 200) + (fullResponse.length > 200 ? '...' : '') }]);
      }
      setIsRunning(false);
      responseAccumulatorRef.current = '';
    }
  }, [latestMessage, isRunning, api]);

  // Auto-scroll chat history
  useEffect(() => {
    if (chatPanelRef.current) {
      chatPanelRef.current.scrollTop = chatPanelRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const placeResponseBlocks = useCallback((responseText: string) => {
    if (!api) return;

    const pos = promptPositionRef.current;
    const startX = pos.x + 300; // Place response blocks to the right of prompt
    const startY = pos.y;

    const { blocks, mermaidSections } = parseAndPlaceResponse(
      responseText,
      startX,
      startY,
      promptBlockIdRef.current || undefined,
    );

    // Add all block elements to canvas
    const allNewElements: any[] = [];
    for (const block of blocks) {
      allNewElements.push(...block.elements);
    }

    if (allNewElements.length > 0) {
      const existing = api.getSceneElements();
      api.updateScene({ elements: [...existing, ...allNewElements] });
      // Scroll to show the new blocks
      api.scrollToContent(allNewElements);
    }

    // Handle mermaid sections (rendered as note blocks with mermaid code for now)
    // Full mermaid-to-excalidraw conversion can be added when the dep is installed
    for (const mermaid of mermaidSections) {
      canvasBlockApi.addNote(mermaid.x, mermaid.y, `[Flowchart]\n${mermaid.content}`);
    }
  }, [api]);

  // Run: read canvas context and send to AI
  const handleRun = useCallback(() => {
    if (!api || !sendMessage || isRunning) return;

    const context = readCanvasContext(api);
    const rightEdge = getCanvasRightEdge(api);

    // Create a prompt block showing what we're sending
    const promptText = 'Analyzing canvas...';
    const promptBlock = createPromptBlock(rightEdge.x, rightEdge.y, promptText);

    // Add prompt block to canvas
    const existing = api.getSceneElements();
    api.updateScene({ elements: [...existing, ...promptBlock.elements] });

    promptBlockIdRef.current = promptBlock.blockId;
    promptPositionRef.current = { x: rightEdge.x, y: rightEdge.y };

    // Build the full prompt with canvas context
    const fullPrompt = CANVAS_SYSTEM_PROMPT + context + '\n\nAnalyze the canvas and provide a structured visual response.';

    responseAccumulatorRef.current = '';
    setIsRunning(true);
    setChatHistory((prev) => [...prev, { role: 'user', text: 'Run: Analyze canvas context' }]);

    sendMessage({ type: 'claude-command', command: fullPrompt, options: { canvasMode: true } });
  }, [api, sendMessage, isRunning]);

  // Stop: cancel the running command
  const handleStop = useCallback(() => {
    if (sendMessage) {
      sendMessage({ type: 'cancel-command' });
    }
    setIsRunning(false);
    responseAccumulatorRef.current = '';
  }, [sendMessage]);

  // Chat send: reads canvas context + user message (uses selected context if items selected)
  const handleChatSend = useCallback(() => {
    const text = chatInput.trim();
    if (!text || !api || !sendMessage || isRunning) return;

    // If items are selected, use only selected context; otherwise full canvas
    const selectedCtx = readSelectedContext(api);
    const context = selectedCtx || readCanvasContext(api);
    const contextLabel = selectedCtx ? 'Selected items context' : 'Full canvas context';
    const rightEdge = getCanvasRightEdge(api);

    // Create prompt block with user's message
    const promptBlock = createPromptBlock(rightEdge.x, rightEdge.y, text);
    const existing = api.getSceneElements();
    api.updateScene({ elements: [...existing, ...promptBlock.elements] });

    promptBlockIdRef.current = promptBlock.blockId;
    promptPositionRef.current = { x: rightEdge.x, y: rightEdge.y };

    const fullPrompt = CANVAS_SYSTEM_PROMPT + `[${contextLabel}]\n` + context + '\n\nUser message: ' + text;

    responseAccumulatorRef.current = '';
    setIsRunning(true);
    setChatHistory((prev) => [...prev, { role: 'user', text }]);
    setChatInput('');

    sendMessage({ type: 'claude-command', command: fullPrompt, options: { canvasMode: true } });
  }, [chatInput, api, sendMessage, isRunning]);

  // Clear AI output blocks
  const handleClearAiOutput = useCallback(() => {
    if (!api) return;
    const elements = api.getSceneElements();
    const aiBlockTypes = new Set(['response', 'research', 'suggestion', 'prompt']);
    const aiGroupIds = new Set<string>();

    // Find all AI-generated block groups
    for (const el of elements) {
      if (el.customData?.blockType && aiBlockTypes.has(el.customData.blockType)) {
        if (el.groupIds) {
          for (const gid of el.groupIds) aiGroupIds.add(gid);
        }
      }
    }

    // Mark them as deleted
    const updated = elements.map((el: any) => {
      if (el.customData?.blockType && aiBlockTypes.has(el.customData.blockType)) {
        return { ...el, isDeleted: true };
      }
      if (el.groupIds?.some((g: string) => aiGroupIds.has(g))) {
        return { ...el, isDeleted: true };
      }
      // Also remove context-links between AI blocks
      if (el.customData?.blockType === 'context-link') {
        return { ...el, isDeleted: true };
      }
      return el;
    });

    api.updateScene({ elements: updated });
    setChatHistory([]);
  }, [api]);

  if (!Excalidraw) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading whiteboard...
      </div>
    );
  }

  return (
    <div className="excalidraw-wrapper h-full w-full relative">
      {api && (
        <CanvasBlockToolbar
          api={api}
          onRun={handleRun}
          onStop={handleStop}
          onClearAi={handleClearAiOutput}
          isRunning={isRunning}
        />
      )}
      <Excalidraw
        excalidrawAPI={(a: any) => setApi(a)}
        initialData={getInitialData()}
        onChange={handleChange}
        UIOptions={{
          welcomeScreen: false,
          canvasActions: {
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
          tools: {
            image: false,
          },
        }}
        viewModeEnabled={false}
        gridModeEnabled={true}
      />

      {/* Run/Stop floating button — top right */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {isRunning ? (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            <div className="w-3 h-3 bg-white rounded-sm" />
            Stop
          </button>
        ) : (
          <button
            onClick={handleRun}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors text-sm font-medium canvas-run-btn"
            title="Read canvas context and ask AI"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Run
          </button>
        )}
      </div>

      {/* Running indicator */}
      {isRunning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            AI is analyzing canvas...
          </div>
        </div>
      )}

      {/* Chat toggle button */}
      <button
        onClick={() => {
          setChatOpen(!chatOpen);
          if (!chatOpen) setTimeout(() => textareaRef.current?.focus(), 100);
        }}
        className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        title={chatOpen ? 'Hide chat' : 'Chat with canvas'}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {chatOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          )}
        </svg>
      </button>

      {/* Collapsible chat panel */}
      {chatOpen && (
        <div className="absolute bottom-16 right-4 z-20 w-80 max-h-[50vh] canvas-chat-panel">
          <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Canvas Chat</span>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${selectionCount > 0 ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted/50'}`}>
                  {selectionCount > 0 ? `${selectionCount} selected` : 'full canvas'}
                </span>
              </div>
            </div>

            {/* Chat history */}
            <div ref={chatPanelRef} className="flex-1 overflow-y-auto max-h-48 px-3 py-2 space-y-2">
              {chatHistory.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-4">
                  Ask AI about your canvas. Context is auto-attached.
                </p>
              )}
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs px-2 py-1.5 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary/10 text-foreground ml-6'
                      : 'bg-muted/50 text-foreground mr-6'
                  }`}
                >
                  <span className="font-medium text-[10px] text-muted-foreground block mb-0.5">
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </span>
                  {msg.text}
                </div>
              ))}
              {isRunning && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 px-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  Thinking...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-2 border-t border-border/30">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSend();
                    }
                  }}
                  placeholder="Ask about your canvas..."
                  rows={1}
                  className="flex-1 bg-muted/30 text-foreground text-xs placeholder-muted-foreground/50 resize-none outline-none px-3 py-2 rounded-lg max-h-16 overflow-y-auto border border-border/30 focus:border-primary/30"
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || isRunning}
                  className="shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  {isRunning ? (
                    <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(CanvasPanel);
