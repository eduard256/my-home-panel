import { motion } from 'framer-motion';
import {
  DoorOpen,
  Door,
  PersonSimpleWalk,
  Eye,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
} from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import { useMQTT } from '@/hooks/useMQTT';
import type { DeviceCardProps, MotionSensorState, ContactSensorState } from '@/types/smart-home';

/**
 * Get battery icon based on level.
 */
function BatteryIcon({ level }: { level: number }) {
  const size = 12;
  const className = level < 20 ? 'text-destructive' : level < 50 ? 'text-warning' : 'text-success';

  if (level < 20) return <BatteryWarning size={size} weight="fill" className={className} />;
  if (level < 50) return <BatteryLow size={size} weight="fill" className={className} />;
  if (level < 80) return <BatteryMedium size={size} weight="fill" className={className} />;
  return <BatteryFull size={size} weight="fill" className={className} />;
}

/**
 * Combined bathroom sensors card showing both motion and door contact.
 */
export function BathroomSensorsCard({
  device,
  onDetailOpen,
}: DeviceCardProps) {
  // Subscribe to both sensors
  const { state: motionState } = useMQTT('zigbee2mqtt/main-wc1-room-motion_sensor');
  const { state: doorState } = useMQTT('zigbee2mqtt/main-wc1-door-contact_sensor');

  const motion_data = motionState as MotionSensorState | null;
  const door_data = doorState as ContactSensorState | null;

  const occupancy = motion_data?.occupancy ?? false;
  const isOpen = door_data?.contact === false;
  const motionBattery = motion_data?.battery ?? 0;
  const doorBattery = door_data?.battery ?? 0;

  // Card is "on" if there's motion or door is open
  const isActive = occupancy || isOpen;

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={isActive}
      isOffline={device.isOffline}
      icon={
        occupancy ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
          >
            <PersonSimpleWalk size={20} weight="fill" />
          </motion.div>
        ) : (
          <Eye size={20} weight="regular" />
        )
      }
      onDetailOpen={onDetailOpen}
    >
      <div className="space-y-2 mt-1">
        {/* Motion and Door status row */}
        <div className="flex gap-2">
          {/* Motion */}
          <div
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium
              ${occupancy ? 'bg-primary/15 text-primary' : 'bg-white/5 text-muted'}
            `}
          >
            {occupancy ? (
              <PersonSimpleWalk size={14} weight="fill" />
            ) : (
              <Eye size={14} weight="regular" />
            )}
            <span>{occupancy ? 'Detected' : 'No motion'}</span>
          </div>

          {/* Door */}
          <div
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium
              ${isOpen ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}
            `}
          >
            {isOpen ? (
              <DoorOpen size={14} weight="fill" />
            ) : (
              <Door size={14} weight="fill" />
            )}
            <span>{isOpen ? 'Open' : 'Closed'}</span>
          </div>
        </div>

        {/* Battery indicators */}
        <div className="flex justify-between text-[10px] text-muted px-1">
          {motionBattery > 0 && (
            <div className="flex items-center gap-1">
              <BatteryIcon level={motionBattery} />
              <span>{motionBattery}%</span>
            </div>
          )}
          {doorBattery > 0 && (
            <div className="flex items-center gap-1">
              <BatteryIcon level={doorBattery} />
              <span>{doorBattery}%</span>
            </div>
          )}
        </div>
      </div>
    </DeviceCard>
  );
}

export default BathroomSensorsCard;
