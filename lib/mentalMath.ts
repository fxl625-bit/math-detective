/**
 * 口算练习器核心逻辑 (v2.12.0 新增)
 *
 * 纯函数模块，不依赖 React / localStorage。
 * 职责：
 *  - 按年级 + 运算类型生成口算题
 *  - 管理一次练习会话（题目序列、答题、计分）
 *  - 聚合每日记录
 *  - 生成家长周报
 */

// ========== 类型 ==========

import { checkAnswer } from './answerChecker';
import { appendUniqueEvent, type EventIdentity } from './learningEvents';
import type { LearningEvent, MistakeRecord, Question } from './types';

export type MentalMathOperation = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';
export type MentalMathMode = 'learning' | 'fluency';

export interface MentalMathQuestion {
  id: string;
  operation: Exclude<MentalMathOperation, 'mixed'>;
  left: number;
  right: number;
  answer: number | string;
  /** 展示文本，如 "8 + 3" */
  text: string;
  method?: string;
  answerKind?: 'number' | 'fraction' | 'percent';
}

export interface MentalMathAnswer {
  questionId: string;
  correct: boolean;
  /** 用户提交的答案 */
  submitted: number | string;
  /** 正确答案 */
  answer: number | string;
  /** 用时（毫秒） */
  timeMs: number;
  /** New records keep first-attempt accuracy separate from eventual correction. */
  finalCorrect?: boolean;
  attempts?: number;
  helpUsed?: boolean;
  /** New sessions retain enough schema to review mistakes after the generator changes. */
  questionSnapshot?: {
    id: string;
    gradeBand?: Exclude<import('./types').GradeBand, 'OlympiadIntro'>;
    text: string;
    answer: number | string;
    answerType: 'number';
    answerSchema?: import('./types').AnswerSchema;
    answerSentence?: string;
    explanation?: string;
  };
}

export interface MentalMathSession {
  id: string;
  date: string; // YYYY-MM-DD
  grade: string; // G1-G6
  operation: MentalMathOperation;
  totalQuestions: number;
  correctCount: number;
  /** 平均每题用时（毫秒） */
  avgTimeMs: number;
  answers: MentalMathAnswer[];
  completedAt: string; // ISO
  mode?: MentalMathMode;
}

/** 每日汇总（用于周报） */
export interface MentalMathDailySummary {
  date: string;
  sessions: number;
  totalQuestions: number;
  correctCount: number;
  accuracy: number; // 0-100
  avgTimeMs: number;
}

/** 周报 */
export interface MentalMathWeeklyReport {
  weekStart: string; // 周一日期 YYYY-MM-DD
  weekEnd: string;   // 周日日期 YYYY-MM-DD
  activeDays: number;
  totalSessions: number;
  totalQuestions: number;
  correctCount: number;
  accuracy: number; // 0-100
  avgTimeMs: number;
  daily: MentalMathDailySummary[];
  /** 各运算类型正确率 */
  byOperation: Record<string, { total: number; correct: number; accuracy: number }>;
}

// ========== 题目生成 ==========

type BasicOperation = Exclude<MentalMathOperation, 'mixed'>;
type GeneratorOptions = { rng?: () => number; learnedTableRange?: number[] | null };
const SYMBOL: Record<BasicOperation, string> = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' };

export function availableMentalMathOperations(grade: string): MentalMathOperation[] {
  if (grade === 'G1') return ['addition', 'subtraction', 'mixed'];
  if (grade === 'G2' || grade === 'G3') return ['multiplication', 'division', 'mixed'];
  return ['addition', 'subtraction', 'multiplication', 'division', 'mixed'];
}

/** Convert first-wrong answers into durable review items without removing them after a retry. */
export function buildMentalMathMistakes(session: MentalMathSession): MistakeRecord[] {
  return session.answers.filter(answer => answer.correct === false).map(answer => {
    const snapshot = answer.questionSnapshot;
    return {
      questionId: answer.questionId,
      questionText: snapshot?.text || answer.questionId,
      myAnswer: answer.submitted,
      correctAnswer: answer.answer,
      errorType: 'answer_wrong',
      date: session.completedAt,
      retriedCorrect: answer.finalCorrect === true,
      instanceId: `${session.id}:${answer.questionId}`,
      reviewStatus: 'open',
      questionSnapshot: snapshot,
    };
  });
}

