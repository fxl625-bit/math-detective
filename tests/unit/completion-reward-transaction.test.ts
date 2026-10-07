import assert from 'node:assert/strict';
import { commitLessonTransaction } from '@/lib/lessonTransaction';
import { safeNormalizeLesson } from '@/lib/lessonPlanner';
import { DEFAULT_GAME_STATE, type GameState, type LearningEvent, type LessonStep, type TodayLesson } from '@/lib/types';

const roles: NonNullable<LessonStep['role']>[] = [
  'due_review', 'current_concept', 'same_skill_variant', 'application', 'stretch', 'olympiad',
];

function makeLesson(lessonId: string): TodayLesson {
  const awardedAt = new Date().toISOString();
  const steps: LessonStep[] = roles.map((role, index) => ({
    id: `step-${index}`,
    type: 'answer_only',
    title: `step ${index}`,
    description: `step ${index}`,
    questionId: 'g1_01',
    phases: ['answer', 'explain'],
    currentPhaseIndex: 0,
    status: index === roles.length - 1 ? 'current' : 'completed',
    requiresAnswer: true,
    awardedAt,
    awardedStars: 1,
    role,
    questionInstanceId: `${lessonId}:instance:${index}`,
    settingSnapshot: { grade: 'G1', semester: 'lower', unitId: 'g1-u1' },
  }));
  return {
    date: new Date().toISOString().slice(0, 10),
    lessonId,
    lessonSignature: 'unit-test-signature',
    settingSnapshot: { grade: 'G1', semester: 'lower', unitId: 'g1-u1' } as TodayLesson['settingSnapshot'],
    steps,
    currentStepIndex: steps.length - 1,
    completed: false,
    rewardClaimed: false,
    rewardShown: false,
  };
}

function makeAttemptEvents(lesson: TodayLesson, firstIncorrect = false): LearningEvent[] {
  return roles.map((role, index) => ({
    eventId: `attempt-${index}`,
    schemaVersion: 1,
    childProfileId: 'unit-child',
    deviceId: 'unit-device',
    sessionId: `session:${lesson.lessonId}`,
    lessonId: lesson.lessonId!,
    questionInstanceId: lesson.steps[index].questionInstanceId!,
    questionId: 'g1_01',
    questionVersion: 'unit-test',
    skillIds: [],
    grade: 'G1',
    semester: 'lower',
    unitId: 'g1-u1',
    role,
    eventType: 'attempt_submitted',
    actionId: `attempt-action-${index}`,
    attemptId: `attempt-id-${index}`,
    timestamp: new Date(Date.now() - 5_000 + index).toISOString(),
    hintLevel: 'none',
    completionMode: 'independent',
    result: firstIncorrect && index === 0 ? 'incorrect' : 'correct',
    firstAttemptKnown: true,
  }));
}

function makeState(lesson: TodayLesson, firstIncorrect = false): { lesson: TodayLesson; gameState: GameState } {
  return {
    lesson,
    gameState: {
      ...structuredClone(DEFAULT_GAME_STATE),
      childProfileId: 'unit-child',
      deviceId: 'unit-device',
      pointsWallet: { schemaVersion: 1, initializedAt: '2020-01-01T00:00:00.000Z', ledger: [], redemptions: [] },
      learningEvents: makeAttemptEvents(lesson, firstIncorrect),
    },
  };
}

function complete(state: { lesson: TodayLesson; gameState: GameState }) {
  return commitLessonTransaction({ state, action: 'complete_step', payload: {}, source: 'completion-reward-unit' });
}

const perfectLesson = makeLesson('perfect-completion-unit');
const completed = complete(makeState(perfectLesson));
assert.equal(completed.nextLesson.completed, true);
assert.equal(completed.nextLesson.rewardClaimed, true);
assert.equal(completed.nextLesson.rewardShown, true);
for (const timestamp of [completed.nextLesson.rewardClaimedAt, completed.nextLesson.rewardShownAt, completed.nextLesson.completedAt]) {
  assert.ok(timestamp && Number.isFinite(Date.parse(timestamp)), 'completion and legacy reward markers must use parseable ISO timestamps');
  assert.match(timestamp!, /^\d{4}-\d{2}-\d{2}T.*Z$/);
}
assert.deepEqual(completed.nextState.gameState.lastCommittedLesson, completed.nextLesson, 'the recoverable snapshot must contain the same marked lesson');
assert.equal(completed.nextState.gameState.pointsWallet?.ledger.filter(entry => entry.type === 'perfect_lesson').length, 1);

const reloaded = safeNormalizeLesson(completed.nextState.gameState.lastCommittedLesson)!;
assert.equal(reloaded.rewardClaimed, true);
assert.equal(reloaded.rewardShown, true);
assert.equal(reloaded.rewardClaimedAt, completed.nextLesson.rewardClaimedAt);
assert.equal(reloaded.rewardShownAt, completed.nextLesson.rewardShownAt);
const replayed = complete({ lesson: reloaded, gameState: completed.nextState.gameState });
assert.equal(replayed.nextState.gameState.pointsWallet?.ledger.filter(entry => entry.type === 'perfect_lesson').length, 1, 'reload/replay must not duplicate the points grant');

const notPerfect = complete(makeState(makeLesson('non-perfect-completion-unit'), true));
assert.equal(notPerfect.nextLesson.rewardClaimed, true, 'legacy completion marker remains set even without perfect-first-answer points');
assert.equal(notPerfect.nextLesson.rewardShown, true);
assert.equal(notPerfect.nextState.gameState.pointsWallet?.ledger.filter(entry => entry.type === 'perfect_lesson').length, 0);

console.log('PASS completion reward transaction: atomic legacy flags, snapshot recovery, and idempotent points');
