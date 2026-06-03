/**
 * 统一课程状态事务系统 (v2.6.4 新增)
 *
 * 核心原则：所有用户动作都必须是一次完整原子事务。
 *
 * 用户点击 → 计算 nextState → 写入 lesson/phaseData/stats
 *          → 推进 currentPhaseIndex 或 currentStepIndex
 *          → 返回完整 nextState → 调用方保存 + setState
 *
 * 不能出现：第一次点击只准备状态，第二次点击才推进。
 */

import type { GameState, TodayLesson, LessonStep, StepPhase, LessonStepType, Question } from './types';
import { normalizeLesson, normalizeStep, advancePhase, completeCurrentStep, saveTodayLesson, getCurrentStep, getCurrentPhase, getDefaultPhasesForStepType } from './lessonPlanner';
import { getQuestionById } from '@/data/questions';

// ========== v2.6.6: Ranking 答案校验 ==========

function isRankingAnswerCorrect(input: string, question: Question): boolean {
  const ranking = question.correctRanking;
  if (!ranking) return false;

  const expectedOrder = ranking.order || [
    ranking.first, ranking.second, ranking.third,
    ranking.fourth, ranking.fifth,
  ].filter(Boolean) as string[];
  const trimmed = input.trim();

  // 方式1: option id
  if (question.rankingOptions && question.rankingOptions.length > 0) {
    const option = question.rankingOptions.find(o => o.id === trimmed);
    if (option) return option.correct;
  }

  // 方式2: order array (逗号分隔)
  if (trimmed.includes(',')) {
    const inputOrder = trimmed.split(/[,，]+/).map(s => s.trim()).filter(Boolean);
    if (inputOrder.length === expectedOrder.length) {
      return inputOrder.every((name, i) => name === expectedOrder[i]);
    }
  }

  // 方式3: 文本兜底
  const patterns = [
    /^([^-]+)-([^-]+)-([^-]+)$/,
    /^([^、]+)、([^、]+)、([^、]+)$/,
    /^(\S+)\s+(\S+)\s+(\S+)$/,
    /^第一(\S+)第二(\S+)第三(\S+)$/,
    /^第一名(\S+)第二名(\S+)第三名(\S+)$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const parsed = [match[1].trim(), match[2].trim(), match[3].trim()];
      if (parsed.length === expectedOrder.length) {
        return parsed.every((name, i) => name === expectedOrder[i]);
      }
    }
  }

  return false;
}

// ========== 类型定义 ==========

export type LessonAction =
  | 'submit_answer'
  | 'complete_phase'
  | 'complete_step'
  | 'repair_current_step'
  | 'continue_after_repair'
  | 'information_check'
  | 'identify_extra_info'
  | 'go_next'
  | 'go_back'
  | 'go_prev_level';

export interface LessonTransactionResult {
  nextState: LearningState;
  nextLesson: TodayLesson;
  changed: boolean;
  advanced: boolean;
  fromStepIndex: number;
  toStepIndex: number;
  fromPhaseIndex: number;
  toPhaseIndex: number;
  fromPhase?: StepPhase;
  toPhase?: StepPhase;
  reason?: string;
}

export interface LearningState {
  lesson: TodayLesson;
  gameState: GameState;
}

export interface LessonActionPayload {
  questionId?: string;
  inputAnswer?: string;
  sourceComponent?: string;
  stepType?: LessonStepType;
  [key: string]: unknown;
}

// ========== 调试信息 ==========

export interface LessonDebugState {
  lastLessonAction: string;
  lastActionSource: string;
  lastActionAt: string;
  lastAdvanced: boolean;
  lastFromPhase: string;
  lastToPhase: string;
  lastReason: string;
  isTransitioning: boolean;
  stateVersion: number;
  appVersion: string;
}

let debugState: LessonDebugState = {
  lastLessonAction: '',
  lastActionSource: '',
  lastActionAt: '',
  lastAdvanced: false,
  lastFromPhase: '',
  lastToPhase: '',
  lastReason: '',
  isTransitioning: false,
  stateVersion: 0,
  appVersion: '2.6.4',
};

export function getDebugState(): LessonDebugState {
  return { ...debugState };
}

// ========== 主函数：统一状态事务 ==========