/** Emit one first-submission event per oral-question instance; retries never replace it. */
export function buildMentalMathLearningEvents(
  session: MentalMathSession,
  identity: EventIdentity,
): LearningEvent[] {
  let events: LearningEvent[] = [];
  for (const answer of session.answers) {
    const actionId = `${session.id}:${answer.questionId}:first-answer`;
    const added = appendUniqueEvent(events, {
      eventId: `${actionId}:attempt_submitted`,
      childProfileId: identity.childProfileId,
      deviceId: identity.deviceId,
      sessionId: session.id,
      lessonId: session.id,
      questionInstanceId: `${session.id}:${answer.questionId}`,
      questionId: answer.questionId,
      questionVersion: 'mental-math-v1',
      skillIds: [],
      grade: /^G[1-6]$/.test(session.grade) ? session.grade as 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' : 'unknown',
      semester: 'unknown',
      unitId: null,
      role: 'unknown',
      eventType: 'attempt_submitted',
      actionId,
      attemptId: actionId,
      timestamp: session.completedAt,
      hintLevel: answer.helpUsed ? 'light' : 'none',
      completionMode: answer.helpUsed ? 'assisted' : 'independent',
      result: answer.correct ? 'correct' : 'incorrect',
      durationMs: Number.isFinite(answer.timeMs) && answer.timeMs >= 0 ? answer.timeMs : undefined,
      firstAttemptKnown: true,
    });
    if (added.accepted) events = added.events;

    // A corrected item is completed for daily progress, while its original
    // attempt result remains the sole source for first-answer accuracy.
    const eventuallyCorrect = answer.finalCorrect ?? answer.correct;
    if (eventuallyCorrect) {
      const completion = appendUniqueEvent(events, {
        eventId: `${session.id}:${answer.questionId}:question_completed`,
        childProfileId: identity.childProfileId,
        deviceId: identity.deviceId,
        sessionId: session.id,
        lessonId: session.id,
        questionInstanceId: `${session.id}:${answer.questionId}`,
        questionId: answer.questionId,
        questionVersion: 'mental-math-v1',
        skillIds: [],
        grade: /^G[1-6]$/.test(session.grade) ? session.grade as 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' : 'unknown',
        semester: 'unknown',
        unitId: null,
        role: 'unknown',
        eventType: 'question_completed',
        actionId: `${session.id}:${answer.questionId}:completed`,
        attemptId: `${session.id}:${answer.questionId}:completed`,
        timestamp: session.completedAt,
        hintLevel: answer.helpUsed ? 'light' : 'none',
        completionMode: answer.helpUsed ? 'assisted' : 'independent',
        result: 'correct',
        firstAttemptKnown: true,
      });
      if (completion.accepted) events = completion.events;
    }
  }
  return events;
}

function formatScaled(value: number, scale: number): string {
  const digits = Math.log10(scale);
  return (value / scale).toFixed(digits).replace(/\.?0+$/, '');
}
function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }
function fraction(n: number, d: number): string {
  const divisor = gcd(n, d);
  return d / divisor === 1 ? String(n / divisor) : `${n / divisor}/${d / divisor}`;
}

