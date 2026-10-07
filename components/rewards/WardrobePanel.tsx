'use client';

import { useMemo, useState } from 'react';
import type { GameState } from '@/lib/types';
import { DETECTIVE_LEVEL_QUESTION_THRESHOLDS, getAchievementProgress, getDetectiveLevel } from '@/lib/achievements';
import { allAvatarItems, getAvatarItemById, getUnlockedItems, type AvatarItem, type AvatarSlot, type FoxThemeId } from '@/data/avatarItems';
import FoxIllustration from './FoxIllustration';

const slotOrder: AvatarSlot[] = ['hat', 'face', 'coat', 'handheld', 'badge', 'pet', 'aura', 'sticker', 'background'];
const slotLabels: Record<AvatarSlot, string> = {
  hat: '帽子', face: '脸部', coat: '外套', handheld: '工具', badge: '徽章',
  pet: '伙伴', aura: '光环', background: '场景', sticker: '贴纸',
};
const themeLabels: Record<FoxThemeId, string> = {
  classic: '经典侦探', space: '星际', ocean: '海洋', forest: '森林', workshop: '工坊', aurora: '极光',
};
const conditionText: Record<string, string> = {
  default: '默认可用', stars: '完成不同题目解锁', streak: '连续学习解锁', level: '侦探等级解锁',
  questions_completed: '完成不同题目解锁', perfect_questions: '独立首答解锁',
  reward_redemptions: '家庭奖励申请解锁', all_step_types: '完成多种关卡解锁',
};

function chooseTheme(items: readonly AvatarItem[]): FoxThemeId {
  const scene = [...items].reverse().find((item) => item.slot === 'background' && item.themeId);
  const themed = [...items].reverse().find((item) => item.themeId);
  return scene?.themeId || themed?.themeId || 'classic';
}