export function commitLessonTransaction(params: {
  state: LearningState;
  action: LessonAction;
  payload?: LessonActionPayload;
  source: string;
}): LessonTransactionResult {
  const { state, action, payload = {}, source } = params;
  const { lesson, gameState } = state;

  const normalized = normalizeLesson(lesson);
  if (!normalized) {
    return noChange(state, 'invalid lesson', action, source);
  }

  const currentStep = getCurrentStep(normalized);
  if (!currentStep) {
    if (normalized.completed) {
      return noChange(state, 'lesson already completed', action, source);
    }
    return noChange(state, 'no current step', action, source);
  }

  switch (action) {
    case 'submit_answer':
    case 'information_check':
    case 'identify_extra_info':
      // 三者统一走 submit_answer 逻辑：检查正确性 → 正确则推进 phase
      return handleSubmitAnswer(normalized, gameState, currentStep, payload, source);
    case 'complete_step':
      return handleCompleteStep(normalized, gameState, currentStep, payload, source);
    case 'complete_phase':
      return handleCompletePhase(normalized, gameState, currentStep, payload, source);
    case 'continue_after_repair':
      return handleContinueAfterRepair(normalized, gameState, currentStep, payload, source);
    case 'repair_current_step':
      return handleRepairCurrentStep(normalized, gameState, currentStep, payload, source);
    case 'go_next':
      return handleGoNext(normalized, gameState, currentStep, payload, source);
    case 'go_back':
      return handleGoBack(normalized, gameState, currentStep, payload, source);
    case 'go_prev_level':
      return handleGoPrevLevel(normalized, gameState, currentStep, payload, source);
    default:
      return noChange(state, `unknown action: ${action}`, action, source);
  }
}

// ========== 动作处理器 ==========

function handleSubmitAnswer(
  lesson: TodayLesson,
  gameState: GameState,
  currentStep: LessonStep,
  payload: LessonActionPayload,
  source: string
): LessonTransactionResult {
  const questionId = payload.questionId || currentStep.questionId;
  const inputAnswer = payload.inputAnswer || '';
  const question = getQuestionById(questionId);

  if (!question) {
    console.error('[P0] submit_answer: question not found', { questionId, source });
    return noChangeResult(lesson, gameState, 'question not found', source);
  }

  const correctStr = String(question.answer);

  // v2.6.6: ranking 答案类型校验（完整校验函数）
  let isCorrect: boolean;
  if (question.answerType === 'ranking' && question.correctRanking) {
    isCorrect = isRankingAnswerCorrect(inputAnswer, question);
    if (!isCorrect) {
      const expectedOrder = question.correctRanking.order || [
        question.correctRanking.first, question.correctRanking.second,
        question.correctRanking.third, question.correctRanking.fourth,
        question.correctRanking.fifth,
      ].filter(Boolean) as string[];
      // 检查是否是部分答案
      if (expectedOrder.length > 1 && expectedOrder.slice(0, 1).every(n => inputAnswer.trim().includes(n)) && !expectedOrder.slice(1).every(n => inputAnswer.trim().includes(n))) {
        console.log('[Transaction] ranking answer: partial answer (only first place?), not accepted as correct', { input: inputAnswer.slice(0, 80), expected: expectedOrder });
      }
    }
  } else {
    isCorrect =
      inputAnswer.trim() === correctStr ||
      parseFloat(inputAnswer.trim()) === question.answer;
  }

  // v2.6.4: stats 已由 runLessonAction 通过 hook 的 completeQuestion 记录
  // 此处只负责 lesson 状态推进，不重复记录 stats

  if (!isCorrect) {
    // 错误答案：不推进（dead code — runLessonAction 在错误答案时提前 return）
    const result = buildResult(lesson, gameState, lesson, false, source);
    result.reason = 'wrong answer';
    return result;
  }

  // 正确答案：一次事务推进
  // 从当前 phase（应该是 answer 或类似阶段）推进到 explain 或 completed
  const phases = currentStep.phases || getDefaultPhasesForStepType(currentStep.type, question);
  const currentPhaseIdx = currentStep.currentPhaseIndex;
  const currentPhase = phases[currentPhaseIdx];
  const maxIdx = phases.length - 1;

  if (currentPhaseIdx < maxIdx) {
    // 还有后续 phase（如 answer → explain）
    const steps = [...lesson.steps];
    const stepIdx = lesson.currentStepIndex;
    const step = { ...steps[stepIdx], phases, currentPhaseIndex: currentPhaseIdx + 1 };
    steps[stepIdx] = step;

    const nextLesson: TodayLesson = {
      ...lesson,
      steps,
      currentStepIndex: lesson.currentStepIndex,
    };

    const nextPhase = phases[currentPhaseIdx + 1];

    console.log(
      `[Transaction] submit_answer correct: ${currentPhase} → ${nextPhase}, step=${stepIdx}, q=${questionId}`
    );

    return {
      nextState: { lesson: nextLesson, gameState },
      nextLesson: nextLesson,
      changed: true,
      advanced: true,
      fromStepIndex: lesson.currentStepIndex,
      toStepIndex: lesson.currentStepIndex,
      fromPhaseIndex: currentPhaseIdx,
      toPhaseIndex: currentPhaseIdx + 1,
      fromPhase: currentPhase,
      toPhase: nextPhase,
      reason: 'correct answer: phase advanced',
    };
  }

  // 当前是最后 phase → 完成当前 step
  const afterStep = completeCurrentStep(lesson);

  console.log(
    `[Transaction] submit_answer correct: step completed, step=${lesson.currentStepIndex}, q=${questionId}`
  );

  return {
    nextState: { lesson: afterStep, gameState },
    nextLesson: afterStep,
    changed: true,
    advanced: true,
    fromStepIndex: lesson.currentStepIndex,
    toStepIndex: afterStep.currentStepIndex,
    fromPhaseIndex: currentPhaseIdx,
    toPhaseIndex: 0, // 新 step 从 0 开始
    fromPhase: currentPhase,
    toPhase: undefined,
    reason: 'correct answer: step completed',
  };
}

