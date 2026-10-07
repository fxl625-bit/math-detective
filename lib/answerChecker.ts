/**
 * 统一答案检查器 (v2.7)
 *
 * 所有答案校验必须通过 checkAnswer() 入口。
 * 各组件不得自己写答案判断逻辑。
 *
 * 支持的 answerType:
 * - number: 数字答案
 * - text: 文本答案
 * - ranking: 排序答案
 * - multi_answer: 多答案
 * - choice: 选择题
 * - expression: 表达式
 * - not_enough_information: 信息不足
 */

import type { Question, AnswerType, SubAnswer, RankingAnswer, RankingOption } from './types';
import { inferAnswerSchema, parseMoneyToJiao, isMoneyEquivalent } from './answerSchema';

// ========== 结果类型 ==========

export interface FieldResult {
  correct: boolean;
  expected: number | string;
  actual: string;
}

export interface AnswerCheckResult {
  correct: boolean;
  partialCorrect?: boolean;
  fieldResults?: Record<string, FieldResult>;
  feedback?: string;
}

// ========== 统一入口 ==========

/**
 * 统一答案检查入口。
 * @param input 用户输入。单答案为 string，多答案为 Record<fieldId, string> 或 JSON 字符串
 * @param question 题目对象
 * @returns AnswerCheckResult
 */
export function checkAnswer(
  input: string | Record<string, string>,
  question: Question
): AnswerCheckResult {
  const answerType = resolveAnswerType(question);

  // 多答案题：解析 JSON 字符串为 Record
  if (answerType === 'multi_answer') {
    let multiInput: Record<string, string>;
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        if (typeof parsed === 'object' && parsed !== null) {
          multiInput = parsed;
        } else {
          // 非对象 JSON，降级处理
          multiInput = { answer: input };
        }
      } catch {
        // 非 JSON，降级处理
        multiInput = { answer: input };
      }
    } else {
      multiInput = input;
    }
    return checkMultiAnswer(multiInput, question);
  }

  switch (answerType) {
    case 'number':
      return checkNumberAnswer(input as string, question);
    case 'text':
      return checkTextAnswer(input as string, question);
    case 'money':
      return checkMoneyAnswer(input as string, question);
    case 'ranking':
      return checkRankingAnswer(input as string, question);
    case 'choice':
      return checkChoiceAnswer(input as string, question);
    case 'expression':
      return checkExpressionAnswer(input as string, question);
    case 'not_enough_information':
      return checkNotEnoughInfo(input as string, question);
    default:
      return checkNumberAnswer(input as string, question);
  }
}

/**
 * 推断 answerType（兼容未标注的旧题）
 */
export function resolveAnswerType(q: Question): AnswerType {
  if (q.answerType) return q.answerType;
  if (q.answerSchema?.kind === 'money') return 'money';
  if (q.correctRanking || q.rankingOptions?.length) return 'ranking';
  if (q.subAnswers?.length) return 'multi_answer';
  if (q.isInsufficient) return 'not_enough_information';
  if (q.problemType?.startsWith('logic')) return 'ranking';
  if (q.domain === 'money') return 'money';
  if (typeof q.answer === 'number') return 'number';
  return 'number';
}

// ========== Number Checker ==========

function checkNumberAnswer(input: string, question: Question): AnswerCheckResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { correct: false, feedback: '请输入答案。' };
  }

  // 全角数字转半角
  const normalized = normalizeDigits(trimmed);
  const correctStr = String(question.answer);
  const schemaKind = question.answerSchema?.kind || inferAnswerSchema(question).kind;

  if (schemaKind === 'ratio') {
    return { correct: compareRatios(normalized, correctStr), feedback: '再检查一下各项的比值～' };
  }
  if (schemaKind === 'percent') {
    const actual = parsePercentOrFraction(normalized);
    const expected = parsePercentOrFraction(correctStr);
    if (actual && expected && equalRational(actual, expected)) return { correct: true };
    return { correct: false, feedback: '再想想哦～' };
  }

  // 精确匹配
  if (normalized === correctStr) {
    return { correct: true };
  }

  // Parse the entire input. Fractions remain exact; malformed numeric prefixes
  // such as "12abc" must never be accepted as 12.
  const inputValue = parseStrictRational(normalized);
  const answerValue = parseStrictRational(correctStr);
  if (inputValue && answerValue && equalRational(inputValue, answerValue)) {
    return { correct: true };
  }

  return {
    correct: false,
    feedback: '再想想哦～',
  };
}

// ========== Text Checker ==========

