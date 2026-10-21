import assert from 'node:assert/strict';
import { allQuestions, getQuestionById } from '@/data/questions';
import { progressionQuestions, questionLearningMetadata } from '@/data/questions/progression';
import { DEFAULT_GAME_STATE, type LearningProfile, type LessonStep, type TodayLesson } from '@/lib/types';
import { buildReasoningTasks, createSolvingEvidence, selectTransferQuestion } from '@/lib/independentSolving';
import { commitLessonTransaction } from '@/lib/lessonTransaction';
import { appendUniqueEvent } from '@/lib/learningEvents';
import { buildDailyLesson, generateSafeFallbackLesson, getDefaultPhasesForStepType, hasLessonStarted, normalizeStep } from '@/lib/lessonPlanner';

function makeLesson(questionId: string, instance = 'runtime-instance'): TodayLesson {
  const q = getQuestionById(questionId)!;
  const step: LessonStep = {
    id: `step-${questionId}`, type: 'answer_only', title: '答题', description: '独立尝试', questionId,
    phases: getDefaultPhasesForStepType('answer_only', q), currentPhaseIndex: 0, status: 'current', requiresAnswer: true,
    questionInstanceId: instance,
  };
  return { date: '2026-10-21', lessonId: `lesson-${instance}`, steps: [step], currentStepIndex: 0, completed: false };
}

function act(lesson: TodayLesson, gameState: typeof DEFAULT_GAME_STATE, action: Parameters<typeof commitLessonTransaction>[0]['action'], payload: Record<string, unknown>) {
  return commitLessonTransaction({ state: { lesson, gameState }, action, payload, source: 'independent-solving-test' });
}

const helpQuestion = allQuestions.find(q => buildReasoningTasks(q).length > 0)!;
assert.ok(helpQuestion, 'fixture needs a question with at least one generated reasoning task');

{
  const sourceId = 'prog_g2_u1_03';
  const settings = { schemaVersion: 1 as const, grade: 'G2' as const, semester: 'upper' as const,
    semesterSource: 'manual' as const, textbookEdition: 'generic_cn' as const,
    unitId: 'g2-u1', learnedTableRange: [3, 5], dailyGoal: 6, challengePreference: 'balanced' as const };
  for (const manualUnit of [true, false]) for (const [rows, expected] of [[[3, 5], 'deferred'], [[2, 4], 'pending']] as const) {
    const gameState = { ...DEFAULT_GAME_STATE, parentSettings: { ...DEFAULT_GAME_STATE.parentSettings,
      gradeBand: 'G2' as const, learningSettings: { ...settings, unitId: manualUnit ? settings.unitId : null, learnedTableRange: [...rows] } } };
    const lesson = makeLesson(sourceId, `table-scope-${expected}`);
    lesson.settingSnapshot = { ...settings, learnedTableRange: [...rows] };
    const reveal = act(lesson, gameState, 'reveal_explanation', { questionId: sourceId, actionId: `table-reveal-${expected}` });
    const start = act(reveal.nextLesson, reveal.nextState.gameState, 'start_transfer', { questionId: sourceId, actionId: `table-start-${expected}` });
    assert.equal(start.nextLesson.steps[0].transfer?.status, expected, 'the actual transaction must enforce the variant factors against the current parent settings');
    assert.equal(start.nextLesson.steps[0].solving?.independentCorrect, false);
  }
}

{
  const lesson = makeLesson(helpQuestion.id, 'answer-gate');
  const skipped = act(lesson, DEFAULT_GAME_STATE, 'go_next', { questionId: helpQuestion.id });
  assert.equal(skipped.changed, false);
  assert.equal(skipped.nextLesson.currentStepIndex, 0);
  assert.equal(skipped.nextState.gameState.answerAttempts, 0);
}

