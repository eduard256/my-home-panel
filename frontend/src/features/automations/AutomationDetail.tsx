import { useEffect, useState } from 'react';
import { Zap, Play, Pause, Settings, History, CheckCircle, AlertCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, SkeletonCard } from '@/shared/components/ui';
import { automations } from '@/shared/api';
import { useUIStore } from '@/shared/stores';
import { AIChat } from '@/shared/components';
import type { Automation, AutomationLog, AutomationHealthDetail } from '@/shared/types';

function getHealthColor(health: 'healthy' | 'warning' | 'error'): string {
  switch (health) {
    case 'healthy':
      return '#10b981';
    case 'warning':
      return '#f59e0b';
    case 'error':
      return '#ef4444';
    default:
      return '#6b6b70';
  }
}

function getHealthIcon(health: 'healthy' | 'warning' | 'error', size = 14) {
  switch (health) {
    case 'healthy':
      return <CheckCircle size={size} className="text-[#10b981]" />;
    case 'warning':
      return <AlertCircle size={size} className="text-[#f59e0b]" />;
    case 'error':
      return <XCircle size={size} className="text-[#ef4444]" />;
    default:
      return null;
  }
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AutomationDetail() {
  const { selectedAutomationId, isAIChatOpen } = useUIStore();
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAutomationId) return;

    const fetchData = async () => {
      try {
        const [automationRes, logsRes] = await Promise.all([
          automations.getOne(selectedAutomationId),
          automations.getLogs(selectedAutomationId),
        ]);
        setAutomation(automationRes);
        setLogs(logsRes.logs);
      } catch (error) {
        console.error('Failed to fetch automation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [selectedAutomationId]);

  const handleToggle = async () => {
    if (!automation) return;
    setActionLoading('toggle');
    try {
      await automations.toggle(automation.id, !automation.enabled);
      setAutomation({ ...automation, enabled: !automation.enabled });
    } catch (error) {
      console.error('Failed to toggle automation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTrigger = async () => {
    if (!automation) return;
    setActionLoading('trigger');
    try {
      await automations.trigger(automation.id);
    } catch (error) {
      console.error('Failed to trigger automation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Show AI chat if open
  if (isAIChatOpen) {
    return <AIChat />;
  }

  // Show placeholder if no automation selected
  if (!selectedAutomationId) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <div className="w-16 h-16 rounded-full bg-[#10b981]/10 flex items-center justify-center mx-auto mb-4">
            <Zap size={32} className="text-[#10b981]" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Выберите автоматизацию</h3>
          <p className="text-sm text-[#a0a0a8]">Кликните на автоматизацию слева для просмотра</p>
        </div>
      </div>
    );
  }

  if (loading || !automation) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0f]/90 backdrop-blur-lg p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${getHealthColor(automation.health.overall)}20` }}
            >
              <Zap size={20} style={{ color: getHealthColor(automation.health.overall) }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{automation.name}</h2>
                {getHealthIcon(automation.health.overall, 18)}
              </div>
              <span className="text-xs text-[#6b6b70]">{automation.type}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {automation.enabled ? (
              <span className="text-xs px-2 py-1 rounded-full bg-[#10b981]/20 text-[#10b981]">
                Active
              </span>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full bg-[#6b6b70]/20 text-[#6b6b70]">
                Paused
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={automation.enabled ? 'danger' : 'primary'}
            onClick={handleToggle}
            isLoading={actionLoading === 'toggle'}
            leftIcon={automation.enabled ? <Pause size={16} /> : <Play size={16} />}
          >
            {automation.enabled ? 'Pause' : 'Enable'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleTrigger}
            isLoading={actionLoading === 'trigger'}
            leftIcon={<RefreshCw size={16} />}
            disabled={!automation.enabled}
          >
            Trigger Now
          </Button>
        </div>

        {/* Description */}
        {automation.description && (
          <Card hoverable={false}>
            <CardContent>
              <p className="text-sm text-[#a0a0a8]">{automation.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Health Status */}
        <Card hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getHealthIcon(automation.health.overall, 18)}
              Health Status
            </CardTitle>
            <span
              className="text-sm font-medium capitalize"
              style={{ color: getHealthColor(automation.health.overall) }}
            >
              {automation.health.overall}
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {automation.health.details.map((detail: AutomationHealthDetail, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    {getHealthIcon(detail.status)}
                    <span className="text-sm text-white">{detail.component}</span>
                  </div>
                  {detail.message && (
                    <span className="text-xs text-[#a0a0a8]">{detail.message}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings size={18} className="text-[#9b87f5]" />
              Статистика
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className="text-2xl font-bold text-white">
                  {automation.trigger_count || 0}
                </div>
                <div className="text-xs text-[#a0a0a8]">Всего триггеров</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className="text-2xl font-bold text-white">
                  {automation.success_count || 0}
                </div>
                <div className="text-xs text-[#a0a0a8]">Успешных</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className="text-2xl font-bold text-white">
                  {automation.error_count || 0}
                </div>
                <div className="text-xs text-[#a0a0a8]">Ошибок</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className="text-sm font-medium text-white">
                  {automation.last_run ? formatDate(automation.last_run) : '--'}
                </div>
                <div className="text-xs text-[#a0a0a8]">Последний запуск</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History size={18} className="text-[#3b82f6]" />
              История
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="mt-0.5">
                      {log.status === 'success' ? (
                        <CheckCircle size={14} className="text-[#10b981]" />
                      ) : log.status === 'error' ? (
                        <XCircle size={14} className="text-[#ef4444]" />
                      ) : (
                        <Clock size={14} className="text-[#f59e0b]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#6b6b70]">
                          {formatDate(log.timestamp)}
                        </span>
                        {log.duration && (
                          <span className="text-xs text-[#a0a0a8]">{log.duration}ms</span>
                        )}
                      </div>
                      <p className="text-sm text-white truncate">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#6b6b70]">
                <History size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Нет записей</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
