import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BlockProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Block component - Base glass panel for the three-block layout
 */
export const Block = forwardRef<HTMLDivElement, BlockProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'block h-full overflow-hidden',
          'bg-surface backdrop-blur-block',
          'border border-white/5',
          'rounded-block shadow-block',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Block.displayName = 'Block';

/**
 * Animation variants for blocks
 */
export const blockVariants = {
  hidden: {
    x: -100,
    opacity: 0,
    rotate: 3,
    scale: 0.95,
  },
  visible: {
    x: 0,
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
      duration: 0.5,
    },
  },
  exit: {
    x: -50,
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Stagger container for initial animation
 */
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};
