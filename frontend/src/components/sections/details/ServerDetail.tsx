import { useState } from 'react';
import {
  Server,
  X,
  ChevronRight,
  RefreshCw,
  Power,
  ExternalLink,
  MessageSquare,
  HardDrive,
  Clock,
} from 'lucide-react';
import { cn, formatBytes, formatUptime } from '@/lib/utils';
import { useServer, useServerMetrics, useRestartServer, useShutdownServer, useAnimatedValue } from '@/hooks';
import { useNavigationStore } from '@/stores';
import { getServerConfig } from '@/config/servers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Animated percentage display
 */
function AnimatedPercent({ value }: { value: number }) {
  const animatedValue = useAnimatedValue(value, 900, 0.3);
  return <>{animatedValue.toFixed(1)}%</>;
}

/**
 * Animated progress bar
 */
function AnimatedProgress({ value, className }: { value: number; className?: string }) {
  const animatedValue = useAnimatedValue(value, 900, 0.3);
  return <Progress value={animatedValue} className={className} />;
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LineChart } from '@/components/charts';
import type { TimeRange } from '@/types';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

/**
 * ServerDetail - Detailed view of a server with metrics
 */
export function ServerDetail({ id }: { id: string }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [confirmDialog, setConfirmDialog] = useState<'restart' | 'shutdown' | null>(null);

  const { closeBlock3, openAI } = useNavigationStore();
  const { data: server, isLoading } = useServer(id);
  const { data: metrics } = useServerMetrics(id, timeRange);
  const { mutate: restartServer, isPending: isRestarting } = useRestartServer();
  const { mutate: shutdownServer, isPending: isShuttingDown } = useShutdownServer();

  const serverConfig = getServerConfig(id);

  const handleRestart = () => {
    restartServer(id);
    setConfirmDialog(null);
  };

  const handleShutdown = () => {
    shutdownServer(id);
    setConfirmDialog(null);
  };

  const handleOpenProxmox = () => {
    if (server?.ip) {
      window.open(`https://${server.ip}:8006`, '_blank');
    }
  };

  const handleAIClick = (prompt?: string) => {
    if (prompt) {
      sessionStorage.setItem('pending_ai_prompt', prompt);
    }
    openAI();
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-[250px] w-full rounded-xl" />
          <Skeleton className="h-[150px] w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <Server className="h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Server not found</h3>
        <p className="text-sm text-muted">The requested server could not be loaded.</p>
      </div>
    );
  }

  const memoryPercent = (server.memory_used / server.memory_total) * 100;
  const diskPercent = (server.disk_used / server.disk_total) * 100;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Servers</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">{server.name}</span>
          </div>

          <Button variant="ghost" size="icon" onClick={closeBlock3}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 mt-3">
          <div
            className={cn(
              'status-dot',
              server.online ? 'status-dot-online' : 'status-dot-offline'
            )}
          />
          <Badge variant={server.online ? 'success' : 'destructive'}>
            {server.online ? 'online' : 'offline'}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Time Range Selector */}
          <div className="flex gap-2 flex-wrap">
            {TIME_RANGES.map((range) => (
              <Button
                key={range.value}
                variant={timeRange === range.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range.value)}
                className="h-8 px-3"
              >
                {range.label}
              </Button>
            ))}
          </div>

          {/* CPU & RAM Chart */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-4">CPU & Memory</h3>
            <LineChart
              series={[
                {
                  name: 'CPU',
                  data: metrics?.cpu_percent || [server.cpu ?? 0],
                  color: '#9b87f5',
                },
                {
                  name: 'RAM',
                  data:
                    metrics?.memory_used?.map((m, i) =>
                      (m / (metrics.memory_total?.[i] || 1)) * 100
                    ) || [memoryPercent],
                  color: '#3b82f6',
                },
              ]}
              timestamps={metrics?.timestamps}
              height={250}
              yAxisMax={100}
              onClick={() =>
                handleAIClick(
                  serverConfig?.chartHooks?.cpu?.aiPrompt ||
                    `Analyze CPU and RAM usage for ${server.name} over the selected time period.`
                )
              }
            />
          </div>

          {/* Network Chart */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Network Traffic</h3>
            <LineChart
              series={[
                {
                  name: 'Download',
                  data: metrics?.network_in?.map(v => v ?? 0) || [server.network_in ?? 0],
                  color: '#22d3ee',
                },
                {
                  name: 'Upload',
                  data: metrics?.network_out?.map(v => v ?? 0) || [server.network_out ?? 0],
                  color: '#fb923c',
                },
              ]}
              timestamps={metrics?.timestamps}
              height={150}
              yAxisFormat={(v) => formatBytes(v, 0)}
              onClick={() =>
                handleAIClick(
                  serverConfig?.chartHooks?.network?.aiPrompt ||
                    `Analyze network traffic for ${server.name}.`
                )
              }
            />
          </div>

          {/* Disk Usage */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Disk Usage
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-muted">Main</span>
                  <span className="text-white">
                    {formatBytes(server.disk_used)} / {formatBytes(server.disk_total)} (
                    <AnimatedPercent value={diskPercent} />)
                  </span>
                </div>
                <AnimatedProgress value={diskPercent} className="h-3" />
              </div>
            </div>
          </div>

          {/* Uptime */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted" />
                <span className="text-sm text-muted">Uptime</span>
              </div>
              <span className="text-lg font-semibold text-white">
                {formatUptime(server.uptime)}
              </span>
            </div>
          </div>

          {/* Quick Prompts */}
          {serverConfig?.aiHooks?.quickPrompts && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                {serverConfig.aiHooks.quickPrompts.map((prompt) => (
                  <Button
                    key={prompt.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAIClick(prompt.prompt)}
                  >
                    {prompt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog('restart')}
              disabled={isRestarting || !server.online}
              className="flex-1"
            >
              <RefreshCw
                className={cn('h-4 w-4 mr-2', isRestarting && 'animate-spin')}
              />
              Restart
            </Button>

            <Button
              variant="outline"
              onClick={() => setConfirmDialog('shutdown')}
              disabled={isShuttingDown || !server.online}
              className="flex-1"
            >
              <Power className="h-4 w-4 mr-2" />
              Shutdown
            </Button>

            <Button variant="outline" onClick={handleOpenProxmox} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              Proxmox
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog === 'restart' ? 'Restart Server' : 'Shutdown Server'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmDialog} {server.name}? This action may
              affect running VMs and services.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog === 'shutdown' ? 'destructive' : 'default'}
              onClick={confirmDialog === 'restart' ? handleRestart : handleShutdown}
            >
              {confirmDialog === 'restart' ? 'Restart' : 'Shutdown'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
