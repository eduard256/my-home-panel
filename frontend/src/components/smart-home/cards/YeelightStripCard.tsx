import { useCallback, useRef, useState, useEffect } from 'react';
import { Gradient } from '@phosphor-icons/react';
import { DeviceCard } from '../DeviceCard';
import type { DeviceCardProps, YeelightStripState } from '@/types/smart-home';

/**
 * Convert mireds to Kelvin for display.
 * @param mireds - Color temperature in mireds (153-370)
 * @returns Color temperature in Kelvin
 */
function miredsToKelvin(mireds: number): number {
  return Math.round(1000000 / mireds);
}

/**
 * Generic slider component for Yeelight controls.
 */
function Slider({
  value,
  min,
  max,
  onChange,
  disabled,
  gradient,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  gradient?: string;
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

  const percentage = Math.round(((localValue - min) / (max - min)) * 100);

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

  const defaultGradient = 'from-primary/60 to-primary';
  const trackGradient = gradient || defaultGradient;

  return (
    <div className="relative">
      <div className="absolute inset-0 h-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 overflow-hidden pointer-events-none">
        {gradient ? (
          <div
            className="h-full rounded-full w-full"
            style={{ background: gradient }}
          />
        ) : (
          <div
            className={`h-full rounded-full bg-gradient-to-r ${trackGradient}`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
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
 * Yeelight Strip8 card with brightness and color temperature sliders.
 * Uses mireds (153-370) for color temperature and 0-255 for brightness.
 */
export function YeelightStripCard({
  device,
  state,
  isConnected,
  onPublish,
  onDetailOpen,
}: DeviceCardProps) {
  const stripState = state as YeelightStripState | null;
  const isOn = stripState?.state === 'ON';
  const brightness = stripState?.brightness ?? 0;
  const colorTemp = stripState?.color_temp ?? 250; // Default to neutral ~4000K

  // Display values
  const displayBrightness = isOn ? brightness : 0;
  const percentage = Math.round((displayBrightness / 255) * 100);
  const kelvin = miredsToKelvin(colorTemp);

  // Toggle ON/OFF
  const toggleState = useCallback(async () => {
    await onPublish({ state: isOn ? 'OFF' : 'ON' });
  }, [isOn, onPublish]);

  // Set brightness (0-255), turns on if was off
  const handleBrightnessChange = useCallback(
    async (value: number) => {
      if (value > 0 && !isOn) {
        await onPublish({ state: 'ON', brightness: value });
      } else if (value === 0 && isOn) {
        await onPublish({ state: 'OFF' });
      } else {
        await onPublish({ brightness: value });
      }
    },
    [onPublish, isOn]
  );

  // Set color temperature (153-370 mireds)
  const handleColorTempChange = useCallback(
    async (value: number) => {
      if (!isOn) {
        await onPublish({ state: 'ON', color_temp: value });
      } else {
        await onPublish({ color_temp: value });
      }
    },
    [onPublish, isOn]
  );

  // Color temperature gradient (warm to cool) - reversed because mireds are inverse
  const colorTempGradient = 'linear-gradient(to right, #ff9329, #fff5e6, #b3d4ff, #6eb3ff)';

  return (
    <DeviceCard
      name={device.name}
      size={device.size}
      isOn={isOn}
      isOffline={device.isOffline}
      icon={<Gradient size={20} weight="fill" />}
      onDetailOpen={onDetailOpen}
    >
      <div className="space-y-3">
        {/* Brightness */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted">Brightness</span>
            <span className="text-xs font-medium text-white">{percentage}%</span>
          </div>
          <Slider
            value={displayBrightness}
            min={0}
            max={255}
            onChange={handleBrightnessChange}
            disabled={!isConnected || device.isOffline}
          />
        </div>

        {/* Color Temperature */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted">Temperature</span>
            <span className="text-xs font-medium text-white">{kelvin}K</span>
          </div>
          <Slider
            value={colorTemp}
            min={153}
            max={370}
            onChange={handleColorTempChange}
            disabled={!isConnected || device.isOffline}
            gradient={colorTempGradient}
          />
        </div>

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

export default YeelightStripCard;
