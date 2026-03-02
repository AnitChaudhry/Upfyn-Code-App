import { useState, useCallback, useRef, useEffect } from 'react';
import { ListTree } from 'lucide-react';
import { api } from '../../utils/api';
import BrowserToolbar from './BrowserToolbar';
import BrowserViewport from './BrowserViewport';
import BrowserCommandInput from './BrowserCommandInput';
import BrowserActionLog, { type ActionLogEntry, type ConsoleError } from './BrowserActionLog';
import type { Project } from '../../types/app';

interface BrowserSession {
  sessionId: string;
  viewerUrl: string | null;
  status: 'creating' | 'active' | 'closing';
}

interface BrowserPanelProps {
  selectedProject: Project | null;
}

export default function BrowserPanel({ selectedProject }: BrowserPanelProps) {
  const [session, setSession] = useState<BrowserSession | null>(null);
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'chat' | 'autonomous'>('chat');
  const [commandInput, setCommandInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [actions, setActions] = useState<ActionLogEntry[]>([]);
  const [consoleErrors, setConsoleErrors] = useState<ConsoleError[]>([]);
  const [showActionLog, setShowActionLog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stepCountRef = useRef(0);
  const autonomousAbortRef = useRef<AbortController | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.browser.listSessions();
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const active = data.sessions?.[0];
          if (active) {
            setSession({
              sessionId: active.steel_session_id || active.id,
              viewerUrl: active.viewer_url || active.viewerUrl || null,
              status: 'active',
            });
          }
        }
      } catch {
        // Browser service may not be available
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const createSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.browser.createSession();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create session');
      }
      const data = await res.json();
      setSession({
        sessionId: data.sessionId || data.id,
        viewerUrl: data.viewerUrl || data.sessionViewerUrl || null,
        status: 'active',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to launch browser');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeSession = useCallback(async () => {
    if (!session) return;
    setSession((s) => s ? { ...s, status: 'closing' } : null);
    try {
      await api.browser.closeSession(session.sessionId);
    } catch {
      // ignore
    }
    setSession(null);
    setUrl('');
    setActions([]);
    setConsoleErrors([]);
    stepCountRef.current = 0;
  }, [session]);

  const handleNavigate = useCallback(async (targetUrl: string) => {
    if (!session || !targetUrl) return;
    setUrl(targetUrl);
    try {
      const res = await api.browser.navigate(session.sessionId, targetUrl);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Navigation failed');
      }
    } catch {
      setError('Navigation failed');
    }
  }, [session]);

  const handleRefresh = useCallback(async () => {
    if (!session || !url) return;
    try {
      await api.browser.navigate(session.sessionId, url);
    } catch {
      // ignore
    }
  }, [session, url]);

  const addAction = useCallback((entry: Omit<ActionLogEntry, 'id' | 'step'>) => {
    stepCountRef.current += 1;
    const action: ActionLogEntry = {
      ...entry,
      id: `action-${Date.now()}-${stepCountRef.current}`,
      step: stepCountRef.current,
    };
    setActions((prev) => [...prev, action]);
    setShowActionLog(true);
    return action.id;
  }, []);

  const updateAction = useCallback((id: string, updates: Partial<ActionLogEntry>) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const handleChatCommand = useCallback(async () => {
    if (!session || !commandInput.trim()) return;
    const instruction = commandInput.trim();
    setCommandInput('');
    setIsRunning(true);
    setError(null);

    const actionId = addAction({
      type: 'act',
      instruction,
      timestamp: Date.now(),
      status: 'running',
    });

    try {
      const res = await api.browser.aiAct(session.sessionId, instruction);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        updateAction(actionId, {
          status: 'error',
          result: data.error || 'Action failed',
        });
      } else {
        const data = await res.json();
        updateAction(actionId, {
          status: 'done',
          result: data.result || 'Done',
        });
      }
    } catch (err: any) {
      updateAction(actionId, {
        status: 'error',
        result: err.message || 'Action failed',
      });
    } finally {
      setIsRunning(false);
    }
  }, [session, commandInput, addAction, updateAction]);

  const handleAutonomousGoal = useCallback(async () => {
    if (!session || !commandInput.trim()) return;
    const goal = commandInput.trim();
    setCommandInput('');
    setIsRunning(true);
    setError(null);

    const abortController = new AbortController();
    autonomousAbortRef.current = abortController;

    const goalActionId = addAction({
      type: 'info',
      instruction: `Goal: ${goal}`,
      timestamp: Date.now(),
      status: 'running',
    });

    try {
      const res = await fetch(`/api/browser/sessions/${session.sessionId}/ai/autonomous?goal=${encodeURIComponent(goal)}&maxSteps=20`, {
        credentials: 'include',
        signal: abortController.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        updateAction(goalActionId, { status: 'error', result: data.error || 'Failed' });
        return;
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const event = JSON.parse(raw);
              if (event.type === 'step') {
                addAction({
                  type: event.actionType || 'act',
                  instruction: event.instruction || event.description || '',
                  result: event.result,
                  timestamp: Date.now(),
                  status: event.status === 'error' ? 'error' : 'done',
                });
              } else if (event.type === 'complete') {
                updateAction(goalActionId, {
                  status: 'done',
                  result: event.message || 'Goal completed',
                });
              } else if (event.type === 'error') {
                updateAction(goalActionId, {
                  status: 'error',
                  result: event.error || 'Autonomous run failed',
                });
              }
            } catch {
              // skip malformed events
            }
          }
        }
      }

      // Ensure goal action shows as done if not already updated
      setActions((prev) => {
        const goal = prev.find((a) => a.id === goalActionId);
        if (goal && goal.status === 'running') {
          return prev.map((a) =>
            a.id === goalActionId ? { ...a, status: 'done' as const, result: 'Completed' } : a
          );
        }
        return prev;
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        updateAction(goalActionId, {
          status: 'error',
          result: err.message || 'Autonomous run failed',
        });
      }
    } finally {
      setIsRunning(false);
      autonomousAbortRef.current = null;
    }
  }, [session, commandInput, addAction, updateAction]);

  const handleSubmit = useCallback(() => {
    if (mode === 'chat') {
      handleChatCommand();
    } else {
      handleAutonomousGoal();
    }
  }, [mode, handleChatCommand, handleAutonomousGoal]);

  const handleStop = useCallback(() => {
    autonomousAbortRef.current?.abort();
    setIsRunning(false);
  }, []);

  const handleFixError = useCallback((consoleError: ConsoleError) => {
    // Compose an instruction from the error and send it as a chat command
    const instruction = `Fix this console error: ${consoleError.message}${consoleError.source ? ` (source: ${consoleError.source}:${consoleError.line})` : ''}`;
    setCommandInput(instruction);
    setMode('chat');
  }, []);

  // Periodically fetch console errors when session is active
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    let cancelled = false;

    const fetchErrors = async () => {
      try {
        const res = await api.browser.consoleErrors(session.sessionId);
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (data.errors?.length) {
          setConsoleErrors(data.errors.map((e: any) => ({
            message: e.message || e.text || String(e),
            source: e.source || e.url,
            line: e.line || e.lineNumber,
            timestamp: e.timestamp || Date.now(),
          })));
        }
      } catch {
        // ignore
      }
    };

    const interval = setInterval(fetchErrors, 10000);
    fetchErrors();
    return () => { cancelled = true; clearInterval(interval); };
  }, [session]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <BrowserToolbar
        url={url}
        onUrlChange={setUrl}
        onNavigate={handleNavigate}
        onRefresh={handleRefresh}
        mode={mode}
        onModeChange={setMode}
        hasSession={session?.status === 'active'}
        onNewSession={createSession}
        onCloseSession={closeSession}
        isLoading={isLoading}
      />

      {/* Error banner */}
      {error && (
        <div className="px-3 py-1.5 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-destructive/70 hover:text-destructive">
            Dismiss
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Viewport */}
        <BrowserViewport
          viewerUrl={session?.viewerUrl || null}
          hasSession={!!session}
          isLoading={isLoading}
          onNewSession={createSession}
        />

        {/* Action log toggle button (when hidden) */}
        {!showActionLog && (actions.length > 0 || consoleErrors.length > 0) && (
          <button
            onClick={() => setShowActionLog(true)}
            className="absolute right-2 top-14 z-10 p-1.5 rounded-md bg-muted/80 border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
            title="Show action log"
          >
            <ListTree className="w-3.5 h-3.5" />
            {consoleErrors.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-[8px] text-white flex items-center justify-center">
                {consoleErrors.length > 9 ? '!' : consoleErrors.length}
              </span>
            )}
          </button>
        )}

        {/* Action log sidebar */}
        <BrowserActionLog
          actions={actions}
          consoleErrors={consoleErrors}
          isVisible={showActionLog}
          onClose={() => setShowActionLog(false)}
          onFixError={handleFixError}
        />
      </div>

      {/* Command input */}
      <BrowserCommandInput
        value={commandInput}
        onChange={setCommandInput}
        onSubmit={handleSubmit}
        onStop={handleStop}
        mode={mode}
        isRunning={isRunning}
        hasSession={session?.status === 'active'}
      />
    </div>
  );
}
