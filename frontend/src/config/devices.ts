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
  'main-eduard-bigwardrobe-switch': {
    id: 'main-eduard-bigwardrobe-switch',
    name: 'Big Wardrobe',
    room: 'Main - Eduard',
    type: 'switch',
    topic: 'zigbee2mqtt/main-eduard-bigwardrobe-switch',
    canvasPosition: { x: 120, y: 340 },
    icon: 'Lightbulb',
  },
  'main-eduard-smallwardrobe-switch': {
    id: 'main-eduard-smallwardrobe-switch',
    name: 'Small Wardrobe',
    room: 'Main - Eduard',
    type: 'switch',
    topic: 'zigbee2mqtt/main-eduard-smallwardrobe-switch',
    canvasPosition: { x: 120, y: 440 },
    icon: 'Lightbulb',
  },
  'main-livingroom-ceiling-dimmer': {
    id: 'main-livingroom-ceiling-dimmer',
    name: 'Ceiling Light',
    room: 'Living Room',
    type: 'dimmer',
    topic: 'zigbee2mqtt/main-livingroom-ceiling-dimmer',
    canvasPosition: { x: 400, y: 200 },
    icon: 'Sun',
  },
  'main-livingroom-temp-sensor': {
    id: 'main-livingroom-temp-sensor',
    name: 'Temperature',
    room: 'Living Room',
    type: 'sensor',
    topic: 'zigbee2mqtt/main-livingroom-temp-sensor',
    canvasPosition: { x: 400, y: 340 },
    icon: 'Thermometer',
  },
  'main-kitchen-light-switch': {
    id: 'main-kitchen-light-switch',
    name: 'Kitchen Light',
    room: 'Kitchen',
    type: 'switch',
    topic: 'zigbee2mqtt/main-kitchen-light-switch',
    canvasPosition: { x: 680, y: 200 },
    icon: 'Lightbulb',
  },
  'main-bedroom-ceiling-dimmer': {
    id: 'main-bedroom-ceiling-dimmer',
    name: 'Bedroom Light',
    room: 'Bedroom',
    type: 'dimmer',
    topic: 'zigbee2mqtt/main-bedroom-ceiling-dimmer',
    canvasPosition: { x: 680, y: 340 },
    icon: 'Moon',
  },
  'main-bathroom-temp-sensor': {
    id: 'main-bathroom-temp-sensor',
    name: 'Bathroom Temp',
    room: 'Bathroom',
    type: 'sensor',
    topic: 'zigbee2mqtt/main-bathroom-temp-sensor',
    canvasPosition: { x: 680, y: 480 },
    icon: 'Thermometer',
  },
};

/**
 * Room colors for canvas visualization
 */
export const ROOM_COLORS: Record<string, string> = {
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
