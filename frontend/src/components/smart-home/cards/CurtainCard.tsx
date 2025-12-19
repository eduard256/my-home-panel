import { useCallback, useRef, useState, useEffect } from 'react';
import { ArrowsOutLineVertical } from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import type { DeviceCardProps, CurtainState } from '@/types/smart-home';

/**
 * Position slider component for curtains.
 */
function PositionSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);
  const lastUserValue = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lastUserValue.current !== null && Math.abs(value - lastUserValue.current) < 3) {
      return;
    }
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value, 10);
      setLocalValue(newValue);
      lastUserValue.current = newValue;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
        setTimeout(() => {
          lastUserValue.current = null;
        }, 2000); // Longer delay for curtains as they move slowly
      }, 300);
    },
    [onChange]
  );

  return (
    <div className="relative">
      <div className="absolute inset-0 h-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 overflow-hidden pointer-events-none">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
          style={{ width: `${localValue}%` }}
        />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={localValue}
        onChange={handleChange}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className={`
          relative w-full h-2 appearance-none bg-transparent cursor-pointer z-10
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-primary
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-primary
          [&::-moz-range-thumb]:shadow-md
          [&::-moz-range-thumb]:cursor-pointer
          [&::-moz-range-thumb]:border-0
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      />
    </div>
  );
}

/**
 * Curtain card with position slider.
 */
export function CurtainCard({
  device,
  state,
  isConnected,
  onPublish,
  onDetailOpen,
}: DeviceCardProps) {
  const curtainState = state as CurtainState | null;
  const position = curtainState?.position ?? 0;
  const isOn = position > 0;

  // Set position
  const handlePositionChange = useCallback(
    async (value: number) => {
      await onPublish({ position: value });
    },
    [onPublish]
  );

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={isOn}
      isOffline={device.isOffline}
      icon={<ArrowsOutLineVertical size={20} weight="fill" />}
      onDetailOpen={onDetailOpen}
    >
      <div className="space-y-3">
        {/* Position indicator */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Position</span>
          <span className="text-xs font-medium text-white">{position}%</span>
        </div>

        {/* Position slider */}
        <PositionSlider
          value={position}
          onChange={handlePositionChange}
          disabled={!isConnected || device.isOffline}
        />

        {/* Quick buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePositionChange(0);
            }}
            disabled={!isConnected || device.isOffline}
            className={`
              flex-1 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-200 active:scale-95
              ${position === 0
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-white/5 text-muted border border-white/5 hover:bg-white/10'
              }
              ${!isConnected || device.isOffline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            Close
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePositionChange(100);
            }}
            disabled={!isConnected || device.isOffline}
            className={`
              flex-1 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-200 active:scale-95
              ${position === 100
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-white/5 text-muted border border-white/5 hover:bg-white/10'
              }
              ${!isConnected || device.isOffline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            Open
          </button>
        </div>
      </div>
    </DeviceCard>
  );
}

export default CurtainCard;
