import { motion } from 'framer-motion';
import {
  PersonSimpleWalk,
  Eye,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Sun,
} from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import type { DeviceCardProps, MotionSensorState } from '@/types/smart-home';

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
 * Motion sensor card (read-only) showing occupancy and illuminance.
 */
export function MotionSensorCard({
  device,
  state,
  onDetailOpen,
}: DeviceCardProps) {
  const sensorState = state as MotionSensorState | null;
  const occupancy = sensorState?.occupancy ?? false;
  const illuminance = sensorState?.illuminance_lux ?? sensorState?.illuminance ?? 0;
  const battery = sensorState?.battery ?? 0;

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={occupancy}
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
      <div className="space-y-1.5 mt-1">
        {/* Motion status */}
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-medium ${
              occupancy ? 'text-primary' : 'text-muted'
            }`}
          >
            {occupancy ? 'Detected' : 'No motion'}
          </span>
        </div>

        {/* Illuminance */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <Sun size={12} weight="fill" />
          <span>{illuminance} lux</span>
        </div>

        {/* Battery */}
        {battery > 0 && (
          <div className="flex items-center gap-1.5">
            <BatteryIcon level={battery} />
            <span className="text-[11px] text-muted">{battery}%</span>
          </div>
        )}
      </div>
    </DeviceCard>
  );
}

export default MotionSensorCard;
