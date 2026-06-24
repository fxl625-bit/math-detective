import { LessonStepType, GradeBand, type Question } from './types';
import { getForbiddenTagsForScene, type ThemeTag } from './taxonomy';

// ========== 案件故事模板 ==========

export interface StepNarrative {
  title: string;
  description: string;
  instruction: string;
}

export type ThemeStrictness = 'strict' | 'semi_strict' | 'generic';

export interface CaseStory {
  id: string;
  title: string;
  theme: string;
  gradeBand: GradeBand[];
  introText: string[];
  stepNarratives: Partial<Record<LessonStepType, StepNarrative>>;
  completeText: string;
  rewardHint: string;
  /** v2.6.11: 主题允许的场景类型（题目 sceneType 必须匹配之一） */
  allowedSceneTypes?: string[];
  /** v2.6.11: 主题标签（题目 themeTags 必须包含至少一个） */
  themeTags?: string[];
  /** v2.6.11: 主题禁止的标签（题目 themeTags 不能包含任何一个） */
  forbiddenTags?: string[];
  /** v2.7.1: 必须匹配的标签（题目 themeTags 必须包含至少一个） */
  requiredTags?: string[];
  /** v2.7.1: 主题严格程度 */
  themeStrictness?: ThemeStrictness;
  /** v2.7.4: 题库不足时 fallback 到 generic 主题 */
  fallbackToGeneric?: boolean;
}

// ========== 根据年级和日期选择案件 ==========

const storyCache: Map<string, CaseStory> = new Map();

export function getCaseStoryForDate(
  stories: CaseStory[],
  grade: GradeBand,
  date: string,
  usedStoryIds: string[] = []
): CaseStory | undefined {
  const key = `${grade}_${date}`;
  if (storyCache.has(key)) return storyCache.get(key);

  const eligible = stories.filter(
    (s) =>
      s.gradeBand.includes(grade) &&
      !usedStoryIds.includes(s.id)
  );

  if (eligible.length === 0) {
    const fallback = stories.filter((s) => s.gradeBand.includes(grade));
    if (fallback.length === 0) return undefined;
    const picked = seededPick(fallback, date);
    storyCache.set(key, picked);
    return picked;
  }

  const picked = seededPick(eligible, date);
  storyCache.set(key, picked);
  return picked;
}

function seededPick<T>(arr: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % arr.length;
  return arr[idx];
}

// ========== 获取步骤叙事文本 ==========

const DEFAULT_NARRATIVES: Record<LessonStepType, StepNarrative> = {
  find_numbers: {
    title: '收集数字线索',
    description: '在现场找到所有数字证据',
    instruction: '小侦探，先找出题目里藏着的所有数字！',
  },
  find_action_words: {
    title: '分析动作线索',
    description: '判断数字是增加还是减少',
    instruction: '仔细看看题目里的关键词，它们会告诉你该加还是该减！',
  },
  simulation: {
    title: '观察现场变化',
    description: '看看物品增加了还是减少了',
    instruction: '观察这些物品是怎么变化的，判断该用加法还是减法！',
  },
  remove_noise: {
    title: '排除干扰信息',
    description: '擦掉和案件无关的废话',
    instruction: '有些信息是故意迷惑你的，擦掉它们，留下有用的线索！',
  },
  full_solve: {
    title: '完整破案',
    description: '从头到尾破解一道数学题',
    instruction: '现在运用你学到的所有技能，完整破案吧！',
  },
  find_compare_numbers: {
    title: '比较数字关系',
    description: '找出数字之间的倍数或比较关系',
    instruction: '这些数字之间是什么关系？谁是谁的几倍？',
  },
  spot_extra_info: {
    title: '找出多余信息',
    description: '识别题目中和问题无关的数字',
    instruction: '有些数字是多余的，它们和题目问题没关系！擦亮眼睛找出来！',
  },
  spot_missing_info: {
    title: '判断信息够不够',
    description: '判断题目是否缺少必要信息',
    instruction: '这道题给的信息够用来计算吗？仔细想想！',
  },
};

export function getStepNarrative(
  story: CaseStory | undefined,
  stepType: LessonStepType
): StepNarrative {
  if (story?.stepNarratives[stepType]) {
    return { ...DEFAULT_NARRATIVES[stepType], ...story.stepNarratives[stepType] };
  }
  return DEFAULT_NARRATIVES[stepType];
}

// ========== 近期使用过的故事ID ==========

export function getRecentStoryIds(limit: number = 3): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('math-detective-recent-stories');
    if (!raw) return [];
    const ids: string[] = JSON.parse(raw);
    return ids.slice(0, limit);
  } catch {
    return [];
  }
}

