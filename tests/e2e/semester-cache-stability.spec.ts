import { expect, test, type Page } from '@playwright/test';
import type { LearningSettings } from '../../lib/types';

type ParentSettings = {
  gradeBand: string;
  dailyGoal: number;
  maxDifficulty: number;
  semester?: 'upper' | 'lower';
  semesterOverride?: 'upper' | 'lower';
  learningSettings?: LearningSettings;
};

async function openPlay(page: Page, date: string, parentSettings: ParentSettings) {
  await page.clock.install({ time: new Date(date) });
  await page.addInitScript(settings => {
    if (sessionStorage.getItem('semester-cache-stability-seeded') === '1') return;
    sessionStorage.setItem('semester-cache-stability-seeded', '1');
    localStorage.setItem('math-detective-state', JSON.stringify({
      version: 9,
      stars: 31,
      answerAttempts: 7,
      totalCompleted: 4,
      completedQuestions: [],
      mistakes: [],
      attemptRecords: [],
      parentSettings: settings,
      learnerProfile: {
        currentDifficultyLevel: 2,
        startedAt: '2026-09-01T00:00:00.000Z',
        totalCompleted: 4,
        recentAccuracy: 75,
        recentFirstTryAccuracy: 75,
        averageAttempts: 1,
        fullHintRate: 0,
        difficultyBias: 0,
        skillMastery: {},
      },
    }));
  }, parentSettings);
  await page.goto('/play?e2e=1');
  await page.waitForFunction(() => Boolean((window as any).MATH_DETECTIVE_TEST), { timeout: 15000 });
  await page.waitForFunction(() => Boolean(localStorage.getItem('math-detective-today-lesson')), { timeout: 15000 });
}

async function readCourse(page: Page) {
  return page.evaluate(() => {
    const lesson = JSON.parse(localStorage.getItem('math-detective-today-lesson') || 'null');
    const state = JSON.parse(localStorage.getItem('math-detective-state') || 'null');
    return {
      date: lesson?.date,
      caseStoryId: lesson?.caseStoryId,
      currentStepIndex: lesson?.currentStepIndex,
      completed: lesson?.completed,
      steps: lesson?.steps?.map((step: any) => ({
        id: step.id,
        questionId: step.questionId,
        status: step.status,
        currentPhaseIndex: step.currentPhaseIndex,
      })),
      semester: lesson?.curriculumSnapshot?.semester,
      profileSemester: state?.curriculumProfile?.semester,
      stars: state?.stars,
      answerAttempts: state?.answerAttempts,
    };
  });
}

test('uses detected semester over legacy fields and keeps a stale in-progress course stable', async ({ page }) => {
  test.setTimeout(120000);
  await openPlay(page, '2026-09-28T04:00:00.000Z', {
    gradeBand: 'G2', dailyGoal: 6, maxDifficulty: 5, semester: 'lower',
  });

  const initial = await readCourse(page);
  expect(initial.profileSemester).toBe('upper');
  expect(initial.semester).toBe('upper');
  expect(initial.steps.length).toBeGreaterThan(0);

  const legacySnapshot = await page.evaluate(() => {
    const lesson = JSON.parse(localStorage.getItem('math-detective-today-lesson') || 'null');
    lesson.curriculumSnapshot.semester = 'lower';
    const first = lesson.steps[0];
    first.currentPhaseIndex = Math.min(1, Math.max(0, first.phases.length - 1));
    localStorage.setItem('math-detective-today-lesson', JSON.stringify(lesson));
    return lesson;
  });

  const expected = {
    ...initial,
    semester: 'lower',
    currentStepIndex: legacySnapshot.currentStepIndex,
    steps: legacySnapshot.steps.map((step: any) => ({
      id: step.id,
      questionId: step.questionId,
      status: step.status,
      currentPhaseIndex: step.currentPhaseIndex,
    })),
  };

  for (let i = 0; i < 5; i++) {
    await page.reload();
    await page.waitForFunction(() => Boolean((window as any).MATH_DETECTIVE_TEST), { timeout: 15000 });
    const actual = await readCourse(page);
    expect(actual.date).toBe(expected.date);
    expect(actual.caseStoryId).toBe(expected.caseStoryId);
    expect(actual.semester).toBe('lower');
    expect(actual.profileSemester).toBe('upper');
    expect(actual.currentStepIndex).toBe(expected.currentStepIndex);
    expect(actual.steps).toEqual(expected.steps);

    if (i === 1) {
      await page.goto('/');
      await page.goto('/play?e2e=1');
      await page.waitForFunction(() => Boolean((window as any).MATH_DETECTIVE_TEST), { timeout: 15000 });
    }
  }
});

test('uses explicit override and returns to date detection when override is removed', async ({ page }) => {
  test.setTimeout(90000);
  await openPlay(page, '2026-09-28T04:00:00.000Z', {
    gradeBand: 'G2', dailyGoal: 6, maxDifficulty: 5, semesterOverride: 'lower',
    // Current storage prefers canonical settings inherited from defaults; represent the override as the UI persists it.
    learningSettings: {
      schemaVersion: 1, grade: 'G2', semester: 'lower', semesterSource: 'manual', textbookEdition: 'PEP',
      unitId: null, learnedTableRange: null, dailyGoal: 6, challengePreference: 'balanced',
    },
  });
  expect((await readCourse(page)).semester).toBe('lower');
  expect((await readCourse(page)).profileSemester).toBe('lower');

  await page.evaluate(() => {
    const raw = localStorage.getItem('math-detective-state');
    const state = JSON.parse(raw || '{}');
    delete state.parentSettings.semesterOverride;
    state.parentSettings.learningSettings.semesterSource = 'auto';
    localStorage.setItem('math-detective-state', JSON.stringify(state));
    localStorage.removeItem('math-detective-today-lesson');
  });
  await page.reload();
  await page.waitForFunction(() => Boolean((window as any).MATH_DETECTIVE_TEST), { timeout: 15000 });
  await page.waitForFunction(() => Boolean(localStorage.getItem('math-detective-today-lesson')), { timeout: 15000 });
  expect((await readCourse(page)).semester).toBe('upper');
  expect((await readCourse(page)).profileSemester).toBe('upper');
});

test('uses the detected lower semester in March despite an old upper setting', async ({ page }) => {
  test.setTimeout(90000);
  await openPlay(page, '2026-03-15T04:00:00.000Z', {
    gradeBand: 'G2', dailyGoal: 6, maxDifficulty: 5, semester: 'upper',
  });
  expect((await readCourse(page)).semester).toBe('lower');
  expect((await readCourse(page)).profileSemester).toBe('lower');
});