function makeQuestion(operation: BasicOperation, grade: string, index: number, random: () => number, rows: number[] | null): MentalMathQuestion {
  const ri = (min: number, max: number) => min + Math.floor(Math.min(0.999999999, Math.max(0, random())) * (max - min + 1));
  const variant = index % 2;
  let left = 0; let right = 0; let answer: number | string = 0; let text = ''; let method = '';
  let answerKind: MentalMathQuestion['answerKind'] = 'number';
  if (grade === 'G1') {
    if (operation === 'addition') {
      left = variant ? ri(6, 9) : ri(2, 7);
      right = variant ? ri(11 - left, Math.min(9, 20 - left)) : ri(1, 9);
      answer = left + right; method = variant ? '先凑成10，再加剩余。' : '沿数轴向右走。';
    } else {
      left = variant ? ri(11, 20) : ri(6, 10);
      right = variant ? ri(left - 9, left) : ri(1, left);
      answer = left - right; method = variant ? '先退到10，再减剩余。' : '沿数轴向左走。';
    }
    text = `${left} ${SYMBOL[operation]} ${right}`;
  } else if (grade === 'G2') {
    if (!rows || rows.length === 0) {
      const each = ri(2, 5), groups = ri(2, 5);
      left = operation === 'division' ? each * groups : each;
      right = operation === 'division' ? groups : groups;
      answer = operation === 'division' ? each : each * groups;
      text = operation === 'division' ? `${left} 个平均分成 ${groups} 组，每组几个？` : `${groups} 组，每组 ${each} 个，一共几个？`;
      method = operation === 'division' ? '画出同样多的组，逐个平均分。' : '画出每组，逐组相加。';
    } else {
      const fact = rows[ri(0, rows.length - 1)], other = ri(1, 9);
      left = operation === 'division' ? fact * other : fact;
      right = operation === 'division' ? fact : other;
      answer = operation === 'division' ? other : fact * other;
      text = `${left} ${SYMBOL[operation]} ${right}`;
      method = `${fact}×${other}=${fact * other}，乘除法用同一个事实。`;
    }
  } else if (grade === 'G3') {
    const hundreds = ri(0, 1) === 1;
    const factor = variant ? ri(12, 39) : hundreds ? ri(1, 3) * 100 : ri(2, 9) * 10;
    const other = variant || !hundreds ? ri(2, 8) : ri(2, 3);
    left = operation === 'division' ? factor * other : factor;
    right = operation === 'division' ? other : other;
    answer = operation === 'division' ? factor : factor * other;
    text = `${left} ${SYMBOL[operation]} ${right}`;
    method = variant ? '把多位数分成整十与个位分别计算。' : '先算非零数字，再按十或百的位值还原。';
  } else if (grade === 'G4') {
    const n = ri(2, 9);
    if (operation === 'addition') {
      left = variant ? 99 : 25; right = variant ? n * 10 + 1 : 75 + n;
      answer = variant ? 100 + n * 10 : 100 + n;
      text = variant ? `99 + ${right}` : `25 + 75 + ${n}`;
      method = variant ? '把99看成100−1。' : '先把25与75凑成100。';
    } else if (operation === 'subtraction') {
      left = variant ? 1000 : 500; right = variant ? 398 + n : 198 + n;
      answer = left - right; text = `${left} − ${right}`; method = '把接近整百的减数拆开，先减整百再补回差额。';
    } else if (operation === 'multiplication') {
      left = variant ? 25 : 27 + n; right = variant ? 4 * n : 6;
      answer = variant ? 100 * n : (27 + n) * 6;
      text = variant ? `25 × (4 × ${n})` : `(${27 + n}) × 6`;
      method = variant ? '用乘法结合律先算25×4。' : `用分配律算27×6与${n}×6。`;
    } else {
      const factor = [2, 4, 5][ri(0, 2)];
      left = variant ? 480 : 360;
      right = (variant ? 6 : 9) * factor;
      answer = left / right;
      text = `${left} ÷ (${right})`; method = '先看除数的因数，再分步除。';
    }
  } else if (grade === 'G5') {
    const a = ri(12, 89), b = ri(2, 9);
    if (operation === 'addition' || operation === 'subtraction') {
      const scale = variant ? 100 : 10;
      left = a / scale; right = b / scale;
      answer = formatScaled(operation === 'addition' ? a + b : a - b, scale);
      text = `${formatScaled(a, scale)} ${SYMBOL[operation]} ${formatScaled(b, scale)}`;
      method = '对齐小数位，按相同单位相加或相减。';
    } else if (operation === 'multiplication') {
      left = a / 10; right = b;
      answer = formatScaled(a * b, 10); text = `${formatScaled(a, 10)} × ${b}`;
      method = '先算整数积，再确定一位小数。';
    } else {
      // Choose an exact finite quotient by constructing the dividend from the answer.
      const quotientTenths = ri(2, 9);
      if (variant) { left = b * quotientTenths / 100; right = b / 10; answer = formatScaled(quotientTenths, 10); }
      else { left = b * quotientTenths / 10; right = b; answer = formatScaled(quotientTenths, 10); }
      text = `${formatScaled(Math.round(left * 100), 100)} ÷ ${formatScaled(Math.round(right * 10), 10)}`;
      method = '移动小数点把除数化为整数，再按位计算。';
    }
  } else {
    const denominator = ri(3, 9), numerator = ri(1, denominator - 1);
    if (operation === 'addition' || operation === 'subtraction') {
      const second = operation === 'addition' ? ri(1, denominator - numerator) : ri(1, numerator);
      left = numerator; right = second;
      answer = fraction(operation === 'addition' ? numerator + second : numerator - second, denominator);
      text = `${numerator}/${denominator} ${SYMBOL[operation]} ${second}/${denominator}`;
      method = '同分母分数分母不变，分子相加或相减，最后约分。';
      answerKind = 'fraction';
    } else if (operation === 'multiplication') {
      const n = ri(2, 5); left = numerator; right = n;
      if (variant) { answer = `${n * 10}%`; text = `${n} 个 10% 合起来是多少？`; answerKind = 'percent'; method = '每个10%是十分之一，按份数合并。'; }
      else { answer = fraction(numerator * n, denominator); text = `${numerator}/${denominator} × ${n}`; answerKind = 'fraction'; method = '整数乘分子，再约分。'; }
    } else {
      const n = ri(2, 5); left = numerator; right = n;
      answer = fraction(numerator, denominator * n); text = `${numerator}/${denominator} ÷ ${n}`;
      answerKind = 'fraction'; method = '平均分成n份，分母乘n，再约分。'.replaceAll('n', String(n));
    }
  }
  return { id: `mm_${grade}_${operation}_${index}_${Math.floor(random() * 1e9)}`, operation, left, right, answer, text, method, answerKind };
}