export function saveRecentStoryId(storyId: string, max: number = 5): void {
  if (typeof window === 'undefined') return;
  try {
    const ids = getRecentStoryIds(max);
    const updated = [storyId, ...ids.filter((id) => id !== storyId)].slice(0, max);
    localStorage.setItem('math-detective-recent-stories', JSON.stringify(updated));
  } catch {
    // ignore
  }
}

// ========== v2.6.11: 主题-题目兼容性校验 ==========

/**
 * 检查题目是否与故事主题兼容。
 * v2.7.3: 全量治理 — 使用 taxonomy forbidden matrix + requiredTags + generic 拦截。
 *
 * 规则：
 * 1. forbiddenTags（story 级别 + 全局 matrix）硬排除
 * 2. generic/shopping 不能单独通过强主题
 * 3. requiredTags 必须命中至少一个（strict/semi_strict）
 * 4. allowedSceneTypes 必须匹配
 */
export function isQuestionCompatibleWithTheme(
  question: Question,
  story: CaseStory | undefined
): boolean {
  if (!story) return true;

  const qScene = question.sceneType || inferSceneType(question);
  const qTags: string[] = question.themeTags?.length ? question.themeTags : inferThemeTags(question);
  const strictness = story.themeStrictness || 'semi_strict';

  // 1. 全局 forbidden matrix 排除
  const globalForbidden = getForbiddenTagsForScene(story.id) || [];
  if (globalForbidden.length > 0) {
    const hasGlobalForbidden = qTags.some(tag => globalForbidden.includes(tag as ThemeTag));
    if (hasGlobalForbidden) return false;
  }

  // 2. story 级别 forbiddenTags 排除
  if (story.forbiddenTags?.length) {
    const hasForbidden = qTags.some(tag => story.forbiddenTags!.includes(tag));
    if (hasForbidden) return false;
  }

  // 3. generic 模式：不过滤
  if (strictness === 'generic') return true;

  // 4. 判断是否为 generic-only 题目
  const isGenericOnly = qScene === 'generic' ||
    (qTags.length > 0 && qTags.every(tag => tag === 'generic' || tag === 'quantity'));

  // 5. generic-only 题目不能进入强主题
  if (isGenericOnly) {
    // 只有 generic 主题可以接受 generic 题
    return false;
  }

  // 6. requiredTags 检查（必须命中至少一个）
  let requiredOk = true;
  if (story.requiredTags?.length) {
    requiredOk = story.requiredTags.some(tag => qTags.includes(tag));
  }

  // 7. strict 模式：requiredTags 必须命中
  if (strictness === 'strict') {
    return requiredOk;
  }

  // 8. semi_strict 模式：requiredTags 必须命中
  return requiredOk;
}

/**
 * 检查题目是否通过主题兼容（带原因）
 */
export function checkThemeCompatibility(
  question: Question,
  story: CaseStory
): { compatible: boolean; reason?: string } {
  const qScene = question.sceneType || inferSceneType(question);
  const qTags: string[] = question.themeTags?.length ? question.themeTags : inferThemeTags(question);

  // 全局 forbidden matrix
  const globalForbidden = getForbiddenTagsForScene(story.id) || [];
  const globalHit = qTags.filter(tag => globalForbidden.includes(tag as ThemeTag));
  if (globalHit.length > 0) {
    return { compatible: false, reason: `globalForbidden: ${globalHit.join(',')}` };
  }

  // story forbiddenTags
  if (story.forbiddenTags?.length) {
    const hit = qTags.filter(tag => story.forbiddenTags!.includes(tag));
    if (hit.length > 0) {
      return { compatible: false, reason: `forbiddenTag: ${hit.join(',')}` };
    }
  }

  // generic-only 题目不能进入强主题
  const isGenericOnly = qScene === 'generic' ||
    (qTags.length > 0 && qTags.every(tag => tag === 'generic' || tag === 'quantity'));
  if (isGenericOnly && story.themeStrictness !== 'generic') {
    return { compatible: false, reason: 'generic-only question cannot enter strong theme' };
  }

  // requiredTags
  if (story.requiredTags?.length) {
    const hasRequired = story.requiredTags.some(tag => qTags.includes(tag));
    if (!hasRequired) {
      return { compatible: false, reason: `missing requiredTags: need one of [${story.requiredTags.join(',')}]` };
    }
  }

  return { compatible: true };
}

/**
 * 从题目内容推断 sceneType
 */
