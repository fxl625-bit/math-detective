import assert from 'node:assert/strict';
import { createSolvingEvidence, type SolvingEvidence } from '../../lib/independentSolving';
import { summarizeSolving } from '../../lib/solvingMetrics';
import { decideDifficultyIncrease } from '../../lib/learningMetrics';
import { getAccuracyStats } from '../../lib/storage';
import { isSolvingEvidence } from '../../lib/solvingValidation';
import { DEFAULT_GAME_STATE, type LearningEvent } from '../../lib/types';
import { buildLearnerProfile, initCurriculumProfile } from '../../lib/learnerProfile';

const independent = (): SolvingEvidence => ({ ...createSolvingEvidence(), phase: 'review',
  attemptCount: 1, firstAttemptCorrect: true, independentCorrect: true, finalCorrect: true,
  masteryStatus: 'independent', outcome: 'first_independent' });
const assisted = (): SolvingEvidence => ({ ...independent(), independentCorrect: false,
  hintCount: 1, maxHintLevel: 1, masteryStatus: 'assisted', outcome: 'hint_correct' });
function event(id: string, instance: string, type: LearningEvent['eventType'], evidence?: SolvingEvidence, extra: Partial<LearningEvent> = {}): LearningEvent {
  return {
    eventId: id, schemaVersion: 1, actionId: id, attemptId: id,
    childProfileId: 'metrics-child', deviceId: 'metrics-device', sessionId: 'metrics-session',
    lessonId: 'metrics-lesson', questionInstanceId: instance, questionId: instance,
    questionVersion: '1', skillIds: ['skill'], grade: 'G2', semester: 'upper', unitId: 'unit',
    eventType: type, timestamp: '2026-10-21T00:00:00Z', hintLevel: 'none',
    completionMode: 'independent', firstAttemptKnown: true, source: 'original',
    solvingEvidence: evidence, ...extra,
  };
}
const explanation: SolvingEvidence = { ...createSolvingEvidence(), phase: 'explanation',
  fullExplanationViewedBeforeSolve: true, outcome: 'explanation', guidedSolutionUsed: true };
const retry: SolvingEvidence = { ...independent(), firstAttemptCorrect: false, independentCorrect: false,
  attemptCount: 2, masteryStatus: 'assisted', outcome: 'retry_correct' };
const rows: LearningEvent[] = [
  event('i:a', 'i', 'attempt_submitted', independent(), { result: 'correct' }),
  event('i:c', 'i', 'question_completed', independent()),
  event('h:s', 'h', 'support_used', { ...assisted(), phase: 'help', attemptCount: 0, firstAttemptCorrect: null, finalCorrect: false, outcome: 'unresolved' }),
  event('h:a', 'h', 'attempt_submitted', assisted(), { result: 'correct', completionMode: 'assisted' }),
  event('h:c', 'h', 'question_completed', assisted(), { completionMode: 'assisted' }),
  event('e:e', 'e', 'explanation_viewed', explanation, { completionMode: 'needs_reinforcement' }),
  event('r:a', 'r', 'attempt_submitted', { ...createSolvingEvidence(), attemptCount: 1, firstAttemptCorrect: false }, { result: 'incorrect' }),
  event('r:b', 'r', 'attempt_submitted', retry, { result: 'correct', completionMode: 'assisted' }),
  event('r:c', 'r', 'question_completed', retry, { completionMode: 'assisted' }),
  event('old:c', 'old', 'question_completed'),
  event('t:a', 't', 'attempt_submitted', independent(), { result: 'correct', source: 'transfer', parentQuestionInstanceId: 'e' }),
  event('t:c', 't', 'transfer_completed', independent(), { source: 'transfer', parentQuestionInstanceId: 'e' }),
];
const summary = summarizeSolving(rows);
assert.equal(summary.resolved, 5);
assert.equal(summary.independent, 1);
assert.equal(summary.assisted, 2);
assert.equal(summary.needsReinforcement, 1);
assert.equal(summary.unknown, 1);
assert.equal(summary.independentRate, 1 / 4);
assert.equal(summary.finalCorrectRate, 3 / 4);
assert.equal(summary.transferInstances, 1);
assert.equal(summary.transferMasteryRate, 1);
assert.deepEqual(summarizeSolving([...rows, ...rows]), summary, 'Duplicate imports must not inflate mastery');
const stats = getAccuracyStats({ ...DEFAULT_GAME_STATE, learningEvents: rows });
assert.equal(stats.totalAttempts, 3, 'Transfer submissions do not enter original-question accuracy');
assert.equal(stats.correctAttempts, 2);
assert.equal(isSolvingEvidence({ ...independent(), fullExplanationViewedBeforeSolve: true }), false);
assert.equal(isSolvingEvidence({ ...independent(), hintCount: 1 }), false);
assert.equal(isSolvingEvidence(explanation), true);

