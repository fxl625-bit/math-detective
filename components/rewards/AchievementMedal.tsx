'use client';

import { useId } from 'react';
import type { AchievementRarity } from '@/data/achievementCatalog';

const metals: Record<AchievementRarity, [string, string, string]> = {
  bronze: ['#f7d099', '#bd743f', '#713d2c'],
  silver: ['#f7fbff', '#aebccd', '#53627d'],
  gold: ['#fff1a5', '#e5a83d', '#8f572b'],
  legendary: ['#c3fcf1', '#67bfd1', '#594f99'],
};

export default function AchievementMedal({
  rarity,
  iconKey,
  size = 62,
  muted = false,
}: {
  rarity: AchievementRarity;
  iconKey: string;
  size?: number;
  muted?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const colors = metals[rarity];
  return <svg viewBox="0 0 72 82" width={size} height={size * 82 / 72} role="img" aria-label={`${rarity}成就勋章`} className="shrink-0">
    <defs>
      <linearGradient id={`${id}-metal`} x1="0" x2="1" y1="0" y2="1"><stop stopColor={colors[0]} /><stop offset=".48" stopColor={colors[1]} /><stop offset="1" stopColor={colors[2]} /></linearGradient>
      <linearGradient id={`${id}-ribbon`} x1="0" x2="1"><stop stopColor={colors[2]} /><stop offset=".5" stopColor={colors[1]} /><stop offset="1" stopColor={colors[2]} /></linearGradient>
    </defs>
    <path d="M22 47 L17 77 L35 68 L53 77 L49 47Z" fill={`url(#${id}-ribbon)`} stroke={colors[2]} strokeWidth="2" />
    <circle cx="36" cy="34" r="28" fill={`url(#${id}-metal)`} stroke={colors[2]} strokeWidth="3" />
    <circle cx="36" cy="34" r="21" fill="none" stroke="#fff9e9" strokeOpacity=".75" strokeWidth="1.5" />
    <circle cx="36" cy="34" r="17" fill={muted ? '#d9d6d0' : '#fff7de'} fillOpacity={muted ? '.58' : '.86'} />
    <path d="M36 19 L40 29 L51 30 L43 37 L45 48 L36 42 L27 48 L29 37 L21 30 L32 29Z" fill={muted ? '#7d8794' : colors[2]} />
    <g transform="translate(26 28)" fill="none" stroke={muted ? '#fff' : colors[0]} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {iconKey === 'magnifier' && <><circle cx="7" cy="7" r="5" /><path d="M11 11 L17 17" /></>}
      {iconKey === 'footprints' && <><path d="M5 3 Q1 4 3 9 Q5 12 8 9 Q10 6 5 3Z M14 10 Q10 11 12 16 Q14 19 17 16 Q19 13 14 10Z" /><circle cx="2" cy="2" r="1" fill="currentColor" /><circle cx="11" cy="9" r="1" fill="currentColor" /></>}
      {iconKey === 'turn-back' && <><path d="M4 5 H12 Q17 5 17 10 Q17 15 12 15 H8" /><path d="M7 2 L3 5 L7 8" /><path d="M8 12 L5 15 L8 18" /></>}
      {iconKey === 'spark' && <><path d="M10 1 L12 7 L18 9 L12 11 L10 17 L8 11 L2 9 L8 7Z" /><path d="M17 14 L18 17 L21 18 L18 19 L17 22 L16 19 L13 18 L16 17Z" /></>}
      {iconKey === 'brain' && <><path d="M10 3 Q7 0 5 4 Q1 4 3 9 Q0 13 5 15 Q5 20 10 18 M10 3 V19 M10 6 Q7 6 7 9 M10 13 Q7 13 7 16" /><path d="M11 3 Q14 0 16 4 Q20 4 18 9 Q21 13 16 15 Q16 20 11 18 M11 8 Q14 8 14 11 M11 14 Q14 14 14 17" /></>}
      {iconKey === 'map' && <><path d="M3 4 L8 2 L14 4 L19 2 V17 L14 19 L8 17 L3 19Z" /><path d="M8 2 V17 M14 4 V19" /></>}
      {!['magnifier', 'footprints', 'turn-back', 'spark', 'brain', 'map'].includes(iconKey) && <path d="M10 1 L12 7 L18 9 L12 11 L10 17 L8 11 L2 9 L8 7Z" />}
    </g>
    <path d="M18 22 Q27 7 43 9" fill="none" stroke="#fff" strokeWidth="3" strokeOpacity=".55" strokeLinecap="round" />
  </svg>;
}
