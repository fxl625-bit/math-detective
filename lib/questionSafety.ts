/**
 * 题目安全检查器 (v2.7.1)
 *
 * 用于 lessonPlanner 选题时过滤不安全题目。
 * 不安全题目包括：泄题、answerType 缺失且无法安全推断、多答案题缺 subAnswers。
 */

import type { Question, AnswerType } from './types';
import { hintRevealsAnswer, textRevealsAnswer } from './hintSafety';

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
  normalizedAnswerType?: AnswerType;
}

/**
 * 检查题目是否安全可用于正式 lesson。
 * 不安全的题会被 selectQuestionForStep 过滤掉。
 */
export function isQuestionSafeForLesson(q: Question): SafetyCheckResult {
  // 1. 泄题检查：hints[0] 和 structuredHints.light 不能泄露答案
  if (q.hints?.length > 0) {
    if (hintRevealsAnswer(q.hints[0], q)) {
      return { safe: false, reason: 'hint_leaks_answer' };
    }
  }
  if (q.structuredHints?.light) {
    if (textRevealsAnswer(q.structuredHints.light, q)) {
      return { safe: false, reason: 'structured_hint_leaks_answer' };
    }
  }

  // 2. answerType 检查
  const resolvedType = resolveAnswerTypeSafe(q);
  if (!resolvedType) {
    return { safe: false, reason: 'answerType_missing_and_unresolvable' };
  }

  // 3. multi_answer 题必须有 subAnswers
  if (resolvedType === 'multi_answer' && (!q.subAnswers || q.subAnswers.length === 0)) {
    return { safe: false, reason: 'multi_answer_without_subAnswers' };
  }

  // 4. ranking 题必须有 correctRanking 或 rankingOptions
  if (resolvedType === 'ranking' && !q.correctRanking && !q.rankingOptions?.length) {
    return { safe: false, reason: 'ranking_without_correctRanking' };
  }

  return { safe: true, normalizedAnswerType: resolvedType };
}

/**
 * 安全推断 answerType（不修改原对象）
 */
export function resolveAnswerTypeSafe(q: Question): AnswerType | null {
  // 显式标注优先
  if (q.answerType) return q.answerType;

  // 从数据推断
  if (q.correctRanking || q.rankingOptions?.length) return 'ranking';
  if (q.problemType?.startsWith('logic') && q.correctRanking) return 'ranking';
  if (q.subAnswers?.length) return 'multi_answer';
  if (q.isInsufficient) return 'not_enough_information';

  // 从题目文本推断多答案
  const text = q.text;
  const questionMarks = (text.match(/？|\?/g) || []).length;
  if (questionMarks >= 2) {
    const answerStr = String(q.answer);
    if (/，|；|和/.test(answerStr) && !/^\d+$/.test(answerStr)) {
      return 'multi_answer';
    }
  }

  // 默认 number
  if (typeof q.answer === 'number') return 'number';
  if (typeof q.answer === 'string' && !isNaN(Number(q.answer))) return 'number';

  // 文本答案
  if (typeof q.answer === 'string' && q.answer.length > 0) return 'text';

  return null;
}

/**
 * 批量检查题目安全性，返回不安全题目列表
 */
export function batchCheckSafety(questions: Question[]): Map<string, SafetyCheckResult> {
  const results = new Map<string, SafetyCheckResult>();
  for (const q of questions) {
    results.set(q.id, isQuestionSafeForLesson(q));
  }
  return results;
}
