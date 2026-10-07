import assert from 'node:assert/strict';
import { getAccuracyStats } from '@/lib/storage';
import { DEFAULT_GAME_STATE, type GameState, type LearningEvent } from '@/lib/types';

function event(eventId: string, questionId: string, instanceId: string, type: LearningEvent['eventType'], result: LearningEvent['result'], timestamp: string): LearningEvent {
  return {
    eventId, schemaVersion: 1, childProfileId: 'child', deviceId: 'device', sessionId: 'session', lessonId: 'lesson',
    questionInstanceId: instanceId, questionId, questionVersion: '1', skillIds: [], grade: 'G2', semester: 'upper',
    unitId: 'u1', role: 'current_concept', eventType: type, actionId: eventId, attemptId: eventId,
    timestamp, hintLevel: 'none', completionMode: 'independent', result, firstAttemptKnown: true,
  };
}

const firstWrong = event('a-wrong', 'q1', 'instance-1', 'attempt_submitted', 'incorrect', '2026-09-29T01:00:00.000Z');
const retryCorrect = event('b-correct', 'q1', 'instance-1', 'attempt_submitted', 'correct', '2026-09-29T01:00:10.000Z');
const review = event('review-ok', 'q1', 'review:instance-1', 'mistake_review_submitted', 'correct', '2026-09-29T01:01:00.000Z');

const state: GameState = {
  ...DEFAULT_GAME_STATE,
  attemptRecords: [
    { questionId: 'q1', isCorrect: true, submittedAt: retryCorrect.timestamp, attemptType: 'final_answer' },
    { questionId: 'legacy-q', isCorrect: true, submittedAt: retryCorrect.timestamp, attemptType: 'final_answer' },
  ],
  learningEvents: [firstWrong, retryCorrect, review,
    event('complete-1', 'q1', 'instance-1', 'question_completed', 'completed', '2026-09-29T01:00:11.000Z')],
};
const stats = getAccuracyStats(state);
assert.equal(stats.totalAttempts, 1);
assert.equal(stats.correctAttempts, 0, 'a later retry and a review must not replace the first wrong answer');
assert.equal(stats.overallAccuracy, 0, 'wrong first answer cannot remain at 100%');
assert.equal(stats.isKnown, true);
assert.equal(stats.unknownLegacyCount, 1, 'legacy row is reported as unknown without double counting q1');
assert.equal(stats.todayCompleted, 1, 'completion progress is separate from first-answer accuracy');

const unknown = getAccuracyStats({ ...DEFAULT_GAME_STATE, attemptRecords: [{
  questionId: 'old-only', isCorrect: true, submittedAt: '2026-09-29T01:00:00.000Z', attemptType: 'final_answer',
}] });
assert.equal(unknown.isKnown, false);
assert.equal(unknown.overallAccuracy, 0);
assert.equal(unknown.unknownLegacyCount, 1);
assert.equal(unknown.todayCompleted, 0);

console.log('PASS first-attempt accuracy and unknown legacy evidence');
