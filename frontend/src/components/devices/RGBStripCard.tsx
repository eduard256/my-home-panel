import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeviceControl } from '@/hooks';
import { Slider } from '@/components/ui/slider';
import type { Device } from '@/types';

interface RGBStripCardProps {
  device: Device;
}

/**
 * Temperature presets from warm (red) to cool (blue/white)
 * Temperature scale: warm red → orange → yellow → white → cool blue
 */
const TEMP_PRESETS = [
  { name: 'Warm Red', temp: 0, color: { r: 255, g: 0, b: 0 } },
  { name: 'Orange', temp: 20, color: { r: 255, g: 100, b: 0 } },
  { name: 'Amber', temp: 40, color: { r: 255, g: 180, b: 0 } },
  { name: 'Warm White', temp: 60, color: { r: 255, g: 220, b: 180 } },
  { name: 'Neutral', temp: 80, color: { r: 255, g: 255, b: 220 } },
  { name: 'Cool', temp: 100, color: { r: 200, g: 220, b: 255 } },
];

/**
 * Calculate color from temperature (0-100)
 */
function tempToColor(temp: number): { r: number; g: number; b: number } {
  // Find two closest presets
  let lower = TEMP_PRESETS[0];
  let upper = TEMP_PRESETS[TEMP_PRESETS.length - 1];

  for (let i = 0; i < TEMP_PRESETS.length - 1; i++) {
    if (temp >= TEMP_PRESETS[i].temp && temp <= TEMP_PRESETS[i + 1].temp) {
      lower = TEMP_PRESETS[i];
      upper = TEMP_PRESETS[i + 1];
      break;
    }
  }

  // Interpolate between colors
  const ratio = (temp - lower.temp) / (upper.temp - lower.temp);
  return {
    r: Math.round(lower.color.r + (upper.color.r - lower.color.r) * ratio),
    g: Math.round(lower.color.g + (upper.color.g - lower.color.g) * ratio),
    b: Math.round(lower.color.b + (upper.color.b - lower.color.b) * ratio),
  };
}

/**
 * Calculate temperature from RGB color (approximate)
 */
function colorToTemp(color: { r: number; g: number; b: number }): number {
  // Simple heuristic: more red = lower temp, more blue = higher temp
  const redRatio = color.r / 255;
  const blueRatio = color.b / 255;

  if (redRatio > 0.8 && blueRatio < 0.3) return 0; // Warm red
  if (redRatio > 0.8 && color.g > 150) return 40; // Amber/Yellow
  if (blueRatio > redRatio) return 100; // Cool blue

  return 60; // Default warm white
}

/**
 * RGB Strip Card Component
 * Color temperature slider + brightness control
 */
export function RGBStripCard({ device }: RGBStripCardProps) {
  const { setPayload, isPending } = useDeviceControl(device);

  const isOn = device.state?.state === 'ON';
  const currentColor = device.state?.color || { r: 255, g: 220, b: 180 };
  const currentBrightness = device.state?.brightness || 100;

  // Local state for smooth slider control
  const [temperature, setTemperature] = useState(colorToTemp(currentColor));
  const [brightness, setBrightness] = useState(currentBrightness);

  // Update local state when device state changes
  useEffect(() => {
    if (device.state?.color) {
      setTemperature(colorToTemp(device.state.color));
    }
    if (device.state?.brightness !== undefined) {
      setBrightness(device.state.brightness);
    }
  }, [device.state?.color, device.state?.brightness]);

  const previewColor = tempToColor(temperature);
  const rgbString = `rgb(${previewColor.r}, ${previewColor.g}, ${previewColor.b})`;

  const handlePowerToggle = () => {
    setPayload({ state: isOn ? 'OFF' : 'ON' });
  };

  const handleTemperatureChange = (value: number[]) => {
    const newTemp = value[0];
    setTemperature(newTemp);
    const newColor = tempToColor(newTemp);
    setPayload({
      state: 'ON',
      color: newColor,
      brightness: brightness,
    });
  };

  const handleBrightnessChange = (value: number[]) => {
    const newBrightness = value[0];
    setBrightness(newBrightness);
    setPayload({
      state: 'ON',
      brightness: newBrightness,
      color: previewColor,
    });
  };

  const handlePresetClick = (preset: typeof TEMP_PRESETS[0]) => {
    setTemperature(preset.temp);
    setPayload({
      state: 'ON',
      color: preset.color,
      brightness: brightness,
    });
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'card p-6 transition-all overflow-hidden relative',
        isOn && 'border-primary/50 shadow-glow'
      )}
    >
      {/* Ambient Glow Effect */}
      {isOn && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="absolute inset-0 blur-3xl"
          style={{ backgroundColor: rgbString }}
        />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl transition-all',
                isOn ? 'shadow-lg' : 'bg-white/10'
              )}
              style={isOn ? { backgroundColor: rgbString } : {}}
            >
              <Lightbulb className={cn('h-6 w-6', isOn ? 'text-white drop-shadow-lg' : 'text-muted')} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{device.name}</h3>
              <p className="text-sm text-muted">RGB Strip</p>
            </div>
          </div>

          {/* Power Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePowerToggle}
            disabled={isPending}
            className={cn(
              'p-3 rounded-xl transition-all',
              isOn
                ? 'bg-primary text-white shadow-lg'
                : 'bg-white/10 text-muted hover:bg-white/20'
            )}
          >
            <Power className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Color Preview */}
        {isOn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-6 rounded-xl"
            style={{
              backgroundColor: rgbString,
              opacity: brightness / 100,
            }}
          >
            <div className="text-center text-white drop-shadow-lg">
              <p className="text-2xl font-bold">{TEMP_PRESETS.find(p => Math.abs(p.temp - temperature) < 5)?.name || 'Custom'}</p>
              <p className="text-sm opacity-80">{brightness}% Brightness</p>
            </div>
          </motion.div>
        )}

        {/* Temperature Slider */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white">Color Temperature</label>
            <span className="text-xs text-muted">Warm → Cool</span>
          </div>

          {/* Gradient Preview */}
          <div
            className="h-2 rounded-full mb-3"
            style={{
              background: 'linear-gradient(to right, rgb(255,0,0), rgb(255,100,0), rgb(255,180,0), rgb(255,220,180), rgb(255,255,220), rgb(200,220,255))'
            }}
          />

          <Slider
            value={[temperature]}
            onValueChange={handleTemperatureChange}
            max={100}
            step={1}
            disabled={isPending}
            className="mb-2"
          />
        </div>

        {/* Brightness Slider */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-white">Brightness</label>
            <span className="text-sm text-white font-semibold">{brightness}%</span>
          </div>
          <Slider
            value={[brightness]}
            onValueChange={handleBrightnessChange}
            max={100}
            step={1}
            disabled={isPending}
          />
        </div>

        {/* Quick Presets */}
        <div>
          <label className="text-sm font-medium text-white mb-3 block">Quick Presets</label>
          <div className="grid grid-cols-3 gap-2">
            {TEMP_PRESETS.filter((_, i) => i % 2 === 0).map((preset) => (
              <motion.button
                key={preset.name}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePresetClick(preset)}
                disabled={isPending}
                className={cn(
                  'p-3 rounded-lg text-xs font-medium transition-all',
                  Math.abs(temperature - preset.temp) < 10
                    ? 'ring-2 ring-white'
                    : 'hover:scale-105'
                )}
                style={{
                  backgroundColor: `rgb(${preset.color.r}, ${preset.color.g}, ${preset.color.b})`,
                  color: preset.temp < 50 ? 'white' : '#1a1a1a',
                }}
              >
                {preset.name}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