function checkTextAnswer(input: string, question: Question): AnswerCheckResult {
  const normalized = normalizeText(input);
  const accepted = [String(question.answer), ...(question.answerSchema?.kind === 'text' ? question.answerSchema.acceptedAnswers : [])]
    .map(normalizeText);

  if (accepted.includes(normalized)) {
    return { correct: true };
  }

  // 兼容 "小华-小红-小明" vs "小华、小红、小明"
  const inputParts = splitNames(normalized);
  const correctParts = splitNames(accepted[0] || '');
  if (inputParts.length > 1 && inputParts.length === correctParts.length) {
    const match = inputParts.every((p, i) => p === correctParts[i]);
    if (match) return { correct: true };
  }

  return { correct: false, feedback: '再想想哦～' };
}

// ========== Ranking Checker ==========

function checkRankingAnswer(input: string, question: Question): AnswerCheckResult {
  const ranking = question.correctRanking;
  if (!ranking) {
    return { correct: false, feedback: '题目数据异常。' };
  }

  const expectedOrder = getRankingOrder(ranking);
  const trimmed = input.trim();

  // 方式1: option id
  if (question.rankingOptions && question.rankingOptions.length > 0) {
    const option = question.rankingOptions.find(o => o.id === trimmed);
    if (option) {
      return { correct: option.correct, feedback: option.correct ? undefined : '再想想名次顺序～' };
    }
  }

  // 方式2: 逗号分隔
  if (trimmed.includes(',')) {
    const inputOrder = trimmed.split(/[,，]+/).map(s => s.trim()).filter(Boolean);
    if (isOrderMatch(inputOrder, expectedOrder)) {
      return { correct: true };
    }
  }

  // 方式3: 文本兜底
  const parsed = parseRankingText(trimmed);
  if (parsed && isOrderMatch(parsed, expectedOrder)) {
    return { correct: true };
  }

  return { correct: false, feedback: '再想想名次顺序～' };
}

// ========== Multi-Answer Checker ==========

export function checkMultiAnswer(
  input: Record<string, string>,
  question: Question
): AnswerCheckResult {
  const subAnswers = question.subAnswers;
  if (!subAnswers || subAnswers.length === 0) {
    // 降级：尝试从 answer 字符串解析
    return checkMultiAnswerFallback(input, question);
  }

  const fieldResults: Record<string, FieldResult> = {};
  let allCorrect = true;
  let anyCorrect = false;

  for (const sub of subAnswers) {
    const userVal = (input[sub.id] || '').trim();
    if (!userVal) {
      fieldResults[sub.id] = {
        correct: false,
        expected: sub.answer,
        actual: '',
      };
      allCorrect = false;
      continue;
    }

    const resolvedSchema = question.answerSchema || inferAnswerSchema(question);
    const fieldSchema = resolvedSchema.kind === 'multi_field'
      ? resolvedSchema.fields.find(field => field.id === sub.id)
      : undefined;
    const isCorrect = fieldSchema?.kind === 'text'
      ? normalizeText(userVal) === normalizeText(String(sub.answer))
      : fieldSchema?.kind === 'ratio'
        ? compareRatios(userVal, String(sub.answer))
        : fieldSchema?.kind === 'percent'
          ? Boolean(parsePercentOrFraction(userVal) && parsePercentOrFraction(String(sub.answer))
            && equalRational(parsePercentOrFraction(userVal)!, parsePercentOrFraction(String(sub.answer))!))
          : compareValues(userVal, sub.answer);
    fieldResults[sub.id] = {
      correct: isCorrect,
      expected: sub.answer,
      actual: userVal,
    };
    if (isCorrect) anyCorrect = true;
    else allCorrect = false;
  }

  // 检查是否所有字段都填了
  const allFilled = subAnswers.every(s => (input[s.id] || '').trim());
  if (!allFilled) {
    const missing = subAnswers.filter(s => !(input[s.id] || '').trim()).map(s => s.label);
    return {
      correct: false,
      partialCorrect: anyCorrect,
      fieldResults,
      feedback: `这道题有${subAnswers.length}个问题哦，还要填写：${missing.join('、')}`,
    };
  }

  if (allCorrect) {
    return { correct: true, fieldResults };
  }

  // 部分正确反馈
  const correctLabels = subAnswers.filter(s => fieldResults[s.id]?.correct).map(s => s.label);
  const wrongLabels = subAnswers.filter(s => !fieldResults[s.id]?.correct).map(s => s.label);

  let feedback = '';
  if (correctLabels.length > 0) {
    feedback = `${correctLabels.join('和')}找对了，再想想${wrongLabels.join('和')}。`;
  } else {
    feedback = '再想想哦～';
  }

  return {
    correct: false,
    partialCorrect: anyCorrect,
    fieldResults,
    feedback,
  };
}

/**
 * 降级处理：当题目没有 subAnswers 但可能是多答案题时
 * 尝试从 answer 字符串解析多个值
 */
