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
import { normalizeLesson, normalizeStep, advancePhase, completeCurrentStep, saveTodayLesson, getCurrentStep, getCurrentPhase, getDefaultPhasesForStepType, buildStepFromQuestion, selectQuestionForStep, validateStepQuestionCompatibility, clearTodayLesson, generateSafeFallbackLesson } from './lessonPlanner';
import { getQuestionById } from '@/data/questions';
import { addMistake, checkBadges, checkDailyReset, checkWeeklyCard, completeQuestion, loadState, updateStreak } from './storage';
import { checkAnswer } from './answerChecker';
import { APP_VERSION } from './appVersion';
import { appendUniqueEvent, createEventIdentity } from './learningEvents';
import { decideDifficultyIncrease } from './learningMetrics';
import { grantPerfectLessonPoints } from './familyPoints';

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
  | 'repair_step_question'   // v2.6.8: 真正换题修复
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
  appVersion: APP_VERSION,
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

  let transaction: LessonTransactionResult;
  switch (action) {
    case 'submit_answer':
    case 'information_check':
    case 'identify_extra_info':
      // 三者统一走 submit_answer 逻辑：检查正确性 → 正确则推进 phase
      transaction = handleSubmitAnswer(normalized, gameState, currentStep, payload, source);
      break;
    case 'complete_step':
      transaction = handleCompleteStep(normalized, gameState, currentStep, payload, source);
      break;
    case 'complete_phase':
      transaction = handleCompletePhase(normalized, gameState, currentStep, payload, source);
      break;
    case 'continue_after_repair':
      transaction = handleContinueAfterRepair(normalized, gameState, currentStep, payload, source);
      break;
    case 'repair_current_step':
      transaction = handleRepairCurrentStep(normalized, gameState, currentStep, payload, source);
      break;
    case 'repair_step_question':
      transaction = handleRepairStepQuestion(normalized, gameState, currentStep, payload, source);
      break;
    case 'go_next':
      transaction = handleGoNext(normalized, gameState, currentStep, payload, source);
      break;
    case 'go_back':
      transaction = handleGoBack(normalized, gameState, currentStep, payload, source);
      break;
    case 'go_prev_level':
      transaction = handleGoPrevLevel(normalized, gameState, currentStep, payload, source);
      break;
    default:
      return noChange(state, `unknown action: ${action}`, action, source);
  }

  return finalizeLessonCompletion(transaction, normalized, gameState);
}

