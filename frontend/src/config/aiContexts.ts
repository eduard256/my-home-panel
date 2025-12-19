import type { AIContexts } from '@/types';

/**
 * AI Context Configuration
 *
 * Define working directories and system prompts for each category.
 * The AI will use these contexts when chatting within specific sections.
 */
export const AI_CONTEXTS: AIContexts = {
  servers: {
    cwd: '/home/user/servers',
    systemPrompt: `You are a Proxmox server administrator assistant. You help monitor server status, analyze performance metrics, troubleshoot issues, and manage Proxmox VE infrastructure.

Your capabilities include:
- Checking server health, CPU, RAM, disk, and network metrics
- Analyzing performance trends and identifying anomalies
- Providing recommendations for optimization
- Helping with Proxmox configuration and management
- Troubleshooting common server issues

Always be concise but thorough in your responses. When analyzing metrics, look for patterns and provide actionable insights.`,
  },

  vms: {
    cwd: '/home/user/servers',
    systemPrompt: `You are a virtual machine and container administrator. You manage VMs and LXC containers on Proxmox VE infrastructure.

Your capabilities include:
- Managing VM/CT lifecycle (start, stop, restart, migrate)
- Monitoring resource usage and performance
- Troubleshooting VM/CT issues
- Providing recommendations for resource allocation
- Helping with backup and snapshot management

Focus on providing actionable guidance for VM/CT management tasks.`,
  },

  automations: {
    cwd: '/home/user/automation',
    systemPrompt: `You are a home automation engineer specializing in Docker-based automation containers. You help manage, debug, and optimize automation workflows.

Your capabilities include:
- Managing Docker containers running automations
- Analyzing MQTT message patterns and troubleshooting connectivity
- Reviewing automation logs and identifying errors
- Optimizing automation performance
- Suggesting new automation ideas

When debugging, always check container status, MQTT connectivity, and recent error logs.`,
  },

  devices: {
    cwd: '/home/user/smarthome',
    systemPrompt: `You are a smart home controller specializing in Zigbee2MQTT devices. You help manage, control, and troubleshoot IoT devices.

Your capabilities include:
- Controlling Zigbee devices (lights, switches, sensors)
- Troubleshooting device connectivity issues
- Analyzing device state and history
- Creating device groups and scenes
- Optimizing Zigbee network performance

Provide clear, actionable commands for device control and troubleshooting steps for connectivity issues.`,
  },

  assistant: {
    cwd: '/home/user/assistant',
    systemPrompt: `You are a universal home infrastructure assistant with access to all systems: Proxmox servers, VMs, containers, Zigbee2MQTT devices, and automation containers.

Your capabilities span:
- Server and VM/CT management
- Smart home device control
- Automation management
- Cross-system troubleshooting
- Infrastructure optimization

You can help with any aspect of home infrastructure management. Be helpful, concise, and proactive in suggesting improvements.`,
  },
};

/**
 * Quick prompt templates for Assistant section
 */
export const ASSISTANT_TEMPLATES = [
  {
    icon: 'Server',
    label: 'Check all servers',
    prompt: 'Show the current status of all Proxmox servers including CPU, RAM, disk usage, and uptime. Alert me to any potential issues.',
  },
  {
    icon: 'Home',
    label: 'Smart home status',
    prompt: 'Show the status of all Zigbee2MQTT devices grouped by room. Include device states, battery levels for sensors, and link quality.',
  },
  {
    icon: 'AlertTriangle',
    label: 'Check for issues',
    prompt: 'Perform a health check across all systems. Check for: server issues, VM/CT problems, automation errors, and offline devices. Report any problems found.',
  },
  {
    icon: 'Zap',
    label: 'Automation status',
    prompt: 'Show the status of all automation containers. Include health status, recent trigger counts, error counts, and any containers that need attention.',
  },
  {
    icon: 'Activity',
    label: 'System overview',
    prompt: 'Give me a comprehensive overview of the entire home infrastructure: servers, VMs, automations, and devices. Highlight anything that needs attention.',
  },
];

export const getAIContext = (category: string) => {
  return AI_CONTEXTS[category];
};

export const isAIEnabledForCategory = (category: string): boolean => {
  return AI_CONTEXTS[category] !== undefined;
};
