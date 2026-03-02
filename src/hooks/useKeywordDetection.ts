/**
 * Keyword Detection Hook — Context-aware version
 *
 * Detects keywords as users type in workflow description fields.
 * Two layers of detection:
 *
 * 1. DEV TOOLS (local): Always shows suggestions (git, npm, docker, etc.)
 * 2. COMPOSIO INTEGRATIONS (cloud): Only shows popup for NOT-connected
 *    integrations — nudges user to connect. Already-connected ones are
 *    silently available in the step type picker.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DEV_KEYWORD_MAP,
  COMPOSIO_KEYWORD_MAP,
  DEV_CATALOG_BY_ID,
  COMPOSIO_CATALOG_BY_ID,
  type DevToolEntry,
  type ComposioIntegrationEntry,
} from '@/lib/desktopToolCatalog';
import { composioCatalog, type ComposioCatalogEntry } from '@/lib/composioApi';

export interface KeywordMatch {
  keyword: string;
  toolId: string;
  toolName: string;
  position: { top: number; left: number };
  isLocal: boolean;          // true = dev tool, false = Composio integration
  isConnected?: boolean;     // only for Composio integrations
  catalogEntry: DevToolEntry | ComposioIntegrationEntry;
}

export function useKeywordDetection() {
  const [activeMatch, setActiveMatch] = useState<KeywordMatch | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedRef = useRef<string | null>(null);

  // Cache of connected Composio integrations (refreshed periodically)
  const connectedCacheRef = useRef<Set<string>>(new Set());
  const cacheLoadedRef = useRef(false);

  // Load Composio connection status on mount
  useEffect(() => {
    loadComposioStatus();
  }, []);

  const loadComposioStatus = useCallback(async () => {
    try {
      const catalog = await composioCatalog();
      const connected = new Set<string>();
      for (const entry of catalog) {
        if (entry.connected) {
          connected.add(entry.id);
        }
      }
      connectedCacheRef.current = connected;
      cacheLoadedRef.current = true;
    } catch {
      // If we can't reach the backend, treat all as not connected
      cacheLoadedRef.current = true;
    }
  }, []);

  const detectKeywords = useCallback((value: string, cursorPos: number, rect?: DOMRect) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!value || cursorPos === 0) {
        setActiveMatch(null);
        return;
      }

      // Get text before cursor
      const textBefore = value.slice(0, cursorPos).toLowerCase();

      // Try 2-word phrase first, then 1-word
      const words = textBefore.split(/\s+/).filter(Boolean);
      let matchedKeyword: string | null = null;

      if (words.length >= 2) {
        const twoWord = `${words[words.length - 2]} ${words[words.length - 1]}`;
        if (DEV_KEYWORD_MAP[twoWord] || COMPOSIO_KEYWORD_MAP[twoWord]) {
          matchedKeyword = twoWord;
        }
      }

      if (!matchedKeyword && words.length >= 1) {
        const oneWord = words[words.length - 1];
        if (DEV_KEYWORD_MAP[oneWord] || COMPOSIO_KEYWORD_MAP[oneWord]) {
          matchedKeyword = oneWord;
        }
      }

      if (matchedKeyword && matchedKeyword !== dismissedRef.current) {
        const position = rect
          ? { top: rect.bottom + 4, left: rect.left }
          : { top: 0, left: 0 };

        // Check dev tools first
        const devToolId = DEV_KEYWORD_MAP[matchedKeyword];
        if (devToolId) {
          const entry = DEV_CATALOG_BY_ID[devToolId];
          if (entry) {
            setActiveMatch({
              keyword: matchedKeyword,
              toolId: devToolId,
              toolName: entry.name,
              position,
              isLocal: true,
              catalogEntry: entry,
            });
            return;
          }
        }

        // Check Composio integrations
        const composioId = COMPOSIO_KEYWORD_MAP[matchedKeyword];
        if (composioId) {
          const entry = COMPOSIO_CATALOG_BY_ID[composioId];
          if (entry) {
            const isConnected = connectedCacheRef.current.has(composioId);

            // KEY BEHAVIOR: Only show popup for NOT-connected integrations
            // Connected integrations are silently available in the step picker
            if (!isConnected) {
              setActiveMatch({
                keyword: matchedKeyword,
                toolId: composioId,
                toolName: entry.name,
                position,
                isLocal: false,
                isConnected: false,
                catalogEntry: entry,
              });
              return;
            }
            // If connected, don't show popup — user can add via step menu
          }
        }
      }

      setActiveMatch(null);
    }, 300);
  }, []);

  const dismiss = useCallback(() => {
    if (activeMatch) {
      dismissedRef.current = activeMatch.keyword;
    }
    setActiveMatch(null);
  }, [activeMatch]);

  const resetDismissed = useCallback(() => {
    dismissedRef.current = null;
  }, []);

  // Refresh connection status (called after a new connection is made)
  const refreshConnections = useCallback(async () => {
    await loadComposioStatus();
  }, [loadComposioStatus]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { activeMatch, detectKeywords, dismiss, resetDismissed, refreshConnections };
}
