// ============================================
// Authentication Types
// ============================================
export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
}

// ============================================
// Navigation Types
// ============================================
export type CategoryId = 'servers' | 'vms' | 'automations' | 'devices' | 'cameras' | 'assistant';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  order: number;
  aiEnabled: boolean;
  customLayout?: boolean;
  aiOnly?: boolean;
}

export interface Block3State {
  isOpen: boolean;
  type: 'detail' | 'ai-chat' | null;
  detailType: CategoryId | null;
  detailId: string | null;
}

export interface NavigationState {
  currentCategory: CategoryId;
  block3State: Block3State;
  setCategory: (category: CategoryId) => void;
  openDetail: (type: CategoryId, id: string) => void;
  openAI: () => void;
  closeBlock3: () => void;
  isFirstVisit: boolean;
  setFirstVisitComplete: () => void;
}

// ============================================
// Server Types (Proxmox)
// ============================================
export interface ServerInfo {
  id: string;
  name: string;
  node: string;
  online: boolean;
  ip: string;
  cpu: number;
  memory_used: number;
  memory_total: number;
  memory_percent: number;
  disk_used: number;
  disk_total: number;
  disk_percent: number;
  uptime: number;
  network_in: number | null;
  network_out: number | null;
  load_average: number[];
  vms_running: number;
  vms_total: number;
  cts_running: number;
  cts_total: number;
}

export interface ServerMetrics {
  timestamps: string[];
  cpu_percent: number[];
  memory_used: number[];
  memory_total: number[];
  disk_read: number[];
  disk_write: number[];
  network_in: number[];
  network_out: number[];
}

export interface ServerDetail extends ServerInfo {
  version: string;
  kernel: string;
  disks: DiskInfo[];
}

export interface DiskInfo {
  name: string;
  used: number;
  total: number;
  percent: number;
}

// ============================================
// VM/CT Types
// ============================================
export type VMType = 'qemu' | 'lxc';
export type VMStatus = 'running' | 'stopped' | 'paused';

export interface VM {
  vmid: number;
  name: string;
  type: VMType;
  status: VMStatus;
  cpu: number | null;
  cpu_percent: number | null;
  cpus: number | null;
  memory_used: number | null;
  memory_total: number | null;
  memory_percent: number | null;
  disk_used: number | null;
  disk_total: number | null;
  disk_read: number | null;
  disk_write: number | null;
  network_in: number | null;
  network_out: number | null;
  uptime: number | null;
  tags: string[];
  template: boolean;
  node?: string;
  ip?: string;
}

export interface VMDetail extends VM {
  os?: string;
}

export interface VMMetrics {
  timestamps: string[];
  cpu: number[];
  memory: number[];
  disk_read: number[];
  disk_write: number[];
  network_in: number[];
  network_out: number[];
}

// ============================================
// Automation Types
// ============================================
export type HealthStatus = 'healthy' | 'degraded' | 'offline' | 'unhealthy';

// Raw API response types (what backend returns)
export interface AutomationAPIResponse {
  container_name: string;
  automation_name: string;
  container: {
    id: string;
    status: string;
    image: string;
    created: string | null;
    started: string | null;
    uptime_seconds: number | null;
  };
  mqtt: {
    status: {
      status: string | null;
      uptime: number | null;
      triggers_count: number | null;
      errors_count: number | null;
      last_trigger: string | null;
      timestamp: string | null;
    } | null;
    ready: {
      status: string | null;
      timestamp: string | null;
      version: string | null;
      description: string | null;
    } | null;
    config: unknown | null;
    last_seen: string | null;
  } | null;
  health: {
    overall: HealthStatus;
    docker_running: boolean;
    mqtt_responding: boolean;
  };
}

export interface AutomationListAPIResponse {
  automations: AutomationAPIResponse[];
  total: number;
  running: number;
  stopped: number;
}

// Transformed types (what frontend components use)
export interface AutomationHealth {
  overall: HealthStatus;
  docker_running: boolean;
  mqtt_responding: boolean;
}

export interface AutomationContainer {
  id: string;
  status: 'running' | 'stopped' | 'exited' | string;
  image: string;
  uptime_seconds: number;
}

