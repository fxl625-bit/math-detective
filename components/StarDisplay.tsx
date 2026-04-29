'use client';

import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface StarDisplayProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export default function StarDisplay({ count, size = 'md', animate = false }: StarDisplayProps) {
  const sizeClass =
    size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <motion.div
      className={`flex items-center gap-1 font-bold ${sizeClass} text-amber-500`}
      animate={animate ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <Star className={size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'} fill="currentColor" />
      <span>{count}</span>
    </motion.div>
  );
}
