/**
 * Camera configuration and mapping for the new smart-streaming camera system.
 *
 * Uses JPEG snapshots from Frigate in grid view, and MSE live streams from
 * go2rtc when motion is detected or a camera is expanded.
 */

// ============================================
// Camera Configuration
// ============================================

export interface CameraConfig {
  /** go2rtc stream name (used for MSE streaming) */
  stream: string;
  /** Frigate camera name (used for snapshots and motion topics) */
  frigateName: string;
  /** Display label */
  label: string;
  /** Whether this camera takes 2x2 grid cells */
  large?: boolean;
}

/**
 * Camera list with go2rtc ↔ Frigate mapping.
 *
 * stream:      go2rtc stream name from /api/frigate/go2rtc/api/streams
 * frigateName: Frigate camera name from /api/frigate/cameras
 * label:       Human-readable display name
 */
export const CAMERAS: CameraConfig[] = [
  // Birdseye — combined view, 2x2 cells
  { stream: 'birdseye', frigateName: 'birdseye', label: 'Birdseye', large: true },

  // IP Cameras (sub streams for grid, main for expanded)
  { stream: '10_0_20_111_sub', frigateName: 'cam-main-gate', label: 'Main Gate', large: true },
  { stream: '10_0_20_116_main', frigateName: 'cam-doorbell', label: 'Doorbell' },
  { stream: '10_0_20_118_sub', frigateName: 'cam-summer-kitchen', label: 'Summer Kitchen' },
  { stream: '10_0_20_119_sub', frigateName: 'cam-yard-entrance', label: 'Yard Entrance' },
  { stream: '10_0_20_120_sub', frigateName: 'cam-house-entrance', label: 'House Entrance' },
  { stream: '10_0_20_122_sub', frigateName: 'cam-professional-kitchen', label: 'Pro Kitchen' },
  { stream: '10_0_20_123_sub', frigateName: 'cam-staff-house-entrance', label: 'Staff House' },

  // NVR Channels (no sub streams available — single stream only)
  { stream: 'zosi_nvr_1', frigateName: 'cam-main-terrace', label: 'Main Terrace' },
  { stream: 'zosi_nvr_2', frigateName: 'cam-dog-pen-gate', label: 'Dog Pen Gate' },
  { stream: 'zosi_nvr_3', frigateName: 'cam-parking-secondary', label: 'Parking' },
  { stream: 'zosi_nvr_4', frigateName: 'cam-entrance-hall', label: 'Entrance Hall' },
  { stream: 'zosi_nvr_5', frigateName: 'cam-street-right', label: 'Street Right' },
  { stream: 'zosi_nvr_6', frigateName: 'cam-street-left', label: 'Street Left' },
];

// ============================================
// Snapshot Configuration
// ============================================

/** Snapshot refresh interval in idle mode (ms) */
export const SNAPSHOT_IDLE_INTERVAL = 2000;

/** Snapshot refresh interval during motion (ms) — ~5 FPS */
export const SNAPSHOT_MOTION_INTERVAL = 200;

/** Debounce delay before switching from motion to idle (ms) */
export const MOTION_OFF_DEBOUNCE = 500;

// ============================================
// MQTT Topics
// ============================================

/** Build the Frigate motion MQTT topic for a camera */
export function getMotionTopic(frigateName: string): string {
  return `frigate/${frigateName}/motion`;
}

// ============================================
// URL Builders
// ============================================

/**
 * Build snapshot URL for a Frigate camera.
 * Uses cache-busting timestamp query param for forced refresh.
 */
export function buildSnapshotUrl(frigateName: string, cacheBuster: number): string {
  return `/api/frigate/cameras/${frigateName}/snapshot?quality=50&height=360&t=${cacheBuster}`;
}

/**
 * Build WebSocket URL for MSE streaming via go2rtc.
 */
export function buildMseWebSocketUrl(stream: string, token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/frigate/go2rtc/api/ws?src=${encodeURIComponent(stream)}&token=${encodeURIComponent(token)}`;
}
