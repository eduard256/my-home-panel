import { useState, useEffect, useCallback, useRef } from 'react';
import type { DeviceState, PublishPayload } from '@/types/smart-home';
import { mqttManager } from '@/services/mqtt-manager';

/**
 * Hook interface for MQTT device state and control.
 */
interface UseMQTTResult {
  state: DeviceState | null;
  publish: (payload: PublishPayload) => Promise<boolean>;
  isConnected: boolean;
}

/**
 * Hook for subscribing to MQTT device state and sending commands.
 * Automatically subscribes on mount and unsubscribes on unmount.
 *
 * @param topic - The MQTT topic to subscribe to
 * @returns Object containing state, publish function, and connection status
 */
export function useMQTT(topic: string): UseMQTTResult {
  const [state, setState] = useState<DeviceState | null>(() => mqttManager.getState(topic));
  const [isConnected, setIsConnected] = useState<boolean>(() => mqttManager.isConnected());
  const topicRef = useRef(topic);

  // Update ref when topic changes
  topicRef.current = topic;

  // Subscribe to device state changes
  useEffect(() => {
    const unsubscribe = mqttManager.subscribe(topic, (newState) => {
      setState(newState);
    });

    // Get initial state
    const currentState = mqttManager.getState(topic);
    if (currentState) {
      setState(currentState);
    }

    return unsubscribe;
  }, [topic]);

  // Subscribe to connection status changes
  useEffect(() => {
    const unsubscribe = mqttManager.onConnectionChange((status) => {
      setIsConnected(status === 'connected');
    });

    return unsubscribe;
  }, []);

  // Memoized publish function
  const publish = useCallback(
    async (payload: PublishPayload): Promise<boolean> => {
      return mqttManager.publish(topicRef.current, payload);
    },
    []
  );

  return {
    state,
    publish,
    isConnected,
  };
}

export default useMQTT;
