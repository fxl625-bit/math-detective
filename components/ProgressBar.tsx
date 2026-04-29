'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: string;
  showPulse?: boolean;
}

export default function ProgressBar({
  value,
  max,
  label,
  color = 'bg-amber-400',
  showPulse = false,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="w-full">
      {(label || true) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs font-medium text-gray-600">{label}</span>}
          <span className="text-xs font-bold text-gray-500">{value}/{max}</span>
        </div>
      )}
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color} ${showPulse ? 'animate-pulse' : ''}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
