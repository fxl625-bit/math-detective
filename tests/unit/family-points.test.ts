import assert from 'node:assert/strict';
import { addParentPoints, claimCheckin, ensurePointsState, getPointsBalance, getPointsLedger, grantPerfectLessonPoints, isValidPointsWallet, requestReward, resolveRedemption } from '@/lib/familyPoints';
import { DEFAULT_GAME_STATE, type GameState, type LearningEvent, type TodayLesson } from '@/lib/types';

const now = new Date(2026, 8, 29, 12, 0, 0);
const initializedAt = new Date(2026, 8, 1, 12, 0, 0).toISOString();

function state(patch: Partial<GameState> = {}): GameState {
  return {
    ...DEFAULT_GAME_STATE,
    stars: 123,
    level: 4,
    decorations: ['old-equipped'],
    unlockedAvatarItemIds: ['old-owned'],
    pointsWallet: { schemaVersion: 1, initializedAt, ledger: [], redemptions: [] },
    ...patch,
  };
}

function lesson(): TodayLesson {
  const roles = ['due_review', 'current_concept', 'same_skill_variant', 'application', 'stretch', 'olympiad'] as const;
  return {
    date: '2026-09-29',
    lessonId: 'lesson-six',
    steps: roles.map((role, index) => ({
      id: `s${index}`, type: 'answer_only', title: '', description: '', questionId: `q${index}`,
      phases: ['answer', 'explain'], currentPhaseIndex: 1, status: 'completed', requiresAnswer: true,
      role, questionInstanceId: `lesson-six:instance:${index}`,
    })),
    currentStepIndex: 6,
    completed: true,
  };
}

function answerEvent(instance: string, correct: boolean, at: string): LearningEvent {
  return {
    eventId: `${instance}:${at}`, schemaVersion: 1, childProfileId: 'child', deviceId: 'device', sessionId: 'session',
    lessonId: 'lesson-six', questionInstanceId: instance, questionId: instance, questionVersion: '1', skillIds: [],
    grade: 'G1', semester: 'upper', unitId: 'u1', role: 'current_concept', eventType: 'attempt_submitted',
    actionId: `${instance}:${at}`, attemptId: `${instance}:${at}`, timestamp: at, hintLevel: 'none',
    completionMode: 'independent', result: correct ? 'correct' : 'incorrect', firstAttemptKnown: true,
  };
}

function run(name: string, test: () => void) {
  test();
  console.log(`PASS ${name}`);
}

run('legacy stars clear once without losing learning level or owned cosmetics', () => {
  const migrated = ensurePointsState(state());
  assert.equal(migrated.stars, 0);
  assert.equal(migrated.level, 4);
  assert.deepEqual(migrated.decorations, ['old-equipped']);
  assert.deepEqual(migrated.unlockedAvatarItemIds, ['old-owned']);
  assert.equal(getPointsBalance(migrated), 0);
  const later = ensurePointsState({ ...migrated, pointsWallet: { ...migrated.pointsWallet!, ledger: [
    { id: 'grant', actionId: 'grant', type: 'parent_grant', unitsDelta: 3, category: 'school', note: 'A+', createdAt: now.toISOString() },
  ] } });
  assert.equal(getPointsBalance(later), 1.5, 'later earned points survive ensure/migration');
});

run('check-in pays one half point once in the local day', () => {
  const first = claimCheckin(state(), now);
  assert.equal(first.ok, true);
  assert.equal(first.pointsDelta, 0.5);
  assert.equal(getPointsBalance(first.state), 0.5);
  const second = claimCheckin(first.state, now);
  assert.equal(second.pointsDelta, 0);
  assert.equal(getPointsBalance(second.state), 0.5);
  assert.equal(second.state.pointsWallet?.ledger.length, 1);
});

run('parent grants are half-point exact, capped, and action IDs reject conflicts', () => {
  const one = addParentPoints(state(), { actionId: 'homework-1', amount: 2.5, category: 'homework', note: 'A+' }, now);
  assert.equal(one.ok, true);
  assert.equal(getPointsBalance(one.state), 2.5);
  const duplicate = addParentPoints(one.state, { actionId: 'homework-1', amount: 2.5, category: 'homework', note: 'A+' }, now);
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.pointsDelta, 0);
  const conflict = addParentPoints(one.state, { actionId: 'homework-1', amount: 3, category: 'homework', note: 'A+' }, now);
  assert.equal(conflict.ok, false);
  assert.equal(addParentPoints(one.state, { actionId: 'too-much', amount: 1000.5, category: 'other', note: '' }, now).ok, false);
  assert.equal(addParentPoints(one.state, { actionId: 'fractional', amount: 0.25, category: 'other', note: '' }, now).ok, false);
});

