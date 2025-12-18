import type { DeviceConfig } from '@/types';

/**
 * Device Configuration
 *
 * Add your Zigbee2MQTT devices here with their canvas positions.
 * The canvas position determines where the device card appears on the devices canvas.
 *
 * Device types:
 * - 'switch': On/Off toggle devices (lights, outlets)
 * - 'dimmer': Dimmable lights with brightness slider
 * - 'sensor': Read-only sensors (temperature, humidity, motion)
 * - 'thermostat': Temperature control devices
 *
 * Icons: Use Lucide icon names (https://lucide.dev/icons)
 */
export const DEVICES_CONFIG: Record<string, DeviceConfig> = {
  // Add your real Zigbee2MQTT devices here
  // Example:
  // 'device-id': {
  //   id: 'device-id',
  //   name: 'Device Name',
  //   room: 'Room Name',
  //   type: 'switch', // or 'dimmer', 'sensor', 'thermostat'
  //   topic: 'zigbee2mqtt/device-id',
  //   canvasPosition: { x: 100, y: 100 },
  //   icon: 'Lightbulb', // Lucide icon name
  // },
};

/**
 * Room colors for canvas visualization
 */
export const ROOM_COLORS: Record<string, string> = {
  Other: 'rgba(107, 114, 128, 0.1)',
};

export const getDeviceConfig = (id: string): DeviceConfig | undefined => {
  return DEVICES_CONFIG[id];
};

export const getAllDevices = (): DeviceConfig[] => {
  return Object.values(DEVICES_CONFIG);
};

export const getDevicesByRoom = (): Record<string, DeviceConfig[]> => {
  const grouped: Record<string, DeviceConfig[]> = {};

  Object.values(DEVICES_CONFIG).forEach((device) => {
    const room = device.room || 'Other';
    if (!grouped[room]) {
      grouped[room] = [];
    }
    grouped[room].push(device);
  });

  return grouped;
};

export const getRooms = (): string[] => {
  const rooms = new Set<string>();
  Object.values(DEVICES_CONFIG).forEach((device) => {
    rooms.add(device.room || 'Other');
  });
  return Array.from(rooms);
};
