import { useCallback } from 'react';
import type { AppTab } from '../types/app';

/**
 * Voice intent patterns — matches spoken commands to app actions.
 * Returns { type, payload } or null if no intent matched (treat as regular chat input).
 */

type VoiceIntent =
  | { type: 'navigate'; tab: AppTab }
  | { type: 'action'; action: string; args?: string }
  | null;

// Tab navigation patterns (case-insensitive)
const TAB_PATTERNS: Array<{ pattern: RegExp; tab: AppTab }> = [
  { pattern: /\b(?:open|show|go to|switch to|navigate to)\s+(?:the\s+)?(?:chat|conversation)\b/i, tab: 'chat' },
  { pattern: /\b(?:open|show|go to|switch to|navigate to)\s+(?:the\s+)?(?:terminal|shell|console|command line)\b/i, tab: 'shell' },
  { pattern: /\b(?:open|show|go to|switch to|navigate to)\s+(?:the\s+)?(?:files?|file\s*(?:tree|explorer|browser|manager))\b/i, tab: 'files' },
  { pattern: /\b(?:open|show|go to|switch to|navigate to)\s+(?:the\s+)?(?:git|version control|source control)\b/i, tab: 'git' },
  { pattern: /\b(?:open|show|go to|switch to|navigate to)\s+(?:the\s+)?(?:canvas|whiteboard|board|draw)\b/i, tab: 'canvas' },
  { pattern: /\b(?:open|show|go to|switch to|navigate to)\s+(?:the\s+)?(?:workflows?|automations?|cron)\b/i, tab: 'workflows' },
  { pattern: /\b(?:open|show|go to|switch to|navigate to)\s+(?:the\s+)?(?:tasks?|task\s*master)\b/i, tab: 'tasks' },
];

// Action patterns
const ACTION_PATTERNS: Array<{ pattern: RegExp; action: string; extractArgs?: (match: RegExpMatchArray) => string }> = [
  { pattern: /\b(?:run|execute)\s+git\s+status\b/i, action: 'git-status' },
  { pattern: /\b(?:run|execute)\s+git\s+(.+)/i, action: 'git-command', extractArgs: (m) => m[1] },
  { pattern: /\b(?:create|start|new)\s+(?:a\s+)?(?:new\s+)?session\b/i, action: 'new-session' },
  { pattern: /\b(?:clear|reset)\s+(?:the\s+)?(?:chat|conversation)\b/i, action: 'clear-chat' },
  { pattern: /\bscroll\s+(?:to\s+)?(?:the\s+)?(?:bottom|down)\b/i, action: 'scroll-bottom' },
  { pattern: /\b(?:stop|cancel|abort)\s+(?:the\s+)?(?:session|response|generation)\b/i, action: 'abort' },
];

function parseIntent(text: string): VoiceIntent {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Check tab navigation first
  for (const { pattern, tab } of TAB_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type: 'navigate', tab };
    }
  }

  // Check action patterns
  for (const { pattern, action, extractArgs } of ACTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        type: 'action',
        action,
        args: extractArgs ? extractArgs(match) : undefined,
      };
    }
  }

  // No intent matched — this is regular chat input
  return null;
}

type UseVoiceIntentRouterOptions = {
  setActiveTab: (tab: AppTab) => void;
  onChatInput: (text: string) => void;
  onAbortSession?: () => void;
  onScrollToBottom?: () => void;
};

/**
 * Hook that intercepts voice transcripts and routes them to the appropriate handler.
 * Returns a `routeTranscript` function to use instead of the raw `handleTranscript`.
 */
export function useVoiceIntentRouter({
  setActiveTab,
  onChatInput,
  onAbortSession,
  onScrollToBottom,
}: UseVoiceIntentRouterOptions) {
  const routeTranscript = useCallback(
    (text: string) => {
      const intent = parseIntent(text);

      if (!intent) {
        // No command detected — pass through as regular chat input
        onChatInput(text);
        return;
      }

      if (intent.type === 'navigate') {
        setActiveTab(intent.tab);
        return;
      }

      if (intent.type === 'action') {
        switch (intent.action) {
          case 'abort':
            onAbortSession?.();
            return;
          case 'scroll-bottom':
            onScrollToBottom?.();
            return;
          case 'new-session':
            // Navigate to chat — creating new session is done by starting fresh
            setActiveTab('chat');
            return;
          case 'git-status':
          case 'git-command':
            // Switch to git tab and pass the command as chat input
            setActiveTab('git');
            return;
          case 'clear-chat':
            // Navigate to chat — clearing is handled at session level
            setActiveTab('chat');
            return;
          default:
            // Unknown action — fall through to chat
            onChatInput(text);
        }
      }
    },
    [setActiveTab, onChatInput, onAbortSession, onScrollToBottom],
  );

  return { routeTranscript, parseIntent };
}

export { parseIntent };
export type { VoiceIntent };
