import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, Power, ExternalLink, Cpu, HardDrive } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, StatusBadge, Button, ProgressBar, SkeletonCard } from '@/shared/components/ui';
import { proxmox, metrics } from '@/shared/api';
import { useUIStore } from '@/shared/stores';
import { AIChat } from '@/shared/components';
import type { ProxmoxServer, MetricPoint } from '@/shared/types';

const periodOptions = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
] as const;

export function ServerDetail() {
  const { selectedServerId, isAIChatOpen } = useUIStore();
  const [server, setServer] = useState<ProxmoxServer | null>(null);
  const [metricsData, setMetricsData] = useState<MetricPoint[]>([]);
  const [period, setPeriod] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedServerId) return;

    const fetchData = async () => {
      try {
        const [serverRes, metricsRes] = await Promise.all([
          proxmox.getServer(selectedServerId),
          metrics.getServerMetrics(selectedServerId, period),
        ]);
        setServer(serverRes);
        setMetricsData(metricsRes.data);
      } catch (error) {
        console.error('Failed to fetch server data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [selectedServerId, period]);

  // Show AI chat if open
  if (isAIChatOpen) {
    return <AIChat />;
  }

  // Show placeholder if no server selected
  if (!selectedServerId) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <div className="w-16 h-16 rounded-full bg-[#9b87f5]/10 flex items-center justify-center mx-auto mb-4">
            <Cpu size={32} className="text-[#9b87f5]" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Выберите сервер</h3>
          <p className="text-sm text-[#a0a0a8]">Кликните на сервер слева для просмотра деталей</p>
        </div>
      </div>
    );
  }

  if (loading || !server) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const chartData = metricsData.map((m) => ({
    time: new Date(m.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    cpu: m.cpu_percent,
    memory: (m.memory_used / m.memory_total) * 100,
  }));

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0f]/90 backdrop-blur-lg p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge status={server.online ? 'online' : 'offline'} />
            <h2 className="text-xl font-bold text-white">{server.name}</h2>
          </div>
          <span className="text-sm text-[#6b6b70]">{server.ip}</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Period selector */}
        <div className="flex gap-2">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === opt.value
                  ? 'bg-[#9b87f5] text-white'
                  : 'bg-white/5 text-[#a0a0a8] hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* CPU Chart */}
        <Card hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu size={18} className="text-[#9b87f5]" />
              CPU Usage
            </CardTitle>
            <span className="text-3xl font-bold text-white">{server.cpu.toFixed(1)}%</span>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9b87f5" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#9b87f5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#6b6b70" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#6b6b70" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#16161d',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="#9b87f5"
                    strokeWidth={2}
                    fill="url(#cpuGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive size={18} className="text-[#10b981]" />
              Memory
            </CardTitle>
            <span className="text-3xl font-bold text-white">{server.memory_percent.toFixed(0)}%</span>
          </CardHeader>
          <CardContent>
            <ProgressBar
              value={server.memory_percent}
              color="#10b981"
              size="lg"
            />
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <div className="text-xs text-[#a0a0a8] uppercase mb-1">Used</div>
                <div className="text-lg font-semibold text-white">
                  {(server.memory_used / 1024 / 1024 / 1024).toFixed(1)} GB
                </div>
              </div>
              <div>
                <div className="text-xs text-[#a0a0a8] uppercase mb-1">Total</div>
                <div className="text-lg font-semibold text-white">
                  {(server.memory_total / 1024 / 1024 / 1024).toFixed(1)} GB
                </div>
              </div>
              <div>
                <div className="text-xs text-[#a0a0a8] uppercase mb-1">Free</div>
                <div className="text-lg font-semibold text-white">
                  {((server.memory_total - server.memory_used) / 1024 / 1024 / 1024).toFixed(1)} GB
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disk */}
        <Card hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive size={18} className="text-[#f59e0b]" />
              Disk
            </CardTitle>
            <span className="text-3xl font-bold text-white">{server.disk_percent.toFixed(0)}%</span>
          </CardHeader>
          <CardContent>
            <ProgressBar
              value={server.disk_percent}
              color={server.disk_percent > 80 ? '#ef4444' : '#f59e0b'}
              size="lg"
            />
            <div className="mt-4 text-sm text-[#a0a0a8]">
              {(server.disk_used / 1024 / 1024 / 1024).toFixed(0)} GB / {(server.disk_total / 1024 / 1024 / 1024).toFixed(0)} GB used
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="secondary"
            onClick={() => {}}
            leftIcon={<RefreshCw size={16} />}
          >
            Restart
          </Button>
          <Button
            variant="danger"
            onClick={() => {}}
            leftIcon={<Power size={16} />}
          >
            Shutdown
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.open(`https://${server.ip}:8006`, '_blank')}
            leftIcon={<ExternalLink size={16} />}
          >
            Proxmox
          </Button>
        </div>
      </div>
    </div>
  );
}
