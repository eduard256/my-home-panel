import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { connectionManager } from './ConnectionManager';

const API_URL = import.meta.env.VITE_API_URL || '';

interface WebRTCPlayerProps {
  camera: string;
  className?: string;
  priority?: number;
}

/**
 * Native WebRTC player for go2rtc streams with connection management
 * Uses browser's RTCPeerConnection API for low-latency streaming
 * Integrates with ConnectionManager to prevent browser overload
 */
export function WebRTCPlayer({ camera, className, priority = 0 }: WebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<'queued' | 'connecting' | 'connected' | 'error' | 'disconnected'>('queued');
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);
  const connectionAttemptRef = useRef(0);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function for WebRTC resources
  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  // Main connection logic
  const connect = async () => {
    if (!token || !videoRef.current || !mountedRef.current) return;

    connectionAttemptRef.current += 1;
    const attemptNumber = connectionAttemptRef.current;

    console.log(`[${camera}] Connection attempt #${attemptNumber}`);

    setStatus('connecting');
    setError(null);

    try {
      // Create WebSocket connection with auth
      const wsUrl = `${API_URL.replace('http://', 'ws://').replace('https://', 'wss://')}/api/frigate/go2rtc/api/ws?src=${camera}&token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Create RTCPeerConnection with optimized config
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        bundlePolicy: 'max-bundle',
        // Optimize for low latency
        iceCandidatePoolSize: 0,
      });
      pcRef.current = pc;

      // Add transceivers for receiving video and audio
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      // Handle incoming tracks
      let trackReceived = false;
      pc.ontrack = (event) => {
        if (!mountedRef.current) return;

        console.log(`[${camera}] Received track: ${event.track.kind}`);
        trackReceived = true;

        if (videoRef.current && event.streams[0]) {
          // Prevent multiple srcObject assignments
          if (videoRef.current.srcObject !== event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
          }

          // Attempt to play with error handling
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              // Ignore AbortError - this is expected when tracks arrive rapidly
              if (err.name !== 'AbortError') {
                console.warn(`[${camera}] Auto-play prevented:`, err.message);
              }
            });
          }
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

        console.log(`[${camera}] Connection state: ${pc.connectionState}`);

        switch (pc.connectionState) {
          case 'connected':
            setStatus('connected');
            connectionManager.markConnected(camera);
            break;

          case 'failed':
          case 'closed':
            setStatus('error');
            setError('WebRTC connection failed');
            connectionManager.markFailed(camera);
            break;

          case 'disconnected':
            // Only retry if we previously had a successful connection
            if (trackReceived && mountedRef.current) {
              console.log(`[${camera}] Disconnected, scheduling retry...`);
              retryTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current) {
                  cleanup();
                  requestConnection();
                }
              }, 3000);
            }
            break;
        }
      };

      // Handle ICE connection state for additional monitoring
      pc.oniceconnectionstatechange = () => {
        if (!mountedRef.current) return;
        console.log(`[${camera}] ICE state: ${pc.iceConnectionState}`);
      };

      // WebSocket message handler
      ws.onmessage = async (event) => {
        if (!mountedRef.current) return;

        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'webrtc/answer':
              // Receive SDP answer from server
              if (pc.signalingState !== 'closed') {
                await pc.setRemoteDescription({
                  type: 'answer',
                  sdp: msg.value,
                });
              }
              break;

            case 'webrtc/candidate':
              // Receive ICE candidate from server
              if (msg.value && pc.signalingState !== 'closed') {
                await pc.addIceCandidate({
                  candidate: msg.value,
                  sdpMLineIndex: 0,
                });
              }
              break;
          }
        } catch (err) {
          console.error(`[${camera}] Error handling WebSocket message:`, err);
        }
      };

      ws.onopen = async () => {
        if (!mountedRef.current) return;

        console.log(`[${camera}] WebSocket connected`);

        try {
          // Create and send SDP offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'webrtc/offer',
              value: offer.sdp,
            }));
          }
        } catch (err) {
          console.error(`[${camera}] Failed to send offer:`, err);
          if (mountedRef.current) {
            setStatus('error');
            setError('Failed to initialize connection');
            connectionManager.markFailed(camera);
          }
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;

        console.error(`[${camera}] WebSocket error`);
        setStatus('error');
        setError('WebSocket connection failed');
        connectionManager.markFailed(camera);
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;

        console.log(`[${camera}] WebSocket closed`);

        // Only set disconnected if we're not already in error state
        if (status !== 'error') {
          setStatus('disconnected');
        }
      };

    } catch (err) {
      console.error(`[${camera}] Failed to connect:`, err);
      if (mountedRef.current) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
        connectionManager.markFailed(camera);
      }
    }
  };

  // Request connection through manager
  const requestConnection = () => {
    setStatus('queued');
    connectionManager.requestConnection(
      camera,
      priority,
      () => {
        if (mountedRef.current) {
          connect();
        }
      },
      () => {
        if (mountedRef.current) {
          setStatus('error');
          setError('Connection request failed');
        }
      }
    );
  };

  useEffect(() => {
    mountedRef.current = true;

    // Request connection through manager
    requestConnection();

    return () => {
      mountedRef.current = false;
      cleanup();
      connectionManager.markDisconnected(camera);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, token, priority]);

  return (
    <div className={className}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
        // Optimize for low latency
        style={{
          objectFit: 'contain',
        }}
        // Disable preload to reduce buffering
        preload="none"
      />

      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-sm">Connecting...</div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-red-500 text-sm">{error || 'Connection failed'}</div>
        </div>
      )}
    </div>
  );
}
