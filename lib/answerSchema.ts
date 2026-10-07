/**
 * v2.11.0: Answer Schema Generator
 *
 * Infers answerSchema from question data fields.
 * The schema controls what input component renders and how answers are validated.
 *
 * stepType controls learning flow → answerSchema controls answer UI.
 * These two concerns MUST NOT be conflated.
 */

import type { Question, AnswerSchema, AnswerField, AnswerOption } from './types';

/**
 * Infer the AnswerSchema from a Question's data.
 * Priority: explicit answerSchema > answerType > data heuristics
 */
export function inferAnswerSchema(q: Question): AnswerSchema {
  // 1. Explicit answerSchema already set
  if (q.answerSchema) return q.answerSchema;

  // Percentage-valued legacy answers sometimes carry answerType:number. The
  // explicit percent suffix in the stored answer is authoritative.
  if (typeof q.answer === 'string' && /^\d+(?:\.\d+)?%$/.test(q.answer.trim())) {
    return { kind: 'percent' };
  }

  // 2. Explicit answerType-based routing
  const at = q.answerType;
  if (at === 'not_enough_information') {
    return { kind: 'not_enough_information' };
  }
  if (at === 'ranking' || q.correctRanking || q.rankingOptions?.length) {
    const itemIds = q.rankingOptions?.map(o => o.id) || [];
    return { kind: 'ordering', itemIds };
  }
  if (at === 'choice') {
    const options: AnswerOption[] = q.questionMeaningOptions?.map((opt, i) => ({
      id: String(i),
      label: opt,
      value: opt,
    })) || [];
    return { kind: 'choice', options, multiple: false };
  }
  if (at === 'expression') {
    return { kind: 'expression' };
  }
  if (at === 'text') {
    const inferred = inferSchemaFromAnswerText(String(q.answer), q);
    // A legacy text checker expects an exact text answer even when the string
    // happens to contain currency units (for example, an amount plus a verdict).
    return inferred.kind === 'money'
      ? { kind: 'text', acceptedAnswers: [String(q.answer).trim()] }
      : inferred;
  }
  if (at === 'multi_answer' || q.subAnswers?.length) {
    const fields: AnswerField[] = (q.subAnswers || []).map(s => ({
      id: s.id,
      label: s.label,
      kind: inferFieldKind(s.answer, s.unit),
      min: undefined,
      max: undefined,
    }));
    return { kind: 'multi_field', fields };
  }

  // Numeric answers stay numeric even when the story domain is money. The
  // surrounding unit is already present in the question, and the checker for
  // answerType:number expects a plain number (e.g. 7 yuan is entered as 7).
  if (typeof q.answer === 'number') {
    if (Number.isInteger(q.answer)) {
      return { kind: 'integer', allowNegative: q.answer < 0 };
    }
    return { kind: 'decimal', decimalPlaces: countDecimalPlaces(q.answer) };
  }

  // The requested unit determines the answer's meaning. A money-domain
  // question can ask for a count of coins (e.g. 1元换几个1角), which is an
  // integer answer rather than a yuan/jiao amount.
  const targetUnit = q.reasoningFrame?.targetQuestion?.targetUnit?.trim();
  if (targetUnit && !['元', '角', '分', '元角', '元/角'].includes(targetUnit)) {
    if (typeof q.answer === 'number' && Number.isInteger(q.answer)) {
      return { kind: 'integer', allowNegative: q.answer < 0 };
    }
    if (typeof q.answer === 'number') {
      return { kind: 'decimal', decimalPlaces: countDecimalPlaces(q.answer) };
    }
  }

  // 3. Domain-based inference
  if (q.domain === 'money') {
    if (typeof q.answer === 'string' && !/^\d+(?:元\d+角|角|元)$/.test(q.answer.trim())) {
      return inferSchemaFromAnswerText(q.answer, q);
    }
    return inferMoneySchema(q);
  }

  // 4. Text-based inference from answer value
  const answer = q.answer;
  if (typeof answer === 'string') {
    return inferSchemaFromAnswerText(answer, q);
  }

  // 5. Comparison symbol detection
  if (q.operation === 'comparison') {
    return { kind: 'comparison_symbol', options: ['>', '<', '='] };
  }

  // 7. Default: integer (should rarely be reached; questions should be annotated)
  console.warn('[AnswerSchema] No schema resolvable for question', q.id, '- defaulting to integer');
  return { kind: 'integer' };
}

