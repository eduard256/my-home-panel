import { motion } from 'framer-motion';
import { Lamp, LampCeiling } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeviceControl } from '@/hooks';
import type { Device } from '@/types';

interface DualSwitchCardProps {
  device: Device;
}

/**
 * Dual Switch Card Component
 * Controls two independent lights (left/right)
 */
export function DualSwitchCard({ device }: DualSwitchCardProps) {
  const { setPayload, isPending } = useDeviceControl(device);

  const leftOn = device.state?.state_left === 'ON';
  const rightOn = device.state?.state_right === 'ON';

  const toggleLeft = () => {
    setPayload({ state_left: leftOn ? 'OFF' : 'ON' });
  };

  const toggleRight = () => {
    setPayload({ state_right: rightOn ? 'OFF' : 'ON' });
  };

  const toggleBoth = () => {
    const allOn = leftOn && rightOn;
    setPayload({
      state_left: allOn ? 'OFF' : 'ON',
      state_right: allOn ? 'OFF' : 'ON',
    });
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'card p-6 transition-all',
        (leftOn || rightOn) && 'border-primary/50 shadow-glow'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
              (leftOn || rightOn) ? 'bg-primary/30' : 'bg-white/10'
            )}
          >
            <LampCeiling className={cn('h-6 w-6', (leftOn || rightOn) ? 'text-primary' : 'text-muted')} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{device.name}</h3>
            <p className="text-sm text-muted">Dual Control</p>
          </div>
        </div>

        {/* All On/Off Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleBoth}
          disabled={isPending}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            (leftOn && rightOn)
              ? 'bg-primary text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
          )}
        >
          {(leftOn && rightOn) ? 'All OFF' : 'All ON'}
        </motion.button>
      </div>

      {/* Dual Control Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Light */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleLeft}
          disabled={isPending}
          className={cn(
            'group relative p-6 rounded-xl transition-all overflow-hidden',
            leftOn
              ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500/50'
              : 'bg-white/5 border-2 border-white/10 hover:border-white/20'
          )}
        >
          {/* Glow Effect */}
          {leftOn && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-transparent blur-xl"
            />
          )}

          <div className="relative flex flex-col items-center gap-3">
            <Lamp className={cn('h-8 w-8', leftOn ? 'text-amber-400' : 'text-muted')} />
            <div className="text-center">
              <p className="text-sm font-medium text-white">Side Light</p>
              <p className={cn('text-xs', leftOn ? 'text-amber-400' : 'text-muted')}>
                {leftOn ? 'ON' : 'OFF'}
              </p>
            </div>
          </div>
        </motion.button>

        {/* Right Light */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleRight}
          disabled={isPending}
          className={cn(
            'group relative p-6 rounded-xl transition-all overflow-hidden',
            rightOn
              ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-2 border-yellow-500/50'
              : 'bg-white/5 border-2 border-white/10 hover:border-white/20'
          )}
        >
          {/* Glow Effect */}
          {rightOn && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-gradient-to-br from-yellow-500/30 to-transparent blur-xl"
            />
          )}

          <div className="relative flex flex-col items-center gap-3">
            <LampCeiling className={cn('h-8 w-8', rightOn ? 'text-yellow-400' : 'text-muted')} />
            <div className="text-center">
              <p className="text-sm font-medium text-white">Ceiling</p>
              <p className={cn('text-xs', rightOn ? 'text-yellow-400' : 'text-muted')}>
                {rightOn ? 'ON' : 'OFF'}
              </p>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Link Quality */}
      {device.state?.linkquality !== undefined && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
          <div className="h-1 w-1 rounded-full bg-green-500" />
          Signal: {device.state.linkquality}
        </div>
      )}
    </motion.div>
  );
}
