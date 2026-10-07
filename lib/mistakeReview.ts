import { getQuestionById } from '@/data/questions';
import { checkAnswer } from './answerChecker';
import { appendUniqueEvent, createEventIdentity } from './learningEvents';
import type { GameState, MistakeRecord, MistakeReviewAttempt, Question } from './types';
import { ensurePointsState, getPointsLedger, isValidPointsWallet, type PointsResult } from './familyPoints';

export interface MistakeReviewInput {
  recordId: string;
  answer: string | Record<string, string>;
  actionId: string;
}

export interface MistakeReviewResult extends PointsResult {
  correct: boolean;
}

export function getReviewRecordId(record: MistakeRecord): string {
  if (record.instanceId) return `${record.questionId}:${record.instanceId}`;
  const raw = `${record.questionId}|${record.date}|${String(record.myAnswer)}|${record.errorType}`;
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${record.questionId}:${(hash >>> 0).toString(36)}`;
}

/** Resolve a review target from the live catalog or its immutable mental-math snapshot. */
export function getReviewQuestion(record: MistakeRecord): Question | undefined {
  const live = getQuestionById(record.questionId);
  if (live) return live;
  const snapshot = record.questionSnapshot;
  if (!snapshot || snapshot.id !== record.questionId) return undefined;
  const domain = snapshot.answerSchema?.kind === 'percent' ? 'percent'
    : snapshot.answerSchema?.kind === 'fraction' ? 'fractions'
      : snapshot.answerSchema?.kind === 'ratio' ? 'ratio' : 'addition_subtraction';
  return {
    ...snapshot,
    gradeBand: snapshot.gradeBand || 'G1',
    domain,
    cognitiveSkills: [],
    numbers: [],
    keywords: [],
    noisePhrases: [],
    usefulPhrases: [],
    questionMeaningOptions: [],
    correctMeaning: '',
    operation: 'addition',
    equation: '',
    explanation: snapshot.explanation || '',
    solutionSteps: [],
    hints: [],
    difficulty: 1,
    category: 'mixed',
    visualKey: '',
    requiresAnswer: true,
  } as unknown as Question;
}

export function submitMistakeReview(
  state: GameState,
  input: MistakeReviewInput,
  now: Date = new Date(),
): MistakeReviewResult {
  if (state.pointsWallet !== undefined && !isValidPointsWallet(state.pointsWallet)) return failure(state, '积分账本损坏，已停止写入。');
  const base = ensurePointsState(state);
  const records = Array.isArray(base.mistakes) ? base.mistakes : [];
  const mistake = records.find((record) => getReviewRecordId(record) === input.recordId);
  if (!input.actionId?.trim() || !mistake) return failure(base, '没有找到这道错题。');

  const previous = (base.mistakeReviewAttempts || []).find((attempt) => attempt.actionId === input.actionId);
  if (previous) {
    return previous.recordId === input.recordId && stableAnswer(previous.answer) === stableAnswer(input.answer)
      ? { state: base, ok: true, correct: previous.correct, message: '这次提交已经记录。', pointsDelta: 0 }
      : failure(base, '操作编号已用于不同答案，未重复提交。');
  }

  const question = getReviewQuestion(mistake);
  if (!question) return failure(base, '这道历史错题的题目已不可用，无法练习。');
  let correct: boolean;
  try {
    correct = checkAnswer(input.answer, question).correct;
  } catch {
    return failure(base, '答案格式无法识别，请检查后再试。');
  }

  const submittedAt = now.toISOString();
  const reviewAttempt: MistakeReviewAttempt = {
    id: input.actionId,
    recordId: input.recordId,
    questionId: mistake.questionId,
    actionId: input.actionId,
    answer: typeof input.answer === 'string' ? input.answer : { ...input.answer },
    correct,
    submittedAt,
    pointsDeltaUnits: 0,
  };

  let next: GameState = {
    ...base,
    mistakeReviewAttempts: [...(base.mistakeReviewAttempts || []), reviewAttempt],
  };
  const identity = base.childProfileId && base.deviceId
    ? { childProfileId: base.childProfileId, deviceId: base.deviceId }
    : createEventIdentity();
  const event = appendUniqueEvent(base.learningEvents || [], {
    childProfileId: identity.childProfileId,
    deviceId: identity.deviceId,
    sessionId: `review:${localDate(now)}`,
    lessonId: `review:${input.recordId}`,
    questionInstanceId: `review:${input.recordId}`,
    questionId: mistake.questionId,
    questionVersion: String((question as any).questionVersion || (question as any).version || 'unknown'),
    skillIds: question.curriculumSkillIds || [],
    grade: question.gradeBand === 'OlympiadIntro' ? 'unknown' : question.gradeBand,
    semester: 'unknown',
    unitId: null,
    role: 'unknown',
    eventType: 'mistake_review_submitted',
    actionId: input.actionId,
    attemptId: input.actionId,
    timestamp: submittedAt,
    hintLevel: 'none',
    completionMode: 'independent',
    result: correct ? 'correct' : 'incorrect',
    firstAttemptKnown: false,
  });
  if (event.accepted) {
    next = {
      ...next,
      childProfileId: identity.childProfileId,
      deviceId: identity.deviceId,
      learningEvents: event.events,
    };
  }

  let pointsDelta = 0;
  if (correct) {
    const correctedAt = records.some((record) => record.questionId === mistake.questionId && record.reviewStatus === 'corrected')
      || (base.mistakeReviewAttempts || []).some((attempt) => attempt.questionId === mistake.questionId && attempt.correct);
    const alreadyRewardedQuestion = getPointsLedger(base).some((entry) => entry.type === 'mistake_review' && entry.referenceId === mistake.questionId);
    const rewardedToday = getPointsLedger(base).some((entry) => entry.type === 'mistake_review'
      && Number.isFinite(Date.parse(entry.createdAt)) && localDate(new Date(entry.createdAt)) === localDate(now));
    const canReward = !correctedAt && !alreadyRewardedQuestion && !rewardedToday;
    const pointsDeltaUnits = canReward ? 1 : 0;
    const updatedAttempt = { ...reviewAttempt, pointsDeltaUnits };
    next = {
      ...next,
      mistakeReviewAttempts: (next.mistakeReviewAttempts || []).map((attempt) => attempt.id === updatedAttempt.id ? updatedAttempt : attempt),
      mistakes: next.mistakes.map((record) => getReviewRecordId(record) === input.recordId
        ? { ...record, retriedCorrect: true, reviewStatus: 'corrected', correctedAt: record.correctedAt || submittedAt }
        : record),
    };
    if (canReward) {
      const wallet = next.pointsWallet!;
      const ledgerActionId = `mistake-review:${input.actionId}`;
      if (wallet.ledger.some(entry => entry.actionId === ledgerActionId || entry.id === input.actionId)) {
        return failure(base, '订正操作编号与已有账本记录冲突，未写入。');
      }
      const entry = {
        id: input.actionId,
        actionId: ledgerActionId,
        type: 'mistake_review' as const,
        unitsDelta: 1,
        createdAt: submittedAt,
        referenceId: mistake.questionId,
      };
      next = { ...next, pointsWallet: { ...wallet, ledger: [...wallet.ledger, entry] } };
      pointsDelta = 0.5;
    }
  }

  return {
    state: next,
    ok: true,
    correct,
    message: correct ? (pointsDelta ? '订正正确，获得 0.5 积分。' : '订正正确，错题已标记为已订正。') : '这次答案还不对，可以再试一次。',
    pointsDelta,
  };
}

function failure(state: GameState, message: string): MistakeReviewResult {
  return { state, ok: false, correct: false, message, pointsDelta: 0 };
}

function stableAnswer(answer: string | Record<string, string>): string {
  return typeof answer === 'string'
    ? answer
    : JSON.stringify(Object.fromEntries(Object.entries(answer).sort(([a], [b]) => a.localeCompare(b))));
}

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
