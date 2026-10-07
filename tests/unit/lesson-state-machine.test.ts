import assert from 'node:assert/strict';
import { checkAnswer } from '@/lib/answerChecker';
import {
  generateSafeFallbackLesson,
  getDefaultPhasesForStepType,
  normalizeLesson,
  safeNormalizeLesson,
  validateStepQuestionCompatibility,
} from '@/lib/lessonPlanner';
import { commitLessonTransaction } from '@/lib/lessonTransaction';
import { getQuestionById } from '@/data/questions';
import { DEFAULT_GAME_STATE, type LessonStep, type TodayLesson } from '@/lib/types';

function lessonFor(questionId: string, type: LessonStep['type'], phases = ['read', 'answer', 'explain'] as const): TodayLesson {
  return {
    date: '2026-06-05',
    currentStepIndex: 0,
    completed: false,
    rewardClaimed: false,
    rewardShown: false,
    steps: [{
      id: `step_${questionId}`,
      type,
      title: 'test step',
      description: 'test step',
      questionId,
      phases: [...phases],
      currentPhaseIndex: 1,
      status: 'current',
      requiresAnswer: true,
    }],
  };
}

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run('submit_answer correct advances exactly once', () => {
  const q = getQuestionById('g1_01')!;
  const lesson = lessonFor(q.id, 'full_solve');
  const result = commitLessonTransaction({
    state: { lesson, gameState: DEFAULT_GAME_STATE },
    action: 'submit_answer',
    payload: { questionId: q.id, inputAnswer: String(q.answer), actionId: 'unit-action-correct', attemptId: 'unit-attempt-correct' },
    source: 'unit',
  });
  assert.equal(result.advanced, true);
  assert.equal(result.fromPhaseIndex, 1);
  assert.equal(result.toPhaseIndex, 2);
  assert.equal(result.nextState.gameState.answerAttempts, 1);
  assert.equal(result.nextState.gameState.learningEvents?.filter(event => event.eventType === 'attempt_submitted').length, 1);
  assert.equal(result.nextState.gameState.learningEvents?.filter(event => event.eventType === 'question_completed').length, 1);
  const replay = commitLessonTransaction({
    state: { lesson, gameState: result.nextState.gameState }, action: 'submit_answer',
    payload: { questionId: q.id, inputAnswer: String(q.answer), actionId: 'unit-action-correct', attemptId: 'unit-attempt-correct' }, source: 'unit-replay',
  });
  assert.equal(replay.nextState.gameState.answerAttempts, 1);
  assert.equal(replay.reason, 'duplicate action ignored');
});

run('submit_answer wrong does not advance', () => {
  const q = getQuestionById('g1_01')!;
  const lesson = lessonFor(q.id, 'full_solve');
  const result = commitLessonTransaction({
    state: { lesson, gameState: DEFAULT_GAME_STATE },
    action: 'submit_answer',
    payload: { questionId: q.id, inputAnswer: '__wrong__' },
    source: 'unit',
  });
  assert.equal(result.advanced, false);
  assert.equal(result.toPhaseIndex, 1);
  assert.equal(result.nextState.gameState.answerAttempts, 1);
  assert.equal(result.nextState.gameState.learningEvents?.[0]?.result, 'incorrect');
});

run('identify_extra_info without extra numbers fails validation', () => {
  const q = getQuestionById('g1_01')!;
  const step = { type: 'spot_extra_info', questionId: q.id } as LessonStep;
  assert.match(validateStepQuestionCompatibility(step, q) || '', /extraNumbers/);
});

run('remove_noise with noise phrases can validate', () => {
  const q = getQuestionById('extra_01')!;
  const step = { type: 'remove_noise', questionId: q.id } as LessonStep;
  assert.equal(validateStepQuestionCompatibility(step, q), null);
});

run('pattern question never uses find_action_words phases', () => {
  const q = getQuestionById('g1t_03')!;
  assert.equal(validateStepQuestionCompatibility({ type: 'find_action_words', questionId: q.id } as LessonStep, q) !== null, true);
  assert.deepEqual(getDefaultPhasesForStepType('full_solve', q), ['read', 'find_numbers', 'understand_clues', 'answer', 'explain']);
});

