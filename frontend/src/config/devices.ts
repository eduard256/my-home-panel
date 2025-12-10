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
  // Vadim's Room - Lighting
  'main-vadim-room-light': {
    id: 'main-vadim-room-light',
    name: 'Room Light',
    room: 'Vadim',
    type: 'dual-switch',
    topic: 'zigbee2mqtt/main-vadim-room-light',
    canvasPosition: { x: 300, y: 100 }, // Top center (ceiling)
    icon: 'Lightbulb',
  },

  'main-vadim-bed-yeelight': {
    id: 'main-vadim-bed-yeelight',
    name: 'Bed RGB Strip',
    room: 'Vadim',
    type: 'rgb-strip',
    topic: 'automation_devices/main-vadim-bed-yeelight',
    canvasPosition: { x: 200, y: 300 }, // Bottom left (bed area)
    icon: 'Lightbulb',
  },

  // Vadim's Room - Curtain
  'main-vadim-window-curtain': {
    id: 'main-vadim-window-curtain',
    name: 'Window Curtain',
    room: 'Vadim',
    type: 'curtain',
    topic: 'zigbee2mqtt/main-vadim-window-curtain',
    canvasPosition: { x: 500, y: 200 }, // Right side (window)
    icon: 'ChevronDown',
  },
};

/**
 * Room colors for canvas visualization
 */
export const ROOM_COLORS: Record<string, string> = {
  Vadim: 'rgba(99, 102, 241, 0.05)', // Indigo theme for Vadim's room
  'Main - Eduard': 'rgba(155, 135, 245, 0.1)',
  'Living Room': 'rgba(16, 185, 129, 0.1)',
  Kitchen: 'rgba(245, 158, 11, 0.1)',
  Bedroom: 'rgba(59, 130, 246, 0.1)',
  Bathroom: 'rgba(236, 72, 153, 0.1)',
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
