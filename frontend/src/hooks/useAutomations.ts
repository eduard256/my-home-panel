import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import type { Automation, AutomationDetail, AutomationMetrics, TimeRange } from '@/types';
import { toast } from 'sonner';

/**
 * Fetch all automations
 */
export function useAutomations() {
  return useQuery<Automation[]>({
    queryKey: ['automations'],
    queryFn: async () => {
      const response = await api.get(endpoints.automations.list);
      // API returns { automations: [...], total: N, running: N, stopped: N }
      return response.data.automations || response.data;
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
      const response = await api.get(endpoints.automations.detail(name));
      return response.data;
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
 * Fetch automation logs via SSE
 */
export function useAutomationLogs(name: string, enabled: boolean = true) {
  return useQuery<string[]>({
    queryKey: ['automation-logs', name],
    queryFn: async () => {
      const response = await api.get(endpoints.automations.logs(name), {
        params: { tail: 100 },
      });
      return response.data;
    },
    enabled: !!name && enabled,
    staleTime: 5000,
    refetchInterval: 5000,
  });
}
