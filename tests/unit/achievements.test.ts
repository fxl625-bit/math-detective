import assert from 'node:assert/strict';
import test from 'node:test';
import { achievementCatalog } from '@/data/achievementCatalog';
import { getAchievementProgress, getDetectiveLevel } from '@/lib/achievements';
import { getUnlockedItems } from '@/data/avatarItems';
import { DEFAULT_GAME_STATE, type GameState, type LearningEvent } from '@/lib/types';

function event(overrides: Partial<LearningEvent> & Pick<LearningEvent, 'eventId' | 'eventType' | 'questionId' | 'timestamp'>): LearningEvent {
  return Object.assign({
    eventId: '',
    schemaVersion: 1,
    childProfileId: 'child-1',
    deviceId: 'device-1',
    sessionId: 'session-1',
    lessonId: 'lesson-1',
    questionInstanceId: `instance-${overrides.eventId}`,
    questionId: '',
    questionVersion: 'v1',
    skillIds: [],
    grade: 'G3',
    semester: 'upper',
    unitId: 'g3-u1',
    role: 'application',
    eventType: 'attempt_submitted' as const,
    actionId: `action-${overrides.eventId}`,
    attemptId: `attempt-${overrides.eventId}`,
    timestamp: '',
    hintLevel: 'none',
    completionMode: 'independent',
    result: overrides.eventType === 'question_completed' ? 'completed' as const : 'correct' as const,
  }, overrides);
}

test('catalog has 24 stable, unique medals across six families and four tiers', () => {
  assert.equal(achievementCatalog.length, 24);
  assert.equal(new Set(achievementCatalog.map((item) => item.id)).size, 24);
  assert.equal(new Set(achievementCatalog.map((item) => item.category)).size, 6);
  for (const category of new Set(achievementCatalog.map((item) => item.category))) {
    assert.equal(achievementCatalog.filter((item) => item.category === category).length, 4);
  }
});

test('repeated completion events for one question do not inflate exploration or challenge progress', () => {
  const state: GameState = {
    ...DEFAULT_GAME_STATE,
    learningEvents: [
      event({ eventId: 'complete-a', eventType: 'question_completed', questionId: 'q-a', timestamp: '2026-09-20T10:00:00Z', role: 'olympiad' }),
      event({ eventId: 'complete-a-again', eventType: 'question_completed', questionId: 'q-a', timestamp: '2026-09-21T10:00:00Z', role: 'olympiad' }),
    ],
  };
  const result = getAchievementProgress(state);
  assert.equal(result.find((item) => item.id === 'exploration_bronze')?.current, 1);
  assert.equal(result.find((item) => item.id === 'thinking_bronze')?.current, 1);
  assert.equal(result.find((item) => item.id === 'persistence_silver')?.current, 2);
});

test('unknown historical first-attempt data stays unknown, while explicit independent first answers count', () => {
  const state: GameState = {
    ...DEFAULT_GAME_STATE,
    totalCompleted: 100,
    learningEvents: [
      event({ eventId: 'known', eventType: 'attempt_submitted', questionId: 'q-known', timestamp: '2026-09-20T10:00:00Z', firstAttemptKnown: true, result: 'correct' }),
      event({ eventId: 'unknown', eventType: 'attempt_submitted', questionId: 'q-unknown', timestamp: '2026-09-20T10:02:00Z', firstAttemptKnown: false, result: 'correct' }),
      event({ eventId: 'not-independent', eventType: 'attempt_submitted', questionId: 'q-assisted', timestamp: '2026-09-20T10:03:00Z', firstAttemptKnown: true, completionMode: 'assisted', result: 'correct' }),
    ],
  };
  assert.equal(getAchievementProgress(state).find((item) => item.id === 'first_try_bronze')?.current, 1);
});

test('a correct retry after an incorrect first attempt cannot earn independent first-answer progress', () => {
  const state: GameState = {
    ...DEFAULT_GAME_STATE,
    learningEvents: [
      event({ eventId: 'wrong-first', eventType: 'attempt_submitted', questionId: 'q-retry', questionInstanceId: 'same-instance', timestamp: '2026-09-20T10:00:00Z', firstAttemptKnown: true, result: 'incorrect' }),
      event({ eventId: 'right-second', eventType: 'attempt_submitted', questionId: 'q-retry', questionInstanceId: 'same-instance', timestamp: '2026-09-20T10:01:00Z', firstAttemptKnown: true, result: 'correct' }),
    ],
  };
  assert.equal(getAchievementProgress(state).find((item) => item.id === 'first_try_bronze')?.current, 0);
});

test('same-timestamp attempts keep their stored order for first-answer evidence', () => {
  const state: GameState = {
    ...DEFAULT_GAME_STATE,
    learningEvents: [
      event({ eventId: 'z-wrong-first', eventType: 'attempt_submitted', questionId: 'q-tie', questionInstanceId: 'same-time-instance', timestamp: '2026-09-20T10:00:00Z', firstAttemptKnown: true, result: 'incorrect' }),
      event({ eventId: 'a-right-retry', eventType: 'attempt_submitted', questionId: 'q-tie', questionInstanceId: 'same-time-instance', timestamp: '2026-09-20T10:00:00Z', firstAttemptKnown: true, result: 'correct' }),
    ],
  };
  assert.equal(getAchievementProgress(state).find((item) => item.id === 'first_try_bronze')?.current, 0);
});