/**
 * 生成一次练习的题目序列。
 * @param operation 运算类型（mixed 会混合四种）
 * @param grade 年级 G1-G6
 * @param count 题目数量
 */
export function generateQuestions(
  operation: MentalMathOperation,
  grade: string,
  count: number,
  options: GeneratorOptions = {},
): MentalMathQuestion[] {
  const available = availableMentalMathOperations(grade);
  if (!available.includes(operation)) throw new Error(`${grade} 暂不支持 ${operation} 口算`);
  const ops = available.filter((op): op is BasicOperation => op !== 'mixed');
  const random = options.rng ?? Math.random;
  const rows = options.learnedTableRange === undefined ? null : options.learnedTableRange;
  const allowedRows = rows === null ? null : [...new Set(rows.filter(n => Number.isInteger(n) && n >= 1 && n <= 9))];

  const questions: MentalMathQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const op = operation === 'mixed' ? ops[i % ops.length] : operation;
    questions.push(makeQuestion(op as BasicOperation, grade, i, random, allowedRows));
  }
  return questions;
}

export function checkMentalMathAnswer(input: string, question: MentalMathQuestion): boolean {
  const answerSchema = question.answerKind === 'percent' ? { kind: 'percent' as const }
    : question.answerKind === 'fraction' ? { kind: 'fraction' as const }
      : undefined;
  const adapter = { answer: question.answer, answerType: 'number', answerSchema } as Question;
  return checkAnswer(input, adapter).correct;
}

// ========== 会话管理 ==========

