'use client';

import { motion } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import { allAvatarItems, getUnlockedItems, getAvatarItemById, AvatarSlot, AvatarItem } from '@/data/avatarItems';
import DetectiveMascot from './DetectiveMascot';

const SLOT_NAMES: Record<AvatarSlot, string> = {
  hat: '帽子',
  face: '眼镜/脸部',
  coat: '服装',
  handheld: '手持工具',
  badge: '徽章',
  background: '背景',
  aura: '光效',
  pet: '宠物',
  sticker: '贴纸',
};

const CONDITION_LABELS: Record<string, (v?: number) => string> = {
  default: () => '自动解锁',
  stars: (v) => `${v} 颗星星解锁`,
  streak: (v) => `连续打卡 ${v} 天解锁`,
  level: (v) => `达到侦探等级 ${v} 解锁`,
  questions_completed: (v) => `完成 ${v} 题解锁`,
  perfect_questions: (v) => `${v} 题零错误解锁`,
  reward_redemptions: (v) => `兑换 ${v} 次家长奖励解锁`,
  all_step_types: () => '完成全部关卡类型解锁',
};

export default function CostumeShop() {
  const { state, toggleDecoration } = useGameState();

  const equippedIds = new Set(state.decorations || []);
  const unlockedItems = getUnlockedItems(state);
  const unlockedIds = new Set(unlockedItems.map(i => i.id));

  // 按 slot 分组展示
  const slots: AvatarSlot[] = ['hat', 'face', 'badge', 'handheld', 'coat', 'aura', 'sticker'];
  const allItemsBySlot: Record<string, AvatarItem[]> = {};
  for (const s of slots) {
    allItemsBySlot[s] = allAvatarItems.filter(i => i.slot === s);
  }

  // Get equipped items for preview
  const equippedItems = Array.from(equippedIds)
    .map(id => getAvatarItemById(id))
    .filter(Boolean) as AvatarItem[];

  const handleToggle = (item: AvatarItem) => {
    if (!unlockedIds.has(item.id)) return;
    toggleDecoration(item.id);
  };

  return (
    <div className="space-y-4">
      {/* 侦探预览 */}
      <div className="bg-amber-50 rounded-2xl p-4 flex justify-center">
        <DetectiveMascot
          mood="happy"
          size="lg"
          showMessage={false}
          decorations={equippedItems}
        />
      </div>

      {/* 按 slot 分类展示 */}
      {slots.map(slot => {
        const items = allItemsBySlot[slot] || [];
        if (items.length === 0) return null;
        return (
          <div key={slot}>
            <h3 className="text-sm font-bold text-gray-500 mb-2 px-1">
              {SLOT_NAMES[slot]}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {items.map(item => {
                const unlocked = unlockedIds.has(item.id);
                const equipped = equippedIds.has(item.id);

                return (
                  <motion.button
                    key={item.id}
                    whileTap={unlocked ? { scale: 0.92 } : {}}
                    onClick={() => handleToggle(item)}
                    className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      equipped
                        ? 'border-amber-400 bg-amber-50 shadow-md'
                        : unlocked
                          ? 'border-gray-200 bg-white hover:border-amber-200'
                          : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                      {item.name}
                    </span>
                    {equipped && (
                      <motion.span
                        className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center text-white text-xs"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        ✓
                      </motion.span>
                    )}
                    {!unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl">
                        <span className="text-lg">🔒</span>
                      </div>
                    )}
                    {!unlocked && (
                      <span className="text-[10px] text-gray-400 text-center">
                        {CONDITION_LABELS[item.unlockCondition.type]?.(item.unlockCondition.value) || '未解锁'}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
