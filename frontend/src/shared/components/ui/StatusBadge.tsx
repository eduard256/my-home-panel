import { motion } from 'framer-motion';

type StatusType = 'online' | 'offline' | 'warning' | 'running' | 'stopped' | 'healthy' | 'degraded' | 'unhealthy';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showDot?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig: Record<StatusType, { color: string; bg: string; label: string }> = {
  online: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Online' },
  offline: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Offline' },
  warning: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Warning' },
  running: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Running' },
  stopped: { color: '#6b6b70', bg: 'rgba(107, 107, 112, 0.1)', label: 'Stopped' },
  healthy: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Healthy' },
  degraded: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Degraded' },
  unhealthy: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Unhealthy' },
};

export function StatusBadge({
  status,
  label,
  showDot = true,
  size = 'md',
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label ?? config.label;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}
      `}
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {showDot && (
        <motion.span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: config.color }}
          animate={status === 'running' || status === 'online' ? { opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <span className="font-medium">{displayLabel}</span>
    </span>
  );
}

export function StatusDot({ status, size = 'md' }: { status: StatusType; size?: 'sm' | 'md' | 'lg' }) {
  const config = statusConfig[status];
  const sizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return (
    <motion.span
      className={`${sizes[size]} rounded-full inline-block`}
      style={{
        backgroundColor: config.color,
        boxShadow: `0 0 8px ${config.color}`,
      }}
      animate={status === 'running' || status === 'online' ? { opacity: [1, 0.5, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    />
  );
}
