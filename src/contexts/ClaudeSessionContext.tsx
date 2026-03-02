/**
 * ClaudeSessionContext — Shared Claude Code CLI session per project.
 *
 * All AI-powered components (Chat, Canvas, Workflows) dispatch prompts
 * through this context so they share the same Claude conversation.
 *
 * - First prompt for a project path → `execute_claude_code` (new session)
 * - Subsequent prompts → `continue_claude_code` (uses -c flag)
 * - Tracks `activeCaller` so only the requesting component processes events
 * - Tracks `isBusy` so other components can show a "Claude is busy" state
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { listen } from '@tauri-apps/api/event';

type UnlistenFn = () => void;

export interface ClaudeSessionContextType {
  /** Has at least one prompt been sent for this project path (session exists)? */
  hasSession: (projectPath: string) => boolean;

  /** Mark that a session has been started for a project path */
  markSessionStarted: (projectPath: string) => void;

  /** Reset session state for a project (e.g. user starts fresh) */
  resetSession: (projectPath: string) => void;

  /**
   * Send a prompt through the shared session.
   * Auto-selects execute (new) vs continue based on session state.
   * Returns a Promise that resolves with the full accumulated text response,
   * or rejects on error/timeout.
   */
  sendPrompt: (
    projectPath: string,
    prompt: string,
    model: string,
    callerId: string,
  ) => Promise<string>;

  /** Who is currently using the session? null = idle */
  activeCaller: string | null;

  /** Is a Claude process currently running? */
  isBusy: boolean;
}

const ClaudeSessionContext = createContext<ClaudeSessionContextType | undefined>(undefined);

export const ClaudeSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Track which project paths have an active session (at least one prompt sent)
  const sessionMapRef = useRef<Record<string, boolean>>({});
  const [activeCaller, setActiveCaller] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const hasSession = useCallback((projectPath: string): boolean => {
    return !!sessionMapRef.current[projectPath];
  }, []);

  const markSessionStarted = useCallback((projectPath: string) => {
    sessionMapRef.current[projectPath] = true;
  }, []);

  const resetSession = useCallback((projectPath: string) => {
    delete sessionMapRef.current[projectPath];
  }, []);

  /**
   * sendPrompt — dispatches to Rust backend, listens for events, accumulates
   * text response, and returns it as a resolved Promise string.
   *
   * Chat component uses this for dispatch only (it has its own rich event
   * handling). Canvas/Workflows use the returned text directly.
   */
  const sendPrompt = useCallback(async (
    projectPath: string,
    prompt: string,
    model: string,
    callerId: string,
  ): Promise<string> => {
    if (isBusy) {
      throw new Error('Claude is busy — please wait for the current request to finish.');
    }

    setActiveCaller(callerId);
    setIsBusy(true);

    // Decide execute vs continue
    const isNew = !sessionMapRef.current[projectPath];

    return new Promise<string>(async (resolve, reject) => {
      let accumulated = '';
      const unlisteners: UnlistenFn[] = [];

      // 2-minute safety timeout
      const timeout = setTimeout(() => {
        cleanup();
        setIsBusy(false);
        setActiveCaller(null);
        reject(new Error('Claude request timed out after 2 minutes.'));
      }, 120_000);

      const cleanup = () => {
        clearTimeout(timeout);
        unlisteners.forEach(fn => fn());
      };

      try {
        // Listen for output events
        const outputUn = await listen('claude-output', (event: any) => {
          try {
            const msg = typeof event.payload === 'string'
              ? JSON.parse(event.payload)
              : event.payload;

            // Mark session started on init message
            if (msg.type === 'system' && msg.subtype === 'init' && msg.session_id) {
              sessionMapRef.current[projectPath] = true;
            }

            // Accumulate assistant text
            if (msg.type === 'assistant' && msg.message?.content) {
              for (const block of msg.message.content) {
                if (block.type === 'text' && typeof block.text === 'string') {
                  accumulated += block.text;
                }
              }
            }
          } catch { /* ignore parse errors */ }
        });
        unlisteners.push(outputUn);

        // Listen for completion
        const completeUn = await listen('claude-complete', (_event: any) => {
          cleanup();
          setIsBusy(false);
          setActiveCaller(null);
          resolve(accumulated);
        });
        unlisteners.push(completeUn);

        // Listen for errors
        const errorUn = await listen('claude-error', (event: any) => {
          cleanup();
          setIsBusy(false);
          setActiveCaller(null);
          reject(new Error(typeof event.payload === 'string' ? event.payload : 'Claude error'));
        });
        unlisteners.push(errorUn);

        // Dispatch the prompt
        if (isNew) {
          await api.executeClaudeCode(projectPath, prompt, model);
          sessionMapRef.current[projectPath] = true;
        } else {
          await api.continueClaudeCode(projectPath, prompt, model);
        }
      } catch (err) {
        cleanup();
        setIsBusy(false);
        setActiveCaller(null);
        reject(err);
      }
    });
  }, [isBusy]);

  return (
    <ClaudeSessionContext.Provider
      value={{
        hasSession,
        markSessionStarted,
        resetSession,
        sendPrompt,
        activeCaller,
        isBusy,
      }}
    >
      {children}
    </ClaudeSessionContext.Provider>
  );
};

export const useClaudeSession = (): ClaudeSessionContextType => {
  const ctx = useContext(ClaudeSessionContext);
  if (!ctx) {
    throw new Error('useClaudeSession must be used within a ClaudeSessionProvider');
  }
  return ctx;
};