function handleCompleteStep(
  lesson: TodayLesson,
  gameState: GameState,
  currentStep: LessonStep,
  payload: LessonActionPayload,
  source: string
): LessonTransactionResult {
  const question = getQuestionById(currentStep.questionId);

  // v2.6.4: stats 已由 runLessonAction 在 submit_answer 时记录
  // complete_step 仅推进 lesson 状态，不重复记录
  const afterStep = completeCurrentStep(lesson);

  return {
    nextState: { lesson: afterStep, gameState },
    nextLesson: afterStep,
    changed: true,
    advanced: true,
    fromStepIndex: lesson.currentStepIndex,
    toStepIndex: afterStep.currentStepIndex,
    fromPhaseIndex: currentStep.currentPhaseIndex,
    toPhaseIndex: 0,
    fromPhase: currentStep.phases?.[currentStep.currentPhaseIndex],
    toPhase: undefined,
    reason: 'step completed',
  };
}

function handleCompletePhase(
  lesson: TodayLesson,
  gameState: GameState,
  currentStep: LessonStep,
  payload: LessonActionPayload,
  source: string
): LessonTransactionResult {
  const afterAdvance = advancePhase(lesson);

  const advanced =
    afterAdvance.currentStepIndex !== lesson.currentStepIndex ||
    afterAdvance.completed !== lesson.completed ||
    JSON.stringify(afterAdvance.steps) !== JSON.stringify(lesson.steps);

  const nextStep = getCurrentStep(afterAdvance);
  const nextPhaseIdx = nextStep?.currentPhaseIndex ?? 0;

  return {
    nextState: { lesson: afterAdvance, gameState },
    nextLesson: afterAdvance,
    changed: true,
    advanced,
    fromStepIndex: lesson.currentStepIndex,
    toStepIndex: afterAdvance.currentStepIndex,
    fromPhaseIndex: currentStep.currentPhaseIndex,
    toPhaseIndex: nextPhaseIdx,
    fromPhase: currentStep.phases?.[currentStep.currentPhaseIndex],
    toPhase: nextStep?.phases?.[nextPhaseIdx],
    reason: 'phase completed',
  };
}

/**
 * 修复 + 继续：处理非法题目导致的卡住问题。
 * 自动跳过所有无效 phase，直接推进到下一步或可继续 phase。
 */