function checkMultiAnswerFallback(
  input: Record<string, string>,
  question: Question
): AnswerCheckResult {
  const values = Object.values(input).filter(v => v.trim());
  const answerStr = String(question.answer);

  // 尝试按逗号/分号分隔 answer
  const parts = answerStr.split(/[,，;；\s]+/).filter(Boolean);

  if (values.length === 0) {
    return { correct: false, feedback: '请输入答案。' };
  }

  // 逐个比较
  let matchCount = 0;
  for (const val of values) {
    const normalized = normalizeDigits(val.trim());
    if (parts.some(p => compareValues(normalized, p))) {
      matchCount++;
    }
  }

  if (matchCount === parts.length && values.length === parts.length) {
    return { correct: true };
  }

  return {
    correct: false,
    partialCorrect: matchCount > 0,
    feedback: matchCount > 0 ? '有一个对了，再想想另一个。' : '再想想哦～',
  };
}

// ========== Choice Checker ==========

function checkChoiceAnswer(input: string, question: Question): AnswerCheckResult {
  const trimmed = input.trim();
  const correctStr = String(question.answer);

  const schema = question.answerSchema;
  if (schema?.kind === 'choice') {
    const selected = schema.multiple ? trimmed.split(',').map(value => value.trim()).filter(Boolean) : [trimmed];
    const canonical = selected.map(value => String(schema.options.find(option => option.id === value)?.value ?? value));
    const expected = schema.multiple
      ? correctStr.split(/[,，;；]+/).map(value => value.trim()).filter(Boolean)
      : [correctStr];
    if (canonical.length === expected.length
      && canonical.slice().sort().every((value, index) => value === expected.slice().sort()[index])) {
      return { correct: true };
    }
  }

  // 直接匹配
  if (trimmed === correctStr) {
    return { correct: true };
  }

  // 选项 ID 匹配
  if (question.questionMeaningOptions?.length) {
    const idx = question.questionMeaningOptions.indexOf(trimmed);
    if (idx >= 0 && String(idx) === correctStr) {
      return { correct: true };
    }
  }

  return { correct: false, feedback: '再想想哦～' };
}

// ========== Expression Checker ==========

function checkExpressionAnswer(input: string, question: Question): AnswerCheckResult {
  const trimmed = input.trim();
  const correctStr = String(question.answer);

  // 规范化表达式后比较
  const normalizedInput = normalizeExpression(trimmed);
  const normalizedCorrect = normalizeExpression(correctStr);

  if (normalizedInput === normalizedCorrect) {
    return { correct: true };
  }

  // 如果表达式比较失败，尝试计算结果比较
  const inputResult = safeEval(trimmed);
  const correctResult = safeEval(correctStr);
  if (inputResult !== null && correctResult !== null && Math.abs(inputResult - correctResult) < 0.001) {
    return { correct: true };
  }

  return { correct: false, feedback: '算式再检查一下～' };
}

// ========== Not-Enough-Info Checker ==========

function checkNotEnoughInfo(input: string, question: Question): AnswerCheckResult {
  const trimmed = input.trim();
  // "信息不足" / "无法计算" / "not_enough"
  const isInsufficientAnswer =
    trimmed === '信息不足' ||
    trimmed === '无法计算' ||
    trimmed === 'not_enough' ||
    trimmed === '不够';

  if (question.isInsufficient && isInsufficientAnswer) {
    return { correct: true };
  }
  if (!question.isInsufficient && !isInsufficientAnswer) {
    return { correct: true };
  }

  return { correct: false, feedback: '再想想信息够不够～' };
}

// ========== Money Checker (v2.11.0) ==========

function checkMoneyAnswer(input: string, question: Question): AnswerCheckResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { correct: false, feedback: '请输入答案。' };
  }

  const inputJiao = parseMoneyToJiao(trimmed);
  const correctStr = String(question.answer);
  const correctJiao = parseMoneyToJiao(correctStr);

  if (inputJiao === null || correctJiao === null) {
    // Fall back to text comparison
    if (normalizeText(trimmed) === normalizeText(correctStr)) {
      return { correct: true };
    }
    return { correct: false, feedback: '再想想哦～' };
  }

  if (isMoneyEquivalent(inputJiao, correctJiao)) {
    return { correct: true };
  }

  return {
    correct: false,
    feedback: '金额不对哦，再算一算～',
  };
}

// ========== 工具函数 ==========

/** 全角数字转半角 */
function normalizeDigits(s: string): string {
  return s.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

/** 文本规范化：去空格、统一标点 */
function normalizeText(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, '')
    .replace(/，/g, ',')
    .replace(/、/g, ',')
    .replace(/。/g, '')
    .replace(/；/g, ',');
}

