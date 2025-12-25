import type { DeviceConfig, RoomConfig } from '@/types/smart-home';

/**
 * Room configurations for the Smart Home interface.
 * Ordered for display in the UI.
 */
export const ROOMS: RoomConfig[] = [
  {
    id: 'living-room',
    name: 'living-room',
    displayName: 'Living Room',
    order: 1,
  },
  {
    id: 'eduard-room',
    name: 'eduard-room',
    displayName: "Eduard's Room",
    order: 2,
  },
  {
    id: 'kitchen',
    name: 'kitchen',
    displayName: 'Kitchen',
    order: 3,
  },
  {
    id: 'vadim-room',
    name: 'vadim-room',
    displayName: "Vadim's Room",
    order: 4,
  },
  {
    id: 'dressing-room',
    name: 'dressing-room',
    displayName: 'Dressing Room',
    order: 5,
  },
  {
    id: 'bathroom',
    name: 'bathroom',
    displayName: 'Bathroom',
    order: 6,
  },
  {
    id: 'hallway',
    name: 'hallway',
    displayName: 'Hallway',
    order: 7,
  },
  {
    id: 'conservatory',
    name: 'conservatory',
    displayName: 'Conservatory',
    order: 8,
  },
  {
    id: 'outdoor',
    name: 'outdoor',
    displayName: 'Outdoor',
    order: 9,
  },
];

/**
 * Device configurations for all Smart Home devices.
 * Organized by room with specific controls and display settings.
 */