function handleContinueAfterRepair(
  lesson: TodayLesson,
  gameState: GameState,
  currentStep: LessonStep,
  payload: LessonActionPayload,
  source: string
): LessonTransactionResult {
  const question = getQuestionById(currentStep.questionId);

  // 判断当前 step 是否真的有问题
  const needsSkip =
    !question ||
    (currentStep.type === 'spot_extra_info' &&
      (!question.extraNumbers || question.extraNumbers.length === 0) &&
      (!question.noisePhrases || question.noisePhrases.length === 0)) ||
    (currentStep.type === 'find_numbers' &&
      (question.numbers.length === 0));

  if (!needsSkip) {
    // 题目没问题，只是某个 phase 卡住了，尝试正常推进
    const phases = currentStep.phases || getDefaultPhasesForStepType(currentStep.type, question);
    const currentPhaseIdx = currentStep.currentPhaseIndex;

    // 找到下一个可用的 phase
    let safePhaseIdx = currentPhaseIdx;
    if (currentPhaseIdx >= phases.length) {
      safePhaseIdx = 0;
    }

    // 如果是最后的 phase 或已修复 → 完成 step
    if (safePhaseIdx >= phases.length - 1) {
      const afterStep = completeCurrentStep(lesson);
      console.log('[Repair] No issues found, completing step normally');
      return {
        nextState: { lesson: afterStep, gameState },
        nextLesson: afterStep,
        changed: true,
        advanced: true,
        fromStepIndex: lesson.currentStepIndex,
        toStepIndex: afterStep.currentStepIndex,
        fromPhaseIndex: currentPhaseIdx,
        toPhaseIndex: 0,
        fromPhase: phases[currentPhaseIdx],
        toPhase: undefined,
        reason: 'repair: step completed (no actual issue)',
      };
    }

    // 重置到安全 phase
    const steps = [...lesson.steps];
    const stepIdx = lesson.currentStepIndex;
    steps[stepIdx] = { ...steps[stepIdx], currentPhaseIndex: safePhaseIdx, phases };
    const nextLesson: TodayLesson = {
      ...lesson,
      steps,
      currentStepIndex: lesson.currentStepIndex,
    };

    return {
      nextState: { lesson: nextLesson, gameState },
      nextLesson: nextLesson,
      changed: true,
      advanced: true,
      fromStepIndex: lesson.currentStepIndex,
      toStepIndex: lesson.currentStepIndex,
      fromPhaseIndex: currentPhaseIdx,
      toPhaseIndex: safePhaseIdx,
      fromPhase: phases[currentPhaseIdx],
      toPhase: phases[safePhaseIdx],
      reason: 'repair: phase reset',
    };
  }

  // 题目确实有问题 → 跳过整个 step
  console.warn(`[Repair] Skipping invalid step: type=${currentStep.type}, q=${currentStep.questionId}`);

  // 标记当前 step 为已完成（跳过）
  const afterStep = completeCurrentStep(lesson);

  return {
    nextState: { lesson: afterStep, gameState },
    nextLesson: afterStep,
    changed: true,
    advanced: true,
    fromStepIndex: lesson.currentStepIndex,
    toStepIndex: afterStep.currentStepIndex,
    fromPhaseIndex: currentStep.currentPhaseIndex,
    toPhaseIndex: 0,
    reason: 'repair: invalid step skipped',
  };
}

function handleRepairCurrentStep(
  lesson: TodayLesson,
  gameState: GameState,
  currentStep: LessonStep,
  payload: LessonActionPayload,
  source: string
): LessonTransactionResult {
  // 修复当前 step：正常化 phase
  const question = getQuestionById(currentStep.questionId) || undefined;
  const phases = currentStep.phases || getDefaultPhasesForStepType(currentStep.type, question);
  const safePhaseIdx = Math.min(currentStep.currentPhaseIndex, phases.length - 1);

  const steps = [...lesson.steps];
  const stepIdx = lesson.currentStepIndex;
  steps[stepIdx] = {
    ...steps[stepIdx],
    phases,
    currentPhaseIndex: safePhaseIdx,
  };

  const nextLesson: TodayLesson = {
    ...lesson,
    steps,
    currentStepIndex: lesson.currentStepIndex,
  };

  return {
    nextState: { lesson: nextLesson, gameState },
    nextLesson: nextLesson,
    changed: currentStep.currentPhaseIndex !== safePhaseIdx,
    advanced: false, // 修复不推进
    fromStepIndex: lesson.currentStepIndex,
    toStepIndex: lesson.currentStepIndex,
    fromPhaseIndex: currentStep.currentPhaseIndex,
    toPhaseIndex: safePhaseIdx,
    fromPhase: phases[currentStep.currentPhaseIndex],
    toPhase: phases[safePhaseIdx],
    reason: 'repaired: phase normalized',
  };
}