/** 分割人名 */
function splitNames(s: string): string[] {
  return s.split(/[,，、\-\s]+/).filter(Boolean);
}

/** 比较两个值（支持数字和字符串） */
function compareValues(input: string, expected: number | string): boolean {
  const normalized = normalizeDigits(input.trim());

  // 精确字符串匹配
  if (normalized === String(expected)) return true;

  const inputRatio = parseStrictRational(normalized);
  const expectedRatio = parseStrictRational(String(expected));
  if (inputRatio && expectedRatio && inputRatio.numerator * expectedRatio.denominator === expectedRatio.numerator * inputRatio.denominator) return true;

  return false;
}

function parseStrictRational(raw: string): { numerator: bigint; denominator: bigint } | null {
  const value = normalizeDigits(raw.trim());
  const fraction = value.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if (fraction) {
    const numerator = BigInt(fraction[1]);
    const denominator = BigInt(fraction[2]);
    if (denominator === BigInt(0)) return null;
    return { numerator, denominator };
  }
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) return null;
  const negative = value.startsWith('-');
  const unsigned = value.replace(/^[+-]/, '');
  const [whole = '0', fractional = ''] = unsigned.split('.');
  // Avoid `**` with BigInt: SWC's production transform can rewrite this as
  // Math.pow(BigInt, BigInt), which throws in browsers.
  let denominator = BigInt(1);
  for (let index = 0; index < fractional.length; index += 1) denominator *= BigInt(10);
  const numerator = BigInt(`${whole || '0'}${fractional}` || '0') * (negative ? BigInt(-1) : BigInt(1));
  return { numerator, denominator };
}

function equalRational(left: { numerator: bigint; denominator: bigint }, right: { numerator: bigint; denominator: bigint }): boolean {
  return left.numerator * right.denominator === right.numerator * left.denominator;
}

function parsePercentOrFraction(raw: string) {
  const value = normalizeDigits(raw.trim());
  if (value.endsWith('%')) {
    const number = parseStrictRational(value.slice(0, -1));
    return number ? { numerator: number.numerator, denominator: number.denominator * BigInt(100) } : null;
  }
  // In a percent schema, an explicit fraction is an unambiguous equivalent
  // (1/4 = 25%). A bare decimal such as 0.25 is not silently reinterpreted.
  if (/^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(value)) return parseStrictRational(value);
  return null;
}

function compareRatios(actual: string, expected: string): boolean {
  const parse = (raw: string) => {
    const parts = normalizeDigits(raw.trim()).split(':');
    if (parts.length < 2) return null;
    const values = parts.map(parseStrictRational);
    return values.some(value => value === null) ? null : values as Array<{ numerator: bigint; denominator: bigint }>;
  };
  const left = parse(actual);
  const right = parse(expected);
  if (!left || !right || left.length !== right.length || left[0].numerator === BigInt(0) || right[0].numerator === BigInt(0)) return false;
  return left.slice(1).every((value, index) => equalRational(
    { numerator: value.numerator * left[0].denominator, denominator: value.denominator * left[0].numerator },
    { numerator: right[index + 1].numerator * right[0].denominator, denominator: right[index + 1].denominator * right[0].numerator },
  ));
}

/** 从 RankingAnswer 提取排序数组 */
function getRankingOrder(r: RankingAnswer): string[] {
  if (r.order?.length) return r.order;
  return [r.first, r.second, r.third, r.fourth, r.fifth].filter(Boolean) as string[];
}

/** 排序匹配 */
function isOrderMatch(input: string[], expected: string[]): boolean {
  if (input.length !== expected.length) return false;
  return input.every((name, i) => name === expected[i]);
}

/** 解析排序文本 */
function parseRankingText(input: string): string[] | null {
  const patterns = [
    /^([^-]+)-([^-]+)-([^-]+)$/,
    /^([^、]+)、([^、]+)、([^、]+)$/,
    /^(\S+)\s+(\S+)\s+(\S+)$/,
    /^第一(\S+)第二(\S+)第三(\S+)$/,
    /^第一名(\S+)第二名(\S+)第三名(\S+)$/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return [match[1].trim(), match[2].trim(), match[3].trim()];
    }
  }
  return null;
}

/** 规范化表达式 */
function normalizeExpression(s: string): string {
  return s
    .replace(/\s+/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/（/g, '(')
    .replace(/）/g, ')');
}

/** 安全计算简单算式 */
function safeEval(expr: string): number | null {
  try {
    // 只允许数字、运算符、括号、空格
    const cleaned = expr.replace(/[^0-9+\-*/().\s]/g, '');
    if (!cleaned) return null;
    // eslint-disable-next-line no-eval
    const result = Function(`"use strict"; return (${cleaned})`)();
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
