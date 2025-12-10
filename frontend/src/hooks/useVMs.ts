import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import type { VM, VMDetail, VMMetrics, TimeRange } from '@/types';
import { toast } from 'sonner';

/**
 * Fetch all VMs for a server
 */
export function useVMs(serverId: string) {
  return useQuery<VM[]>({
    queryKey: ['vms', serverId],
    queryFn: async () => {
      const response = await api.get(endpoints.vms.list(serverId));
      // API returns { server_id: "...", vms: [...], total: N }
      return response.data.vms || response.data;
    },
    enabled: !!serverId,
    staleTime: 0,
    refetchInterval: 1000, // Poll every second
  });
}

/**
 * Fetch VMs for all servers
 */
export function useAllVMs(serverIds: string[]) {
  return useQuery<{ serverId: string; vms: VM[] }[]>({
    queryKey: ['all-vms', serverIds],
    queryFn: async () => {
      const results = await Promise.all(
        serverIds.map(async (serverId) => {
          try {
            const response = await api.get(endpoints.vms.list(serverId));
            // API returns { server_id: "...", vms: [...], total: N }
            return { serverId, vms: response.data.vms || response.data };
          } catch (error) {
            console.error(`Failed to fetch VMs for ${serverId}:`, error);
            return { serverId, vms: [] };
          }
        })
      );
      return results;
    },
    enabled: serverIds.length > 0,
    staleTime: 0,
    refetchInterval: 1000, // Poll every second
  });
}

/**
 * Fetch single VM detail
 */
export function useVM(serverId: string, vmid: number, vmType: string) {
  return useQuery<VMDetail>({
    queryKey: ['vm', serverId, vmid],
    queryFn: async () => {
      const response = await api.get(endpoints.vms.detail(serverId, vmid, vmType));
      return response.data;
    },
    enabled: !!serverId && !!vmid,
    staleTime: 0,
    refetchInterval: 1000, // Poll every second
  });
}

/**
 * Raw VM metric point from API
 */
interface RawVMMetricPoint {
  timestamp: string;
  status: string;
  cpu_percent: number;
  memory_used: number;
  memory_total: number;
  disk_read: number;
  disk_write: number;
  network_in: number;
  network_out: number;
  uptime: number;
}

/**
 * Fetch VM metrics
 */
export function useVMMetrics(serverId: string, vmid: number, timeRange: TimeRange = '1h') {
  return useQuery<VMMetrics>({
    queryKey: ['vm-metrics', serverId, vmid, timeRange],
    queryFn: async () => {
      const response = await api.get(endpoints.vms.metrics(serverId, vmid), {
        params: { time_range: timeRange },
      });

      // Transform API response from array of objects to arrays by field
      const rawData: RawVMMetricPoint[] = response.data.data || [];

      // Sort by timestamp ascending (oldest first) for proper chart display
      rawData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return {
        timestamps: rawData.map((d) => d.timestamp),
        cpu: rawData.map((d) => d.cpu_percent ?? 0),
        memory: rawData.map((d) => d.memory_used ?? 0),
        disk_read: rawData.map((d) => d.disk_read ?? 0),
        disk_write: rawData.map((d) => d.disk_write ?? 0),
        network_in: rawData.map((d) => d.network_in ?? 0),
        network_out: rawData.map((d) => d.network_out ?? 0),
      };
    },
    enabled: !!serverId && !!vmid,
    staleTime: 0,
    refetchInterval: 1000, // Poll every second
  });
}

/**
 * VM action mutation (start, stop, restart, etc.)
 */
export function useVMAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      vmid,
      action,
    }: {
      serverId: string;
      vmid: number;
      action: string;
    }) => {
      const response = await api.post(endpoints.vms.action(serverId, vmid, action));
      return response.data;
    },
    onSuccess: (_, { serverId, vmid, action }) => {
      toast.success(`VM ${vmid} ${action} initiated`);
      queryClient.invalidateQueries({ queryKey: ['vms', serverId] });
      queryClient.invalidateQueries({ queryKey: ['vm', serverId, vmid] });
      queryClient.invalidateQueries({ queryKey: ['all-vms'] });
    },
    onError: (error: { detail?: string }) => {
      toast.error(error.detail || 'Failed to perform action');
    },
  });
}
