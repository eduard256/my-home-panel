import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import type { DeviceCardProps, SwitchState } from '@/types/smart-home';

/**
 * Single switch card with one large toggle button (like dual switch but full width).
 */
export function SingleSwitchCard({
  device,
  state,
  isConnected,
  onPublish,
  onDetailOpen,
}: DeviceCardProps) {
  const switchState = state as SwitchState | null;
  const isOn = switchState?.state_left === 'ON';

  const toggle = useCallback(async () => {
    const currentState = switchState?.state_left || 'OFF';
    await onPublish({ state_left: currentState === 'ON' ? 'OFF' : 'ON' });
  }, [switchState, onPublish]);

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={isOn}
      isOffline={device.isOffline}
      icon={<Lightbulb size={20} weight="fill" />}
      onDetailOpen={onDetailOpen}
    >
      <div className="mt-1">
        <motion.button
          whileTap={!(!isConnected || device.isOffline) ? { scale: 0.95 } : undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (!(!isConnected || device.isOffline)) {
              toggle();
            }
          }}
          disabled={!isConnected || device.isOffline}
          className={`
            w-full py-2.5 px-3 rounded-lg text-xs font-medium
            transition-all duration-200 select-none
            ${
              isOn
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-white/5 text-muted border border-white/5 hover:bg-white/10'
            }
            ${!isConnected || device.isOffline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="truncate">{device.channelLabels?.left || 'Light'}</span>
            <span className={`text-[10px] ${isOn ? 'text-primary' : 'text-muted/60'}`}>
              {isOn ? 'ON' : 'OFF'}
            </span>
          </div>
        </motion.button>
      </div>
    </DeviceCard>
  );
}

export default SingleSwitchCard;
