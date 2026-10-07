import assert from 'node:assert/strict';
import { appendUniqueEvent, createLearningEvent, wrapLegacyAttempts } from '@/lib/learningEvents';
import type { LearningEventInput } from '@/lib/learningEvents';

const base: LearningEventInput = {
  eventId: 'action-a:attempt_submitted',
  childProfileId: 'local-child-test', deviceId: 'local-device-test', sessionId: 'session-1',
  lessonId: 'lesson-1', questionInstanceId: 'lesson-1:0:q1', questionId: 'q1', questionVersion: 'v1',
  skillIds: ['addition:within-10'], eventType: 'attempt_submitted', actionId: 'action-a', attemptId: 'attempt-a',
  timestamp: '2026-09-28T04:00:00.000Z', hintLevel: 'none', completionMode: 'independent', result: 'incorrect',
};

const first = appendUniqueEvent([], base);
assert.equal(first.accepted, true);
if (!first.accepted) throw new Error('expected event acceptance');
const duplicate = appendUniqueEvent(first.events, { ...base, skillIds: [...base.skillIds] });
assert.equal(duplicate.accepted, false);
if (!duplicate.accepted) assert.equal(duplicate.reason, 'duplicate');
const conflict = appendUniqueEvent(first.events, { ...base, result: 'correct' });
assert.equal(conflict.accepted, false);
if (!conflict.accepted) assert.equal(conflict.reason, 'id_conflict');

const corrected = appendUniqueEvent(first.events, {
  ...base, eventId: 'action-b:attempt_submitted', actionId: 'action-b', attemptId: 'attempt-b',
  timestamp: '2026-09-28T04:01:00.000Z', result: 'correct',
});
assert.equal(corrected.accepted, true);
if (!corrected.accepted) throw new Error('expected corrected attempt acceptance');
assert.equal(corrected.events.length, 2);
assert.deepEqual(corrected.events.map(event => event.result), ['incorrect', 'correct']);

const sameQuestionNextLesson = appendUniqueEvent(corrected.events, {
  ...base, eventId: 'action-c:attempt_submitted', actionId: 'action-c', attemptId: 'attempt-c',
  lessonId: 'lesson-2', questionInstanceId: 'lesson-2:0:q1', timestamp: '2026-09-29T04:00:00.000Z', result: 'correct',
});
assert.equal(sameQuestionNextLesson.accepted, true);
if (!sameQuestionNextLesson.accepted) throw new Error('expected next lesson attempt acceptance');
assert.equal(sameQuestionNextLesson.events.length, 3);

assert.equal(createLearningEvent({ ...base, timestamp: 'not-a-date' }), null);
assert.equal(createLearningEvent({ ...base, durationMs: Number.POSITIVE_INFINITY }), null);
const supportEvent = appendUniqueEvent([], {
  ...base, eventId: 'support:instance-1:concept_lab:tiles', eventType: 'support_used',
  actionId: 'support:instance-1:concept_lab:tiles', attemptId: 'support:instance-1',
  result: undefined,
});
assert.equal(supportEvent.accepted, true, 'support events are part of the validated event schema');
const legacy = wrapLegacyAttempts([
  { questionId: 'q1', isCorrect: false, submittedAt: '2026-09-27T00:00:00.000Z', attemptType: 'final_answer' },
], { childProfileId: 'local-child-test', deviceId: 'local-device-test' });
assert.equal(legacy[0].eventType, 'legacy_snapshot');
assert.equal(legacy[0].firstAttemptKnown, false);
assert.equal(legacy[0].completionMode, 'legacy_unknown');
console.log('PASS event append is idempotent, conflict-safe, question-instance scoped, and legacy-safe');
