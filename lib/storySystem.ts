import { LessonStepType, GradeBand, type Question } from './types';

// ========== 案件故事模板 ==========

export interface StepNarrative {
  title: string;
  description: string;
  instruction: string;
}

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
 * 用于 lessonPlanner 选题时过滤。
 *
 * 兼容规则：
 * 1. 如果 story 有 allowedSceneTypes，题目 sceneType 必须匹配
 * 2. 如果 story 有 themeTags，题目 themeTags 必须包含至少一个
 * 3. 如果 story 有 forbiddenTags，题目 themeTags 不能包含任何一个
 * 4. 如果题目没有 sceneType/themeTags，通过推断判断
 */
export function isQuestionCompatibleWithTheme(
  question: Question,
  story: CaseStory | undefined
): boolean {
  if (!story) return true; // 没有主题则不过滤

  const qScene = question.sceneType || inferSceneType(question);
  const qTags = question.themeTags?.length ? question.themeTags : inferThemeTags(question);

  // 1. forbiddenTags 检查（硬排除）
  if (story.forbiddenTags?.length) {
    const hasForbidden = qTags.some(tag => story.forbiddenTags!.includes(tag));
    if (hasForbidden) return false;
  }

  // 2. allowedSceneTypes 检查
  if (story.allowedSceneTypes?.length) {
    if (qScene && !story.allowedSceneTypes.includes(qScene)) {
      // generic 只有在 allowedSceneTypes 包含 'generic' 时才通过
      if (qScene === 'generic' || qScene === 'math') {
        if (!story.allowedSceneTypes.includes('generic') && !story.allowedSceneTypes.includes('math')) {
          return false;
        }
      } else {
        return false;
      }
    }
  }

  // 3. themeTags 检查（至少一个匹配）
  if (story.themeTags?.length && qTags.length > 0) {
    const hasMatch = qTags.some(tag => story.themeTags!.includes(tag));
    if (!hasMatch) return false;
  }

  return true;
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

  // 场景标签
  if (/超市|商店|购物|价格|优惠|找零/.test(text)) tags.push('shopping', 'price', 'money');
  if (/元|角|分|花了|找回|付/.test(text)) tags.push('money');
  if (/买|卖|进货|库存|卖出/.test(text)) tags.push('shopping');
  if (/兔子|兔/.test(text)) tags.push('rabbit', 'animal', 'grass');
  if (/小鸟|鸟/.test(text)) tags.push('bird', 'animal');
  if (/苹果|桃子|梨|水果/.test(text)) tags.push('fruit', 'food');
  if (/包子|饭|吃掉/.test(text)) tags.push('food');
  if (/操场|跑道/.test(text)) tags.push('playground');
  if (/彩旗|每隔|种树|植树/.test(text)) tags.push('interval', 'planting');
  if (/年龄|岁/.test(text)) tags.push('age', 'family');
  if (/正方形|长方形|三角形|圆形|面积|周长|角/.test(text)) tags.push('geometry');
  if (/名次|比赛|跑步/.test(text)) tags.push('competition', 'ranking');
  if (/糖果|零食/.test(text)) tags.push('snack', 'food');
  if (/铅笔|橡皮|书包|文具/.test(text)) tags.push('stationery');
  if (/牛奶|盒|瓶|箱/.test(text)) tags.push('shopping', 'drink');
  if (/足球|篮球|皮球|球/.test(text)) tags.push('sports');
  if (/花|树|草|花园/.test(text)) tags.push('garden', 'nature');
  if (/鱼|虾|螃蟹|海底|海洋/.test(text)) tags.push('ocean');
  if (/饼干|月饼|蛋糕/.test(text)) tags.push('food', 'dessert');
  if (/蛋糕|派对|生日/.test(text)) tags.push('party');

  if (tags.length === 0) tags.push('generic');
  return [...new Set(tags)];
}
