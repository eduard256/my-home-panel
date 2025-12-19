import { useCallback, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowsOutLineVertical, CaretUp, CaretDown, Stop } from '@phosphor-icons/react';
import type { DeviceConfig, DeviceState, CurtainState, PublishPayload } from '@/types/smart-home';

interface CurtainDetailProps {
  device: DeviceConfig;
  state: DeviceState | null;
  isConnected: boolean;
  onPublish: (payload: PublishPayload) => Promise<boolean>;
}

/**
 * Vertical slider for curtain position.
 */
function PositionSlider({
  value,
  onChange,
  disabled,
  isRunning,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  isRunning?: boolean;
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
      // Invert: top = 100% (open), bottom = 0% (closed)
      const percentage = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const newValue = Math.round(percentage * 100);

      setLocalValue(newValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, 300);
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

  return (
    <div
      ref={sliderRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`
        relative w-24 h-56 rounded-2xl bg-white/5 border border-white/10 cursor-pointer select-none overflow-hidden
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Background pattern (curtain fabric) */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-[1px] bg-white/30"
            style={{ top: `${(i + 1) * 8}%` }}
          />
        ))}
      </div>

      {/* Filled portion (open amount) */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/30 to-primary/10 rounded-b-2xl"
        style={{ height: `${localValue}%` }}
        layout
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />

      {/* Running indicator */}
      {isRunning && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent"
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Percentage label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white drop-shadow-lg">{localValue}%</span>
      </div>

      {/* Curtain bar at current position */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-16 h-3 rounded-full bg-white shadow-lg flex items-center justify-center"
        style={{ bottom: `calc(${localValue}% - 6px)` }}
        layout
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="flex gap-0.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-1 h-1.5 rounded-full bg-gray-400" />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Control button for curtain actions.
 */
function ControlButton({
  icon,
  label,
  onClick,
  disabled,
  isActive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
}) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center gap-2 p-4 rounded-xl
        transition-all duration-200
        ${
          isActive
            ? 'bg-primary/20 border border-primary/40 text-primary'
            : 'bg-white/5 border border-white/10 text-muted hover:bg-white/10 hover:text-white'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </motion.button>
  );
}

/**
 * Curtain detail panel with position slider and control buttons.
 */
export function CurtainDetail({
  device,
  state,
  isConnected,
  onPublish,
}: CurtainDetailProps) {
  const curtainState = state as CurtainState | null;
  const position = curtainState?.position ?? 0;
  const isRunning = curtainState?.running ?? false;

  const handleOpen = useCallback(async () => {
    await onPublish({ state: 'OPEN' });
  }, [onPublish]);

  const handleStop = useCallback(async () => {
    await onPublish({ state: 'STOP' });
  }, [onPublish]);

  const handleClose = useCallback(async () => {
    await onPublish({ state: 'CLOSE' });
  }, [onPublish]);

  const handlePositionChange = useCallback(
    async (value: number) => {
      await onPublish({ position: value });
    },
    [onPublish]
  );

  const disabled = !isConnected || device.isOffline;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Icon */}
      <motion.div
        animate={isRunning ? { y: [0, -5, 0] } : { y: 0 }}
        transition={{ duration: 0.5, repeat: isRunning ? Infinity : 0 }}
        className="text-primary"
      >
        <ArrowsOutLineVertical size={48} weight="fill" />
      </motion.div>

      {/* Position slider */}
      <PositionSlider
        value={position}
        onChange={handlePositionChange}
        disabled={disabled}
        isRunning={isRunning}
      />

      {/* Control buttons */}
      <div className="flex gap-3">
        <ControlButton
          icon={<CaretUp size={24} weight="bold" />}
          label="Open"
          onClick={handleOpen}
          disabled={disabled}
        />
        <ControlButton
          icon={<Stop size={24} weight="fill" />}
          label="Stop"
          onClick={handleStop}
          disabled={disabled}
          isActive={isRunning}
        />
        <ControlButton
          icon={<CaretDown size={24} weight="bold" />}
          label="Close"
          onClick={handleClose}
          disabled={disabled}
        />
      </div>

      {/* Quick position buttons */}
      <div className="flex gap-2 w-full">
        {[0, 25, 50, 75, 100].map((pos) => (
          <motion.button
            key={pos}
            whileHover={!disabled ? { scale: 1.05 } : undefined}
            whileTap={!disabled ? { scale: 0.95 } : undefined}
            onClick={() => handlePositionChange(pos)}
            disabled={disabled}
            className={`
              flex-1 py-2 rounded-lg text-xs font-medium
              transition-all duration-200
              ${
                position === pos
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-white/5 text-muted border border-white/5 hover:bg-white/10'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {pos}%
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default CurtainDetail;
