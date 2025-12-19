import type { ServerConfig } from '@/types';

export const SERVERS_CONFIG: Record<string, ServerConfig> = {
  nas: {
    id: 'nas',
    displayName: 'PVE-1',
    description: 'NAS Server',
    color: '#9b87f5',
    aiHooks: {
      quickPrompts: [
        {
          label: 'Check Status',
          prompt: 'Show detailed status of PVE-1 server including uptime, CPU, RAM, disk health and any potential issues.',
        },
        {
          label: 'Analyze Performance',
          prompt: 'Analyze performance metrics for PVE-1 server over the last 24 hours. Identify any anomalies or areas of concern.',
        },
        {
          label: 'Disk Health',
          prompt: 'Check disk health and storage utilization on PVE-1. Report any SMART warnings or capacity concerns.',
        },
      ],
    },
    chartHooks: {
      cpu: {
        aiPrompt: 'Analyze CPU usage for PVE-1 over the selected time period. Are there any anomalies, spikes, or patterns that need attention?',
      },
      memory: {
        aiPrompt: 'Check memory usage patterns for PVE-1. Is RAM sufficient for current workloads or should I consider adding more?',
      },
      network: {
        aiPrompt: 'Analyze network traffic patterns for PVE-1. Any unusual patterns or potential bottlenecks?',
      },
    },
  },
  smart: {
    id: 'smart',
    displayName: 'PVE-2',
    description: 'Smart Home Server',
    color: '#10b981',
    aiHooks: {
      quickPrompts: [
        {
          label: 'Check Status',
          prompt: 'Show detailed status of PVE-2 smart home server including all running services and their health.',
        },
        {
          label: 'Service Health',
          prompt: 'Check health of all smart home services running on PVE-2: Home Assistant, Zigbee2MQTT, etc.',
        },
        {
          label: 'Resource Usage',
          prompt: 'Analyze resource usage on PVE-2 and suggest optimizations if needed.',
        },
      ],
    },
    chartHooks: {
      cpu: {
        aiPrompt: 'Analyze CPU usage for PVE-2 smart home server. Check if any automation is causing high load.',
      },
      memory: {
        aiPrompt: 'Check memory usage on PVE-2. Are Home Assistant and other services running within healthy limits?',
      },
      network: {
        aiPrompt: 'Analyze network traffic on PVE-2. Check for unusual IoT device activity.',
      },
    },
  },
};

export const getServerConfig = (id: string): ServerConfig | undefined => {
  return SERVERS_CONFIG[id];
};

export const getAllServerConfigs = (): ServerConfig[] => {
  return Object.values(SERVERS_CONFIG);
};
