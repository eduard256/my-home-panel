import { motion } from 'framer-motion';
import { useDevice } from '@/hooks/useSmartHomeWS';
import type { DeviceConfig, RoomConfig } from '@/types/smart-home-new';
import {
  SwitchCard,
  SingleSwitchCard,
  SingleSwitchRightCard,
  DimmerCard,
  RelayCard,
  CurtainCard,
  RGBLightCard,
  YeelightStripCard,
  LEDStripCard,
  ButtonCard,
  MotionSensorCard,
  ContactSensorCard,
  BathroomSensorsCard,
  PresenceZonesCard,
} from './cards';

interface RoomSectionProps {
  room: RoomConfig;
  devices: DeviceConfig[];
}

/**
 * Individual device wrapper that subscribes to device state via useDevice() hook.
 */
function DeviceWrapper({ device }: { device: DeviceConfig }) {
  const { state, publish, isConnected } = useDevice(device.topic);

  const props = {
    device,
    state,
    isConnected,
    onPublish: publish,
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
      return <SwitchCard {...props} />;
    case 'bathroom_sensors':
      return <BathroomSensorsCard {...props} />;
    case 'presence_zones':
      return (
        <PresenceZonesCard
          device={device}
          isConnected={isConnected}
        />
      );
    default:
      return null;
  }
}

/**
 * Room statistics display.
 */
function RoomStats({ devices }: { devices: DeviceConfig[] }) {
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted">
      <span>{devices.length} devices</span>
    </div>
  );
}

/**
 * Room section component displaying room header and device grid.
 */
export function RoomSection({ room, devices }: RoomSectionProps) {
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

      {/* Device grid - fixed 2 columns */}
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
            <DeviceWrapper device={device} />
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
