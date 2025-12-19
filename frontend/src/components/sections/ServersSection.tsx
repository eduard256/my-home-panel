import { motion } from 'framer-motion';
import { Server, ArrowDownRight, ArrowUpRight, HardDrive } from 'lucide-react';
import { cn, formatBytes, formatUptime, calculatePercent } from '@/lib/utils';
import { useServers, useServerMetrics, useAnimatedValue } from '@/hooks';
import { useNavigationStore } from '@/stores';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/charts';
import type { ServerInfo } from '@/types';

/**
 * Animated percentage display component
 */
function AnimatedPercent({ value, className }: { value: number; className?: string }) {
  const animatedValue = useAnimatedValue(value, 900, 0.3);
  return <span className={className}>{animatedValue.toFixed(1)}%</span>;
}

/**
 * Animated progress bar component
 */
function AnimatedProgress({ value, className }: { value: number; className?: string }) {
  const animatedValue = useAnimatedValue(value, 900, 0.3);
  return <Progress value={animatedValue} className={className} />;
}

/**
 * Server Card component
 */
function ServerCard({ server }: { server: ServerInfo }) {
  const { openDetail } = useNavigationStore();
  const { data: metrics } = useServerMetrics(server.id, '1h');

  const handleClick = () => {
    openDetail('servers', server.id);
  };

  const memoryPercent = calculatePercent(server.memory_used, server.memory_total);
  const diskPercent = calculatePercent(server.disk_used, server.disk_total);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className="card p-5 cursor-pointer hover:border-white/10 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">
                {server.name}
              </h3>
              <span className="text-sm text-muted">({server.node})</span>
            </div>
            <p className="text-tiny text-muted">{server.ip}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              'status-dot',
              server.online ? 'status-dot-online' : 'status-dot-offline'
            )}
          />
        </div>
      </div>

      {/* Graphs Section */}
      <div className="space-y-4">
        {/* CPU Sparkline */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-tiny text-muted uppercase tracking-wider">CPU</span>
            <AnimatedPercent value={server.cpu ?? 0} className="text-sm text-white font-medium" />
          </div>
          <Sparkline
            data={metrics?.cpu_percent || [server.cpu ?? 0]}
            color="#9b87f5"
            height={50}
          />
        </div>

        {/* RAM Sparkline */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-tiny text-muted uppercase tracking-wider">RAM</span>
            <AnimatedPercent value={memoryPercent} className="text-sm text-white font-medium" />
          </div>
          <Sparkline
            data={
              metrics?.memory_used?.map((m, i) =>
                calculatePercent(m, metrics.memory_total[i] || 1)
              ) || [memoryPercent]
            }
            color="#3b82f6"
            height={50}
          />
        </div>

        {/* Disk Usage (Progress Bar) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-tiny text-muted uppercase tracking-wider flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Disk
            </span>
            <span className="text-sm text-muted">
              {formatBytes(server.disk_used)} / {formatBytes(server.disk_total)}
            </span>
          </div>
          <AnimatedProgress value={diskPercent} className="h-2" />
        </div>

        {/* Network (Mini Sparklines) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0 overflow-hidden">
            <div className="flex items-center gap-1 mb-1">
              <ArrowDownRight className="h-3 w-3 text-cyan-400" />
              <span className="text-tiny text-muted">IN</span>
            </div>
            <Sparkline
              data={metrics?.network_in || [server.network_in ?? 0]}
              color="#22d3ee"
              height={30}
              showArea={false}
            />
          </div>
          <div className="min-w-0 overflow-hidden">
            <div className="flex items-center gap-1 mb-1">
              <ArrowUpRight className="h-3 w-3 text-orange-400" />
              <span className="text-tiny text-muted">OUT</span>
            </div>
            <Sparkline
              data={metrics?.network_out || [server.network_out ?? 0]}
              color="#fb923c"
              height={30}
              showArea={false}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-sm">
        <span className="text-muted">Uptime</span>
        <span className="text-white font-medium">{formatUptime(server.uptime)}</span>
      </div>
    </motion.div>
  );
}

/**
 * Server Card Skeleton
 */
function ServerCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-[50px] w-full rounded-lg" />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-[50px] w-full rounded-lg" />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <Skeleton className="h-3 w-8 mb-1" />
            <Skeleton className="h-[30px] w-full rounded-lg" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-3 w-8 mb-1" />
            <Skeleton className="h-[30px] w-full rounded-lg" />
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

/**
 * ServersSection - Main servers list view
 */
export function ServersSection() {
  const { data: servers, isLoading, error } = useServers();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Server className="h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Failed to load servers</h3>
        <p className="text-sm text-muted">Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="text-h2 font-semibold text-white">Servers</h2>
        <p className="text-sm text-muted mt-1">
          {isLoading ? 'Loading...' : `${servers?.length || 0} server${servers?.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 [&>div>div]:!block">
        <div className="p-6 space-y-4">
          {isLoading ? (
            <>
              <ServerCardSkeleton />
              <ServerCardSkeleton />
            </>
          ) : servers && servers.length > 0 ? (
            servers.map((server, index) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ServerCard server={server} />
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Server className="h-12 w-12 text-muted mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No servers found</h3>
              <p className="text-sm text-muted">
                Add Proxmox servers to your configuration to see them here.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
