import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Lightbulb, Thermometer, Lock, Tv, Speaker, Fan, Power, Sun, Droplets, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, SkeletonCard } from '@/shared/components/ui';
import { smarthome } from '@/shared/api';
import { useUIStore } from '@/shared/stores';
import { AIChat } from '@/shared/components';
import type { SmartDevice } from '@/shared/types';

const deviceIcons: Record<string, React.ReactNode> = {
  light: <Lightbulb size={32} />,
  thermostat: <Thermometer size={32} />,
  lock: <Lock size={32} />,
  tv: <Tv size={32} />,
  speaker: <Speaker size={32} />,
  fan: <Fan size={32} />,
  switch: <Power size={32} />,
  default: <Power size={32} />,
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

export function DeviceDetail() {
  const { selectedDeviceId, isAIChatOpen } = useUIStore();
  const [device, setDevice] = useState<SmartDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!selectedDeviceId) return;

    const fetchDevice = async () => {
      try {
        const response = await smarthome.getDevice(selectedDeviceId);
        setDevice(response);
      } catch (error) {
        console.error('Failed to fetch device:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDevice();
    const interval = setInterval(fetchDevice, 5000);
    return () => clearInterval(interval);
  }, [selectedDeviceId]);

  const handleToggle = async () => {
    if (!device) return;
    setActionLoading(true);
    try {
      await smarthome.toggleDevice(device.id, !device.state.on);
      setDevice({ ...device, state: { ...device.state, on: !device.state.on } });
    } catch (error) {
      console.error('Failed to toggle device:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBrightnessChange = async (brightness: number) => {
    if (!device) return;
    try {
      await smarthome.setDeviceState(device.id, { brightness });
      setDevice({ ...device, state: { ...device.state, brightness } });
    } catch (error) {
      console.error('Failed to set brightness:', error);
    }
  };

  const handleTemperatureChange = async (temperature: number) => {
    if (!device) return;
    try {
      await smarthome.setDeviceState(device.id, { temperature });
      setDevice({ ...device, state: { ...device.state, temperature } });
    } catch (error) {
      console.error('Failed to set temperature:', error);
    }
  };

  // Show AI chat if open
  if (isAIChatOpen) {
    return <AIChat />;
  }

  // Show placeholder if no device selected
  if (!selectedDeviceId) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <div className="w-16 h-16 rounded-full bg-[#f59e0b]/10 flex items-center justify-center mx-auto mb-4">
            <Home size={32} className="text-[#f59e0b]" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Выберите устройство</h3>
          <p className="text-sm text-[#a0a0a8]">Кликните на устройство слева для управления</p>
        </div>
      </div>
    );
  }

  if (loading || !device) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const color = deviceColors[device.type] || deviceColors.default;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      {/* Header with glow */}
      <div className="relative sticky top-0 z-10 bg-[#0a0a0f]/90 backdrop-blur-lg p-6 border-b border-white/5">
        {device.state.on && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(circle at 50% 100%, ${color}, transparent 70%)`,
            }}
          />
        )}
        <div className="relative flex flex-col items-center text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transition-colors"
            style={{
              backgroundColor: device.state.on ? `${color}20` : 'rgba(255,255,255,0.05)',
              color: device.state.on ? color : '#6b6b70',
            }}
          >
            {deviceIcons[device.type] || deviceIcons.default}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{device.name}</h2>
          <span className="text-sm text-[#6b6b70] capitalize">{device.type}</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Main toggle */}
        <Card hoverable={false}>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Питание</h3>
                <p className="text-sm text-[#a0a0a8]">
                  {device.state.on ? 'Устройство включено' : 'Устройство выключено'}
                </p>
              </div>
              <button
                onClick={handleToggle}
                disabled={actionLoading}
                className={`w-16 h-9 rounded-full transition-colors relative ${
                  device.state.on ? 'bg-[#10b981]' : 'bg-white/10'
                }`}
              >
                <motion.div
                  className="absolute top-1.5 w-6 h-6 rounded-full bg-white shadow"
                  animate={{ left: device.state.on ? 36 : 6 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Light controls */}
        {device.type === 'light' && device.state.on && (
          <>
            {/* Brightness */}
            <Card hoverable={false}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun size={18} className="text-[#f59e0b]" />
                  Яркость
                </CardTitle>
                <span className="text-lg font-bold text-white">
                  {device.state.brightness || 100}%
                </span>
              </CardHeader>
              <CardContent>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={device.state.brightness || 100}
                  onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#f59e0b]"
                />
                <div className="flex justify-between mt-2 text-xs text-[#6b6b70]">
                  <span>1%</span>
                  <span>100%</span>
                </div>
              </CardContent>
            </Card>

            {/* Color temperature */}
            {device.state.color_temp !== undefined && (
              <Card hoverable={false}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets size={18} className="text-[#3b82f6]" />
                    Температура цвета
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {[2700, 4000, 5000, 6500].map((temp) => (
                      <button
                        key={temp}
                        onClick={() => smarthome.setDeviceState(device.id, { color_temp: temp })}
                        className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                          device.state.color_temp === temp
                            ? 'bg-[#3b82f6] text-white'
                            : 'bg-white/5 text-[#a0a0a8] hover:text-white'
                        }`}
                      >
                        {temp}K
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Thermostat controls */}
        {device.type === 'thermostat' && (
          <Card hoverable={false}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer size={18} className="text-[#3b82f6]" />
                Температура
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => handleTemperatureChange((device.state.temperature || 20) - 1)}
                  className="w-12 h-12 rounded-full bg-white/5 text-white text-2xl hover:bg-white/10 transition-colors"
                >
                  −
                </button>
                <div className="text-center">
                  <div className="text-5xl font-bold text-white">
                    {device.state.temperature || 20}°
                  </div>
                  <div className="text-sm text-[#a0a0a8] mt-1">Целевая</div>
                </div>
                <button
                  onClick={() => handleTemperatureChange((device.state.temperature || 20) + 1)}
                  className="w-12 h-12 rounded-full bg-white/5 text-white text-2xl hover:bg-white/10 transition-colors"
                >
                  +
                </button>
              </div>

              {device.state.current_temperature && (
                <div className="mt-6 p-4 rounded-lg bg-white/5 text-center">
                  <div className="text-sm text-[#a0a0a8]">Текущая температура</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {device.state.current_temperature}°C
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lock controls */}
        {device.type === 'lock' && (
          <Card hoverable={false}>
            <CardContent>
              <div className="text-center py-4">
                <div
                  className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors ${
                    device.state.locked ? 'bg-[#10b981]/20' : 'bg-[#ef4444]/20'
                  }`}
                >
                  <Lock
                    size={48}
                    className={device.state.locked ? 'text-[#10b981]' : 'text-[#ef4444]'}
                  />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  {device.state.locked ? 'Заблокировано' : 'Разблокировано'}
                </h3>
                <Button
                  variant={device.state.locked ? 'danger' : 'primary'}
                  onClick={() =>
                    smarthome.setDeviceState(device.id, { locked: !device.state.locked })
                  }
                  className="mt-4"
                >
                  {device.state.locked ? 'Разблокировать' : 'Заблокировать'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Device info */}
        <Card hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={18} className="text-[#6b6b70]" />
              Информация
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a8]">ID</span>
                <span className="text-white font-mono">{device.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a8]">Тип</span>
                <span className="text-white capitalize">{device.type}</span>
              </div>
              {device.manufacturer && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#a0a0a8]">Производитель</span>
                  <span className="text-white">{device.manufacturer}</span>
                </div>
              )}
              {device.model && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#a0a0a8]">Модель</span>
                  <span className="text-white">{device.model}</span>
                </div>
              )}
              {device.last_seen && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#a0a0a8]">Последняя активность</span>
                  <span className="text-white">
                    {new Date(device.last_seen).toLocaleString('ru-RU')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
