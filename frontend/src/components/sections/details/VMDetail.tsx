import { useState } from 'react';
import {
  Box,
  X,
  ChevronRight,
  Play,
  Square,
  RefreshCw,
  Terminal,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
} from 'lucide-react';
import { formatBytes, formatUptime } from '@/lib/utils';
import { useVM, useVMMetrics, useVMAction, useAnimatedValue } from '@/hooks';
import { useNavigationStore } from '@/stores';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

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
import { LineChart, Sparkline } from '@/components/charts';
import type { TimeRange } from '@/types';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
];

/**
 * VMDetail - Detailed view of a VM/CT with metrics
 */
export function VMDetail({ id }: { id: string }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);

  const { closeBlock3 } = useNavigationStore();

  // Parse ID: "serverId:vmid:type"
  const [serverId, vmidStr, vmType] = id.split(':');
  const vmid = parseInt(vmidStr, 10);

  const { data: vm, isLoading } = useVM(serverId, vmid, vmType);
  const { data: metrics } = useVMMetrics(serverId, vmid, timeRange);
  const { mutate: vmAction, isPending: isActionPending } = useVMAction();

  const handleAction = (action: string) => {
    vmAction({ serverId, vmid, action });
    setConfirmDialog(null);
  };

  const handleOpenConsole = () => {
    // Open noVNC console (requires Proxmox setup)
    window.open(
      `https://${serverId}:8006/?console=${vmType}&vmid=${vmid}`,
      '_blank'
    );
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
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <Skeleton className="h-[100px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!vm) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <Box className="h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">VM not found</h3>
        <p className="text-sm text-muted">The requested VM/CT could not be loaded.</p>
      </div>
    );
  }

  const memoryPercent = vm.memory_percent ?? ((vm.memory_used ?? 0) / (vm.memory_total ?? 1) * 100);
  const diskPercent = vm.disk_used && vm.disk_total ? (vm.disk_used / vm.disk_total * 100) : 0;
  const isRunning = vm.status === 'running';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>VM/CT</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">{vm.name}</span>
          </div>

          <Button variant="ghost" size="icon" onClick={closeBlock3}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Status & Type */}
        <div className="flex items-center gap-3 mt-3">
          <Badge variant={vm.type === 'qemu' ? 'default' : 'success'}>
            {vm.type.toUpperCase()} {vm.vmid}
          </Badge>
          <Badge variant={isRunning ? 'success' : 'destructive'}>{vm.status}</Badge>
          {vm.ip && <span className="text-sm text-muted">{vm.ip}</span>}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Time Range Selector */}
          <div className="flex gap-2">
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

          {/* CPU Chart */}
          {isRunning && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                CPU Usage
              </h3>
              <LineChart
                series={[
                  {
                    name: 'CPU',
                    data: metrics?.cpu || [vm.cpu_percent ?? (vm.cpu ?? 0) * 100],
                    color: '#9b87f5',
                  },
                ]}
                timestamps={metrics?.timestamps}
                height={200}
                yAxisMax={100}
              />
            </div>
          )}

          {/* Memory & Disk */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <MemoryStick className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-semibold text-white">Memory</span>
              </div>
              <AnimatedProgress value={memoryPercent} className="h-2 mb-2" />
              <div className="text-sm text-muted">
                {formatBytes(vm.memory_used ?? 0)} / {formatBytes(vm.memory_total ?? 0)}
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="h-4 w-4 text-green-400" />
                <span className="text-sm font-semibold text-white">Disk</span>
              </div>
              <AnimatedProgress value={diskPercent} className="h-2 mb-2" />
              <div className="text-sm text-muted">
                {formatBytes(vm.disk_used ?? 0)} / {formatBytes(vm.disk_total ?? 0)}
              </div>
            </div>
          </div>

          {/* Disk I/O */}
          {isRunning && metrics?.disk_read && metrics.disk_read.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Disk I/O
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-tiny text-muted">Read</span>
                    <span className="text-tiny text-cyan-400">
                      {formatBytes(metrics.disk_read[metrics.disk_read.length - 1] || 0)}
                    </span>
                  </div>
                  <Sparkline data={metrics.disk_read} color="#22d3ee" height={50} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-tiny text-muted">Write</span>
                    <span className="text-tiny text-orange-400">
                      {formatBytes((metrics.disk_write || [])[metrics.disk_write?.length - 1] || 0)}
                    </span>
                  </div>
                  <Sparkline data={metrics.disk_write || []} color="#fb923c" height={50} />
                </div>
              </div>
            </div>
          )}

          {/* Network I/O */}
          {isRunning && metrics?.network_in && metrics.network_in.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Network className="h-4 w-4" />
                Network I/O
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-tiny text-muted">IN</span>
                    <span className="text-tiny text-cyan-400">
                      {formatBytes(metrics.network_in[metrics.network_in.length - 1] || 0)}
                    </span>
                  </div>
                  <Sparkline data={metrics.network_in} color="#22d3ee" height={50} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-tiny text-muted">OUT</span>
                    <span className="text-tiny text-orange-400">
                      {formatBytes((metrics.network_out || [])[metrics.network_out?.length - 1] || 0)}
                    </span>
                  </div>
                  <Sparkline data={metrics.network_out || []} color="#fb923c" height={50} />
                </div>
              </div>
            </div>
          )}

          {/* Info Table */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Information</h3>
            <div className="space-y-2 text-sm">
              {vm.os && (
                <div className="flex justify-between">
                  <span className="text-muted">OS</span>
                  <span className="text-white">{vm.os}</span>
                </div>
              )}
              {vm.ip && (
                <div className="flex justify-between">
                  <span className="text-muted">IP</span>
                  <span className="text-white">{vm.ip}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Uptime</span>
                <span className="text-white">{formatUptime(vm.uptime ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">ID</span>
                <span className="text-white">{vm.vmid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Node</span>
                <span className="text-white">{vm.node}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (isRunning ? setConfirmDialog('stop') : handleAction('start'))}
              disabled={isActionPending}
            >
              {isRunning ? (
                <>
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialog('restart')}
              disabled={isActionPending || !isRunning}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Restart
            </Button>

            <Button variant="outline" size="sm" onClick={handleOpenConsole}>
              <Terminal className="h-4 w-4 mr-1" />
              Console
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog === 'stop'
                ? 'Stop VM'
                : confirmDialog === 'restart'
                ? 'Restart VM'
                : 'Delete VM'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmDialog} {vm.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog === 'delete' ? 'destructive' : 'default'}
              onClick={() => handleAction(confirmDialog || 'stop')}
            >
              {confirmDialog === 'stop'
                ? 'Stop'
                : confirmDialog === 'restart'
                ? 'Restart'
                : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
