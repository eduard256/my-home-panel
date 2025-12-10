import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import type { ServerInfo, ServerDetail, ServerMetrics, TimeRange } from '@/types';
import { toast } from 'sonner';

/**
 * Fetch all servers
 */
export function useServers() {
  return useQuery<ServerInfo[]>({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await api.get(endpoints.servers.list);
      return response.data.servers || response.data;
    },
    staleTime: 0,
    refetchInterval: 1000, // Poll every second for real-time updates
  });
}

/**
 * Fetch single server detail
 */
export function useServer(id: string) {
  return useQuery<ServerDetail>({
    queryKey: ['server', id],
    queryFn: async () => {
      const response = await api.get(endpoints.servers.detail(id));
      return response.data;
    },
    enabled: !!id,
    staleTime: 0,
    refetchInterval: 1000, // Poll every second
  });
}

/**
 * Raw metrics data point from API
 */
interface RawMetricPoint {
  timestamp: string;
  cpu_percent: number;
  memory_used: number;
  memory_total: number;
  disk_used: number;
  disk_total: number;
  network_in: number;
  network_out: number;
  uptime: number;
}

/**
 * Fetch server metrics
 */
export function useServerMetrics(id: string, timeRange: TimeRange = '1h') {
  return useQuery<ServerMetrics>({
    queryKey: ['server-metrics', id, timeRange],
    queryFn: async () => {
      const response = await api.get(endpoints.servers.metrics(id), {
        params: { time_range: timeRange },
      });

      // Transform API response from array of objects to arrays by field
      const rawData: RawMetricPoint[] = response.data.data || [];

      // Sort by timestamp ascending (oldest first) for proper chart display
      rawData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return {
        timestamps: rawData.map((d) => d.timestamp),
        cpu_percent: rawData.map((d) => d.cpu_percent),
        memory_used: rawData.map((d) => d.memory_used),
        memory_total: rawData.map((d) => d.memory_total),
        disk_read: rawData.map(() => 0), // Not provided by API
        disk_write: rawData.map(() => 0), // Not provided by API
        network_in: rawData.map((d) => d.network_in),
        network_out: rawData.map((d) => d.network_out),
      };
    },
    enabled: !!id,
    staleTime: 0,
    refetchInterval: 1000, // Poll every second for charts
  });
}

/**
 * Restart server mutation
 */
export function useRestartServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(endpoints.servers.restart(id));
      return response.data;
    },
    onSuccess: (_, id) => {
      toast.success(`Server ${id} restart initiated`);
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['server', id] });
    },
    onError: (error: { detail?: string }) => {
      toast.error(error.detail || 'Failed to restart server');
    },
  });
}

/**
 * Shutdown server mutation
 */
export function useShutdownServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(endpoints.servers.shutdown(id));
      return response.data;
    },
    onSuccess: (_, id) => {
      toast.success(`Server ${id} shutdown initiated`);
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['server', id] });
    },
    onError: (error: { detail?: string }) => {
      toast.error(error.detail || 'Failed to shutdown server');
    },
  });
}
