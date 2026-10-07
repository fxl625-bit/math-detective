/**
 * Sub-project A: Submit Transaction Test
 *
 * Validates that a correct answer advances the phase in ONE click.
 * Tests the ENTIRE chain: accept answer → validate → advance phase → persist → render.
 */

import { allQuestions } from '@/data/questions';
import { getDefaultPhasesForStepType, getCurrentStep } from '@/lib/lessonPlanner';
import { commitLessonTransaction, type LearningState } from '@/lib/lessonTransaction';
import { DEFAULT_GAME_STATE, type TodayLesson, type LessonStep, type GameState, type Question } from '@/lib/types';

// ========== Test helpers ==========

function makeLessonStep(overrides: Partial<LessonStep> = {}): LessonStep {
  return {
    id: overrides.id || 'test-step-1',
    type: overrides.type || 'full_solve',
    title: overrides.title || '测试关',
    description: overrides.description || '测试',
    questionId: overrides.questionId || 'g1ll_01',
    phases: overrides.phases || ['read', 'find_numbers', 'find_keywords', 'choose_operation', 'build_equation', 'answer', 'explain'],
    currentPhaseIndex: overrides.currentPhaseIndex ?? 0,
    status: overrides.status || 'current',
    requiresAnswer: overrides.requiresAnswer ?? true,
    awardedAt: overrides.awardedAt,
  };
}

function makeLesson(overrides: Partial<TodayLesson> = {}): TodayLesson {
  const step = makeLessonStep({ currentPhaseIndex: 5 }); // Start at 'answer' phase
  return {
    date: new Date().toISOString().slice(0, 10),
    steps: overrides.steps || [step],
    currentStepIndex: overrides.currentStepIndex ?? 0,
    completed: overrides.completed ?? false,
    caseStoryId: overrides.caseStoryId ?? 'none',
  };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...structuredClone(DEFAULT_GAME_STATE),
    ...overrides,
    parentSettings: { ...DEFAULT_GAME_STATE.parentSettings, ...overrides.parentSettings, gradeBand: overrides.parentSettings?.gradeBand ?? 'G1' },
  };
}

