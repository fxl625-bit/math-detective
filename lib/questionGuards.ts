/**
 * 多余信息关卡运行时防御 (v2.6.1 新增)
 * 
 * 确保 spot_extra_info / identify_extra_info 关卡永远不会卡住。
 * 即使非法题目漏网进入该关卡，运行时也会自动换题。
 */

import type { Question } from './types';

/**
 * 获取题目的预期多余信息项。
 * 返回可被标记为"多余"的数字或文本片段列表。
 */
export function getExpectedIrrelevantItems(
  question: Question | undefined
): string[] {
  if (!question) return [];

  const items: string[] = [];

  // extraNumbers 中的数字
  if (question.extraNumbers && question.extraNumbers.length > 0) {
    for (const n of question.extraNumbers) {
      items.push(String(n));
    }
  }

  // noisePhrases 中的短语
  if (question.noisePhrases && question.noisePhrases.length > 0) {
    for (const p of question.noisePhrases) {
      items.push(p);
    }
  }

  return items;
}

/**
 * 检查题目是否对 spot_extra_info / identify_extra_info 关卡合法。
 * 
 * 合法条件：
 * 1. extraNumbers.length > 0 或 noisePhrases.length > 0
 * 2. usefulPhrases.length > 0
 * 3. expectedIrrelevantItems.length > 0
 */
export function isValidForExtraInfoStep(
  question: Question | undefined
): boolean {
  if (!question) return false;

  const items = getExpectedIrrelevantItems(question);
  if (items.length === 0) return false;

  // 至少有一些有用信息可以对比
  const usefulCount = (question.usefulPhrases ?? []).length;
  if (usefulCount === 0) return false;

  return true;
}

/**
 * 检查题目是否对 remove_noise 关卡合法。
 */
export function isValidForRemoveNoiseStep(
  question: Question | undefined
): boolean {
  if (!question) return false;

  const noiseCount = (question.noisePhrases ?? []).length;
  if (noiseCount === 0) return false;

  const usefulCount = (question.usefulPhrases ?? []).length;
  if (usefulCount === 0) return false;

  return true;
}

/**
 * P0 防御日志。
 * 当非法题目进入 extra_info / remove_noise 关卡时输出。
 */
export function logInvalidStepAssignment(
  stepType: string,
  questionId: string,
  questionText: string,
  reason: string
) {
  console.error(
    `[P0] ${stepType} received invalid question`,
    {
      questionId,
      text: questionText.slice(0, 80),
      reason,
    }
  );
}
