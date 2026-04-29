import { Question, MistakeRecord, GradeBand, CognitiveSkill, LessonStepType, StepPhase, LessonStep, TodayLesson, LearningProfile, TomorrowLessonPreview, VirtualReward } from './types';
import { getQuestionById, allQuestions, questionsByGrade, getQuestionsByFilter } from '@/data/questions';
import { loadState } from './storage';

// ========== 关卡配置 ==========

const STEP_TITLES: Record<LessonStepType, string> = {
  find_numbers: '找到数字线索',
  find_action_words: '找到动作线索',
  simulation: '看看发生了什么',
  remove_noise: '擦掉没用的信息',
  full_solve: '完整破案',
};

const STEP_DESCRIPTIONS: Record<LessonStepType, string> = {
  find_numbers: '从题目中找到所有数字，然后列式并算出答案',
  find_action_words: '找出关键词，判断增加还是减少，然后列式算出答案',
  simulation: '观察物品的增减变化，判断运算符号并算出答案',
  remove_noise: '擦掉和数学无关的废话，然后列式算出答案',
  full_solve: '完整破解一道数学题：找数字→找关键词→明白问什么→列算式→算答案',
};

// ========== 默认阶段映射 ==========

export function getDefaultPhasesForStepType(type: LessonStepType): StepPhase[] {
  switch (type) {
    case 'find_numbers':
      return ['read', 'find_numbers', 'answer'];
    case 'find_action_words':
      return ['read', 'find_keywords', 'choose_operation', 'answer'];
    case 'simulation':
      return ['read', 'choose_operation', 'answer'];
    case 'remove_noise':
      return ['read', 'remove_noise', 'build_equation', 'answer'];
    case 'full_solve':
      return [
        'read',
        'find_numbers',
        'find_keywords',
        'choose_operation',
        'build_equation',
        'answer',
        'explain',
      ];
    default:
      return ['read', 'answer'];
  }
}

// ========== 步骤标准化 ==========