export const DEVICES: DeviceConfig[] = [
  // ============================================
  // Living Room
  // ============================================
  {
    id: 'main-livingroom-map_wall-relay',
    topic: 'zigbee2mqtt/main-livingroom-map_wall-relay',
    name: 'Map Lights',
    type: 'relay',
    size: '2x1',
    roomId: 'living-room',
    channelLabels: { l1: 'Line 1', l2: 'Line 2' },
  },
  {
    id: 'main-livingroom-room-switch',
    topic: 'zigbee2mqtt/main-livingroom-room-switch',
    name: 'Room Light',
    type: 'switch',
    size: '2x1',
    roomId: 'living-room',
    channelLabels: { left: 'Left', right: 'Right' },
  },

  // ============================================
  // Eduard's Room
  // ============================================
  {
    id: 'main-eduard-bigwardrobe-switch',
    topic: 'zigbee2mqtt/main-eduard-bigwardrobe-switch',
    name: 'Big Wardrobe',
    type: 'switch',
    size: '2x1',
    roomId: 'eduard-room',
    channelLabels: { left: 'Left', right: 'Right' },
  },
  {
    id: 'main-eduard-smallwardrobe-dimmer',
    topic: 'zigbee2mqtt/main-eduard-smallwardrobe-dimme',
    name: 'Small Wardrobe',
    type: 'dimmer',
    size: '2x1',
    roomId: 'eduard-room',
  },
  {
    id: 'main-eduard-storage-switch',
    topic: 'zigbee2mqtt/main-eduard-storage-switch',
    name: 'Storage',
    type: 'single_switch_right',
    size: '1x1',
    roomId: 'eduard-room',
  },
  {
    id: 'main-eduard-brightlight-switch',
    topic: 'zigbee2mqtt/main-eduard-brightlight-switch',
    name: 'Ceiling Light',
    type: 'single_switch',
    size: '1x1',
    roomId: 'eduard-room',
    channelLabels: { left: 'Light' },
  },
  {
    id: 'main-eduard-monitor-light',
    topic: 'yeelight/main-eduard-monitor-light',
    name: 'Monitor Light',
    type: 'yeelight_strip',
    size: '2x1',
    roomId: 'eduard-room',
  },
  {
    id: 'main-eduard-bed-strip',
    topic: 'yeelight/main-eduard-bed-strip',
    name: 'Bed Strip',
    type: 'yeelight_strip',
    size: '2x1',
    roomId: 'eduard-room',
  },
  {
    id: 'main-eduard-room-presence',
    topic: 'homekit/main-eduard-room-occupation',
    name: 'Room Presence',
    type: 'presence_zones',
    size: '2x1',
    roomId: 'eduard-room',
    readOnly: true,
    presenceZones: [
      {
        id: 'bed',
        name: 'Bed',
        topic: 'homekit/main-eduard-room-occupation/presence_sensor_3',
      },
      {
        id: 'entrance',
        name: 'Entrance',
        topic: 'homekit/main-eduard-room-occupation/presence_sensor_5',
      },
      {
        id: 'desk',
        name: 'Desk',
        topic: 'homekit/main-eduard-room-occupation/presence_sensor_2',
      },
      {
        id: 'wardrobe',
        name: 'Wardrobe',
        topic: 'homekit/main-eduard-room-occupation/presence_sensor_4',
      },
    ],
  },

  // ============================================
  // Kitchen
  // ============================================
  {
    id: 'main-kitchen-bright-switch',
    topic: 'zigbee2mqtt/main-kitchen-bright-switch',
    name: 'Ceiling Light',
    type: 'single_switch_right',
    size: '1x1',
    roomId: 'kitchen',
  },
  {
    id: 'main-kitchen-table-switch',
    topic: 'zigbee2mqtt/main-kitchen-table-switch',
    name: 'Table Light',
    type: 'switch',
    size: '1x1',
    roomId: 'kitchen',
  },

  // ============================================
  // Vadim's Room
  // ============================================
  {
    id: 'main-vadim-room-light',
    topic: 'zigbee2mqtt/main-vadim-room-light',
    name: 'Room Light',
    type: 'switch',
    size: '1x1',
    roomId: 'vadim-room',
    channelLabels: { left: 'Side', right: 'Main' },
  },
  {
    id: 'main-vadim-bed-motion_sensor',
    topic: 'zigbee2mqtt/main-vadim-bed-motion_sensor',
    name: 'Motion',
    type: 'motion_sensor',
    size: '1x1',
    roomId: 'vadim-room',
    readOnly: true,
  },
  {
    id: 'main-vadim-bed-yeelight',
    topic: 'automation_devices/main-vadim-bed-yeelight',
    name: 'Bed Lighting',
    type: 'rgb_light',
    size: '2x1',
    roomId: 'vadim-room',
  },
  {
    id: 'main-vadim-window-curtain',
    topic: 'zigbee2mqtt/main-vadim-window-curtain',
    name: 'Curtain',
    type: 'curtain',
    size: '2x1',
    roomId: 'vadim-room',
  },

  // ============================================
  // Dressing Room
  // ============================================
  {
    id: 'main-dressingroom-room-switch',
    topic: 'zigbee2mqtt/main-dressingroom-room-switch',
    name: 'Light',
    type: 'switch',
    size: '1x1',
    roomId: 'dressing-room',
  },
  {
    id: 'main-dressingroom-room-motion_sensor',
    topic: 'zigbee2mqtt/main-dressingroom-room-motion_sensor',
    name: 'Motion',
    type: 'motion_sensor',
    size: '1x1',
    roomId: 'dressing-room',
    readOnly: true,
  },

  // ============================================
  // Bathroom
  // ============================================
  {
    id: 'main-wc1-room-strip',
    topic: 'zigbee2mqtt/main-wc1-room-strip',
    name: 'LED Strip',
    type: 'led_strip',
    size: '2x1',
    roomId: 'bathroom',
    channelLabels: { l1: 'Line 1', l2: 'Line 2' },
  },
  {
    id: 'main-wc1-room-switch',
    topic: 'zigbee2mqtt/main-wc1-room-switch',
    name: 'Light',
    type: 'single_switch',
    size: '1x1',
    roomId: 'bathroom',
    channelLabels: { left: 'Light' },
  },
  {
    id: 'main-wc1-sensors',
    topic: 'zigbee2mqtt/main-wc1-room-motion_sensor',
    name: 'Sensors',
    type: 'bathroom_sensors',
    size: '1x1',
    roomId: 'bathroom',
    readOnly: true,
  },

  // ============================================
  // Hallway
  // ============================================
  {
    id: 'main-hallway-room-switch',
    topic: 'zigbee2mqtt/main-hallway-room-switch',
    name: 'Hallway Light',
    type: 'switch',
    size: '2x1',
    roomId: 'hallway',
    channelLabels: { left: 'Left', right: 'Right' },
  },

  // ============================================
  // Conservatory
  // ============================================
  {
    id: 'main-conservatory-balls-switch',
    topic: 'zigbee2mqtt/main-conservatory-balls-switch',
    name: 'Decorative Lights',
    type: 'switch',
    size: '2x1',
    roomId: 'conservatory',
    channelLabels: { left: 'Left', right: 'Right' },
  },

  // ============================================
  // Outdoor
  // ============================================
  {
    id: 'main-street-windows-newyear_light',
    topic: 'zigbee2mqtt/main-street-windows-newyear_light',
    name: 'Holiday Lights',
    type: 'single_switch',
    size: '2x1',
    roomId: 'outdoor',
  },
];

/**
 * Get devices for a specific room.
 */
export function getDevicesByRoom(roomId: string): DeviceConfig[] {
  return DEVICES.filter((device) => device.roomId === roomId);
}

/**
 * Get a device by its ID.
 */
export function getDeviceById(deviceId: string): DeviceConfig | undefined {
  return DEVICES.find((device) => device.id === deviceId);
}

/**
 * Get a device by its MQTT topic.
 */
export function getDeviceByTopic(topic: string): DeviceConfig | undefined {
  return DEVICES.find((device) => device.topic === topic);
}

/**
 * Get sorted rooms.
 */
export function getSortedRooms(): RoomConfig[] {
  return [...ROOMS].sort((a, b) => a.order - b.order);
}

/**
 * Get a room by its ID.
 */
export function getRoomById(roomId: string): RoomConfig | undefined {
  return ROOMS.find((room) => room.id === roomId);
}
