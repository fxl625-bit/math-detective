import { GameState } from '@/lib/types';

export interface DecorationItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'hat' | 'accessory' | 'outfit' | 'tool';
  unlockCondition: string;
  unlockCheck: (state: GameState) => boolean;
}

export const allDecorations: DecorationItem[] = [
  {
    id: 'dec_default_hat',
    name: '侦探帽',
    description: '每个侦探都有一顶属于自己的帽子',
    emoji: '🎩',
    category: 'hat',
    unlockCondition: '自动获得',
    unlockCheck: () => true,
  },
  {
    id: 'dec_magnifier',
    name: '放大镜',
    description: '观察线索必不可少的工具',
    emoji: '🔍',
    category: 'tool',
    unlockCondition: '完成10道题',
    unlockCheck: (s) => s.totalCompleted >= 10,
  },
  {
    id: 'dec_badge',
    name: '侦探徽章',
    description: '努力学习的证明',
    emoji: '⭐',
    category: 'accessory',
    unlockCondition: '连续打卡3天',
    unlockCheck: (s) => s.streak >= 3,
  },
  {
    id: 'dec_glasses',
    name: '智慧眼镜',
    description: '戴上就能看得更清楚',
    emoji: '🕶️',
    category: 'accessory',
    unlockCondition: '连续打卡7天',
    unlockCheck: (s) => s.streak >= 7,
  },
  {
    id: 'dec_crown',
    name: '王牌皇冠',
    description: '王牌侦探的标志',
    emoji: '👑',
    category: 'hat',
    unlockCondition: '达到侦探等级5',
    unlockCheck: (s) => s.level >= 5,
  },
  {
    id: 'dec_torch',
    name: '手电筒',
    description: '黑暗中也能找到线索',
    emoji: '🔦',
    category: 'tool',
    unlockCondition: '连续打卡14天',
    unlockCheck: (s) => s.streak >= 14,
  },
  {
    id: 'dec_cape',
    name: '侦探披风',
    description: '穿上披风破案更帅气',
    emoji: '🧣',
    category: 'outfit',
    unlockCondition: '完成50道题',
    unlockCheck: (s) => s.totalCompleted >= 50,
  },
  {
    id: 'dec_wreath',
    name: '月桂花环',
    description: '传奇侦探的最高荣誉',
    emoji: '🏵️',
    category: 'hat',
    unlockCondition: '达到侦探等级6',
    unlockCheck: (s) => s.level >= 6,
  },
  {
    id: 'dec_medal',
    name: '准确之星',
    description: '保持30题以上零错误的精准',
    emoji: '🎖️',
    category: 'accessory',
    unlockCondition: '正确30题且无错误',
    unlockCheck: (s) => s.correctCount >= 30 && s.wrongCount === 0,
  },
  {
    id: 'dec_scarf',
    name: '格子围巾',
    description: '认真做题的小侦探专属',
    emoji: '🧣',
    category: 'outfit',
    unlockCondition: '完成100道题',
    unlockCheck: (s) => s.totalCompleted >= 100,
  },
];

// ========== 辅助函数 ==========

export function getUnlockedDecorations(state: GameState): DecorationItem[] {
  return allDecorations.filter(d => d.unlockCheck(state));
}

export function getDecorationById(id: string): DecorationItem | undefined {
  return allDecorations.find(d => d.id === id);
}

export function isDecorationUnlocked(state: GameState, id: string): boolean {
  const d = getDecorationById(id);
  return d ? d.unlockCheck(state) : false;
}

export function getEquippedDecorations(state: GameState): DecorationItem[] {
  const equippedIds = new Set(state.decorations || []);
  return allDecorations.filter(d => equippedIds.has(d.id));
}

export function getDecorationsByCategory(category: DecorationItem['category']): DecorationItem[] {
  return allDecorations.filter(d => d.category === category);
}

export function getNewlyUnlocked(state: GameState, previousDecorations: string[]): DecorationItem[] {
  const prevSet = new Set(previousDecorations);
  const unlocked = getUnlockedDecorations(state);
  return unlocked.filter(d => !prevSet.has(d.id));
}
