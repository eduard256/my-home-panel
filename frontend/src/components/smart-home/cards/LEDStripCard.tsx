import { useCallback, useRef, useState, useEffect } from 'react';
import { LineSegments } from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import type { DeviceCardProps, LEDStripState } from '@/types/smart-home';

/**
 * Brightness slider component.
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
      <div className="absolute inset-0 h-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 overflow-hidden pointer-events-none">
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
 * LED Strip card - simplified to control only Line 2.
 */
export function LEDStripCard({
  device,
  state,
  isConnected,
  onPublish,
  onDetailOpen,
}: DeviceCardProps) {
  const stripState = state as LEDStripState | null;

  const isL2On = stripState?.state_l2 === 'ON';
  const brightnessL2 = stripState?.brightness_l2 ?? 0;
  const displayBrightness = isL2On ? brightnessL2 : 0;
  const percentage = Math.round((displayBrightness / 254) * 100);

  // Toggle ON/OFF
  const toggleState = useCallback(async () => {
    await onPublish({ state_l2: isL2On ? 'OFF' : 'ON' });
  }, [isL2On, onPublish]);

  // Set brightness (also turns on if was off)
  const handleBrightnessChange = useCallback(
    async (value: number) => {
      if (value > 0 && !isL2On) {
        await onPublish({ state_l2: 'ON', brightness_l2: value });
      } else if (value === 0 && isL2On) {
        await onPublish({ state_l2: 'OFF' });
      } else {
        await onPublish({ brightness_l2: value });
      }
    },
    [onPublish, isL2On]
  );

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={isL2On}
      isOffline={device.isOffline}
      icon={<LineSegments size={20} weight="fill" />}
      onDetailOpen={onDetailOpen}
    >
      <div className="space-y-3">
        {/* Brightness percentage */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Brightness</span>
          <span className="text-xs font-medium text-white">{percentage}%</span>
        </div>

        {/* Slider */}
        <BrightnessSlider
          value={displayBrightness}
          onChange={handleBrightnessChange}
          disabled={!isConnected || device.isOffline}
        />

        {/* ON/OFF toggle */}
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
              isL2On
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-white/5 text-muted border border-white/5 hover:bg-white/10'
            }
            ${!isConnected || device.isOffline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {isL2On ? 'ON' : 'OFF'}
        </button>
      </div>
    </DeviceCard>
  );
}

export default LEDStripCard;
