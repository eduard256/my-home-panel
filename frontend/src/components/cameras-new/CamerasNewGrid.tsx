/**
 * Camera grid with smart streaming.
 *
 * Identical visual layout to the legacy CamerasGrid — same grid calculator,
 * same desktop/mobile responsive breakpoints, same expanded view overlay.
 * New logic: JPEG snapshots in grid, MSE on motion/click.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CameraCell } from './CameraCell';
import { ExpandedView } from './ExpandedView';
import { useMqttMotion } from './hooks/useMqttMotion';
import { CAMERAS, type CameraConfig } from './types';

// ============================================
// Grid Layout Calculator (identical to legacy)
// ============================================

/**
 * Calculate optimal grid dimensions based on camera count.
 * Birdseye takes 2x2, so effective count is +3.
 */
function getGridLayout(count: number): { cols: number; rows: number } {
  const effectiveCount = count + 3;

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

export function CamerasNewGrid() {
  const motionState = useMqttMotion();
  const [expandedCamera, setExpandedCamera] = useState<CameraConfig | null>(null);

  const handleCameraClick = useCallback((camera: CameraConfig) => {
    setExpandedCamera(camera);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setExpandedCamera(null);
  }, []);

  const layout = getGridLayout(CAMERAS.length);

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
        {CAMERAS.map((camera, index) => (
          <motion.div
            key={camera.stream}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.02 }}
            className="relative overflow-hidden bg-black cursor-pointer"
            style={
              camera.large
                ? { gridColumn: 'span 2', gridRow: 'span 2' }
                : undefined
            }
          >
            <CameraCell
              camera={camera}
              motionActive={motionState[camera.frigateName] ?? false}
              onClick={() => handleCameraClick(camera)}
            />
          </motion.div>
        ))}
      </div>

      {/* Mobile Scroll */}
      <div className="lg:hidden h-full w-full overflow-y-auto">
        <div className="grid grid-cols-1 gap-px bg-neutral-900">
          {CAMERAS.map((camera, index) => (
            <motion.div
              key={camera.stream}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              className="relative overflow-hidden bg-black cursor-pointer"
              style={{ height: camera.large ? '50vh' : '33.333vh' }}
            >
              <CameraCell
                camera={camera}
                motionActive={motionState[camera.frigateName] ?? false}
                onClick={() => handleCameraClick(camera)}
              />
            </motion.div>
          ))}
        </div>
      </div>

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
            <ExpandedView
              camera={expandedCamera}
              onClose={handleCloseExpanded}
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
