/**
 * MSE (Media Source Extensions) player for go2rtc streams.
 *
 * Connects to go2rtc WebSocket, negotiates codecs, and streams fMP4 segments
 * into a <video> element via MediaSource API.
 *
 * Protocol flow:
 *   1. Open WebSocket to go2rtc /api/ws?src={stream}
 *   2. On sourceopen, send supported codecs: {type: "mse", value: "codecs..."}
 *   3. Server responds with {type: "mse", value: "video/mp4; codecs=\"...\""}
 *   4. Create SourceBuffer with server's MIME type
 *   5. Receive binary fMP4 segments via WebSocket → appendBuffer()
 *   6. Manage buffer: trim old segments, keep ~10s window
 */

import { useEffect, useRef, useCallback, memo } from 'react';
import { buildMseWebSocketUrl } from './types';

// ============================================
// Constants
// ============================================

/** Maximum buffer duration before trimming old segments (seconds) */
const MAX_BUFFER_DURATION = 10;

/** Supported codecs to advertise to go2rtc (H.264 profiles + AAC) */
const SUPPORTED_CODECS = [
  'avc1.640029', // H.264 High L4.1
  'avc1.64002A', // H.264 High L4.2
  'avc1.640033', // H.264 High L5.1
  'avc1.4D0029', // H.264 Main L4.1
  'avc1.4D002A', // H.264 Main L4.2
  'avc1.42001E', // H.264 Baseline L3.0
  'hvc1.1.6.L153.B0', // H.265 Main
  'mp4a.40.2', // AAC-LC
  'mp4a.40.5', // HE-AAC
  'flac',
  'opus',
];

// ============================================
// Types
// ============================================

interface MsePlayerProps {
  /** go2rtc stream name */
  stream: string;
  /** JWT auth token */
  token: string;
  /** Whether the player should be active */
  enabled: boolean;
  /** Called when first video frame is rendered */
  onReady?: () => void;
  /** Called on unrecoverable error */
  onError?: (error: string) => void;
}

// ============================================
// Component
// ============================================

export const MsePlayer = memo(function MsePlayer({
  stream,
  token,
  enabled,
  onReady,
  onError,
}: MsePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const msRef = useRef<MediaSource | null>(null);
  const sbRef = useRef<SourceBuffer | null>(null);
  const readyFiredRef = useRef(false);

  // Buffer queue for when SourceBuffer is updating
  const bufferQueueRef = useRef<ArrayBuffer[]>([]);

  /** Filter codecs to only those supported by the browser */
  const getFilteredCodecs = useCallback(() => {
    const MediaSourceCtor = (window as any).ManagedMediaSource || MediaSource;
    if (!MediaSourceCtor?.isTypeSupported) return SUPPORTED_CODECS.join(',');

    return SUPPORTED_CODECS.filter((codec) => {
      const mime = codec.startsWith('mp4a') || codec === 'flac' || codec === 'opus'
        ? `audio/mp4; codecs="${codec}"`
        : `video/mp4; codecs="${codec}"`;
      return MediaSourceCtor.isTypeSupported(mime);
    }).join(',');
  }, []);

  /** Trim old buffer segments to keep only recent data */
  const trimBuffer = useCallback(() => {
    const sb = sbRef.current;
    const video = videoRef.current;
    if (!sb || !video || sb.updating) return;

    try {
      const buffered = sb.buffered;
      if (buffered.length > 0) {
        const start = buffered.start(0);
        const end = buffered.end(buffered.length - 1);
        if (end - start > MAX_BUFFER_DURATION) {
          sb.remove(start, end - MAX_BUFFER_DURATION);
        }
      }
    } catch {
      // Ignore errors during buffer trimming
    }
  }, []);

  /** Append queued buffers when SourceBuffer finishes updating */
  const flushQueue = useCallback(() => {
    const sb = sbRef.current;
    if (!sb || sb.updating) return;

    if (bufferQueueRef.current.length > 0) {
      const next = bufferQueueRef.current.shift()!;
      try {
        sb.appendBuffer(next);
      } catch {
        // Buffer full or other error — try trimming
        trimBuffer();
      }
    } else {
      // No queued data — good time to trim
      trimBuffer();
    }
  }, [trimBuffer]);

  /** Connect and start streaming */
  useEffect(() => {
    if (!enabled) return;

    const video = videoRef.current;
    if (!video) return;

    readyFiredRef.current = false;
    bufferQueueRef.current = [];

    // Create MediaSource
    const MediaSourceCtor = (window as any).ManagedMediaSource || MediaSource;
    const ms = new MediaSourceCtor();
    msRef.current = ms;

    // Attach to video
    if ('ManagedMediaSource' in window) {
      (video as any).srcObject = ms;
    } else {
      video.src = URL.createObjectURL(ms);
    }

    ms.addEventListener('sourceopen', () => {
      // Open WebSocket
      const url = buildMseWebSocketUrl(stream, token);
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        // Send supported codecs
        ws.send(JSON.stringify({ type: 'mse', value: getFilteredCodecs() }));
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          // JSON message — codec negotiation response
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'mse' && msg.value && !sbRef.current) {
              // Create SourceBuffer with server's MIME type
              try {
                const sb = ms.addSourceBuffer(msg.value);
                sb.mode = 'segments';
                sbRef.current = sb;

                sb.addEventListener('updateend', flushQueue);
              } catch (err) {
                onError?.(`SourceBuffer error: ${err}`);
              }
            }
          } catch {
            // Ignore non-JSON text messages
          }
        } else {
          // Binary data — fMP4 segment
          const sb = sbRef.current;
          if (!sb) return;

          if (sb.updating || bufferQueueRef.current.length > 0) {
            bufferQueueRef.current.push(event.data);
          } else {
            try {
              sb.appendBuffer(event.data);
            } catch {
              bufferQueueRef.current.push(event.data);
            }
          }

          // Fire onReady on first data
          if (!readyFiredRef.current) {
            readyFiredRef.current = true;
            // Small delay to let the video element render first frame
            setTimeout(() => onReady?.(), 100);
          }
        }
      };

      ws.onerror = () => {
        onError?.('WebSocket connection error');
      };

      ws.onclose = (event) => {
        if (!event.wasClean) {
          onError?.(`WebSocket closed: ${event.code}`);
        }
      };
    }, { once: true });

    // Auto-play handling
    video.addEventListener('loadeddata', () => {
      video.play().catch(() => {
        // Autoplay blocked — muted should work
        video.muted = true;
        video.play().catch(() => {});
      });
    }, { once: true });

    // Cleanup
    return () => {
      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      // Remove SourceBuffer listener
      if (sbRef.current) {
        try {
          sbRef.current.removeEventListener('updateend', flushQueue);
        } catch {}
        sbRef.current = null;
      }

      // Close MediaSource
      if (msRef.current) {
        try {
          if (msRef.current.readyState === 'open') {
            msRef.current.endOfStream();
          }
        } catch {}
        msRef.current = null;
      }

      // Reset video
      if (video) {
        (video as any).srcObject = null;
        video.src = '';
        video.load();
      }

      bufferQueueRef.current = [];
    };
  }, [enabled, stream, token, getFilteredCodecs, flushQueue, onReady, onError]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-contain"
    />
  );
});
