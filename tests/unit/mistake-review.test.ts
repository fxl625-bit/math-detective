import assert from 'node:assert/strict';
import { getReviewQuestion, getReviewRecordId, submitMistakeReview } from '@/lib/mistakeReview';
import { DEFAULT_GAME_STATE, type GameState, type MistakeRecord } from '@/lib/types';

const now = new Date(2026, 8, 29, 12, 0, 0);
const record: MistakeRecord = {
  questionId: 'g1_01', questionText: '6 + 3 = ?', myAnswer: '8', correctAnswer: 9,
  errorType: 'answer_wrong', date: now.toISOString(), retriedCorrect: false, instanceId: 'lesson-1:q-1',
};
const second: MistakeRecord = {
  questionId: 'g1_02', questionText: '5 + 4 = ?', myAnswer: '7', correctAnswer: 9,
  errorType: 'answer_wrong', date: now.toISOString(), retriedCorrect: false, instanceId: 'lesson-1:q-2',
};

function makeState(mistakes: MistakeRecord[] = [record]): GameState {
  return {
    ...DEFAULT_GAME_STATE,
    stars: 75,
    mistakes,
    pointsWallet: { schemaVersion: 1, initializedAt: '2026-09-01T00:00:00.000Z', ledger: [], redemptions: [] },
  };
}

let state = makeState();
const id = getReviewRecordId(record);
assert.ok(getReviewQuestion(record), 'question resolves from the current catalog');
const wrong = submitMistakeReview(state, { recordId: id, answer: '8', actionId: 'review-wrong-1' }, now);
assert.equal(wrong.ok, true);
assert.equal(wrong.correct, false);
assert.equal(wrong.pointsDelta, 0);
assert.equal(wrong.state.mistakes[0]?.reviewStatus, undefined, 'a wrong review does not clear the mistake');
state = wrong.state;

const correct = submitMistakeReview(state, { recordId: id, answer: '9', actionId: 'review-correct-1' }, now);
assert.equal(correct.ok, true);
assert.equal(correct.correct, true);
assert.equal(correct.pointsDelta, 0.5);
assert.equal(correct.state.mistakes.length, 1, 'corrected records remain available as learning history');
assert.equal(correct.state.mistakes[0]?.retriedCorrect, true);
assert.equal(correct.state.mistakes[0]?.reviewStatus, 'corrected');
assert.equal(correct.state.pointsWallet?.ledger.filter(entry => entry.type === 'mistake_review').length, 1);

const duplicate = submitMistakeReview(correct.state, { recordId: id, answer: '9', actionId: 'review-correct-1' }, now);
assert.equal(duplicate.pointsDelta, 0, 'same action never reports another payout');
assert.equal(duplicate.state.mistakeReviewAttempts?.length, correct.state.mistakeReviewAttempts?.length);
const conflict = submitMistakeReview(correct.state, { recordId: id, answer: '8', actionId: 'review-correct-1' }, now);
assert.equal(conflict.ok, false, 'reusing action ID with a different answer is rejected');

const dailyCapState = { ...correct.state, mistakes: [...correct.state.mistakes, second] };
const dailyCap = submitMistakeReview(dailyCapState, { recordId: getReviewRecordId(second), answer: '9', actionId: 'review-correct-2' }, now);
assert.equal(dailyCap.correct, true);
assert.equal(dailyCap.pointsDelta, 0, 'second correction that day is logged but not paid');
assert.equal(dailyCap.state.mistakeReviewAttempts?.length, (correct.state.mistakeReviewAttempts?.length || 0) + 1);

const snapshotMistake: MistakeRecord = {
  questionId: 'mm_G6_fraction_1', questionText: '1/2 + 0 = ?', myAnswer: '1/3', correctAnswer: '1/2',
  errorType: 'answer_wrong', date: now.toISOString(), retriedCorrect: false, instanceId: 'math-session:1',
  questionSnapshot: { id: 'mm_G6_fraction_1', gradeBand: 'G6', text: '1/2 + 0 = ?', answer: '1/2', answerType: 'number', answerSchema: { kind: 'fraction' } },
};
assert.equal(getReviewQuestion(snapshotMistake)?.gradeBand, 'G6');
const snapshotState = makeState([snapshotMistake]);
const snapshotCorrect = submitMistakeReview(snapshotState, {
  recordId: getReviewRecordId(snapshotMistake), answer: '2/4', actionId: 'snapshot-review',
}, now);
assert.equal(snapshotCorrect.correct, true, 'review uses the snapshot answer schema through the shared strict checker');

const missing = submitMistakeReview(makeState([{
  ...record, questionId: 'removed_question', instanceId: 'old-instance', questionSnapshot: undefined,
}]), { recordId: 'removed_question:old-instance', answer: '9', actionId: 'missing-q' }, now);
assert.equal(missing.ok, false);
assert.match(missing.message, /不可用/);

console.log('PASS strict mistake review, retained first error, daily cap, and mental-math snapshot');
