import { useCallback, useRef, useState } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPull?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  enabled = true,
}: UsePullToRefreshOptions) {
  const startY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isPulling = useRef(false);

  const onTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLElement>) => {
      if (!enabled || isRefreshing) return;
      startY.current = e.touches[0].clientY;
      isPulling.current = false;
    },
    [enabled, isRefreshing],
  );

  const onTouchMove = useCallback(
    (e: ReactTouchEvent<HTMLElement>) => {
      if (!enabled || isRefreshing) return;
      const target = e.currentTarget;
      if (target.scrollTop > 0) return;

      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        isPulling.current = true;
        setPullDistance(Math.min(dy * 0.5, maxPull));
      }
    },
    [enabled, isRefreshing, maxPull],
  );

  const onTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    isPulling.current = false;
  }, [pullDistance, threshold, onRefresh]);

  return {
    pullDistance,
    isRefreshing,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
