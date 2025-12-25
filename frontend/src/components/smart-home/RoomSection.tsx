import { motion } from 'framer-motion';
import type { DeviceConfig, RoomConfig } from '@/types/smart-home';
import { useMQTT } from '@/hooks/useMQTT';
import { SwitchCard } from './cards/SwitchCard';
import { DimmerCard } from './cards/DimmerCard';
import { RelayCard } from './cards/RelayCard';
import { CurtainCard } from './cards/CurtainCard';
import { RGBLightCard } from './cards/RGBLightCard';
import { YeelightStripCard } from './cards/YeelightStripCard';
import { LEDStripCard } from './cards/LEDStripCard';
import { ButtonCard } from './cards/ButtonCard';
import { MotionSensorCard } from './cards/MotionSensorCard';
import { ContactSensorCard } from './cards/ContactSensorCard';
import { BathroomSensorsCard } from './cards/BathroomSensorsCard';
import { SingleSwitchCard } from './cards/SingleSwitchCard';
import { SingleSwitchRightCard } from './cards/SingleSwitchRightCard';
import { PresenceZonesCard } from './cards/PresenceZonesCard';

interface RoomSectionProps {
  room: RoomConfig;
  devices: DeviceConfig[];
  onDeviceDetailOpen: (device: DeviceConfig) => void;
}

/**
 * Individual device wrapper with MQTT hook.
 */
function DeviceWrapper({
  device,
  onDetailOpen,
}: {
  device: DeviceConfig;
  onDetailOpen: () => void;
}) {
  const { state, publish, isConnected } = useMQTT(device.topic);

  const props = {
    device,
    state,
    isConnected,
    onPublish: publish,
    onDetailOpen,
  };

  switch (device.type) {
    case 'switch':
      return <SwitchCard {...props} />;
    case 'single_switch':
      return <SingleSwitchCard {...props} />;
    case 'single_switch_right':
      return <SingleSwitchRightCard {...props} />;
    case 'dimmer':
      return <DimmerCard {...props} />;
    case 'relay':
      return <RelayCard {...props} />;
    case 'curtain':
      return <CurtainCard {...props} />;
    case 'rgb_light':
      return <RGBLightCard {...props} />;
    case 'yeelight_strip':
      return <YeelightStripCard {...props} />;
    case 'led_strip':
      return <LEDStripCard {...props} />;
    case 'button':
      return <ButtonCard {...props} />;
    case 'motion_sensor':
      return <MotionSensorCard {...props} />;
    case 'contact_sensor':
      return <ContactSensorCard {...props} />;
    case 'plug':
      return <SwitchCard {...props} isSingleChannel />;
    case 'bathroom_sensors':
      return <BathroomSensorsCard {...props} />;
    case 'presence_zones':
      return (
        <PresenceZonesCard
          device={device}
          isConnected={isConnected}
          onDetailOpen={onDetailOpen}
        />
      );
    default:
      return null;
  }
}

/**
 * Room statistics calculator component.
 */
function RoomStats({ devices }: { devices: DeviceConfig[] }) {
  // This component subscribes to all devices in the room to calculate stats
  // In a real implementation, we'd aggregate this differently
  // For now, we'll just display the device count
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted">
      <span>{devices.length} devices</span>
    </div>
  );
}

/**
 * Room section component displaying room header and device grid.
 */
export function RoomSection({ room, devices, onDeviceDetailOpen }: RoomSectionProps) {
  if (devices.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className="mb-[49px]"
      style={{ breakInside: 'avoid' }}
    >
      {/* Room header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">{room.displayName}</h2>
        <RoomStats devices={devices} />
      </div>

      {/* Device grid - fixed 2 columns like mobile */}
      <motion.div className="grid grid-cols-2 gap-3">
        {devices.map((device, index) => (
          <motion.div
            key={device.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
              delay: index * 0.05,
            }}
            className={device.size === '2x1' ? 'col-span-2' : 'col-span-1'}
            style={{
              gridColumn: device.size === '2x1' ? 'span 2' : 'span 1',
            }}
          >
            <DeviceWrapper
              device={device}
              onDetailOpen={() => onDeviceDetailOpen(device)}
            />
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

export default RoomSection;
