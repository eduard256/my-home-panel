import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || '';

interface WebRTCPlayerProps {
  camera: string;
  className?: string;
}

/**
 * Native WebRTC player for go2rtc streams
 * Uses browser's RTCPeerConnection API for low-latency streaming
 */
export function WebRTCPlayer({ camera, className }: WebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      if (!token || !videoRef.current) return;

      setStatus('connecting');
      setError(null);

      try {
        // Create WebSocket connection with auth
        const wsUrl = `${API_URL.replace('http://', 'ws://').replace('https://', 'wss://')}/api/frigate/go2rtc/api/ws?src=${camera}&token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        // Create RTCPeerConnection with STUN server
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          bundlePolicy: 'max-bundle',
        });
        pcRef.current = pc;

        // Add transceivers for receiving video and audio
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        // Handle incoming tracks
        pc.ontrack = (event) => {
          console.log('Received track:', event.track.kind);
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            // Explicitly trigger play for Brave browser compatibility
            videoRef.current.play().catch((err) => {
              console.warn('Auto-play prevented:', err);
              // Will retry on user interaction
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
          console.log('Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            if (mounted) setStatus('connected');
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            if (mounted) {
              setStatus('error');
              setError('Connection failed');
            }
          }
        };

        // WebSocket message handler
        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'webrtc/answer':
              // Receive SDP answer from server
              await pc.setRemoteDescription({
                type: 'answer',
                sdp: msg.value,
              });
              break;

            case 'webrtc/candidate':
              // Receive ICE candidate from server
              if (msg.value) {
                await pc.addIceCandidate({
                  candidate: msg.value,
                  sdpMLineIndex: 0,
                });
              }
              break;
          }
        };

        ws.onopen = async () => {
          console.log('WebSocket connected');

          // Create and send SDP offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          ws.send(JSON.stringify({
            type: 'webrtc/offer',
            value: offer.sdp,
          }));
        };

        ws.onerror = (event) => {
          if (mounted) {
            console.error('WebSocket error:', event);
            setStatus('error');
            setError('WebSocket connection failed');
          }
        };

        ws.onclose = () => {
          if (mounted) {
            console.log('WebSocket closed');
            setStatus('disconnected');
          }
        };

      } catch (err) {
        console.error('Failed to connect:', err);
        if (mounted) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      }
    };

    connect();

    return () => {
      mounted = false;

      // Cleanup
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
    };
  }, [camera, token]);

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
          // @ts-ignore - non-standard property for low latency
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
