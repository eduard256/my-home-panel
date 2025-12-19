import { motion } from 'framer-motion';
import {
  PersonSimpleWalk,
  Eye,
  Door,
  DoorOpen,
  CircleDashed,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Sun,
  Thermometer,
} from '@phosphor-icons/react';
import type { DeviceConfig, DeviceState, ButtonState, MotionSensorState, ContactSensorState } from '@/types/smart-home';

interface SensorDetailProps {
  device: DeviceConfig;
  state: DeviceState | null;
}

/**
 * Get battery icon and color based on level.
 */
function BatteryStatus({ level }: { level: number }) {
  const size = 24;
  const className = level < 20 ? 'text-destructive' : level < 50 ? 'text-warning' : 'text-success';
  const bgClass = level < 20 ? 'bg-destructive/10' : level < 50 ? 'bg-warning/10' : 'bg-success/10';

  const Icon = () => {
    if (level < 20) return <BatteryWarning size={size} weight="fill" className={className} />;
    if (level < 50) return <BatteryLow size={size} weight="fill" className={className} />;
    if (level < 80) return <BatteryMedium size={size} weight="fill" className={className} />;
    return <BatteryFull size={size} weight="fill" className={className} />;
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl ${bgClass}`}>
      <Icon />
      <div>
        <div className="text-xs text-muted">Battery</div>
        <div className={`text-lg font-semibold ${className}`}>{level}%</div>
      </div>
    </div>
  );
}

/**
 * Stat card component.
 */
function StatCard({
  icon,
  label,
  value,
  valueColor = 'text-white',
  bgColor = 'bg-white/5',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueColor?: string;
  bgColor?: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl ${bgColor}`}>
      {icon}
      <div>
        <div className="text-xs text-muted">{label}</div>
        <div className={`text-lg font-semibold ${valueColor}`}>{value}</div>
      </div>
    </div>
  );
}

/**
 * Button sensor detail view.
 */
function ButtonDetail({ state }: { state: ButtonState | null }) {
  const formatAction = (action: string | undefined): string => {
    if (!action) return 'None';
    const actionMap: Record<string, string> = {
      single: 'Single Tap',
      double: 'Double Tap',
      hold: 'Hold',
      release: 'Release',
      single_left: 'Tap Left',
      single_right: 'Tap Right',
      double_left: 'Double Left',
      double_right: 'Double Right',
      hold_left: 'Hold Left',
      hold_right: 'Hold Right',
    };
    return actionMap[action] || action;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center mb-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-primary"
        >
          <CircleDashed size={64} weight="bold" />
        </motion.div>
      </div>

      <StatCard
        icon={<CircleDashed size={24} className="text-primary" />}
        label="Last Action"
        value={formatAction(state?.action)}
        valueColor="text-primary"
        bgColor="bg-primary/10"
      />

      {state?.battery !== undefined && <BatteryStatus level={state.battery} />}
    </div>
  );
}

/**
 * Motion sensor detail view.
 */
function MotionDetail({ state }: { state: MotionSensorState | null }) {
  const occupancy = state?.occupancy ?? false;
  const illuminance = state?.illuminance_lux ?? state?.illuminance ?? 0;
  const temperature = state?.device_temperature;

  return (
    <div className="space-y-4">
      {/* Large status indicator */}
      <div
        className={`
          flex flex-col items-center justify-center p-8 rounded-2xl
          ${occupancy ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 border border-white/10'}
        `}
      >
        <motion.div
          animate={occupancy ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, repeat: occupancy ? Infinity : 0, repeatDelay: 1 }}
        >
          {occupancy ? (
            <PersonSimpleWalk size={64} weight="fill" className="text-primary" />
          ) : (
            <Eye size={64} weight="regular" className="text-muted" />
          )}
        </motion.div>
        <div className={`mt-4 text-xl font-semibold ${occupancy ? 'text-primary' : 'text-muted'}`}>
          {occupancy ? 'Motion Detected' : 'No Motion'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Sun size={24} className="text-warning" />}
          label="Illuminance"
          value={`${illuminance} lux`}
        />

        {temperature !== undefined && (
          <StatCard
            icon={<Thermometer size={24} className="text-destructive" />}
            label="Temperature"
            value={`${temperature}C`}
          />
        )}
      </div>

      {state?.battery !== undefined && <BatteryStatus level={state.battery} />}
    </div>
  );
}

/**
 * Contact sensor detail view.
 */
function ContactDetail({ state }: { state: ContactSensorState | null }) {
  // contact: true = closed, false = open
  const isOpen = state?.contact === false;

  return (
    <div className="space-y-4">
      {/* Large status indicator */}
      <div
        className={`
          flex flex-col items-center justify-center p-8 rounded-2xl
          ${isOpen ? 'bg-warning/20 border border-warning/30' : 'bg-success/20 border border-success/30'}
        `}
      >
        <motion.div
          animate={isOpen ? { rotate: [0, -10, 0] } : { rotate: 0 }}
          transition={{ duration: 0.5, repeat: isOpen ? Infinity : 0, repeatDelay: 2 }}
        >
          {isOpen ? (
            <DoorOpen size={64} weight="fill" className="text-warning" />
          ) : (
            <Door size={64} weight="fill" className="text-success" />
          )}
        </motion.div>
        <div className={`mt-4 text-xl font-semibold ${isOpen ? 'text-warning' : 'text-success'}`}>
          {isOpen ? 'Open' : 'Closed'}
        </div>
      </div>

      {state?.battery !== undefined && <BatteryStatus level={state.battery} />}
    </div>
  );
}

/**
 * Sensor detail panel for buttons, motion sensors, and contact sensors.
 */
export function SensorDetail({ device, state }: SensorDetailProps) {
  switch (device.type) {
    case 'button':
      return <ButtonDetail state={state as ButtonState | null} />;
    case 'motion_sensor':
      return <MotionDetail state={state as MotionSensorState | null} />;
    case 'contact_sensor':
      return <ContactDetail state={state as ContactSensorState | null} />;
    default:
      return (
        <div className="text-center text-muted py-8">
          <p>Sensor data not available</p>
        </div>
      );
  }
}

export default SensorDetail;
