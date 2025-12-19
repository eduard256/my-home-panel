import { motion } from 'framer-motion';
import { WifiSlash } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { CardSize } from '@/types/smart-home';

interface DeviceCardProps {
  name: string;
  size: CardSize;
  isOn: boolean;
  isOffline?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  onDetailOpen?: () => void;
}

/**
 * Base device card component with premium styling and animations.
 * Handles ON/OFF states, offline state, and detail panel interaction.
 */
export function DeviceCard({
  name,
  size,
  isOn,
  isOffline = false,
  icon,
  children,
  onClick,
  onDetailOpen,
}: DeviceCardProps) {
  const isWide = size === '2x1';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      whileHover={
        !isOffline
          ? {
              y: -2,
              scale: 1.01,
              transition: { duration: 0.2, ease: 'easeOut' },
            }
          : undefined
      }
      whileTap={!isOffline ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-[16px] p-4
        transition-all duration-300 ease-out cursor-pointer
        ${isWide ? 'col-span-2' : 'col-span-1'}
        ${
          isOffline
            ? 'opacity-50 pointer-events-none bg-white/[0.02] border border-white/[0.05]'
            : isOn
              ? 'bg-gradient-to-br from-primary/[0.08] to-primary/[0.15] border border-primary/25 shadow-[0_0_30px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]'
              : 'bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:shadow-[0_8px_30px_rgba(139,92,246,0.1)]'
        }
      `}
      style={{
        minHeight: isWide ? '100px' : '120px',
      }}
    >
      {/* Offline badge */}
      {isOffline && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-muted">
          <WifiSlash size={12} weight="bold" />
          <span>Offline</span>
        </div>
      )}


      {/* Card header with icon and name */}
      <div className="flex items-center gap-2.5 mb-3">
        {icon && (
          <motion.div
            animate={isOn ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`
              transition-all duration-300
              ${isOn ? 'text-primary opacity-100' : 'text-muted opacity-40'}
            `}
          >
            {icon}
          </motion.div>
        )}
        <span className="text-sm font-medium text-white truncate">{name}</span>
      </div>

      {/* Card content */}
      <div className="flex-1">{children}</div>
    </motion.div>
  );
}

export default DeviceCard;