function finalizeLessonCompletion(
  transaction: LessonTransactionResult,
  priorLesson: TodayLesson,
  priorState: GameState,
): LessonTransactionResult {
  if (!transaction.changed || priorLesson.completed || !transaction.nextLesson.completed) return transaction;
  const lesson = transaction.nextLesson;
  const state = transaction.nextState.gameState;
  const identity = state.childProfileId && state.deviceId
    ? { childProfileId: state.childProfileId, deviceId: state.deviceId }
    : createEventIdentity();
  const at = new Date().toISOString();
  const actionId = `lesson-completed:${lesson.lessonId || lesson.date}`;
  const lastStep = lesson.steps[lesson.steps.length - 1];
  const completed = appendUniqueEvent(state.learningEvents || [], {
    childProfileId: identity.childProfileId,
    deviceId: identity.deviceId,
    sessionId: `session:${lesson.lessonId || lesson.date}`,
    lessonId: lesson.lessonId || lesson.date,
    questionInstanceId: `lesson:${lesson.lessonId || lesson.date}:completion`,
    questionId: lastStep?.questionId || 'lesson-complete',
    questionVersion: 'unknown',
    skillIds: [],
    grade: lesson.settingSnapshot?.grade || 'unknown',
    semester: lesson.settingSnapshot?.semester || 'unknown',
    unitId: lesson.settingSnapshot?.unitId ?? null,
    role: 'unknown',
    settingSignature: lesson.lessonSignature,
    eventType: 'lesson_completed',
    actionId,
    attemptId: actionId,
    timestamp: at,
    hintLevel: 'none',
    completionMode: 'independent',
    result: 'completed',
  });
  const nextState = completed.accepted
    ? { ...state, childProfileId: identity.childProfileId, deviceId: identity.deviceId, learningEvents: completed.events }
    : state;
  const reward = grantPerfectLessonPoints(nextState, lesson);
  return {
    ...transaction,
    nextState: { ...transaction.nextState, gameState: reward.state },
  };
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

  // v2.7: 使用统一答案检查器
  const answerResult = checkAnswer(inputAnswer, question);
  const isCorrect = answerResult.correct;

  const actionId = String(payload.actionId || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const priorAction = (gameState.learningEvents || []).find(event => event.actionId === actionId && event.eventType === 'attempt_submitted');
  if (priorAction) return noChangeResult(lesson, gameState, 'duplicate action ignored', source);
  const generatedIdentity = createEventIdentity();
  const childProfileId = gameState.childProfileId || generatedIdentity.childProfileId;
  const deviceId = gameState.deviceId || generatedIdentity.deviceId;
  const snapshot = lesson.settingSnapshot || currentStep.settingSnapshot || {};
  const snapshotGrade = snapshot.grade;
  const validGrade = typeof snapshotGrade === 'string' && /^G[1-6]$/.test(snapshotGrade)
    ? snapshotGrade as 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6'
    : 'unknown' as const;
  const resolvedSemester: 'upper' | 'lower' | 'unknown' = snapshot.semester === 'upper' || snapshot.semester === 'lower'
    ? snapshot.semester
    : 'unknown';
  const resolvedRole: NonNullable<import('./types').LearningEvent['role']> = currentStep.role || 'unknown';
  const attemptId = String(payload.attemptId || actionId);
  const eventBase = {
    childProfileId, deviceId,
    sessionId: String(payload.sessionId || `session:${lesson.lessonId || lesson.date}`),
    lessonId: lesson.lessonId || lesson.date,
    questionInstanceId: currentStep.questionInstanceId || `${lesson.lessonId || lesson.date}:${lesson.currentStepIndex}:${questionId}`,
    questionId,
    questionVersion: String((question as any).questionVersion || (question as any).version || 'unknown'),
    skillIds: [...new Set(currentStep.skill
      ? [currentStep.skill]
      : (question.curriculumSkillIds || question.skillIds || []))],
    grade: validGrade,
    semester: resolvedSemester,
    unitId: snapshot.unitId ?? null,
    role: resolvedRole, settingSignature: lesson.lessonSignature,
    actionId, attemptId, timestamp: String(payload.timestamp || new Date().toISOString()),
    hintLevel: (['light', 'medium', 'full'].includes(String(payload.hintLevel)) ? payload.hintLevel : 'none') as 'none' | 'light' | 'medium' | 'full',
    completionMode: payload.hintLevel === 'full'
      || (gameState.learningEvents || []).some(event => event.eventType === 'support_used' && event.questionInstanceId === (currentStep.questionInstanceId || `${lesson.lessonId || lesson.date}:${lesson.currentStepIndex}:${questionId}`))
      ? 'assisted' as const : 'independent' as const,
    firstAttemptKnown: true,
  };
  const submitted = appendUniqueEvent(gameState.learningEvents || [], {
    ...eventBase, eventId: `${actionId}:attempt_submitted`, eventType: 'attempt_submitted',
    result: isCorrect ? 'correct' : 'incorrect',
    durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : undefined,
  });
  if (!submitted.accepted) return noChangeResult(lesson, gameState, submitted.reason, source);
  let nextGameState = checkDailyReset(gameState);
  nextGameState = updateStreak(nextGameState);
  nextGameState = checkWeeklyCard(nextGameState);
  nextGameState = completeQuestion(nextGameState, questionId, isCorrect);
  if (!isCorrect) {
    nextGameState = addMistake(nextGameState, {
      questionId,
      questionText: question.text,
      myAnswer: inputAnswer,
      correctAnswer: question.answer,
      errorType: 'answer_wrong',
      date: new Date().toISOString(),
      retriedCorrect: false,
      instanceId: currentStep.questionInstanceId,
    });
  }
  nextGameState = {
    ...nextGameState,
    stars: 0,
    badges: checkBadges(nextGameState),
    childProfileId, deviceId, learningEvents: submitted.events,
  };
  if (isCorrect) {
    const completed = appendUniqueEvent(nextGameState.learningEvents || [], {
      ...eventBase, eventId: `${actionId}:question_completed`, eventType: 'question_completed', result: 'completed',
    });
    if (completed.accepted) nextGameState = { ...nextGameState, learningEvents: completed.events };
  }
  const progressionSkill = currentStep.skill;
  const progressionGrade = validGrade === 'unknown' ? undefined : validGrade;
  const progressionUnitId = snapshot.unitId ?? null;
  if (progressionSkill && progressionGrade && currentStep.role && progressionUnitId) {
    const progressKey = `${progressionGrade}:${progressionUnitId}:${progressionSkill}`;
    const priorProgress = nextGameState.learningDifficultyProgress?.[progressKey];
    const decision = decideDifficultyIncrease({
      events: nextGameState.learningEvents || [],
      skillId: progressionSkill,
      currentDifficulty: priorProgress?.difficulty || 1,
      consumedWindowIds: priorProgress?.consumedWindowIds,
      consumedEventIds: priorProgress?.consumedEventIds,
      prerequisitesReady: true,
      grade: progressionGrade,
      unitId: progressionUnitId,
    });
    if (decision) {
      nextGameState = {
        ...nextGameState,
        learningDifficultyProgress: {
          ...(nextGameState.learningDifficultyProgress || {}),
          [progressKey]: {
            grade: progressionGrade,
            unitId: progressionUnitId,
            role: currentStep.role,
            skillId: progressionSkill,
            difficulty: decision.to as 1 | 2 | 3 | 4 | 5,
            consumedEventIds: [...new Set([...(priorProgress?.consumedEventIds || []), ...decision.consumedEventIds])],
            consumedWindowIds: [...new Set([...(priorProgress?.consumedWindowIds || []), decision.evidenceWindowId])],
          },
        },
      };
    }
  }

  if (!isCorrect) {
    // 错误答案记录在同一游戏状态快照中，不推进课程。
    const result = buildResult(lesson, gameState, lesson, false, source, nextGameState);
    result.changed = true;
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
    // v2.8.4: 写入幂等 awardedAt，防止重复加分
    const step = {
      ...steps[stepIdx],
      phases,
      currentPhaseIndex: currentPhaseIdx + 1,
      awardedAt: steps[stepIdx].awardedAt || new Date().toISOString(),
    };
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
      nextState: { lesson: nextLesson, gameState: nextGameState },
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
    nextState: { lesson: afterStep, gameState: nextGameState },
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

  // v2.11.0: Answer gate — step must have answer submitted before completing
  if (currentStep.requiresAnswer !== false && !currentStep.awardedAt) {
    console.error('[P0_ANSWER_GATE] handleCompleteStep blocked: no answer awarded', {
      stepId: currentStep.id,
      questionId: currentStep.questionId,
      stepIndex: lesson.currentStepIndex,
      source,
    });
    return noChangeResult(lesson, gameState, 'answer gate blocked: no answer awarded', source);
  }

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

// ========== v2.6.8: 真正的换题修复事务 ==========

/**
 * repair_step_question: 发现当前 step 的题目不兼容时，自动替换为合法题目。
 *
 * 一次事务完成：
 *   选题 → 重建 step metadata → 保存 state → 返回可渲染 step
 *
 * 降级策略：
 *   1. 优先选同类型合法题
 *   2. 如果选不到 → 降级为 full_solve 类型
 *   3. 如果还选不到 → 跳过当前 step
 *   4. 如果全部跳过 → 重建今日任务
 *
 * 修复循环保护：同一个 step 最多 repair 2 次。
 */

// 修复计数器 (session scope)
const repairAttemptsByStepId = new Map<string, number>();
const MAX_REPAIR_ATTEMPTS = 1; // v2.6.9: 一次失败就重建，不循环

// v2.6.9: 修复追踪（调试页用）
interface RepairRecord {
  lastRepairReason: string;
  replacementQuestionId: string;
  timestamp: number;
}
const repairRecordsByStepId = new Map<string, RepairRecord>();

/** v2.6.9: 导出修复次数快照（调试页用） */
export function getRepairAttemptsSnapshot(): Record<string, number> {
  const snapshot: Record<string, number> = {};
  repairAttemptsByStepId.forEach((v, k) => { snapshot[k] = v; });
  return snapshot;
}

/** v2.6.9: 导出修复记录快照（调试页用） */
export function getRepairRecordsSnapshot(): Record<string, { lastRepairReason: string; replacementQuestionId: string; timestamp: number }> {
  const snapshot: Record<string, { lastRepairReason: string; replacementQuestionId: string; timestamp: number }> = {};
  repairRecordsByStepId.forEach((v, k) => { snapshot[k] = { ...v }; });
  return snapshot;
}

function handleRepairStepQuestion(
  lesson: TodayLesson,
  gameState: GameState,
  currentStep: LessonStep,
  payload: LessonActionPayload,
  source: string
): LessonTransactionResult {
  const reason = (payload.reason as string) || 'unknown';
  const stepIdx = lesson.currentStepIndex;
  const oldQuestionId = currentStep.questionId;

  // 修复循环保护
  const attempts = (repairAttemptsByStepId.get(currentStep.id) || 0) + 1;
  repairAttemptsByStepId.set(currentStep.id, attempts);

  if (attempts > MAX_REPAIR_ATTEMPTS) {
    console.error(`[P0] repair loop detected for step ${currentStep.id} (${attempts} attempts), rebuilding safe lesson`);

    // v2.6.9: 不再跳过 step，直接重建安全降级课程
    repairAttemptsByStepId.delete(currentStep.id);
    const gradeBand = (payload.gradeBand as import('./types').GradeBand) || gameState.parentSettings.gradeBand || 'G1';
    const fallback = generateSafeFallbackLesson(gradeBand);

    return {
      nextState: { lesson: fallback, gameState },
      nextLesson: fallback,
      changed: true,
      advanced: true,
      fromStepIndex: lesson.currentStepIndex,
      toStepIndex: 0,
      fromPhaseIndex: currentStep.currentPhaseIndex,
      toPhaseIndex: 0,
      reason: `repair: loop detected (${attempts} attempts), safe fallback lesson generated`,
    };
  }

  // 收集已用题目 ID（排除当前 step 的题目）
  const usedQuestionIds = lesson.steps
    .filter(s => s.questionId && s.questionId !== oldQuestionId)
    .map(s => s.questionId);

  // 构建 learning profile for question selection
  const freshState = loadState();
  const profile = {
    gradeBand: (payload.gradeBand as import('./types').GradeBand) || gameState.parentSettings.gradeBand || freshState.parentSettings.gradeBand || 'G1',
    streakDays: gameState.streak || 0,
    recentAccuracy: 100,
    weakSkills: [] as import('./types').CognitiveSkill[],
    dailyQuestionCount: gameState.completedToday || 0,
    skillLevel: gameState.skillLevel || 1,
  };

  // 尝试选择替换题目
  let newQuestion = selectQuestionForStep({
    stepType: currentStep.type,
    profile,
    usedQuestionIds,
  });

  // 如果选不到同类型，降级用 full_solve
  if (!newQuestion && currentStep.type !== 'full_solve') {
    console.warn(`[Repair] No valid ${currentStep.type} question, falling back to full_solve`);
    newQuestion = selectQuestionForStep({
      stepType: 'full_solve',
      profile,
      usedQuestionIds,
    });
  }

  // 仍然选不到 → v2.6.9: 生成安全降级课程
  if (!newQuestion) {
    console.error(`[P0] repair_step_question: no valid replacement at all for step ${currentStep.id}, generating safe fallback`);

    repairAttemptsByStepId.delete(currentStep.id);
    const gradeBand = (payload.gradeBand as import('./types').GradeBand) || gameState.parentSettings.gradeBand || 'G1';
    const fallback = generateSafeFallbackLesson(gradeBand);

    return {
      nextState: { lesson: fallback, gameState },
      nextLesson: fallback,
      changed: true,
      advanced: true,
      fromStepIndex: lesson.currentStepIndex,
      toStepIndex: 0,
      fromPhaseIndex: currentStep.currentPhaseIndex,
      toPhaseIndex: 0,
      reason: 'repair: no replacement found, safe fallback lesson generated',
    };
  }

  // 验证新题与 step 类型兼容
  const stepTypeToUse = (newQuestion.stepCompatibility?.includes(currentStep.type) || !newQuestion.stepCompatibility)
    ? currentStep.type
    : 'full_solve';

  const compatibilityError = validateStepQuestionCompatibility(
    { ...currentStep, type: stepTypeToUse },
    newQuestion
  );
  if (compatibilityError) {
    // 新题也不兼容 → 再试一次（递归防护）
    const nextPayload = {
      ...payload,
      reason: `${reason} → retry: ${compatibilityError}`,
    };
    return handleRepairStepQuestion(lesson, gameState, currentStep, nextPayload, source);
  }

  // 重建 step metadata
  const stepMeta = buildStepFromQuestion({
    question: newQuestion,
    stepType: stepTypeToUse,
    gradeBand: profile.gradeBand,
    excludeQuestionIds: usedQuestionIds,
  });

  // 替换 step
  const steps = [...lesson.steps];
  steps[stepIdx] = {
    ...stepMeta,
    status: 'current' as const,
    currentPhaseIndex: 0,
  };

  const nextLesson: TodayLesson = {
    ...lesson,
    steps,
    currentStepIndex: stepIdx,
  };

  // 修复成功，清除循环计数
  repairAttemptsByStepId.delete(currentStep.id);

  // v2.6.9: 记录修复追踪
  repairRecordsByStepId.set(currentStep.id, {
    lastRepairReason: reason,
    replacementQuestionId: newQuestion.id,
    timestamp: Date.now(),
  });

  console.log(
    `[Repair] Question replaced: ${oldQuestionId} → ${newQuestion.id} ` +
    `(type=${stepTypeToUse}, reason=${reason}, attempt=${attempts})`
  );

  return {
    nextState: { lesson: nextLesson, gameState },
    nextLesson: nextLesson,
    changed: true,
    advanced: true,
    fromStepIndex: stepIdx,
    toStepIndex: stepIdx,
    fromPhaseIndex: currentStep.currentPhaseIndex,
    toPhaseIndex: 0,
    fromPhase: currentStep.phases?.[currentStep.currentPhaseIndex],
    toPhase: stepMeta.phases[0],
    reason: `repair: question replaced (${oldQuestionId} → ${newQuestion.id}), type=${stepTypeToUse}`,
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
    'repair_step_question',
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
    appVersion: APP_VERSION,
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

// v2.11.2 P0 断言: feedback/explain 阶段必须经过正确答案
export function assertFeedbackWithoutCorrectAnswer(
  result: LessonTransactionResult,
  action: LessonAction,
  source: string
) {
  const nextPhase = result.toPhase;
  const nextStep = result.nextLesson.steps[result.toStepIndex];
  if (nextPhase === 'explain' && !nextStep?.awardedAt) {
    console.error('[P0_FEEDBACK_WITHOUT_CORRECT_ANSWER] explain phase entered without awardedAt', {
      action,
      source,
      stepId: nextStep?.id,
      questionId: nextStep?.questionId,
      fromPhase: result.fromPhase,
      toPhase: result.toPhase,
    });
  }
}

// v2.11.2 P0 断言: 题目推进必须经过 AnswerGate
export function assertQuestionAdvancedWithoutAnswerGate(
  result: LessonTransactionResult,
  action: LessonAction,
  source: string
) {
  if (result.toStepIndex > result.fromStepIndex && result.fromStepIndex >= 0) {
    const fromStep = result.nextLesson.steps[result.fromStepIndex];
    if (fromStep && fromStep.requiresAnswer !== false && !fromStep.awardedAt) {
      console.error('[P0_QUESTION_ADVANCED_WITHOUT_ANSWER_GATE] step advanced without answer', {
        action,
        source,
        fromStepIndex: result.fromStepIndex,
        toStepIndex: result.toStepIndex,
        stepId: fromStep.id,
        questionId: fromStep.questionId,
      });
    }
  }
}
