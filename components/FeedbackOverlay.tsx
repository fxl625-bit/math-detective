'use client';

import { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  const reducedMotion = Boolean(useReducedMotion());
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!show) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    continueRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const buttons = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')];
      if (!buttons.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus(); };
  }, [show, onClose]);
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
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`relative max-w-md w-full rounded-3xl border-2 ${bgColor} p-6 shadow-xl`}
            initial={reducedMotion ? false : { scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="关闭反馈"
              onClick={onClose}
              className="absolute top-2 right-2 min-h-11 min-w-11 flex items-center justify-center rounded-full bg-white/60 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              <X size={16} />
            </button>
            <div className="text-center">
              <motion.div
                className="text-5xl mb-3"
                animate={reducedMotion ? undefined : { scale: [1, 1.2, 1] }}
                transition={reducedMotion ? undefined : { duration: 0.5, repeat: 2 }}
              >
                {emoji}
              </motion.div>
              <p
                id={titleId}
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
              <button ref={continueRef} type="button" onClick={onClose} className="mt-5 min-h-11 w-full rounded-xl bg-white px-4 font-bold text-stone-900 shadow-sm hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">
                {type === 'success' ? '继续学习' : '我知道了'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