function handleGoNext(
  lesson: TodayLesson,
  gameState: GameState,
  currentStep: LessonStep,
  payload: LessonActionPayload,
  source: string
): LessonTransactionResult {
  return handleCompletePhase(lesson, gameState, currentStep, payload, source);
}

/**
 * 回退一个 phase（同一 step 内）。如果已在第一个 phase，不操作。
 */
function handleGoBack(
  lesson: TodayLesson,
  gameState: GameState,
  currentStep: LessonStep,
  payload: LessonActionPayload,
  source: string
): LessonTransactionResult {
  const question = getQuestionById(currentStep.questionId) || undefined;
  const phases = currentStep.phases || getDefaultPhasesForStepType(currentStep.type, question);
  const currentPhaseIdx = currentStep.currentPhaseIndex;

  if (currentPhaseIdx <= 0) {
    return noChangeResult(lesson, gameState, 'already at first phase', source);
  }

  const steps = [...lesson.steps];
  const stepIdx = lesson.currentStepIndex;
  steps[stepIdx] = { ...steps[stepIdx], currentPhaseIndex: currentPhaseIdx - 1, phases };

  const nextLesson: TodayLesson = {
    ...lesson,
    steps,
    currentStepIndex: lesson.currentStepIndex,
  };

  const toPhase = phases[currentPhaseIdx - 1];

  console.log(`[Transaction] go_back: ${phases[currentPhaseIdx]} → ${toPhase}, step=${stepIdx}`);

  return {
    nextState: { lesson: nextLesson, gameState },
    nextLesson: nextLesson,
    changed: true,
    advanced: false, // 回退不算推进
    fromStepIndex: lesson.currentStepIndex,
    toStepIndex: lesson.currentStepIndex,
    fromPhaseIndex: currentPhaseIdx,
    toPhaseIndex: currentPhaseIdx - 1,
    fromPhase: phases[currentPhaseIdx],
    toPhase,
    reason: 'go_back: phase reversed',
  };
}

/**
 * 回退到上一关（或首页）。重置当前关状态，上一关设为 current。
 */
function handleGoPrevLevel(
  lesson: TodayLesson,
  gameState: GameState,
  currentStep: LessonStep,
  payload: LessonActionPayload,
  source: string
): LessonTransactionResult {
  if (lesson.currentStepIndex <= 0) {
    return noChangeResult(lesson, gameState, 'already at first level', source);
  }

  const steps = [...lesson.steps];
  const idx = lesson.currentStepIndex;
  // 重置当前关
  steps[idx] = { ...steps[idx], status: 'locked' as const, currentPhaseIndex: 0 };
  // 上一关设为 current
  steps[idx - 1] = { ...steps[idx - 1], status: 'current' as const, currentPhaseIndex: 0 };

  const nextLesson: TodayLesson = {
    ...lesson,
    steps,
    currentStepIndex: idx - 1,
  };

  console.log(`[Transaction] go_prev_level: step ${idx} → ${idx - 1}`);

  return {
    nextState: { lesson: nextLesson, gameState },
    nextLesson: nextLesson,
    changed: true,
    advanced: false,
    fromStepIndex: lesson.currentStepIndex,
    toStepIndex: idx - 1,
    fromPhaseIndex: currentStep.currentPhaseIndex,
    toPhaseIndex: 0,
    fromPhase: currentStep.phases?.[currentStep.currentPhaseIndex],
    toPhase: steps[idx - 1].phases?.[0],
    reason: 'go_prev_level: level reversed',
  };
}

// ========== 工具函数 ==========

