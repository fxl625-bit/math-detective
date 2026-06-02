'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarItem, getAvatarItemById } from '@/data/avatarItems';

interface DetectiveMascotProps {
  mood?: 'happy' | 'thinking' | 'encourage' | 'excited';
  size?: 'sm' | 'md' | 'lg';
  message?: string | string[];
  showMessage?: boolean;
  onMessageEnd?: () => void;
  decorations?: AvatarItem[];
}

const mascots: Record<string, { image: string; emoji: string; words: string }> = {
  happy:    { image: '/characters/detective-happy.png',     emoji: '🦊', words: '今天也是破案的好日子！' },
  thinking: { image: '/characters/detective-thinking.png',  emoji: '🤔', words: '让我仔细看看这个线索...' },
  encourage:{ image: '/characters/detective-encourage.png',  emoji: '💪', words: '别担心，再试一次吧！' },
  excited:  { image: '/characters/detective-excited.png',   emoji: '🎉', words: '太棒啦！你破案了！' },
};

const SIZE_MAP = {
  sm: { px: 64, emojiClass: 'text-4xl', decoSize: 'text-sm' },
  md: { px: 96, emojiClass: 'text-5xl', decoSize: 'text-lg' },
  lg: { px: 128, emojiClass: 'text-7xl', decoSize: 'text-2xl' },
} as const;

export default function DetectiveMascot({
  mood = 'happy',
  size = 'md',
  message,
  showMessage = true,
  onMessageEnd,
  decorations,
}: DetectiveMascotProps) {
  const m = mascots[mood];
  const { px, emojiClass, decoSize } = SIZE_MAP[size];
  const [imgError, setImgError] = useState(false);

  useEffect(() => { setImgError(false); }, [mood]);

  // 按 zIndex 排序 + 按 slot 分组（同 slot 只保留最后装备的，canStack 的除外）
  const items = decorations || [];
  // 同 slot 互斥处理：canStack 的保留全部，不 canStack 的只保留最后一个
  const slotLast: Record<string, AvatarItem> = {};
  const stackItems: AvatarItem[] = [];
  for (const item of items) {
    if (item.canStack) {
      stackItems.push(item);
    } else {
      slotLast[item.slot] = item; // 最后一个覆盖
    }
  }
  const resolved = [...Object.values(slotLast), ...stackItems];
  // 按 zIndex 分层排序
  resolved.sort((a, b) => (a.zIndex || 20) - (b.zIndex || 20));

  const characterElement = (
    <div className="relative inline-block">
      {/* 分层渲染装饰 */}
      {resolved.map(item => (
        <motion.span
          key={item.id}
          className={`${item.positionClass} ${decoSize} select-none pointer-events-none`}
          style={{ zIndex: item.zIndex || 20 }}
          animate={item.animateProps || {}}
          transition={item.animateProps ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined}
        >
          {item.emoji}
        </motion.span>
      ))}
      {/* 基础角色 */}
      <motion.div
        className="cursor-default block relative"
        style={{ zIndex: 20 }}
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

  useEffect(() => {
    if (messages && messages.length > 0) {
      setCurrentMsgIndex(0);
      setDisplayedText('');
      setIsTyping(true);
    }
  }, [message]);

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

  const bubbleText = messages ? displayedText : m.words;
  const showBubble = messages ? displayedText.length > 0 : size !== 'sm';

  return (
    <motion.div
      className="flex flex-col items-center gap-2 select-none"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <AnimatePresence>
        {showBubble && (
          <motion.div
            className="relative max-w-xs px-4 py-2.5 bg-white rounded-2xl border-2 border-amber-300 shadow-md"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-amber-300 rotate-45" />
            <p className="text-sm text-amber-800 font-medium leading-relaxed text-center"
              style={{ minHeight: messages ? '1.25em' : 'auto' }}>
              {bubbleText}
              {messages && isTyping && displayedText.length === (messages[currentMsgIndex]?.length || 0) && (
                <span className="animate-pulse">|</span>
              )}
            </p>
            {messages && messages.length > 1 && (
              <div className="flex justify-center gap-1 mt-1">
                {messages.map((_, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentMsgIndex ? 'bg-amber-400' : 'bg-amber-200'}`} />
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
