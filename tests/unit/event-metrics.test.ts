import assert from 'node:assert/strict';
import { decideDifficultyIncrease, reduceLearningMetrics } from '@/lib/learningMetrics';
import type { LearningEvent } from '@/lib/types';
import { createSolvingEvidence, type SolvingEvidence } from '@/lib/independentSolving';

const independent = (): SolvingEvidence => ({ ...createSolvingEvidence(), phase: 'review', attemptCount: 1,
  firstAttemptCorrect: true, independentCorrect: true, finalCorrect: true,
  masteryStatus: 'independent', outcome: 'first_independent' });

function evt(input: Partial<LearningEvent> & Pick<LearningEvent, 'eventId' | 'eventType' | 'questionInstanceId'>): LearningEvent {
  return {
    schemaVersion: 1, childProfileId: 'child', deviceId: 'device', sessionId: 'session-a',
    lessonId: 'lesson', questionId: 'q', questionVersion: 'v1', skillIds: ['math:add'],
    actionId: input.eventId, attemptId: input.eventId, timestamp: '2026-09-28T00:00:00.000Z',
    hintLevel: 'none', completionMode: 'independent', ...input,
  };
}

const metrics = Object.values(reduceLearningMetrics([
  evt({ eventId: 'z-wrong', eventType: 'attempt_submitted', questionInstanceId: 'instance-1', result: 'incorrect' }),
  evt({ eventId: 'a-correct', eventType: 'attempt_submitted', questionInstanceId: 'instance-1', result: 'correct' }),
  evt({ eventId: 'complete-assisted', eventType: 'question_completed', questionInstanceId: 'instance-1', completionMode: 'assisted', hintLevel: 'full' }),
  evt({ eventId: 'second-first', eventType: 'attempt_submitted', questionInstanceId: 'instance-2', result: 'correct', questionVersion: 'v2', solvingEvidence: independent() }),
  evt({ eventId: 'second-complete', eventType: 'question_completed', questionInstanceId: 'instance-2', completionMode: 'independent', solvingEvidence: independent() }),
  evt({ eventId: 'legacy', eventType: 'legacy_snapshot', questionInstanceId: 'legacy-1', firstAttemptKnown: false, result: 'correct' }),
])).find(metric => metric.skillId === 'math:add')!;
assert.equal(metrics.firstAnswerCount, 2);
assert.equal(metrics.firstCorrectCount, 1);
assert.equal(metrics.firstTryAccuracy, 0.5);
assert.equal(metrics.assistedCompletions, 1);
assert.equal(metrics.independentCompletions, 1);
assert.equal(metrics.fullHintCompletions, 1);

