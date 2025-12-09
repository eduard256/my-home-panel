import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Square, Server, Monitor, Container } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, StatusDot, ProgressBar, SkeletonList } from '@/shared/components/ui';
import { proxmox } from '@/shared/api';
import { useUIStore } from '@/shared/stores';
import type { VM, ProxmoxServer } from '@/shared/types';

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

interface ServerVMsData {
  server: ProxmoxServer;
  vms: VM[];
  containers: VM[];
  loading: boolean;
  error: string | null;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function VMsOverview() {
  const { setSelectedVM, setActiveBlock, isMobile } = useUIStore();
  const [serversData, setServersData] = useState<ServerVMsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'running' | 'stopped'>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First get all servers
        const serversResponse = await proxmox.getServers();

        // Then fetch VMs for each server
        const serversWithVMs = await Promise.all(
          serversResponse.servers.map(async (server) => {
            try {
              const vmsResponse = await proxmox.getServerVMs(server.id);
              // Backend returns all in vms array, filter by type and exclude templates
              const allItems = (vmsResponse.vms || []).filter(item => !item.template);
              const vms = allItems.filter(item => item.type === 'qemu');
              const containers = allItems.filter(item => item.type === 'lxc');
              return {
                server,
                vms,
                containers,
                loading: false,
                error: null,
              };
            } catch (error) {
              console.error(`Failed to fetch VMs for server ${server.id}:`, error);
              return {
                server,
                vms: [],
                containers: [],
                loading: false,
                error: 'Failed to load VMs',
              };
            }
          })
        );

        setServersData(serversWithVMs);
      } catch (error) {
        console.error('Failed to fetch servers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleVMClick = (serverId: string, vmid: number, vmType: 'qemu' | 'lxc') => {
    // Store as serverId:vmid:type for unique identification
    setSelectedVM(`${serverId}:${vmid}:${vmType}`);
    if (isMobile) {
      setActiveBlock(3);
    }
  };

  // Count totals
  const allVMs = serversData.flatMap(s => [...s.vms, ...s.containers]);
  const runningCount = allVMs.filter(vm => vm.status === 'running').length;
  const stoppedCount = allVMs.filter(vm => vm.status === 'stopped').length;

  const filterVMs = (vms: VM[]) => {
    return vms.filter(vm => {
      if (filter === 'running') return vm.status === 'running';
      if (filter === 'stopped') return vm.status === 'stopped';
      return true;
    });
  };

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
          <Box size={20} className="text-[#9b87f5]" />
          VM / Containers
        </h1>
        <span className="text-sm text-[#a0a0a8]">{allVMs.length} всего</span>
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
          Все ({allVMs.length})
        </button>
        <button
          onClick={() => setFilter('running')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'running'
              ? 'bg-[#10b981] text-white'
              : 'bg-white/5 text-[#a0a0a8] hover:text-white'
          }`}
        >
          Запущены ({runningCount})
        </button>
        <button
          onClick={() => setFilter('stopped')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'stopped'
              ? 'bg-[#ef4444] text-white'
              : 'bg-white/5 text-[#a0a0a8] hover:text-white'
          }`}
        >
          Остановлены ({stoppedCount})
        </button>
      </motion.div>