export function inferSceneType(q: Question): string {
  const text = q.text;
  if (/超市|商店|购物|价格|优惠|找零|元|角|分|买|卖/.test(text)) return 'shopping';
  if (/兔子|兔|小兔/.test(text)) return 'animal_grass';
  if (/小鸟|鸟|飞/.test(text)) return 'animal_sky';
  if (/苹果|桃子|梨|水果|香蕉|橘子/.test(text)) return 'food_fruit';
  if (/包子|饺子|饭|吃/.test(text)) return 'food_meal';
  if (/操场|跑道|彩旗|每隔|种树|植树/.test(text)) return 'playground';
  if (/年龄|岁|爸爸.*岁|妈妈.*岁/.test(text)) return 'family_age';
  if (/正方形|长方形|三角形|圆形|面积|周长|角/.test(text)) return 'geometry';
  if (/名次|比赛|跑步|第几名/.test(text)) return 'competition';
  if (/糖果|零食/.test(text)) return 'snack';
  if (/铅笔|橡皮|书包|文具/.test(text)) return 'stationery';
  if (/牛奶|盒|瓶|箱/.test(text)) return 'shopping';
  if (/足球|篮球|皮球|球/.test(text)) return 'sports';
  if (/花|树|草|花园/.test(text)) return 'garden';
  if (/星星|月亮|太阳/.test(text)) return 'sky';
  if (/鱼|虾|螃蟹|海底|海洋/.test(text)) return 'ocean';
  if (/饼干|月饼|蛋糕/.test(text)) return 'food_dessert';
  return 'generic';
}

/**
 * 从题目内容推断 themeTags
 */
export function inferThemeTags(q: Question): string[] {
  const tags: string[] = [];
  const text = q.text;

  // 购物场景
  if (/超市|商店|购物|价格|优惠|找零/.test(text)) tags.push('shopping', 'price', 'money');
  if (/元|角|分|花了|找回|付钱|付款/.test(text)) tags.push('money');
  if (/买|卖|进货|库存|卖出/.test(text)) tags.push('shopping');

  // 动物
  if (/兔子|兔/.test(text)) tags.push('rabbit', 'animal');
  if (/小鸟|鸟/.test(text)) tags.push('bird', 'animal');
  if (/猫|狗|宠物/.test(text)) tags.push('pet', 'animal', 'cat', 'dog');

  // 食物 — 细分标签
  if (/酸奶/.test(text)) tags.push('food', 'dairy', 'yogurt', 'fridge', 'home_food');
  if (/冰箱/.test(text)) tags.push('fridge', 'home_food', 'food');
  if (/包子/.test(text)) tags.push('food', 'baozi', 'bun', 'canteen_food');
  if (/面包/.test(text)) tags.push('food', 'bread');
  if (/饼干/.test(text)) tags.push('food', 'snack', 'dessert');
  if (/月饼/.test(text)) tags.push('food', 'dessert', 'mooncake');
  if (/蛋糕/.test(text) && !/派对|生日/.test(text)) tags.push('food', 'dessert', 'cake');
  if (/糖果|零食/.test(text)) tags.push('food', 'snack', 'candy', 'sweet');
  if (/牛奶/.test(text)) tags.push('food', 'dairy');
  if (/苹果|桃子|梨|水果|香蕉|橘子/.test(text)) tags.push('fruit', 'food', 'apple');
  if (/点心|早餐/.test(text)) tags.push('food', 'breakfast', 'canteen_food');
  if (/食堂|餐厅/.test(text)) tags.push('canteen_food', 'food');
  if (/饮料|果汁/.test(text)) tags.push('food', 'drink');
  if (/吃|吃掉|喝掉|喝/.test(text)) tags.push('food');

  // 玩具/文具
  if (/玩具|玩偶|小汽车|积木|娃娃/.test(text)) tags.push('toy');
  if (/铅笔|橡皮|书包|文具/.test(text)) tags.push('stationery');

  // 操场/运动
  if (/操场|跑道/.test(text)) tags.push('playground');
  if (/彩旗|每隔|种树|植树/.test(text)) tags.push('interval', 'planting');
  if (/足球|篮球|皮球|球/.test(text)) tags.push('sports', 'ball');
  if (/跑步|比赛|名次/.test(text)) tags.push('race', 'sports');

  // 年龄/家庭
  if (/年龄|岁|几年后|再过/.test(text)) tags.push('age', 'family');

  // 几何
  if (/正方形|长方形|三角形|圆形|面积|周长|角|棱|体积|表面积/.test(text)) tags.push('geometry');

  // 逻辑
  if (/名次|不是第一名|不是最后一名|比.*快|比.*慢/.test(text)) tags.push('logic', 'ranking', 'ordering');

  // 数列/规律
  if (/规律|第几层|第几个|每次多|一列数/.test(text)) tags.push('sequence', 'pattern');

  // 海洋
  if (/鱼|虾|螃蟹|海底|海洋|贝壳/.test(text)) tags.push('ocean');

  // 派对
  if (/派对|生日/.test(text)) tags.push('party');

  // 校园/图书馆
  if (/图书馆|借阅/.test(text)) tags.push('school', 'library');

  // 银行/利息
  if (/银行|利息|存/.test(text)) tags.push('bank', 'interest');

  // 科学
  if (/实验|天文|观测/.test(text)) tags.push('science');

  if (tags.length === 0) tags.push('generic');
  return [...new Set(tags)];
}
