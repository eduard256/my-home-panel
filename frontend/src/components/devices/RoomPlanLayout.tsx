import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Device } from '@/types';
import { RGBStripCard } from './RGBStripCard';
import { CurtainCard } from './CurtainCard';

interface RoomPlanLayoutProps {
  devices: Device[];
  room: string;
}

/**
 * Room Plan Layout Component
 * Displays devices in a beautiful floor plan visualization
 */
export function RoomPlanLayout({ devices, room }: RoomPlanLayoutProps) {
  // Group devices by type for layout
  const devicesByType = useMemo(() => {
    const groups: Record<string, Device[]> = {
      lighting: [],
      curtains: [],
    };

    devices.forEach((device) => {
      if (device.type === 'dual-switch' || device.type === 'rgb-strip') {
        groups.lighting.push(device);
      } else if (device.type === 'curtain') {
        groups.curtains.push(device);
      }
    });

    return groups;
  }, [devices]);

  // Render device card based on type
  const renderDeviceCard = (device: Device) => {
    switch (device.type) {
      case 'rgb-strip':
        return <RGBStripCard key={device.id} device={device} />;
      case 'curtain':
        return <CurtainCard key={device.id} device={device} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Room Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-white mb-2">{room}'s Room</h2>
        <p className="text-muted">
          {devices.length} smart device{devices.length !== 1 ? 's' : ''} • Interactive control
        </p>
      </motion.div>

      {/* Lighting Section */}
      {devicesByType.lighting.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mb-4 px-1">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <h3 className="text-lg font-semibold text-white">💡 Lighting</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {devicesByType.lighting.map((device) => renderDeviceCard(device))}
          </div>
        </motion.section>
      )}

      {/* Curtains Section */}
      {devicesByType.curtains.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-4 px-1">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <h3 className="text-lg font-semibold text-white">🪟 Window Treatments</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {devicesByType.curtains.map((device) => renderDeviceCard(device))}
          </div>
        </motion.section>
      )}

      {/* Empty State */}
      {devices.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <span className="text-5xl">🏠</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No devices in {room}'s room</h3>
          <p className="text-muted max-w-md">
            Add smart devices to this room to control lighting, curtains, and more.
          </p>
        </motion.div>
      )}
    </div>
  );
}
