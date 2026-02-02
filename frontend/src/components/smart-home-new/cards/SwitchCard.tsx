import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, PlugsConnected } from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import type { DeviceCardProps, SwitchState } from '@/types/smart-home-new';

/**
 * Toggle button for switch channels.
 */
function ToggleButton({
  label,
  isOn,
  onClick,
  disabled,
}: {
  label: string;
  isOn: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={`
        flex-1 py-2.5 px-3 rounded-lg text-xs font-medium
        transition-all duration-200 select-none
        ${
          isOn
            ? 'bg-primary/20 text-primary border border-primary/30'
            : 'bg-white/5 text-muted border border-white/5 hover:bg-white/10'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="truncate">{label}</span>
        <span className={`text-[10px] ${isOn ? 'text-primary' : 'text-muted/60'}`}>
          {isOn ? 'ON' : 'OFF'}
        </span>
      </div>
    </motion.button>
  );
}

/**
 * Dual switch card with left/right channels.
 */
export function SwitchCard({
  device,
  state,
  isConnected,
  onPublish,
}: DeviceCardProps) {
  const switchState = state as SwitchState | null;
  const isOn =
    switchState?.state_left === 'ON' || switchState?.state_right === 'ON';

  const leftLabel = device.channelLabels?.left || 'Left';
  const rightLabel = device.channelLabels?.right || 'Right';

  const toggleLeft = useCallback(() => {
    const currentState = switchState?.state_left || 'OFF';
    onPublish({ state_left: currentState === 'ON' ? 'OFF' : 'ON' });
  }, [switchState, onPublish]);

  const toggleRight = useCallback(() => {
    const currentState = switchState?.state_right || 'OFF';
    onPublish({ state_right: currentState === 'ON' ? 'OFF' : 'ON' });
  }, [switchState, onPublish]);

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={isOn}
      isOffline={device.isOffline}
      icon={<Lightbulb size={20} weight="fill" />}
    >
      <div className="flex gap-2 mt-1">
        <ToggleButton
          label={leftLabel}
          isOn={switchState?.state_left === 'ON'}
          onClick={toggleLeft}
          disabled={!isConnected || device.isOffline}
        />
        <ToggleButton
          label={rightLabel}
          isOn={switchState?.state_right === 'ON'}
          onClick={toggleRight}
          disabled={!isConnected || device.isOffline}
        />
      </div>
    </DeviceCard>
  );
}