{
  const legacy = normalizeStep({ id: 'old-unanswered', type: 'full_solve', questionId: helpQuestion.id, currentPhaseIndex: 4 });
  assert.deepEqual(legacy.phases, ['answer', 'explain']);
  assert.equal(legacy.currentPhaseIndex, 0);
  assert.equal(normalizeStep({ id: 'old-answered', type: 'full_solve', questionId: helpQuestion.id,
    currentPhaseIndex: 4, awardedAt: '2026-10-20T00:00:00.000Z' }).currentPhaseIndex, 1);
  assert.equal(legacy.solving?.firstAttemptCorrect, null);
  for (const solving of [undefined, createSolvingEvidence()]) {
    const future = normalizeStep({ id: 'legacy-locked-future', type: 'find_numbers', questionId: helpQuestion.id,
      status: 'locked', phases: ['read', 'find_numbers', 'answer', 'explain'], currentPhaseIndex: 0, solving });
    assert.deepEqual(future.phases, ['answer', 'explain'], 'Unanswered locked legacy slots also need migration before they become current');
    assert.equal(future.status, 'locked');
    assert.equal(future.solving?.independentCorrect, false);
  }
}

{
  const lesson = { ...makeLesson(helpQuestion.id, 'legacy-attempt'), steps: [{
    ...makeLesson(helpQuestion.id, 'legacy-attempt').steps[0],
    phases: ['read', 'choose_operation', 'answer', 'explain'] as LessonStep['phases'], currentPhaseIndex: 2,
  }] };
  const seeded = appendUniqueEvent([], {
    childProfileId: 'child', deviceId: 'device', sessionId: 'legacy-session', lessonId: lesson.lessonId!,
    questionInstanceId: 'legacy-attempt', questionId: helpQuestion.id, questionVersion: 'unknown', skillIds: [],
    eventType: 'attempt_submitted', actionId: 'legacy-wrong', attemptId: 'legacy-wrong', timestamp: '2026-10-20T10:00:00.000Z',
    hintLevel: 'none', completionMode: 'legacy_unknown', result: 'incorrect', firstAttemptKnown: true,
  });
  assert.equal(seeded.accepted, true);
  const resumed = act(lesson, { ...DEFAULT_GAME_STATE, learningEvents: seeded.events }, 'submit_answer', {
    questionId: helpQuestion.id, inputAnswer: String(helpQuestion.answer), actionId: 'legacy-retry',
  });
  assert.equal(resumed.nextLesson.steps[0].solving?.firstAttemptCorrect, false);
  assert.equal(resumed.nextLesson.steps[0].solving?.outcome, 'retry_correct');
  assert.equal(resumed.nextLesson.steps[0].solving?.masteryStatus, 'assisted');
  assert.equal(resumed.nextState.gameState.learningEvents?.find(event => event.eventType === 'question_completed')?.completionMode, 'assisted',
    'Retry completion must carry assisted mode into per-skill metrics as well as solving evidence');
}

{
  for (const legacyIndex of [0, 1, 2]) {
    const base = makeLesson(helpQuestion.id, `legacy-phase-${legacyIndex}`);
    const legacyLesson = { ...base, steps: [{ ...base.steps[0], phases: ['read', 'choose_operation', 'answer', 'explain'] as LessonStep['phases'], currentPhaseIndex: legacyIndex }] };
    const result = act(legacyLesson, DEFAULT_GAME_STATE, 'submit_answer', {
      questionId: helpQuestion.id, inputAnswer: String(helpQuestion.answer), actionId: `legacy-phase-submit-${legacyIndex}`,
    });
    assert.equal(result.toPhase, 'explain');
    assert.equal(result.toPhaseIndex, 1);
    assert.ok(result.nextLesson.steps[0].awardedAt);
  }
}

