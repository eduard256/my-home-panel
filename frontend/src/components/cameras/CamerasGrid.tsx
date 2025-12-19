/**
 * CamerasGrid - Orchestrated Camera Grid with Staged Connection
 *
 * Manages multiple camera connections with intelligent staging:
 * - Cameras connect one by one, waiting for each to succeed
 * - Failed cameras are skipped, connection continues to next
 * - Responsive grid layout (desktop grid, mobile scroll)
 * - Birdseye camera takes 2x2 cells
 *
 * Connection Strategy:
 * ```
 * Camera 0 enabled → wait for connected/failed
 *                         ↓
 * Camera 1 enabled → wait for connected/failed
 *                         ↓
 * Camera 2 enabled → ...
 * ```
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { WebRTCPlayer } from './WebRTCPlayer';
import { CAMERAS, type CameraConfig } from './types';

// ============================================
// Types
// ============================================

interface CamerasGridProps {
  /** Camera list (defaults to CAMERAS from types) */
  cameras?: CameraConfig[];
}

// ============================================
// Grid Layout Calculator
// ============================================

/**
 * Calculate optimal grid dimensions based on camera count
 * Note: Birdseye takes 2x2, so effective count is +3
 */
function getGridLayout(count: number): { cols: number; rows: number } {
  // Account for birdseye taking extra space
  const effectiveCount = count + 3; // birdseye = 4 cells instead of 1

  if (effectiveCount <= 4) return { cols: 2, rows: 2 };
  if (effectiveCount <= 6) return { cols: 3, rows: 2 };
  if (effectiveCount <= 9) return { cols: 3, rows: 3 };
  if (effectiveCount <= 12) return { cols: 4, rows: 3 };
  if (effectiveCount <= 16) return { cols: 4, rows: 4 };
  if (effectiveCount <= 20) return { cols: 5, rows: 4 };
  return { cols: 5, rows: Math.ceil(effectiveCount / 5) };
}

// ============================================
// Main Component
// ============================================

export function CamerasGrid({
  cameras = CAMERAS,
}: CamerasGridProps) {
  /**
   * Staged connection state
   * - enabledIndex: cameras up to this index are enabled
   * - When camera connects/fails, we increment to enable next
   */
  const [enabledIndex, setEnabledIndex] = useState(0);

  /**
   * Expanded camera state - which camera is shown fullscreen in container
   */
  const [expandedCamera, setExpandedCamera] = useState<CameraConfig | null>(null);

  /**
   * Handle camera connected - enable next camera
   */
  const handleConnected = useCallback((index: number) => {
    // Only advance if this is the current camera we're waiting for
    setEnabledIndex((current) => {
      if (index === current) {
        return current + 1;
      }
      return current;
    });
  }, []);

  /**
   * Handle camera failed - skip and enable next camera
   */
  const handleFailed = useCallback((index: number, _error: string) => {
    // Skip failed camera, move to next
    setEnabledIndex((current) => {
      if (index === current) {
        return current + 1;
      }
      return current;
    });
  }, []);

  /**
   * Handle camera click - expand to full container
   */
  const handleCameraClick = useCallback((camera: CameraConfig) => {
    setExpandedCamera(camera);
  }, []);

  /**
   * Handle close expanded view
   */
  const handleCloseExpanded = useCallback(() => {
    setExpandedCamera(null);
  }, []);

  // Calculate grid layout
  const layout = getGridLayout(cameras.length);

  return (
    <div className="h-full w-full bg-black relative">
      {/* Desktop Grid */}
      <div
        className="hidden lg:grid h-full w-full gap-px bg-neutral-900"
        style={{
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
        }}
      >
        {cameras.map((camera, index) => (
          <motion.div
            key={camera.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.02 }}
            className="relative overflow-hidden bg-black cursor-pointer"
            style={
              camera.large
                ? { gridColumn: 'span 2', gridRow: 'span 2' }
                : undefined
            }
            onClick={() => handleCameraClick(camera)}
          >
            <WebRTCPlayer
              camera={camera}
              enabled={index <= enabledIndex}
              onConnected={() => handleConnected(index)}
              onFailed={(error) => handleFailed(index, error)}
            />
          </motion.div>
        ))}
      </div>

      {/* Mobile Scroll */}
      <div className="lg:hidden h-full w-full overflow-y-auto">
        <div className="grid grid-cols-1 gap-px bg-neutral-900">
          {cameras.map((camera, index) => (
            <motion.div
              key={camera.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              className="relative overflow-hidden bg-black cursor-pointer"
              style={{ height: camera.large ? '50vh' : '33.333vh' }}
              onClick={() => handleCameraClick(camera)}
            >
              <WebRTCPlayer
                camera={camera}
                enabled={index <= enabledIndex}
                onConnected={() => handleConnected(index)}
                onFailed={(error) => handleFailed(index, error)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Connection Progress Indicator */}
      {enabledIndex < cameras.length && !expandedCamera && (
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded bg-black/70 backdrop-blur-sm border border-neutral-700 z-10">
          <span className="text-neutral-300 text-xs font-mono">
            Loading: {enabledIndex + 1}/{cameras.length}
          </span>
        </div>
      )}

      {/* Expanded Camera View */}
      <AnimatePresence>
        {expandedCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-20 bg-black"
          >
            {/* Expanded camera player */}
            <WebRTCPlayer
              camera={expandedCamera}
              enabled={true}
            />

            {/* Close button */}
            <button
              onClick={handleCloseExpanded}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 backdrop-blur-sm border border-neutral-700 hover:bg-neutral-700 transition-colors z-30"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
