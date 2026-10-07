import { Question, MistakeRecord, GradeBand, CognitiveSkill, LessonStepType, StepPhase, LessonStep, TodayLesson, LearningProfile, TomorrowLessonPreview, VirtualReward, GameState, type AssessmentTier } from './types';
import type { Semester, LearnerProfile as CurriculumLearnerProfile, UsageStage } from './curriculum/types';
import { resolveEffectiveSemester } from './curriculum/semesterDetector';
import { getQuestionById, allQuestions, safeQuestions, questionsByGrade, getQuestionsByFilter, isQuestionSafeForNewLesson } from '@/data/questions';
import { loadState, saveState, getAccuracyStats } from './storage';
import { allStories } from '@/data/stories';
import { getCaseStoryForDate, getRecentStoryIds, saveRecentStoryId, isQuestionCompatibleWithTheme, type CaseStory } from './storySystem';
import { classifyKeyword } from '@/data/keywordRules';
import { inferLessonType, extractNumbers, classifyNumberRole } from './questionValidation';
import { isQuestionSafeForLesson } from './questionSafety';
import { APP_VERSION } from './appVersion';
import { createLessonSignature, normalizeLearningSettingsFromParent } from './learningSettings';
import { getAvailableLearningUnits } from './curriculum/unitCoverage';
import { questionLearningMetadata, progressionQuestions } from '@/data/questions/progression';
import { CORE_SLOT_TITLE, orderDailyCandidates, selectDistinctCoreCandidates, type DailyCoreSlot } from './curriculum/unitQuestionSelection';
import {
  detectUsageStage,
  buildLearnerProfile,
  initCurriculumProfile,
} from './learnerProfile';
import {
  generateDailySlotPlan,
  selectQuestionsForSlot,
  pickQuestionFromCandidates,
  maxSingleDigitQuestions,
} from './adaptiveDifficulty';

import type { ReasoningFrame } from '@/lib/curriculum/types';

// ========== v2.10.0 Sub-project B: Three-question flow ==========

/**
 * Check if a question is compatible with the three-question method.
 * Word problems, applied problems, money, comparison, reasoning use this flow.
 * Pure calculation, pattern, shape, etc. use the standard flow.
 */
export function isThreeQuestionFlowCompatible(question: Question): boolean {
  // Must have reasoningFrame data
  if (!(question as any).reasoningFrame) return false;

  const rf = (question as any).reasoningFrame as ReasoningFrame | undefined;
  if (!rf?.knownFacts?.length) return false;
  if (!rf?.targetQuestion) return false;
  if (!rf?.plan) return false;

  // Pure arithmetic with no scene → not compatible
  if (question.problemType === 'basic_arithmetic' && question.domain === 'addition_subtraction') {
    return question.text.length > 15 && question.sceneType !== undefined;
  }

  // Applied problems
  const compatibleTypes = ['word_problem', 'two_step_word_problem', 'multi_step', 'information_check'];
  if (compatibleTypes.includes(question.problemType || '')) return true;

  // Compatible domains
  const compatibleDomains = ['money', 'comparison', 'logic', 'reasoning'];
  if (compatibleDomains.includes(question.domain)) return true;

  // Default: compatible if it has reasoningFrame
  return true;
}

// ========== 关卡配置 ==========

// Sub-project A: Component-compatible step titles
const STEP_TITLES: Record<LessonStepType, string> = {
  find_numbers: '找到数字线索',
  find_action_words: '找到动作线索',
  simulation: '看看发生了什么',
  remove_noise: '擦掉没用的信息',
  full_solve: '完整破案',
  find_compare_numbers: '找出比较关系',
  spot_extra_info: '识别多余信息',
  spot_missing_info: '判断信息够不够',
  answer_only: '今日挑战',
};

// Sub-project A: Component-compatible step descriptions
const STEP_DESCRIPTIONS: Record<LessonStepType, string> = {
  find_numbers: '先找出题目里出现的所有数字',
  find_action_words: '找出关键词，判断增加还是减少',
  simulation: '观察物品的增减变化，判断运算符号',
  remove_noise: '擦掉和数学无关的干扰信息',
  full_solve: '完整破解一道数学题：找数字→找关键词→列算式→算答案',
  find_compare_numbers: '找出题目中的比较关系',
  spot_extra_info: '找出题目中和计算无关的多余数字',
  spot_missing_info: '判断题目中是否缺少必要信息',
  answer_only: '仔细读题，直接算出答案',
};

