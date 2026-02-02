/**
 * @deprecated Legacy Cameras Module
 *
 * This module is part of the original camera streaming implementation and is
 * now considered deprecated. It is retained solely for backward compatibility
 * while the new camera system is being developed from scratch.
 *
 * Do not extend or build upon this code — all new camera functionality should
 * be implemented in the replacement module once it is available.
 */

export { CamerasSection } from './CamerasSection';
export { CamerasGrid } from './CamerasGrid';
export { WebRTCPlayer } from './WebRTCPlayer';
export { useWebRTCConnection } from './hooks/useWebRTCConnection';
export * from './types';
