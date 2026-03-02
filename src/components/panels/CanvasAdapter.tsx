/**
 * Desktop Canvas Adapter
 * Wraps the web app's CanvasWorkspace with local storage and Tauri-based AI.
 * Uses the shared ClaudeSessionContext so Canvas shares the same Claude session
 * as Chat and Workflows — Claude remembers context across all components.
 */
import React, { lazy, Suspense, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useClaudeSession } from '@/contexts/ClaudeSessionContext';
import { invoke } from '@tauri-apps/api/core';

// ─── File-based canvas storage via Tauri (persists as .upfyn-canvas.json) ────

// Track project path for file I/O (set by the adapter component)
let _currentProjectPath: string | null = null;

function createLocalCanvasApi() {
  return {
    load: async (projectName: string) => {
      // Try Tauri file I/O first
      if (_currentProjectPath) {
        try {
          const raw = await invoke<string>('canvas_load', { projectPath: _currentProjectPath });
          const data = JSON.parse(raw);
          return new Response(JSON.stringify({ blocks: data.nodes || data.blocks || [], viewport: data.viewport }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e) {
          console.warn('[CanvasAdapter] Tauri canvas_load failed, falling back to localStorage:', e);
        }
      }
      // Fallback to localStorage (dev mode)
      const key = `desktop-canvas-${projectName}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        return new Response(JSON.stringify({ blocks: data.blocks || [], viewport: data.viewport }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ blocks: [], viewport: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    save: async (projectName: string, blocks: any[], viewport?: any) => {
      // Try Tauri file I/O first
      if (_currentProjectPath) {
        try {
          const data = JSON.stringify({ nodes: blocks, edges: [], viewport });
          await invoke('canvas_save', { projectPath: _currentProjectPath, data });
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e) {
          console.warn('[CanvasAdapter] Tauri canvas_save failed, falling back to localStorage:', e);
        }
      }
      // Fallback to localStorage
      const key = `desktop-canvas-${projectName}`;
      localStorage.setItem(key, JSON.stringify({ blocks, viewport }));
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    clear: async (projectName: string) => {
      if (_currentProjectPath) {
        try {
          await invoke('canvas_save', { projectPath: _currentProjectPath, data: '{"nodes":[],"edges":[],"viewport":null}' });
        } catch (e) {
          console.warn('[CanvasAdapter] Tauri canvas clear failed:', e);
        }
      }
      const key = `desktop-canvas-${projectName}`;
      localStorage.removeItem(key);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}

if (typeof window !== 'undefined') {
  (window as any).__desktopCanvasApi = createLocalCanvasApi();
}

// Mock WebSocket context provider for desktop
const MockWebSocketContext = React.createContext({
  connectionState: 'connected' as string,
  sendMessage: (() => {}) as (msg: any) => void,
  latestMessage: null as any,
});

// Dynamically import CanvasWorkspace
const CanvasWorkspace = lazy(() => import('@/upfyn/components/canvas/CanvasWorkspace'));

interface CanvasAdapterProps {
  projectPath?: string;
}

const CanvasAdapter: React.FC<CanvasAdapterProps> = ({ projectPath }) => {
  // Set module-level project path so canvas API functions can use Tauri file I/O
  _currentProjectPath = projectPath || null;

  const projectName = projectPath
    ? projectPath.split('/').pop() || projectPath.split('\\').pop() || 'default'
    : 'default';
  const [aiMessage, setAiMessage] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const claudeSession = useClaudeSession();

  // Desktop sendMessage: uses shared Claude session instead of raw shell
  const handleSendMessage = useCallback(async (msg: any) => {
    if (msg.type !== 'claude-command' || !msg.command) return;

    // If Claude is busy with another component, show a message
    if (claudeSession.isBusy) {
      setAiMessage({
        type: 'claude-response',
        content: 'Claude is currently busy with another request. Please wait and try again.',
      });
      setTimeout(() => setAiMessage({ type: 'claude-complete' }), 100);
      return;
    }

    setIsStreaming(true);

    try {
      // sendPrompt returns the accumulated text response
      const fullText = await claudeSession.sendPrompt(
        projectPath || '.',
        msg.command,
        'sonnet',
        'canvas',
      );

      if (fullText) {
        setAiMessage({ type: 'claude-response', content: fullText });
        setTimeout(() => {
          setAiMessage({ type: 'claude-complete' });
          setIsStreaming(false);
        }, 100);
      } else {
        setAiMessage({ type: 'claude-response', content: '(No response from Claude)' });
        setTimeout(() => {
          setAiMessage({ type: 'claude-complete' });
          setIsStreaming(false);
        }, 100);
      }
    } catch (err: any) {
      setAiMessage({ type: 'claude-response', content: `Error: ${err.message}` });
      setTimeout(() => {
        setAiMessage({ type: 'claude-complete' });
        setIsStreaming(false);
      }, 100);
    }
  }, [projectPath, claudeSession]);

  const wsContextValue = {
    connectionState: 'connected',
    sendMessage: handleSendMessage,
    latestMessage: aiMessage,
  };

  return (
    <MockWebSocketContext.Provider value={wsContextValue}>
      <Suspense fallback={
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }>
        <CanvasWorkspace
          projectName={projectName}
          sendMessage={handleSendMessage}
          latestMessage={aiMessage}
        />
      </Suspense>
    </MockWebSocketContext.Provider>
  );
};

export default CanvasAdapter;
