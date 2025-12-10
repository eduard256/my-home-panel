import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Server } from 'lucide-react';
import { cn, formatBytes, formatUptime, calculatePercent } from '@/lib/utils';
import { useServers, useAllVMs, useAnimatedValue } from '@/hooks';
import { useNavigationStore } from '@/stores';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/charts';
import type { VM } from '@/types';

/**
 * Animated percentage display component
 */
function AnimatedPercent({ value, className }: { value: number; className?: string }) {
  const animatedValue = useAnimatedValue(value, 900, 0.3);
  return <span className={className}>{animatedValue.toFixed(0)}%</span>;
}

/**
 * Animated progress bar component
 */
function AnimatedProgress({ value, className }: { value: number; className?: string }) {
  const animatedValue = useAnimatedValue(value, 900, 0.3);
  return <Progress value={animatedValue} className={className} />;
}

type VMFilter = 'all' | 'qemu' | 'lxc' | 'running' | 'stopped';

const FILTERS: { value: VMFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'qemu', label: 'VM' },
  { value: 'lxc', label: 'CT' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
];

/**
 * VM/CT Card component
 */
function VMCard({ vm, serverId }: { vm: VM; serverId: string }) {
  const { openDetail } = useNavigationStore();

  const handleClick = () => {
    openDetail('vms', `${serverId}:${vm.vmid}:${vm.type}`);
  };

  const memoryPercent = vm.memory_percent ?? calculatePercent(vm.memory_used ?? 0, vm.memory_total ?? 1);
  const isRunning = vm.status === 'running';

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className="card p-4 cursor-pointer hover:border-white/10 transition-all"
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0',
            vm.type === 'qemu' ? 'bg-blue-500/20' : 'bg-green-500/20'
          )}
        >
          <Box
            className={cn('h-5 w-5', vm.type === 'qemu' ? 'text-blue-400' : 'text-green-400')}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white truncate">{vm.name}</h3>
            <Badge variant="secondary" className="text-[10px]">
              {vm.type.toUpperCase()} {vm.vmid}
            </Badge>
          </div>
          <p className="text-tiny text-muted">
            {vm.ip || 'No IP assigned'}
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'status-dot',
              isRunning ? 'status-dot-online' : 'status-dot-offline'
            )}
          />
          <span className={cn('text-sm', isRunning ? 'text-success' : 'text-muted')}>
            {vm.status}
          </span>
        </div>
      </div>

      {/* Metrics (only for running VMs) */}
      {isRunning && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          {/* CPU Mini Sparkline */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-tiny text-muted">CPU</span>
              <AnimatedPercent value={vm.cpu_percent ?? (vm.cpu ?? 0) * 100} className="text-tiny text-white" />
            </div>
            <Sparkline
              data={[vm.cpu_percent ?? (vm.cpu ?? 0) * 100]}
              color="#9b87f5"
              height={20}
              showArea={false}
            />
          </div>

          {/* RAM Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-tiny text-muted">RAM</span>
              <span className="text-tiny text-white">
                {formatBytes(vm.memory_used ?? 0, 0)}
              </span>
            </div>
            <AnimatedProgress value={memoryPercent} className="h-1.5" />
          </div>

          {/* Uptime */}
          <div className="text-right">
            <span className="text-tiny text-muted">Uptime</span>
            <p className="text-tiny text-white">{formatUptime(vm.uptime ?? 0)}</p>
          </div>
        </div>
      )}

      {/* Status indicator strip */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1 rounded-l-card',
          isRunning ? 'bg-success' : 'bg-muted'
        )}
      />
    </motion.div>
  );
}

/**
 * VM Card Skeleton
 */
function VMCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Server Group component
 */
function ServerGroup({
  serverId,
  serverName,
  vms,
  filter,
}: {
  serverId: string;
  serverName: string;
  vms: VM[];
  filter: VMFilter;
}) {
  // Filter VMs
  const filteredVMs = useMemo(() => {
    return vms
      .filter((vm) => {
        // Skip null/undefined entries
        if (!vm) return false;
        // Hide "example" VMs
        if (vm.name.toLowerCase().includes('example')) return false;

        switch (filter) {
          case 'qemu':
            return vm.type === 'qemu';
          case 'lxc':
            return vm.type === 'lxc';
          case 'running':
            return vm.status === 'running';
          case 'stopped':
            return vm.status === 'stopped';
          default:
            return true;
        }
      })
      .sort((a, b) => {
        // Sort running first, then by name
        if (a.status !== b.status) {
          return a.status === 'running' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [vms, filter]);

  if (filteredVMs.length === 0) return null;

  const vmCount = filteredVMs.filter((v) => v.type === 'qemu').length;
  const ctCount = filteredVMs.filter((v) => v.type === 'lxc').length;

  return (
    <div className="mb-6 last:mb-0">
      {/* Group Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Server className="h-4 w-4 text-muted" />
        <h3 className="text-sm font-semibold text-white">{serverName}</h3>
        <span className="text-tiny text-muted">
          {vmCount > 0 && `${vmCount} VM`}
          {vmCount > 0 && ctCount > 0 && ', '}
          {ctCount > 0 && `${ctCount} CT`}
        </span>
      </div>

      {/* VM Cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredVMs.map((vm, index) => (
            <motion.div
              key={`${serverId}-${vm.vmid}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
            >
              <VMCard vm={vm} serverId={serverId} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * VMsSection - Main VM/CT list view
 */
export function VMsSection() {
  const [filter, setFilter] = useState<VMFilter>('all');
  const { data: servers, isLoading: serversLoading } = useServers();
  const serverIds = servers?.map((s) => s.id) || [];
  const { data: allVMs, isLoading: vmsLoading } = useAllVMs(serverIds);

  const isLoading = serversLoading || vmsLoading;

  // Get server name by ID
  const getServerName = (serverId: string) => {
    const server = servers?.find((s) => s.id === serverId);
    return server ? `${server.name} (${server.node})` : serverId;
  };

  // Calculate totals
  const totals = useMemo(() => {
    if (!allVMs) return { total: 0, running: 0, vm: 0, ct: 0 };

    let total = 0;
    let running = 0;
    let vm = 0;
    let ct = 0;

    allVMs.forEach(({ vms }) => {
      vms.forEach((v) => {
        if (!v) return; // Skip null/undefined entries
        if (!v.name.toLowerCase().includes('example')) {
          total++;
          if (v.status === 'running') running++;
          if (v.type === 'qemu') vm++;
          else ct++;
        }
      });
    });

    return { total, running, vm, ct };
  }, [allVMs]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="text-h2 font-semibold text-white">VM / CT</h2>
        <p className="text-sm text-muted mt-1">
          {isLoading ? 'Loading...' : `${totals.running} running of ${totals.total} total`}
        </p>

        {/* Filters */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.value)}
              className={cn(
                'h-8 px-3',
                filter === f.value && 'bg-primary hover:bg-primary-dark'
              )}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
              <VMCardSkeleton />
              <VMCardSkeleton />
              <VMCardSkeleton />
            </div>
          ) : allVMs && allVMs.length > 0 ? (
            allVMs.map(({ serverId, vms }) => (
              <ServerGroup
                key={serverId}
                serverId={serverId}
                serverName={getServerName(serverId)}
                vms={vms}
                filter={filter}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Box className="h-12 w-12 text-muted mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No VMs or CTs found</h3>
              <p className="text-sm text-muted">
                Create virtual machines or containers in Proxmox to see them here.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