export function normalizeStep(step: Partial<LessonStep>): LessonStep {
  const type: LessonStepType = step.type || 'full_solve';

  const phases: StepPhase[] =
    Array.isArray(step.phases) && step.phases.length > 0
      ? step.phases
      : getDefaultPhasesForStepType(type);

  const currentPhaseIndex =
    typeof step.currentPhaseIndex === 'number' &&
    step.currentPhaseIndex >= 0 &&
    step.currentPhaseIndex < phases.length
      ? step.currentPhaseIndex
      : 0;

  const id =
    step.id && typeof step.id === 'string' && step.id.length > 0
      ? step.id
      : `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    type,
    title: step.title || STEP_TITLES[type] || '今日任务',
    description: step.description || STEP_DESCRIPTIONS[type] || '继续完成今天的侦探任务',
    questionId: step.questionId || '',
    status: step.status || 'locked',
    phases,
    currentPhaseIndex,
    requiresAnswer:
      typeof step.requiresAnswer === 'boolean'
        ? step.requiresAnswer
        : type === 'simulation' ||
          type === 'remove_noise' ||
          type === 'full_solve',
  };
}

export function normalizeLesson(lesson: TodayLesson | null): TodayLesson | null {
  if (!lesson || !Array.isArray(lesson.steps)) return null;

  const steps = lesson.steps.map(normalizeStep);

  const currentStepIndex =
    typeof lesson.currentStepIndex === 'number' &&
    lesson.currentStepIndex >= 0 &&
    lesson.currentStepIndex < steps.length
      ? lesson.currentStepIndex
      : 0;

  return {
    date: lesson.date || getDateStr(),
    steps,
    currentStepIndex,
    completed: Boolean(lesson.completed),
  };
}

// ========== 每日进度辅助 ==========

function getDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 获取学习画像用于自适应出题
 */
export function getLearningProfile(): LearningProfile {
  const state = loadState();
  const total = state.correctCount + state.wrongCount;
  const recentAccuracy = total > 0 ? Math.round((state.correctCount / total) * 100) : 100;

  const skillMistakes = state.skillMistakes || {};
  const weakSkills: CognitiveSkill[] = [];
  for (const [skill, count] of Object.entries(skillMistakes)) {
    if (count >= 3) weakSkills.push(skill as CognitiveSkill);
  }

  return {
    gradeBand: state.parentSettings.gradeBand,
    streakDays: state.streak,
    recentAccuracy,
    weakSkills,
    unlockedOlympiad: state.parentSettings.olympiadEnabled,
    dailyQuestionCount: state.completedToday,
  };
}

/**
 * 生成明日挑战简略预告
 */
export function getTomorrowLessonPreview(
  profile: LearningProfile,
  state: { skillMistakes: Record<string, number>; level: number }
): TomorrowLessonPreview {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const maxDifficulty = profile.unlockedOlympiad ? 5 : Math.min(3, 1 + Math.floor(profile.streakDays / 5));

  const stepTypes: LessonStepType[] = [
    'find_numbers',
    'find_action_words',
    'simulation',
    'remove_noise',
    'full_solve',
  ];

  // Preview one question from the pool
  const gradePool = questionsByGrade[profile.gradeBand] || allQuestions;
  const previewQ = gradePool.find(q => q.difficulty >= 1 && q.difficulty <= maxDifficulty);

  const estimatedStars = stepTypes.length * (state.level >= 5 ? 3 : state.level >= 3 ? 2 : 1);

  return {
    date: dateStr,
    stepCount: stepTypes.length,
    stepTypes,
    difficultyRange: { min: 1, max: maxDifficulty },
    gradeBand: profile.gradeBand,
    sampleQuestionPreview: previewQ?.text || '新的数学谜题在等着你！',
    estimatedStars,
  };
}

/**
 * 根据学习画像和今日进度自动编排课程
 */
export function getTodayLesson(): TodayLesson {
  const today = getDateStr();

  // 尝试从 localStorage 读取已保存的今日课程
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('math-detective-today-lesson');
      if (saved) {
        const parsed: TodayLesson = JSON.parse(saved);
        // 日期匹配 + 数据完整性校验
        if (parsed.date === today) {
          const normalized = normalizeLesson(parsed);
          if (normalized && normalized.steps.length > 0) {
            return normalized;
          }
        }
      }
    } catch { /* ignore */ }
  }

  // 生成新课程
  const state = loadState();
  const profile = getLearningProfile();
  const lesson = buildDailyLesson(profile, state.completedQuestions, state.mistakes);
  saveTodayLesson(lesson);
  return lesson;
}

// ========== 按关卡类型选题 ==========

const STEP_TYPE_REQUIREMENTS: Record<LessonStepType, (q: Question) => boolean> = {
  find_numbers: (q) => q.numbers.length >= 2,
  find_action_words: (q) => q.keywords.length > 0,
  simulation: (q) => (q.operation === 'addition' || q.operation === 'subtraction') && !!q.visualKey,
  remove_noise: (q) => Array.isArray(q.noisePhrases) && q.noisePhrases.length > 0,
  full_solve: () => true,
};

const STEP_COMPAT_ORDER: LessonStepType[] = [
  'find_numbers',
  'find_action_words',
  'simulation',
  'remove_noise',
  'full_solve',
];

export function selectQuestionForStep(params: {
  stepType: LessonStepType;
  profile: LearningProfile;
  usedQuestionIds: string[];
  targetDifficulty?: number;
}): Question | null {
  const { stepType, profile, usedQuestionIds } = params;
  const maxDifficulty = params.targetDifficulty ?? Math.min(5, 1 + Math.floor(profile.streakDays / 5));
  const grade = profile.gradeBand;
  const usedSet = new Set(usedQuestionIds);

  const isCompatible = STEP_TYPE_REQUIREMENTS[stepType];

  // Strategy 1: Try stepCompatibility field first, then field-based check
  const tryPool = (pool: Question[], allowDegrade: boolean): Question | null => {
    // Prefer questions with stepCompatibility that includes this stepType
    const explicitMatch = pool.filter(q =>
      !usedSet.has(q.id) &&
      q.difficulty <= maxDifficulty &&
      (q.stepCompatibility?.includes(stepType) || (!q.stepCompatibility && isCompatible(q)))
    );
    if (explicitMatch.length > 0) {
      // Shuffle and pick
      for (let i = explicitMatch.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [explicitMatch[i], explicitMatch[j]] = [explicitMatch[j], explicitMatch[i]];
      }
      return explicitMatch[0];
    }

    if (!allowDegrade) return null;

    // Fallback: any question matching field requirements
    const fieldMatch = pool.filter(q =>
      !usedSet.has(q.id) &&
      q.difficulty <= maxDifficulty &&
      isCompatible(q)
    );
    if (fieldMatch.length > 0) {
      for (let i = fieldMatch.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fieldMatch[i], fieldMatch[j]] = [fieldMatch[j], fieldMatch[i]];
      }
      return fieldMatch[0];
    }

    return null;
  };

  // Try grade-specific pool
  let pool = questionsByGrade[grade] || allQuestions;
  let result = tryPool(pool, stepType !== 'remove_noise');

  // Degrade: lower difficulty
  if (!result && stepType !== 'remove_noise') {
    for (let diff = maxDifficulty - 1; diff >= 1; diff--) {
      const lowered = pool.filter(q => !usedSet.has(q.id) && q.difficulty <= diff && isCompatible(q));
      if (lowered.length > 0) {
        for (let i = lowered.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [lowered[i], lowered[j]] = [lowered[j], lowered[i]];
        }
        result = lowered[0];
        break;
      }
    }
  }

  // Degrade: wider grade band
  if (!result && stepType !== 'remove_noise') {
    result = tryPool(allQuestions, true);
  }

  // Last resort for non-remove_noise: any question at all
  if (!result && stepType !== 'remove_noise') {
    const anyQ = allQuestions.filter(q => !usedSet.has(q.id));
    if (anyQ.length > 0) {
      console.warn(`[selectQuestionForStep] No suitable question for "${stepType}" (grade=${grade}), using fallback`);
      result = anyQ[Math.floor(Math.random() * anyQ.length)];
    }
  }

  // remove_noise: NEVER fallback to a question without noisePhrases
  if (!result && stepType === 'remove_noise') {
    console.warn(`[selectQuestionForStep] No remove_noise question available for grade=${grade}, step will be substituted`);
    return null;
  }

  return result;
}

// ========== 每日课程构建 ==========

function buildDailyLesson(
  profile: LearningProfile,
  completedIds: string[],
  mistakes: MistakeRecord[]
): TodayLesson {
  const today = getDateStr();
  const maxDifficulty = profile.unlockedOlympiad ? 5 : Math.min(3, 1 + Math.floor(profile.streakDays / 5));

  const stepTypes: LessonStepType[] = [
    'find_numbers',
    'find_action_words',
    'simulation',
    'remove_noise',
    'full_solve',
  ];

  const usedQuestionIds: string[] = [];
  const steps: LessonStep[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < stepTypes.length; i++) {
    const st = stepTypes[i];
    const question = selectQuestionForStep({
      stepType: st,
      profile,
      usedQuestionIds,
      targetDifficulty: maxDifficulty,
    });

    // remove_noise with no match: substitute step type
    if (!question) {
      if (st === 'remove_noise') {
        console.warn(`[buildDailyLesson] No remove_noise question for grade=${profile.gradeBand}, substituting with find_action_words`);
        const subQ = selectQuestionForStep({
          stepType: 'find_action_words',
          profile,
          usedQuestionIds,
          targetDifficulty: maxDifficulty,
        });
        if (subQ) {
          usedQuestionIds.push(subQ.id);
          const phases = [...getDefaultPhasesForStepType('find_action_words')];
          steps.push({
            id: `${today}_find_action_words_${i}_${subQ.id}`,
            type: 'find_action_words',
            title: STEP_TITLES.find_action_words,
            description: STEP_DESCRIPTIONS.find_action_words,
            questionId: subQ.id,
            phases,
            currentPhaseIndex: 0,
            status: i === 0 ? 'current' : 'locked',
            requiresAnswer: true,
          });
        }
        continue;
      }
      // For other types, try full_solve as last resort
      const lastQ = selectQuestionForStep({
        stepType: 'full_solve',
        profile,
        usedQuestionIds,
        targetDifficulty: maxDifficulty,
      });
      if (lastQ) {
        usedQuestionIds.push(lastQ.id);
        const phases = [...getDefaultPhasesForStepType(st)];
        steps.push({
          id: `${today}_${st}_${i}_${lastQ.id}`,
          type: st,
          title: STEP_TITLES[st],
          description: STEP_DESCRIPTIONS[st],
          questionId: lastQ.id,
          phases,
          currentPhaseIndex: 0,
          status: i === 0 ? 'current' : 'locked',
          requiresAnswer: true,
        });
      }
      continue;
    }

    usedQuestionIds.push(question.id);
    const phases = [...getDefaultPhasesForStepType(st)];

    steps.push({
      id: `${today}_${st}_${i}_${question.id}`,
      type: st,
      title: STEP_TITLES[st],
      description: STEP_DESCRIPTIONS[st],
      questionId: question.id,
      phases,
      currentPhaseIndex: 0,
      status: i === 0 ? 'current' : 'locked',
      requiresAnswer: true,
    });
  }

  if (warnings.length > 0) {
    console.warn(`[buildDailyLesson] Warnings for ${today}:`, warnings);
  }

  return {
    date: today,
    steps,
    currentStepIndex: 0,
    completed: false,
  };
}

// ========== 阶段推进 ==========

export function advancePhase(lesson: TodayLesson): TodayLesson {
  const normalized = normalizeLesson(lesson);
  if (!normalized) return lesson;

  const steps = [...normalized.steps];
  const idx =
    typeof normalized.currentStepIndex === 'number' &&
    normalized.currentStepIndex >= 0 &&
    normalized.currentStepIndex < steps.length
      ? normalized.currentStepIndex
      : 0;

  const step = { ...steps[idx] };
  const phases = Array.isArray(step.phases) && step.phases.length > 0
    ? step.phases
    : getDefaultPhasesForStepType(step.type);

  step.phases = phases;

  const phaseIdx =
    typeof step.currentPhaseIndex === 'number' && step.currentPhaseIndex >= 0
      ? step.currentPhaseIndex
      : 0;

  step.currentPhaseIndex = phaseIdx;

  const maxIdx = phases.length - 1;

  if (phaseIdx < maxIdx) {
    step.currentPhaseIndex = phaseIdx + 1;
    steps[idx] = step;
    return { ...normalized, steps, currentStepIndex: idx };
  }

  // 当前步骤所有阶段完成 → 完成步骤
  return completeCurrentStep({ ...normalized, steps, currentStepIndex: idx });
}

export function getCurrentPhase(lesson: TodayLesson): StepPhase | null {
  const step = getCurrentStep(lesson);
  if (!step) return null;

  if (!Array.isArray(step.phases) || step.phases.length === 0) {
    return null;
  }

  const index =
    typeof step.currentPhaseIndex === 'number'
      ? step.currentPhaseIndex
      : 0;

  return step.phases[index] ?? step.phases[0] ?? null;
}

export function isAnswerPhase(lesson: TodayLesson): boolean {
  const phase = getCurrentPhase(lesson);
  return phase === 'answer' || phase === 'build_equation';
}

export function requiresAnswerNow(lesson: TodayLesson): boolean {
  const step = getCurrentStep(lesson);
  if (!step) return false;
  return Boolean(step.requiresAnswer) && isAnswerPhase(lesson);
}

// ========== 步骤管理 ==========

export function getCurrentStep(lesson: TodayLesson): LessonStep | null {
  if (!lesson || !Array.isArray(lesson.steps)) return null;
  if (lesson.completed) return null;

  const idx =
    typeof lesson.currentStepIndex === 'number' &&
    lesson.currentStepIndex >= 0 &&
    lesson.currentStepIndex < lesson.steps.length
      ? lesson.currentStepIndex
      : 0;

  const raw = lesson.steps[idx];
  return raw ? normalizeStep(raw) : null;
}

export function completeCurrentStep(lesson: TodayLesson): TodayLesson {
  const normalized = normalizeLesson(lesson);
  if (!normalized) return lesson;

  const steps = [...normalized.steps];
  const idx =
    typeof normalized.currentStepIndex === 'number' &&
    normalized.currentStepIndex >= 0 &&
    normalized.currentStepIndex < steps.length
      ? normalized.currentStepIndex
      : 0;

  if (idx < steps.length) {
    steps[idx] = { ...steps[idx], status: 'completed' as const };
  }

  const nextIdx = idx + 1;
  if (nextIdx < steps.length) {
    steps[nextIdx] = { ...steps[nextIdx], status: 'current' as const };
    return {
      ...normalized,
      steps,
      currentStepIndex: nextIdx,
    };
  }

  return {
    ...normalized,
    steps,
    completed: true,
  };
}

export function saveTodayLesson(lesson: TodayLesson): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('math-detective-today-lesson', JSON.stringify(lesson));
  } catch { /* ignore */ }
}

export function clearTodayLesson(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('math-detective-today-lesson');
  } catch { /* ignore */ }
}

export function getStepLabel(step: LessonStep): string {
  const stepOrder: LessonStepType[] = ['find_numbers', 'find_action_words', 'simulation', 'remove_noise', 'full_solve'];
  const stepNum = stepOrder.indexOf(step.type) + 1;
  const total = 5;
  return `第 ${stepNum} 关 / 共 ${total} 关：${step.title}`;
}

export function getCompletionMessage(stepIndex: number, total: number): string {
  if (stepIndex >= total - 1) {
    return '🎉 今天的侦探任务完成！你获得了今日宝箱！';
  }
  return '✅ 很好，下一条线索出现了！你已经完成这一关，继续破案！';
}

export function getQuestionForLesson(lesson: TodayLesson): Question | null {
  const step = getCurrentStep(lesson);
  if (!step) return null;
  return getQuestionById(step.questionId) || null;
}

// ========== 虚拟奖励 ==========

export function getVirtualRewards(state: {
  totalCompleted: number;
  streak: number;
  badges: string[];
  level: number;
  completedToday: number;
}): VirtualReward[] {
  return [
    {
      id: 'badge_first_case',
      title: '第一次破案',
      description: '完成第一次侦探任务',
      icon: '🔍',
      unlocked: state.totalCompleted >= 1,
      unlockCondition: '完成1道题',
      category: 'badge',
    },
    {
      id: 'badge_10_cases',
      title: '小侦探',
      description: '累计完成10道题',
      icon: '🕵️',
      unlocked: state.totalCompleted >= 10,
      unlockCondition: '完成10道题',
      category: 'badge',
    },
    {
      id: 'badge_50_cases',
      title: '名侦探',
      description: '累计完成50道题',
      icon: '🏅',
      unlocked: state.totalCompleted >= 50,
      unlockCondition: '完成50道题',
      category: 'badge',
    },
    {
      id: 'streak_3_days',
      title: '连续3天侦探',
      description: '连续学习3天',
      icon: '🔥',
      unlocked: state.streak >= 3,
      unlockCondition: '连续打卡3天',
      category: 'streak',
    },
    {
      id: 'streak_7_days',
      title: '一周全勤',
      description: '连续学习7天',
      icon: '🌟',
      unlocked: state.streak >= 7,
      unlockCondition: '连续打卡7天',
      category: 'streak',
    },
    {
      id: 'streak_14_days',
      title: '坚持达人',
      description: '连续学习14天',
      icon: '💎',
      unlocked: state.streak >= 14,
      unlockCondition: '连续打卡14天',
      category: 'streak',
    },
    {
      id: 'level_3',
      title: '中级侦探',
      description: '达到中级侦探等级',
      icon: '⭐',
      unlocked: state.level >= 3,
      unlockCondition: '达到中级侦探',
      category: 'badge',
    },
    {
      id: 'level_5',
      title: '王牌侦探',
      description: '达到王牌侦探等级',
      icon: '👑',
      unlocked: state.level >= 5,
      unlockCondition: '达到王牌侦探',
      category: 'badge',
    },
    {
      id: 'treasure_daily',
      title: '今日宝箱',
      description: '完成今日全部任务后开启',
      icon: '🎁',
      unlocked: state.completedToday >= 5,
      unlockCondition: '完成今日5个关卡',
      category: 'treasure',
    },
  ];
}
