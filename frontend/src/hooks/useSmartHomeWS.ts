/**
 * React hooks for the new WebSocket-based Smart Home system.
 *
 * useSmartHomeConnection() — manages WS lifecycle (connect on mount, disconnect on unmount)
 * useDevice(topic) — subscribes to a device topic, returns state + publish + connection info
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { smartHomeWs } from '@/services/smart-home-ws';
import { useAuthStore } from '@/stores/authStore';
import type { ConnectionStatus, DeviceState, PublishPayload } from '@/types/smart-home-new';

/**
 * Manages the WebSocket connection lifecycle.
 * Call once in SmartHomeNewSection — connects on mount, disconnects on unmount.
 *
 * @returns { connectionStatus, reconnect }
 */
export function useSmartHomeConnection() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    smartHomeWs.getStatus()
  );
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    // Subscribe to connection status changes
    const unsub = smartHomeWs.onConnectionChange(setConnectionStatus);

    // Connect with token getter
    smartHomeWs.connect(() => useAuthStore.getState().token);

    return () => {
      unsub();
      smartHomeWs.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reconnect = useCallback(() => {
    smartHomeWs.disconnect();
    smartHomeWs.connect(() => useAuthStore.getState().token);
  }, []);

  return { connectionStatus, reconnect };
}

/**
 * Subscribe to a specific device topic.
 * Returns current state, publish function, and connection status.
 *
 * @param topic MQTT topic string
 * @returns { state, publish, isConnected, hasData }
 */
export function useDevice(topic: string) {
  const [state, setState] = useState<DeviceState | null>(
    smartHomeWs.getState(topic)
  );
  const [isConnected, setIsConnected] = useState<boolean>(
    smartHomeWs.getStatus() === 'connected'
  );

  useEffect(() => {
    // Subscribe to device state
    const unsubDevice = smartHomeWs.subscribe(topic, (newState) => {
      setState(newState);
    });

    // Subscribe to connection status
    const unsubConnection = smartHomeWs.onConnectionChange((status) => {
      setIsConnected(status === 'connected');
    });

    // Sync initial state (in case it changed between render and effect)
    const cached = smartHomeWs.getState(topic);
    if (cached) {
      setState(cached);
    }

    return () => {
      unsubDevice();
      unsubConnection();
    };
  }, [topic]);

  const publish = useCallback(
    (payload: PublishPayload) => {
      smartHomeWs.publish(topic, payload);
    },
    [topic]
  );

  const hasData = smartHomeWs.hasData(topic);

  return { state, publish, isConnected, hasData };
}
