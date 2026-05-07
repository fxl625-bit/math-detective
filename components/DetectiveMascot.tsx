'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DetectiveMascotProps {
  mood?: 'happy' | 'thinking' | 'encourage' | 'excited';
  size?: 'sm' | 'md' | 'lg';
  message?: string | string[];
  showMessage?: boolean;
  onMessageEnd?: () => void;
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
  message,
  showMessage = true,
  onMessageEnd,
}: DetectiveMascotProps) {
  const m = mascots[mood];
  const sizeClass =
    size === 'sm' ? 'text-4xl' : size === 'lg' ? 'text-7xl' : 'text-5xl';

  const messages = Array.isArray(message)
    ? message
    : typeof message === 'string' && message.length > 0
      ? [message]
      : null;

  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Reset when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      setCurrentMsgIndex(0);
      setDisplayedText('');
      setIsTyping(true);
    }
  }, [message]);

  // Typewriter effect
  useEffect(() => {
    if (!messages || messages.length === 0 || !isTyping) return;

    const currentMsg = messages[currentMsgIndex] || '';
    if (displayedText.length >= currentMsg.length) {
      // Current message typed. Wait, then advance
      const timer = setTimeout(() => {
        if (currentMsgIndex < messages.length - 1) {
          setCurrentMsgIndex(prev => prev + 1);
          setDisplayedText('');
        } else {
          setIsTyping(false);
          onMessageEnd?.();
        }
      }, 1200);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setDisplayedText(currentMsg.slice(0, displayedText.length + 1));
    }, 40 + Math.random() * 30);

    return () => clearTimeout(timer);
  }, [messages, currentMsgIndex, displayedText, isTyping, onMessageEnd]);

  if (!showMessage) {
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
      </motion.div>
    );
  }

  const bubbleText = messages
    ? displayedText
    : m.words;

  const showBubble = messages ? displayedText.length > 0 : size !== 'sm';

  return (
    <motion.div
      className="flex flex-col items-center gap-2 select-none"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* 文字泡 */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            className="relative max-w-xs px-4 py-2.5 bg-white rounded-2xl border-2 border-amber-300 shadow-md"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {/* 尾巴 */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-amber-300 rotate-45" />
            <p
              className="text-sm text-amber-800 font-medium leading-relaxed text-center"
              style={{ minHeight: messages ? '1.25em' : 'auto' }}
            >
              {bubbleText}
              {messages && isTyping && displayedText.length === (messages[currentMsgIndex]?.length || 0) && (
                <span className="animate-pulse">|</span>
              )}
            </p>
            {messages && messages.length > 1 && (
              <div className="flex justify-center gap-1 mt-1">
                {messages.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i === currentMsgIndex ? 'bg-amber-400' : 'bg-amber-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className={`${sizeClass} cursor-default`}
        whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.3 }}
      >
        {m.emoji}
      </motion.div>
    </motion.div>
  );
}
