import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { APIError } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Create axios instance with default configuration
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add auth token
 */
api.interceptors.request.use(
  (config) => {
    // Token is already added via store when logged in
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<APIError>) => {
    if (error.response) {
      const status = error.response.status;

      // Handle 401 - Unauthorized
      if (status === 401) {
        // Clear auth state and redirect to login
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }

      // Handle other errors
      const apiError: APIError = {
        detail: error.response.data?.detail || 'An error occurred',
        status_code: status,
      };

      return Promise.reject(apiError);
    }

    // Network error
    if (error.request) {
      return Promise.reject({
        detail: 'Network error - please check your connection',
        status_code: 0,
      });
    }

    return Promise.reject({
      detail: error.message || 'An unexpected error occurred',
      status_code: -1,
    });
  }
);

/**
 * API endpoint helpers
 */
export const endpoints = {
  // Auth
  auth: {
    login: '/api/auth/login',
  },

  // Proxmox Servers
  servers: {
    list: '/api/proxmox/servers',
    detail: (id: string) => `/api/proxmox/servers/${id}`,
    metrics: (id: string) => `/api/metrics/server/${id}`,
    restart: (id: string) => `/api/proxmox/servers/${id}/restart`,
    shutdown: (id: string) => `/api/proxmox/servers/${id}/shutdown`,
  },

  // VMs and CTs
  vms: {
    list: (serverId: string) => `/api/proxmox/servers/${serverId}/vms`,
    detail: (serverId: string, vmid: number, vmType: string) =>
      `/api/proxmox/servers/${serverId}/vm/${vmid}?vm_type=${vmType}`,
    metrics: (serverId: string, vmid: number) =>
      `/api/metrics/vm/${serverId}/${vmid}`,
    action: (serverId: string, vmid: number, action: string) =>
      `/api/proxmox/servers/${serverId}/vm/${vmid}/${action}`,
  },

  // Automations
  automations: {
    list: '/api/automations',
    detail: (name: string) => `/api/automations/${encodeURIComponent(name)}`,
    metrics: (name: string) => `/api/metrics/automation/${encodeURIComponent(name)}`,
    logs: (name: string) => `/api/automations/${encodeURIComponent(name)}/logs`,
    action: (name: string, action: string) => `/api/automations/${encodeURIComponent(name)}/${action}`,
  },

  // MQTT / Devices
  mqtt: {
    topics: '/api/mqtt/topics',
    publish: '/api/mqtt/publish',
    stream: '/api/mqtt/stream',
    deviceMetrics: (topic: string) => `/api/metrics/device?topic=${encodeURIComponent(topic)}`,
  },

  // AI Chat
  ai: {
    chat: '/api/ai/chat',
  },
};

/**
 * SSE connection helper for MQTT stream
 */
export function createMQTTStream(onMessage: (data: unknown) => void): EventSource {
  const token = localStorage.getItem('auth_token');
  const parsedToken = token ? JSON.parse(token) : null;

  const eventSource = new EventSource(
    `${API_BASE_URL}/api/mqtt/stream?token=${parsedToken?.state?.token || ''}`
  );

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Failed to parse MQTT message:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('MQTT stream error:', error);
  };

  return eventSource;
}

/**
 * SSE connection helper for AI chat
 */
export function createAIChatStream(
  prompt: string,
  sessionId: string | null,
  cwd: string,
  model: string,
  systemPrompt: string,
  onEvent: (event: { type: string; data: string; session_id?: string }) => void,
  onError: (error: Error) => void,
  onDone: () => void
): AbortController {
  const controller = new AbortController();
  const token = localStorage.getItem('auth_token');
  const parsedToken = token ? JSON.parse(token) : null;

  const body = JSON.stringify({
    prompt,
    session_id: sessionId,
    cwd,
    model,
    append_system_prompt: systemPrompt,
  });

  fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parsedToken?.state?.token || ''}`,
    },
    body,
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();

        if (done) {
          onDone();
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onDone();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              onEvent({
                type: parsed.type || 'content',
                data: parsed.content || parsed.data || data,
                session_id: parsed.session_id,
              });
            } catch {
              // Not JSON, treat as raw content
              onEvent({
                type: 'content',
                data,
              });
            }
          } else if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            if (eventType === 'done') {
              onDone();
              return;
            }
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });

  return controller;
}

export default api;
