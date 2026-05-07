import { LessonStepType, GradeBand } from './types';

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