/**
 * Infer money answer schema.
 * Money answers in G1-G2 should use yuan_jiao mode for grade-appropriate input.
 */
function inferMoneySchema(q: Question): AnswerSchema {
  const answer = String(q.answer);
  const hasYuanJiao = /元.*角|角.*元/.test(answer) || /元/.test(q.text) && /角/.test(answer);

  if (hasYuanJiao) {
    return {
      kind: 'money',
      currency: 'CNY',
      inputMode: 'yuan_jiao',
      allowEquivalentFormats: true,
    };
  }

  // If answer is a decimal number (e.g. "1.5"), use decimal_yuan
  if (/^\d+\.\d+$/.test(answer)) {
    return {
      kind: 'money',
      currency: 'CNY',
      inputMode: 'decimal_yuan',
      allowEquivalentFormats: true,
    };
  }

  // Integer jiao-only answers
  return {
    kind: 'money',
    currency: 'CNY',
    inputMode: 'yuan_jiao',
    allowEquivalentFormats: true,
  };
}

/**
 * Infer schema from a text answer value.
 */
function inferSchemaFromAnswerText(answer: string, q: Question): AnswerSchema {
  // Money text answer: "1元5角", "5角", "13角，够1元"
  if (/^\d+元\d+角$/.test(answer.trim()) || /^\d+角$/.test(answer.trim())) {
    return inferMoneySchema(q);
  }

  // Multi-value separated answers: "60和58", "13角，够1元"
  const separated = answer.split(/[,，;；和\s]+/).filter(Boolean);
  if (separated.length >= 2 && q.subAnswers?.length) {
    const fields: AnswerField[] = q.subAnswers.map(s => ({
      id: s.id,
      label: s.label,
      kind: inferFieldKind(s.answer, s.unit),
      min: undefined,
      max: undefined,
    }));
    return { kind: 'multi_field', fields };
  }

  // Comparison symbols in answer
  if (/^[><=]$/.test(answer.trim())) {
    return { kind: 'comparison_symbol', options: ['>', '<', '='] };
  }

  // Default to text input
  return {
    kind: 'text',
    acceptedAnswers: [answer.trim()],
  };
}

function inferFieldKind(value: number | string, unit?: string): 'integer' | 'decimal' | 'fraction' | 'ratio' | 'percent' | 'text' {
  if (unit === '%' || unit === '％') return 'percent';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'decimal';
  }
  if (/^\d+$/.test(String(value))) return 'integer';
  if (/^\d+\.\d+$/.test(String(value))) return 'decimal';
  if (/^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(String(value))) return 'fraction';
  if (/^\d+(?:\.\d+)?%$/.test(String(value))) return 'percent';
  if (/^\d+(?::\d+)+$/.test(String(value))) return 'ratio';
  return 'text';
}

function countDecimalPlaces(n: number): number {
  const parts = String(n).split('.');
  return parts[1]?.length || 0;
}

/** Converts the UI's raw percent amount into the canonical checker value. */
export function serializePercentAnswer(raw: string): string {
  const value = raw.trim().endsWith('%') ? raw.trim().slice(0, -1).trim() : raw.trim();
  if (!value) return '';
  return isValidPercentEntry(value) ? `${value}%` : value;
}

export function isValidPercentEntry(raw: string): boolean {
  const value = raw.trim().endsWith('%') ? raw.trim().slice(0, -1).trim() : raw.trim();
  return value === '' || /^\d+(?:\.\d*)?$/.test(value);
}

/** Hide the canonical suffix in a control which renders its own visible `%`. */
export function displayPercentInputValue(serialized: string): string {
  return serialized.endsWith('%') ? serialized.slice(0, -1) : serialized;
}

/**
 * Validate that an answerSchema is internally consistent with the question.
 * Returns list of issues, empty if valid.
 */
