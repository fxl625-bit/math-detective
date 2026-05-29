'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { DecorationItem } from '@/data/decorations';

interface DetectiveMascotProps {
  mood?: 'happy' | 'thinking' | 'encourage' | 'excited';
  size?: 'sm' | 'md' | 'lg';
  message?: string | string[];
  showMessage?: boolean;
  onMessageEnd?: () => void;
  decorations?: DecorationItem[];
}

const mascots: Record<string, { image: string; emoji: string; words: string }> = {
  happy:    { image: '/characters/detective-happy.png',     emoji: '🦊', words: '今天也是破案的好日子！' },
  thinking: { image: '/characters/detective-thinking.png',  emoji: '🤔', words: '让我仔细看看这个线索...' },
  encourage:{ image: '/characters/detective-encourage.png',  emoji: '💪', words: '别担心，再试一次吧！' },
  excited:  { image: '/characters/detective-excited.png',   emoji: '🎉', words: '太棒啦！你破案了！' },
};

const SIZE_MAP = {
  sm: { px: 64, emojiClass: 'text-4xl' },
  md: { px: 96, emojiClass: 'text-5xl' },
  lg: { px: 128, emojiClass: 'text-7xl' },
} as const;

const DECO_CLASS: Record<string, string> = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
};

export default function DetectiveMascot({
  mood = 'happy',
  size = 'md',
  message,
  showMessage = true,
  onMessageEnd,
  decorations,
}: DetectiveMascotProps) {
  const m = mascots[mood];
  const { px, emojiClass } = SIZE_MAP[size];
  const decoSize = DECO_CLASS[size];
  const [imgError, setImgError] = useState(false);

  // Reset error state when mood changes
  useEffect(() => { setImgError(false); }, [mood]);

  const hasDecorations = decorations && decorations.length > 0;
  const hats = hasDecorations ? decorations.filter(d => d.category === 'hat') : [];
  const accessories = hasDecorations ? decorations.filter(d => d.category === 'accessory') : [];
  const tools = hasDecorations ? decorations.filter(d => d.category === 'tool') : [];
  const outfits = hasDecorations ? decorations.filter(d => d.category === 'outfit') : [];

  const characterElement = (
    <div className="relative inline-block">
      {/* 帽子装饰 */}
      {hats.map(d => (
        <motion.span
          key={d.id}
          className={`absolute -top-2 left-1/2 -translate-x-1/2 z-10 ${decoSize}`}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {d.emoji}
        </motion.span>
      ))}
      {/* 服装装饰（底部） */}
      {outfits.map(d => (
        <span key={d.id} className={`absolute -bottom-1 left-1/2 -translate-x-1/2 z-10 ${decoSize}`}>
          {d.emoji}
        </span>
      ))}
      {/* 基础角色：图片 或 emoji fallback */}
      <motion.div
        className="cursor-default block"
        whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.3 }}
      >
        {imgError ? (
          <span className={emojiClass}>{m.emoji}</span>
        ) : (
          <Image
            src={m.image}
            alt={`小狐侦探 — ${mood}`}
            width={px}
            height={px}
            className="drop-shadow-md"
            priority={size === 'lg'}
            onError={() => setImgError(true)}
            unoptimized
          />
        )}
      </motion.div>
      {/* 工具/配件装饰（右侧） */}
      {tools.map(d => (
        <motion.span
          key={d.id}
          className={`absolute -right-1 top-1/2 -translate-y-1/2 z-10 ${decoSize}`}
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {d.emoji}
        </motion.span>
      ))}
      {/* 配件装饰（左侧） */}
      {accessories.map(d => (
        <motion.span
          key={d.id}
          className={`absolute -left-1 top-1/2 -translate-y-1/2 z-10 ${decoSize}`}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {d.emoji}
        </motion.span>
      ))}
    </div>
  );

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
        {characterElement}
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

      {characterElement}
    </motion.div>
  );
}