export interface AutomationMQTTStatus {
  status: string;
  uptime: number;
  triggers_count: number;
  errors_count: number;
  last_trigger: string | null;
}

export interface AutomationMQTT {
  status: AutomationMQTTStatus | null;
  description: string | null;
  version: string | null;
}

export interface Automation {
  name: string;
  container_name: string;
  description: string | null;
  room: string;
  health: AutomationHealth;
  container: AutomationContainer;
  mqtt: AutomationMQTT;
  errors_count: number;
}

export interface AutomationDetail extends Automation {
  logs?: string[];
  recent_triggers?: {
    timestamp: string;
    description: string;
  }[];
}

export interface AutomationMetrics {
  timestamps: string[];
  triggers: number[];
  errors: number[];
}

// ============================================
// Device Types (Zigbee2MQTT)
// ============================================
export type DeviceType = 'switch' | 'dimmer' | 'sensor' | 'thermostat' | 'dual-switch' | 'rgb-strip' | 'curtain';

export interface DeviceState {
  // Common states
  state?: 'ON' | 'OFF';
  brightness?: number;
  temperature?: number;
  humidity?: number;
  battery?: number;
  linkquality?: number;
  power?: number;

  // Dual switch states
  state_left?: 'ON' | 'OFF';
  state_right?: 'ON' | 'OFF';

  // RGB strip states
  color?: { r: number; g: number; b: number };

  // Curtain states
  position?: number; // 0-100

  [key: string]: unknown;
}

export interface Device {
  id: string;
  name: string;
  room: string;
  type: DeviceType;
  topic: string;
  canvasPosition: { x: number; y: number };
  icon: string;
  state?: DeviceState;
}

export interface DeviceConfig {
  id: string;
  name: string;
  room: string;
  type: DeviceType;
  topic: string;
  canvasPosition: { x: number; y: number };
  icon: string;
}

// ============================================
// Camera Types (Frigate)
// ============================================
export interface Camera {
  name: string;
  status: 'online' | 'offline';
  fps: number;
  width: number;
  height: number;
  detection_enabled: boolean;
  zones: string[];
}

export interface CameraEvent {
  id: string;
  camera: string;
  label: string;
  score: number;
  zone?: string;
  start_time: number;
  end_time?: number;
  has_snapshot: boolean;
  has_clip: boolean;
  thumbnail?: string;
}

export interface CameraDetail extends Camera {
  recent_events: CameraEvent[];
  detection_stats: {
    hour: number;
    count: number;
  }[];
}

// ============================================
// AI Chat Types
// ============================================
export type AIModel = 'sonnet' | 'opus' | 'haiku';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  streaming?: boolean;
}

export interface ChatSession {
  session_id: string | null;
  model: AIModel;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatHistory {
  [category: string]: ChatSession;
}

export interface AIChatState {
  chats: ChatHistory;
  selectedModel: AIModel;
  isStreaming: boolean;
  currentStreamContent: string;
  inputPrompt: string;
  sendMessage: (category: CategoryId, message: string) => void;
  setModel: (model: AIModel) => void;
  clearHistory: (category: CategoryId) => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamContent: (content: string) => void;
  finalizeMessage: (category: CategoryId, content: string) => void;
  setSessionId: (category: CategoryId, sessionId: string) => void;
  setInputPrompt: (prompt: string) => void;
  clearInputPrompt: () => void;
}

// ============================================
// API Types
// ============================================
export interface APIError {
  detail: string;
  status_code: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

// ============================================
// SSE Types
// ============================================
export interface SSEEvent {
  type: 'system' | 'content' | 'error' | 'done';
  data: string;
  session_id?: string;
}

// ============================================
// Config Types
// ============================================
export interface ServerConfig {
  id: string;
  displayName: string;
  description: string;
  color: string;
  aiHooks?: {
    quickPrompts: {
      label: string;
      prompt: string;
      confirm?: boolean;
    }[];
  };
  chartHooks?: {
    cpu?: { aiPrompt: string };
    memory?: { aiPrompt: string };
    network?: { aiPrompt: string };
  };
}

export interface AIContext {
  cwd: string;
  systemPrompt: string;
}

export interface AIContexts {
  [key: string]: AIContext | undefined;
}