      {/* Server blocks */}
      {serversData.map((serverData) => {
        const filteredVMs = filterVMs(serverData.vms);
        const filteredContainers = filterVMs(serverData.containers);
        const hasItems = filteredVMs.length > 0 || filteredContainers.length > 0;

        // Skip server block if no items match filter
        if (!hasItems && filter !== 'all') return null;

        return (
          <motion.div key={serverData.server.id} variants={item} className="space-y-3">
            {/* Server header */}
            <div className="flex items-center gap-3 px-2">
              <div className="flex items-center gap-2">
                <Server size={16} className="text-[#9b87f5]" />
                <h2 className="text-lg font-semibold text-white">{serverData.server.name}</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6b6b70]">
                <StatusDot status={serverData.server.status === 'online' ? 'online' : 'offline'} size="sm" />
                <span>{serverData.server.node}</span>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-3 text-xs text-[#a0a0a8]">
                <span className="flex items-center gap-1">
                  <Monitor size={12} />
                  {serverData.vms.length} VMs
                </span>
                <span className="flex items-center gap-1">
                  <Container size={12} />
                  {serverData.containers.length} CTs
                </span>
              </div>
            </div>

            {/* Server error state */}
            {serverData.error && (
              <Card hoverable={false}>
                <div className="text-center py-4 text-[#ef4444]">
                  <p className="text-sm">{serverData.error}</p>
                </div>
              </Card>
            )}

            {/* VMs */}
            {filteredVMs.length > 0 && (
              <div className="space-y-2">
                {filteredVMs.map((vm) => (
                  <VMCard
                    key={`vm-${serverData.server.id}-${vm.vmid}`}
                    vm={vm}
                    serverId={serverData.server.id}
                    onClick={() => handleVMClick(serverData.server.id, vm.vmid, 'qemu')}
                  />
                ))}
              </div>
            )}

            {/* Containers */}
            {filteredContainers.length > 0 && (
              <div className="space-y-2">
                {filteredContainers.map((ct) => (
                  <VMCard
                    key={`ct-${serverData.server.id}-${ct.vmid}`}
                    vm={ct}
                    serverId={serverData.server.id}
                    onClick={() => handleVMClick(serverData.server.id, ct.vmid, 'lxc')}
                  />
                ))}
              </div>
            )}

            {/* Empty state for this server */}
            {!hasItems && filter === 'all' && !serverData.error && (
              <Card hoverable={false}>
                <div className="text-center py-4 text-[#6b6b70]">
                  <Box size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Нет VM/контейнеров</p>
                </div>
              </Card>
            )}

            {/* Divider between servers */}
            <div className="border-b border-white/5 mt-4" />
          </motion.div>
        );
      })}

      {/* Global empty state */}
      {serversData.length === 0 && (
        <motion.div variants={item}>
          <Card hoverable={false}>
            <div className="text-center py-8 text-[#6b6b70]">
              <Server size={32} className="mx-auto mb-2 opacity-50" />
              <p>Нет доступных серверов</p>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

// Separate component for VM/CT card
interface VMCardProps {
  vm: VM;
  serverId: string;
  onClick: () => void;
}

function VMCard({ vm, onClick }: VMCardProps) {
  const isContainer = vm.type === 'lxc';

  return (
    <Card onClick={onClick}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <StatusDot status={vm.status === 'running' ? 'online' : 'offline'} size="lg" />
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {isContainer ? (
                <span className="text-xs px-1.5 py-0.5 rounded bg-[#3b82f6]/20 text-[#3b82f6]">CT</span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 rounded bg-[#9b87f5]/20 text-[#9b87f5]">VM</span>
              )}
              {vm.name}
            </CardTitle>
            <div className="text-xs text-[#6b6b70]">
              VMID: {vm.vmid}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {vm.status === 'running' ? (
          <div className="grid grid-cols-2 gap-4">
            {/* CPU */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a0a0a8] uppercase">CPU</span>
                <span className="text-white font-medium">{vm.cpu?.toFixed(1) || 0}%</span>
              </div>
              <ProgressBar
                value={vm.cpu || 0}
                color={vm.cpu && vm.cpu > 80 ? '#ef4444' : '#9b87f5'}
              />
              <div className="text-xs text-[#6b6b70]">{vm.cpus} vCPU</div>
            </div>

            {/* Memory */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a0a0a8] uppercase">RAM</span>
                <span className="text-white font-medium">{vm.memory_percent?.toFixed(0) || 0}%</span>
              </div>
              <ProgressBar
                value={vm.memory_percent || 0}
                color={vm.memory_percent && vm.memory_percent > 80 ? '#ef4444' : '#10b981'}
              />
              <div className="text-xs text-[#6b6b70]">
                {formatBytes(vm.memory_used || 0)} / {formatBytes(vm.memory_total || 0)}
              </div>
            </div>

            {/* Disk */}
            <div className="space-y-2 col-span-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a0a0a8] uppercase">Disk</span>
                <span className="text-white font-medium">{vm.disk_percent?.toFixed(0) || 0}%</span>
              </div>
              <ProgressBar
                value={vm.disk_percent || 0}
                color={vm.disk_percent && vm.disk_percent > 80 ? '#ef4444' : '#f59e0b'}
              />
              <div className="text-xs text-[#6b6b70]">
                {formatBytes(vm.disk_used || 0)} / {formatBytes(vm.disk_total || 0)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-[#6b6b70]">
            <Square size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">{isContainer ? 'Контейнер' : 'VM'} остановлен</p>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <div className="flex items-center justify-between text-xs text-[#6b6b70] w-full">
          <span className="capitalize">{vm.status}</span>
          {vm.uptime && vm.uptime > 0 && (
            <span>Uptime: {Math.floor(vm.uptime / 3600)}ч</span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
