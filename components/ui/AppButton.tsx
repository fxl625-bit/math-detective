'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

type AppButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
} & HTMLMotionProps<'button'>;

const variantStyles: Record<string, string> = {
  primary: 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-200',
  secondary: 'bg-white border-2 border-amber-300 text-amber-700',
  success: 'bg-gradient-to-r from-green-400 to-emerald-400 text-white shadow-lg shadow-green-200',
  ghost: 'bg-gray-100 text-gray-600',
  danger: 'bg-red-50 border-2 border-red-200 text-red-600',
};

const sizeStyles: Record<string, string> = {
  sm: 'py-2 px-4 text-sm min-h-[40px]',
  md: 'py-3 px-5 text-base min-h-[52px]',
  lg: 'py-4 px-8 text-lg min-h-[56px]',
};

export default function AppButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  disabled = false,
  className = '',
  ...motionProps
}: AppButtonProps) {
  return (
    <motion.button
      className={`
        inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold
        transition-colors select-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `.trim()}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      disabled={disabled}
      {...motionProps}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </motion.button>
  );
}
