import { CircleDashed, BatteryFull, BatteryMedium, BatteryLow, BatteryWarning } from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import type { DeviceCardProps, ButtonState } from '@/types/smart-home';

/**
 * Format button action for display.
 */
function formatAction(action: string | undefined): string {
  if (!action) return 'None';

  const actionMap: Record<string, string> = {
    single: 'Tap',
    double: 'Double',
    hold: 'Hold',
    release: 'Release',
    single_left: 'Tap L',
    single_right: 'Tap R',
    double_left: 'Double L',
    double_right: 'Double R',
    hold_left: 'Hold L',
    hold_right: 'Hold R',
  };

  return actionMap[action] || action;
}

/**
 * Get battery icon based on level.
 */
function BatteryIcon({ level }: { level: number }) {
  const size = 14;
  const className = level < 20 ? 'text-destructive' : level < 50 ? 'text-warning' : 'text-success';

  if (level < 20) return <BatteryWarning size={size} weight="fill" className={className} />;
  if (level < 50) return <BatteryLow size={size} weight="fill" className={className} />;
  if (level < 80) return <BatteryMedium size={size} weight="fill" className={className} />;
  return <BatteryFull size={size} weight="fill" className={className} />;
}

/**
 * Button card (read-only) showing last action and battery.
 */
export function ButtonCard({
  device,
  state,
  onDetailOpen,
}: DeviceCardProps) {
  const buttonState = state as ButtonState | null;
  const battery = buttonState?.battery ?? 0;
  const action = buttonState?.action;

  // Buttons are never "on" in the traditional sense
  const hasRecentAction = !!action;

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={hasRecentAction}
      isOffline={device.isOffline}
      icon={<CircleDashed size={20} weight="bold" />}
      onDetailOpen={onDetailOpen}
    >
      <div className="space-y-2 mt-1">
        {/* Last action */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">Last</span>
          <span className="text-xs font-medium text-white">
            {formatAction(action)}
          </span>
        </div>

        {/* Battery */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">Battery</span>
          <div className="flex items-center gap-1.5">
            <BatteryIcon level={battery} />
            <span className="text-xs font-medium text-white">{battery}%</span>
          </div>
        </div>
      </div>
    </DeviceCard>
  );
}

export default ButtonCard;
