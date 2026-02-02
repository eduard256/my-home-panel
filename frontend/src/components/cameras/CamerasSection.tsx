/**
 * @deprecated Legacy Camera Section Component
 *
 * This component is part of the original camera streaming implementation and is
 * now considered deprecated. It is retained solely for backward compatibility
 * while the new camera system is being developed from scratch.
 *
 * Do not extend or build upon this code — all new camera functionality should
 * be implemented in the replacement module once it is available.
 */

import { CamerasGrid } from './CamerasGrid';

export function CamerasSection() {
  return (
    <div className="h-full w-full relative">
      <CamerasGrid />
    </div>
  );
}
