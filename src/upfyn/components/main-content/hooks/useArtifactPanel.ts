import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

export type ArtifactType = 'code' | 'diff' | 'terminal' | 'search' | 'html' | 'markdown';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  data: Record<string, any>;
}

type UseArtifactPanelOptions = {
  isMobile: boolean;
  initialWidth?: number;
};

export function useArtifactPanel({
  isMobile,
  initialWidth = 520,
}: UseArtifactPanelOptions) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [recentArtifacts, setRecentArtifacts] = useState<Artifact[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(initialWidth);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeHandleRef = useRef<HTMLDivElement | null>(null);

  const isOpen = artifacts.length > 0 || recentArtifacts.length > 0;

  const openArtifact = useCallback((artifact: Artifact) => {
    setArtifacts((prev) => {
      const existing = prev.find((a) => a.id === artifact.id);
      if (existing) {
        // Update data if same artifact re-opened
        return prev.map((a) => (a.id === artifact.id ? artifact : a));
      }
      return [...prev, artifact];
    });
    setActiveArtifactId(artifact.id);
  }, []);

  const closeArtifact = useCallback((id: string) => {
    // Move to recent history instead of deleting
    setArtifacts((prev) => {
      const closing = prev.find((a) => a.id === id);
      if (closing) {
        setRecentArtifacts((recent) => {
          const filtered = recent.filter((a) => a.id !== id);
          return [closing, ...filtered].slice(0, 20);
        });
      }
      return prev.filter((a) => a.id !== id);
    });
    setActiveArtifactId((prevActive) => {
      if (prevActive !== id) return prevActive;
      const remaining = artifacts.filter((a) => a.id !== id);
      return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    });
  }, [artifacts]);

  const reopenArtifact = useCallback((id: string) => {
    const artifact = recentArtifacts.find((a) => a.id === id);
    if (artifact) {
      setRecentArtifacts((prev) => prev.filter((a) => a.id !== id));
      setArtifacts((prev) => [...prev, artifact]);
      setActiveArtifactId(artifact.id);
    }
  }, [recentArtifacts]);

  const clearHistory = useCallback(() => {
    setRecentArtifacts([]);
  }, []);

  const closeAll = useCallback(() => {
    // Move all active artifacts to recent
    setArtifacts((prev) => {
      if (prev.length > 0) {
        setRecentArtifacts((recent) => {
          const ids = new Set(recent.map((a) => a.id));
          const newRecent = [...prev.filter((a) => !ids.has(a.id)), ...recent];
          return newRecent.slice(0, 20);
        });
      }
      return [];
    });
    setActiveArtifactId(null);
    setPanelExpanded(false);
  }, []);

  const toggleExpand = useCallback(() => {
    setPanelExpanded((prev) => !prev);
  }, []);

  const handleResizeStart = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (isMobile) return;
      setIsResizing(true);
      event.preventDefault();
    },
    [isMobile],
  );

  useEffect(() => {
    const handleMouseMove = (event: globalThis.MouseEvent) => {
      if (!isResizing) return;

      const container = resizeHandleRef.current?.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newWidth = containerRect.right - event.clientX;

      const minWidth = 320;
      const maxWidth = containerRect.width * 0.75;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (isResizing) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, [isResizing]);

  return {
    artifacts,
    recentArtifacts,
    activeArtifactId,
    setActiveArtifactId,
    panelWidth,
    panelExpanded,
    isOpen,
    resizeHandleRef,
    openArtifact,
    closeArtifact,
    reopenArtifact,
    clearHistory,
    closeAll,
    toggleExpand,
    handleResizeStart,
  };
}
