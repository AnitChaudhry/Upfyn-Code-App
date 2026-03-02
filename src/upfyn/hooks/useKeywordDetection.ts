import { useState, useCallback, useRef, useEffect } from 'react';
import { KEYWORD_MAP, CATALOG_BY_ID } from '../shared/integrationCatalog.js';

interface KeywordMatch {
  keyword: string;
  integrationId: string;
  integrationName: string;
  position: { top: number; left: number };
}

export function useKeywordDetection() {
  const [activeMatch, setActiveMatch] = useState<KeywordMatch | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedRef = useRef<string | null>(null);

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
      let match: string | null = null;

      if (words.length >= 2) {
        const twoWord = `${words[words.length - 2]} ${words[words.length - 1]}`;
        if ((KEYWORD_MAP as Record<string, any>)[twoWord]) match = twoWord;
      }

      if (!match && words.length >= 1) {
        const oneWord = words[words.length - 1];
        if ((KEYWORD_MAP as Record<string, any>)[oneWord]) match = oneWord;
      }

      if (match && match !== dismissedRef.current) {
        const integrationId = (KEYWORD_MAP as Record<string, any>)[match];
        const catalogEntry = (CATALOG_BY_ID as Record<string, any>)[integrationId];
        if (catalogEntry) {
          setActiveMatch({
            keyword: match,
            integrationId,
            integrationName: catalogEntry.name,
            position: rect
              ? { top: rect.bottom + 4, left: rect.left }
              : { top: 0, left: 0 },
          });
          return;
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { activeMatch, detectKeywords, dismiss, resetDismissed };
}
