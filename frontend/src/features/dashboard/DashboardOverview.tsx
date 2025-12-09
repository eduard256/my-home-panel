import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Server, Box, Zap, Home, Camera, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, StatusDot, Sparkline, SkeletonList } from '@/shared/components/ui';
import { proxmox, automations, frigate } from '@/shared/api';
import { useUIStore } from '@/shared/stores';
import type { ProxmoxServer, Automation, Camera as CameraType } from '@/shared/types';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function DashboardOverview() {
  const { setSection, setSelectedServer } = useUIStore();
  const [servers, setServers] = useState<ProxmoxServer[]>([]);
  const [automationsList, setAutomations] = useState<Automation[]>([]);
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [serversRes, automationsRes, camerasRes] = await Promise.allSettled([
          proxmox.getServers(),
          automations.getAll(),
          frigate.getCameras(),
        ]);

        if (serversRes.status === 'fulfilled') setServers(serversRes.value.servers);
        if (automationsRes.status === 'fulfilled') setAutomations(automationsRes.value.automations);
        if (camerasRes.status === 'fulfilled') setCameras(camerasRes.value.cameras);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate stats
  const runningAutomations = automationsList.filter((a) => a.health.overall === 'healthy').length;
  const totalAutomations = automationsList.length;
  const enabledCameras = cameras.filter((c) => c.enabled).length;

  // Get current time
  const currentTime = new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const currentDate = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (loading) {
    return <SkeletonList count={4} />;
  }

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Time widget */}
      <motion.div variants={item} className="text-center py-4">
        <div className="text-5xl font-bold text-white tracking-tight">{currentTime}</div>
        <div className="text-lg text-[#a0a0a8] mt-1 capitalize">{currentDate}</div>
      </motion.div>

      {/* Servers summary */}
      <motion.div variants={item}>
        <h2 className="text-sm font-medium text-[#a0a0a8] uppercase tracking-wide mb-3 flex items-center gap-2">
          <Server size={14} />
          Сервера
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servers.map((server) => (
            <Card
              key={server.id}
              onClick={() => {
                setSection('servers');
                setSelectedServer(server.id);
              }}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <StatusDot status={server.online ? 'online' : 'offline'} />
                  <CardTitle>{server.name}</CardTitle>
                </div>
                <span className="text-xs text-[#6b6b70]">{server.ip}</span>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-[#a0a0a8] uppercase mb-1">CPU</div>
                    <div className="text-2xl font-bold text-white">{server.cpu.toFixed(0)}%</div>
                    <Sparkline data={[server.cpu * 0.8, server.cpu * 0.9, server.cpu, server.cpu * 1.1, server.cpu]} height={30} />
                  </div>
                  <div>
                    <div className="text-xs text-[#a0a0a8] uppercase mb-1">RAM</div>
                    <div className="text-2xl font-bold text-white">{server.memory_percent.toFixed(0)}%</div>
                    <div className="text-xs text-[#6b6b70]">
                      {(server.memory_used / 1024 / 1024 / 1024).toFixed(0)} / {(server.memory_total / 1024 / 1024 / 1024).toFixed(0)} GB
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Quick stats */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* VMs */}
        <Card onClick={() => setSection('vms')} padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#9b87f5]/10">
              <Box size={20} className="text-[#9b87f5]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {servers.reduce((acc, s) => acc + s.vms_running + s.cts_running, 0)}
              </div>
              <div className="text-xs text-[#a0a0a8]">VM/CT Running</div>
            </div>
          </div>
        </Card>

        {/* Automations */}
        <Card onClick={() => setSection('automations')} padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#10b981]/10">
              <Zap size={20} className="text-[#10b981]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {runningAutomations}/{totalAutomations}
              </div>
              <div className="text-xs text-[#a0a0a8]">Автоматизации</div>
            </div>
          </div>
        </Card>

        {/* Smart Home */}
        <Card onClick={() => setSection('smarthome')} padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#f59e0b]/10">
              <Home size={20} className="text-[#f59e0b]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">--</div>
              <div className="text-xs text-[#a0a0a8]">Устройства</div>
            </div>
          </div>
        </Card>

        {/* Cameras */}
        <Card onClick={() => setSection('cameras')} padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3b82f6]/10">
              <Camera size={20} className="text-[#3b82f6]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{enabledCameras}</div>
              <div className="text-xs text-[#a0a0a8]">Камеры</div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Recent activity placeholder */}
      <motion.div variants={item}>
        <h2 className="text-sm font-medium text-[#a0a0a8] uppercase tracking-wide mb-3 flex items-center gap-2">
          <Activity size={14} />
          Последняя активность
        </h2>
        <Card hoverable={false}>
          <div className="text-center py-8 text-[#6b6b70]">
            <Activity size={32} className="mx-auto mb-2 opacity-50" />
            <p>Активность будет показана здесь</p>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