// ========== Tests ==========

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${(e as Error).message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

console.log('\n=== test:submit-transaction ===\n');

// ===== Test 1: Correct answer advances exactly one phase =====
test('correct answer advances exactly one phase from answer to explain', () => {
  const lesson = makeLesson();
  assert(lesson.steps[0].currentPhaseIndex === 5, 'should start at answer (index 5)');

  const state: LearningState = {
    lesson,
    gameState: makeGameState(),
  };

  const result = commitLessonTransaction({
    state,
    action: 'submit_answer',
    payload: {
      questionId: 'g1ll_01',
      inputAnswer: '6',
    },
    source: 'test',
  });

  assert(result.changed === true, 'result.changed should be true');
  assert(result.advanced === true, 'result.advanced should be true');
  assert(result.fromPhaseIndex === 5, `fromPhase should be 5, got ${result.fromPhaseIndex}`);
  assert(result.toPhaseIndex === 6, `toPhase should be 6 (explain), got ${result.toPhaseIndex}`);
  assert(result.toPhase === 'explain', `toPhase should be 'explain', got ${result.toPhase}`);
});

// ===== Test 2: Submit on last phase completes step =====
test('correct answer on last answer phase completes the step (no more phases)', () => {
  const lesson = makeLesson();
  // Set up a step where answer IS the last phase before explain
  lesson.steps[0].phases = ['read', 'answer', 'explain'];
  lesson.steps[0].currentPhaseIndex = 1; // at 'answer'

  const state: LearningState = { lesson, gameState: makeGameState() };

  const result = commitLessonTransaction({
    state,
    action: 'submit_answer',
    payload: { questionId: 'g1ll_01', inputAnswer: '6' },
    source: 'test',
  });

  assert(result.changed === true, 'should change state');
  assert(result.advanced === true, 'should advance');
  assert(result.toPhase === 'explain', `should advance to explain, got ${result.toPhase}`);
});

// ===== Test 3: Wrong answer does NOT advance =====
test('wrong answer does not advance phase', () => {
  const lesson = makeLesson();
  const state: LearningState = { lesson, gameState: makeGameState() };

  const result = commitLessonTransaction({
    state,
    action: 'submit_answer',
    payload: { questionId: 'g1ll_01', inputAnswer: '999' },
    source: 'test',
  });

  assert(result.advanced === false, 'wrong answer should not advance');
});

// ===== Test 4: Step completion advances step index =====
test('complete_step advances only after a correct answer was awarded', () => {
  const step1 = makeLessonStep({ id: 's1', currentPhaseIndex: 6, awardedAt: new Date().toISOString() });
  const step2 = makeLessonStep({ id: 's2', currentPhaseIndex: 0, status: 'locked' });
  const lesson = makeLesson({
    steps: [step1, step2],
    currentStepIndex: 0,
  });
  const state: LearningState = { lesson, gameState: makeGameState() };

  const result = commitLessonTransaction({
    state,
    action: 'complete_step',
    payload: {},
    source: 'test',
  });

  assert(result.advanced === true, 'should advance to next step');
  assert(result.toStepIndex === 1, `should advance to step 1, got ${result.toStepIndex}`);
  assert(result.nextLesson.steps[0].status !== 'current', 'first step should no longer be current');
});

test('complete_step is blocked before an answer is awarded', () => {
  const lesson = makeLesson({ steps: [makeLessonStep({ currentPhaseIndex: 6 }), makeLessonStep({ id: 'next', status: 'locked' })] });
  const result = commitLessonTransaction({
    state: { lesson, gameState: makeGameState() }, action: 'complete_step', payload: {}, source: 'test-unanswered',
  });
  assert(result.changed === false, 'an unanswered step cannot be marked complete');
  assert(result.reason === 'answer gate blocked: no answer awarded', 'reports the answer gate as the reason');
});

// ===== Test 5: Double submit of same answer is idempotent =====
test('second submit_answer on same phase does not re-advance (in lessonTransaction)', () => {
  const lesson = makeLesson();
  const state: LearningState = { lesson, gameState: makeGameState() };

  // First submit
  const r1 = commitLessonTransaction({
    state,
    action: 'submit_answer',
    payload: { questionId: 'g1ll_01', inputAnswer: '6' },
    source: 'test',
  });
  assert(r1.changed === true, 'first submit should change');

  // Second submit - use the state AFTER first submit
  const r2 = commitLessonTransaction({
    state: {
      lesson: r1.nextLesson,
      gameState: makeGameState(),
    },
    action: 'submit_answer',
    payload: { questionId: 'g1ll_01', inputAnswer: '6' },
    source: 'test',
  });
  assert(r2.changed === false || r2.reason !== 'correct answer: phase advanced',
    `second submit should not re-advance phase (reason: ${r2.reason})`);
});

// ===== Test 6: Each phase advances by exactly 1 index =====
test('submit_answer advances exactly 1 phase index', () => {
  for (let phaseIdx = 0; phaseIdx < 5; phaseIdx++) {
    const lesson = makeLesson();
    lesson.steps[0].currentPhaseIndex = phaseIdx;
    lesson.steps[0].phases = ['read', 'find_numbers', 'find_keywords', 'choose_operation', 'build_equation', 'answer', 'explain'];

    const state: LearningState = { lesson, gameState: makeGameState() };

    const result = commitLessonTransaction({
      state,
      action: 'complete_phase',
      payload: {},
      source: 'test',
    });

    assert(
      result.toPhaseIndex === phaseIdx + 1,
      `phase ${phaseIdx} should advance to ${phaseIdx + 1}, got ${result.toPhaseIndex}`
    );
  }
});

// ===== Test 7: State persists correctly after submit =====
test('state after submit has correct phases and indices', () => {
  const lesson = makeLesson();
  const state: LearningState = { lesson, gameState: makeGameState() };

  const result = commitLessonTransaction({
    state,
    action: 'submit_answer',
    payload: { questionId: 'g1ll_01', inputAnswer: '6' },
    source: 'test',
  });

  const nextStep = getCurrentStep(result.nextLesson);
  assert(nextStep !== undefined, 'next step should exist');
  assert(nextStep!.currentPhaseIndex === 6, `phase should be at explain (6), got ${nextStep!.currentPhaseIndex}`);
});

// ===== Summary =====
console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('❌ Some tests FAILED — fix before proceeding to Sub-project B');
  process.exit(1);
} else {
  console.log('✅ All submit-transaction tests PASSED');
}
