import assert from 'node:assert/strict';
import { DEFAULT_GAME_STATE, type GameState, type MistakeRecord } from '@/lib/types';
import { getReviewRecordId, hasViewedMistakeExplanation, revealMistakeExplanation, submitMistakeReview } from '@/lib/mistakeReview';

const firstDay = new Date(2026, 9, 21, 12, 0, 0);
const nextDay = new Date(2026, 9, 22, 12, 0, 0);
const mistake: MistakeRecord = {
  questionId: 'g1_01', questionText: '6 + 3 = ?', myAnswer: '8', correctAnswer: 9,
  errorType: 'answer_wrong', date: firstDay.toISOString(), retriedCorrect: false, instanceId: 'lesson-id:q-id',
};
const state: GameState = {
  ...DEFAULT_GAME_STATE,
  stars: 42,
  mistakes: [mistake],
  pointsWallet: { schemaVersion: 1, initializedAt: '2026-09-01T00:00:00.000Z', ledger: [], redemptions: [] },
};
const recordId = getReviewRecordId(mistake);

const revealed = revealMistakeExplanation(state, recordId, firstDay);
assert.equal(revealed.ok, true);
assert.equal(revealed.state.stars, 42, 'showing an explanation does not touch legacy stars');
assert.equal(revealed.state.pointsWallet?.ledger.length, 0);
assert.equal(hasViewedMistakeExplanation(revealed.state, recordId, firstDay), true);

// A reload is just the persisted state object; the review gate is derived from it.
const reloaded: GameState = structuredClone(revealed.state);
const blocked = submitMistakeReview(reloaded, { recordId, answer: '9', actionId: 'same-day-after-explanation' }, firstDay);
assert.equal(blocked.ok, false);
assert.equal(blocked.pointsDelta, 0);
assert.equal(blocked.state.mistakeReviewAttempts?.length ?? 0, 0);
assert.equal(blocked.state.pointsWallet?.ledger.length, 0);
assert.equal(blocked.state.mistakes[0]?.retriedCorrect, false);

assert.equal(hasViewedMistakeExplanation(reloaded, recordId, nextDay), false, 'the lock expires on the next local day');
const nextDayReview = submitMistakeReview(reloaded, { recordId, answer: '9', actionId: 'next-day-review' }, nextDay);
assert.equal(nextDayReview.ok, true);
assert.equal(nextDayReview.correct, true);
assert.equal(nextDayReview.pointsDelta, 0.5);
assert.equal(nextDayReview.state.mistakeReviewAttempts?.length, 1);
assert.equal(nextDayReview.state.pointsWallet?.ledger.filter(entry => entry.type === 'mistake_review').length, 1);

console.log('PASS persisted same-day mistake explanation gate and next-day review');