run('multiplicative comparison does not enter find_action_words', () => {
  const q = getQuestionById('g1t_08')!;
  assert.equal(validateStepQuestionCompatibility({ type: 'find_action_words', questionId: q.id } as LessonStep, q) !== null, true);
});

run('safe fallback lesson has playable steps', () => {
  const lesson = generateSafeFallbackLesson('G1');
  assert.equal(lesson.steps.length >= 4, true);
  for (const step of lesson.steps) {
    const q = getQuestionById(step.questionId)!;
    assert.equal(validateStepQuestionCompatibility(step, q), null);
  }
});

run('legacy invalid step without unit provenance is surfaced without an unsafe cross-unit replacement', () => {
  const q = getQuestionById('g1t_03')!;
  assert.equal(checkAnswer(String(q.answer), q).correct, true);
  const bad = lessonFor(q.id, 'find_action_words');
  const normalized = safeNormalizeLesson(bad);
  assert.equal(normalized?.steps[0]?.type, 'find_action_words');
  assert.ok(normalized?.coreGapReasons?.length);
});

run('lesson normalization preserves generation metadata and reward gates', () => {
  const date = new Date();
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const lesson = {
    ...lessonFor('g1_01', 'full_solve'),
    date: today,
    generatedByVersion: '2.8.4',
    generatorVersion: 5,
    curriculumSnapshot: { grade: 2, semester: 'upper', usageStage: 1, currentDifficultyLevel: 2, singleDigitLimit: 2 },
    learnerProfileSnapshot: { totalCompleted: 4, recentAccuracy: 75, currentDifficultyLevel: 2 },
    rewardClaimed: true,
    rewardShown: true,
    rewardClaimedAt: '2026-09-28T00:00:00.000Z',
    completedAt: '2026-09-28T00:00:00.000Z',
    lessonId: 'stable-lesson-id',
    lessonSignature: 'stable-settings-signature',
    settingSnapshot: { grade: 'G2', semester: 'upper', unitId: 'g2-u1' },
    futureSignature: 'kept-for-forward-compatibility',
    steps: [{
      ...lessonFor('g1_01', 'full_solve').steps[0],
      role: 'application',
      skill: 'g1-u2:add-subtract-100',
      method: 'inverse',
      tier: 'practice',
      questionInstanceId: 'instance-1',
      settingSnapshot: { unitId: 'g1-u2' },
      awardedAt: '2026-09-28T00:00:00.000Z',
      awardedStars: 2,
    }],
  } as unknown as TodayLesson & Record<string, unknown>;

  for (const firstPass of [normalizeLesson(lesson), safeNormalizeLesson(lesson)]) {
    const normalized = safeNormalizeLesson(firstPass);
    assert.equal((normalized as any)?.generatedByVersion, '2.8.4');
    assert.equal((normalized as any)?.generatorVersion, 5);
    assert.deepEqual((normalized as any)?.curriculumSnapshot, lesson.curriculumSnapshot);
    assert.deepEqual((normalized as any)?.learnerProfileSnapshot, lesson.learnerProfileSnapshot);
    assert.equal(normalized?.rewardClaimed, true);
    assert.equal(normalized?.rewardShown, true);
    assert.equal(normalized?.rewardClaimedAt, lesson.rewardClaimedAt);
    assert.equal(normalized?.completedAt, lesson.completedAt);
    assert.equal((normalized as any)?.futureSignature, lesson.futureSignature);
    assert.equal((normalized as any)?.lessonId, lesson.lessonId);
    assert.equal((normalized as any)?.lessonSignature, lesson.lessonSignature);
    assert.deepEqual((normalized as any)?.settingSnapshot, lesson.settingSnapshot);
    assert.equal((normalized?.steps[0] as any)?.role, 'application');
    assert.equal((normalized?.steps[0] as any)?.skill, 'g1-u2:add-subtract-100');
    assert.equal((normalized?.steps[0] as any)?.questionInstanceId, 'instance-1');
    assert.equal(normalized?.steps[0]?.awardedAt, lesson.steps[0].awardedAt);
    assert.equal(normalized?.steps[0]?.awardedStars, 2);
  }

  const completed = safeNormalizeLesson({ ...lesson, completed: true });
  assert.equal((completed as any)?.curriculumSnapshot?.semester, 'upper');
  assert.equal(completed?.rewardClaimed, true);
});

