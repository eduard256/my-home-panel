import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Play, Pause, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, SkeletonList } from '@/shared/components/ui';
import { automations } from '@/shared/api';
import { useUIStore } from '@/shared/stores';
import type { Automation, AutomationHealthDetail } from '@/shared/types';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

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

function getHealthIcon(health: 'healthy' | 'warning' | 'error') {
  switch (health) {
    case 'healthy':
      return <CheckCircle size={14} className="text-[#10b981]" />;
    case 'warning':
      return <AlertCircle size={14} className="text-[#f59e0b]" />;
    case 'error':
      return <XCircle size={14} className="text-[#ef4444]" />;
    default:
      return null;
  }
}

function formatLastRun(timestamp: string | null): string {
  if (!timestamp) return 'Никогда';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;

  return date.toLocaleDateString('ru-RU');
}

export function AutomationsOverview() {
  const { setSelectedAutomation, setActiveBlock, isMobile } = useUIStore();
  const [automationsList, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'error'>('all');

  useEffect(() => {
    const fetchAutomations = async () => {
      try {
        const response = await automations.getAll();
        setAutomations(response.automations);
      } catch (error) {
        console.error('Failed to fetch automations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAutomations();
    const interval = setInterval(fetchAutomations, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAutomationClick = (automationId: string) => {
    setSelectedAutomation(automationId);
    if (isMobile) {
      setActiveBlock(3);
    }
  };

  const filteredAutomations = automationsList.filter((a) => {
    if (filter === 'all') return true;
    return a.health?.overall === filter;
  });

  const healthyCt = automationsList.filter((a) => a.health?.overall === 'healthy').length;
  const warningCt = automationsList.filter((a) => a.health?.overall === 'warning').length;
  const errorCt = automationsList.filter((a) => a.health?.overall === 'error').length;

  if (loading) {
    return <SkeletonList count={4} />;
  }

  return (
    <motion.div
      className="space-y-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap size={20} className="text-[#10b981]" />
          Автоматизации
        </h1>
        <span className="text-sm text-[#a0a0a8]">{automationsList.length} всего</span>
      </motion.div>

      {/* Filter tabs */}
      <motion.div variants={item} className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-[#9b87f5] text-white'
              : 'bg-white/5 text-[#a0a0a8] hover:text-white'
          }`}
        >
          Все ({automationsList.length})
        </button>
        <button
          onClick={() => setFilter('healthy')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
            filter === 'healthy'
              ? 'bg-[#10b981] text-white'
              : 'bg-white/5 text-[#a0a0a8] hover:text-white'
          }`}
        >
          <CheckCircle size={14} />
          Healthy ({healthyCt})
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
            filter === 'warning'
              ? 'bg-[#f59e0b] text-white'
              : 'bg-white/5 text-[#a0a0a8] hover:text-white'
          }`}
        >
          <AlertCircle size={14} />
          Warning ({warningCt})
        </button>
        <button
          onClick={() => setFilter('error')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
            filter === 'error'
              ? 'bg-[#ef4444] text-white'
              : 'bg-white/5 text-[#a0a0a8] hover:text-white'
          }`}
        >
          <XCircle size={14} />
          Error ({errorCt})
        </button>
      </motion.div>

      {filteredAutomations.map((automation) => (
        <motion.div key={automation.id} variants={item}>
          <Card onClick={() => handleAutomationClick(automation.id)}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${getHealthColor(automation.health?.overall ?? 'healthy')}20` }}
                >
                  <Zap size={20} style={{ color: getHealthColor(automation.health?.overall ?? 'healthy') }} />
                </div>
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {automation.name}
                    {automation.health?.overall && getHealthIcon(automation.health.overall)}
                  </CardTitle>
                  <span className="text-xs text-[#6b6b70]">{automation.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  {automation.enabled ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-[#10b981]/20 text-[#10b981] flex items-center gap-1">
                      <Play size={10} />
                      Active
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-[#6b6b70]/20 text-[#6b6b70] flex items-center gap-1">
                      <Pause size={10} />
                      Paused
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {automation.description && (
                <p className="text-sm text-[#a0a0a8] mb-3 line-clamp-2">{automation.description}</p>
              )}

              {/* Health details */}
              {automation.health?.details && automation.health.details.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {automation.health.details.map((detail: AutomationHealthDetail, idx: number) => (
                    <div
                      key={`${automation.id}-detail-${idx}`}
                      className="p-2 rounded-lg bg-white/5 text-center"
                    >
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {getHealthIcon(detail.status)}
                        <span className="text-xs text-[#a0a0a8]">{detail.component}</span>
                      </div>
                      {detail.message && (
                        <p className="text-xs text-[#6b6b70] truncate">{detail.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            <CardFooter>
              <div className="flex items-center justify-between text-xs text-[#6b6b70] w-full">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  {formatLastRun(automation.last_run ?? null)}
                </div>
                {automation.trigger_count !== undefined && (
                  <span>{automation.trigger_count} триггеров</span>
                )}
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      ))}

      {filteredAutomations.length === 0 && (
        <motion.div variants={item}>
          <Card hoverable={false}>
            <div className="text-center py-8 text-[#6b6b70]">
              <Zap size={32} className="mx-auto mb-2 opacity-50" />
              <p>Нет автоматизаций</p>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
