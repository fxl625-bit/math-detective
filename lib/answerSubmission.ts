/**
 * 统一答题提交系统 (v2.6.3 新增)
 * 
 * 核心规则：
 * 1. 正确答案 → 一次事务内：记录 + advance to explain + 保存 state
 * 2. 错误答案 → 只记录，不 advance
 * 3. 所有答题组件必须调用此函数，不应各自实现提交逻辑
 */

import type { GameState, TodayLesson, Question, LessonStepType, StepPhase } from './types';
import { advancePhase } from './lessonPlanner';
import { completeQuestion } from './storage';

// ========== 参数与结果 ==========

export interface SubmitAnswerParams {
  state: GameState;
  lesson: TodayLesson;
  question: Question;
  stepType: LessonStepType;
  phase: StepPhase;
  inputAnswer: string;
  sourceComponent: string;
}

export interface SubmitAnswerResult {
  state: GameState;
  lesson: TodayLesson;
  correct: boolean;
  advanced: boolean;
  nextPhase: StepPhase | null;
  /** 错误信息（仅开发期） */
  error?: string;
}

// ========== 主函数 ==========

export function submitAnswerAndAdvance(
  params: SubmitAnswerParams
): SubmitAnswerResult {
  const { state, lesson, question, stepType, phase, inputAnswer, sourceComponent } = params;

  // 判断 correctness
  const correctStr = String(question.answer);
  const isCorrect =
    inputAnswer.trim() === correctStr ||
    parseFloat(inputAnswer.trim()) === question.answer;

  // 开发日志
  if (typeof window !== 'undefined' && (window as any).__debugLog) {
    (window as any).__debugLog(
      `[Answer Submit] src=${sourceComponent} q=${question.id} correct=${isCorrect} phase=${phase}`
    );
  }

  // === 错误答案 ===
  if (!isCorrect) {
    // 记录错题（通过 completeQuestion 的 false 参数）
    const updatedState = completeQuestion(state, question.id, false);
    return {
      state: updatedState,
      lesson,
      correct: false,
      advanced: false,
      nextPhase: null,
    };
  }

  // === 正确答案 ===
  // 1. 记录 answerAttempts + correctCount（completeQuestion 内部处理）
  const afterComplete = completeQuestion(state, question.id, true);

  // 2. 推进 phase：从 answer → explain
  const afterAdvance = advancePhase(lesson);

  // 3. 验证推进成功
  if (!afterAdvance) {
    console.error('[P0] Correct answer did not advance — advancePhase returned null', {
      questionId: question.id,
      sourceComponent,
      currentPhase: phase,
    });
    return {
      state: afterComplete,
      lesson,
      correct: true,
      advanced: false,
      nextPhase: null,
      error: 'advancePhase returned null',
    };
  }

  const advanced = afterAdvance.completed ||
    afterAdvance.currentStepIndex !== lesson.currentStepIndex ||
    JSON.stringify(afterAdvance.steps) !== JSON.stringify(lesson.steps);

  if (!advanced) {
    console.error('[P0] Correct answer did not advance — no lesson change detected', {
      questionId: question.id,
      sourceComponent,
      fromStepIndex: lesson.currentStepIndex,
      toStepIndex: afterAdvance.currentStepIndex,
    });
  }

  return {
    state: afterComplete,
    lesson: afterAdvance,
    correct: true,
    advanced,
    nextPhase: null, // 调用方从 lesson 中读取新 phase
  };
}
