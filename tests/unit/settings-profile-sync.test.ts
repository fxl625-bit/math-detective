import assert from 'node:assert/strict';
import { DEFAULT_GAME_STATE, type GameState } from '@/lib/types';
import { updateLearningSettingsState } from '@/lib/learningSettings';

const date = new Date('2026-09-28T04:00:00.000Z');
const history = {
  ...DEFAULT_GAME_STATE,
  stars: 42,
  answerAttempts: 9,
  totalCompleted: 6,
  completedQuestions: ['q1', 'q2'],
  attemptRecords: [{ questionId: 'q1', isCorrect: false, submittedAt: '2026-09-20T00:00:00.000Z', attemptType: 'final_answer' as const }],
  learnerProfile: {
    skillMastery: {}, currentDifficultyLevel: 2, startedAt: '2026-09-01T00:00:00.000Z', totalCompleted: 6,
    recentAccuracy: 80, recentFirstTryAccuracy: 70, averageAttempts: 1.2, fullHintRate: 0, difficultyBias: 0,
  },
};

let state: GameState = history;
for (const [gradeBand, semesterOverride] of [
  ['G2', 'upper'], ['G2', 'lower'], ['G6', 'lower'], ['G1', 'upper'],
] as const) {
  state = updateLearningSettingsState(state, { gradeBand, semesterOverride }, date);
  const expectedGrade = Number(gradeBand.slice(1));
  assert.equal(state.parentSettings.learningSettings?.grade, gradeBand);
  assert.equal(state.curriculumProfile?.grade, expectedGrade);
  assert.equal(state.parentSettings.learningSettings?.semester, semesterOverride);
  assert.equal(state.curriculumProfile?.semester, semesterOverride);
  assert.equal(state.curriculumProfile?.semesterOverride, semesterOverride);
  assert.equal(state.stars, 42);
  assert.equal(state.answerAttempts, 9);
  assert.deepEqual(state.attemptRecords, history.attemptRecords);
  assert.equal(state.learnerProfile?.startedAt, history.learnerProfile?.startedAt);
}

const repeated = updateLearningSettingsState(state, {}, date);
assert.deepEqual(repeated.parentSettings.learningSettings, state.parentSettings.learningSettings);
assert.equal(repeated.curriculumProfile?.detectedAt, state.curriculumProfile?.detectedAt);

const selectedUnit = updateLearningSettingsState(DEFAULT_GAME_STATE, {
  gradeBand: 'G2',
  learningSettings: {
    schemaVersion: 1, grade: 'G2', semester: 'upper', semesterSource: 'manual', textbookEdition: 'generic_cn',
    unitId: 'g2-u2', learnedTableRange: [2, 3, 5], dailyGoal: 5, challengePreference: 'guided',
  },
}, date);
const goalOnlyChange = updateLearningSettingsState(selectedUnit, { dailyGoal: 8 }, date);
assert.equal(goalOnlyChange.parentSettings.learningSettings?.unitId, 'g2-u2');
assert.deepEqual(goalOnlyChange.parentSettings.learningSettings?.learnedTableRange, [2, 3, 5]);
assert.equal(goalOnlyChange.parentSettings.learningSettings?.challengePreference, 'guided');
assert.equal(goalOnlyChange.parentSettings.learningSettings?.semesterSource, 'manual');
assert.equal(goalOnlyChange.parentSettings.semesterOverride, 'upper');
const autoAgain = updateLearningSettingsState(goalOnlyChange, { semesterOverride: undefined }, date);
assert.equal(autoAgain.parentSettings.learningSettings?.semester, 'upper');
assert.equal(autoAgain.parentSettings.learningSettings?.semesterSource, 'auto');
assert.equal(autoAgain.parentSettings.semesterOverride, undefined);
console.log('PASS G1/G2/G6 settings stay synchronized with profile and preserve learning history');
