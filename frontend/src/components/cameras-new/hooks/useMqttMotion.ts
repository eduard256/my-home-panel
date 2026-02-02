/**
 * Hook that tracks motion state for all Frigate cameras via the existing
 * MQTT WebSocket connection (smartHomeWs singleton).
 *
 * Subscribes to `frigate/{camera}/motion` topics and returns a map of
 * camera name → motion active (boolean).
 */

import { useState, useEffect, useRef } from 'react';
import { smartHomeWs } from '@/services/smart-home-ws';
import { CAMERAS, getMotionTopic } from '../types';

/**
 * Returns a Record mapping Frigate camera names to their current motion state.
 * Automatically subscribes/unsubscribes to MQTT topics on mount/unmount.
 */
export function useMqttMotion(): Record<string, boolean> {
  const [motionState, setMotionState] = useState<Record<string, boolean>>(() => {
    // Initialize from cache
    const initial: Record<string, boolean> = {};
    for (const cam of CAMERAS) {
      const topic = getMotionTopic(cam.frigateName);
      const cached = smartHomeWs.getState(topic);
      initial[cam.frigateName] = String(cached) === 'ON';
    }
    return initial;
  });

  const motionRef = useRef(motionState);
  motionRef.current = motionState;

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    for (const cam of CAMERAS) {
      const topic = getMotionTopic(cam.frigateName);

      const unsub = smartHomeWs.subscribe(topic, (payload) => {
        const active = String(payload) === 'ON';
        const prev = motionRef.current[cam.frigateName];

        if (prev !== active) {
          setMotionState((s) => ({ ...s, [cam.frigateName]: active }));
        }
      });

      unsubscribes.push(unsub);
    }

    return () => {
      for (const unsub of unsubscribes) {
        unsub();
      }
    };
  }, []);

  return motionState;
}
