/**
 * CamerasSection - Main Camera View Component
 *
 * Top-level component for the cameras section.
 */

import { CamerasGrid } from './CamerasGrid';

export function CamerasSection() {
  return (
    <div className="h-full w-full relative">
      <CamerasGrid />
    </div>
  );
}