function hashSignature(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter(key => record[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function resolveEffectiveLessonSettings(state: GameState): {
  settings: ReturnType<typeof normalizeLearningSettingsFromParent>;
  unitSource: 'manual' | 'default_for_grade' | 'unknown';
} {
  const base = state.parentSettings.learningSettings || normalizeLearningSettingsFromParent(state.parentSettings);
  const available = getAvailableLearningUnits(base.grade);
  const unit = base.unitId ? available.find(candidate => candidate.id === base.unitId) : available[0];
  return {
    settings: unit ? { ...base, unitId: unit.id } : base,
    unitSource: unit ? (base.unitId ? 'manual' : 'default_for_grade') : (base.unitId ? 'manual' : 'unknown'),
  };
}

function attachLessonMetadata(
  lesson: TodayLesson,
  metadata: { lessonId: string; lessonSignature: string; learningSettings: ReturnType<typeof normalizeLearningSettingsFromParent> },
): TodayLesson {
  lesson.lessonId = metadata.lessonId;
  lesson.lessonSignature = metadata.lessonSignature;
  lesson.contentVersion = 'learning-path-v1';
  lesson.settingSnapshot = metadata.learningSettings;
  (lesson as any).generatedByVersion = APP_VERSION;
  (lesson as any).generatorVersion = 6;
  lesson.steps.forEach((step, index) => {
    step.questionInstanceId = `${metadata.lessonId}:${index}:${step.questionId}`;
  });
  return lesson;
}

const CORE_SLOT_ORDER: DailyCoreSlot[] = [
  'due_review', 'current_concept', 'same_skill_variant', 'application', 'stretch', 'olympiad',
];
const CORE_SLOT_ROLE: Record<DailyCoreSlot, NonNullable<LessonStep['role']>> = {
  due_review: 'due_review',
  current_concept: 'current_concept',
  same_skill_variant: 'same_skill_variant',
  application: 'application',
  stretch: 'stretch',
  olympiad: 'olympiad',
};

function buildUnitCoreLesson(params: {
  date: string;
  grade: LearningProfile['gradeBand'];
  semester: Semester;
  unitId: string;
  unitSource: 'manual' | 'default_for_grade';
  settings: ReturnType<typeof normalizeLearningSettingsFromParent>;
  signature: string;
  lessonId: string;
  state: GameState;
}): TodayLesson {
  const questionById = new Map([...allQuestions, ...progressionQuestions].map(question => [question.id, question]));
  const metadata = questionLearningMetadata.filter(item => item.unitId === params.unitId);
  const learningEvents = params.state.learningEvents || [];
  const prerequisitesNotKnownWeak = (skillKeys: string[]) => skillKeys.every(skillKey => {
    const submissions = learningEvents.filter(event => event.eventType === 'attempt_submitted'
      && event.result && event.skillIds.includes(skillKey) && event.firstAttemptKnown !== false);
    const firstByInstance = new Map<string, typeof submissions[number]>();
    for (const event of submissions) if (!firstByInstance.has(event.questionInstanceId)) firstByInstance.set(event.questionInstanceId, event);
    const first = [...firstByInstance.values()];
    if (first.length < 3) return true; // unknown prerequisite history is a prompt for support, not a permanent lock
    return first.filter(event => event.result === 'correct').length / first.length >= 0.6;
  });
  const tableEligible = (item: (typeof metadata)[number]) => {
    if (params.unitId !== 'g2-u1' && params.unitId !== 'g2-u2') return true;
    const record = item as typeof item & { tableRequirement?: 'concept' | 'facts'; multiplicationFacts?: Array<[number, number]> };
    if (record.tableRequirement === 'concept') return true;
    if (record.tableRequirement !== 'facts' || !params.settings.learnedTableRange?.length || !record.multiplicationFacts?.length) return false;
    const learned = new Set(params.settings.learnedTableRange);
    return record.multiplicationFacts.every(([left, right]) =>
      Number.isInteger(left) && Number.isInteger(right)
      && left >= 1 && left <= 9 && right >= 1 && right <= 9
      && (learned.has(left) || learned.has(right)),
    );
  };
  const availableCandidates = (role: 'foundation' | 'application' | 'advanced' | 'olympiad') => metadata
    .filter(item => item.role === role && tableEligible(item))
    .map(item => ({ item, question: questionById.get(item.questionId) }))
    .filter((entry): entry is { item: typeof metadata[number]; question: Question } =>
      !!entry.question
      && entry.question.gradeBand === params.grade
      && isQuestionSafeForNewLesson(entry.question)
      && isQuestionSafeForLesson(entry.question).safe,
    );
  const foundation = availableCandidates('foundation');
  const ordered = (entries: ReturnType<typeof availableCandidates>, slot: DailyCoreSlot) => {
    if (!entries.length) return entries;
    const candidatesAtEarnedTier = entries.filter(({ item, question }) => {
      const skillKeys = (item as any).targetSkillKeys || (question.id.startsWith('prog_') ? question.curriculumSkillIds : []);
      const skillKey = skillKeys?.[0];
      if (!skillKey) return item.tier === 1;
      const key = `${params.grade}:${params.unitId}:${skillKey}`;
      const earnedTier = params.state.learningDifficultyProgress?.[key]?.difficulty || 1;
      if (item.tier > earnedTier) return false;
      return item.tier < 2 || prerequisitesNotKnownWeak((item as any).prerequisiteSkillKeys || []);
    });
    const source = candidatesAtEarnedTier.length ? candidatesAtEarnedTier : entries.filter(({ item }) => item.tier === 1);
    if (!source.length) return [];
    const rotated = orderDailyCandidates(source, params.date, params.unitId, slot);
    if (slot !== 'stretch' && slot !== 'olympiad') return rotated;
    const safeTierOne = rotated.filter(({ item }) => item.tier === 1);
    const qualifiedTierTwo = rotated.filter(({ item }) => item.tier >= 2);
    const tierTwoHeldForEvidence = entries.some(({ item }) => item.tier >= 2) && qualifiedTierTwo.length === 0;
    if (tierTwoHeldForEvidence) selectionNotes.push(`${slot} 槽缺少本技能进阶证据或存在明确薄弱先修，保持入门难度`);
    if (params.settings.challengePreference === 'guided') return [...safeTierOne, ...qualifiedTierTwo];
    if (qualifiedTierTwo.length) return [...qualifiedTierTwo, ...safeTierOne];
    return rotated;
  };
  const dueReviewCandidates = foundation.filter(({ question }) => isDueForReview(question.id, params.state));
  const selectionNotes: string[] = [];
  const targetSkillOf = (entry: (typeof foundation)[number]) =>
    (entry.item as any).targetSkillKeys?.[0]
      || (entry.question.id.startsWith('prog_') ? entry.question.curriculumSkillIds?.[0] : undefined);
  const conceptOrder = ordered(foundation, 'current_concept');
  const pairedSkill = conceptOrder
    .map(targetSkillOf)
    .find((skill): skill is string => !!skill && new Set(foundation.filter(entry => targetSkillOf(entry) === skill).map(entry => entry.question.id)).size >= 2);
  const pairedFoundation = pairedSkill ? foundation.filter(entry => targetSkillOf(entry) === pairedSkill) : [];
  if (!pairedSkill) selectionNotes.push('本单元暂无同一数学技能的两道基础题，概念/变式槽明确留缺');
  const entriesBySlot: Record<DailyCoreSlot, ReturnType<typeof availableCandidates>> = {
    // For a first lesson (or when nothing is due), this slot is a retrieval
    // warm-up from the unit foundation pool instead of silently shrinking the lesson.
    due_review: ordered(dueReviewCandidates.length ? dueReviewCandidates : foundation, 'due_review'),
    current_concept: pairedSkill ? ordered(pairedFoundation, 'current_concept') : [],
    same_skill_variant: pairedSkill ? ordered(pairedFoundation, 'same_skill_variant') : [],
    application: ordered(availableCandidates('application'), 'application'),
    stretch: ordered(availableCandidates('advanced'), 'stretch'),
    olympiad: ordered(availableCandidates('olympiad'), 'olympiad'),
  };
  const uniqueSelection = selectDistinctCoreCandidates(Object.fromEntries(
    CORE_SLOT_ORDER.map(slot => [slot, entriesBySlot[slot].map(({ question, item }) => ({ questionId: question.id, role: item.role }))]),
  ) as Parameters<typeof selectDistinctCoreCandidates>[0]);

  const firstSelectedIndex = uniqueSelection.findIndex(Boolean);
  const gaps: string[] = [];
  if (dueReviewCandidates.length === 0) selectionNotes.push('到期复习暂缺，本槽使用本单元基础热身题');
  const steps: LessonStep[] = [];
  uniqueSelection.forEach((selected, index) => {
    const slot = CORE_SLOT_ORDER[index];
    if (!selected) {
      gaps.push(`${slot} 槽暂无可用的不同安全题`);
      return;
    }
    const entry = entriesBySlot[slot].find(({ question, item }) => question.id === selected.questionId && item.role === selected.role);
    if (!entry) return;
    const { question, item } = entry;
    const type: LessonStepType = 'answer_only';
    const role = CORE_SLOT_ROLE[slot];
    steps.push({
      id: `${params.date}_${slot}_${question.id}`,
      type,
      title: `${CORE_SLOT_TITLE[slot]}${item.tier >= 2 ? ' · 进阶' : ''}`,
      description: question.text,
      questionId: question.id,
      phases: ['read', 'answer', 'explain'],
      currentPhaseIndex: 0,
      status: index === firstSelectedIndex ? 'current' : 'locked',
      requiresAnswer: true,
      role,
      skill: (item as any).targetSkillKeys?.[0]
        || (question.id.startsWith('prog_') ? question.curriculumSkillIds?.[0] : undefined),
      method: item.method,
      tier: `tier${item.tier}` as LessonStep['tier'],
      settingSnapshot: params.settings,
    });
  });
  const lesson: TodayLesson = {
    date: params.date,
    steps,
    currentStepIndex: 0,
    completed: false,
    requestedCore: 6,
    actualCore: steps.length,
    coreGapReasons: gaps,
    coreSelectionNotes: selectionNotes,
    unitSource: params.unitSource,
  };
  attachLessonMetadata(lesson, {
    lessonId: params.lessonId,
    lessonSignature: params.signature,
    learningSettings: params.settings,
  });
  (lesson as any).curriculumSnapshot = {
    grade: Number(params.grade.slice(1)),
    semester: params.semester,
    semesterSource: params.settings.semesterSource,
    textbookEdition: params.settings.textbookEdition,
    unitId: params.unitId,
    unitSource: params.unitSource,
    challengePreference: params.settings.challengePreference,
    learnedTableRange: params.settings.learnedTableRange,
    lessonSignature: params.signature,
    contentVersion: 'learning-path-v1',
    requestedCore: 6,
    actualCore: steps.length,
    coreGapReasons: gaps,
    coreSelectionNotes: selectionNotes,
  };
  return lesson;
}

/** v2.6.5: 根据题型生成动态关卡标题 */
export function getDynamicStepTitle(type: LessonStepType, question?: Question): string {
  if (question?.problemType === 'logic_ranking' || question?.problemType === 'logic_truth' || question?.problemType === 'logic_ordering') {
    return '逻辑破案';
  }
  if (question?.problemType === 'shape_counting') return '图形破案';
  if (question?.problemType === 'ratio_distribution') return '份数推理';
  if (question?.problemType === 'planting_problem') return '路线种树谜';
  if (question?.problemType === 'age_problem') return '年龄推理';
  if (question?.problemType === 'information_check') return '线索检查';
  return STEP_TITLES[type] || '今日任务';
}

/** v2.6.5: 根据题型生成动态关卡描述 */
export function getDynamicStepDescription(type: LessonStepType, question?: Question): string {
  if (question?.problemType === 'logic_ranking' || question?.problemType === 'logic_truth' || question?.problemType === 'logic_ordering') {
    return '根据线索排出名次';
  }
  if (question?.problemType === 'information_check') return '判断信息够不够';
  if (question?.problemType === 'shape_counting') return '数清楚所有图形';
  if (question?.problemType === 'ratio_distribution') return '一步步找出目标份数';
  if (question?.problemType === 'planting_problem') return '沿着路线一步步想';
  if (question?.problemType === 'age_problem') return '一年一年找答案';
  return STEP_DESCRIPTIONS[type] || '继续完成今天的侦探任务';
}

// ========== 默认阶段映射 ==========

/**
 * 获取关卡类型的默认阶段列表。
 * v2.6.5: 支持根据 question.problemType 动态调整阶段。
 * 逻辑排序题不走 build_equation 流程，使用 understand_clues → logic_elimination → ranking_answer。
 */
export function getDefaultPhasesForStepType(type: LessonStepType, question?: Question): StepPhase[] {
  // v2.6.5: 逻辑排序题特殊处理
  if (question?.problemType === 'logic_ranking' || question?.problemType === 'logic_truth' || question?.problemType === 'logic_ordering') {
    if (type === 'full_solve') {
      return ['read', 'understand_clues', 'logic_elimination', 'ranking_answer', 'explain'];
    }
    // 如果逻辑题被分配到其他关卡，至少不走 equation 流程
    return ['read', 'answer'];
  }

  // v2.8.2: pattern/sequence problem types - no equation, no action words
  if (question?.problemType === 'pattern' || question?.problemType === 'sequence_arithmetic') {
    if (type === 'find_numbers') {
      return ['read', 'find_numbers', 'answer', 'explain'];
    }
    if (type === 'full_solve') {
      return ['read', 'find_numbers', 'understand_clues', 'answer', 'explain'];
    }
    return ['read', 'answer', 'explain'];
  }


  // Sub-project B (v2.10.0): Three-question flow for compatible questions
  if (type === 'full_solve' && question && isThreeQuestionFlowCompatible(question)) {
    return ['read', 'known_facts', 'target', 'plan', 'answer', 'check', 'explain'];
  }

  // Sub-project A (v2.10.0): Component-compatible phase names (fallback)
  switch (type) {
    case 'find_numbers':
      return ['read', 'find_numbers', 'answer', 'explain'];
    case 'find_action_words':
      return ['read', 'find_keywords', 'choose_operation', 'answer', 'explain'];
    case 'simulation':
      return ['read', 'choose_operation', 'answer', 'explain'];
    case 'remove_noise':
      return ['read', 'remove_noise', 'answer', 'explain'];
    case 'full_solve':
      return ['read', 'find_numbers', 'find_keywords', 'choose_operation', 'build_equation', 'answer', 'explain'];
    case 'find_compare_numbers':
      return ['read', 'find_numbers', 'find_compare_numbers', 'choose_operation', 'answer', 'explain'];
    case 'spot_extra_info':
      return ['read', 'find_numbers', 'spot_extra_info', 'answer', 'explain'];
    case 'spot_missing_info':
      return ['read', 'spot_missing_info', 'answer', 'explain'];
    case 'answer_only':
      // v2.11.1: No read phase — answer input must show immediately
      return ['answer', 'explain'];
    default:
      return ['read', 'answer', 'explain'];
  }
}

// ========== 步骤标准化 ==========

export function normalizeStep(step: Partial<LessonStep>, question?: Question): LessonStep {
  const type: LessonStepType = step.type || 'answer_only';  // v2.11.0

  const phases: StepPhase[] =
    Array.isArray(step.phases) && step.phases.length > 0
      ? step.phases
      : getDefaultPhasesForStepType(type, question);

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
    ...step,
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
        : ['simulation', 'remove_noise', 'full_solve', 'find_compare_numbers', 'answer_only'].includes(type),
  };
}

export function normalizeLesson(lesson: TodayLesson | null): TodayLesson | null {
  if (!lesson || !Array.isArray(lesson.steps)) return null;

  const steps = lesson.steps.map(s => normalizeStep(s));

  const currentStepIndex =
    typeof lesson.currentStepIndex === 'number' &&
    lesson.currentStepIndex >= 0 &&
    lesson.currentStepIndex < steps.length
      ? lesson.currentStepIndex
      : 0;

  return {
    ...lesson,
    date: lesson.date || getDateStr(),
    steps,
    currentStepIndex,
    completed: Boolean(lesson.completed),
    caseStoryId: lesson.caseStoryId,
    // v2.8.0: 保留 reward 幂等字段
    rewardClaimed: lesson.rewardClaimed,
    rewardShown: lesson.rewardShown,
    rewardClaimedAt: lesson.rewardClaimedAt,
    rewardShownAt: lesson.rewardShownAt,
    completedAt: lesson.completedAt,
  };
}

// ========== 合法性校验 + 自动修复 ==========

export function safeNormalizeLesson(lesson: TodayLesson | null): TodayLesson | null {
  // 1. 空数据 → 重新生成
  if (!lesson) return null;

  const today = getDateStr();

  // 2. Keep a genuinely started course across midnight; unstarted stale courses expire.
  if (lesson.date !== today) {
    const started = lesson.completed !== true && Array.isArray(lesson.steps) && (
      lesson.currentStepIndex > 0 || lesson.steps.some((step, index) =>
        step.status === 'completed' || step.awardedAt != null ||
        (index === lesson.currentStepIndex && step.currentPhaseIndex > 0)
      )
    );
    if (!started && typeof window !== 'undefined') {
      try { localStorage.removeItem('math-detective-today-lesson'); } catch { /* ignore */ }
    }
    if (!started) return null;
  }

  // 3. 没有步骤 → 重新生成
  if (!Array.isArray(lesson.steps) || lesson.steps.length === 0) return null;

  // 4. 已完成 → 保留
  if (lesson.completed) {
    return normalizeLesson(lesson);
  }

  // 5. 标准化所有 step
  const steps = lesson.steps.map(s => normalizeStep(s));
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
      ...lesson,
      date: lesson.date,
      steps,
      currentStepIndex: 0,
      completed: true,
      caseStoryId: lesson.caseStoryId,
    };
  }

  // 12. v2.6.9 + v2.6.12: 验证当前 step 的题目兼容性（含主题匹配）并自动修复
  const currentStepIdx = currentIdx;
  if (currentStepIdx < n) {
    const current = steps[currentStepIdx];
    if (current.questionId) {
      const q = getQuestionById(current.questionId);
      if (q) {
        // v2.6.12: 主题-题目匹配检查
        const lessonStory = lesson.caseStoryId
          ? allStories.find(s => s.id === lesson.caseStoryId)
          : undefined;
        let themeMismatch = false;
        if (lessonStory) {
          const themeCompat = isQuestionCompatibleWithTheme(q, lessonStory);
          if (!themeCompat) {
            themeMismatch = true;
            if (typeof window !== 'undefined') {
              console.warn(`[safeNormalizeLesson] step[${currentStepIdx}].question theme mismatch: q=${q.id} vs story=${lessonStory.id}`);
            }
          }
        }

        const compatError = validateStepQuestionCompatibility(current, q);
        const unsafeQuestion = !isQuestionSafeForNewLesson(q);
        if (compatError || themeMismatch || unsafeQuestion) {
          if (typeof window !== 'undefined') {
            console.warn(`[safeNormalizeLesson] step[${currentStepIdx}].question incompatible: ${compatError}. Auto-repairing.`);
          }
          const state = loadState();
          const instanceId = current.questionInstanceId;
          const hasSuccessfulCurrentInstance = Boolean(instanceId && (state.learningEvents || []).some(event =>
            event.questionInstanceId === instanceId
            && (event.eventType === 'question_completed' || (event.eventType === 'attempt_submitted' && event.result === 'correct'))
          ));
          if (current.status === 'completed' || current.awardedAt || hasSuccessfulCurrentInstance) {
            // Correct/completed history is immutable. Wrong attempts remain in the
            // event log, but an unsafe current item may be replaced by a new instance.
          } else {
            const sourceGrade = lesson.settingSnapshot?.grade || (lesson as any).curriculumSnapshot?.grade && `G${(lesson as any).curriculumSnapshot.grade}` || state.parentSettings.learningSettings?.grade || state.parentSettings.gradeBand;
            const unitId = lesson.settingSnapshot?.unitId ?? (lesson as any).curriculumSnapshot?.unitId ?? null;
            const metadataRole = current.role === 'stretch' ? 'advanced'
              : current.role === 'olympiad' ? 'olympiad'
              : current.role === 'application' ? 'application'
              : current.role ? 'foundation' : null;
            const usedOtherIds = new Set(steps.filter((_, index) => index !== currentStepIdx).map(step => step.questionId));
            const replacement = unitId && metadataRole
              ? questionLearningMetadata.filter(item => item.unitId === unitId && item.role === metadataRole)
                .map(item => ({ item, question: getQuestionById(item.questionId) }))
                .find(({ item, question }) => Boolean(question && !usedOtherIds.has(question.id)
                  && question.gradeBand === sourceGrade && isQuestionSafeForNewLesson(question)
                  && validateStepQuestionCompatibility(current, question) === null))
              : undefined;
            if (replacement?.question) {
              const repairedSteps = [...steps];
              repairedSteps[currentStepIdx] = {
                ...current,
                id: `${lesson.date}_repair_${currentStepIdx}_${replacement.question.id}`,
                questionId: replacement.question.id,
                description: replacement.question.text,
                title: getDynamicStepTitle(current.type, replacement.question),
                phases: current.type === 'answer_only' ? ['read', 'answer', 'explain'] : getDefaultPhasesForStepType(current.type, replacement.question),
                status: 'current',
                currentPhaseIndex: 0,
                questionInstanceId: `${lesson.lessonId || lesson.date}:repair:${currentStepIdx}:${replacement.question.id}:${Date.now()}`,
                skill: (replacement.item as any).targetSkillKeys?.[0]
                  || (replacement.question.id.startsWith('prog_') ? replacement.question.curriculumSkillIds?.[0] : undefined),
                method: replacement.item.method,
                tier: `tier${replacement.item.tier}` as LessonStep['tier'],
                settingSnapshot: current.settingSnapshot,
                awardedAt: undefined,
              };
              const repaired: TodayLesson = { ...lesson, steps: repairedSteps, currentStepIndex: currentIdx };
              saveTodayLesson(repaired);
              return repaired;
            } else {
              const reason = `当前 ${current.role || '未知角色'} 题目 ${current.questionId} 不可用于新练习，且本单元暂未找到同类替代题。`;
              const coreGapReasons = [...new Set([...(lesson.coreGapReasons || []), reason])];
              return { ...lesson, steps, currentStepIndex: currentIdx, coreGapReasons };
            }
          }
        }
      }
    }
  }

  // 13. 检查是否所有 steps 都已完成
  const allDone = steps.every(s => s.status === 'completed');
  if (allDone) {
    return {
      ...lesson,
      date: lesson.date,
      steps,
      currentStepIndex: 0,
      completed: true,
      caseStoryId: lesson.caseStoryId,
    };
  }

  return {
    ...lesson,
    date: lesson.date,
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
  // v2.6.8: 使用统一的 getAccuracyStats 获取近期正确率
  const stats = getAccuracyStats(state);
  const recentAccuracy = stats.totalAttempts > 0 ? stats.overallAccuracy : 100;

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

  const gradePool = questionsByGrade[profile.gradeBand] || safeQuestions;
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
    const g1Advanced: LessonStepType[] = ['find_compare_numbers'];
    shuffleArray(g1Advanced);
    base.push('simulation', 'remove_noise');
    base.push(...g1Advanced.slice(0, 1), 'answer_only');  // v2.11.0
  } else {
    const advanced: LessonStepType[] = ['find_compare_numbers', 'remove_noise', 'spot_extra_info', 'answer_only'];  // v2.11.0
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
 * 计算有效难度上限（v2.9.0: 基于learnerProfile自适应，兼容旧版profile）
 */
function getEffectiveMaxDifficulty(profile: LearningProfile, learnerProfile?: CurriculumLearnerProfile): number {
  // v2.9.0: use learnerProfile.currentDifficultyLevel if available
  if (learnerProfile) {
    return Math.min(5, learnerProfile.currentDifficultyLevel + 1);
  }
  // Legacy fallback
  return Math.min(5, 1 + Math.floor(profile.skillLevel));
}

/**
 * v2.9.0: 从GameState提取使用阶段和学期
 */
function getUsageContext(state: {
  totalCompleted: number;
  completedQuestions: string[];
  parentSettings: GameState['parentSettings'];
  learnerProfile?: any;
}): {
  usageStage: UsageStage;
  semester: Semester;
  grade: number;
  learnerProfile: CurriculumLearnerProfile | undefined;
} {
  const totalCompleted = state.totalCompleted || state.completedQuestions.length;
  const daysEstimate = Math.max(1, Math.ceil(totalCompleted / 5));
  const stageInfo = detectUsageStage(daysEstimate, totalCompleted, {
    recentAccuracy: state.learnerProfile?.recentAccuracy,
    consecutiveCheckInDays: 0,
    fullHintRate: state.learnerProfile?.fullHintRate || 0,
  });
  const gradeMatch = state.parentSettings.gradeBand.match(/G(\d+)/);
  const grade = gradeMatch ? parseInt(gradeMatch[1]) : 1;
  const semester = resolveEffectiveSemester({
    semesterOverride: state.parentSettings.learningSettings?.semesterSource === 'manual'
      ? state.parentSettings.learningSettings.semester
      : state.parentSettings.semesterOverride as Semester | undefined,
  }).semester;

  return {
    usageStage: stageInfo.stage,
    semester,
    grade,
    learnerProfile: state.learnerProfile as CurriculumLearnerProfile | undefined,
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
      const persistedSnapshot = loadState();
      const savedLesson: TodayLesson | null = saved ? JSON.parse(saved) : null;
      const snapshotLesson = persistedSnapshot.lastCommittedLesson || null;
      const snapshotStarted = !!snapshotLesson && snapshotLesson.completed !== true && (
        snapshotLesson.currentStepIndex > 0 || snapshotLesson.steps.some((step, index) =>
          step.status === 'completed' || step.awardedAt != null || (index === snapshotLesson.currentStepIndex && step.currentPhaseIndex > 0),
        )
      );
      const sameLifecycle = !!snapshotLesson && !!savedLesson
        && snapshotLesson.lessonId === savedLesson.lessonId;
      const snapshotWins = !!snapshotLesson && (
        (sameLifecycle && (snapshotLesson.persistenceRevision || 0) > (savedLesson?.persistenceRevision || 0))
        || (!savedLesson && (snapshotLesson.date === today || snapshotStarted))
        || (!!savedLesson && snapshotLesson.date !== savedLesson.date && snapshotStarted)
        || (!!savedLesson && snapshotLesson.date === today && savedLesson.date !== today)
      );
      const parsed: TodayLesson | null = snapshotWins ? snapshotLesson : savedLesson;
      if (parsed) {

        // v2.10.2: Enhanced version check — auto-invalidate old/safe lessons
        const version = (parsed as any).generatedByVersion;
        const generatorVersion = (parsed as any).generatorVersion || 0;
        const lessonSemester = (parsed as any).curriculumSnapshot?.semester;
        const state = loadState();
        const settings = resolveEffectiveLessonSettings(state).settings;
        const expectedSignature = createLessonSignature({
          settings,
          curriculumVersion: 'curriculum-v1',
          contentVersion: 'learning-path-v1',
          trainingMode: state.parentSettings.trainingMode,
          schoolHarder: state.parentSettings.schoolHarder,
        });
        const currentSemester = settings.semester;
        const hasStartedCourse = parsed.completed !== true &&
          Array.isArray(parsed.steps) &&
          (parsed.currentStepIndex > 0 || parsed.steps.some((step, index) =>
            step.status === 'completed' ||
            step.awardedAt != null ||
            (index === parsed.currentStepIndex && step.currentPhaseIndex > 0)
          ));
        const semesterMismatch = Boolean(lessonSemester && currentSemester && lessonSemester !== currentSemester);
        const preserveCurrentCourse = parsed.completed === true || hasStartedCourse;

        // Check if any step ID contains "safe_" (safe fallback lesson)
        const hasSafeSteps = parsed.steps?.some((s: any) => s.id?.includes('_safe_'));

        const needsRebuild = !preserveCurrentCourse && (
          // 没有 version 标记（旧版本生成）
          !version ||
          // generatorVersion 低于 4（v2.10.2 之前）
          generatorVersion < 6 ||
          // Keep a started or completed course stable despite stale metadata or semester snapshots.
          semesterMismatch ||
          // Replace a safe fallback before the course has started; do not discard active progress.
          hasSafeSteps ||
          // Loop-detected lesson — force rebuild
          (parsed as any)._loopDetected === true ||
          // Rebuild an unstarted course when its normalized learning contract changed.
          (parsed.lessonSignature !== expectedSignature)
        );

        if (!needsRebuild) {
          // 先用 safeNormalizeLesson 校验，异常数据自动修复
          const safe = safeNormalizeLesson(parsed);
          if (safe && (safe.date === today || hasStartedCourse)) {
            // 自动修复后重新保存
            if (stableSerialize(safe) !== stableSerialize(parsed)) {
              saveTodayLesson(safe);
            }
            if (typeof window !== 'undefined') {
              console.log('[getTodayLesson] Reusing existing lesson, version:', version);
            }
            return safe;
          }
        } else {
          if (typeof window !== 'undefined') {
            console.warn(`[getTodayLesson] Stale lesson detected: version=${version || 'none'}, lessonSemester=${lessonSemester || 'none'}, currentSemester=${currentSemester || 'none'}. Rebuilding.`);
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

// ========== 按关卡类型选题（v2.6 P0修复：增加类型严格校验） ==========

// 禁止出现在 find_numbers 关卡的关键词
const FORBIDDEN_IN_NUMBER_CLUE = new Set([
  '至少', '保证', '最少', '一定', '不管', '最坏', '摸出',
  '倍', '倍的关系', '谁最快', '谁最慢', '第一名', '最后一名',
]);

// 禁止出现在 find_action_words 关卡的关键词
const FORBIDDEN_IN_ACTION_WORDS = new Set([
  '至少', '保证', '最少', '一定', '不管', '最坏', '摸出',
  '倍', '几倍', '倍数',
  '比', '多几', '少几', '差几',
  '每份', '每组', '每人', '平均', '一样多',
  '谁最快', '谁最慢', '不是最后一名', '第一名', '最后一名',
  // v2.6.8: 补充更多非加减词
  '每隔', '植树', '种树', '种了', '种一棵', '一条路', '两端',
  '圆形', '围成一个圈', '每隔几米',
]);

const STEP_TYPE_REQUIREMENTS: Record<LessonStepType, (q: Question) => boolean> = {
  find_numbers: (q) => {
    // P0修复：必须有数字，且不能是逻辑推理题
    if (q.numbers.length === 0) return false;
    // 禁止逻辑推理题进入数字线索关卡
    const lessonType = inferLessonType(q);
    if (lessonType === 'logic_reasoning' || lessonType === 'guarantee_worst_case') return false;
    // 关键字检查
    const hasForbidden = q.keywords.some(k => FORBIDDEN_IN_NUMBER_CLUE.has(k.word));
    if (hasForbidden) return false;
    // 数字必须是有效计算数字
    const usefulCount = q.numbers.filter(n => classifyNumberRole(n, q.text, q.domain, q.operation) === 'useful_number').length;
    if (usefulCount === 0) return false;
    return q.numbers.length >= 1;
  },
  find_action_words: (q) => {
    if (q.keywords.length === 0) return false;
    // v2.6.8: problemType 级别过滤 — 年龄倍率/比例分配/逻辑排序/图形计数/植树题不应进动作词
    const forbiddenTypes = new Set([
      'age_problem', 'ratio_distribution', 'logic_ranking',
      'logic_truth', 'logic_ordering', 'shape_counting',
      'planting_problem', 'pattern',
    ]);
    if (q.problemType && forbiddenTypes.has(q.problemType)) return false;
    // P0修复：禁止"至少/保证/倍"等非加减关键词
    const hasForbidden = q.keywords.some(k => FORBIDDEN_IN_ACTION_WORDS.has(k.word));
    if (hasForbidden) return false;
    // v2.6.8: 额外检查 — 题文中含"岁/年龄/倍"的题目不能进动作词
    if (q.text.includes('岁') || q.text.includes('年龄')) return false;
    // 必须是加减动作词
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
  answer_only: () => true,  // v2.11.0: Always compatible
};

export function selectQuestionForStep(params: {
  stepType: LessonStepType;
  profile: LearningProfile;
  usedQuestionIds: string[];
  targetDifficulty?: number;
  /** v2.6.11: 故事主题，用于过滤兼容题目 */
  story?: CaseStory | null;
}): Question | null {
  const { stepType, profile, usedQuestionIds, story } = params;
  const maxDifficulty = params.targetDifficulty ?? getEffectiveMaxDifficulty(profile);
  const grade = profile.gradeBand;
  const usedSet = new Set(usedQuestionIds);

  const isCompatible = STEP_TYPE_REQUIREMENTS[stepType];

  // v2.7.4: 主题兼容性过滤（fallbackToGeneric 故事跳过主题过滤）
  const themeFilter = (q: Question): boolean => {
    if (!story) return true;
    if (story.fallbackToGeneric) return true; // 题库不足，不按主题过滤
    return isQuestionCompatibleWithTheme(q, story);
  };

  const tryPool = (pool: Question[], allowDegrade: boolean): Question | null => {
    // v2.7.1: 先按安全+主题过滤，再按 stepType 过滤
    const themeCompatible = pool.filter(q =>
      !usedSet.has(q.id) &&
      q.difficulty <= maxDifficulty &&
      themeFilter(q) &&
      isQuestionSafeForLesson(q).safe
    );

    const compatible = themeCompatible.filter(q =>
      q.stepCompatibility?.includes(stepType) || (!q.stepCompatibility && isCompatible(q))
    ).filter(q => {
      if (stepType === 'spot_extra_info') {
        return Array.isArray(q.extraNumbers) && q.extraNumbers.length > 0;
      }
      if (stepType === 'remove_noise') {
        return Array.isArray(q.noisePhrases) && q.noisePhrases.length > 0;
      }
      return true;
    });

    if (compatible.length > 0) {
      for (let i = compatible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [compatible[i], compatible[j]] = [compatible[j], compatible[i]];
      }
      return compatible[0];
    }

    if (!allowDegrade) return null;

    const fieldMatch = themeCompatible.filter(q =>
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
  const pool = questionsByGrade[grade] || safeQuestions;
  let result = tryPool(pool, stepType !== 'remove_noise');

  // Degrade: lower difficulty (v2.7.1: 保留安全+主题过滤)
  if (!result && stepType !== 'remove_noise') {
    for (let diff = maxDifficulty - 1; diff >= 1; diff--) {
      const lowered = pool.filter(q =>
        !usedSet.has(q.id) && q.difficulty <= diff && isCompatible(q) && themeFilter(q) && isQuestionSafeForLesson(q).safe
      );
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

  // Degrade: wider grade band (ONLY for specific types)
  if (!result && stepType !== 'remove_noise' && stepType !== 'spot_extra_info' && stepType !== 'spot_missing_info') {
      result = tryPool(safeQuestions, stepType !== 'find_numbers');
  }

  // P0修复：不再无差别fallback到任意题目。如果找不到匹配题，返回null让上层处理。
  if (!result) {
    console.warn(
      `[selectQuestionForStep] No suitable question for stepType="${stepType}" ` +
      `(grade=${grade}, maxDifficulty=${maxDifficulty}). Returning null.`
    );
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
  const pool = questionsByGrade[profile.gradeBand] || safeQuestions;

  return pool.filter(q =>
    !excludeSet.has(q.id) &&
    isDueForReview(q.id, state) &&
    q.difficulty <= Math.min(5, maxDifficulty + 1)
  );
}

// ========== 每日课程构建 ==========

export function buildDailyLesson(
  profile: LearningProfile,
  completedIds: string[],
  mistakes: MistakeRecord[],
  overrideState?: GameState,
): TodayLesson {
  const today = getDateStr();

  // Load full state for v2.9.0 features
  // In browser: loadState() from localStorage; in tests: use overrideState
  const fullState = overrideState || loadState();
  const baseLearningSettings = fullState.parentSettings.learningSettings || normalizeLearningSettingsFromParent(fullState.parentSettings);
  const resolvedSettings = resolveEffectiveLessonSettings(fullState);
  const selectedUnitId = resolvedSettings.settings.unitId;
  const selectedUnit = selectedUnitId ? getAvailableLearningUnits(resolvedSettings.settings.grade).find(unit => unit.id === selectedUnitId) : undefined;
  const unitSource = resolvedSettings.unitSource;
  const learningSettings = resolvedSettings.settings;
  const lessonSignature = createLessonSignature({
    settings: learningSettings,
    curriculumVersion: 'curriculum-v1',
    contentVersion: 'learning-path-v1',
    trainingMode: fullState.parentSettings.trainingMode,
    schoolHarder: fullState.parentSettings.schoolHarder,
  });
  const lessonId = `${today}-${hashSignature(lessonSignature)}`;
  const ctx = getUsageContext(fullState);
  const { usageStage, semester, grade, learnerProfile } = ctx;
  const maxDifficulty = getEffectiveMaxDifficulty(profile, learnerProfile);

  const uncovered: TodayLesson = {
    date: today,
    steps: [],
    currentStepIndex: 0,
    completed: false,
    requestedCore: 6,
    actualCore: 0,
    coreGapReasons: [baseLearningSettings.unitId
      ? `所选单元 ${baseLearningSettings.unitId} 尚无通过内容覆盖核验的题目池`
      : `${baseLearningSettings.grade} 尚无通过内容覆盖核验的学习单元`],
    unitSource: baseLearningSettings.unitId ? 'manual' : 'unknown',
  };
  attachLessonMetadata(uncovered, { lessonId, lessonSignature, learningSettings });
  (uncovered as any).curriculumSnapshot = {
    grade: Number(learningSettings.grade.slice(1)),
    semester: learningSettings.semester,
    semesterSource: learningSettings.semesterSource,
    textbookEdition: learningSettings.textbookEdition,
    unitId: baseLearningSettings.unitId,
    unitSource: uncovered.unitSource,
    lessonSignature,
    requestedCore: 6,
    actualCore: 0,
    coreGapReasons: uncovered.coreGapReasons,
  };

  // New grade-aware curriculum is the only active generator when approved
  // unit content exists. Never fall through to the legacy cross-unit planner.
  if (selectedUnit) {
    const effectiveGrade = learningSettings.grade;
    return buildUnitCoreLesson({
      date: today,
      grade: effectiveGrade,
      semester: learningSettings.semester,
      unitId: selectedUnit.id,
      unitSource: unitSource as 'manual' | 'default_for_grade',
      settings: learningSettings,
      signature: lessonSignature,
      lessonId,
      state: fullState,
    });
  }

  const legacyPlanner = (): TodayLesson => {
  // v2.9.1: Get semester progress
  const semesterProgress = fullState.curriculumProfile?.semesterProgress as any || 'early';

  const stepTypes = getStepTypesForGrade(profile.gradeBand);

  // Select case story
  const recentStoryIds = getRecentStoryIds(3);
  const caseStory = getCaseStoryForDate(allStories, profile.gradeBand, today, recentStoryIds);
  let caseStoryId: string | undefined;
  if (caseStory) {
    caseStoryId = caseStory.id;
    saveRecentStoryId(caseStory.id);
  }

  // Load full state for review data
  const dueReviews = getDueReviewQuestions(profile, fullState, []);
  // Max 2 review questions if available
  const reviewSlots = Math.min(2, dueReviews.length);

  // v2.9.1: Generate daily slot plan with semester progress
  const slotPlan = learnerProfile
    ? generateDailySlotPlan({ usageStage, learnerProfile, grade, semester, semesterProgress })
    : null;

  // v2.9.0: Single-digit limit
  const singleDigitLimit = maxSingleDigitQuestions(usageStage, stepTypes.length);

  const usedQuestionIds: string[] = [];
  const steps: LessonStep[] = [];
  let singleDigitUsed = 0;
  // v2.10.2: Track effective step type across selections (P0 step mismatch fix)
  let lastEffectiveStepType: LessonStepType | null = null;

  // Track which questions are single-digit review
  const isSingleDigitReview = (q: Question): boolean => {
    return q.isReview === true && q.difficulty <= 1;
  };

  // v2.10.0 Sub-project C: Generation diagnostic report
  const selectionDiagnostic: any[] = [];

  // v2.10.0 Sub-project C: Curriculum-aware question selection with diagnostics
  const selectCurriculumAwareQuestion = (params: {
    stepType: LessonStepType;
    usedIds: string[];
    targetDiff: number;
    story?: CaseStory | null;
    forceSlot?: string;
    assessmentTier?: AssessmentTier;
    skillFilter?: string[];
  }): Question | null => {
    const slotLabel = `slot_${steps.length + 1}`;
    const diagnostic: any = {
      slot: slotLabel,
      stepType: params.stepType,
      targetDiff: params.targetDiff,
      assessmentTier: params.assessmentTier,
      skillFilter: params.skillFilter,
      attempts: [],
      selectedQuestion: null,
      finalReason: null,
    };

    // First try curriculum-aware selection if we have a learnerProfile
    if (learnerProfile && slotPlan) {
      const pool = questionsByGrade[profile.gradeBand] || safeQuestions;
      diagnostic.sourcePoolSize = pool.length;

      // Try with the requested step type first
      let picked: Question | null = null;
      let effectiveStepType: LessonStepType = params.stepType;
      let reason: string | null = null;

      picked = tryCurriculumSelectionWithDiag(pool, params, 'full', diagnostic);
      reason = 'full';

      // v2.10.2: If step type filtered out all candidates, retry with full_solve
      if (!picked && params.stepType !== 'full_solve') {
        picked = tryCurriculumSelectionWithDiag(pool, { ...params, stepType: 'answer_only' as LessonStepType }, 'step_degraded', diagnostic);
        if (picked) {
          effectiveStepType = 'answer_only' // v2.11.0;
          reason = 'step_degraded';
        }
      }

      // v2.9.0 FIX: If still empty, try without theme filtering
      if (!picked) {
        picked = tryCurriculumSelectionWithDiag(pool, { ...params, stepType: 'answer_only' as LessonStepType, story: null }, 'theme_degraded', diagnostic);
        if (picked) {
          effectiveStepType = 'answer_only' // v2.11.0;
          reason = 'theme_degraded';
        }
      }

      diagnostic.finalReason = picked ? reason : 'all_fallbacks_exhausted';

      if (picked) {
        if (isSingleDigitReview(picked)) singleDigitUsed++;
        lastEffectiveStepType = effectiveStepType;
        diagnostic.selectedQuestion = {
          id: picked.id,
          text: picked.text.substring(0, 50),
          difficulty: picked.difficulty,
          assessmentTier: (picked as any).assessmentTier,
          sourcePool: profile.gradeBand,
          selectionReason: reason,
          effectiveStepType,
        };
        diagnostic.effectiveStepType = effectiveStepType;
        selectionDiagnostic.push(diagnostic);
        return picked;
      }

      // v2.10.0: No fallback to legacy — report the gap
      console.error(`[P0-3][Curriculum] Slot ${slotLabel}: no candidates after all fallbacks. stepType=${params.stepType} targetDiff=${params.targetDiff} tier=${params.assessmentTier}`);
      diagnostic.finalReason = 'no_candidates_any_fallback';
      selectionDiagnostic.push(diagnostic);
      return null;
    }

    // No learnerProfile or slotPlan available
    diagnostic.finalReason = 'no_learner_profile';
    selectionDiagnostic.push(diagnostic);

    // Fallback to legacy selection (only when no curriculum system available)
    return selectQuestionForStep({
      stepType: params.stepType,
      profile,
      usedQuestionIds: params.usedIds,
      targetDifficulty: params.targetDiff,
      story: params.story,
    });
  };

  // v2.10.0 Sub-project C: tryCurriculumSelection with diagnostics
  const tryCurriculumSelectionWithDiag = (
    pool: Question[],
    params: {
      stepType: LessonStepType;
      usedIds: string[];
      targetDiff: number;
      story?: CaseStory | null;
      forceSlot?: string;
      assessmentTier?: AssessmentTier;
      skillFilter?: string[];
    },
    mode: string,
    diagnostic: any,
  ): Question | null => {
    const attempt: any = { mode, stepType: params.stepType, story: !!params.story };
    const candidates = selectQuestionsForSlot({
      pool,
      targetDifficulty: params.targetDiff,
      learnerProfile: learnerProfile!,
      usageStage,
      grade,
      semester,
      excludeIds: params.usedIds,
      slotCategory: (params.forceSlot as any) || 'currentCore',
      assessmentTier: params.assessmentTier,
      skillFilter: params.skillFilter,
    });
    attempt.candidateCount = candidates.length;
    attempt.candidatesPreview = candidates.slice(0, 3).map(c => ({
      id: c.id, text: c.text.substring(0, 30), diff: c.difficulty, tier: (c as any).assessmentTier
    }));

    const compatible = candidates.filter(q => {
      const stReq = STEP_TYPE_REQUIREMENTS[params.stepType];
      if (!stReq) return true;
      if (!stReq(q)) return false;
      if (params.story && !params.story.fallbackToGeneric) {
        if (!isQuestionCompatibleWithTheme(q, params.story)) return false;
      }
      if (!isQuestionSafeForLesson(q).safe) return false;
      if (isSingleDigitReview(q) && singleDigitUsed >= singleDigitLimit) return false;
      return true;
    });
    attempt.compatibleCount = compatible.length;
    attempt.rejectedByStep = candidates.length - compatible.length;

    if (compatible.length === 0) {
      attempt.result = 'empty';
      diagnostic.attempts.push(attempt);
      return null;
    }

    // Pick from compatible candidates
    const picked = pickQuestionFromCandidates(compatible);
    attempt.result = picked ? picked.id : 'pick_failed';
    diagnostic.attempts.push(attempt);
    return picked;
  };

  // Helper: attempt curriculum-aware selection with given params
  const tryCurriculumSelection = (
    pool: Question[],
    params: {
      stepType: LessonStepType;
      usedIds: string[];
      targetDiff: number;
      story?: CaseStory | null;
      forceSlot?: string;
      assessmentTier?: AssessmentTier;
      skillFilter?: string[];
    },
    _reason: string,
  ): Question | null => {
    const candidates = selectQuestionsForSlot({
      pool,
      targetDifficulty: params.targetDiff,
      learnerProfile: learnerProfile!,

      usageStage,
      grade,
      semester,
      excludeIds: params.usedIds,
      slotCategory: (params.forceSlot as any) || 'currentCore',
      // v2.9.1: Assessment tier and skill filter from slot plan
      assessmentTier: params.assessmentTier,
      skillFilter: params.skillFilter,
    });

    const compatible = candidates.filter(q => {
      const stReq = STEP_TYPE_REQUIREMENTS[params.stepType];
      if (!stReq) return true;
      if (!stReq(q)) return false;
      if (params.story && !params.story.fallbackToGeneric) {
        if (!isQuestionCompatibleWithTheme(q, params.story)) return false;
      }
      if (!isQuestionSafeForLesson(q).safe) return false;
      // v2.9.0: enforce single-digit limit
      if (isSingleDigitReview(q) && singleDigitUsed >= singleDigitLimit) return false;
      return true;
    });

    return pickQuestionFromCandidates(compatible);
  };

  // Place review questions in early slots
  for (let i = 0; i < reviewSlots && i < stepTypes.length; i++) {
    const reviewQ = dueReviews[i];
    if (!reviewQ) break;

    const st = stepTypes[i];
    usedQuestionIds.push(reviewQ.id);
    const phases = [...getDefaultPhasesForStepType(st, reviewQ)];

    steps.push({
      id: `${today}_review_${i}_${reviewQ.id}`,
      type: st,
      title: getDynamicStepTitle(st, reviewQ),
      description: getDynamicStepDescription(st, reviewQ),
      questionId: reviewQ.id,
      phases,
      currentPhaseIndex: 0,
      status: i === 0 ? 'current' : 'locked',
      requiresAnswer: true,
    });
  }

  // Fill remaining slots with curriculum-aware selection
  for (let i = steps.length; i < stepTypes.length; i++) {
    const st = stepTypes[i];

    // v2.9.1: get target difficulty, assessment tier, and skill filter from slot plan
    const targetDiff = slotPlan?.[i]?.targetDifficulty || maxDifficulty;
    const slotCategory = slotPlan?.[i]?.category || 'currentCore';
    const slotAssessmentTier = slotPlan?.[i]?.assessmentTier as AssessmentTier | undefined;
    const slotSkillFilter = slotPlan?.[i]?.skillFilter as string[] | undefined;

    lastEffectiveStepType = null;
    const question = selectCurriculumAwareQuestion({
      stepType: st,
      usedIds: usedQuestionIds,
      targetDiff,
      story: caseStory,
      forceSlot: slotCategory,
      assessmentTier: slotAssessmentTier,
      skillFilter: slotSkillFilter,
    });
    // v2.10.2: Use effective step type from selection (may differ if step_degraded)
    const effectiveSt = lastEffectiveStepType || st;

    if (!question) {
      // Fallback: try lower difficulty
      for (let diff = targetDiff - 1; diff >= 1; diff--) {
        lastEffectiveStepType = null;
        const fallback = selectCurriculumAwareQuestion({
          stepType: st,
          usedIds: usedQuestionIds,
          targetDiff: diff,
          story: caseStory,
          forceSlot: slotCategory,
          assessmentTier: slotAssessmentTier,
          skillFilter: slotSkillFilter,
        });
        const fbEffectiveSt = lastEffectiveStepType || st;
        if (fallback) {
          usedQuestionIds.push(fallback.id);
          const phases = [...getDefaultPhasesForStepType(fbEffectiveSt, fallback)];
          steps.push({
            id: `${today}_${fbEffectiveSt}_${i}_${fallback.id}`,
            type: fbEffectiveSt,
            title: getDynamicStepTitle(fbEffectiveSt, fallback),
            description: getDynamicStepDescription(fbEffectiveSt, fallback),
            questionId: fallback.id,
            phases,
            currentPhaseIndex: 0,
            status: i === 0 ? 'current' : 'locked',
            requiresAnswer: true,
          });
          break;
        }
      }
      continue;
    }

    usedQuestionIds.push(question.id);
    const phases = [...getDefaultPhasesForStepType(effectiveSt, question)];

    steps.push({
      id: `${today}_${effectiveSt}_${i}_${question.id}`,
      type: effectiveSt,
      title: getDynamicStepTitle(effectiveSt, question),
      description: getDynamicStepDescription(effectiveSt, question),
      questionId: question.id,
      phases,
      currentPhaseIndex: 0,
      status: i === 0 ? 'current' : 'locked',
      requiresAnswer: true,
    });
  }

  // If no steps at all, generate safe fallback
  if (steps.length === 0) {
    console.warn('[buildDailyLesson] No steps generated — using safe fallback');
    return attachLessonMetadata(generateSafeFallbackLesson(profile.gradeBand), {
      lessonId, lessonSignature, learningSettings,
    });
  }

  // v2.9.1: Version stamp + curriculum snapshot for stale detection
  const lesson: TodayLesson = {
    date: today,
    steps,
    currentStepIndex: 0,
    completed: false,
    caseStoryId,
  };

  // Attach version metadata
  attachLessonMetadata(lesson, { lessonId, lessonSignature, learningSettings });
  (lesson as any).curriculumSnapshot = {
    grade,
    semester,
    semesterProgress,
    semesterSource: learningSettings.semesterSource,
    textbookEdition: learningSettings.textbookEdition,
    unitId: learningSettings.unitId,
    challengePreference: learningSettings.challengePreference,
    learnedTableRange: learningSettings.learnedTableRange,
    lessonSignature,
    contentVersion: 'learning-path-v1',
    usageStage,
    currentDifficultyLevel: learnerProfile?.currentDifficultyLevel ?? profile.skillLevel,
    singleDigitLimit,
  };
  (lesson as any).learnerProfileSnapshot = learnerProfile ? {
    totalCompleted: learnerProfile.totalCompleted,
    recentAccuracy: learnerProfile.recentAccuracy,
    currentDifficultyLevel: learnerProfile.currentDifficultyLevel,
  } : null;

  // ===== DEV DIAGNOSTICS =====
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    try {
      console.log('========== LESSON GENERATION DIAGNOSTICS ==========');
      console.table({
        appVersion: APP_VERSION,
        grade: `G${grade}`,
        semester,
        semesterProgress,
        textbookEdition: fullState.parentSettings.textbookEdition || 'default',
        usageStage: `${usageStage} (${usageStage === 0 ? 'new' : usageStage === 1 ? 'beginner' : usageStage === 2 ? 'active' : usageStage === 3 ? 'experienced' : 'advanced'})`,
        currentDifficultyLevel: learnerProfile?.currentDifficultyLevel ?? profile.skillLevel,
        totalCompleted: fullState.totalCompleted,
        recentAccuracy: learnerProfile?.recentAccuracy ?? 'N/A',
        hasLearnerProfile: !!learnerProfile,
        hasSlotPlan: !!slotPlan,
        totalSteps: steps.length,
        fallbackUsed: false,
        reusedOldLesson: false,
      });
      console.table(
        steps.map((step, idx) => {
          const q = getQuestionById(step.questionId);
          const slotInfo = slotPlan?.[idx];
          return {
            slot: idx + 1,
            stepType: step.type,
            questionId: step.questionId,
            text: q?.text?.substring(0, 50) || '???',
            difficulty: q?.difficulty ?? '?',
            assessmentTier: q?.assessmentTier || slotInfo?.assessmentTier || '-',
            skillIds: q?.skillIds?.join(', ') || 'none',
            isReview: q?.isReview ? 'YES' : 'no',
            isStretch: q?.isStretch ? 'YES' : 'no',
            operation: q?.operation || '?',
          };
        })
      );
    } catch { /* diagnostic error, ignore */ }
  }

  // v2.10.0 Sub-project C: Expose generation diagnostic on window
  if (typeof window !== 'undefined') {
    try {
      (window as any).__MD_DEBUG__ = (window as any).__MD_DEBUG__ || {};
      (window as any).__MD_DEBUG__.lastLessonGenerationReport = {
        appVersion: APP_VERSION,
        plannerVersion: 5,
        reusedOldLesson: false,
        grade,
        semester,
        semesterProgress,
        usageStage,
        learnerDifficulty: learnerProfile?.currentDifficultyLevel ?? profile.skillLevel,
        sourceQuestionCount: allQuestions.length,
        annotatedQuestionCount: allQuestions.filter(q => q.skillIds && q.skillIds.length > 0).length,
        totalSlots: stepTypes.length,
        slotPlan: slotPlan?.map((s, i) => ({
          slot: i + 1,
          category: s.category,
          targetDifficulty: s.targetDifficulty,
          assessmentTier: s.assessmentTier,
          skillFilter: s.skillFilter,
        })),
        fallbackUsed: false,
        fallbackReason: null,
        selectionDiagnostic,
        selectedQuestions: steps.map((step, i) => {
          const q = getQuestionById(step.questionId);
          const diag = selectionDiagnostic[i];
          return {
            id: step.questionId,
            text: q?.text?.substring(0, 60) || '???',
            difficulty: q?.difficulty,
            assessmentTier: (q as any)?.assessmentTier,
            curriculumSkills: q?.skillIds?.join(', '),
            difficultyProfile: (q as any)?.difficultyProfile,
            sourcePool: diag?.sourcePoolSize ? `annotated_pool_${profile.gradeBand}` : 'unknown',
            selectionReason: diag?.finalReason || diag?.selectedQuestion?.selectionReason || 'unknown',
            stepType: step.type,
          };
        }),
      };
    } catch { /* ignore */ }
  }

  return lesson;
  };
  return uncovered;
}

// ========== v2.6.9: 安全降级课程生成器 ==========

/**
 * 当 repair 找不到合法题时，生成一个保证可玩的安全课程。
 *
 * 安全规则：
 * - 只使用 basic_arithmetic 题型
 * - find_action_words 只用明确加减动作词（addition_change / subtraction_change）
 * - 禁止：倍 / 年龄 / 比例 / 逻辑 / 图形 / 植树 / 至少 / 保证
 */
export function generateSafeFallbackLesson(gradeBand: GradeBand): TodayLesson {
  const today = getDateStr();
  const pool = questionsByGrade[gradeBand] || safeQuestions;

  // 筛选安全题目：必须包含加减动作词，且不包含任何禁止词
  const SAFE_FORBIDDEN = new Set([
    ...FORBIDDEN_IN_ACTION_WORDS,
    '倍', '岁', '年龄', '再过', '年龄是',
  ]);

  const safePool = pool.filter(q => {
    // v2.7.1: 基础安全检查
    if (!isQuestionSafeForLesson(q).safe) return false;
    // 只接受 basic_arithmetic
    if (q.problemType && q.problemType !== 'basic_arithmetic' && q.problemType !== 'pattern' && q.problemType !== 'sequence_arithmetic') return false;
    // 禁止词检查
    const hasForbiddenKw = q.keywords.some(k => SAFE_FORBIDDEN.has(k.word));
    if (hasForbiddenKw) return false;
    // 文本检查
    if (q.text.includes('倍') || q.text.includes('岁') || q.text.includes('年龄')
      || q.text.includes('至少') || q.text.includes('保证')) return false;
    // 必须有关键词
    if (q.keywords.length === 0) return false;
    // 关键词必须是加减动作词
    return q.keywords.every(k => {
      const cls = classifyKeyword(k.word);
      if (!cls) return true;
      return cls.category === 'addition_change' || cls.category === 'subtraction_change';
    });
  });

  // 至少需要 4 道题才能组成安全课程
  if (safePool.length < 4) {
    // 极度降级：从全题库选任何有数字的非倍题
    const emergencyPool = pool.filter(q => {
      if (q.text.includes('倍') || q.text.includes('岁') || q.text.includes('年龄')) return false;
      if (q.problemType === 'age_problem' || q.problemType === 'ratio_distribution') return false;
      return q.numbers.length >= 2 && q.keywords.length > 0;
    });
    return buildSafeLessonFromPool(emergencyPool, today, gradeBand);
  }

  return buildSafeLessonFromPool(safePool, today, gradeBand);
}

function buildSafeLessonFromPool(pool: Question[], today: string, gradeBand: GradeBand): TodayLesson {
  // Shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const usedIds = new Set<string>();
  const stepTypes = getStepTypesForGrade(gradeBand);
  const steps: LessonStep[] = [];

  for (let i = 0; i < Math.min(stepTypes.length, shuffled.length, 6); i++) {
    const q = shuffled[i];
    if (usedIds.has(q.id)) continue;
    usedIds.add(q.id);

    const st = stepTypes[i] || 'answer_only';  // v2.11.0
    // 如果是 find_action_words 但题不合适，降为 full_solve
    const actualType: LessonStepType =
      validateStepQuestionCompatibility({ type: st, questionId: q.id } as LessonStep, q)
        ? 'full_solve'
        : st;

    const phases = [...getDefaultPhasesForStepType(actualType, q)];
    steps.push({
      id: `${today}_safe_${i}_${q.id}`,
      type: actualType,
      title: getDynamicStepTitle(actualType, q),
      description: getDynamicStepDescription(actualType, q),
      questionId: q.id,
      phases,
      currentPhaseIndex: 0,
      status: i === 0 ? 'current' : 'locked',
      requiresAnswer: true,
    });
  }

  const lesson: TodayLesson = {
    date: today,
    steps,
    currentStepIndex: 0,
    completed: false,
  };

  // v2.9.1: Version stamp even for fallback
  (lesson as any).generatedByVersion = APP_VERSION;
  (lesson as any).generatorVersion = 5;
  (lesson as any).fallbackUsed = true;
  (lesson as any).fallbackReason = 'safe_fallback_no_candidates';

  return lesson;
}

function isSafeForActionWords(q: Question): boolean {
  if (q.keywords.length === 0) return false;
  if (q.keywords.some(k => FORBIDDEN_IN_ACTION_WORDS.has(k.word))) return false;
  if (q.text.includes('倍') || q.text.includes('岁') || q.text.includes('年龄')) return false;
  return q.keywords.every(k => {
    const cls = classifyKeyword(k.word);
    if (!cls) return true;
    return cls.category === 'addition_change' || cls.category === 'subtraction_change';
  });
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
  // Sub-project A: Only answer and build_equation require input
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

export function saveTodayLesson(lesson: TodayLesson): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const state = loadState();
    const revision = Math.max(state.lessonPersistenceRevision || 0, lesson.persistenceRevision || 0) + 1;
    const persisted = { ...lesson, persistenceRevision: revision };
    const nextState = { ...state, lastCommittedLesson: persisted, lessonPersistenceRevision: revision };
    if (!saveState(nextState)) return false;
    localStorage.setItem('math-detective-today-lesson', JSON.stringify(persisted));
    return true;
  } catch { return false; }
}

/** Read a persisted course for reporting without generating a new lesson. */
export function getStoredTodayLesson(): TodayLesson | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('math-detective-today-lesson');
    const fromKey = saved ? normalizeLesson(JSON.parse(saved) as TodayLesson) : null;
    const snapshot = loadState().lastCommittedLesson || null;
    const newer = snapshot && (snapshot.persistenceRevision || 0) > (fromKey?.persistenceRevision || 0)
      ? normalizeLesson(snapshot)
      : null;
    return newer || fromKey;
  } catch {
    return null;
  }
}

export function clearTodayLesson(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('math-detective-today-lesson');
    const state = loadState();
    saveState({ ...state, lastCommittedLesson: undefined, lessonPersistenceRevision: (state.lessonPersistenceRevision || 0) + 1 });
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
  const stepOrder: LessonStepType[] = ['find_numbers', 'find_action_words', 'simulation', 'remove_noise', 'answer_only', 'find_compare_numbers', 'spot_extra_info', 'spot_missing_info'];
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

// ========== v2.6.8: 从题目重建完整 step metadata ==========

/**
 * 根据题目和关卡类型，统一生成 step 所有 metadata。
 * 确保 title、description、phases 100% 由当前 question + stepType 决定。
 *
 * 必须在 replace question 时调用，不能只替换 questionId。
 */
export function buildStepFromQuestion(params: {
  question: Question;
  stepType: LessonStepType;
  gradeBand: GradeBand;
  excludeQuestionIds?: string[];
}): Omit<LessonStep, 'status' | 'currentPhaseIndex'> {
  const { question, stepType } = params;
  const today = getDateStr();
  const phases = getDefaultPhasesForStepType(stepType, question);

  return {
    id: `${today}_${stepType}_${Date.now()}_${question.id}`,
    type: stepType,
    title: getDynamicStepTitle(stepType, question),
    description: getDynamicStepDescription(stepType, question),
    questionId: question.id,
    phases: [...phases],
    requiresAnswer: true,
  };
}

// ========== v2.6.8: 题目-关卡类型兼容性校验 ==========

/**
 * 检查题目是否与关卡类型兼容。
 * 用于运行时防御，在渲染前调用。
 * 返回 null 表示兼容，返回 string 表示不兼容原因。
 */
export function validateStepQuestionCompatibility(
  step: LessonStep,
  question: Question
): string | null {
  const st = step.type;

  // 1. find_action_words: 必须全是加减动作词
  if (st === 'find_action_words') {
    const hasForbidden = question.keywords.some(k => FORBIDDEN_IN_ACTION_WORDS.has(k.word));
    if (hasForbidden) {
      const forbidden = question.keywords.filter(k => FORBIDDEN_IN_ACTION_WORDS.has(k.word));
      return `关键词"${forbidden.map(k => k.word).join('、')}"不适合动作线索关卡`;
    }
    if (question.keywords.length === 0) {
      return '没有关键词，不适合动作线索关卡';
    }
    const nonAction = question.keywords.filter(k => {
      const cls = classifyKeyword(k.word);
      return cls && cls.category !== 'addition_change' && cls.category !== 'subtraction_change';
    });
    if (nonAction.length > 0) {
      return `关键词"${nonAction.map(k => k.word).join('、')}"不是加减动作词`;
    }
  }

  // 2. find_numbers: 必须有数字
  if (st === 'find_numbers') {
    if (question.numbers.length === 0) {
      return '没有数字，不适合数字线索关卡';
    }
    const lt = inferLessonType(question);
    if (lt === 'logic_reasoning' || lt === 'guarantee_worst_case') {
      return `题目类型"${lt}"不适合数字线索关卡`;
    }
  }

  // 3. age_problem 不能进 find_action_words
  if (st === 'find_action_words' && question.problemType === 'age_problem') {
    return '年龄倍数题不适合动作线索关卡';
  }

  // 4. spot_extra_info: MUST have extraNumbers (NOT noisePhrases)
  if (st === 'spot_extra_info') {
    if (!Array.isArray(question.extraNumbers) || question.extraNumbers.length === 0) {
      return 'spot_extra_info requires extraNumbers non-empty (noisePhrases do NOT count)';
    }
  }

  // 4b. remove_noise: MUST have noisePhrases
  if (st === 'remove_noise') {
    if (!Array.isArray(question.noisePhrases) || question.noisePhrases.length === 0) {
      return 'remove_noise requires noisePhrases non-empty';
    }
  }

  // 5.// 5. simulation: 必须有 visualKey
  if (st === 'simulation') {
    if (!question.visualKey) {
      return '没有可视化素材，不适合演示关卡';
    }
  }

  return null; // 兼容
}

// ========== v2.6.8: 主题-题目匹配校验 ==========

/**
 * 检查 theme story 是否与题目类型匹配。
 * 返回 null 表示匹配，返回 string 表示不匹配原因。
 */
export function validateThemeQuestionMatch(
  themeId: string | undefined,
  question: Question
): string | null {
  if (!themeId) return null;

  // candy_inventory / shop_stock 主题只能匹配商店/库存/买卖场景
  const isShopTheme = /candy|shop|stock|inventory|store|buy|sell/i.test(themeId);

  if (isShopTheme) {
    const isAge = question.problemType === 'age_problem' ||
      question.text.includes('岁') ||
      question.text.includes('年龄');
    const isRatio = question.problemType === 'ratio_distribution' ||
      question.keywords.some(k => classifyKeyword(k.word)?.category === 'multiplicative_comparison') &&
      question.keywords.some(k => k.word === '倍');
    const isLogic = question.problemType === 'logic_ranking' ||
      question.problemType === 'logic_truth' ||
      question.problemType === 'logic_ordering';

    if (isAge) {
      return `糖果库存主题不匹配年龄题（题目含"岁/年龄"）。建议切换为通用或家庭主题。`;
    }
    if (isRatio) {
      return `糖果库存主题不匹配倍数比较题（题目含"倍"）。建议切换为通用主题。`;
    }
    if (isLogic) {
      return `糖果库存主题不匹配逻辑推理题。建议切换为通用主题。`;
    }
  }

  return null; // 匹配
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
