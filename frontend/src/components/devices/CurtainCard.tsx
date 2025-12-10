import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Square, Sun, Moon, Sunset } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeviceControl } from '@/hooks';
import { Slider } from '@/components/ui/slider';
import type { Device } from '@/types';

interface CurtainCardProps {
  device: Device;
}

const PRESETS = [
  { position: 100, label: 'Fully Open', icon: Sun, description: 'Maximum light' },
  { position: 50, label: 'Half Open', icon: Sunset, description: 'Partial light' },
  { position: 0, label: 'Closed', icon: Moon, description: 'Privacy mode' },
];

/**
 * Animated Curtain Card Component
 * Beautiful visualization with position slider and presets
 */
export function CurtainCard({ device }: CurtainCardProps) {
  const { setPayload, isPending } = useDeviceControl(device);

  const currentPosition = device.state?.position ?? 0;
  const [localPosition, setLocalPosition] = useState(currentPosition);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sync local state with device state
  useEffect(() => {
    setLocalPosition(currentPosition);
  }, [currentPosition]);

  const handlePositionChange = (value: number[]) => {
    const newPosition = value[0];
    setLocalPosition(newPosition);
  };

  const handlePositionCommit = () => {
    if (localPosition !== currentPosition) {
      setIsAnimating(true);
      setPayload({ position: localPosition });
      setTimeout(() => setIsAnimating(false), 1000);
    }
  };

  const handlePresetClick = (position: number) => {
    setLocalPosition(position);
    setIsAnimating(true);
    setPayload({ position });
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const handleStop = () => {
    setPayload({ state: 'STOP' });
    setIsAnimating(false);
  };

  // Calculate curtain visual state
  const curtainHeight = 100 - localPosition; // 0 = fully open, 100 = closed

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="card p-6 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20">
            <ChevronDown className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{device.name}</h3>
            <p className="text-sm text-muted">{localPosition}% Open</p>
          </div>
        </div>

        {/* Stop Button */}
        {isAnimating && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStop}
            className="px-4 py-2 rounded-lg bg-destructive text-white font-medium text-sm hover:bg-destructive/90 transition-colors"
          >
            <Square className="h-4 w-4" />
          </motion.button>
        )}
      </div>

      {/* Curtain Visualization */}
      <div className="mb-6 relative">
        {/* Window Frame */}
        <div className="relative h-64 bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200 rounded-2xl overflow-hidden border-4 border-white/10">
          {/* Sun/Light Effect */}
          <motion.div
            animate={{ opacity: localPosition / 100 }}
            className="absolute inset-0"
          >
            {/* Sun */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.6, 0.8, 0.6],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-8 right-8 w-16 h-16 bg-yellow-300 rounded-full blur-sm"
            />
            <div className="absolute top-8 right-8 w-16 h-16 bg-yellow-400 rounded-full" />

            {/* Light Rays */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  opacity: [0.2, 0.4, 0.2],
                  scaleX: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="absolute bg-yellow-200/30"
                style={{
                  top: `${30 + i * 10}%`,
                  left: '60%',
                  width: '40%',
                  height: '2px',
                  transformOrigin: 'left',
                  transform: `rotate(${-20 + i * 10}deg)`,
                }}
              />
            ))}
          </motion.div>

          {/* Curtain */}
          <AnimatePresence>
            <motion.div
              className="absolute inset-x-0 top-0 bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-900"
              animate={{
                height: `${curtainHeight}%`,
              }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
              }}
            >
              {/* Curtain Texture */}
              <div className="absolute inset-0 opacity-20">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-y-0 w-px bg-white/40"
                    style={{ left: `${(i + 1) * 8}%` }}
                  />
                ))}
              </div>

              {/* Curtain Shadow */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />

              {/* Bottom Edge */}
              <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-b from-transparent to-black/40" />
            </motion.div>
          </AnimatePresence>

          {/* Window Sill */}
          <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-b from-gray-700 to-gray-800" />
        </div>

        {/* Position Percentage Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg"
        >
          {localPosition}%
        </motion.div>
      </div>

      {/* Position Slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-white">Position</label>
          <div className="flex items-center gap-2 text-xs text-muted">
            <ChevronUp className="h-3 w-3" />
            <span>Open</span>
            <span className="mx-1">•</span>
            <span>Closed</span>
            <ChevronDown className="h-3 w-3" />
          </div>
        </div>

        <Slider
          value={[localPosition]}
          onValueChange={handlePositionChange}
          onValueCommit={handlePositionCommit}
          max={100}
          step={1}
          disabled={isPending || isAnimating}
          className="mb-2"
        />
      </div>

      {/* Quick Presets */}
      <div>
        <label className="text-sm font-medium text-white mb-3 block">Quick Presets</label>
        <div className="grid grid-cols-3 gap-3">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isActive = Math.abs(localPosition - preset.position) < 5;

            return (
              <motion.button
                key={preset.position}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePresetClick(preset.position)}
                disabled={isPending || isAnimating}
                className={cn(
                  'relative p-4 rounded-xl transition-all overflow-hidden group',
                  isActive
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-lg ring-2 ring-indigo-400'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10'
                )}
              >
                {/* Glow Effect for Active */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-gradient-to-br from-indigo-400/30 to-transparent blur-xl"
                  />
                )}

                <div className="relative flex flex-col items-center gap-2">
                  <Icon
                    className={cn(
                      'h-6 w-6 transition-colors',
                      isActive ? 'text-white' : 'text-muted group-hover:text-white'
                    )}
                  />
                  <div className="text-center">
                    <p
                      className={cn(
                        'text-xs font-semibold',
                        isActive ? 'text-white' : 'text-white/80'
                      )}
                    >
                      {preset.label}
                    </p>
                    <p
                      className={cn(
                        'text-xs',
                        isActive ? 'text-indigo-200' : 'text-muted'
                      )}
                    >
                      {preset.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Animation Status */}
      {isAnimating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center justify-center gap-2 text-sm text-indigo-400"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full"
          />
          <span>Moving curtain...</span>
        </motion.div>
      )}

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
