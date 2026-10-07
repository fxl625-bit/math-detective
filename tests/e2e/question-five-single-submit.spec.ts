import { test, expect, type Page } from '@playwright/test';
import { currentLessonState, submitCurrentAnswerThroughUi, type SubmitMethod } from './helpers/legacy-lesson';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

async function setupFreshUser(page: Page) {
  await page.goto(`${BASE}/play?e2e=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('math-detective-state', JSON.stringify({
      version: 9, stars: 50, streak: 5, totalCompleted: 19, correctCount: 18, wrongCount: 1,
      answerAttempts: 20, level: 2, badges: [], completedQuestions: [], mistakes: [], completedToday: 0,
      lastPlayDate: '', lastCheckinDate: '', lastStreakCheckDate: '', skillMistakes: {}, skillLevel: 2,
      parentRewards: [], rewardRedemptions: [], parentGateAttempts: [], weeklySnapshots: [], resumeCards: 1,
      decorations: [], collectibleCards: [], questionReviewDates: {},
      attemptRecords: [], learningEvents: [], questionReviewCounts: {}, parentSettings: { gradeBand: 'G1', dailyGoal: 6, maxDifficulty: 5, semester: 'lower' },
      curriculumProfile: { country: 'CN', textbookEdition: 'PEP', grade: 1, semester: 'lower', detectedAt: '2026-06-17T00:00:00.000Z', semesterProgress: 'review' },
      learnerProfile: { skillMastery: {}, currentDifficultyLevel: 2, totalCompleted: 19, recentAccuracy: 100, recentFirstTryAccuracy: 90, averageAttempts: 1.1, fullHintRate: 0.1, difficultyBias: 0, startedAt: '2026-04-01', consecutiveCheckInDays: 5 },
      usageStage: 2,
    }));
    localStorage.removeItem('math-detective-today-lesson');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!(window as any).MATH_DETECTIVE_TEST, { timeout: 15000 });
}

async function openAnswerPhase(page: Page) {
  for (let i = 0; i < 60; i++) {
    const state = await currentLessonState(page);
    if (state?.currentPhase === 'answer' || state?.currentPhase === 'build_equation') return state;
    if (state?.completed) break;
    const advanced = await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.goNext());
    expect(advanced, 'Lesson should advance toward an answer phase').toBe(true);
    await page.waitForTimeout(100);
  }
  throw new Error('Could not reach an answer phase');
}

async function submitOnce(page: Page, method: SubmitMethod) {
  await openAnswerPhase(page);
  const result = await submitCurrentAnswerThroughUi(page, method);
  expect(result.afterAttempts).toBe(result.beforeAttempts + 1);
  expect(result.afterState.currentPhase).toBe('explain');
  return result;
}

test('v2.11.0-single-submit: One submit button click shows correct feedback immediately', async ({ page }) => {
  test.setTimeout(90000);
  await setupFreshUser(page);
  const submitted = await submitOnce(page, 'click');
  expect(submitted.questionId).toBeTruthy();
  await expect(page.locator('button[type="submit"]')).toHaveCount(0);
});

test('v2.11.0-single-submit: No duplicate submit handlers — only one transaction per click', async ({ page }) => {
  test.setTimeout(90000);
  await setupFreshUser(page);
  const submitted = await submitOnce(page, 'click');
  expect(submitted.afterAttempts - submitted.beforeAttempts).toBe(1);
});

test('v2.11.0-single-submit: Enter key submits exactly once (no double-fire)', async ({ page }) => {
  test.setTimeout(90000);
  await setupFreshUser(page);
  const submitted = await submitOnce(page, 'enter');
  expect(submitted.afterAttempts - submitted.beforeAttempts).toBe(1);
});

test('v2.11.0-single-submit: Submit button has explicit type=submit', async ({ page }) => {
  test.setTimeout(60000);
  await setupFreshUser(page);
  await openAnswerPhase(page);
  const submitBtn = page.locator('button[type="submit"]').first();
  await expect(submitBtn).toBeVisible();
  expect(await submitBtn.getAttribute('type')).toBe('submit');
});
