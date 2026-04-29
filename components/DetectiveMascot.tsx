'use client';

import { motion } from 'framer-motion';

interface DetectiveMascotProps {
  mood?: 'happy' | 'thinking' | 'encourage' | 'excited';
  size?: 'sm' | 'md' | 'lg';
}

const mascots: Record<string, { emoji: string; words: string }> = {
  happy: { emoji: '🦊', words: '今天也是破案的好日子！' },
  thinking: { emoji: '🤔', words: '让我仔细看看这个线索...' },
  encourage: { emoji: '💪', words: '别担心，再试一次吧！' },
  excited: { emoji: '🎉', words: '太棒啦！你破案了！' },
};

export default function DetectiveMascot({
  mood = 'happy',
  size = 'md',
}: DetectiveMascotProps) {
  const m = mascots[mood];
  const sizeClass =
    size === 'sm' ? 'text-4xl' : size === 'lg' ? 'text-7xl' : 'text-5xl';

  return (
    <motion.div
      className="flex flex-col items-center gap-2 select-none"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        className={`${sizeClass} cursor-default`}
        whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.3 }}
      >
        {m.emoji}
      </motion.div>
      {size !== 'sm' && (
        <motion.p
          className="text-sm text-amber-700 font-medium bg-amber-50 px-3 py-1 rounded-full border border-amber-200"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {m.words}
        </motion.p>
      )}
    </motion.div>
  );
}
