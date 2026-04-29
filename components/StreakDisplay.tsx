'use client';

import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface StreakDisplayProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function StreakDisplay({ streak, size = 'md' }: StreakDisplayProps) {
  const sizeClass =
    size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <motion.div
      className={`flex items-center gap-1 font-bold ${sizeClass} text-orange-500`}
      animate={streak > 0 ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Flame
        className={
          size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'
        }
        fill="currentColor"
      />
      <span>{streak}天</span>
    </motion.div>
  );
}
