/**
 * Individual camera cell for the grid view.
 *
 * Smart streaming logic:
 *   - No motion: shows JPEG snapshot refreshed every 1-2 seconds
 *   - Motion detected: increases JPEG to ~5 FPS, starts MSE in parallel
 *   - MSE ready: fades video over JPEG
 *   - Motion ends: destroys MSE after debounce, back to slow JPEG
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores';
import { MsePlayer } from './MsePlayer';
import { useSnapshotRefresh } from './hooks/useSnapshotRefresh';
import {
  type CameraConfig,
  SNAPSHOT_IDLE_INTERVAL,
  SNAPSHOT_MOTION_INTERVAL,
  MOTION_OFF_DEBOUNCE,
} from './types';

// ============================================
// Types
// ============================================

interface CameraCellProps {
  camera: CameraConfig;
  motionActive: boolean;
  onClick: () => void;
}

// ============================================
// Component
// ============================================

export const CameraCell = memo(function CameraCell({
  camera,
  motionActive,
  onClick,
}: CameraCellProps) {
  const token = useAuthStore((s) => s.token);

  // Debounced motion: stays true for MOTION_OFF_DEBOUNCE after motion ends
  const [debouncedMotion, setDebouncedMotion] = useState(motionActive);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (motionActive) {
      // Motion ON — immediately set
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setDebouncedMotion(true);
    } else {
      // Motion OFF — debounce
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedMotion(false);
        debounceTimerRef.current = null;
      }, MOTION_OFF_DEBOUNCE);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [motionActive]);

  // MSE state
  const [mseReady, setMseReady] = useState(false);
  const [mseEnabled, setMseEnabled] = useState(false);

  // Start MSE when debounced motion is active
  useEffect(() => {
    if (debouncedMotion) {
      setMseEnabled(true);
    } else {
      setMseEnabled(false);
      setMseReady(false);
    }
  }, [debouncedMotion]);

  // Snapshot refresh: faster during motion, slower otherwise
  const snapshotInterval = debouncedMotion ? SNAPSHOT_MOTION_INTERVAL : SNAPSHOT_IDLE_INTERVAL;
  const { snapshotUrl, containerRef } = useSnapshotRefresh({
    frigateName: camera.frigateName,
    token: token ?? '',
    interval: snapshotInterval,
    enabled: !mseReady && !!token, // Stop refreshing JPEG once MSE is playing
  });

  const handleMseReady = useCallback(() => {
    setMseReady(true);
  }, []);

  const handleMseError = useCallback(() => {
    // MSE failed — fall back to JPEG
    setMseReady(false);
    setMseEnabled(false);
  }, []);

  const isLive = mseReady && mseEnabled;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group overflow-hidden"
      onClick={onClick}
    >
      {/* JPEG Snapshot Layer — always rendered as base */}
      <img
        src={snapshotUrl}
        alt={camera.label}
        className="w-full h-full object-contain"
        loading="lazy"
        draggable={false}
      />

      {/* MSE Video Layer — renders on top when motion active */}
      {mseEnabled && token && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: mseReady ? 1 : 0 }}
        >
          <MsePlayer
            stream={camera.stream}
            token={token}
            enabled={mseEnabled}
            onReady={handleMseReady}
            onError={handleMseError}
          />
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        {/* Top gradient with camera name */}
        <div className="absolute top-0 left-0 right-0 px-3 py-2 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-white text-xs font-medium tracking-wide uppercase">
              {camera.label}
            </span>
            {isLive && (
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
            {motionActive && !isLive && (
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            )}
          </div>
        </div>

        {/* Bottom gradient with status */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
          <span className="text-white/70 text-xs">
            {isLive ? 'LIVE' : motionActive ? 'MOTION' : ''}
          </span>
        </div>
      </div>
    </div>
  );
});
