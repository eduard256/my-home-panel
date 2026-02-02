import { useCallback, useRef, useState, useEffect } from 'react';
import { SunDim } from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import type { DeviceCardProps, DimmerState } from '@/types/smart-home-new';

/**
 * Simple horizontal slider using native input range.
 */
function BrightnessSlider({
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
    if (lastUserValue.current !== null && Math.abs(value - lastUserValue.current) < 5) {
      return;
    }
    setLocalValue(value);
  }, [value]);

  const percentage = Math.round((localValue / 254) * 100);

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
        }, 1000);
      }, 150);
    },
    [onChange]
  );

  return (
    <div className="relative">
      <div className="absolute inset-0 h-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min="0"
        max="254"
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
 * Dimmer card with brightness slider and ON/OFF toggle.
 */
export function DimmerCard({
  device,
  state,
  isConnected,
  onPublish,
}: DeviceCardProps) {
  const dimmerState = state as DimmerState | null;
  const isOn = dimmerState?.state === 'ON';
  const brightness = dimmerState?.brightness || 0;
  const displayBrightness = isOn ? brightness : 0;
  const percentage = Math.round((displayBrightness / 254) * 100);

  const toggleState = useCallback(() => {
    onPublish({ state: isOn ? 'OFF' : 'ON' });
  }, [isOn, onPublish]);

  const handleBrightnessChange = useCallback(
    (value: number) => {
      if (value > 0 && !isOn) {
        onPublish({ state: 'ON', brightness: value });
      } else if (value === 0 && isOn) {
        onPublish({ state: 'OFF' });
      } else {
        onPublish({ brightness: value });
      }
    },
    [onPublish, isOn]
  );

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={isOn}
      isOffline={device.isOffline}
      icon={<SunDim size={20} weight="fill" />}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Brightness</span>
          <span className="text-xs font-medium text-white">{percentage}%</span>
        </div>

        <BrightnessSlider
          value={displayBrightness}
          onChange={handleBrightnessChange}
          disabled={!isConnected || device.isOffline}
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleState();
          }}
          disabled={!isConnected || device.isOffline}
          className={`
            w-full py-2 px-4 rounded-lg text-xs font-medium
            transition-all duration-200 active:scale-95
            ${
              isOn
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-white/5 text-muted border border-white/5 hover:bg-white/10'
            }
            ${!isConnected || device.isOffline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {isOn ? 'ON' : 'OFF'}
        </button>
      </div>
    </DeviceCard>
  );
}
