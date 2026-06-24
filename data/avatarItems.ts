// ========== 装扮槽位与锚点系统 ==========

import type { TargetAndTransition } from 'framer-motion';

export type AvatarSlot = 'hat' | 'face' | 'coat' | 'handheld' | 'badge' | 'background' | 'aura' | 'pet' | 'sticker';

export type AvatarAnchor =
  | 'head_top' | 'face_center' | 'eyes' | 'chest'
  | 'left_hand' | 'right_hand' | 'background_back'
  | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right'
  | 'aura_left' | 'aura_right' | 'aura_top';

export interface AvatarItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  slot: AvatarSlot;
  anchor: AvatarAnchor;
  zIndex: number;
  /** CSS class string for absolute positioning — used directly in the mascot render */
  positionClass: string;
  /** Framer Motion animate props */
  animateProps?: TargetAndTransition;
  unlockCondition: {
    type: 'default' | 'stars' | 'streak' | 'level' | 'questions_completed' | 'perfect_questions' | 'reward_redemptions' | 'all_step_types';
    value?: number;
  };
  defaultUnlocked?: boolean;
  defaultEquipped?: boolean;
  canStack?: boolean;
}

// ========== 锚点默认坐标（用于 positionClass 生成） ==========

export const ANCHOR_POSITIONS: Record<AvatarAnchor, { x: number; y: number; offset: string }> = {
  head_top:        { x: 0, y: -118, offset: 'absolute -top-2 left-1/2 -translate-x-1/2' },
  face_center:     { x: 0, y: -40,  offset: 'absolute top-[20%] left-1/2 -translate-x-1/2' },
  eyes:            { x: 0, y: -52,  offset: 'absolute top-[15%] left-1/2 -translate-x-1/2' },
  chest:           { x: 0, y: 58,   offset: 'absolute top-[55%] left-1/2 -translate-x-1/2' },
  left_hand:       { x: -72, y: 50, offset: 'absolute top-[50%] -left-8 -translate-y-1/2' },
  right_hand:      { x: 72, y: 50,  offset: 'absolute top-[50%] -right-8 -translate-y-1/2' },
  background_back: { x: 0, y: 0,    offset: 'absolute inset-0' },
  top_left:        { x: -120, y: -120, offset: 'absolute -top-3 -left-3' },
  top_right:       { x: 120, y: -120,  offset: 'absolute -top-3 -right-3' },
  bottom_left:     { x: -120, y: 120,  offset: 'absolute -bottom-3 -left-3' },
  bottom_right:    { x: 120, y: 120,   offset: 'absolute -bottom-3 -right-3' },
  aura_left:       { x: -115, y: -45,  offset: 'absolute top-[15%] -left-6' },
  aura_right:      { x: 115, y: -45,   offset: 'absolute top-[15%] -right-6' },
  aura_top:        { x: 0, y: -150,    offset: 'absolute -top-6 left-1/2 -translate-x-1/2' },
};

// ========== 全部装扮物品 ==========

