'use client';

import { motion } from 'framer-motion';

interface LevelBadgeProps {
  level: number;
  name: string;
  icon: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LevelBadge({
  name,
  icon,
  size = 'md',
}: LevelBadgeProps) {
  const sizeClass =
    size === 'sm'
      ? 'text-xs px-2 py-1'
      : size === 'lg'
        ? 'text-lg px-5 py-3'
        : 'text-sm px-3 py-2';

  return (
    <motion.div
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-300 font-bold text-amber-800 ${sizeClass}`}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <span>{icon}</span>
      <span>{name}</span>
    </motion.div>
  );
}
