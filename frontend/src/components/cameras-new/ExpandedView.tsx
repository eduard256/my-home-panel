/**
 * Expanded camera view — fullscreen overlay.
 *
 * Shows last JPEG as immediate placeholder, then starts MSE stream.
 * When MSE is ready, video fades in over the JPEG.
 */

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores';
import { MsePlayer } from './MsePlayer';
import { type CameraConfig, buildSnapshotUrl } from './types';

// ============================================
// Types
// ============================================

interface ExpandedViewProps {
  camera: CameraConfig;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function ExpandedView({ camera }: ExpandedViewProps) {
  const token = useAuthStore((s) => s.token);
  const [mseReady, setMseReady] = useState(false);

  const handleReady = useCallback(() => {
    setMseReady(true);
  }, []);

  const handleError = useCallback(() => {
    // MSE failed — JPEG placeholder stays visible
    setMseReady(false);
  }, []);

  // Prevent click-through to grid
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className="relative w-full h-full bg-black"
      onClick={handleContainerClick}
    >
      {/* JPEG Placeholder — shown immediately */}
      <img
        src={buildSnapshotUrl(camera.frigateName, Date.now())}
        alt={camera.label}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      {/* MSE Video — fades in when ready */}
      {token && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: mseReady ? 1 : 0 }}
        >
          <MsePlayer
            stream={camera.stream}
            token={token}
            enabled={true}
            onReady={handleReady}
            onError={handleError}
          />
        </div>
      )}

      {/* Camera name overlay */}
      <div className="absolute top-4 left-4 px-3 py-1.5 rounded bg-black/70 backdrop-blur-sm border border-neutral-700 z-10">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">
            {camera.label}
          </span>
          {mseReady && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 text-xs">LIVE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
