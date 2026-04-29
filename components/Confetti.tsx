'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiProps {
  show: boolean;
}

const emojis = ['⭐', '🌟', '✨', '💫', '🎉', '🎊', '👏', '💖', '🔍', '🏆'];

export default function Confetti({ show }: ConfettiProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-2xl"
              initial={{
                x: Math.random() * 200 - 100,
                y: -50,
                opacity: 1,
                rotate: 0,
                scale: 0,
              }}
              animate={{
                x: Math.random() * 300 - 150,
                y: typeof window !== 'undefined' ? window.innerHeight + 50 : 600,
                opacity: [1, 1, 0],
                rotate: Math.random() * 720 - 360,
                scale: [0, 1.5, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2 + Math.random() * 1.5,
                ease: 'easeOut',
                delay: Math.random() * 0.3,
              }}
            >
              {emojis[i % emojis.length]}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
