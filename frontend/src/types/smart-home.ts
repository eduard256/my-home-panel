// ============================================
// Smart Home Device Types
// ============================================

/**
 * Device type identifiers for smart home devices.
 * Each type has specific controls and display characteristics.
 */
export type DeviceType =
  | 'switch'
  | 'single_switch'
  | 'single_switch_right'
  | 'dimmer'
  | 'relay'
  | 'curtain'
  | 'rgb_light'
  | 'yeelight_strip'
  | 'led_strip'
  | 'button'
  | 'motion_sensor'
  | 'contact_sensor'
  | 'plug'
  | 'bathroom_sensors'
  | 'presence_zones';

/**
 * Card size configuration for responsive grid layout.
 * - 1x1: Single column (switches, buttons, sensors)
 * - 2x1: Double column (dimmers, RGB lights, curtains)
 */
export type CardSize = '1x1' | '2x1';

/**
 * Connection status for MQTT manager.
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// ============================================
// Device State Interfaces
// ============================================

/**
 * Base state interface for all devices.
 * Contains common fields from Zigbee2MQTT.
 */
export interface BaseDeviceState {
  linkquality?: number;
  last_seen?: string;
  update_available?: boolean;
}

/**
 * State for 2-gang switches (left/right channels).
 */
export interface SwitchState extends BaseDeviceState {
  state_left?: 'ON' | 'OFF';
  state_right?: 'ON' | 'OFF';
  state?: 'ON' | 'OFF';
  power_left?: number;
  power_right?: number;
  power?: number;
  voltage?: number;
  current?: number;
}

/**
 * State for dimmer devices.
 */
export interface DimmerState extends BaseDeviceState {
  state?: 'ON' | 'OFF';
  brightness?: number; // 0-254
  power?: number;
  voltage?: number;
}

/**
 * State for 2-channel relay devices.
 */
export interface RelayState extends BaseDeviceState {
  state_l1?: 'ON' | 'OFF';
  state_l2?: 'ON' | 'OFF';
  state?: 'ON' | 'OFF';
  power?: number;
}

/**
 * State for motorized curtain devices.
 */
export interface CurtainState extends BaseDeviceState {
  position?: number; // 0-100
  state?: 'OPEN' | 'CLOSE' | 'STOP';
  running?: boolean;
}

/**
 * RGB color representation.
 */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * State for RGB light devices (Yeelight).
 */
export interface RGBLightState extends BaseDeviceState {
  state?: 'ON' | 'OFF';
  brightness?: number; // 0-100
  color?: RGBColor;
  color_temp?: number;
  color_mode?: 'rgb' | 'color_temp';
}

/**
 * State for Yeelight Strip8 devices.
 * Uses mireds for color temperature (153-370) and 0-255 for brightness.
 */
export interface YeelightStripState extends BaseDeviceState {
  state?: 'ON' | 'OFF';
  brightness?: number; // 0-255
  color?: RGBColor;
  color_temp?: number; // 153-370 mireds (6500K-2700K)
  color_mode?: 'rgb' | 'color_temp';
}

/**
 * State for presence zone sensor (Aqara FP2).
 */
export interface PresenceZoneState extends BaseDeviceState {
  occupancy?: boolean;
  last_seen?: string;
}

/**
 * State for LED strip devices (2-line).
 */
export interface LEDStripState extends BaseDeviceState {
  state_l1?: 'ON' | 'OFF';
  state_l2?: 'ON' | 'OFF';
  state?: 'ON' | 'OFF';
  brightness_l1?: number; // 0-254
  brightness_l2?: number; // 0-254
}

/**
 * Button action types.
 */
export type ButtonAction = 'single' | 'double' | 'hold' | 'release' | 'single_left' | 'single_right' | 'double_left' | 'double_right' | 'hold_left' | 'hold_right';

/**
 * State for button devices (read-only).
 */
export interface ButtonState extends BaseDeviceState {
  action?: ButtonAction;
  battery?: number;
  voltage?: number;
}