const evidence = Array.from({ length: 8 }, (_, index) => evt({
  eventId: `e${index}`, eventType: 'attempt_submitted', questionInstanceId: `inst-${index}`,
  sessionId: `session-${index % 2}`, questionVersion: `qv-${index % 3}`,
  result: index === 0 ? 'incorrect' : 'correct', timestamp: `2026-09-${String(10 + index).padStart(2, '0')}T00:00:00.000Z`,
  solvingEvidence: index === 0 ? { ...createSolvingEvidence(), attemptCount: 1, firstAttemptCorrect: false } : independent(),
}));
const hint = evt({ eventId: 'full-hint', eventType: 'hint_used', questionInstanceId: 'inst-0', hintLevel: 'full' });
const decision = decideDifficultyIncrease({ events: [...evidence, hint], skillId: 'math:add', currentDifficulty: 2, prerequisitesReady: true });
assert.equal(decision?.to, 3);
assert.equal(decideDifficultyIncrease({ events: [...evidence, hint], skillId: 'math:add', currentDifficulty: 2, prerequisitesReady: true, consumedWindowIds: [decision!.evidenceWindowId] }), null);
assert.equal(decideDifficultyIncrease({ events: [...evidence, hint], skillId: 'math:add', currentDifficulty: 2, prerequisitesReady: true, consumedEventIds: decision!.consumedEventIds }), null);
const repeatedHints = [...evidence, hint, evt({ eventId: 'full-hint-repeat', eventType: 'hint_used', questionInstanceId: 'inst-0', hintLevel: 'full' })];
const repeatedHintDecision = decideDifficultyIncrease({ events: repeatedHints, skillId: 'math:add', currentDifficulty: 2, prerequisitesReady: true });
assert.equal(repeatedHintDecision?.fullHintRate, 1 / 8);
assert.equal(decideDifficultyIncrease({ events: [...evidence, ...Array.from({ length: 7 }, (_, index) => evt({
  eventId: `new-${index}`, eventType: 'attempt_submitted', questionInstanceId: `new-inst-${index}`,
  timestamp: `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`, result: 'correct', questionVersion: `new-v${index % 2}`,
  solvingEvidence: independent(),
}))], skillId: 'math:add', currentDifficulty: 2, prerequisitesReady: true, consumedEventIds: decision!.consumedEventIds }), null);
assert.equal(decideDifficultyIncrease({ events: evidence, skillId: 'math:add', currentDifficulty: 2, prerequisitesReady: false }), null);
const lowAccuracy = evidence.map((event, index) => index > 1 ? { ...event, result: 'incorrect' as const } : event);
assert.equal(decideDifficultyIncrease({ events: lowAccuracy, skillId: 'math:add', currentDifficulty: 2, prerequisitesReady: true }), null);
const weakOpening = evidence.map((event, index) => ({
  ...event,
  grade: 'G6' as const,
  unitId: 'g6-u1',
  result: index < 6 ? 'incorrect' as const : 'correct' as const,
}));
const strongRecent = Array.from({ length: 8 }, (_, index) => evt({
  eventId: `recent-${index}`, eventType: 'attempt_submitted', questionInstanceId: `recent-instance-${index}`,
  grade: 'G6', unitId: 'g6-u1', role: index % 2 ? 'stretch' : 'current_concept',
  sessionId: `g6-session-${index % 2}`, questionId: `g6-q-${index % 3}`, questionVersion: `v${index % 2}`,
  result: 'correct', timestamp: `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
  solvingEvidence: independent(),
}));
const laterRetryOfOldInstance = evt({
  eventId: 'old-instance-retry', eventType: 'attempt_submitted', questionInstanceId: 'inst-0',
  grade: 'G6', unitId: 'g6-u1', questionId: 'q', result: 'correct', timestamp: '2026-10-30T00:00:00.000Z',
});
const recoveredDecision = decideDifficultyIncrease({
  events: [...weakOpening, ...strongRecent, laterRetryOfOldInstance], skillId: 'math:add',
  currentDifficulty: 1, prerequisitesReady: true, grade: 'G6', unitId: 'g6-u1',
});
assert.ok(recoveredDecision, 'a later healthy window can advance after a weak opening window');
assert.equal(recoveredDecision!.to, 2);
assert.equal(recoveredDecision!.consumedEventIds.some(id => id === 'old-instance-retry'), false,
  'a retry never becomes a new first answer for an already-seen instance');
const legacyWithoutEvidence = evidence.map(event => { const copy = { ...event }; delete copy.solvingEvidence; return copy; });
assert.equal(decideDifficultyIncrease({ events: legacyWithoutEvidence, skillId: 'math:add', currentDifficulty: 2, prerequisitesReady: true }), null,
  'an old independent label does not manufacture independent solving evidence');
assert.equal(decideDifficultyIncrease({ events: [...evidence, hint, evt({ eventId: 'extra-supported', eventType: 'hint_used', questionInstanceId: 'inst-1', hintLevel: 'light' })], skillId: 'math:add', currentDifficulty: 2, prerequisitesReady: true }), null,
  'high first-answer accuracy alone is insufficient when independently correct answers fall below 80 percent');
console.log('PASS event metrics use first answer per question instance and versioned promotion evidence');
