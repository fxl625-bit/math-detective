'use client';

import { motion } from 'framer-motion';
import { useGameState } from '@/hooks/useGameState';
import { allDecorations, DecorationItem } from '@/data/decorations';
import DetectiveMascot from './DetectiveMascot';

export default function CostumeShop() {
  const { state, toggleDecoration } = useGameState();

  const equippedSet = new Set(state.decorations || []);
  const categories = ['hat', 'accessory', 'outfit', 'tool'] as const;
  const categoryNames: Record<string, string> = {
    hat: '帽子',
    accessory: '配件',
    outfit: '服装',
    tool: '工具',
  };

  const handleToggle = (item: DecorationItem) => {
    const unlocked = item.unlockCheck(state);
    if (!unlocked) return;
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
          decorations={allDecorations.filter(d => equippedSet.has(d.id))}
        />
      </div>

      {/* 分类展示 */}
      {categories.map(cat => {
        const items = allDecorations.filter(d => d.category === cat);
        return (
          <div key={cat}>
            <h3 className="text-sm font-bold text-gray-500 mb-2 px-1">
              {categoryNames[cat]}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {items.map(item => {
                const unlocked = item.unlockCheck(state);
                const equipped = equippedSet.has(item.id);

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
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg">🔒</span>
                      </div>
                    )}
                    {!unlocked && (
                      <span className="text-[10px] text-gray-400 text-center">
                        {item.unlockCondition}
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
