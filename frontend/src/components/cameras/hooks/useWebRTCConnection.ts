/**
 * useWebRTCConnection - WebRTC Connection State Machine
 *
 * A clean, predictable hook for managing WebRTC connections to go2rtc streams.
 *
 * Features:
 * - State machine with clear transitions
 * - Exponential backoff for retries
 * - Max attempts before failure
 * - Visibility-based pause (tab hidden)
 * - Clean resource cleanup
 *
 * State Machine:
 * ```
 * IDLE ──enable──> CONNECTING ──success──> CONNECTED
 *                      │                       │
 *                      │ error                 │ disconnect
 *                      ▼                       ▼
 *                  RETRYING ◄─────────────────┘
 *                      │
 *                      │ max attempts
 *                      ▼
 *                   FAILED
 * ```
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  ConnectionState,
  RTC_CONFIG,
  MAX_ATTEMPTS,
  RECONNECT_TIMEOUT_MS,
  buildWebSocketUrl,
  getRetryDelay,
} from '../types';

// ============================================
// Types
// ============================================

interface ConnectionInfo {
  state: ConnectionState;
  attempt: number;
  error: string | null;
}

interface UseWebRTCConnectionOptions {
  /** Whether connection should be active */
  enabled?: boolean;
  /** Callback when connection is established */
  onConnected?: () => void;
  /** Callback when connection permanently fails */
  onFailed?: (error: string) => void;
}

interface UseWebRTCConnectionReturn {
  /** Ref to attach to video element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Current connection info */
  info: ConnectionInfo;
  /** Manually trigger reconnection */
  reconnect: () => void;
}

// ============================================
// Hook Implementation
// ============================================

