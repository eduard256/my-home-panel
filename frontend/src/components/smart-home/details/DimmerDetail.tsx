import { useCallback, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Power, SunDim } from '@phosphor-icons/react';
import type { DeviceConfig, DeviceState, DimmerState, PublishPayload } from '@/types/smart-home';

interface DimmerDetailProps {
  device: DeviceConfig;
  state: DeviceState | null;
  isConnected: boolean;
  onPublish: (payload: PublishPayload) => Promise<boolean>;
}

/**
 * Vertical slider component for brightness control.
 */
function VerticalSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const handleChange = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      // Invert: top = 100%, bottom = 0%
      const percentage = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const newValue = Math.round(percentage * 254);

      setLocalValue(newValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, 100);
    },
    [disabled, onChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    handleChange(e);

    const handleMouseMove = (e: MouseEvent) => {
      handleChange(e as unknown as React.MouseEvent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handleChange(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    handleChange(e);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const percentage = Math.round((localValue / 254) * 100);

  return (
    <div
      ref={sliderRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`
        relative w-20 h-48 rounded-2xl bg-white/5 border border-white/10 cursor-pointer select-none overflow-hidden
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Filled portion */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary/50 rounded-b-2xl"
        style={{ height: `${percentage}%` }}
        layout
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
      {/* Percentage label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white drop-shadow-lg">{percentage}%</span>
      </div>
      {/* Thumb indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-12 h-2 rounded-full bg-white shadow-lg"
        style={{ bottom: `calc(${percentage}% - 4px)` }}
        layout
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    </div>
  );
}

/**
 * Dimmer detail panel with vertical slider and ON/OFF toggle.
 */
export function DimmerDetail({
  device,
  state,
  isConnected,
  onPublish,
}: DimmerDetailProps) {
  const dimmerState = state as DimmerState | null;
  const isOn = dimmerState?.state === 'ON';
  const brightness = dimmerState?.brightness || 0;

  const toggleState = useCallback(async () => {
    await onPublish({ state: isOn ? 'OFF' : 'ON' });
  }, [isOn, onPublish]);

  const handleBrightnessChange = useCallback(
    async (value: number) => {
      await onPublish({ brightness: value });
    },
    [onPublish]
  );

  const disabled = !isConnected || device.isOffline;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Icon */}
      <motion.div
        animate={isOn ? { scale: [1, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className={isOn ? 'text-primary' : 'text-muted'}
      >
        <SunDim size={48} weight="fill" />
      </motion.div>

      {/* Vertical slider */}
      <VerticalSlider
        value={brightness}
        onChange={handleBrightnessChange}
        disabled={disabled}
      />

      {/* ON/OFF toggle */}
      <motion.button
        whileHover={!disabled ? { scale: 1.02 } : undefined}
        whileTap={!disabled ? { scale: 0.98 } : undefined}
        onClick={toggleState}
        disabled={disabled}
        className={`
          flex items-center gap-3 px-8 py-4 rounded-2xl
          transition-all duration-300
          ${
            isOn
              ? 'bg-gradient-to-r from-primary/20 to-primary/30 border border-primary/40'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <Power
          size={24}
          weight={isOn ? 'fill' : 'regular'}
          className={isOn ? 'text-primary' : 'text-muted'}
        />
        <span className={`text-lg font-medium ${isOn ? 'text-primary' : 'text-muted'}`}>
          {isOn ? 'ON' : 'OFF'}
        </span>
      </motion.button>
    </div>
  );
}

export default DimmerDetail;