{
  const lesson = makeLesson(helpQuestion.id, 'help-idempotency');
  const help = act(lesson, DEFAULT_GAME_STATE, 'request_help', { questionId: helpQuestion.id, actionId: 'help-once' });
  assert.equal(help.changed, true);
  assert.equal(help.nextLesson.steps[0].solving?.hintCount, 1);
  const replay = act(help.nextLesson, help.nextState.gameState, 'request_help', { questionId: helpQuestion.id, actionId: 'help-once' });
  assert.equal(replay.changed, false);
  assert.equal(replay.nextLesson.steps[0].solving?.hintCount, 1);
  const task = buildReasoningTasks(helpQuestion)[0];
  const wrongValue = task.options.find(option => option.id !== task.correctOptionId)!.id;
  const wrongTask = act(help.nextLesson, help.nextState.gameState, 'submit_help_task', {
    questionId: helpQuestion.id, taskId: task.id, value: wrongValue, actionId: 'help-task-wrong',
  });
  assert.equal(wrongTask.helpFeedback?.correct, false);
  assert.ok(wrongTask.helpFeedback?.scaffold);
  assert.equal(wrongTask.nextLesson.steps[0].solving?.helpWrongCount, 1);
  const solvedTask = act(wrongTask.nextLesson, wrongTask.nextState.gameState, 'submit_help_task', {
    questionId: helpQuestion.id, taskId: task.id, value: task.correctOptionId, actionId: 'help-task-once',
  });
  assert.equal(solvedTask.nextLesson.steps[0].solving?.helpTaskIndex, 1);
  const taskReplay = act(solvedTask.nextLesson, solvedTask.nextState.gameState, 'submit_help_task', {
    questionId: helpQuestion.id, taskId: task.id, value: task.correctOptionId, actionId: 'help-task-once',
  });
  assert.equal(taskReplay.changed, false);
  assert.equal(taskReplay.nextLesson.steps[0].solving?.helpTaskIndex, 1);
}

{
  const lesson = makeLesson(helpQuestion.id, 'help-after-wrong-answer');
  const requested = act(lesson, DEFAULT_GAME_STATE, 'request_help', { questionId: helpQuestion.id, actionId: 'restore-help-first' });
  const wrongOriginal = act(requested.nextLesson, requested.nextState.gameState, 'submit_answer', {
    questionId: helpQuestion.id, inputAnswer: '__wrong__', actionId: 'wrong-after-help',
  });
  assert.equal(wrongOriginal.nextLesson.steps[0].solving?.phase, 'help');
  assert.equal(hasLessonStarted(wrongOriginal.nextLesson), true, 'A wrong phase-zero attempt must preserve the current course');
  const reopened = act(wrongOriginal.nextLesson, wrongOriginal.nextState.gameState, 'request_help', {
    questionId: helpQuestion.id, actionId: 'restore-help-again',
  });
  assert.equal(reopened.nextLesson.steps[0].solving?.phase, 'help');
  assert.equal(reopened.nextLesson.steps[0].solving?.hintCount, 1);
  const task = buildReasoningTasks(helpQuestion)[0];
  const taskResult = act(reopened.nextLesson, reopened.nextState.gameState, 'submit_help_task', {
    questionId: helpQuestion.id, taskId: task.id, value: task.correctOptionId, actionId: 'task-after-wrong-answer',
  });
  assert.equal(taskResult.nextLesson.steps[0].solving?.helpTaskIndex, 1);
}

{
  const lesson = makeLesson(helpQuestion.id, 'explanation-lock');
  const reveal = act(lesson, DEFAULT_GAME_STATE, 'reveal_explanation', { questionId: helpQuestion.id, actionId: 'reveal' });
  assert.equal(reveal.nextLesson.steps[0].solving?.masteryStatus, 'needs_reinforcement');
  assert.equal(reveal.nextLesson.steps[0].solving?.finalCorrect, false);
  const fakeAnswer = act(reveal.nextLesson, reveal.nextState.gameState, 'submit_answer', {
    questionId: helpQuestion.id, inputAnswer: String(helpQuestion.answer), actionId: 'after-reveal-answer',
  });
  assert.equal(fakeAnswer.changed, false);
  assert.equal(fakeAnswer.nextState.gameState.answerAttempts, 0);
  assert.equal(fakeAnswer.nextLesson.steps[0].awardedAt, undefined);
}

