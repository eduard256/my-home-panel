import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb,
  Sun,
  Moon,
  Thermometer,
  Power,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevices, useDeviceControl } from '@/hooks';
import { ROOM_COLORS } from '@/config/devices';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RoomPlanLayout } from '@/components/devices';
import type { Device } from '@/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Lightbulb,
  Sun,
  Moon,
  Thermometer,
  Power,
};

/**
 * Switch Device Card
 */
function SwitchCard({ device }: { device: Device }) {
  const { toggle, isPending } = useDeviceControl(device);
  const Icon = iconMap[device.icon] || Lightbulb;
  const isOn = device.state?.state === 'ON';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'card p-4 transition-all',
        isOn && 'border-primary/50 shadow-glow'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
              isOn ? 'bg-primary/30' : 'bg-white/10'
            )}
          >
            <Icon className={cn('h-5 w-5', isOn ? 'text-primary' : 'text-muted')} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{device.name}</h3>
            <p className="text-tiny text-muted">{device.room}</p>
          </div>
        </div>

        <Switch
          checked={isOn}
          onCheckedChange={() => toggle()}
          disabled={isPending}
        />
      </div>

      {/* Status Info */}
      <div className="flex items-center gap-4 text-xs text-muted">
        {device.state?.power !== undefined && (
          <span>{device.state.power}W</span>
        )}
        {device.state?.linkquality !== undefined && (
          <span className="flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            {device.state.linkquality}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Dimmer Device Card
 */
function DimmerCard({ device }: { device: Device }) {
  const { setState, setBrightness, isPending } = useDeviceControl(device);
  const Icon = iconMap[device.icon] || Sun;
  const isOn = device.state?.state === 'ON';
  const brightness = device.state?.brightness || 0;
  const brightnessPercent = Math.round((brightness / 255) * 100);

  const handleBrightnessChange = (value: number[]) => {
    const newBrightness = Math.round((value[0] / 100) * 255);
    setBrightness(newBrightness);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'card p-4 transition-all',
        isOn && 'border-primary/50 shadow-glow'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
              isOn ? 'bg-primary/30' : 'bg-white/10'
            )}
          >
            <Icon className={cn('h-5 w-5', isOn ? 'text-primary' : 'text-muted')} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{device.name}</h3>
            <p className="text-tiny text-muted">{device.room}</p>
          </div>
        </div>

        <span className="text-lg font-bold text-white">{brightnessPercent}%</span>
      </div>

      {/* Brightness Slider */}
      <div className="mb-4">
        <Slider
          value={[brightnessPercent]}
          onValueChange={handleBrightnessChange}
          max={100}
          step={5}
          disabled={isPending}
        />
      </div>

      {/* ON/OFF Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setState('ON')}
          disabled={isPending || isOn}
          className={cn(
            'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
            isOn
              ? 'bg-primary text-white'
              : 'bg-white/10 text-muted hover:bg-white/20 hover:text-white'
          )}
        >
          ON
        </button>
        <button
          onClick={() => setState('OFF')}
          disabled={isPending || !isOn}
          className={cn(
            'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
            !isOn
              ? 'bg-white/20 text-white'
              : 'bg-white/10 text-muted hover:bg-white/20 hover:text-white'
          )}
        >
          OFF
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Sensor Device Card
 */
function SensorCard({ device }: { device: Device }) {
  const Icon = iconMap[device.icon] || Thermometer;
  const temperature = device.state?.temperature;
  const humidity = device.state?.humidity;
  const battery = device.state?.battery;

  return (
    <motion.div whileHover={{ scale: 1.02 }} className="card p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
          <Icon className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">{device.name}</h3>
          <p className="text-tiny text-muted">{device.room}</p>
        </div>
      </div>

      {/* Readings */}
      <div className="flex items-end gap-4">
        {temperature !== undefined && (
          <div>
            <span className="text-3xl font-bold text-white">
              {temperature.toFixed(1)}
            </span>
            <span className="text-lg text-muted">°C</span>
          </div>
        )}

        {humidity !== undefined && (
          <div>
            <span className="text-lg font-semibold text-white">{humidity}</span>
            <span className="text-sm text-muted">%</span>
          </div>
        )}
      </div>

      {/* Battery */}
      {battery !== undefined && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {battery < 20 ? (
            <BatteryLow className="h-4 w-4 text-destructive" />
          ) : (
            <Battery className="h-4 w-4 text-muted" />
          )}
          <span className={cn(battery < 20 ? 'text-destructive' : 'text-muted')}>
            {battery}%
          </span>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Device Card Router
 */
function DeviceCard({ device }: { device: Device }) {
  switch (device.type) {
    case 'switch':
      return <SwitchCard device={device} />;
    case 'dimmer':
      return <DimmerCard device={device} />;
    case 'sensor':
      return <SensorCard device={device} />;
    default:
      return <SwitchCard device={device} />;
  }
}

/**
 * Room Section
 * Renders different layouts based on room
 */
function RoomSection({ room, devices }: { room: string; devices: Device[] }) {
  const bgColor = ROOM_COLORS[room] || ROOM_COLORS.Other;

  // Use special layout for Vadim's room
  if (room === 'Vadim') {
    return (
      <div className="mb-8 last:mb-0">
        <RoomPlanLayout devices={devices} room={room} />
      </div>
    );
  }

  // Default grid layout for other rooms
  return (
    <div className="mb-8 last:mb-0">
      {/* Room Header */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <h3 className="text-lg font-semibold text-white">{room}</h3>
        <span className="text-sm text-muted">({devices.length})</span>
      </div>

      {/* Devices Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 rounded-2xl"
        style={{ backgroundColor: bgColor }}
      >
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>
    </div>
  );
}

/**
 * DevicesSection - Smart devices with room grouping
 */
export function DevicesSection() {
  const { devices, isConnected } = useDevices();

  // Group devices by room
  const devicesByRoom = useMemo(() => {
    const groups: Record<string, Device[]> = {};

    devices.forEach((device) => {
      const room = device.room || 'Other';
      if (!groups[room]) {
        groups[room] = [];
      }
      groups[room].push(device);
    });

    return groups;
  }, [devices]);

  const rooms = Object.keys(devicesByRoom).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h2 font-semibold text-white">Smart Devices</h2>
            <p className="text-sm text-muted mt-1">
              {devices.length} device{devices.length !== 1 ? 's' : ''} in{' '}
              {rooms.length} room{rooms.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Connection Status */}
          <Badge
            variant={isConnected ? 'success' : 'destructive'}
            className="flex items-center gap-1"
          >
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Disconnected
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {devices.length > 0 ? (
            rooms.map((room) => (
              <RoomSection
                key={room}
                room={room}
                devices={devicesByRoom[room]}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lightbulb className="h-12 w-12 text-muted mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No devices configured</h3>
              <p className="text-sm text-muted">
                Add devices to src/config/devices.ts to see them here.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
