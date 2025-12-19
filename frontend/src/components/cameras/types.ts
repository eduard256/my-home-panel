/**
 * Camera Types and Configuration
 *
 * Central configuration for all camera streams.
 * Uses go2rtc stream names that match Frigate/go2rtc configuration.
 */

// ============================================
// Connection Constants
// ============================================

/** Maximum connection attempts before giving up */
export const MAX_ATTEMPTS = 3;

/** Base delay for exponential backoff (ms) */
export const BASE_RETRY_DELAY_MS = 2000;

/** Delay before disconnecting after unmount (ms) */
export const DISCONNECT_DELAY_MS = 5000;

/** Reconnect timeout after unexpected disconnect (ms) */
export const RECONNECT_TIMEOUT_MS = 3000;

// ============================================
// Connection State Machine
// ============================================

/**
 * Connection states for WebRTC player
 *
 * State transitions:
 * - IDLE → CONNECTING: when enabled
 * - CONNECTING → CONNECTED: on successful connection
 * - CONNECTING → RETRYING: on error (if attempts < MAX)
 * - RETRYING → CONNECTING: after backoff delay
 * - CONNECTING → FAILED: if attempts >= MAX
 * - CONNECTED → RETRYING: on unexpected disconnect
 * - * → IDLE: on disable or unmount
 */
export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'retrying'
  | 'failed';

// ============================================
// Camera Configuration
// ============================================

export interface CameraConfig {
  /** go2rtc stream name */
  name: string;
  /** Display label */
  label: string;
  /** Whether this camera takes 2x2 grid cells */
  large?: boolean;
  /** Priority for connection order (higher = first) */
  priority?: number;
}

/**
 * Camera list configuration
 *
 * Order matters for staged connection - cameras connect in this order.
 * Birdseye is first (highest priority) and takes 2x2 cells.
 */
export const CAMERAS: CameraConfig[] = [
  // Birdseye - combined view, highest priority, 2x2 cells
  { name: 'birdseye', label: 'Birdseye', large: true, priority: 100 },

  // IP Cameras (sub streams for grid view)
  { name: '10_0_20_111_sub', label: 'Camera 111', large: true, priority: 10 },
  { name: '10_0_20_116_main', label: 'Camera 116', priority: 10 },
  { name: '10_0_20_118_sub', label: 'Camera 118', priority: 10 },
  { name: '10_0_20_119_sub', label: 'Camera 119', priority: 10 },
  { name: '10_0_20_120_sub', label: 'Camera 120', priority: 10 },
  { name: '10_0_20_122_sub', label: 'Camera 122', priority: 10 },
  { name: '10_0_20_123_sub', label: 'Camera 123', priority: 10 },

  // NVR Channels
  { name: 'zosi_nvr_1', label: 'NVR Ch.1', priority: 5 },
  { name: 'zosi_nvr_2', label: 'NVR Ch.2', priority: 5 },
  { name: 'zosi_nvr_3', label: 'NVR Ch.3', priority: 5 },
  { name: 'zosi_nvr_4', label: 'NVR Ch.4', priority: 5 },
  { name: 'zosi_nvr_5', label: 'NVR Ch.5', priority: 5 },
  { name: 'zosi_nvr_6', label: 'NVR Ch.6', priority: 5 },
];

// ============================================
// WebRTC Configuration
// ============================================

/**
 * RTCPeerConnection configuration
 * Using public STUN servers for ICE candidate gathering
 */
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  bundlePolicy: 'max-bundle',
  iceCandidatePoolSize: 0, // Disable prefetching for faster initial connection
};

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate backoff delay for retry attempt
 * Uses exponential backoff: 2s, 4s, 8s...
 */
export function getRetryDelay(attempt: number): number {
  return BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
}

/**
 * Build WebSocket URL for camera stream
 */
export function buildWebSocketUrl(camera: string, token: string): string {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  const wsBase = apiUrl.replace(/^https?/, wsProtocol);
  return `${wsBase}/api/frigate/go2rtc/api/ws?src=${encodeURIComponent(camera)}&token=${encodeURIComponent(token)}`;
}
