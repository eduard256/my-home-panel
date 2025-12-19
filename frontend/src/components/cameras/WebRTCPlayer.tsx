/**
 * WebRTCPlayer - Individual Camera Player Component
 *
 * Displays a single camera stream with status indicators.
 * Uses useWebRTCConnection hook for state machine-based connection management.
 *
 * Features:
 * - Clean video display
 * - Connection status overlay
 * - Retry/error states with user feedback
 * - Fullscreen button on hover
 * - Minimal UI - only shows info on hover
 */

import { memo } from 'react';
import { RefreshCw, WifiOff, Loader2 } from 'lucide-react';
import { useWebRTCConnection } from './hooks/useWebRTCConnection';
import type { CameraConfig, ConnectionState } from './types';

// ============================================
// Types
// ============================================

interface WebRTCPlayerProps {
  /** Camera configuration */
  camera: CameraConfig;
  /** Whether this camera should connect */
  enabled?: boolean;
  /** Callback when connection is established */
  onConnected?: () => void;
  /** Callback when connection permanently fails */
  onFailed?: (error: string) => void;
}

// ============================================
// Status Indicator Component
// ============================================

interface StatusIndicatorProps {
  state: ConnectionState;
  attempt: number;
  error: string | null;
  onRetry: () => void;
}

function StatusIndicator({ state, attempt, error, onRetry }: StatusIndicatorProps) {
  switch (state) {
    case 'idle':
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-neutral-500 text-sm">Waiting...</div>
        </div>
      );

    case 'connecting':
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            <span className="text-neutral-400 text-sm">
              Connecting{attempt > 1 ? ` (${attempt}/${3})` : ''}...
            </span>
          </div>
        </div>
      );

    case 'retrying':
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 text-yellow-400 animate-spin" />
            <span className="text-yellow-400 text-sm">
              Retrying ({attempt}/{3})...
            </span>
          </div>
        </div>
      );

    case 'failed':
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-3">
            <WifiOff className="w-8 h-8 text-red-400" />
            <span className="text-red-400 text-sm text-center px-4 max-w-[200px]">
              {error || 'Connection failed'}
            </span>
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      );

    case 'connected':
    default:
      return null;
  }
}

// ============================================
// Main Component
// ============================================

export const WebRTCPlayer = memo(function WebRTCPlayer({
  camera,
  enabled = true,
  onConnected,
  onFailed,
}: WebRTCPlayerProps) {
  const { videoRef, info, reconnect } = useWebRTCConnection(camera.name, {
    enabled,
    onConnected,
    onFailed,
  });

  const isConnected = info.state === 'connected';

  return (
    <div className="relative w-full h-full bg-black group overflow-hidden">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />

      {/* Status Overlay */}
      <StatusIndicator
        state={info.state}
        attempt={info.attempt}
        error={info.error}
        onRetry={reconnect}
      />

      {/* Hover Overlay - Only when connected */}
      {isConnected && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          {/* Top gradient with camera name */}
          <div className="absolute top-0 left-0 right-0 px-3 py-2 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-white text-xs font-medium tracking-wide uppercase">
                {camera.label}
              </span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>

          {/* Bottom gradient with LIVE indicator */}
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
            <span className="text-white/70 text-xs">LIVE</span>
          </div>
        </div>
      )}
    </div>
  );
});