run('legacy bad current question without unit provenance is surfaced rather than cross-unit substituted', () => {
  const q = getQuestionById('g1t_03')!;
  const original = lessonFor('g1_01', 'answer_only');
  const badCurrent = { ...lessonFor(q.id, 'find_action_words').steps[0], status: 'current' as const };
  const halfCourse: TodayLesson = {
    ...original,
    currentStepIndex: 1,
    rewardClaimed: true,
    rewardClaimedAt: '2026-09-28T00:00:00.000Z',
    steps: [
      { ...original.steps[0], status: 'completed', awardedAt: '2026-09-28T00:00:00.000Z', awardedStars: 2 },
      badCurrent,
    ],
  };
  const repaired = safeNormalizeLesson(halfCourse)!;
  assert.equal(repaired.steps.length, 2);
  assert.equal(repaired.steps[0].questionId, 'g1_01');
  assert.equal(repaired.steps[0].status, 'completed');
  assert.equal(repaired.steps[0].awardedStars, 2);
  assert.equal(repaired.steps[1].questionId, q.id);
  assert.ok(repaired.coreGapReasons?.some(reason => reason.includes('未知角色')));
  assert.equal(repaired.currentStepIndex, 1);
  assert.equal(repaired.rewardClaimed, true);
  assert.equal(repaired.rewardClaimedAt, halfCourse.rewardClaimedAt);
});

run('wrong attempt on an unsafe current item is replaced by same-unit same-role candidate and history stays', () => {
  const date = new Date();
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const originalWindow = (globalThis as any).window;
  const originalStorage = (globalThis as any).localStorage;
  const records = new Map<string, string>();
  const instanceId = 'g5-unsafe-instance';
  const wrongAttempt = {
    eventId: 'wrong-old-item', schemaVersion: 1, childProfileId: 'child', deviceId: 'device', sessionId: 's1',
    lessonId: 'g5-lesson', questionInstanceId: instanceId, questionId: 'g5o_32', questionVersion: 'v1',
    skillIds: [], grade: 'G5', semester: 'upper', unitId: 'g5-u4', role: 'olympiad',
    eventType: 'attempt_submitted', actionId: 'wrong-old-item', attemptId: 'wrong-old-item',
    timestamp: `${today}T10:00:00.000Z`, hintLevel: 'none', completionMode: 'independent', result: 'incorrect',
  };
  records.set('math-detective-state', JSON.stringify({ ...DEFAULT_GAME_STATE, learningEvents: [wrongAttempt] }));
  (globalThis as any).window = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => records.set(key, value),
    removeItem: (key: string) => records.delete(key),
  };
  try {
    const halfCourse = {
      ...lessonFor('g5o_32', 'answer_only'),
      date: today, lessonId: 'g5-lesson', settingSnapshot: { grade: 'G5', semester: 'upper', unitId: 'g5-u4' },
      currentStepIndex: 0, rewardClaimed: true,
      steps: [{
        ...lessonFor('g5o_32', 'answer_only').steps[0], role: 'olympiad' as const,
        questionInstanceId: instanceId, settingSnapshot: { grade: 'G5', semester: 'upper', unitId: 'g5-u4' },
      }],
    } as TodayLesson & Record<string, unknown>;
    const repaired = safeNormalizeLesson(halfCourse)!;
    assert.notEqual(repaired.steps[0].questionId, 'g5o_32');
    assert.equal(repaired.steps[0].role, 'olympiad');
    assert.equal(repaired.steps[0].settingSnapshot?.unitId, 'g5-u4');
    assert.notEqual(repaired.steps[0].questionInstanceId, instanceId);
    assert.equal(JSON.parse(records.get('math-detective-state')!).learningEvents[0].eventId, 'wrong-old-item');
    assert.equal(repaired.rewardClaimed, true);
  } finally {
    if (originalWindow === undefined) delete (globalThis as any).window; else (globalThis as any).window = originalWindow;
    if (originalStorage === undefined) delete (globalThis as any).localStorage; else (globalThis as any).localStorage = originalStorage;
  }
});
