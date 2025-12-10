import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertCircle, CheckCircle, MinusCircle, Container } from 'lucide-react';
import { cn, formatUptime } from '@/lib/utils';
import { useAutomations, useAutomationMetrics } from '@/hooks';
import { useNavigationStore } from '@/stores';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Heatmap } from '@/components/charts';
import type { Automation, HealthStatus } from '@/types';

/**
 * Get health badge variant
 */
function getHealthVariant(status: HealthStatus): 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'offline':
      return 'destructive';
  }
}

/**
 * Health Icon component
 */
function HealthIcon({ status }: { status: HealthStatus }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'degraded':
      return <AlertCircle className="h-4 w-4 text-warning" />;
    case 'offline':
      return <MinusCircle className="h-4 w-4 text-destructive" />;
  }
}

/**
 * Automation Card component
 */
function AutomationCard({ automation }: { automation: Automation }) {
  const { openDetail } = useNavigationStore();
  const { data: metrics } = useAutomationMetrics(automation.name, '24h');

  const handleClick = () => {
    openDetail('automations', automation.name);
  };

  // Generate hourly trigger data for heatmap
  const hourlyTriggers = useMemo(() => {
    if (!metrics?.triggers) {
      return Array(24).fill(0);
    }
    // Assuming metrics has hourly data
    return metrics.triggers.slice(-24);
  }, [metrics]);

  const triggersToday = automation.mqtt?.status?.triggers_count || 0;
  const errorsCount = automation.errors_count || 0;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className="card p-5 cursor-pointer hover:border-white/10 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/20">
            <Zap className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{automation.name}</h3>
            {automation.description && (
              <p className="text-tiny text-muted">{automation.description}</p>
            )}
          </div>
        </div>

        <Badge variant={getHealthVariant(automation.health.overall)}>
          <HealthIcon status={automation.health.overall} />
          <span className="ml-1 capitalize">{automation.health.overall}</span>
        </Badge>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-4">
        <div>
          <span className="text-tiny text-muted block">Triggers today</span>
          <span className="text-xl font-bold text-white">{triggersToday}</span>
        </div>
        {errorsCount > 0 && (
          <div>
            <span className="text-tiny text-muted block">Errors</span>
            <span className="text-xl font-bold text-destructive">{errorsCount}</span>
          </div>
        )}
      </div>

      {/* 24-hour Heatmap */}
      <div className="mb-4">
        <span className="text-tiny text-muted block mb-2">Activity (24h)</span>
        <Heatmap data={hourlyTriggers} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm border-t border-white/5 pt-4">
        <div className="flex items-center gap-2">
          <Container className="h-4 w-4 text-muted" />
          <span
            className={cn(
              automation.container.status === 'running' ? 'text-success' : 'text-muted'
            )}
          >
            {automation.container.status}
          </span>
        </div>
        <span className="text-muted">
          Uptime: {formatUptime(automation.container.uptime_seconds)}
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Automation Card Skeleton
 */
function AutomationCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="flex items-center gap-6 mb-4">
        <div>
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>

      <div className="mb-4">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

/**
 * Room Group component
 */
function RoomGroup({
  room,
  automations,
}: {
  room: string;
  automations: Automation[];
}) {
  return (
    <div className="mb-6 last:mb-0">
      {/* Group Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">{room}</h3>
        <span className="text-tiny text-muted">({automations.length})</span>
      </div>

      {/* Automation Cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {automations.map((automation, index) => (
            <motion.div
              key={automation.name || `automation-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <AutomationCard automation={automation} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * AutomationsSection - Main automations list view
 */
export function AutomationsSection() {
  const { data: automations, isLoading, error } = useAutomations();

  // Group automations by room
  const groupedAutomations = useMemo(() => {
    if (!automations) return {};

    const groups: Record<string, Automation[]> = {};

    automations.forEach((automation) => {
      const room = automation.room || 'Other';
      if (!groups[room]) {
        groups[room] = [];
      }
      groups[room].push(automation);
    });

    // Sort groups alphabetically, with "Other" at the end
    const sortedGroups: Record<string, Automation[]> = {};
    const keys = Object.keys(groups).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });

    keys.forEach((key) => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [automations]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!automations) return { total: 0, healthy: 0, running: 0 };

    return {
      total: automations.length,
      healthy: automations.filter((a) => a.health.overall === 'healthy').length,
      running: automations.filter((a) => a.container.status === 'running').length,
    };
  }, [automations]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Zap className="h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Failed to load automations</h3>
        <p className="text-sm text-muted">Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="text-h2 font-semibold text-white">Automations</h2>
        <p className="text-sm text-muted mt-1">
          {isLoading
            ? 'Loading...'
            : `${stats.healthy} healthy, ${stats.running} running of ${stats.total} total`}
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Skeleton className="h-4 w-24" />
              </div>
              <AutomationCardSkeleton />
              <AutomationCardSkeleton />
            </div>
          ) : automations && automations.length > 0 ? (
            Object.entries(groupedAutomations).map(([room, roomAutomations]) => (
              <RoomGroup key={room} room={room} automations={roomAutomations} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="h-12 w-12 text-muted mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No automations found</h3>
              <p className="text-sm text-muted">
                Add automation containers to see them here.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