run('15-point request debits once; pending confirmation does not debit and cancellation refunds once', () => {
  const funded = addParentPoints(state(), { actionId: 'grant-15', amount: 15, category: 'chores', note: '家务' }, now).state;
  const requested = requestReward(funded, { actionId: 'reward-1', rewardName: '家庭奖励' }, now);
  assert.equal(requested.ok, true);
  assert.equal(getPointsBalance(requested.state), 0);
  assert.equal(requested.state.pointsWallet?.redemptions[0]?.status, 'pending');
  const duplicate = requestReward(requested.state, { actionId: 'reward-1', rewardName: '家庭奖励' }, now);
  assert.equal(duplicate.pointsDelta, 0);
  const confirmed = resolveRedemption(requested.state, { id: 'reward-1', status: 'confirmed' }, now);
  assert.equal(getPointsBalance(confirmed.state), 0);
  assert.equal(resolveRedemption(confirmed.state, { id: 'reward-1', status: 'cancelled' }, now).ok, false);

  const secondFund = addParentPoints(requested.state, { actionId: 'grant-2', amount: 15, category: 'school', note: '表扬' }, now).state;
  const secondRequest = requestReward(secondFund, { actionId: 'reward-2', rewardName: '书' }, now).state;
  const cancelled = resolveRedemption(secondRequest, { id: 'reward-2', status: 'cancelled' }, now);
  assert.equal(cancelled.pointsDelta, 15);
  assert.equal(getPointsBalance(cancelled.state), 15);
  const repeated = resolveRedemption(cancelled.state, { id: 'reward-2', status: 'cancelled' }, now);
  assert.equal(repeated.pointsDelta, 0);
  assert.equal(getPointsBalance(repeated.state), 15);
  assert.equal(isValidPointsWallet(repeated.state.pointsWallet), true);
});

run('only a newly evidenced perfect six-role lesson pays once and never pays again next day', () => {
  const l = lesson();
  const at = now.toISOString();
  let s = state({ learningEvents: l.steps.map(step => answerEvent(step.questionInstanceId!, true, at)) });
  s.learningEvents = [...s.learningEvents!, {
    ...answerEvent('lesson-six:completion', true, at), eventType: 'lesson_completed', result: 'completed',
  }];
  const granted = grantPerfectLessonPoints(s, l, now);
  assert.equal(granted.ok, true);
  assert.equal(granted.pointsDelta, 1);
  assert.equal(getPointsBalance(granted.state), 1);
  assert.equal(grantPerfectLessonPoints(granted.state, l, now).pointsDelta, 0);
  const tomorrow = new Date(2026, 8, 30, 12, 0, 0);
  assert.equal(grantPerfectLessonPoints(granted.state, l, tomorrow).pointsDelta, 0);

  const wrongFirst = { ...s, learningEvents: [
    answerEvent(l.steps[0].questionInstanceId!, false, new Date(now.getTime() - 1000).toISOString()),
    answerEvent(l.steps[0].questionInstanceId!, true, at),
    ...s.learningEvents!.filter(event => event.questionInstanceId !== l.steps[0].questionInstanceId),
  ] };
  assert.equal(grantPerfectLessonPoints(wrongFirst, l, now).pointsDelta, 0);
});

run('malformed or duplicate wallet rows are rejected instead of changing balance', () => {
  const base = state();
  const valid = addParentPoints(base, { actionId: 'same', amount: 1, category: 'other', note: '' }, now).state.pointsWallet!;
  assert.equal(isValidPointsWallet(valid), true);
  assert.equal(isValidPointsWallet({ ...valid, ledger: [...valid.ledger, valid.ledger[0]] }), false);
  const negative = addParentPoints(base, { actionId: 'seed', amount: 1, category: 'other', note: '' }, now).state;
  const bad = { ...negative, pointsWallet: { ...negative.pointsWallet!, ledger: [
    { id: 'fake', actionId: 'fake', type: 'redemption', unitsDelta: -30, referenceId: 'missing', rewardName: 'bad', createdAt: now.toISOString() },
  ] } };
  assert.equal(isValidPointsWallet(bad.pointsWallet), false);
  assert.deepEqual(getPointsLedger(base), []);
});
