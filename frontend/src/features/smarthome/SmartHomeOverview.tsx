import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Lightbulb, Thermometer, Lock, Tv, Speaker, Fan, Power } from 'lucide-react';
import { Card, CardContent, SkeletonList } from '@/shared/components/ui';
import { smarthome } from '@/shared/api';
import { useUIStore } from '@/shared/stores';
import type { SmartDevice, Room } from '@/shared/types';

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

const deviceIcons: Record<string, React.ReactNode> = {
  light: <Lightbulb size={20} />,
  thermostat: <Thermometer size={20} />,
  lock: <Lock size={20} />,
  tv: <Tv size={20} />,
  speaker: <Speaker size={20} />,
  fan: <Fan size={20} />,
  switch: <Power size={20} />,
  default: <Power size={20} />,
};

const deviceColors: Record<string, string> = {
  light: '#f59e0b',
  thermostat: '#3b82f6',
  lock: '#10b981',
  tv: '#9b87f5',
  speaker: '#ec4899',
  fan: '#06b6d4',
  switch: '#6b6b70',
  default: '#6b6b70',
};

export function SmartHomeOverview() {
  const { setSelectedDevice, setActiveBlock, isMobile } = useUIStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, devicesRes] = await Promise.all([
          smarthome.getRooms(),
          smarthome.getDevices(),
        ]);
        setRooms(roomsRes.rooms);
        setDevices(devicesRes.devices);
      } catch (error) {
        console.error('Failed to fetch smart home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDeviceClick = (deviceId: string) => {
    setSelectedDevice(deviceId);
    if (isMobile) {
      setActiveBlock(3);
    }
  };

  const handleQuickToggle = async (e: React.MouseEvent, device: SmartDevice) => {
    e.stopPropagation();
    try {
      await smarthome.toggleDevice(device.id, !device.state.on);
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id ? { ...d, state: { ...d.state, on: !d.state.on } } : d
        )
      );
    } catch (error) {
      console.error('Failed to toggle device:', error);
    }
  };

  const filteredDevices = selectedRoom
    ? devices.filter((d) => d.room_id === selectedRoom)
    : devices;

  const activeDevices = devices.filter((d) => d.state.on).length;

  if (loading) {
    return <SkeletonList count={6} />;
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
          <Home size={20} className="text-[#f59e0b]" />
          Умный дом
        </h1>
        <span className="text-sm text-[#a0a0a8]">{activeDevices} активных</span>
      </motion.div>

      {/* Room filter */}
      <motion.div variants={item} className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setSelectedRoom(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            selectedRoom === null
              ? 'bg-[#f59e0b] text-white'
              : 'bg-white/5 text-[#a0a0a8] hover:text-white'
          }`}
        >
          Все ({devices.length})
        </button>
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => setSelectedRoom(room.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              selectedRoom === room.id
                ? 'bg-[#f59e0b] text-white'
                : 'bg-white/5 text-[#a0a0a8] hover:text-white'
            }`}
          >
            {room.name} ({devices.filter((d) => d.room_id === room.id).length})
          </button>
        ))}
      </motion.div>

      {/* Devices grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredDevices.map((device) => (
          <motion.div key={device.id} variants={item}>
            <Card
              onClick={() => handleDeviceClick(device.id)}
              className={`relative overflow-hidden ${
                device.state.on ? 'ring-1 ring-white/10' : ''
              }`}
            >
              {/* Glow effect when on */}
              {device.state.on && (
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${deviceColors[device.type] || deviceColors.default}, transparent 70%)`,
                  }}
                />
              )}

              <CardContent className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: device.state.on
                        ? `${deviceColors[device.type] || deviceColors.default}20`
                        : 'rgba(255,255,255,0.05)',
                      color: device.state.on
                        ? deviceColors[device.type] || deviceColors.default
                        : '#6b6b70',
                    }}
                  >
                    {deviceIcons[device.type] || deviceIcons.default}
                  </div>

                  {/* Quick toggle */}
                  <button
                    onClick={(e) => handleQuickToggle(e, device)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      device.state.on ? 'bg-[#10b981]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        device.state.on ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-white truncate">{device.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#6b6b70]">
                      {device.state.on ? 'Включено' : 'Выключено'}
                    </span>
                    {device.type === 'light' && device.state.brightness && (
                      <span className="text-xs text-[#a0a0a8]">
                        {device.state.brightness}%
                      </span>
                    )}
                    {device.type === 'thermostat' && device.state.temperature && (
                      <span className="text-xs text-[#a0a0a8]">
                        {device.state.temperature}°C
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredDevices.length === 0 && (
        <motion.div variants={item}>
          <Card hoverable={false}>
            <div className="text-center py-8 text-[#6b6b70]">
              <Home size={32} className="mx-auto mb-2 opacity-50" />
              <p>Нет устройств</p>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