test('correction evidence is deduplicated by question and successful achievement unlocks themed items', () => {
  const state: GameState = {
    ...DEFAULT_GAME_STATE,
    mistakes: [
      { questionId: 'q-corrected', questionText: 'x', myAnswer: 1, correctAnswer: 2, errorType: 'answer_wrong', date: '2026-09-28', retriedCorrect: true },
      { questionId: 'q-corrected', questionText: 'x', myAnswer: 1, correctAnswer: 2, errorType: 'answer_wrong', date: '2026-09-28', retriedCorrect: true },
    ],
    mistakeReviewAttempts: [
      { id: 'review-1', recordId: 'r1', questionId: 'q-reviewed', actionId: 'a1', answer: '2', correct: true, submittedAt: '2026-09-28T12:00:00Z', pointsDeltaUnits: 1 },
      { id: 'review-2', recordId: 'r1', questionId: 'q-reviewed', actionId: 'a2', answer: '2', correct: true, submittedAt: '2026-09-28T12:01:00Z', pointsDeltaUnits: 1 },
      { id: 'review-3', recordId: 'r2', questionId: 'q-still-wrong', actionId: 'a3', answer: '1', correct: false, submittedAt: '2026-09-28T12:02:00Z', pointsDeltaUnits: 0 },
    ],
    learningEvents: [event({ eventId: 'complete', eventType: 'question_completed', questionId: 'q-explore', timestamp: '2026-09-20T10:00:00Z' })],
  };
  const progress = getAchievementProgress(state);
  assert.equal(progress.find((item) => item.id === 'recovery_bronze')?.current, 2);
  assert.equal(getUnlockedItems(state).some((item) => item.id === 'fox_forest_hat'), true);
  assert.equal(getUnlockedItems(state).some((item) => item.id === 'fox_workshop_hat'), true);
  assert.equal(getUnlockedItems({ ...state, stars: 0, unlockedAvatarItemIds: ['fox_space_hat'] }).some((item) => item.id === 'fox_space_hat'), true);
});

test('legacy numeric totals and stars alone unlock no learning achievements or achievement outfits', () => {
  const state = { ...DEFAULT_GAME_STATE, stars: 99999, totalCompleted: 999, correctCount: 999 };
  assert.equal(getAchievementProgress(state).every((item) => item.current === 0 && !item.unlocked), true);
  assert.equal(getUnlockedItems(state).some((item) => item.id === 'fox_space_hat'), false);
});

test('detective level follows distinct completed questions and ignores reinforce IDs', () => {
  const expected = [1, 2, 3, 4, 5, 6];
  const thresholds = [0, 5, 15, 30, 60, 100];
  for (let index = 0; index < thresholds.length; index += 1) {
    const completedQuestions = Array.from({ length: thresholds[index] }, (_, item) => `q-${item}`);
    completedQuestions.push(...Array.from({ length: 20 }, (_, item) => `old_reinforce_${item}`));
    assert.equal(getDetectiveLevel({ ...DEFAULT_GAME_STATE, completedQuestions }), expected[index]);
  }
  assert.equal(getDetectiveLevel({ ...DEFAULT_GAME_STATE, level: 5, completedQuestions: ['q1'] }), 5);
  assert.equal(getDetectiveLevel({ ...DEFAULT_GAME_STATE, level: 99, completedQuestions: ['q1'] }), 1);
});

test('legacy star and perfect-question cosmetics have real learning unlock routes', () => {
  const completedQuestions = Array.from({ length: 20 }, (_, index) => `distinct-${index}`);
  const firstTryEvents = Array.from({ length: 30 }, (_, index) => event({
    eventId: `first-${index}`,
    eventType: 'attempt_submitted',
    questionId: `first-question-${index}`,
    timestamp: `2026-09-20T10:${String(index).padStart(2, '0')}:00Z`,
    firstAttemptKnown: true,
    result: 'correct',
    completionMode: 'independent',
    hintLevel: 'none',
  }));
  const afterStudy = getUnlockedItems({ ...DEFAULT_GAME_STATE, completedQuestions, learningEvents: firstTryEvents });
  assert.equal(afterStudy.some((item) => item.id === 'sticker_star_corner'), true);
  assert.equal(afterStudy.some((item) => item.id === 'dec_medal'), true);

  const afterRewardSpend = getUnlockedItems({ ...DEFAULT_GAME_STATE, level: 1, stars: 0, completedQuestions, learningEvents: firstTryEvents });
  assert.equal(afterRewardSpend.some((item) => item.id === 'sticker_star_corner'), true);
  assert.equal(afterRewardSpend.some((item) => item.id === 'dec_medal'), true);
  const retainedOwned = getUnlockedItems({ ...DEFAULT_GAME_STATE, unlockedAvatarItemIds: ['dec_medal'] });
  assert.equal(retainedOwned.some((item) => item.id === 'dec_medal'), true);
});