function window(helped: boolean): LearningEvent[] {
  return Array.from({ length: 8 }, (_, index) => event(`w:${index}`, `w:${index}`, 'attempt_submitted', helped && index < 7 ? assisted() : independent(), {
    questionId: `variant:${index % 2}`, sessionId: `session:${index % 2}`,
    result: 'correct', hintLevel: helped && index < 7 ? 'light' : 'none',
    completionMode: helped && index < 7 ? 'assisted' : 'independent',
  }));
}
const params = { skillId: 'skill', currentDifficulty: 1, prerequisitesReady: true };
assert.equal(decideDifficultyIncrease({ ...params, events: window(true) }), null, 'Assisted perfect accuracy must not raise difficulty');
assert.ok(decideDifficultyIncrease({ ...params, events: window(false) }), 'Repeated independent success can raise difficulty');
const profileParams = {
  curriculumProfile: initCurriculumProfile({ grade: 2, semesterOverride: 'upper' }),
  attemptRecords: [], totalCompleted: 100, startedAt: '2026-08-01T00:00:00Z',
};
const unknownHistory = Array.from({ length: 30 }, (_, index) => event(`old:${index}`, `old:${index}`, 'question_completed'));
assert.equal(buildLearnerProfile({ ...profileParams, learningEvents: unknownHistory }).currentDifficultyLevel, 1,
  'A long successful legacy history with unknown help cannot automatically increase difficulty');
const knownHistory = Array.from({ length: 30 }, (_, index) => [
  event(`known:a:${index}`, `known:${index}`, 'attempt_submitted', independent(), { result: 'correct', timestamp: `2026-10-01T00:${String(index).padStart(2, '0')}:00Z` }),
  event(`known:c:${index}`, `known:${index}`, 'question_completed', independent(), { timestamp: `2026-10-01T00:${String(index).padStart(2, '0')}:01Z` }),
]).flat();
assert.ok(buildLearnerProfile({ ...profileParams, learningEvents: knownHistory }).currentDifficultyLevel > 1);
const recentAssisted = Array.from({ length: 30 }, (_, index) => [
  event(`recent:a:${index}`, `recent:${index}`, 'attempt_submitted', assisted(), { result: 'correct', timestamp: `2026-10-21T00:${String(index).padStart(2, '0')}:00Z` }),
  event(`recent:c:${index}`, `recent:${index}`, 'question_completed', assisted(), { timestamp: `2026-10-21T00:${String(index).padStart(2, '0')}:01Z` }),
]).flat();
const recentProfile = buildLearnerProfile({ ...profileParams, learningEvents: [...knownHistory, ...recentAssisted] });
assert.equal(recentProfile.recentAccuracy, 0, 'Old independent successes must not hide recent dependence on help');
assert.equal(recentProfile.currentDifficultyLevel, 1);
const storedProfile = { ...recentProfile, currentDifficultyLevel: 4 };
assert.equal(buildLearnerProfile({ ...profileParams, existingProfile: storedProfile, preserveDifficulty: true,
  learningEvents: unknownHistory }).currentDifficultyLevel, 4, 'Loading a legacy profile must preserve its stored difficulty');
console.log('Solving metrics, transfer separation, evidence validation and adaptive-help checks passed.');
