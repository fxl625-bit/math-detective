import { Question, MistakeRecord, GradeBand, CognitiveSkill, LessonStepType, StepPhase, LessonStep, TodayLesson, LearningProfile, TomorrowLessonPreview, VirtualReward } from './types';
import { getQuestionById, allQuestions, questionsByGrade, getQuestionsByFilter } from '@/data/questions';
import { loadState } from './storage';
import { allStories } from '@/data/stories';
import { getCaseStoryForDate, getRecentStoryIds, saveRecentStoryId } from './storySystem';
import { classifyKeyword } from '@/data/keywordRules';

// ========== 关卡配置 ==========

const STEP_TITLES: Record<LessonStepType, string> = {
  find_numbers: '找到数字线索',
  find_action_words: '找到动作线索',
  simulation: '看看发生了什么',
  remove_noise: '擦掉没用的信息',
  full_solve: '完整破案',
  find_compare_numbers: '找出比较关系',
  spot_extra_info: '识别多余信息',
  spot_missing_info: '判断信息够不够',
};

const STEP_DESCRIPTIONS: Record<LessonStepType, string> = {
  find_numbers: '从题目中找到所有数字，然后列式并算出答案',
  find_action_words: '找出关键词，判断增加还是减少，然后列式算出答案',
  simulation: '观察物品的增减变化，判断运算符号并算出答案',
  remove_noise: '擦掉和数学无关的废话，然后列式算出答案',
  full_solve: '完整破解一道数学题：找数字→找关键词→明白问什么→列算式→算答案',
  find_compare_numbers: '找出题目中的比较关系，判断谁是谁的几倍',
  spot_extra_info: '找出题目中和计算无关的多余数字',
  spot_missing_info: '判断题目中是否缺少必要信息，能否计算',
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
      return ['read', 'find_numbers', 'find_keywords', 'choose_operation', 'build_equation', 'answer', 'explain'];
    case 'find_compare_numbers':
      return ['read', 'find_numbers', 'find_compare_numbers', 'choose_operation', 'answer'];
    case 'spot_extra_info':
      return ['read', 'find_numbers', 'spot_extra_info', 'answer'];
    case 'spot_missing_info':
      return ['read', 'spot_missing_info', 'answer'];
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
        : ['simulation', 'remove_noise', 'full_solve', 'find_compare_numbers'].includes(type),
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
    caseStoryId: lesson.caseStoryId,
  };
}

// ========== 合法性校验 + 自动修复 ==========

