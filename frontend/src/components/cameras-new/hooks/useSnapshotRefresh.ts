/**
 * Hook for periodically refreshing a Frigate camera snapshot URL.
 *
 * Returns a URL string with a cache-busting timestamp that updates at the
 * given interval. Pauses when the element is not visible (IntersectionObserver)
 * or when the browser tab is hidden (Visibility API).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { buildSnapshotUrl } from '../types';

interface UseSnapshotRefreshOptions {
  /** Frigate camera name */
  frigateName: string;
  /** JWT auth token */
  token: string;
  /** Refresh interval in ms */
  interval: number;
  /** Whether refreshing is enabled */
  enabled: boolean;
}

interface UseSnapshotRefreshResult {
  /** Current snapshot URL with cache-buster */
  snapshotUrl: string;
  /** Ref to attach to the container element for IntersectionObserver */
  containerRef: (node: HTMLElement | null) => void;
}

export function useSnapshotRefresh({
  frigateName,
  token,
  interval,
  enabled,
}: UseSnapshotRefreshOptions): UseSnapshotRefreshResult {
  const [cacheBuster, setCacheBuster] = useState(() => Date.now());
  const isVisibleRef = useRef(true);
  const isTabVisibleRef = useRef(!document.hidden);
  const nodeRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // IntersectionObserver callback ref
  const containerRef = useCallback((node: HTMLElement | null) => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    nodeRef.current = node;

    if (node) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          isVisibleRef.current = entry.isIntersecting;
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(node);
    }
  }, []);

  // Visibility API
  useEffect(() => {
    const handler = () => {
      isTabVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Refresh timer
  useEffect(() => {
    if (!enabled || interval <= 0) return;

    const timer = setInterval(() => {
      if (isVisibleRef.current && isTabVisibleRef.current) {
        setCacheBuster(Date.now());
      }
    }, interval);

    return () => clearInterval(timer);
  }, [enabled, interval]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    snapshotUrl: buildSnapshotUrl(frigateName, cacheBuster, token),
    containerRef,
  };
}
