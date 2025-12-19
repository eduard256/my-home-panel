import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { PlugsConnected } from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import type { DeviceCardProps, RelayState } from '@/types/smart-home';

/**
 * Toggle button component for relay channels.
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
 * Relay card for 2-channel relay devices.
 */
export function RelayCard({
  device,
  state,
  isConnected,
  onPublish,
  onDetailOpen,
}: DeviceCardProps) {
  const relayState = state as RelayState | null;

  // Determine if device is ON (any channel on)
  const isOn = relayState?.state_l1 === 'ON' || relayState?.state_l2 === 'ON';

  const l1Label = device.channelLabels?.l1 || 'Line 1';
  const l2Label = device.channelLabels?.l2 || 'Line 2';

  // Toggle handlers
  const toggleL1 = useCallback(async () => {
    const currentState = relayState?.state_l1 || 'OFF';
    await onPublish({ state_l1: currentState === 'ON' ? 'OFF' : 'ON' });
  }, [relayState, onPublish]);

  const toggleL2 = useCallback(async () => {
    const currentState = relayState?.state_l2 || 'OFF';
    await onPublish({ state_l2: currentState === 'ON' ? 'OFF' : 'ON' });
  }, [relayState, onPublish]);

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={isOn}
      isOffline={device.isOffline}
      icon={<PlugsConnected size={20} weight="fill" />}
      onDetailOpen={onDetailOpen}
    >
      <div className="flex gap-2 mt-1">
        <ToggleButton
          label={l1Label}
          isOn={relayState?.state_l1 === 'ON'}
          onClick={toggleL1}
          disabled={!isConnected || device.isOffline}
        />
        <ToggleButton
          label={l2Label}
          isOn={relayState?.state_l2 === 'ON'}
          onClick={toggleL2}
          disabled={!isConnected || device.isOffline}
        />
      </div>
    </DeviceCard>
  );
}

export default RelayCard;
