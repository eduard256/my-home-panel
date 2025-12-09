import { type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-[#9b87f5] to-[#7c3aed]
    text-white font-semibold
    shadow-lg shadow-[#9b87f5]/20
    hover:shadow-[#9b87f5]/40
    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
  `,
  secondary: `
    bg-transparent
    text-[#9b87f5]
    border-2 border-[#9b87f5]
    hover:bg-[#9b87f5]/10
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  ghost: `
    bg-transparent
    text-[#a0a0a8]
    hover:text-white hover:bg-white/5
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  danger: `
    bg-[#ef4444]/10
    text-[#ef4444]
    border border-[#ef4444]/30
    hover:bg-[#ef4444]/20
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <motion.button
      className={`
        inline-flex items-center justify-center
        transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={size === 'sm' ? 14 : 18} className="animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </motion.button>
  );
}
