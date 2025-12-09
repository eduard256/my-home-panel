import { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Square, RefreshCw, Box, Cpu, HardDrive, Network, Power } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, StatusBadge, Button, ProgressBar, SkeletonCard } from '@/shared/components/ui';
import { proxmox, metrics } from '@/shared/api';
import { useUIStore } from '@/shared/stores';
import { AIChat } from '@/shared/components';
import type { VM, MetricPoint } from '@/shared/types';

const periodOptions = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
] as const;

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}д ${hours}ч`;
  if (hours > 0) return `${hours}ч ${minutes}м`;
  return `${minutes}м`;
}

// Parse selectedVMId format: "serverId:vmid:type"
function parseVMId(selectedVMId: string | null): { serverId: string; vmid: number; vmType: 'qemu' | 'lxc' } | null {
  if (!selectedVMId) return null;
  const parts = selectedVMId.split(':');
  if (parts.length !== 3) return null;
  return {
    serverId: parts[0],
    vmid: parseInt(parts[1], 10),
    vmType: parts[2] as 'qemu' | 'lxc',
  };
}

export function VMDetail() {
  const { selectedVMId, isAIChatOpen } = useUIStore();
  const [vm, setVM] = useState<VM | null>(null);
  const [metricsData, setMetricsData] = useState<MetricPoint[]>([]);
  const [period, setPeriod] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const vmInfo = useMemo(() => parseVMId(selectedVMId), [selectedVMId]);

  useEffect(() => {
    if (!vmInfo) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [vmRes, metricsRes] = await Promise.all([
          proxmox.getVM(vmInfo.serverId, vmInfo.vmid, vmInfo.vmType),
          metrics.getVMMetrics(`${vmInfo.serverId}/${vmInfo.vmid}`, period).catch(() => ({ data: [] })),
        ]);
        setVM(vmRes);
        setMetricsData(metricsRes.data || []);
      } catch (error) {
        console.error('Failed to fetch VM data:', error);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [vmInfo, period]);

  const handleAction = async (action: 'start' | 'stop' | 'shutdown' | 'restart') => {
    if (!vmInfo) return;
    setActionLoading(action);
    try {
      await proxmox.vmAction(vmInfo.serverId, vmInfo.vmid, action, vmInfo.vmType);
    } catch (error) {
      console.error(`Failed to ${action} VM:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  // Show AI chat if open
  if (isAIChatOpen) {
    return <AIChat />;
  }

  // Show placeholder if no VM selected
  if (!selectedVMId || !vmInfo) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <div className="w-16 h-16 rounded-full bg-[#9b87f5]/10 flex items-center justify-center mx-auto mb-4">
            <Box size={32} className="text-[#9b87f5]" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Выберите VM</h3>
          <p className="text-sm text-[#a0a0a8]">Кликните на VM слева для просмотра деталей</p>
        </div>
      </div>
    );
  }

  if (loading || !vm) {
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
    memory: m.memory_total > 0 ? (m.memory_used / m.memory_total) * 100 : 0,
  }));

  const isRunning = vm.status === 'running';
  const isContainer = vmInfo.vmType === 'lxc';

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0f]/90 backdrop-blur-lg p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge status={isRunning ? 'online' : 'offline'} />
            <div>
              <div className="flex items-center gap-2">
                {isContainer ? (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#3b82f6]/20 text-[#3b82f6]">CT</span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#9b87f5]/20 text-[#9b87f5]">VM</span>
                )}
                <h2 className="text-xl font-bold text-white">{vm.name}</h2>
              </div>
              <span className="text-xs text-[#6b6b70]">{vmInfo.serverId} • VMID: {vm.vmid}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          {isRunning ? (
            <>
              <Button
                variant="secondary"
                onClick={() => handleAction('restart')}
                isLoading={actionLoading === 'restart'}
                leftIcon={<RefreshCw size={16} />}
              >
                Restart
              </Button>
              <Button
                variant="danger"
                onClick={() => handleAction('shutdown')}
                isLoading={actionLoading === 'shutdown'}
                leftIcon={<Power size={16} />}
              >
                Shutdown
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleAction('stop')}
                isLoading={actionLoading === 'stop'}
                leftIcon={<Square size={16} />}
              >
                Force Stop
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={() => handleAction('start')}
              isLoading={actionLoading === 'start'}
              leftIcon={<Play size={16} />}
              className="col-span-3"
            >
              Start {isContainer ? 'Container' : 'VM'}
            </Button>
          )}
        </div>

        {isRunning && (
          <>
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
                <span className="text-3xl font-bold text-white">{vm.cpu?.toFixed(1) || 0}%</span>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="vmCpuGradient" x1="0" y1="0" x2="0" y2="1">
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
                        fill="url(#vmCpuGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 text-sm text-[#a0a0a8]">
                  {vm.cpus} vCPU allocated
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
                <span className="text-3xl font-bold text-white">{vm.memory_percent?.toFixed(0) || 0}%</span>
              </CardHeader>
              <CardContent>
                <ProgressBar
                  value={vm.memory_percent || 0}
                  color="#10b981"
                  size="lg"
                />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-xs text-[#a0a0a8] uppercase mb-1">Used</div>
                    <div className="text-lg font-semibold text-white">
                      {formatBytes(vm.memory_used || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a0a0a8] uppercase mb-1">Total</div>
                    <div className="text-lg font-semibold text-white">
                      {formatBytes(vm.memory_total || 0)}
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
                <span className="text-3xl font-bold text-white">{vm.disk_percent?.toFixed(0) || 0}%</span>
              </CardHeader>
              <CardContent>
                <ProgressBar
                  value={vm.disk_percent || 0}
                  color={vm.disk_percent && vm.disk_percent > 80 ? '#ef4444' : '#f59e0b'}
                  size="lg"
                />
                <div className="mt-4 text-sm text-[#a0a0a8]">
                  {formatBytes(vm.disk_used || 0)} / {formatBytes(vm.disk_total || 0)} used
                </div>
              </CardContent>
            </Card>

            {/* Network */}
            {(vm.network_in || vm.network_out) && (
              <Card hoverable={false}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network size={18} className="text-[#3b82f6]" />
                    Network
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-[#a0a0a8] uppercase mb-1">Download</div>
                      <div className="text-lg font-semibold text-[#10b981]">
                        ↓ {formatBytes(vm.network_in || 0)}/s
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#a0a0a8] uppercase mb-1">Upload</div>
                      <div className="text-lg font-semibold text-[#9b87f5]">
                        ↑ {formatBytes(vm.network_out || 0)}/s
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Info when stopped */}
        {!isRunning && (
          <Card hoverable={false}>
            <CardContent>
              <div className="text-center py-8">
                <Square size={48} className="mx-auto mb-4 text-[#6b6b70]" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {isContainer ? 'Контейнер' : 'VM'} остановлен
                </h3>
                <p className="text-sm text-[#a0a0a8] mb-4">
                  Запустите {isContainer ? 'контейнер' : 'VM'} для просмотра метрик
                </p>
                <div className="grid grid-cols-2 gap-4 text-left max-w-xs mx-auto">
                  <div>
                    <div className="text-xs text-[#a0a0a8] uppercase">vCPU</div>
                    <div className="text-white font-medium">{vm.cpus}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a0a0a8] uppercase">Memory</div>
                    <div className="text-white font-medium">{formatBytes(vm.memory_total || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a0a0a8] uppercase">Disk</div>
                    <div className="text-white font-medium">{formatBytes(vm.disk_total || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a0a0a8] uppercase">Type</div>
                    <div className="text-white font-medium uppercase">{vmInfo.vmType}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Uptime info */}
        {isRunning && vm.uptime && vm.uptime > 0 && (
          <div className="text-center text-sm text-[#6b6b70]">
            Uptime: {formatUptime(vm.uptime)}
          </div>
        )}
      </div>
    </div>
  );
}
