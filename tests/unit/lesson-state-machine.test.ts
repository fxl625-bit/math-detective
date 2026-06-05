import assert from 'node:assert/strict';
import { checkAnswer } from '@/lib/answerChecker';
import {
  generateSafeFallbackLesson,
  getDefaultPhasesForStepType,
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
    payload: { questionId: q.id, inputAnswer: String(q.answer) },
    source: 'unit',
  });
  assert.equal(result.advanced, true);
  assert.equal(result.fromPhaseIndex, 1);
  assert.equal(result.toPhaseIndex, 2);
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

run('old invalid localStorage lesson is discarded by safeNormalizeLesson', () => {
  const q = getQuestionById('g1t_03')!;
  assert.equal(checkAnswer(String(q.answer), q).correct, true);
  const bad = lessonFor(q.id, 'find_action_words');
  const normalized = safeNormalizeLesson(bad);
  assert.notEqual(normalized?.steps[0]?.type, 'find_action_words');
});
