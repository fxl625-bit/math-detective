import assert from 'node:assert/strict';
import { buildDailyLesson, getTodayLesson } from '@/lib/lessonPlanner';
import { getQuestionById } from '@/data/questions';
import { checkAnswer } from '@/lib/answerChecker';
import { normalizeLearningSettings } from '@/lib/learningSettings';
import { commitLessonTransaction } from '@/lib/lessonTransaction';
import { DEFAULT_GAME_STATE, type GameState, type LearningEvent, type LearningProfile, type TodayLesson } from '@/lib/types';
import { createSolvingEvidence } from '@/lib/independentSolving';

const profile: LearningProfile = {
  gradeBand: 'G1', streakDays: 0, recentAccuracy: 100, weakSkills: [], dailyQuestionCount: 0, skillLevel: 1,
};
const state: GameState = structuredClone(DEFAULT_GAME_STATE);
state.parentSettings = { ...state.parentSettings, gradeBand: 'G1' };
state.parentSettings.learningSettings = normalizeLearningSettings({ grade: 'G1', unitId: null });

const lesson = buildDailyLesson(profile, [], [], state);
assert.equal(lesson.requestedCore, 6);
assert.equal(lesson.actualCore, 6);
assert.equal(lesson.unitSource, 'default_for_grade');
assert.equal((lesson as any).curriculumSnapshot.unitId, 'g1-u1');
assert.equal(lesson.steps.length, 6);
assert.equal(new Set(lesson.steps.map(step => step.questionId)).size, 6, 'global used-ID set prevents repeated questions across slots');
assert.equal(lesson.steps.find(step => step.role === 'current_concept')?.skill,
  lesson.steps.find(step => step.role === 'same_skill_variant')?.skill,
  'the concept and its variant must practice the same target skill');
for (const step of lesson.steps) {
  const question = getQuestionById(step.questionId);
  assert.ok(question, `selected question ${step.questionId} is registered in the shared question index`);
  assert.equal(checkAnswer(String(question.answer), question).correct, true, `registered answer checks for ${question.id}`);
}

const grade3State = structuredClone(DEFAULT_GAME_STATE);
const grade3Settings = normalizeLearningSettings({ grade: 'G3', unitId: 'g3-u3', challengePreference: 'balanced' });
grade3State.parentSettings = { ...grade3State.parentSettings, gradeBand: 'G3', learningSettings: grade3Settings };
grade3State.learningEvents = Array.from({ length: 7 }, (_, index): LearningEvent => ({
  eventId: `prior-first-${index}`, schemaVersion: 1, childProfileId: 'child', deviceId: 'device',
  sessionId: `prior-session-${index % 2}`, lessonId: `prior-lesson-${index}`,
  questionInstanceId: `prior-instance-${index}`, questionId: `prior-question-${index % 3}`,
  questionVersion: `v${index % 2}`, skillIds: ['g3-u3:tenths-as-decimals'], grade: 'G3', semester: 'upper',
  unitId: 'g3-u3', role: index % 2 ? 'application' : 'current_concept', eventType: 'attempt_submitted',
  actionId: `prior-action-${index}`, attemptId: `prior-attempt-${index}`,
  timestamp: `2026-09-${String(10 + index).padStart(2, '0')}T00:00:00.000Z`,
  hintLevel: 'none', completionMode: 'independent', result: 'correct', firstAttemptKnown: true,
  solvingEvidence: { ...createSolvingEvidence(), phase: 'review', attemptCount: 1, firstAttemptCorrect: true,
    independentCorrect: true, finalCorrect: true, masteryStatus: 'independent', outcome: 'first_independent' },
}));
const tierTwoQuestion = getQuestionById('prog_g3_u3_07');
assert.ok(tierTwoQuestion);
assert.equal(checkAnswer(String(tierTwoQuestion.answer), tierTwoQuestion).correct, true);
const skillId = tierTwoQuestion.curriculumSkillIds?.[0];
assert.ok(skillId);
const progressionLesson: TodayLesson = {
  date: '2026-09-28', lessonId: 'g3-promotion-lesson', lessonSignature: 'g3-promotion-signature',
  settingSnapshot: grade3Settings, currentStepIndex: 0, completed: false,
  steps: [{
    id: 'promotion-step', type: 'answer_only', title: '题目', description: tierTwoQuestion.text,
    questionId: tierTwoQuestion.id, phases: ['answer', 'explain', 'completed'], currentPhaseIndex: 0,
    status: 'current', requiresAnswer: true, role: 'stretch', skill: skillId,
    questionInstanceId: 'promotion-instance', settingSnapshot: grade3Settings,
  }],
};
const promoted = commitLessonTransaction({
  state: { lesson: progressionLesson, gameState: grade3State },
  action: 'submit_answer',
  payload: { questionId: tierTwoQuestion.id, inputAnswer: String(tierTwoQuestion.answer), actionId: 'promotion-action', timestamp: '2026-09-28T12:00:00.000Z', sessionId: 'new-session' },
  source: 'curriculum-core-test',
});
assert.equal(promoted.changed, true);
const progressionKey = `G3:g3-u3:${skillId}`;
assert.equal(promoted.nextState.gameState.learningDifficultyProgress?.[progressionKey]?.difficulty, 2,
  'the eighth valid first answer consumes one window and earns the next tier across roles');
const grade3Profile: LearningProfile = {
  gradeBand: 'G3', streakDays: 0, recentAccuracy: 100, weakSkills: [], dailyQuestionCount: 0, skillLevel: 1,
};
const nextTierLesson = buildDailyLesson(grade3Profile, [], [], promoted.nextState.gameState);
assert.equal(nextTierLesson.steps.find(step => step.role === 'stretch')?.tier, 'tier2',
  'balanced preference uses newly earned skill evidence for a real harder selection');

const storage = new Map<string, string>();
let writes = 0;
const fakeLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { writes += 1; storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
};
(globalThis as any).window = {};
(globalThis as any).localStorage = fakeLocalStorage;
storage.set('math-detective-state', JSON.stringify(state));
const first = getTodayLesson();
const writesAfterFirst = writes;
for (let index = 0; index < 5; index += 1) {
  const refreshed = getTodayLesson();
  assert.equal(refreshed.lessonId, first.lessonId);
  assert.deepEqual(refreshed.steps.map(step => step.questionId), first.steps.map(step => step.questionId));
}
assert.equal(writes, writesAfterFirst, 'repeated reads do not rewrite a stable new-user lesson');

const persistedState = JSON.parse(storage.get('math-detective-state')!) as GameState;
persistedState.lastCommittedLesson = {
  ...first,
  lessonId: 'previous-day-completed',
  date: '2026-09-27',
  completed: true,
  persistenceRevision: 99,
};
persistedState.lessonPersistenceRevision = 99;
storage.set('math-detective-state', JSON.stringify(persistedState));
const currentDayLesson = getTodayLesson();
assert.equal(currentDayLesson.lessonId, first.lessonId,
  'a completed prior-day snapshot cannot override the current-day separate lesson key');

console.log('curriculum-core-lesson: PASS');
