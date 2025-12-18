import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { api, endpoints } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type {
  Automation,
  AutomationDetail,
  AutomationMetrics,
  AutomationAPIResponse,
  AutomationListAPIResponse,
  TimeRange
} from '@/types';
import { toast } from 'sonner';

/**
 * Transform API response to frontend Automation type
 */
function transformAutomation(raw: AutomationAPIResponse): Automation {
  // Extract room from automation_name (e.g., "main/vadim-bedroom/bed-light" -> "main/vadim-bedroom")
  const nameParts = raw.automation_name.split('/');
  const room = nameParts.length > 1
    ? nameParts.slice(0, -1).join('/')
    : 'Other';

  return {
    name: raw.automation_name,
    container_name: raw.container_name,
    description: raw.mqtt?.ready?.description || null,
    room,
    health: {
      overall: raw.health.overall,
      docker_running: raw.health.docker_running,
      mqtt_responding: raw.health.mqtt_responding,
    },
    container: {
      id: raw.container.id,
      status: raw.container.status,
      image: raw.container.image,
      uptime_seconds: raw.container.uptime_seconds || 0,
    },
    mqtt: {
      status: raw.mqtt?.status ? {
        status: raw.mqtt.status.status || 'unknown',
        uptime: raw.mqtt.status.uptime || 0,
        triggers_count: raw.mqtt.status.triggers_count || 0,
        errors_count: raw.mqtt.status.errors_count || 0,
        last_trigger: raw.mqtt.status.last_trigger,
      } : null,
      description: raw.mqtt?.ready?.description || null,
      version: raw.mqtt?.ready?.version || null,
    },
    errors_count: raw.mqtt?.status?.errors_count || 0,
  };
}

/**
 * Fetch all automations
 */
export function useAutomations() {
  return useQuery<Automation[]>({
    queryKey: ['automations'],
    queryFn: async () => {
      const response = await api.get<AutomationListAPIResponse>(endpoints.automations.list);
      const automations = response.data.automations || [];
      return automations
        .filter(a => a.automation_name !== 'monitor') // Hide monitor service
        .map(transformAutomation);
    },
    staleTime: 0,
    refetchInterval: 1000, // Poll every second
  });
}

/**
 * Fetch single automation detail
 */
export function useAutomation(name: string) {
  return useQuery<AutomationDetail>({
    queryKey: ['automation', name],
    queryFn: async () => {
      const response = await api.get<AutomationAPIResponse>(endpoints.automations.detail(name));
      return transformAutomation(response.data) as AutomationDetail;
    },
    enabled: !!name,
    staleTime: 0,
    refetchInterval: 1000, // Poll every second
  });
}

/**
 * Fetch automation metrics
 */
export function useAutomationMetrics(name: string, timeRange: TimeRange = '24h') {
  return useQuery<AutomationMetrics>({
    queryKey: ['automation-metrics', name, timeRange],
    queryFn: async () => {
      const response = await api.get(endpoints.automations.metrics(name), {
        params: { time_range: timeRange },
      });
      return response.data;
    },
    enabled: !!name,
    staleTime: 0,
    refetchInterval: 5000, // Poll every 5 seconds for metrics
  });
}

/**
 * Automation action mutation (start, stop, restart)
 */
export function useAutomationAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, action }: { name: string; action: string }) => {
      const response = await api.post(endpoints.automations.action(name, action));
      return response.data;
    },
    onSuccess: (_, { name, action }) => {
      toast.success(`Automation ${name} ${action} initiated`);
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['automation', name] });
    },
    onError: (error: { detail?: string }) => {
      toast.error(error.detail || 'Failed to perform action');
    },
  });
}

/**
 * Fetch automation logs via SSE using fetch + ReadableStream
 * Returns logs array that updates in real-time
 */
export function useAutomationLogs(name: string, enabled: boolean = true) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    // Clear logs when name changes or disabled
    setLogs([]);
    setIsConnected(false);

    if (!name || !enabled || !token) {
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchLogs = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const url = `${baseUrl}/api/automations/${encodeURIComponent(name)}/logs?lines=100`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          console.error('Failed to connect to logs stream');
          return;
        }

        setIsConnected(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const logLine = line.slice(5).trim();
              if (logLine) {
                setLogs(prev => [...prev, logLine]);
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('SSE error:', error);
        }
      } finally {
        setIsConnected(false);
      }
    };

    fetchLogs();

    return () => {
      abortController.abort();
      abortControllerRef.current = null;
    };
  }, [name, enabled, token]);

  return { data: logs, isConnected };
}
