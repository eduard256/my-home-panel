import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  color?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  animated?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  color = '#9b87f5',
  showValue = false,
  size = 'md',
  label,
  animated = true,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  // Color based on percentage (optional - can use fixed color)
  const getColor = () => {
    if (color !== 'auto') return color;
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

  const barColor = getColor();

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-[#a0a0a8] uppercase tracking-wide">{label}</span>}
          {showValue && <span className="text-xs text-[#a0a0a8]">{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <div className={`w-full ${heights[size]} bg-white/5 rounded-full overflow-hidden`}>
        <motion.div
          className={`${heights[size]} rounded-full`}
          style={{
            background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`,
            boxShadow: `0 0 10px ${barColor}40`,
          }}
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={animated ? { duration: 0.5, ease: 'easeOut' } : { duration: 0 }}
        />
      </div>
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showValue?: boolean;
  label?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color = '#9b87f5',
  showValue = true,
  label,
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{percentage.toFixed(0)}%</span>
          {label && <span className="text-xs text-[#a0a0a8]">{label}</span>}
        </div>
      )}
    </div>
  );
}
