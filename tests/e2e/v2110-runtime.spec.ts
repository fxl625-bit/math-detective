import { test, expect, type Page } from '@playwright/test';
import { currentLessonState, submitCurrentAnswerThroughUi } from './helpers/legacy-lesson';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

async function setupFreshUser(page: Page) {
  await page.goto(`${BASE}/play?e2e=1`);
  await page.evaluate(() => {
    localStorage.clear();
    const state = {
      version: 9, stars: 50, streak: 5, totalCompleted: 19,
      correctCount: 18, wrongCount: 1, answerAttempts: 20, level: 2,
      badges: [], completedQuestions: [], mistakes: [], completedToday: 0,
      lastPlayDate: '', lastCheckinDate: '', lastStreakCheckDate: '', skillMistakes: {}, skillLevel: 2,
      parentRewards: [], rewardRedemptions: [], parentGateAttempts: [], weeklySnapshots: [], resumeCards: 1,
      decorations: [], collectibleCards: [], questionReviewDates: {}, questionReviewCounts: {},
      attemptRecords: [], learningEvents: [],
      parentSettings: { gradeBand: 'G1', dailyGoal: 5, maxDifficulty: 2, semester: 'lower' },
      curriculumProfile: { country: 'CN', textbookEdition: 'PEP', grade: 1, semester: 'lower', detectedAt: '2026-06-17T00:00:00.000Z', semesterProgress: 'review' },
      learnerProfile: { skillMastery: {}, currentDifficultyLevel: 2, totalCompleted: 19, recentAccuracy: 100, recentFirstTryAccuracy: 90, averageAttempts: 1.1, fullHintRate: 0.1, difficultyBias: 0, startedAt: '2026-04-01', consecutiveCheckInDays: 5 },
      usageStage: 2,
    };
    localStorage.setItem('math-detective-state', JSON.stringify(state));
    localStorage.removeItem('math-detective-today-lesson');
  });
  await page.reload();
  await page.waitForFunction(() => !!(window as any).MATH_DETECTIVE_TEST, { timeout: 15000 });
  await page.waitForFunction(() => !!(window as any).MATH_DETECTIVE_TEST?.getState()?.questionId, { timeout: 15000 });
}

async function advanceLessonInBrowser(page: Page) {
  const dialogAction = page.getByRole('dialog').getByRole('button', { name: /关闭反馈|继续学习/ }).first();
  if (await dialogAction.isVisible().catch(() => false)) {
    await dialogAction.click({ timeout: 1000 }).catch(() => undefined);
    await page.waitForTimeout(150);
    return;
  }
  const state = await currentLessonState(page);
  if (state?.currentPhase === 'explain') {
    const continueButton = page.getByRole('button', { name: /完成.*下一关|继续破案|学会了|完成/ }).first();
    await expect(continueButton, 'Explanation should offer a visible continue action').toBeVisible();
    await continueButton.click();
    return;
  }
  const advanced = await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.goNext());
  expect(advanced, `Expected the lesson to advance from ${state?.currentPhase}`).toBe(true);
}

async function finishFullLessonThroughUi(page: Page) {
  const submittedQuestions = new Set<string>();
  for (let action = 0; action < 120; action++) {
    const state = await currentLessonState(page);
    if (state?.completed) break;
    if (state?.currentPhase === 'answer' || state?.currentPhase === 'build_equation') {
      const submitted = await submitCurrentAnswerThroughUi(page);
      submittedQuestions.add(submitted.questionId);
    } else {
      await advanceLessonInBrowser(page);
    }
  }
  const finalState = await currentLessonState(page);
  expect(finalState?.completed, 'All six questions should complete').toBe(true);
  expect(submittedQuestions.size, 'Each of the six questions must be answered through the UI').toBe(6);
  await expect(page.getByRole('heading', { name: /今日任务完成|今天的侦探任务全部完成/ }).first()).toBeVisible();
}

test('v2.11.0: Complete full lesson - 6 questions', async ({ page }) => {
  test.setTimeout(180000);
  await setupFreshUser(page);
  await finishFullLessonThroughUi(page);
});

test('v2.11.0: Last question requires answer', async ({ page }) => {
  test.setTimeout(180000);
  await setupFreshUser(page);
  for (let action = 0; action < 100; action++) {
    const state = await currentLessonState(page);
    if (state?.currentStepIndex === 5 && (state?.currentPhase === 'answer' || state?.currentPhase === 'build_equation')) break;
    if (state?.completed) throw new Error('Lesson completed before reaching the unanswered sixth question');
    if (state?.currentPhase === 'answer' || state?.currentPhase === 'build_equation') {
      await submitCurrentAnswerThroughUi(page);
    } else {
      await advanceLessonInBrowser(page);
    }
  }

  const beforeSubmit = await currentLessonState(page);
  expect(beforeSubmit?.currentStepIndex).toBe(5);
  expect(beforeSubmit?.currentPhase).toBe('answer');
  await expect(page.locator('input[name="answer"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /完成.*下一关|学会了|继续破案/ })).toHaveCount(0);
  expect(beforeSubmit?.completed, 'The final question must block completion until answered').toBe(false);

  const submitted = await submitCurrentAnswerThroughUi(page);
  expect(submitted.afterAttempts - submitted.beforeAttempts).toBe(1);
  for (let attempt = 0; attempt < 5 && !(await currentLessonState(page))?.completed; attempt++) {
    await advanceLessonInBrowser(page);
  }
  await expect.poll(async () => (await currentLessonState(page))?.completed).toBe(true);
});