export default function WardrobePanel({
  state,
  onEquip,
}: {
  state: Readonly<GameState>;
  onEquip: (id: string) => void;
}) {
  const [selectedSlot, setSelectedSlot] = useState<AvatarSlot>('hat');
  const equippedKey = (state.decorations || []).join('|');
  const [previewDraft, setPreviewDraft] = useState(() => ({ equippedKey, ids: state.decorations || [] }));
  if (previewDraft.equippedKey !== equippedKey) setPreviewDraft({ equippedKey, ids: state.decorations || [] });
  const previewIds = useMemo(() => previewDraft.equippedKey === equippedKey ? previewDraft.ids : state.decorations || [], [previewDraft, equippedKey, state.decorations]);
  const setPreviewIds = (update: (previous: string[]) => string[]) => setPreviewDraft((previous) => ({
    equippedKey,
    ids: update(previous.equippedKey === equippedKey ? previous.ids : state.decorations || []),
  }));
  const achievementProgress = useMemo(() => getAchievementProgress(state), [state]);
  const progressById = new Map(achievementProgress.map((item) => [item.id, item]));
  const questionCount = progressById.get('exploration_legendary')?.current || 0;
  const firstTryCount = progressById.get('first_try_legendary')?.current || 0;
  const detectiveLevel = getDetectiveLevel(state);
  const unlockedIds = useMemo(() => new Set(getUnlockedItems(state).map((item) => item.id)), [state]);
  const previewItems = useMemo(() => previewIds.map((id) => getAvatarItemById(id)).filter((item): item is AvatarItem => Boolean(item)), [previewIds]);
  const previewTheme = chooseTheme(previewItems);
  const items = allAvatarItems.filter((item) => item.slot === selectedSlot);

  const tryOn = (item: AvatarItem) => {
    setPreviewIds((previous) => {
      const kept = previous.map((id) => getAvatarItemById(id)).filter((equipped): equipped is AvatarItem => Boolean(equipped))
        .filter((equipped) => equipped.slot !== item.slot || equipped.canStack || item.canStack)
        .map((equipped) => equipped.id);
      return Array.from(new Set([...kept, item.id]));
    });
  };

  const unlockHint = (item: AvatarItem) => {
    const condition = item.unlockCondition;
    if (condition.type === 'achievement' && condition.achievementId) {
      const progress = progressById.get(condition.achievementId);
      return progress ? `${progress.name}：${progress.current}/${progress.target}` : '完成对应学习成就解锁';
    }
    if (condition.type === 'level') {
      const targetLevel = condition.value || 1;
      const targetQuestions = DETECTIVE_LEVEL_QUESTION_THRESHOLDS[targetLevel - 1] ?? 100;
      return `侦探等级：${detectiveLevel}/${targetLevel}级；不同题目：${questionCount}/${targetQuestions}`;
    }
    if (condition.type === 'questions_completed') return `不同题目：${questionCount}/${condition.value || 0}`;
    if (condition.type === 'stars') return `不同题目：${questionCount}/${Math.max(20, Math.ceil((condition.value || 100) / 5))}`;
    if (condition.type === 'perfect_questions') return `独立首答：${firstTryCount}/${condition.value || 0}（原合格记录仍有效）`;
    if (condition.type === 'streak') return `连续学习：${state.streak || 0}/${condition.value || 0}天`;
    if (condition.type === 'reward_redemptions') return `家庭奖励申请：${state.rewardRedemptions?.length || 0}/${condition.value || 0}`;
    if (condition.type === 'all_step_types') return `完成练习：${state.totalCompleted || 0}/8`;
    return conditionText[condition.type] || '继续学习解锁';
  };

  return <section aria-label="小狐侦探衣橱" className="min-w-0 space-y-4">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-500">Wardrobe · 试装间</p>
      <h2 className="mt-1 text-xl font-black text-slate-900">换上你的侦探装备</h2>
      <p className="mt-1 text-sm text-slate-600">先试穿预览，再按“装备”保存选择。锁定物品可预览，不会消耗家庭积分。</p>
    </header>

    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(260px,.9fr)]">
      <div className="min-w-0 rounded-3xl border border-slate-200 bg-[#fffaf0] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-800">试穿预览</h3>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-800">{themeLabels[previewTheme]}</span>
        </div>
        <div className="flex min-h-[210px] items-end justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-amber-50 to-orange-100">
          <FoxIllustration themeId={previewTheme} items={previewItems} size={174} />
        </div>
          <p className="mt-2 min-h-5 text-center text-xs text-slate-600" aria-live="polite">试穿仅供预览；点击“装备”保存选择，点击“卸下”可移除已装备物品。</p>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-2 pb-1" role="group" aria-label="装扮类别">
          {slotOrder.map((slot) => <button
            key={slot}
            type="button"
            aria-pressed={selectedSlot === slot}
            onClick={() => setSelectedSlot(slot)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${selectedSlot === slot ? 'border-indigo-900 bg-indigo-900 text-white' : 'border-slate-300 bg-white text-slate-800'}`}
          >{slotLabels[slot]}</button>)}
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2">
          {items.map((item) => {
            const isUnlocked = unlockedIds.has(item.id);
            const equipped = (state.decorations || []).includes(item.id);
            const isPreviewed = previewIds.includes(item.id);
            return <article key={item.id} className={`min-w-0 rounded-2xl border p-2 ${isPreviewed ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex h-20 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-slate-50 to-amber-50">
                <FoxIllustration themeId={item.themeId || previewTheme} items={[item]} size={56} decorative />
              </div>
              <h4 className="mt-1 break-words text-xs font-extrabold leading-snug text-slate-900">{item.name}</h4>
              {equipped && <p className="mt-1 inline-flex min-h-6 items-center rounded-full bg-emerald-50 px-2 text-[10px] font-extrabold text-emerald-800">已装备</p>}
              {isPreviewed && !equipped && <p className="mt-1 inline-flex min-h-6 items-center rounded-full bg-amber-100 px-2 text-[10px] font-extrabold text-amber-900">试穿中</p>}
              <p className="mt-1 min-h-8 text-[10px] leading-relaxed text-slate-600">{isUnlocked ? item.description : unlockHint(item)}</p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <button type="button" onClick={() => tryOn(item)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-1 text-xs font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">{isPreviewed ? '预览中' : '试穿'}</button>
                <button
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => {
                    onEquip(item.id);
                    if (equipped) setPreviewIds((previous) => previous.filter((id) => id !== item.id));
                    else tryOn(item);
                  }}
                  className="min-h-11 rounded-lg bg-indigo-900 px-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >{equipped ? '卸下' : isUnlocked ? '装备' : '未解锁'}</button>
              </div>
            </article>;
          })}
        </div>
      </div>
    </div>
  </section>;
}