/**
 * State for motion sensor devices (read-only).
 */
export interface MotionSensorState extends BaseDeviceState {
  occupancy?: boolean;
  illuminance?: number;
  illuminance_lux?: number;
  battery?: number;
  device_temperature?: number;
}

/**
 * State for contact sensor devices (read-only).
 */
export interface ContactSensorState extends BaseDeviceState {
  contact?: boolean; // true = closed, false = open
  battery?: number;
  voltage?: number;
}

/**
 * State for smart plug devices.
 */
export interface PlugState extends BaseDeviceState {
  state?: 'ON' | 'OFF';
  power?: number;
  voltage?: number;
  current?: number;
  energy?: number;
}

/**
 * Union type for all device states.
 */
export type DeviceState =
  | SwitchState
  | DimmerState
  | RelayState
  | CurtainState
  | RGBLightState
  | YeelightStripState
  | LEDStripState
  | ButtonState
  | MotionSensorState
  | ContactSensorState
  | PlugState
  | PresenceZoneState;

// ============================================
// Device Configuration Interfaces
// ============================================

/**
 * Channel labels for multi-gang devices.
 */
export interface ChannelLabels {
  left?: string;
  right?: string;
  l1?: string;
  l2?: string;
}

/**
 * Presence zone configuration for Aqara FP2.
 */
export interface PresenceZoneConfig {
  id: string;
  name: string;
  topic: string;
}

/**
 * Device configuration for the smart home UI.
 */
export interface DeviceConfig {
  id: string;
  topic: string;
  name: string;
  type: DeviceType;
  size: CardSize;
  roomId: string;
  channelLabels?: ChannelLabels;
  isOffline?: boolean; // For known offline devices
  readOnly?: boolean; // For sensors/buttons
  presenceZones?: PresenceZoneConfig[]; // For presence_zones type
}

/**
 * Room configuration for organizing devices.
 */
export interface RoomConfig {
  id: string;
  name: string;
  displayName: string;
  icon?: string;
  order: number;
}

// ============================================
// MQTT Manager Types
// ============================================

/**
 * Subscriber callback function type.
 */
export type SubscriberCallback = (state: DeviceState) => void;

/**
 * Connection change callback function type.
 */
export type ConnectionCallback = (status: ConnectionStatus) => void;

/**
 * Unsubscribe function returned by subscribe methods.
 */
export type UnsubscribeFunction = () => void;

/**
 * MQTT publish payload for device commands.
 */
export interface PublishPayload {
  [key: string]: string | number | boolean | RGBColor | undefined;
}

/**
 * SSE event data structure.
 */
export interface MQTTSSEEvent {
  topic: string;
  payload: DeviceState;
  timestamp?: string;
}

// ============================================
// Component Props Interfaces
// ============================================

/**
 * Base props for device card components.
 */
export interface DeviceCardProps {
  device: DeviceConfig;
  state: DeviceState | null;
  isConnected: boolean;
  onPublish: (payload: PublishPayload) => Promise<boolean>;
  onDetailOpen: () => void;
}

/**
 * Props for room section component.
 */
export interface RoomSectionProps {
  room: RoomConfig;
  devices: DeviceConfig[];
  onDeviceDetailOpen: (device: DeviceConfig) => void;
}

/**
 * Props for device detail panel.
 */
export interface DeviceDetailProps {
  device: DeviceConfig;
  state: DeviceState | null;
  isConnected: boolean;
  onPublish: (payload: PublishPayload) => Promise<boolean>;
  onClose: () => void;
}

// ============================================
// Store Types
// ============================================

/**
 * Selected device for detail panel.
 */
export interface SelectedDevice {
  device: DeviceConfig;
  topic: string;
}

/**
 * Smart home store state.
 */
export interface SmartHomeState {
  selectedDevice: SelectedDevice | null;
  setSelectedDevice: (device: DeviceConfig | null) => void;
  clearSelectedDevice: () => void;
}
