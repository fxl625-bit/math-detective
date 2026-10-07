'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { AvatarItem, FoxThemeId } from '@/data/avatarItems';
import FoxIllustration from '@/components/rewards/FoxIllustration';

interface DetectiveMascotProps {
  mood?: 'happy' | 'thinking' | 'encourage' | 'excited';
  size?: 'sm' | 'md' | 'lg';
  message?: string | string[];
  showMessage?: boolean;
  onMessageEnd?: () => void;
  decorations?: AvatarItem[];
  themeId?: FoxThemeId;
}

const SIZE_MAP = { sm: 64, md: 96, lg: 128 } as const;
const DEFAULT_WORDS = {
  happy: '今天也是破案的好日子！', thinking: '让我仔细看看这个线索…',
  encourage: '别担心，再试一次吧！', excited: '太棒啦！你破案了！',
} as const;

function TypingBubble({ messages, onMessageEnd }: { messages: string[]; onMessageEnd?: () => void }) {
  const reducedMotion = Boolean(useReducedMotion());
  const [displayedText, setDisplayedText] = useState(() => reducedMotion ? messages[0] || '' : '');
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    if (!messages.length) return;
    if (reducedMotion) {
      onMessageEnd?.();
      return;
    }
    const fullText = messages[currentIndex] || '';
    if (displayedText.length >= fullText.length) {
      const timer = window.setTimeout(() => {
        if (currentIndex < messages.length - 1) {
          setCurrentIndex((previous) => previous + 1);
          setDisplayedText('');
        } else onMessageEnd?.();
      }, 850);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setDisplayedText(fullText.slice(0, displayedText.length + 1)), 35);
    return () => window.clearTimeout(timer);
  }, [messages, currentIndex, displayedText, reducedMotion, onMessageEnd]);
  return <motion.div
    className="relative max-w-xs rounded-2xl border-2 border-amber-300 bg-white px-4 py-2.5 shadow-md"
    initial={reducedMotion ? false : { opacity: 0, scale: .95, y: 5 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
  >
    <div aria-hidden="true" className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-amber-300 bg-white" />
    <p className="relative min-h-[1.25em] text-center text-sm font-medium leading-relaxed text-amber-900">{reducedMotion ? messages[currentIndex] : displayedText}</p>
    {messages.length > 1 && <div className="mt-1 flex justify-center gap-1" aria-label={`第${currentIndex + 1}条，共${messages.length}条`}>
      {messages.map((_, index) => <span key={index} aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${index === currentIndex ? 'bg-amber-500' : 'bg-amber-200'}`} />)}
    </div>}
  </motion.div>;
}

export default function DetectiveMascot({
  mood = 'happy', size = 'md', message, showMessage = true, onMessageEnd, decorations, themeId,
}: DetectiveMascotProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const px = SIZE_MAP[size];
  const messages = useMemo(() => Array.isArray(message) ? message : typeof message === 'string' && message.length ? [message] : null, [message]);
  const safeItems = decorations || [];
  const slotLast: Record<string, AvatarItem> = {};
  const stackItems: AvatarItem[] = [];
  for (const item of safeItems) {
    if (item.canStack) stackItems.push(item);
    else slotLast[item.slot] = item;
  }
  const resolved = [...Object.values(slotLast), ...stackItems].sort((a, b) => (a.zIndex || 20) - (b.zIndex || 20));
  const selectedTheme = themeId || [...resolved].reverse().find((item) => item.themeId)?.themeId || 'classic';
  const vectorItems = resolved.filter((item) => item.artKey);
  const legacyItems = resolved.filter((item) => !item.artKey);

  const characterElement = <motion.div
    className="relative inline-block select-none"
    style={{ width: px, height: px * 280 / 240 }}
    whileHover={reducedMotion ? undefined : { scale: 1.04, rotate: [0, -2, 2, 0] }}
    transition={{ duration: .35 }}
  >
    <FoxIllustration themeId={selectedTheme} items={vectorItems} mood={mood} size={px} />
    {legacyItems.map((item) => <motion.span
      key={item.id}
      aria-hidden="true"
      className={`${item.positionClass} pointer-events-none select-none text-lg`}
      style={{ zIndex: item.zIndex || 20 }}
      animate={reducedMotion ? undefined : item.animateProps || {}}
      transition={!reducedMotion && item.animateProps ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >{item.emoji}</motion.span>)}
  </motion.div>;

  if (!showMessage) return <div className="flex flex-col items-center gap-2 select-none">{characterElement}</div>;
  const showTypingBubble = Boolean(messages?.length);
  const showDefaultBubble = messages === null && size !== 'sm';
  return <div className="flex flex-col items-center gap-2 select-none">
    <AnimatePresence>
      {showTypingBubble && messages && <TypingBubble key={messages.join('\u0000')} messages={messages} onMessageEnd={onMessageEnd} />}
      {showDefaultBubble && <motion.div className="relative max-w-xs rounded-2xl border-2 border-amber-300 bg-white px-4 py-2.5 shadow-md" initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
        <div aria-hidden="true" className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-amber-300 bg-white" />
        <p className="relative text-center text-sm font-medium leading-relaxed text-amber-900">{DEFAULT_WORDS[mood]}</p>
      </motion.div>}
    </AnimatePresence>
    {characterElement}
  </div>;
}
