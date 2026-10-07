'use client';

import type { GameState } from '@/lib/types';
import { useState } from 'react';
import { getAchievementProgress } from '@/lib/achievements';
import { getBadgeById } from '@/data/badges';
import type { AchievementCategory } from '@/data/achievementCatalog';
import AchievementMedal from './AchievementMedal';
import ClaimCelebration from './ClaimCelebration';
import type { AchievementProgress } from '@/lib/achievements';

const categoryLabels: Record<AchievementCategory, string> = {
  exploration: '线索探索', persistence: '坚持练习', recovery: '错题重破',
  first_try: '独立首答', thinking: '思维挑战', breadth: '知识地图',
};
const categoryOrder: AchievementCategory[] = ['exploration', 'persistence', 'recovery', 'first_try', 'thinking', 'breadth'];

export default function MedalGallery({ state }: { state: Readonly<GameState> }) {
  const progress = getAchievementProgress(state);
  const historicalBadges = Array.from(new Set(state.badges || []));
  const [revealed, setRevealed] = useState<{ achievement: AchievementProgress; returnFocusTo: HTMLElement } | null>(null);
  return <section aria-label="成就勋章收藏" className="min-w-0 space-y-5">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.22em] text-indigo-500">Casebook · 侦探档案</p>
      <h2 className="mt-1 text-xl font-black text-slate-900">成就勋章</h2>
      <p className="mt-1 text-sm text-slate-600">每枚勋章都来自实际学习记录；重复练同一道题不会重复累计。</p>
    </header>
    {categoryOrder.map((category) => {
      const family = progress.filter((item) => item.category === category);
      return <section key={category} aria-labelledby={`medal-family-${category}`} className="min-w-0">
        <h3 id={`medal-family-${category}`} className="mb-2 font-bold text-slate-800">{categoryLabels[category]}</h3>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {family.map((item) => <details key={item.id} className={`min-w-0 rounded-2xl border p-3 ${item.unlocked ? 'border-amber-300 bg-[#fff9e9]' : 'border-slate-200 bg-white'}`}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <AchievementMedal rarity={item.rarity} iconKey={item.iconKey} size={48} muted={!item.unlocked} />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-xs font-extrabold leading-snug text-slate-900">{item.name}</span>
                <span className="mt-1 block text-[11px] font-semibold text-slate-500">{item.current}/{item.target}</span>
              </span>
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.description}</p>
            <div
              role="progressbar"
              aria-label={`${item.name}进度`}
              aria-valuemin={0}
              aria-valuemax={item.target}
              aria-valuenow={Math.min(item.current, item.target)}
              className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
            >
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${Math.min(100, item.current / item.target * 100)}%` }} />
            </div>
            <p className="mt-1 text-[11px] font-semibold text-indigo-700">{item.unlocked ? '已获得' : '继续学习即可解锁'}</p>
            {item.unlocked && <button type="button" onClick={(event) => setRevealed({ achievement: item, returnFocusTo: event.currentTarget })} className="mt-2 min-h-11 w-full rounded-lg border border-amber-500 bg-white px-2 text-xs font-bold text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">展示勋章</button>}
          </details>)}
        </div>
      </section>;
    })}
    {historicalBadges.length > 0 && <section aria-label="历史徽章收藏" className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="font-bold text-slate-800">历史徽章</h3>
      <p className="mt-1 text-xs text-slate-600">保留此前获得的徽章；它们不会重复计入新的学习成就。</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {historicalBadges.map((id, index) => {
          const badge = getBadgeById(id);
          return <article key={`${id}-${index}`} className="flex min-h-16 items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
            <span aria-hidden="true" className="text-2xl">{badge?.icon || '🏅'}</span>
            <span className="min-w-0">
              <span className="block break-words text-sm font-bold text-slate-900">{badge?.name || '历史徽章'}</span>
              {badge?.description && <span className="mt-0.5 block text-xs text-slate-600">{badge.description}</span>}
            </span>
          </article>;
        })}
      </div>
    </section>}
    {revealed && <ClaimCelebration
      kind="achievement"
      title={revealed.achievement.name}
      rarity={revealed.achievement.rarity}
      iconKey={revealed.achievement.iconKey}
      returnFocusTo={revealed.returnFocusTo}
      onClose={() => setRevealed(null)}
    />}
  </section>;
}
