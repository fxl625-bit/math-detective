'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AppCardProps {
  children: ReactNode;
  variant?: 'default' | 'amber' | 'blue' | 'pink' | 'green' | 'purple' | 'gray';
  className?: string;
  onClick?: () => void;
  noPadding?: boolean;
}

const variantStyles: Record<string, string> = {
  default: 'bg-white border-amber-200',
  amber: 'bg-amber-50 border-amber-200',
  blue: 'bg-blue-50 border-blue-200',
  pink: 'bg-pink-50 border-pink-200',
  green: 'bg-green-50 border-green-200',
  purple: 'bg-purple-50 border-purple-200',
  gray: 'bg-gray-50 border-gray-200',
};

export default function AppCard({
  children,
  variant = 'default',
  className = '',
  onClick,
  noPadding = false,
}: AppCardProps) {
  const baseClass = `rounded-2xl border-2 ${variantStyles[variant]} ${
    onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''
  } ${noPadding ? '' : 'p-4'} ${className}`;

  if (onClick) {
    return (
      <motion.div
        className={baseClass}
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={baseClass}>{children}</div>;
}
