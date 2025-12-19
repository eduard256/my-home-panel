import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Power } from '@phosphor-icons/react';
import type { DeviceConfig, DeviceState, SwitchState, RelayState, PlugState, PublishPayload } from '@/types/smart-home';

interface SwitchDetailProps {
  device: DeviceConfig;
  state: DeviceState | null;
  isConnected: boolean;
  onPublish: (payload: PublishPayload) => Promise<boolean>;
}

/**
 * Large toggle button for switch controls.
 */
function LargeToggleButton({
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
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 flex flex-col items-center justify-center gap-3 p-6 rounded-2xl
        transition-all duration-300
        ${
          isOn
            ? 'bg-gradient-to-br from-primary/20 to-primary/30 border border-primary/40 shadow-[0_0_30px_rgba(139,92,246,0.2)]'
            : 'bg-white/5 border border-white/10 hover:bg-white/10'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <motion.div
        animate={isOn ? { scale: [1, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Power
          size={32}
          weight={isOn ? 'fill' : 'regular'}
          className={isOn ? 'text-primary' : 'text-muted'}
        />
      </motion.div>
      <div className="text-center">
        <div className="text-sm font-medium text-white mb-1">{label}</div>
        <div className={`text-xs ${isOn ? 'text-primary' : 'text-muted'}`}>
          {isOn ? 'ON' : 'OFF'}
        </div>
      </div>
    </motion.button>
  );
}

/**
 * Switch detail panel with large toggle buttons.
 */
export function SwitchDetail({
  device,
  state,
  isConnected,
  onPublish,
}: SwitchDetailProps) {
  const isSingleChannel = device.type === 'plug';
  const isRelay = device.type === 'relay';

  // Single channel toggle
  const toggleSingle = useCallback(async () => {
    const currentState = (state as PlugState)?.state || 'OFF';
    await onPublish({ state: currentState === 'ON' ? 'OFF' : 'ON' });
  }, [state, onPublish]);

  // Dual channel toggles for switch
  const toggleLeft = useCallback(async () => {
    const currentState = (state as SwitchState)?.state_left || 'OFF';
    await onPublish({ state_left: currentState === 'ON' ? 'OFF' : 'ON' });
  }, [state, onPublish]);

  const toggleRight = useCallback(async () => {
    const currentState = (state as SwitchState)?.state_right || 'OFF';
    await onPublish({ state_right: currentState === 'ON' ? 'OFF' : 'ON' });
  }, [state, onPublish]);

  // Dual channel toggles for relay
  const toggleL1 = useCallback(async () => {
    const currentState = (state as RelayState)?.state_l1 || 'OFF';
    await onPublish({ state_l1: currentState === 'ON' ? 'OFF' : 'ON' });
  }, [state, onPublish]);

  const toggleL2 = useCallback(async () => {
    const currentState = (state as RelayState)?.state_l2 || 'OFF';
    await onPublish({ state_l2: currentState === 'ON' ? 'OFF' : 'ON' });
  }, [state, onPublish]);

  const disabled = !isConnected || device.isOffline;

  if (isSingleChannel) {
    const plugState = state as PlugState | null;
    return (
      <div className="flex justify-center">
        <LargeToggleButton
          label={device.name}
          isOn={plugState?.state === 'ON'}
          onClick={toggleSingle}
          disabled={disabled}
        />
      </div>
    );
  }

  if (isRelay) {
    const relayState = state as RelayState | null;
    const l1Label = device.channelLabels?.l1 || 'Line 1';
    const l2Label = device.channelLabels?.l2 || 'Line 2';

    return (
      <div className="flex gap-4">
        <LargeToggleButton
          label={l1Label}
          isOn={relayState?.state_l1 === 'ON'}
          onClick={toggleL1}
          disabled={disabled}
        />
        <LargeToggleButton
          label={l2Label}
          isOn={relayState?.state_l2 === 'ON'}
          onClick={toggleL2}
          disabled={disabled}
        />
      </div>
    );
  }

  // Default: dual-gang switch
  const switchState = state as SwitchState | null;
  const leftLabel = device.channelLabels?.left || 'Left';
  const rightLabel = device.channelLabels?.right || 'Right';

  return (
    <div className="flex gap-4">
      <LargeToggleButton
        label={leftLabel}
        isOn={switchState?.state_left === 'ON'}
        onClick={toggleLeft}
        disabled={disabled}
      />
      <LargeToggleButton
        label={rightLabel}
        isOn={switchState?.state_right === 'ON'}
        onClick={toggleRight}
        disabled={disabled}
      />
    </div>
  );
}

export default SwitchDetail;
