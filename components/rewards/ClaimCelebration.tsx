'use client';

import { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { AchievementRarity } from '@/data/achievementCatalog';
import AchievementMedal from './AchievementMedal';

export default function ClaimCelebration({
  kind,
  title,
  onClose,
  returnFocusTo,
  rarity = 'gold',
  iconKey = 'spark',
}: {
  kind: 'achievement' | 'item' | 'reward';
  title: string;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
  rarity?: AchievementRarity;
  iconKey?: string;
}) {
  const reducedMotion = Boolean(useReducedMotion());
  const id = useId().replace(/:/g, '');
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previousFocus = returnFocusTo || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const focusables = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') || []);
    const focusFrame = window.requestAnimationFrame(() => focusables()[0]?.focus());
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', keepFocusInside);
    return () => {
      window.removeEventListener('keydown', keepFocusInside);
      window.cancelAnimationFrame(focusFrame);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose, returnFocusTo]);
  const label = kind === 'achievement' ? '勋章揭晓' : kind === 'item' ? '新装扮解锁' : '家庭奖励申请已提交';
  const message = kind === 'achievement'
    ? '这是你真实学习记录中获得的成就。'
    : kind === 'item'
      ? '这件新装扮由学习成就解锁。'
      : '等待家长线下兑现；可在积分页查看申请状态。';
  return <AnimatePresence>
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#10162c]/70 p-4 backdrop-blur-sm"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      role="presentation"
    >
      <motion.section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative w-full max-w-sm rounded-[2rem] border border-amber-200/60 bg-gradient-to-b from-[#fff8e7] to-white p-6 text-center shadow-2xl"
        initial={reducedMotion ? false : { y: 14, scale: .96 }}
        animate={{ y: 0, scale: 1 }}
        exit={reducedMotion ? undefined : { y: 8, scale: .98 }}
      >
        <button type="button" autoFocus onClick={onClose} className="absolute right-3 top-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" aria-label="关闭揭晓">×</button>
        <div className="relative mx-auto mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-amber-100">
          {!reducedMotion && <motion.span aria-hidden="true" className="absolute -inset-y-3 left-0 z-10 w-6 -skew-x-12 bg-white/50 blur-sm" initial={{ x: -32, opacity: 0 }} animate={{ x: 124, opacity: [.0, .42, 0] }} transition={{ duration: 1.15, ease: 'easeInOut' }} />}
          {kind === 'achievement' ? <motion.div
            initial={reducedMotion ? false : { rotateY: 88, scale: .72 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={reducedMotion ? undefined : { duration: 1.15, ease: [0.18, 0.76, 0.23, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
          ><AchievementMedal rarity={rarity} iconKey={iconKey} size={76} /></motion.div> : kind === 'item' ? <motion.svg
            viewBox="0 0 88 88" width="76" height="76" role="img" aria-label="解锁的侦探外套"
            initial={reducedMotion ? false : { y: 5, scale: .86, rotate: -5 }} animate={{ y: 0, scale: 1, rotate: 0 }}
            transition={reducedMotion ? undefined : { duration: .65, ease: 'easeOut' }}
          >
            <defs><linearGradient id={`${id}-coat`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#586b9e" /><stop offset="1" stopColor="#26365d" /></linearGradient></defs>
            <path d="M25 20 Q34 15 40 14 L44 20 L49 14 Q58 15 66 20 L75 39 L65 46 L61 37 L63 74 H24 L27 37 L22 46 L13 39Z" fill={`url(#${id}-coat)`} stroke="#1d2a48" strokeWidth="3" strokeLinejoin="round" />
            <path d="M39 16 L44 25 L49 16 L55 27 L49 53 L44 58 L38 53 L33 27Z" fill="#fff1c8" stroke="#e7c576" strokeWidth="2" />
            <path d="M44 24 V54 M28 56 H60" stroke="#e7c576" strokeWidth="2" />
            <circle cx="44" cy="64" r="2.5" fill="#f4d88e" />
            <path d="M20 25 Q29 12 39 17 M68 25 Q59 12 50 17" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".6" />
          </motion.svg> : <motion.svg
            viewBox="0 0 88 88" width="76" height="76" role="img" aria-label="揭晓礼盒"
            initial={reducedMotion ? false : { y: 5, scale: .88 }} animate={{ y: 0, scale: 1 }}
            transition={reducedMotion ? undefined : { duration: .55, ease: 'easeOut' }}
          >
            <defs><linearGradient id={`${id}-box`} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#f7cb72" /><stop offset="1" stopColor="#c9833d" /></linearGradient></defs>
            <path d="M18 36 H70 V72 Q70 76 66 76 H22 Q18 76 18 72Z" fill={`url(#${id}-box)`} stroke="#80502c" strokeWidth="3" />
            <path d="M14 29 Q14 24 19 24 H69 Q74 24 74 29 V39 H14Z" fill="#e5ac53" stroke="#80502c" strokeWidth="3" />
            <path d="M39 24 Q21 18 26 11 Q33 4 44 23 Q55 4 63 11 Q68 18 49 24Z" fill="#d96556" stroke="#8c3f42" strokeWidth="3" />
            <path d="M40 26 H49 V76 H40Z" fill="#f5e7b5" />
            <path d="M44 42 L47 49 L55 50 L49 55 L51 63 L44 59 L37 63 L39 55 L33 50 L41 49Z" fill="#fff4be" />
          </motion.svg>}
        </div>
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-amber-800">{label}</p>
        <h2 className="mt-2 break-words text-2xl font-black text-indigo-950">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <button type="button" onClick={onClose} className="mt-5 min-h-11 w-full rounded-xl bg-indigo-900 px-5 py-3 font-bold text-white transition hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">继续探索</button>
      </motion.section>
    </motion.div>
  </AnimatePresence>;
}
