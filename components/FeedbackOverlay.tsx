'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface FeedbackOverlayProps {
  show: boolean;
  type: 'success' | 'hint' | 'info';
  message: string;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function FeedbackOverlay({
  show,
  type,
  message,
  onClose,
  children,
}: FeedbackOverlayProps) {
  const bgColor =
    type === 'success'
      ? 'bg-green-100 border-green-400'
      : type === 'hint'
        ? 'bg-yellow-100 border-yellow-400'
        : 'bg-blue-100 border-blue-400';

  const emoji = type === 'success' ? '🎉' : type === 'hint' ? '💡' : '📋';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`relative max-w-md w-full rounded-3xl border-2 ${bgColor} p-6 shadow-xl`}
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/50 hover:bg-white/80 transition-colors"
            >
              <X size={16} />
            </button>
            <div className="text-center">
              <motion.div
                className="text-5xl mb-3"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                {emoji}
              </motion.div>
              <p
                className={`text-lg font-bold ${
                  type === 'success'
                    ? 'text-green-700'
                    : type === 'hint'
                      ? 'text-yellow-700'
                      : 'text-blue-700'
                }`}
              >
                {message}
              </p>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
