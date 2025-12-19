import { motion } from 'framer-motion';
import {
  DoorOpen,
  Door,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
} from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import type { DeviceCardProps, ContactSensorState } from '@/types/smart-home';

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
 * Contact sensor card (read-only) showing open/closed state.
 */
export function ContactSensorCard({
  device,
  state,
  onDetailOpen,
}: DeviceCardProps) {
  const sensorState = state as ContactSensorState | null;
  // contact: true = closed, false = open (standard Zigbee2MQTT behavior)
  const isOpen = sensorState?.contact === false;
  const battery = sensorState?.battery ?? 0;

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={isOpen}
      isOffline={device.isOffline}
      icon={
        isOpen ? (
          <motion.div
            animate={{ rotate: [0, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <DoorOpen size={20} weight="fill" />
          </motion.div>
        ) : (
          <Door size={20} weight="fill" />
        )
      }
      onDetailOpen={onDetailOpen}
    >
      <div className="space-y-2 mt-1">
        {/* Status */}
        <div
          className={`
            text-sm font-medium text-center py-1.5 rounded-lg
            ${
              isOpen
                ? 'bg-warning/10 text-warning'
                : 'bg-success/10 text-success'
            }
          `}
        >
          {isOpen ? 'Open' : 'Closed'}
        </div>

        {/* Battery */}
        {battery > 0 && (
          <div className="flex items-center justify-center gap-1.5">
            <BatteryIcon level={battery} />
            <span className="text-[11px] text-muted">{battery}%</span>
          </div>
        )}
      </div>
    </DeviceCard>
  );
}

export default ContactSensorCard;