export function validateAnswerSchema(q: Question): string[] {
  const issues: string[] = [];
  const schema = q.answerSchema;
  if (!schema) {
    issues.push(`[${q.id}] Missing answerSchema`);
    return issues;
  }

  const answer = q.answer;

  switch (schema.kind) {
    case 'fraction':
    case 'ratio':
    case 'percent':
      break;
    case 'integer': {
      if (typeof answer === 'number' && !Number.isInteger(answer)) {
        issues.push(`[${q.id}] answerSchema integer but answer is ${answer} (decimal)`);
      }
      if (schema.min !== undefined && schema.max !== undefined) {
        const num = typeof answer === 'number' ? answer : parseFloat(String(answer));
        if (num < schema.min || num > schema.max) {
          issues.push(`[${q.id}] answer ${num} outside integer range [${schema.min}, ${schema.max}]`);
        }
      }
      break;
    }
    case 'money': {
      // Money answer should be parseable
      if (typeof answer === 'string' && !/[\d元角分]/.test(answer)) {
        issues.push(`[${q.id}] money schema but answer "${answer}" has no currency units`);
      }
      break;
    }
    case 'choice': {
      const correctStr = String(answer);
      const hasCorrect = schema.options.some(o => String(o.value) === correctStr || o.id === correctStr);
      if (!hasCorrect) {
        issues.push(`[${q.id}] choice schema options don't contain correct answer "${correctStr}"`);
      }
      break;
    }
    case 'multi_field': {
      if (!q.subAnswers || q.subAnswers.length === 0) {
        issues.push(`[${q.id}] multi_field schema but no subAnswers defined`);
      } else if (schema.fields.length !== q.subAnswers.length) {
        issues.push(`[${q.id}] multi_field has ${schema.fields.length} fields but ${q.subAnswers.length} subAnswers`);
      }
      break;
    }
    case 'comparison_symbol': {
      if (!schema.options.includes(String(answer) as any)) {
        issues.push(`[${q.id}] comparison_symbol options don't include correct answer "${answer}"`);
      }
      break;
    }
    case 'ordering': {
      if (!q.correctRanking && !q.rankingOptions?.length) {
        issues.push(`[${q.id}] ordering schema but no ranking data`);
      }
      break;
    }
    case 'not_enough_information': {
      if (!q.isInsufficient) {
        issues.push(`[${q.id}] not_enough_information schema but isInsufficient not set`);
      }
      break;
    }
    case 'text': {
      const accepted = schema.acceptedAnswers.map(a => a.toLowerCase().replace(/\s+/g, ''));
      const correct = String(answer).toLowerCase().replace(/\s+/g, '');
      if (!accepted.some(a => a === correct)) {
        issues.push(`[${q.id}] text schema acceptedAnswers don't include "${answer}"`);
      }
      break;
    }
  }

  return issues;
}

/**
 * Parse a money answer string into jiao (smallest unit).
 * E.g. "1元5角" → 15 (jiao), "1.5元" → 15 (jiao), "15角" → 15 (jiao)
 */
export function parseMoneyToJiao(input: string): number | null {
  const trimmed = input.trim().replace(/\s+/g, '');

  // "1元5角" format
  const yuanJiaoMatch = trimmed.match(/^(\d+)元(\d+)角$/);
  if (yuanJiaoMatch) {
    return parseInt(yuanJiaoMatch[1]) * 10 + parseInt(yuanJiaoMatch[2]);
  }

  // "5角" format
  const jiaoOnlyMatch = trimmed.match(/^(\d+)角$/);
  if (jiaoOnlyMatch) {
    return parseInt(jiaoOnlyMatch[1]);
  }

  // "1元" format
  const yuanOnlyMatch = trimmed.match(/^(\d+)元$/);
  if (yuanOnlyMatch) {
    return parseInt(yuanOnlyMatch[1]) * 10;
  }

  // Decimal yuan: "1.5", "1.50"
  const decimalMatch = trimmed.match(/^(\d+)\.(\d{1,2})$/);
  if (decimalMatch) {
    const yuan = parseInt(decimalMatch[1]);
    const jiaoPart = decimalMatch[2].padEnd(2, '0');
    return yuan * 10 + parseInt(jiaoPart[0]) + (jiaoPart[1] === '0' ? 0 : 0); // Only jiao precision
  }

  // Pure number — treat as jiao
  const pureNum = parseInt(trimmed);
  if (!isNaN(pureNum)) return pureNum;

  return null;
}

/**
 * Format a jiao value back to "X元X角" display string.
 */
export function formatJiaoToYuanJiao(jiao: number): string {
  if (jiao < 0) return `负${formatJiaoToYuanJiao(-jiao)}`;
  const yuan = Math.floor(jiao / 10);
  const remainingJiao = jiao % 10;
  if (yuan === 0) return `${remainingJiao}角`;
  if (remainingJiao === 0) return `${yuan}元`;
  return `${yuan}元${remainingJiao}角`;
}

/**
 * Check if two money values are equivalent (both in jiao).
 */
export function isMoneyEquivalent(inputJiao: number, correctJiao: number): boolean {
  return inputJiao === correctJiao;
}
