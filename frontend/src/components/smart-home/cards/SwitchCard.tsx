import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, PlugsConnected } from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import type { DeviceCardProps, SwitchState, PlugState } from '@/types/smart-home';

interface SwitchCardProps extends DeviceCardProps {
  isSingleChannel?: boolean;
}

/**
 * Toggle button component for switch channels.
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
        if (!disabled) {
          onClick();
        }
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
 * iOS-style toggle switch for single channel devices.
 */
function ToggleSwitch({
  isOn,
  onClick,
  disabled,
}: {
  isOn: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm font-medium ${isOn ? 'text-white' : 'text-muted'}`}>
        {isOn ? 'On' : 'Off'}
      </span>
      <motion.button
        whileTap={!disabled ? { scale: 0.95 } : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) {
            onClick();
          }
        }}
        disabled={disabled}
        className={`
          relative w-12 h-7 rounded-full transition-all duration-300
          ${isOn ? 'bg-primary' : 'bg-white/10'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <motion.div
          initial={false}
          animate={{
            x: isOn ? 22 : 4,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
        />
      </motion.button>
    </div>
  );
}

/**
 * Switch card for 2-gang switches or single-channel plugs.
 */
export function SwitchCard({
  device,
  state,
  isConnected,
  onPublish,
  onDetailOpen,
  isSingleChannel = false,
}: SwitchCardProps) {
  const switchState = state as SwitchState | PlugState | null;

  // Determine if device is ON (any channel on)
  const isOn = isSingleChannel
    ? switchState?.state === 'ON'
    : (switchState as SwitchState)?.state_left === 'ON' ||
      (switchState as SwitchState)?.state_right === 'ON';

  const leftLabel = device.channelLabels?.left || 'Left';
  const rightLabel = device.channelLabels?.right || 'Right';

  // Toggle handlers
  const toggleLeft = useCallback(async () => {
    console.log('[SwitchCard] Toggle left clicked, current state:', switchState);
    const currentState = (switchState as SwitchState)?.state_left || 'OFF';
    const result = await onPublish({ state_left: currentState === 'ON' ? 'OFF' : 'ON' });
    console.log('[SwitchCard] Toggle left result:', result);
  }, [switchState, onPublish]);

  const toggleRight = useCallback(async () => {
    console.log('[SwitchCard] Toggle right clicked, current state:', switchState);
    const currentState = (switchState as SwitchState)?.state_right || 'OFF';
    const result = await onPublish({ state_right: currentState === 'ON' ? 'OFF' : 'ON' });
    console.log('[SwitchCard] Toggle right result:', result);
  }, [switchState, onPublish]);

  const toggleSingle = useCallback(async () => {
    console.log('[SwitchCard] Toggle single clicked, current state:', switchState);
    const currentState = switchState?.state || 'OFF';
    const result = await onPublish({ state: currentState === 'ON' ? 'OFF' : 'ON' });
    console.log('[SwitchCard] Toggle single result:', result);
  }, [switchState, onPublish]);

  // Use lightbulb icon for lights, plug icon for actual plugs
  const isActualPlug = device.type === 'plug' && device.name.toLowerCase().includes('plug');
  const icon = isActualPlug ? (
    <PlugsConnected size={20} weight="fill" />
  ) : (
    <Lightbulb size={20} weight="fill" />
  );

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={isOn}
      isOffline={device.isOffline}
      icon={icon}
      onDetailOpen={onDetailOpen}
    >
      {isSingleChannel ? (
        // Single channel with iOS-style toggle
        <div className="mt-2">
          <ToggleSwitch
            isOn={switchState?.state === 'ON'}
            onClick={toggleSingle}
            disabled={!isConnected || device.isOffline}
          />
        </div>
      ) : (
        // Dual channel (switch)
        <div className="flex gap-2 mt-1">
          <ToggleButton
            label={leftLabel}
            isOn={(switchState as SwitchState)?.state_left === 'ON'}
            onClick={toggleLeft}
            disabled={!isConnected || device.isOffline}
          />
          <ToggleButton
            label={rightLabel}
            isOn={(switchState as SwitchState)?.state_right === 'ON'}
            onClick={toggleRight}
            disabled={!isConnected || device.isOffline}
          />
        </div>
      )}
    </DeviceCard>
  );
}

export default SwitchCard;
