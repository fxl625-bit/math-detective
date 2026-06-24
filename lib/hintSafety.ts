/**
 * 提示安全检测工具 (v2.6.7 新增)
 *
 * 检测任意文案是否在答题前泄露最终答案。
 * 用于运行时防御 + validateQuestions 调用。
 */

import type { Question, SolutionStepDetailed } from './types';

/** 终结句模式：这些句子意味着给出了最终答案 */
const FINAL_ANSWER_PATTERNS = [
  /答案是\s*[0-9\u4e00-\u9fa5]/,
  /所以是\s*[0-9]/,
  /一共\s*[0-9]+/,
  /最大角是/,
  /最小角是/,
  /第[0-9一二三四五六七八九十]层是[0-9]/,
  /第[0-9一二三四五六七八九十]层[：:]\s*[0-9]/,
  /最终答案是/,
  /答案为/,
  /得出.*[0-9]+/,
  /正确排序/,
  /完整排序/,
  /第一名.*第.*名/,
  /小[^\s]{1,3}第一/,
  /小[^\s]{1,3}最后/,
  /再过[0-9]+年/,
  /[0-9]+年后/,
  /[0-9]+棵/,
  /共[0-9]+棵/,
  /还要再种[0-9]+/,
  /\([0-9]+。[0-9]+\)/,
];

/** 各题型专项启发式检查 */
function checkByProblemType(text: string, question: Question): boolean {
  const pt = question.problemType;
  const answer = question.answer;

  // pattern: 目标层数值不应出现
  if (pt === 'pattern' || /规律|第.*层/.test(question.text)) {
    if (typeof answer === 'number') {
      const escaped = String(answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const targetPattern = new RegExp(`第[0-9一二三四五六七八九十]+层.*${escaped}|${escaped}.*第[0-9一二三四五六七八九十]+层`);
      if (targetPattern.test(text)) return true;
    }
    // 检查"第N层" + 等号 + 数值
    if (/第[0-9一二三四五六七八九十]+层[：:]\s*[0-9]/.test(text)) return true;
    if (/第[0-9一二三四五六七八九十]+层[是＝=]\s*[0-9]/.test(text)) return true;
  }

  // ratio_distribution: 最终角度/份数
  if (pt === 'ratio_distribution' || question.lessonType === 'geometry_count') {
    if (typeof answer === 'number' && text.includes(String(answer))) {
      if (/最大角|最小角|角[0-9]|一共[0-9]+份/.test(text)) return true;
    }
  }

  // planting_problem: 最终棵数
  if (pt === 'planting_problem' || question.lessonType === 'planting_interval') {
    if (typeof answer === 'number') {
      const numStr = String(answer);
      if (new RegExp(`${numStr}\\s*棵|共\\s*${numStr}|还要.*${numStr}`).test(text)) return true;
    }
  }

  // age_problem: "再过X年"
  if (pt === 'age_problem' || /岁|年龄/.test(question.text)) {
    if (/再过[0-9]+年|[0-9]+年后/.test(text)) return true;
  }

  // shape_counting: 最终数量
  if (pt === 'shape_counting' || question.lessonType === 'geometry_count') {
    if (typeof answer === 'number') {
      const numStr = String(answer);
      if (new RegExp(`共\\s*${numStr}\\s*[个种]|${numStr}\\s*[个种]`).test(text)) return true;
    }
  }

  return false;
}

/**
 * 检测文本是否暴露了题目的最终答案
 */
export function textRevealsAnswer(text: string, question: Question): boolean {
  if (!text || !question) return false;

  const answer = question.answer;
  const answerSentence = question.answerSentence;

  // 1. 直接包含答案值（数字题）
  if (typeof answer === 'number') {
    // 避免误判：如果文本中的数字是线索数字而非答案，需要更精确匹配
    // 只匹配作为"结论"或"结果"出现的数字
    if (/\b(?:是|为|得|＝|=|答案|结果)\s*\d+\b/.test(text)) {
      const match = text.match(/\b(?:是|为|得|＝|=|答案|结果)\s*(\d+)\b/);
      if (match && Number(match[1]) === answer) return true;
    }
  }

  // 2. 包含 answerSentence 的结论部分
  if (answerSentence && answerSentence.length > 4) {
    // 检查是否包含答案句的核心（去掉开头的"答："等）
    const cleanAnswer = answerSentence.replace(/^答[：:]\s*/, '');
    if (cleanAnswer.length > 4 && text.includes(cleanAnswer)) return true;
  }

  // 3. 终结句模式匹配
  for (const pattern of FINAL_ANSWER_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  // 4. ranking 题的完整排序
  if (question.correctRanking) {
    const rankingStr = question.correctRanking.order?.join('');
    if (rankingStr && rankingStr.length > 3) {
      // 检查是否出现连续3个以上的排名顺序
      const orderChars = question.correctRanking.order;
      if (orderChars && orderChars.length >= 3) {
        const joinedOrder = orderChars.join('');
        if (text.includes(joinedOrder)) return true;
        // 也检查反向
        for (let i = 0; i <= orderChars.length - 3; i++) {
          const slice = orderChars.slice(i, i + 3).join('');
          if (text.includes(slice)) return true;
        }
      }
    }
  }

  // 5. 题型专项
  if (checkByProblemType(text, question)) return true;

  return false;
}

/**
 * 检测 solutionStepsDetailed 中是否有步骤泄露答案
 */
export function stepsRevealAnswer(
  steps: SolutionStepDetailed[],
  question: Question,
): { leaksAnswer: boolean; offendingStep?: number } {
  if (!steps || steps.length === 0) return { leaksAnswer: false };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // 显式标记
    if (step.revealsAnswer) {
      return { leaksAnswer: true, offendingStep: i };
    }

    // 检测解释文案
    if (textRevealsAnswer(step.explanation, question)) {
      return { leaksAnswer: true, offendingStep: i };
    }
    if (step.stepTitle && textRevealsAnswer(step.stepTitle, question)) {
      return { leaksAnswer: true, offendingStep: i };
    }
  }

  return { leaksAnswer: false };
}

/**
 * 检测 solutionSteps (string[]) 是否有步骤泄露答案
 */
export function stringStepsRevealAnswer(
  steps: string[],
  question: Question,
): { leaksAnswer: boolean; offendingIndex?: number } {
  if (!steps || steps.length === 0) return { leaksAnswer: false };

  for (let i = 0; i < steps.length; i++) {
    if (textRevealsAnswer(steps[i], question)) {
      return { leaksAnswer: true, offendingIndex: i };
    }
  }

  return { leaksAnswer: false };
}

/**
 * 检测 hint 的 light/medium 级别是否泄露答案
 */
export function hintRevealsAnswer(
  hint: string,
  question: Question,
): boolean {
  if (!hint || hint.length < 3) return false;
  return textRevealsAnswer(hint, question);
}

/**
 * 运行时安全渲染：如果文本在答题前泄露答案，返回 null 或替换文本
 * @returns 安全文本，如果泄露答案且不允许则返回 null
 */
export function renderSafePreAnswerText(
  text: string,
  question: Question,
  allowFullHint: boolean = false,
): string | null {
  if (!text || text.length === 0) return null;

  if (allowFullHint) return text; // 用户主动要求完整提示，放行

  if (textRevealsAnswer(text, question)) {
    console.error('[P0] Pre-answer hint reveals answer', {
      questionId: question.id,
      text: text.slice(0, 80),
      answer: question.answer,
      problemType: question.problemType,
    });
    return null;
  }

  return text;
}
