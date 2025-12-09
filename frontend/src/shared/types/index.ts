// Navigation types
export type Section =
  | 'dashboard'
  | 'servers'
  | 'vms'
  | 'automations'
  | 'smarthome'
  | 'cameras'
  | 'assistant';

export interface MenuItem {
  id: Section;
  label: string;
  icon: string;
}

// Auth types
export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Proxmox types
export interface ProxmoxServer {
  id: string;
  name: string;
  ip: string;
  node: string;
  online: boolean;
  uptime: number;
  cpu: number;
  memory_used: number;
  memory_total: number;
  memory_percent: number;
  disk_used: number;
  disk_total: number;
  disk_percent: number;
  network_in: number | null;
  network_out: number | null;
  load_average: number[];
  vms_running: number;
  vms_total: number;
  cts_running: number;
  cts_total: number;
}

export interface VM {
  id: string;
  vmid: number;
  name: string;
  node: string;
  type: 'qemu' | 'lxc';
  status: string;
  cpu?: number;
  cpus: number;
  memory_used?: number;
  memory_total?: number;
  memory_percent?: number;
  disk_used?: number;
  disk_total?: number;
  disk_percent?: number;
  network_in?: number;
  network_out?: number;
  uptime?: number;
}

// Frigate types
export interface Camera {
  name: string;
  enabled: boolean;
  width: number;
  height: number;
  fps: number;
  detect?: {
    enabled: boolean;
  };
  record?: {
    enabled: boolean;
  };
  snapshots?: {
    enabled: boolean;
  };
  stats?: {
    detection_fps?: number;
    process_fps?: number;
    inference_speed?: number;
  };
  events_today?: number;
  last_event?: string | null;
}

export interface CameraEvent {
  id: string;
  camera: string;
  label: string;
  sub_label?: string | null;
  start_time: string;
  end_time?: string | null;
  score: number;
  thumbnail?: boolean;
  has_clip?: boolean;
  has_snapshot?: boolean;
  zones?: string[];
}

export interface FrigateStats {
  service: {
    uptime: number;
    version: string;
    latest_version: string;
    storage: Record<string, unknown>;
    temperatures: Record<string, unknown>;
    last_updated: number;
  };
  cameras: Record<string, {
    camera_fps: number;
    process_fps: number;
    detection_fps: number;
    pid: number;
  }>;
}

// Automation types
export interface AutomationHealthDetail {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message?: string;
}

export interface Automation {
  id: string;
  name: string;
  type: string;
  description?: string;
  enabled: boolean;
  health: {
    overall: 'healthy' | 'warning' | 'error';
    details: AutomationHealthDetail[];
  };
  last_run?: string | null;
  trigger_count?: number;
  success_count?: number;
  error_count?: number;
}

export interface AutomationLog {
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  duration?: number;
}

// MQTT / Smart Home types
export interface Room {
  id: string;
  name: string;
}

export interface SmartDeviceState {
  on: boolean;
  brightness?: number;
  color_temp?: number;
  temperature?: number;
  current_temperature?: number;
  locked?: boolean;
}

export interface SmartDevice {
  id: string;
  name: string;
  room_id: string;
  type: 'light' | 'switch' | 'dimmer' | 'sensor' | 'thermostat' | 'lock' | 'tv' | 'speaker' | 'fan';
  state: SmartDeviceState;
  manufacturer?: string;
  model?: string;
  last_seen?: string;
}

// AI types
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AISession {
  id: string;
  section: Section;
  messages: AIMessage[];
  processId: string | null;
  isLoading: boolean;
}

// Metrics types
export interface MetricPoint {
  timestamp: string;
  cpu_percent: number;
  memory_used: number;
  memory_total: number;
  disk_used?: number;
  disk_total?: number;
  network_in?: number | null;
  network_out?: number | null;
  uptime?: number;
}

export interface ServerMetrics {
  server_id: string;
  data: MetricPoint[];
  total: number;
  time_range: string;
  aggregation: string | null;
}

// UI State types
export interface UIState {
  section: Section;
  selectedServerId: string | null;
  selectedVMId: string | null;
  selectedAutomationId: string | null;
  selectedDeviceId: string | null;
  selectedCameraId: string | null;
  isMobile: boolean;
  isMenuOpen: boolean;
  activeBlock: 1 | 2 | 3;
  isAIChatOpen: boolean;
}