{
  const reviewUnitId = 'g2-u3';
  const realDate = Date;
  let currentTime = new realDate(2026, 9, 21, 10, 0, 0).getTime();
  class ControlledDate extends realDate {
    constructor(...args: any[]) {
      super(args.length ? args[0] : currentTime);
    }
    static now() { return currentTime; }
  }
  (globalThis as any).Date = ControlledDate;
  try {
    const parentSettings = {
      gradeBand: 'G2' as const,
      dailyGoal: 6,
      maxDifficulty: 5,
      learningSettings: {
        schemaVersion: 1 as const,
        grade: 'G2' as const,
        semester: 'upper' as const,
        semesterSource: 'manual' as const,
        textbookEdition: 'generic_cn' as const,
        unitId: reviewUnitId,
        learnedTableRange: null,
        dailyGoal: 6,
        challengePreference: 'balanced' as const,
      },
    };
    const initialState = { ...DEFAULT_GAME_STATE, parentSettings };
    const profile: LearningProfile = {
      gradeBand: 'G2', streakDays: 0, recentAccuracy: 0, weakSkills: [], dailyQuestionCount: 0, skillLevel: 1,
    };
    const baseline = buildDailyLesson(profile, [], [], initialState);
    assert.equal(baseline.steps.length, 6);
    const targetStep = baseline.steps.find(step => ['application', 'stretch', 'olympiad'].includes(step.role || ''))!;
    assert.ok(targetStep, 'real current-unit lesson must include a non-foundation item');
    const metadata = questionLearningMetadata.find(item => item.unitId === reviewUnitId && item.questionId === targetStep.questionId)!;
    assert.ok(['application', 'advanced', 'olympiad'].includes(metadata.role));
    const reviewQuestion = getQuestionById(targetStep.questionId)!;
    assert.ok(reviewQuestion, 'selected current-unit item must resolve to real transaction content');
    const lesson: TodayLesson = {
      ...baseline,
      steps: [{ ...targetStep, status: 'current', currentPhaseIndex: 0 }],
      date: '2026-10-21',
      lessonId: 'non-foundation-review',
      currentStepIndex: 0,
      completed: false,
    };
    const reveal = act(lesson, initialState, 'reveal_explanation', {
      questionId: reviewQuestion.id, actionId: 'non-foundation-review-reveal',
    });
    const originalEvidence = reveal.nextLesson.steps[0].solving;
    assert.equal(originalEvidence?.masteryStatus, 'needs_reinforcement');
    assert.equal(originalEvidence?.independentCorrect, false);
    assert.equal(reveal.nextState.gameState.needsReinforcementQueue?.[0]?.questionId, reviewQuestion.id);
    assert.equal(reveal.nextState.gameState.needsReinforcementQueue?.[0]?.dueAt, new realDate(2026, 9, 22).toISOString());

    currentTime = new realDate(2026, 9, 22, 10, 0, 0).getTime();
    const nextDay = buildDailyLesson(profile, [], [], reveal.nextState.gameState);
    assert.equal(nextDay.steps.length, 6, 'due review must preserve the six-question lesson');
    assert.equal(nextDay.steps[0].questionId, reviewQuestion.id, 'the real due_review slot must select the due original first');
    assert.equal(nextDay.steps[0].role, 'due_review');
    for (const step of nextDay.steps) {
      const item = questionLearningMetadata.find(candidate => candidate.questionId === step.questionId);
      assert.equal(item?.unitId, reviewUnitId, 'the generated lesson must remain inside the selected G2 unit');
      const q = [...allQuestions, ...progressionQuestions].find(candidate => candidate.id === step.questionId)!;
      assert.equal(q.gradeBand, 'G2', 'the generated lesson must remain inside the selected grade');
    }
    assert.deepEqual(reveal.nextLesson.steps[0].solving, originalEvidence, 'next-day planning must not rewrite the original explanation evidence');
    assert.equal(reveal.nextLesson.steps[0].solving?.independentCorrect, false);
  } finally {
    (globalThis as any).Date = realDate;
  }
}

