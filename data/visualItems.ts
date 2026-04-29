// ========== 统一物品映射注册表 ==========
// 后续新增物品只需在此处添加即可

export interface VisualItem {
  key: string;
  itemName: string;
  itemEmoji: string;
  unit: string;
  scene: string;
}

export const visualItems: Record<string, VisualItem> = {
  rabbit: {
    key: 'rabbit',
    itemName: '小兔子',
    itemEmoji: '🐰',
    unit: '只',
    scene: '草地',
  },
  apple: {
    key: 'apple',
    itemName: '苹果',
    itemEmoji: '🍎',
    unit: '个',
    scene: '果园',
  },
  bird: {
    key: 'bird',
    itemName: '小鸟',
    itemEmoji: '🐦',
    unit: '只',
    scene: '树上',
  },
  book: {
    key: 'book',
    itemName: '图书',
    itemEmoji: '📚',
    unit: '本',
    scene: '书架',
  },
  goldfish: {
    key: 'goldfish',
    itemName: '金鱼',
    itemEmoji: '🐠',
    unit: '条',
    scene: '池塘',
  },
  pencil: {
    key: 'pencil',
    itemName: '铅笔',
    itemEmoji: '✏️',
    unit: '支',
    scene: '书包',
  },
  flower: {
    key: 'flower',
    itemName: '小花',
    itemEmoji: '🌸',
    unit: '朵',
    scene: '花园',
  },
  toyCar: {
    key: 'toyCar',
    itemName: '玩具车',
    itemEmoji: '🚗',
    unit: '辆',
    scene: '停车场',
  },
  egg: {
    key: 'egg',
    itemName: '鸡蛋',
    itemEmoji: '🥚',
    unit: '个',
    scene: '篮子',
  },
  goose: {
    key: 'goose',
    itemName: '白鹅',
    itemEmoji: '🦢',
    unit: '只',
    scene: '河边',
  },
  candy: {
    key: 'candy',
    itemName: '糖果',
    itemEmoji: '🍬',
    unit: '颗',
    scene: '糖果盒',
  },
  child: {
    key: 'child',
    itemName: '小朋友',
    itemEmoji: '🧒',
    unit: '个',
    scene: '教室',
  },
  fish: {
    key: 'fish',
    itemName: '小鱼',
    itemEmoji: '🐟',
    unit: '条',
    scene: '鱼缸',
  },
  cup: {
    key: 'cup',
    itemName: '水杯',
    itemEmoji: '🥤',
    unit: '个',
    scene: '桌子',
  },
  ball: {
    key: 'ball',
    itemName: '皮球',
    itemEmoji: '⚽',
    unit: '个',
    scene: '操场',
  },
  crayon: {
    key: 'crayon',
    itemName: '蜡笔',
    itemEmoji: '🖍️',
    unit: '支',
    scene: '文具盒',
  },
  peach: {
    key: 'peach',
    itemName: '桃子',
    itemEmoji: '🍑',
    unit: '个',
    scene: '树上',
  },
  bun: {
    key: 'bun',
    itemName: '包子',
    itemEmoji: '🥟',
    unit: '个',
    scene: '厨房',
  },
  duck: {
    key: 'duck',
    itemName: '鸭子',
    itemEmoji: '🦆',
    unit: '只',
    scene: '池塘',
  },
  cookie: {
    key: 'cookie',
    itemName: '饼干',
    itemEmoji: '🍪',
    unit: '块',
    scene: '桌上',
  },
  yogurt: {
    key: 'yogurt',
    itemName: '酸奶',
    itemEmoji: '🥛',
    unit: '个',
    scene: '冰箱',
  },
  butterfly: {
    key: 'butterfly',
    itemName: '蝴蝶',
    itemEmoji: '🦋',
    unit: '只',
    scene: '花丛',
  },
  strawberry: {
    key: 'strawberry',
    itemName: '草莓',
    itemEmoji: '🍓',
    unit: '颗',
    scene: '果盘',
  },
  carrot: {
    key: 'carrot',
    itemName: '胡萝卜',
    itemEmoji: '🥕',
    unit: '根',
    scene: '小兔家',
  },
  passenger: {
    key: 'passenger',
    itemName: '乘客',
    itemEmoji: '🧑',
    unit: '个',
    scene: '公交车',
  },
  sticker: {
    key: 'sticker',
    itemName: '贴纸',
    itemEmoji: '🌟',
    unit: '张',
    scene: '书包',
  },
  adult: {
    key: 'adult',
    itemName: '家长',
    itemEmoji: '👨',
    unit: '个',
    scene: '校门口',
  },
  frog: {
    key: 'frog',
    itemName: '青蛙',
    itemEmoji: '🐸',
    unit: '只',
    scene: '荷叶',
  },
  balloon: {
    key: 'balloon',
    itemName: '气球',
    itemEmoji: '🎈',
    unit: '个',
    scene: '公园',
  },
};

/**
 * 根据 visualKey 获取完整 VisualItem。
 * 如果 key 不存在，打印 warning 并返回占位物品。
 */
export function getVisual(key: string): VisualItem {
  const v = visualItems[key];
  if (!v) {
    console.warn(
      `[visualItems] visualKey "${key}" 不存在！请在 data/visualItems.ts 中添加该映射。`
    );
    return {
      key: 'unknown',
      itemName: '物品',
      itemEmoji: '⭐',
      unit: '个',
      scene: '未知',
    };
  }
  return v;
}
