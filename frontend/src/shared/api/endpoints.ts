import apiClient from './client';
import type {
  LoginResponse,
  ProxmoxServer,
  VM,
  Camera,
  CameraEvent,
  FrigateStats,
  Automation,
  AutomationLog,
  ServerMetrics,
  SmartDevice,
  Room,
} from '@/shared/types';

// Auth
export const auth = {
  login: async (token: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', { token });
    return response.data;
  },
};

// Proxmox
export const proxmox = {
  getServers: async (): Promise<{ servers: ProxmoxServer[]; total: number }> => {
    const response = await apiClient.get('/proxmox/servers');
    return response.data;
  },

  getServer: async (serverId: string): Promise<ProxmoxServer> => {
    const response = await apiClient.get(`/proxmox/servers/${serverId}`);
    return response.data;
  },

  getServerVMs: async (serverId: string): Promise<{ vms: VM[]; total: number; running: number; stopped: number }> => {
    const response = await apiClient.get(`/proxmox/servers/${serverId}/vms`);
    return response.data;
  },

  getVM: async (serverId: string, vmid: number, vmType: 'qemu' | 'lxc' = 'qemu'): Promise<VM> => {
    const response = await apiClient.get(`/proxmox/servers/${serverId}/vm/${vmid}`, {
      params: { vm_type: vmType },
    });
    return response.data;
  },

  vmAction: async (
    serverId: string,
    vmid: number,
    action: 'start' | 'stop' | 'shutdown' | 'restart' | 'reset' | 'suspend' | 'resume',
    vmType: 'qemu' | 'lxc' = 'qemu'
  ): Promise<{ success: boolean; action: string; message: string }> => {
    const response = await apiClient.post(`/proxmox/servers/${serverId}/vm/${vmid}/${action}`, null, {
      params: { vm_type: vmType },
    });
    return response.data;
  },
};

// Frigate
export const frigate = {
  getCameras: async (): Promise<{ cameras: Camera[]; total: number }> => {
    const response = await apiClient.get('/frigate/cameras');
    return response.data;
  },

  getCamera: async (cameraName: string): Promise<Camera> => {
    const response = await apiClient.get(`/frigate/cameras/${cameraName}`);
    return response.data;
  },

  getCameraEvents: async (cameraName: string): Promise<{ events: CameraEvent[]; total: number }> => {
    const response = await apiClient.get(`/frigate/cameras/${cameraName}/events`);
    return response.data;
  },

  getSnapshotUrl: (cameraName: string, quality = 70, height?: number): string => {
    const params = new URLSearchParams({ quality: quality.toString() });
    if (height) params.append('height', height.toString());
    return `/api/frigate/cameras/${cameraName}/snapshot?${params}`;
  },

  getEvents: async (params?: {
    limit?: number;
    camera?: string;
    label?: string;
  }): Promise<{ events: CameraEvent[]; total: number }> => {
    const response = await apiClient.get('/frigate/events', { params });
    return response.data;
  },

  getStats: async (): Promise<FrigateStats> => {
    const response = await apiClient.get('/frigate/stats');
    return response.data;
  },
};

// Automations
export const automations = {
  getAll: async (): Promise<{ automations: Automation[]; total: number; running: number; stopped: number }> => {
    const response = await apiClient.get('/automations');
    return response.data;
  },

  getOne: async (id: string): Promise<Automation> => {
    const response = await apiClient.get(`/automations/${id}`);
    return response.data;
  },

  getLogs: async (id: string): Promise<{ logs: AutomationLog[] }> => {
    const response = await apiClient.get(`/automations/${id}/logs`);
    return response.data;
  },

  toggle: async (id: string, enabled: boolean): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/automations/${id}/toggle`, { enabled });
    return response.data;
  },

  trigger: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/automations/${id}/trigger`);
    return response.data;
  },

  action: async (
    name: string,
    action: 'start' | 'stop' | 'restart'
  ): Promise<{ success: boolean; action: string; message: string }> => {
    const response = await apiClient.post(`/automations/${name}/${action}`);
    return response.data;
  },

  getLogsStreamUrl: (name: string, tail = 100): string => {
    const token = localStorage.getItem('auth_token');
    return `/api/automations/${name}/logs?tail=${tail}${token ? `&token=${token}` : ''}`;
  },
};

// Smart Home
export const smarthome = {
  getRooms: async (): Promise<{ rooms: Room[] }> => {
    const response = await apiClient.get('/smarthome/rooms');
    return response.data;
  },

  getDevices: async (): Promise<{ devices: SmartDevice[] }> => {
    const response = await apiClient.get('/smarthome/devices');
    return response.data;
  },

  getDevice: async (deviceId: string): Promise<SmartDevice> => {
    const response = await apiClient.get(`/smarthome/devices/${deviceId}`);
    return response.data;
  },

  toggleDevice: async (deviceId: string, on: boolean): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/smarthome/devices/${deviceId}/toggle`, { on });
    return response.data;
  },

  setDeviceState: async (deviceId: string, state: Record<string, unknown>): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/smarthome/devices/${deviceId}/state`, state);
    return response.data;
  },
};

// AI
export interface AIChatRequest {
  prompt: string;
  cwd: string;
  model?: 'sonnet' | 'opus' | 'haiku';
  session_id?: string;
  system_prompt?: string;
  append_system_prompt?: string;
}

export const ai = {
  getHealth: async (): Promise<{ status: string; claude_path: string; claude_version: string }> => {
    const response = await apiClient.get('/ai/health');
    return response.data;
  },

  getProcesses: async (): Promise<{
    processes: Array<{
      process_id: string;
      cwd: string;
      model: string;
      started_at: string;
      session_id: string | null;
    }>;
    count: number;
  }> => {
    const response = await apiClient.get('/ai/processes');
    return response.data;
  },

  getChatUrl: (): string => '/api/ai/chat',

  startChat: async (request: AIChatRequest): Promise<Response> => {
    const token = localStorage.getItem('auth_token');
    return fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(request),
    });
  },

  cancelChat: async (processId: string): Promise<{ status: string; process_id: string }> => {
    const response = await apiClient.delete(`/ai/chat/${processId}`);
    return response.data;
  },
};

// Metrics
export const metrics = {
  getServerMetrics: async (
    serverId: string,
    timeRange: '1h' | '6h' | '24h' | '7d' | '30d' = '1h',
    limit = 1000
  ): Promise<ServerMetrics> => {
    const response = await apiClient.get(`/metrics/server/${serverId}`, {
      params: { time_range: timeRange, limit },
    });
    return response.data;
  },

  getVMMetrics: async (
    vmId: string,
    timeRange: '1h' | '6h' | '24h' | '7d' | '30d' = '1h',
    limit = 1000
  ): Promise<ServerMetrics> => {
    const response = await apiClient.get(`/metrics/vm/${vmId}`, {
      params: { time_range: timeRange, limit },
    });
    return response.data;
  },
};

// Health
export const health = {
  check: async (): Promise<{
    status: string;
    version: string;
    environment: string;
    uptime_seconds: number;
    timestamp: string;
  }> => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};