{
  const original = allQuestions.find(q => selectTransferQuestion(q, allQuestions).kind === 'matched');
  assert.ok(original, 'fixture needs a question with a validated matched transfer');
  const match = selectTransferQuestion(original!, allQuestions);
  assert.equal(match.kind, 'matched');
  const lesson = makeLesson(original!.id, 'transfer-reward');
  const reveal = act(lesson, DEFAULT_GAME_STATE, 'reveal_explanation', { questionId: original!.id, actionId: 'transfer-reveal' });
  const start = act(reveal.nextLesson, reveal.nextState.gameState, 'start_transfer', { questionId: original!.id, actionId: 'transfer-start' });
  const transfer = start.nextLesson.steps[0].transfer!;
  assert.equal(transfer.questionId, match.questionId);
  const answered = act(start.nextLesson, start.nextState.gameState, 'submit_transfer', {
    questionId: transfer.questionId, questionInstanceId: transfer.questionInstanceId,
    inputAnswer: String(getQuestionById(transfer.questionId)!.answer), actionId: 'transfer-answer',
  });
  assert.equal(answered.nextLesson.steps[0].transfer?.status, 'correct');
  assert.equal(answered.nextLesson.steps[0].solving?.masteryStatus, 'needs_reinforcement');
  assert.equal(answered.nextState.gameState.answerAttempts, DEFAULT_GAME_STATE.answerAttempts);
  assert.equal(answered.nextState.gameState.correctCount, DEFAULT_GAME_STATE.correctCount);
  assert.equal(answered.nextLesson.steps[0].awardedAt, undefined);
  assert.equal(answered.nextState.gameState.learningEvents?.some(event => event.source === 'transfer'
    && event.parentQuestionInstanceId === lesson.steps[0].questionInstanceId), true);
  assert.equal(answered.nextState.gameState.pointsWallet?.ledger.some(entry => entry.type === 'perfect_lesson') ?? false, false);
}

{
  const original = allQuestions.find(q => selectTransferQuestion(q, allQuestions).kind === 'unavailable');
  assert.ok(original, 'fixture needs a question without a validated transfer');
  const lesson = makeLesson(original!.id, 'transfer-unavailable');
  const reveal = act(lesson, DEFAULT_GAME_STATE, 'reveal_explanation', { questionId: original!.id, actionId: 'unavailable-reveal' });
  const start = act(reveal.nextLesson, reveal.nextState.gameState, 'start_transfer', { questionId: original!.id, actionId: 'unavailable-start' });
  assert.equal(start.nextLesson.steps[0].transfer?.status, 'deferred');
  assert.ok(start.nextLesson.steps[0].transfer?.unavailableReason);
  const next = act(start.nextLesson, start.nextState.gameState, 'go_next', { questionId: original!.id });
  assert.equal(next.changed, true);
  assert.equal(next.nextLesson.completed, true);
}

{
  const lesson = generateSafeFallbackLesson('G1');
  assert.equal(lesson.steps.length, 6);
  let currentLesson = { ...lesson, lessonId: 'six-answer-runtime', steps: lesson.steps.map((step, index) => ({
    ...step, phases: ['answer', 'explain'] as const, currentPhaseIndex: 0, questionInstanceId: `six-${index}`,
  })) } as TodayLesson;
  let gameState = DEFAULT_GAME_STATE;
  while (!currentLesson.completed) {
    const step = currentLesson.steps[currentLesson.currentStepIndex];
    const q = getQuestionById(step.questionId)!;
    const answered = act(currentLesson, gameState, 'submit_answer', {
      questionId: q.id, inputAnswer: String(q.answer), actionId: `six-answer-${currentLesson.currentStepIndex}`,
    });
    assert.equal(answered.changed, true);
    const advanced = act(answered.nextLesson, answered.nextState.gameState, 'go_next', { questionId: q.id });
    currentLesson = advanced.nextLesson;
    gameState = advanced.nextState.gameState;
  }
  assert.equal(currentLesson.steps.length, 6);
  assert.equal(currentLesson.steps.every(step => step.solving?.firstAttemptCorrect === true), true);
}

console.log('PASS independent solving runtime');
