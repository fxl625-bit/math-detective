'use client';

/* eslint-disable react-hooks/purity -- decorative confetti uses Math.random for particle
   positions; non-determinism is intentional and confined to one-time particle generation. */

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface ConfettiProps {
  show: boolean;
}

const emojis = ['⭐', '🌟', '✨', '💫', '🎉', '🎊', '👏', '💖', '🔍', '🏆'];

export default function Confetti({ show }: ConfettiProps) {
  // Precompute particle randomness once so re-renders don't re-randomize positions
  // mid-animation (which would make particles visually jump).
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        initialX: Math.random() * 200 - 100,
        animateX: Math.random() * 300 - 150,
        rotate: Math.random() * 720 - 360,
        duration: 2 + Math.random() * 1.5,
        delay: Math.random() * 0.3,
        emoji: emojis[i % emojis.length],
      })),
    []
  );

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute text-2xl"
              initial={{
                x: p.initialX,
                y: -50,
                opacity: 1,
                rotate: 0,
                scale: 0,
              }}
              animate={{
                x: p.animateX,
                y: typeof window !== 'undefined' ? window.innerHeight + 50 : 600,
                opacity: [1, 1, 0],
                rotate: p.rotate,
                scale: [0, 1.5, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: p.duration,
                ease: 'easeOut',
                delay: p.delay,
              }}
            >
              {p.emoji}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
