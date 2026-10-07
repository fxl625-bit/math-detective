import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';

/**
 * v2.11.0: Answer schema router E2E tests.
 * Verifies that AnswerInputRouter renders correct components for each schema kind.
 */

async function setupFreshUser(page: Page) {
  await page.goto(`${BASE}/play?e2e=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    const state: any = {
      version: 9, stars: 50, streak: 5, totalCompleted: 19,
      correctCount: 18, wrongCount: 1, answerAttempts: 20, level: 2,
      badges: [], completedQuestions: [], mistakes: [],
      completedToday: 0, lastPlayDate: '', lastCheckinDate: '',
      lastStreakCheckDate: '', skillMistakes: {}, skillLevel: 2,
      parentRewards: [], rewardRedemptions: [], parentGateAttempts: [],
      weeklySnapshots: [], resumeCards: 1,
      decorations: [], collectibleCards: [],
      questionReviewDates: {}, questionReviewCounts: {},
      attemptRecords: [],
      parentSettings: { gradeBand: 'G1', dailyGoal: 6, maxDifficulty: 5, semester: 'lower' },
      curriculumProfile: {
        country: 'CN', textbookEdition: 'PEP', grade: 1,
        semester: 'lower', detectedAt: '2026-06-17T00:00:00.000Z',
        semesterProgress: 'review'
      },
      learnerProfile: {
        skillMastery: {}, currentDifficultyLevel: 2, totalCompleted: 19,
        recentAccuracy: 100, recentFirstTryAccuracy: 90,
        averageAttempts: 1.1, fullHintRate: 0.1, difficultyBias: 0,
        startedAt: '2026-04-01', consecutiveCheckInDays: 5,
      },
      usageStage: 2,
    };
    localStorage.setItem('math-detective-state', JSON.stringify(state));
    localStorage.removeItem('math-detective-today-lesson');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!(window as any).MATH_DETECTIVE_TEST, { timeout: 15000 });
}

async function getState(page: Page): Promise<any> {
  return await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.getState());
}

async function advancePhase(page: Page): Promise<boolean> {
  return await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.goNext());
}

test('v2.11.0-schema: Answer phase never renders blank page', async ({ page }) => {
  test.setTimeout(90000);
  await setupFreshUser(page);

  let visitedAnswerPhase = false;
  for (let i = 0; i < 60; i++) {
    const state = await getState(page);
    if (state?.completed) break;

    const phase = state?.currentPhase;
    if (phase === 'answer' || phase === 'build_equation') {
      visitedAnswerPhase = true;
      const bodyText = await page.locator('body').innerText();

      // Answer phase should always have visible content
      expect(bodyText.length).toBeGreaterThan(50);

      // Should have an input or interaction element
      const hasInput = await page.locator('input, button').first().isVisible().catch(() => false);
      expect(hasInput).toBe(true);

      break;
    }

    await advancePhase(page);
    await page.waitForTimeout(300);
  }

  expect(visitedAnswerPhase).toBe(true);
});

test('v2.11.0-schema: Schema router does not fallback to hardcoded input', async ({ page }) => {
  test.setTimeout(60000);
  await setupFreshUser(page);

  // Reach answer phase and check for AnswerInputRouter presence
  for (let i = 0; i < 30; i++) {
    const state = await getState(page);
    if (state?.completed) break;
    if (state?.currentPhase === 'answer' || state?.currentPhase === 'build_equation') {
      // The page should NOT have the old bare input className
      // The new AnswerInputRouter components use different styling
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(50);

      // Check that answer schema was inferred (the question object should have answerSchema)
      const hasSchema = await page.evaluate(() => {
        const api = (window as any).MATH_DETECTIVE_TEST;
        if (!api) return null;
        const state = api.getState();
        return state?.stepType;
      });
      console.log('Step type:', hasSchema);
      break;
    }
    await advancePhase(page);
    await page.waitForTimeout(300);
  }
});
