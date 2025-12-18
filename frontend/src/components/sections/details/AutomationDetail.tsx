import { useState } from 'react';
import {
  Zap,
  X,
  ChevronRight,
  Play,
  Square,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertCircle,
  MinusCircle,
  Container,
} from 'lucide-react';
import { cn, formatUptime, formatRelativeTime } from '@/lib/utils';
import { useAutomation, useAutomationAction, useAutomationLogs } from '@/hooks';
import { useNavigationStore } from '@/stores';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { HealthStatus } from '@/types';

/**
 * Health Icon component
 */
function HealthIcon({ status }: { status: HealthStatus }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-5 w-5 text-success" />;
    case 'degraded':
      return <AlertCircle className="h-5 w-5 text-warning" />;
    case 'offline':
    case 'unhealthy':
    default:
      return <MinusCircle className="h-5 w-5 text-destructive" />;
  }
}

/**
 * Status Badge component
 */
function StatusBadge({ status, label }: { status: HealthStatus; label: string }) {
  const variant = status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'destructive';

  return (
    <div className="card p-3 flex flex-col items-center">
      <HealthIcon status={status} />
      <span className="text-tiny text-muted mt-1">{label}</span>
      <span className={cn('text-sm font-medium capitalize', `text-${variant}`)}>{status}</span>
    </div>
  );
}

/**
 * AutomationDetail - Detailed view of an automation
 */
export function AutomationDetail({ name }: { name: string }) {
  const [showLogs, setShowLogs] = useState(false);

  const { closeBlock3 } = useNavigationStore();
  const { data: automation, isLoading } = useAutomation(name);
  const { data: logs } = useAutomationLogs(name, showLogs);
  const { mutate: automationAction, isPending: isActionPending } = useAutomationAction();

  const handleAction = (action: string) => {
    automationAction({ name, action });
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
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <Skeleton className="h-[150px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <Zap className="h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Automation not found</h3>
        <p className="text-sm text-muted">The requested automation could not be loaded.</p>
      </div>
    );
  }

  const isRunning = automation.container.status === 'running';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Automations</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">{automation.name}</span>
          </div>

          <Button variant="ghost" size="icon" onClick={closeBlock3}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {automation.description && (
          <p className="text-sm text-muted mt-2">{automation.description}</p>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Status Indicators */}
          <div className="grid grid-cols-3 gap-3">
            <StatusBadge status={automation.health.overall} label="Overall" />
            <StatusBadge
              status={automation.health.docker_running ? 'healthy' : 'offline'}
              label="Container"
            />
            <StatusBadge
              status={automation.health.mqtt_responding ? 'healthy' : 'offline'}
              label="MQTT"
            />
          </div>

          {/* Container Info */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Container className="h-4 w-4" />
              Container Info
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Status</span>
                <span className={cn(
                  'font-medium',
                  isRunning ? 'text-success' : 'text-destructive'
                )}>
                  {automation.container.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Uptime</span>
                <span className="text-white">
                  {formatUptime(automation.container.uptime_seconds)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Image</span>
                <span className="text-white font-mono text-xs truncate max-w-[200px]" title={automation.container.image}>
                  {automation.container.image.split(':')[0].split('/').pop()}
                </span>
              </div>
              {automation.mqtt?.version && (
                <div className="flex justify-between">
                  <span className="text-muted">Version</span>
                  <span className="text-white">{automation.mqtt.version}</span>
                </div>
              )}
              {automation.mqtt?.status?.last_trigger && (
                <div className="flex justify-between">
                  <span className="text-muted">Last Trigger</span>
                  <span className="text-white">
                    {formatRelativeTime(automation.mqtt.status.last_trigger)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Logs Section */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Logs
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? 'Hide' : 'Show'}
              </Button>
            </div>

            {showLogs && (
              <div className="bg-black rounded-lg p-4 max-h-[400px] overflow-auto font-mono text-xs">
                {logs && logs.length > 0 ? (
                  logs.map((line, i) => (
                    <div key={i} className="text-green-400 whitespace-pre-wrap">
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="text-muted">No logs available</div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleAction('restart')}
              disabled={isActionPending}
              className="flex-1"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isActionPending && 'animate-spin')} />
              Restart
            </Button>

            <Button
              variant="outline"
              onClick={() => handleAction(isRunning ? 'stop' : 'start')}
              disabled={isActionPending}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
