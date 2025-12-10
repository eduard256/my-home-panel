import { useEffect, useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, endpoints, createMQTTStream } from '@/lib/api';
import { getAllDevices } from '@/config/devices';
import type { Device, DeviceState, DeviceConfig } from '@/types';
import { toast } from 'sonner';

/**
 * Hook to manage devices with real-time MQTT updates
 */
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>(() => {
    // Initialize with config devices
    return getAllDevices().map((config) => ({
      ...config,
      state: undefined,
    }));
  });

  const [isConnected, setIsConnected] = useState(false);

  // Handle MQTT message
  const handleMQTTMessage = useCallback((data: unknown) => {
    const message = data as { topic: string; payload: DeviceState };
    if (!message.topic) return;

    setDevices((prev) =>
      prev.map((device) => {
        if (device.topic === message.topic || message.topic.includes(device.id)) {
          return {
            ...device,
            state: {
              ...device.state,
              ...message.payload,
            },
          };
        }
        return device;
      })
    );
  }, []);

  // Connect to MQTT stream
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = createMQTTStream(handleMQTTMessage);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect to MQTT stream:', error);
      setIsConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [handleMQTTMessage]);

  return {
    devices,
    isConnected,
  };
}

/**
 * Mutation to publish MQTT message
 */
export function usePublishMQTT() {
  return useMutation({
    mutationFn: async ({ topic, payload }: { topic: string; payload: Record<string, unknown> }) => {
      const response = await api.post(endpoints.mqtt.publish, {
        topic,
        payload,
      });
      return response.data;
    },
    onError: (error: { detail?: string }) => {
      toast.error(error.detail || 'Failed to send command');
    },
  });
}

/**
 * Hook to control a specific device
 */
export function useDeviceControl(device: DeviceConfig) {
  const { mutate: publish, isPending } = usePublishMQTT();

  const toggle = useCallback(() => {
    const currentState = (device as Device).state?.state;
    const newState = currentState === 'ON' ? 'OFF' : 'ON';

    publish({
      topic: `${device.topic}/set`,
      payload: { state: newState },
    });
  }, [device, publish]);

  const setState = useCallback(
    (state: 'ON' | 'OFF') => {
      publish({
        topic: `${device.topic}/set`,
        payload: { state },
      });
    },
    [device.topic, publish]
  );

  const setBrightness = useCallback(
    (brightness: number) => {
      publish({
        topic: `${device.topic}/set`,
        payload: { brightness },
      });
    },
    [device.topic, publish]
  );

  const setPayload = useCallback(
    (payload: Record<string, unknown>) => {
      publish({
        topic: `${device.topic}/set`,
        payload,
      });
    },
    [device.topic, publish]
  );

  return {
    toggle,
    setState,
    setBrightness,
    setPayload,
    isPending,
  };
}