export function createSessionId(): string {
  return `mm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getDateString(date?: Date): string {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 计算一次会话的统计结果。
 */
export function summarizeSession(
  session: Omit<MentalMathSession, 'correctCount' | 'avgTimeMs'>
): MentalMathSession {
  const correctCount = session.answers.filter((a) => a.correct).length;
  const totalTime = session.answers.reduce((sum, a) => sum + a.timeMs, 0);
  const avgTimeMs = session.answers.length > 0 ? Math.round(totalTime / session.answers.length) : 0;
  return {
    ...session,
    correctCount,
    avgTimeMs,
  };
}

// ========== 周报聚合 ==========

function getWeekStart(date?: Date): string {
  const d = date || new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return getDateString(mon);
}

function getWeekEnd(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const end = new Date(y, m - 1, d + 6);
  return getDateString(end);
}

/**
 * 生成指定日期所在周的周报。
 * @param sessions 全部口算会话记录
 * @param date 参考日期（默认今天）
 */
export function buildWeeklyReport(
  sessions: MentalMathSession[],
  date?: Date
): MentalMathWeeklyReport {
  const weekStart = getWeekStart(date);
  const weekEnd = getWeekEnd(weekStart);

  const weekSessions = sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd);

  // 按天聚合
  const dailyMap = new Map<string, MentalMathDailySummary>();
  const byOperation: Record<string, { total: number; correct: number; accuracy: number }> = {};

  for (const s of weekSessions) {
    const day = dailyMap.get(s.date) || {
      date: s.date,
      sessions: 0,
      totalQuestions: 0,
      correctCount: 0,
      accuracy: 0,
      avgTimeMs: 0,
    };
    day.sessions += 1;
    day.totalQuestions += s.totalQuestions;
    day.correctCount += s.correctCount;
    dailyMap.set(s.date, day);

    // 按运算类型聚合
    for (const a of s.answers) {
      const q = s.answers.find((x) => x.questionId === a.questionId);
      // 运算类型从 session 的 operation 推断（mixed 时无法精确到每题，这里用 session 级）
      const opKey = s.operation;
      const entry = byOperation[opKey] || { total: 0, correct: 0, accuracy: 0 };
      entry.total += 1;
      if (a.correct) entry.correct += 1;
      byOperation[opKey] = entry;
    }
  }

  // 计算每日正确率与平均用时
  const daily = Array.from(dailyMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => {
      const totalTime = weekSessions
        .filter((s) => s.date === d.date)
        .reduce((sum, s) => sum + s.avgTimeMs * s.totalQuestions, 0);
      d.accuracy = d.totalQuestions > 0 ? Math.round((d.correctCount / d.totalQuestions) * 100) : 0;
      d.avgTimeMs = d.totalQuestions > 0 ? Math.round(totalTime / d.totalQuestions) : 0;
      return d;
    });

  // 计算各运算类型正确率
  for (const key of Object.keys(byOperation)) {
    const e = byOperation[key];
    e.accuracy = e.total > 0 ? Math.round((e.correct / e.total) * 100) : 0;
  }

  const totalQuestions = weekSessions.reduce((sum, s) => sum + s.totalQuestions, 0);
  const correctCount = weekSessions.reduce((sum, s) => sum + s.correctCount, 0);
  const totalTime = weekSessions.reduce((sum, s) => sum + s.avgTimeMs * s.totalQuestions, 0);

  return {
    weekStart,
    weekEnd,
    activeDays: daily.length,
    totalSessions: weekSessions.length,
    totalQuestions,
    correctCount,
    accuracy: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
    avgTimeMs: totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0,
    daily,
    byOperation,
  };
}

/**
 * 生成最近 N 周的周报列表（用于趋势展示）。
 */
export function buildRecentWeeklyReports(
  sessions: MentalMathSession[],
  weeks: number = 8
): MentalMathWeeklyReport[] {
  const reports: MentalMathWeeklyReport[] = [];
  const now = new Date();
  for (let i = 0; i < weeks; i++) {
    const ref = new Date(now);
    ref.setDate(ref.getDate() - i * 7);
    reports.push(buildWeeklyReport(sessions, ref));
  }
  return reports;
}

// ========== 运算类型标签 ==========

export const OPERATION_LABELS: Record<MentalMathOperation, string> = {
  addition: '加法',
  subtraction: '减法',
  multiplication: '乘法',
  division: '除法',
  mixed: '混合',
};

export const OPERATION_OPTIONS: { value: MentalMathOperation; label: string; emoji: string }[] = [
  { value: 'addition', label: '加法', emoji: '➕' },
  { value: 'subtraction', label: '减法', emoji: '➖' },
  { value: 'multiplication', label: '乘法', emoji: '✖️' },
  { value: 'division', label: '除法', emoji: '➗' },
  { value: 'mixed', label: '混合', emoji: '🔀' },
];

export const GRADE_OPTIONS: { value: string; label: string }[] = [
  { value: 'G1', label: '一年级' },
  { value: 'G2', label: '二年级' },
  { value: 'G3', label: '三年级' },
  { value: 'G4', label: '四年级' },
  { value: 'G5', label: '五年级' },
  { value: 'G6', label: '六年级' },
];