function noChange(state: LearningState, reason: string, action: LessonAction, source: string): LessonTransactionResult {
  const lesson = state.lesson;
  const currentStep = getCurrentStep(lesson);
  const currentPhaseIdx = currentStep?.currentPhaseIndex ?? 0;
  const phases = currentStep?.phases ?? [];

  return {
    nextState: state,
    nextLesson: lesson,
    changed: false,
    advanced: false,
    fromStepIndex: lesson.currentStepIndex,
    toStepIndex: lesson.currentStepIndex,
    fromPhaseIndex: currentPhaseIdx,
    toPhaseIndex: currentPhaseIdx,
    fromPhase: phases[currentPhaseIdx],
    toPhase: phases[currentPhaseIdx],
    reason,
  };
}

function noChangeResult(
  lesson: TodayLesson,
  gameState: GameState,
  reason: string,
  source: string
): LessonTransactionResult {
  const currentStep = getCurrentStep(lesson);
  const currentPhaseIdx = currentStep?.currentPhaseIndex ?? 0;
  const phases = currentStep?.phases ?? [];

  return {
    nextState: { lesson, gameState },
    nextLesson: lesson,
    changed: false,
    advanced: false,
    fromStepIndex: lesson.currentStepIndex,
    toStepIndex: lesson.currentStepIndex,
    fromPhaseIndex: currentPhaseIdx,
    toPhaseIndex: currentPhaseIdx,
    fromPhase: phases[currentPhaseIdx],
    toPhase: phases[currentPhaseIdx],
    reason,
  };
}

function buildResult(
  from: TodayLesson,
  fromGame: GameState,
  to: TodayLesson,
  advanced: boolean,
  source: string,
  toGame?: GameState
): LessonTransactionResult {
  const fromStep = getCurrentStep(from);
  const toStep = getCurrentStep(to);
  const fromPhaseIdx = fromStep?.currentPhaseIndex ?? 0;
  const toPhaseIdx = toStep?.currentPhaseIndex ?? 0;
  const fromPhases = fromStep?.phases ?? [];
  const toPhases = toStep?.phases ?? [];

  return {
    nextState: { lesson: to, gameState: toGame || fromGame },
    nextLesson: to,
    changed: from !== to,
    advanced,
    fromStepIndex: from.currentStepIndex,
    toStepIndex: to.currentStepIndex,
    fromPhaseIndex: fromPhaseIdx,
    toPhaseIndex: toPhaseIdx,
    fromPhase: fromPhases[fromPhaseIdx],
    toPhase: toPhases[toPhaseIdx],
    reason: advanced ? 'advanced' : 'same phase',
  };
}

// ========== 辅助函数 ==========

export function actionRequiresAdvance(action: LessonAction): boolean {
  return [
    'submit_answer',
    'complete_phase',
    'complete_step',
    'continue_after_repair',
    'go_next',
  ].includes(action);
}

/**
 * 更新调试状态。
 */
export function updateDebugState(result: LessonTransactionResult, action: LessonAction, source: string) {
  debugState = {
    lastLessonAction: action,
    lastActionSource: source,
    lastActionAt: new Date().toISOString(),
    lastAdvanced: result.advanced,
    lastFromPhase: result.fromPhase || 'none',
    lastToPhase: result.toPhase || 'none',
    lastReason: result.reason || '',
    isTransitioning: false,
    stateVersion: debugState.stateVersion + 1,
    appVersion: '2.6.4',
  };
}

// P0 断言 — 开发期检查

export function assertCorrectAnswerAdvanced(
  result: LessonTransactionResult,
  action: LessonAction,
  source: string
) {
  if (action === 'submit_answer' && !result.advanced && result.changed === false) {
    console.error('[P0] correct answer stayed on same phase', {
      action,
      source,
      fromPhase: result.fromPhase,
      toPhase: result.toPhase,
      reason: result.reason,
    });
  }
}

export function assertRepairContinued(
  result: LessonTransactionResult,
  action: LessonAction,
  source: string
) {
  if (action === 'continue_after_repair' && !result.advanced) {
    console.error('[P0] repair continue did not leave repair view', {
      action,
      source,
      fromPhase: result.fromPhase,
      toPhase: result.toPhase,
      reason: result.reason,
    });
  }
}

export function assertNotDuplicateSubmit(
  result: LessonTransactionResult,
  action: LessonAction,
  source: string
) {
  if (action === 'submit_answer' && result.changed && !result.advanced) {
    console.error('[P0] duplicate submit required to advance', {
      action,
      source,
      fromPhase: result.fromPhase,
      toPhase: result.toPhase,
      reason: result.reason,
    });
  }
}
