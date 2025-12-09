import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Server, Cpu, HardDrive, Wifi, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, StatusDot, Sparkline, ProgressBar, SkeletonList } from '@/shared/components/ui';
import { proxmox } from '@/shared/api';
import { useUIStore } from '@/shared/stores';
import type { ProxmoxServer } from '@/shared/types';

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

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);

  if (days > 0) {
    return `${days} дн ${hours} ч`;
  }
  return `${hours} ч`;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function ServersOverview() {
  const { setSelectedServer, setActiveBlock, isMobile } = useUIStore();
  const [servers, setServers] = useState<ProxmoxServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await proxmox.getServers();
        setServers(response.servers);
      } catch (error) {
        console.error('Failed to fetch servers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
    const interval = setInterval(fetchServers, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleServerClick = (serverId: string) => {
    setSelectedServer(serverId);
    if (isMobile) {
      setActiveBlock(3);
    }
  };

  if (loading) {
    return <SkeletonList count={2} />;
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
          <Server size={20} className="text-[#9b87f5]" />
          Сервера
        </h1>
        <span className="text-sm text-[#a0a0a8]">{servers.length} серверов</span>
      </motion.div>

      {servers.map((server) => (
        <motion.div key={server.id} variants={item}>
          <Card onClick={() => handleServerClick(server.id)}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <StatusDot status={server.online ? 'online' : 'offline'} size="lg" />
                <div>
                  <CardTitle>{server.name}</CardTitle>
                  <span className="text-xs text-[#6b6b70]">{server.ip}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* CPU */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#a0a0a8] uppercase">
                    <Cpu size={12} />
                    CPU
                  </div>
                  <div className="h-[60px]">
                    <Sparkline
                      data={Array(10).fill(0).map(() => server.cpu * (0.8 + Math.random() * 0.4))}
                      height={60}
                    />
                  </div>
                  <div className="text-2xl font-bold text-white">{server.cpu.toFixed(1)}%</div>
                </div>

                {/* RAM */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#a0a0a8] uppercase">
                    <HardDrive size={12} />
                    RAM
                  </div>
                  <ProgressBar
                    value={server.memory_percent}
                    color={server.memory_percent > 80 ? '#ef4444' : '#9b87f5'}
                  />
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-white">
                      {(server.memory_used / 1024 / 1024 / 1024).toFixed(0)}
                    </span>
                    <span className="text-sm text-[#6b6b70]">
                      / {(server.memory_total / 1024 / 1024 / 1024).toFixed(0)} GB
                    </span>
                  </div>
                </div>

                {/* Disk */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#a0a0a8] uppercase">
                    <HardDrive size={12} />
                    Disk
                  </div>
                  <ProgressBar
                    value={server.disk_percent}
                    color={server.disk_percent > 80 ? '#ef4444' : '#10b981'}
                  />
                  <div className="text-sm text-[#a0a0a8]">
                    {formatBytes(server.disk_used)} / {formatBytes(server.disk_total)}
                  </div>
                </div>

                {/* Network */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#a0a0a8] uppercase">
                    <Wifi size={12} />
                    Network
                  </div>
                  <div className="text-sm">
                    <span className="text-[#10b981]">↓ {server.network_in ? formatBytes(server.network_in) : '--'}/s</span>
                    <span className="text-[#6b6b70] mx-2">|</span>
                    <span className="text-[#9b87f5]">↑ {server.network_out ? formatBytes(server.network_out) : '--'}/s</span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <div className="flex items-center justify-between text-xs text-[#6b6b70]">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  Uptime: {formatUptime(server.uptime)}
                </div>
                <div>
                  {server.vms_running}/{server.vms_total} VM, {server.cts_running}/{server.cts_total} CT
                </div>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
