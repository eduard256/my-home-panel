// ===========================================================================
// DEPRECATED: This file is part of the legacy Smart Home implementation.
// It is still functional but will be removed once the new WebSocket-based
// Smart Home system (Smart Home New) is fully implemented.
// All new development should go into the new system under smart-home-new/.
// ===========================================================================

import { useState, useEffect, useCallback } from 'react';
import type { ConnectionStatus } from '@/types/smart-home';
import { mqttManager } from '@/services/mqtt-manager';

/**
 * Hook interface for MQTT connection lifecycle.
 */
interface UseMQTTConnectionResult {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Hook for managing the MQTT SSE connection lifecycle.
 * Use once in SmartHomeSection to initialize and manage the connection.
 *
 * @returns Object containing connection status and control functions
 */
export function useMQTTConnection(): UseMQTTConnectionResult {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    () => mqttManager.getConnectionStatus()
  );

  // Subscribe to connection status changes
  useEffect(() => {
    const unsubscribe = mqttManager.onConnectionChange((status) => {
      setConnectionStatus(status);
    });

    // Auto-connect when hook mounts
    if (mqttManager.getConnectionStatus() === 'disconnected') {
      mqttManager.connect();
    }

    // Cleanup: disconnect when component unmounts
    return () => {
      unsubscribe();
      // Optionally disconnect - but usually we want to keep connection alive
      // mqttManager.disconnect();
    };
  }, []);

  const connect = useCallback(() => {
    mqttManager.connect();
  }, []);

  const disconnect = useCallback(() => {
    mqttManager.disconnect();
  }, []);

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    connect,
    disconnect,
  };
}

export default useMQTTConnection;
