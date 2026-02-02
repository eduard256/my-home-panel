/**
 * CamerasNewSection — Top-level wrapper for the new camera system.
 *
 * Uses JPEG snapshots in grid view with smart MSE streaming on motion/click.
 * Visually identical to the legacy CamerasSection.
 */

import { CamerasNewGrid } from './CamerasNewGrid';

export function CamerasNewSection() {
  return (
    <div className="h-full w-full relative">
      <CamerasNewGrid />
    </div>
  );
}