export function useWebRTCConnection(
  camera: string,
  options: UseWebRTCConnectionOptions = {}
): UseWebRTCConnectionReturn {
  const { enabled = true, onConnected, onFailed } = options;

  // Refs for WebRTC resources
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const retryTimeoutRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const attemptRef = useRef(0);
  const wasConnectedRef = useRef(false);
  const connectRef = useRef<(attempt?: number) => void>(() => {});
  const cleanupRef = useRef<() => void>(() => {});

  // Auth token
  const token = useAuthStore((state) => state.token);

  // Connection state
  const [info, setInfo] = useState<ConnectionInfo>({
    state: 'idle',
    attempt: 0,
    error: null,
  });

  /**
   * Clean up all WebRTC resources
   */
  const cleanup = useCallback(() => {
    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = 0;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    // Close PeerConnection
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Update ref after cleanup is defined
  cleanupRef.current = cleanup;

  /**
   * Schedule a retry with exponential backoff
   */
  const scheduleRetry = useCallback((attempt: number, reason: string) => {
    if (!mountedRef.current) return;

    // Check if we've exceeded max attempts
    if (attempt >= MAX_ATTEMPTS) {
      const errorMsg = `Failed after ${MAX_ATTEMPTS} attempts: ${reason}`;
      setInfo({ state: 'failed', attempt, error: errorMsg });
      onFailed?.(errorMsg);
      return;
    }

    // Calculate delay with exponential backoff
    const delay = wasConnectedRef.current
      ? RECONNECT_TIMEOUT_MS // Quick retry if we were previously connected
      : getRetryDelay(attempt);

    setInfo({ state: 'retrying', attempt, error: reason });

    retryTimeoutRef.current = window.setTimeout(() => {
      if (mountedRef.current && enabled) {
        connectRef.current(attempt + 1);
      }
    }, delay);
  }, [enabled, onFailed]);

  /**
   * Establish WebRTC connection
   */
  const connect = useCallback((attempt: number = 1) => {
    if (!mountedRef.current || !token || !enabled) return;

    // Cleanup any existing connection
    cleanup();

    attemptRef.current = attempt;
    setInfo({ state: 'connecting', attempt, error: null });

    try {
      // Create WebSocket connection
      const wsUrl = buildWebSocketUrl(camera, token);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Add transceivers for receiving video and audio
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      // Handle incoming tracks
      pc.ontrack = (event) => {
        if (!mountedRef.current || !videoRef.current) return;

        if (event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];

          // Try to play
          videoRef.current.play().catch((err) => {
            // Mute and retry if autoplay blocked
            if (err.name === 'NotAllowedError' && videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {
                // Ignore - user will need to interact
              });
            }
          });
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'webrtc/candidate',
            value: event.candidate.candidate,
          }));
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        if (!mountedRef.current) return;

        const state = pc.connectionState;

        if (state === 'connected') {
          wasConnectedRef.current = true;
          attemptRef.current = 0; // Reset attempts on success
          setInfo({ state: 'connected', attempt: 0, error: null });
          onConnected?.();
        } else if (state === 'failed') {
          scheduleRetry(attemptRef.current, 'WebRTC connection failed');
        } else if (state === 'disconnected') {
          // Brief disconnection - might recover
          // Wait a bit before considering it a failure
          setTimeout(() => {
            if (pcRef.current?.connectionState === 'disconnected') {
              scheduleRetry(attemptRef.current, 'WebRTC disconnected');
            }
          }, 2000);
        }
      };

      // WebSocket handlers
      ws.onopen = async () => {
        if (!mountedRef.current || !pcRef.current) return;

        try {
          // Create and send offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'webrtc/offer',
              value: offer.sdp,
            }));
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to create offer';
          scheduleRetry(attemptRef.current, message);
        }
      };

      ws.onmessage = async (event) => {
        if (!mountedRef.current || !pcRef.current) return;

        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'webrtc/answer':
              if (pcRef.current.signalingState !== 'closed') {
                await pcRef.current.setRemoteDescription({
                  type: 'answer',
                  sdp: msg.value,
                });
              }
              break;

            case 'webrtc/candidate':
              if (msg.value && pcRef.current.signalingState !== 'closed') {
                await pcRef.current.addIceCandidate({
                  candidate: msg.value,
                  sdpMid: '0',
                });
              }
              break;

            case 'error':
              scheduleRetry(attemptRef.current, msg.value || 'Server error');
              break;
          }
        } catch {
          // Ignore JSON parse errors for binary data
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        scheduleRetry(attemptRef.current, 'WebSocket error');
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;

        // Only retry if we're still supposed to be connected
        if (info.state === 'connecting' || info.state === 'connected') {
          scheduleRetry(attemptRef.current, 'WebSocket closed');
        }
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection error';
      scheduleRetry(attempt, message);
    }
  }, [camera, token, enabled, cleanup, scheduleRetry, onConnected, info.state]);

  // Update ref after connect is defined
  connectRef.current = connect;

  /**
   * Manual reconnect (resets attempts)
   */
  const reconnect = useCallback(() => {
    wasConnectedRef.current = false;
    attemptRef.current = 0;
    cleanup();
    if (enabled && token) {
      connect(1);
    }
  }, [cleanup, connect, enabled, token]);

  /**
   * Effect: Start/stop connection based on enabled state
   */
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && token) {
      connectRef.current(1);
    } else {
      cleanupRef.current();
      setInfo({ state: 'idle', attempt: 0, error: null });
    }

    return () => {
      mountedRef.current = false;
      cleanupRef.current();
    };
  }, [enabled, token, camera]);

  /**
   * Effect: Pause when tab is hidden
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - pause but don't reset attempts
        cleanup();
        if (info.state !== 'idle' && info.state !== 'failed') {
          setInfo(prev => ({ ...prev, state: 'idle' }));
        }
      } else if (enabled && token && info.state === 'idle') {
        // Tab visible again - reconnect
        connect(1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, token, info.state, cleanup, connect]);

  return {
    videoRef,
    info,
    reconnect,
  };
}