export const allAvatarItems: AvatarItem[] = [
  // ── 帽子（位置正确，不动） ──
  {
    id: 'dec_default_hat',
    name: '侦探帽',
    description: '每个侦探都有一顶属于自己的帽子',
    emoji: '🎩',
    slot: 'hat',
    anchor: 'head_top',
    zIndex: 30,
    positionClass: 'absolute -top-2 left-1/2 -translate-x-1/2', // 保持原有精确定位
    animateProps: { y: [0, -2, 0] },
    unlockCondition: { type: 'default' },
    defaultUnlocked: true,
    defaultEquipped: true,
  },
  {
    id: 'dec_crown',
    name: '王牌皇冠',
    description: '王牌侦探的标志',
    emoji: '👑',
    slot: 'hat',
    anchor: 'head_top',
    zIndex: 30,
    positionClass: 'absolute -top-2 left-1/2 -translate-x-1/2', // 同帽子位置
    animateProps: { y: [0, -2, 0] },
    unlockCondition: { type: 'level', value: 5 },
  },
  {
    id: 'dec_wreath',
    name: '月桂花环',
    description: '传奇侦探的最高荣誉',
    emoji: '🏵️',
    slot: 'hat',
    anchor: 'head_top',
    zIndex: 30,
    positionClass: 'absolute -top-2 left-1/2 -translate-x-1/2',
    animateProps: { y: [0, -2, 0] },
    unlockCondition: { type: 'level', value: 6 },
  },

  // ── 脸部/眼镜（face slot, eyes anchor） ──
  {
    id: 'dec_glasses',
    name: '智慧眼镜',
    description: '戴上就能看得更清楚',
    emoji: '🕶️',
    slot: 'face',
    anchor: 'eyes',
    zIndex: 40,
    positionClass: 'absolute top-[12%] left-1/2 -translate-x-1/2',
    unlockCondition: { type: 'streak', value: 7 },
  },

  // ── 胸章（badge slot, chest anchor） ──
  {
    id: 'dec_badge',
    name: '侦探徽章',
    description: '努力学习的证明',
    emoji: '⭐',
    slot: 'badge',
    anchor: 'chest',
    zIndex: 35,
    positionClass: 'absolute top-[58%] left-[65%] -translate-x-1/2',
    unlockCondition: { type: 'streak', value: 3 },
    canStack: true,
  },
  {
    id: 'dec_medal',
    name: '准确之星',
    description: '保持30题以上零错误的精准',
    emoji: '🎖️',
    slot: 'badge',
    anchor: 'chest',
    zIndex: 35,
    positionClass: 'absolute top-[58%] left-[35%] -translate-x-1/2',
    unlockCondition: { type: 'perfect_questions', value: 30 },
  },

  // ── 手持工具（handheld slot, right_hand anchor） ──
  {
    id: 'dec_magnifier',
    name: '放大镜',
    description: '观察线索必不可少的工具',
    emoji: '🔍',
    slot: 'handheld',
    anchor: 'right_hand',
    zIndex: 45,
    positionClass: 'absolute top-[50%] -right-1 -translate-y-1/2',
    animateProps: { rotate: [0, -5, 5, 0] },
    unlockCondition: { type: 'questions_completed', value: 10 },
    defaultUnlocked: true,
    defaultEquipped: true,
  },
  {
    id: 'dec_torch',
    name: '手电筒',
    description: '黑暗中也能找到线索',
    emoji: '🔦',
    slot: 'handheld',
    anchor: 'right_hand',
    zIndex: 45,
    positionClass: 'absolute top-[50%] -right-1 -translate-y-1/2',
    animateProps: { rotate: [0, -5, 5, 0] },
    unlockCondition: { type: 'streak', value: 14 },
  },

  // ── 服装（coat slot） ──
  {
    id: 'dec_cape',
    name: '侦探披风',
    description: '穿上披风破案更帅气',
    emoji: '🧣',
    slot: 'coat',
    anchor: 'background_back',
    zIndex: 25,
    positionClass: 'absolute -bottom-1 left-1/2 -translate-x-1/2',
    unlockCondition: { type: 'questions_completed', value: 50 },
  },
  {
    id: 'dec_scarf',
    name: '格子围巾',
    description: '认真做题的小侦探专属',
    emoji: '🧣',
    slot: 'coat',
    anchor: 'background_back',
    zIndex: 25,
    positionClass: 'absolute -bottom-1 left-1/2 -translate-x-1/2',
    unlockCondition: { type: 'questions_completed', value: 100 },
  },

  // ── 光效（aura slot，可叠加，不同anchor） ──
  {
    id: 'aura_star_left',
    name: '左侧星星',
    description: '聪明的小星星',
    emoji: '⭐',
    slot: 'aura',
    anchor: 'aura_left',
    zIndex: 10,
    positionClass: 'absolute top-[10%] -left-4',
    animateProps: { scale: [1, 1.15, 1] },
    unlockCondition: { type: 'streak', value: 3 },
    canStack: true,
  },
  {
    id: 'aura_star_right',
    name: '右侧星光',
    description: '闪闪发光的侦探魂',
    emoji: '✨',
    slot: 'aura',
    anchor: 'aura_right',
    zIndex: 10,
    positionClass: 'absolute top-[10%] -right-4',
    animateProps: { scale: [1, 1.2, 1] },
    unlockCondition: { type: 'streak', value: 7 },
    canStack: true,
  },
  {
    id: 'aura_fire_top',
    name: '头顶火焰',
    description: '连续打卡的火热证明',
    emoji: '🔥',
    slot: 'aura',
    anchor: 'aura_top',
    zIndex: 10,
    positionClass: 'absolute -top-6 left-1/2 -translate-x-1/2',
    animateProps: { y: [0, -3, 0], scale: [1, 1.1, 1] },
    unlockCondition: { type: 'streak', value: 14 },
    canStack: true,
  },

  // ── 贴纸（sticker slot，可叠加，分散四角） ──
  {
    id: 'sticker_heart',
    name: '爱心贴纸',
    description: '小侦探的爱心',
    emoji: '💖',
    slot: 'sticker',
    anchor: 'top_left',
    zIndex: 50,
    positionClass: 'absolute -top-1 -left-1',
    unlockCondition: { type: 'streak', value: 3 },
    canStack: true,
  },
  {
    id: 'sticker_star_corner',
    name: '角落星星',
    description: '角落里的星光',
    emoji: '🌟',
    slot: 'sticker',
    anchor: 'top_right',
    zIndex: 50,
    positionClass: 'absolute -top-1 -right-1',
    unlockCondition: { type: 'stars', value: 100 },
    canStack: true,
  },
];

// ========== 辅助函数 ==========

export function getAvatarItemById(id: string): AvatarItem | undefined {
  return allAvatarItems.find(i => i.id === id);
}

export function getUnlockedItems(state: { stars: number; streak: number; level: number; totalCompleted: number; correctCount: number; wrongCount: number; rewardRedemptions: unknown[] }): AvatarItem[] {
  return allAvatarItems.filter(item => {
    if (item.defaultUnlocked) return true;
    const c = item.unlockCondition;
    switch (c.type) {
      case 'stars': return state.stars >= (c.value || 0);
      case 'streak': return state.streak >= (c.value || 0);
      case 'level': return state.level >= (c.value || 0);
      case 'questions_completed': return state.totalCompleted >= (c.value || 0);
      case 'perfect_questions': return state.correctCount >= (c.value || 0) && state.wrongCount === 0;
      case 'reward_redemptions': return state.rewardRedemptions.length >= (c.value || 0);
      case 'all_step_types': return state.totalCompleted >= 8;
      default: return false;
    }
  });
}

export function getDefaultEquipped(): string[] {
  return allAvatarItems.filter(i => i.defaultEquipped).map(i => i.id);
}

export function getItemsBySlot(): Record<AvatarSlot, AvatarItem[]> {
  const map: Record<string, AvatarItem[]> = {};
  for (const item of allAvatarItems) {
    if (!map[item.slot]) map[item.slot] = [];
    map[item.slot].push(item);
  }
  return map;
}