export function safeNormalizeLesson(lesson: TodayLesson | null): TodayLesson | null {
  // 1. 空数据 → 重新生成
  if (!lesson) return null;

  const today = getDateStr();

  // 2. 日期不是今天 → 丢弃，重新生成
  if (lesson.date !== today) {
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('math-detective-today-lesson'); } catch { /* ignore */ }
    }
    return null;
  }

  // 3. 没有步骤 → 重新生成
  if (!Array.isArray(lesson.steps) || lesson.steps.length === 0) return null;

  // 4. 已完成 → 保留
  if (lesson.completed) {
    return normalizeLesson(lesson);
  }

  // 5. 标准化所有 step
  const steps = lesson.steps.map(normalizeStep);
  const n = steps.length;

  // 6. 修正 currentStepIndex
  let currentIdx = typeof lesson.currentStepIndex === 'number'
    && lesson.currentStepIndex >= 0
    && lesson.currentStepIndex < n
    ? lesson.currentStepIndex
    : 0;

  // 7. 核心校验：currentStepIndex 不能指向 locked step（除非用户真的在那里）
  // 如果 currentIdx > 0，前面的 step 必须都是 completed
  let valid = true;
  for (let i = 0; i < currentIdx; i++) {
    if (steps[i].status !== 'completed') {
      valid = false;
      if (typeof window !== 'undefined') {
        console.warn(`[safeNormalizeLesson] step[${i}].status=${steps[i].status} but currentStepIndex=${currentIdx}. Auto-fixing.`);
      }
      break;
    }
  }

  // 8. 如果发现异常，回退到第一个未完成的 step
  if (!valid) {
    currentIdx = 0;
    for (let i = 0; i < n; i++) {
      if (steps[i].status !== 'completed') {
        currentIdx = i;
        break;
      }
    }
  }

  // 9. 确保只有一个 current step，且位置 = currentIdx
  for (let i = 0; i < n; i++) {
    if (i < currentIdx) {
      steps[i] = { ...steps[i], status: 'completed' as const, currentPhaseIndex: 0 };
    } else if (i === currentIdx) {
      steps[i] = { ...steps[i], status: 'current' as const };
      // 确保 currentPhaseIndex 不越界
      if (steps[i].currentPhaseIndex >= (steps[i].phases?.length || 0)) {
        steps[i] = { ...steps[i], currentPhaseIndex: 0 };
      }
    } else {
      steps[i] = { ...steps[i], status: 'locked' as const, currentPhaseIndex: 0 };
    }
  }

  // 10. 如果 current step 没有 questionId → 需要重新选题
  // （这种情况 buildDailyLesson 已处理，这里是安全网）

  // 11. 没有 current step → 说明全部完成
  if (currentIdx >= n) {
    return {
      date: today,
      steps,
      currentStepIndex: 0,
      completed: true,
      caseStoryId: lesson.caseStoryId,
    };
  }

  return {
    date: today,
    steps,
    currentStepIndex: currentIdx,
    completed: false,
    caseStoryId: lesson.caseStoryId,
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
  const attempts = state.answerAttempts || 0;
  const recentAccuracy = attempts > 0 ? Math.round((state.correctCount / attempts) * 100) : 100;

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
    dailyQuestionCount: state.completedToday,
    skillLevel: state.skillLevel || 1,
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

  const maxDifficulty = getEffectiveMaxDifficulty(profile);

  const stepTypes = getStepTypesForGrade(profile.gradeBand);

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
 * 根据年级获取关卡类型列表
 */
export function getStepTypesForGrade(grade: GradeBand): LessonStepType[] {
  const base: LessonStepType[] = [
    'find_numbers',
    'find_action_words',
  ];

  // G1/G2: 基础 + 随机进阶关卡（从一年级开始培养比较和筛选能力）
  if (grade === 'G1' || grade === 'G2') {
    const g1Advanced: LessonStepType[] = ['find_compare_numbers', 'spot_extra_info', 'spot_missing_info'];
    shuffleArray(g1Advanced);
    base.push('simulation', 'remove_noise');
    base.push(...g1Advanced.slice(0, 1), 'full_solve');
  } else {
    const advanced: LessonStepType[] = ['find_compare_numbers', 'remove_noise', 'spot_extra_info', 'full_solve'];
    shuffleArray(advanced);
    base.push(...advanced.slice(0, 3));
  }

  return base;
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * 计算有效难度上限（基于 skillLevel 自适应）
 */
function getEffectiveMaxDifficulty(profile: LearningProfile): number {
  return Math.min(5, 1 + Math.floor(profile.skillLevel));
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
        // 先用 safeNormalizeLesson 校验，异常数据自动修复
        const safe = safeNormalizeLesson(parsed);
        if (safe) {
          // 自动修复后重新保存
          if (JSON.stringify(safe) !== saved) {
            saveTodayLesson(safe);
          }
          return safe;
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
  find_action_words: (q) => {
    if (q.keywords.length === 0) return false;
    // 关键词必须主要是加减类，不能是"倍"、"比"、"平均分"等非加减关键词
    return q.keywords.every(k => {
      const cls = classifyKeyword(k.word);
      if (!cls) return true; // 未分类的关键词放行
      return cls.category === 'addition_change' || cls.category === 'subtraction_change';
    });
  },
  simulation: (q) => (q.operation === 'addition' || q.operation === 'subtraction') && !!q.visualKey,
  remove_noise: (q) => Array.isArray(q.noisePhrases) && q.noisePhrases.length > 0,
  full_solve: () => true,
  find_compare_numbers: (q) => q.operation === 'multiplication' || q.operation === 'division' || q.operation === 'comparison',
  spot_extra_info: (q) => Array.isArray(q.extraNumbers) && q.extraNumbers.length > 0,
  spot_missing_info: (q) => q.isInsufficient === true,
};

export function selectQuestionForStep(params: {
  stepType: LessonStepType;
  profile: LearningProfile;
  usedQuestionIds: string[];
  targetDifficulty?: number;
}): Question | null {
  const { stepType, profile, usedQuestionIds } = params;
  const maxDifficulty = params.targetDifficulty ?? getEffectiveMaxDifficulty(profile);
  const grade = profile.gradeBand;
  const usedSet = new Set(usedQuestionIds);

  const isCompatible = STEP_TYPE_REQUIREMENTS[stepType];

  const tryPool = (pool: Question[], allowDegrade: boolean): Question | null => {
    const compatible = pool.filter(q =>
      !usedSet.has(q.id) &&
      q.difficulty <= maxDifficulty &&
      (q.stepCompatibility?.includes(stepType) || (!q.stepCompatibility && isCompatible(q)))
    );

    if (compatible.length > 0) {
      for (let i = compatible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [compatible[i], compatible[j]] = [compatible[j], compatible[i]];
      }
      return compatible[0];
    }

    if (!allowDegrade) return null;

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
  const pool = questionsByGrade[grade] || allQuestions;
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

  // remove_noise: NEVER fallback
  if (!result && stepType === 'remove_noise') {
    console.warn(`[selectQuestionForStep] No remove_noise question available for grade=${grade}, step will be substituted`);
    return null;
  }

  // spot_extra_info / spot_missing_info: no fallback to generic questions
  if (!result && (stepType === 'spot_extra_info' || stepType === 'spot_missing_info')) {
    console.warn(`[selectQuestionForStep] No ${stepType} question available for grade=${grade}`);
    return null;
  }

  return result;
}

// ========== 间隔复习（艾宾浩斯记忆曲线） ==========

const REVIEW_INTERVALS = [1, 3, 7, 14, 30]; // 第n次复习后的间隔天数

function getReviewInterval(count: number): number | null {
  // count=1 是首次完成，1天后复习；count=6 后视为掌握，不再强制复习
  if (count < 1) return null;
  const idx = count - 1;
  if (idx >= REVIEW_INTERVALS.length) return null; // 已掌握
  return REVIEW_INTERVALS[idx];
}

function isDueForReview(questionId: string, state: {
  questionReviewDates: Record<string, string>;
  questionReviewCounts: Record<string, number>;
}): boolean {
  const count = state.questionReviewCounts[questionId] || 0;
  const interval = getReviewInterval(count);
  if (interval === null) return false;

  const lastDate = state.questionReviewDates[questionId];
  if (!lastDate) return false;

  const lastTime = new Date(lastDate).getTime();
  const dueTime = lastTime + interval * 86400000;
  return Date.now() >= dueTime;
}

function getDueReviewQuestions(
  profile: LearningProfile,
  state: { questionReviewDates: Record<string, string>; questionReviewCounts: Record<string, number> },
  excludeIds: string[],
): Question[] {
  const excludeSet = new Set(excludeIds);
  const maxDifficulty = getEffectiveMaxDifficulty(profile);
  const pool = questionsByGrade[profile.gradeBand] || allQuestions;

  return pool.filter(q =>
    !excludeSet.has(q.id) &&
    isDueForReview(q.id, state) &&
    q.difficulty <= Math.min(5, maxDifficulty + 1)
  );
}

// ========== 每日课程构建 ==========

function buildDailyLesson(
  profile: LearningProfile,
  completedIds: string[],
  mistakes: MistakeRecord[]
): TodayLesson {
  const today = getDateStr();
  const maxDifficulty = getEffectiveMaxDifficulty(profile);

  const stepTypes = getStepTypesForGrade(profile.gradeBand);

  // 选择案件故事
  const recentStoryIds = getRecentStoryIds(3);
  const caseStory = getCaseStoryForDate(allStories, profile.gradeBand, today, recentStoryIds);
  let caseStoryId: string | undefined;
  if (caseStory) {
    caseStoryId = caseStory.id;
    saveRecentStoryId(caseStory.id);
  }

  // 加载完整状态以获取复习数据
  const fullState = loadState();
  const dueReviews = getDueReviewQuestions(profile, fullState, []);
  // 每天 2 道复习题（如果有足够的待复习题）
  const reviewSlots = Math.min(2, dueReviews.length);
  const newSlots = stepTypes.length - reviewSlots;

  const usedQuestionIds: string[] = [];
  const steps: LessonStep[] = [];

  // 先放复习题到前几个关卡（基础关卡优先复习）
  for (let i = 0; i < reviewSlots && i < stepTypes.length; i++) {
    const reviewQ = dueReviews[i];
    if (!reviewQ) break;

    const st = stepTypes[i];
    usedQuestionIds.push(reviewQ.id);
    const phases = [...getDefaultPhasesForStepType(st)];

    steps.push({
      id: `${today}_review_${i}_${reviewQ.id}`,
      type: st,
      title: STEP_TITLES[st],
      description: STEP_DESCRIPTIONS[st],
      questionId: reviewQ.id,
      phases,
      currentPhaseIndex: 0,
      status: i === 0 ? 'current' : 'locked',
      requiresAnswer: true,
    });
  }

  // 剩余关卡用新题
  for (let i = steps.length; i < stepTypes.length; i++) {
    const st = stepTypes[i];
    const question = selectQuestionForStep({
      stepType: st,
      profile,
      usedQuestionIds,
      targetDifficulty: maxDifficulty,
    });

    if (!question) {
      if (st === 'remove_noise') {
        console.warn(`[buildDailyLesson] No remove_noise question, substituting with find_action_words`);
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
      // Try full_solve as fallback
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

  return {
    date: today,
    steps,
    currentStepIndex: 0,
    completed: false,
    caseStoryId,
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

export function getStepLabel(step: LessonStep, lesson?: TodayLesson): string {
  // 使用 lesson.steps 中的真实位置，而非全局类型顺序
  const steps = lesson?.steps;
  if (steps && Array.isArray(steps)) {
    const idx = steps.findIndex(s => s.id === step.id);
    if (idx >= 0) {
      return `第 ${idx + 1} 关 / 共 ${steps.length} 关：${step.title}`;
    }
  }
  // fallback
  const stepOrder: LessonStepType[] = ['find_numbers', 'find_action_words', 'simulation', 'remove_noise', 'full_solve', 'find_compare_numbers', 'spot_extra_info', 'spot_missing_info'];
  const stepNum = stepOrder.indexOf(step.type) + 1;
  return `第 ${stepNum} 关：${step.title}`;
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

// ========== 案件故事辅助 ==========

export function getCaseStoryForLesson(lesson: TodayLesson) {
  if (!lesson.caseStoryId) return undefined;
  return allStories.find(s => s.id === lesson.caseStoryId);
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
