import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import type { ServerInfo, Automation, VM } from '@/types';

/**
 * Global polling hook that runs at the App level.
 * This ensures data is always fresh regardless of which section is currently visible.
 *
 * When components mount, they will get the already-fresh data from the cache
 * instead of triggering new requests.
 */
export function useGlobalPolling() {
  // Poll servers every 30 seconds
  const { data: servers } = useQuery<ServerInfo[]>({
    queryKey: ['servers'],
    queryFn: async () => {
      console.log('[GlobalPolling] Fetching servers...', new Date().toLocaleTimeString());
      const response = await api.get(endpoints.servers.list);
      const data = response.data.servers || response.data;
      console.log('[GlobalPolling] Got servers:', data.length);
      return data;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  // Poll VMs for all servers every 30 seconds
  const serverIds = servers?.map((s) => s.id) || [];
  useQuery<{ serverId: string; vms: VM[] }[]>({
    queryKey: ['all-vms', serverIds],
    queryFn: async () => {
      const results = await Promise.all(
        serverIds.map(async (serverId) => {
          try {
            const response = await api.get(endpoints.vms.list(serverId));
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
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  // Poll automations every 60 seconds
  useQuery<Automation[]>({
    queryKey: ['automations'],
    queryFn: async () => {
      const response = await api.get(endpoints.automations.list);
      return response.data.automations || response.data;
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
  });
}

/**
 * Component that enables global polling.
 * Place this inside QueryClientProvider at the App level.
 * It renders nothing but keeps polling active.
 */
export function GlobalPollingProvider() {
  useGlobalPolling();
  return null;
}
