import { test, expect, type Page } from '@playwright/test';
import { submitCurrentAnswerThroughUi } from './helpers/legacy-lesson';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

async function setupAndGo(page: Page) {
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
      parentSettings: { gradeBand: 'G1', dailyGoal: 5, maxDifficulty: 2, semester: 'lower' },
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
  // Wait for test API to be available
  await page.waitForFunction(() => !!(window as any).MATH_DETECTIVE_TEST, { timeout: 15000 });
}

async function advancePhase(page: Page): Promise<boolean> {
  const state = await getState(page);
  if (state?.currentPhase === 'explain') {
    const continuation = page.getByTestId('continue-feedback');
    await expect(continuation).toBeVisible();
    await continuation.click();
    return true;
  }
  return await page.evaluate(() => {
    const api = (window as any).MATH_DETECTIVE_TEST;
    if (!api) return false;
    const state = api.getState() as any;
    if (state.completed) return false;
    return api.goNext();
  });
}

async function submitCorrectAnswer(page: Page): Promise<boolean> {
  const state = await getState(page);
  if (state?.currentPhase !== 'answer' && state?.currentPhase !== 'build_equation') return false;
  await submitCurrentAnswerThroughUi(page);
  return true;
}

async function getState(page: Page): Promise<any> {
  return await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.getState());
}

test('v2.11.0: Full lesson - advance all phases with answer submission', async ({ page }) => {
  test.setTimeout(120000);
  await setupAndGo(page);

  let stepCount = 0;
  let maxIterations = 100; // safety limit

  while (maxIterations-- > 0) {
    const state = await getState(page);
    if (state?.completed) {
      console.log(`Lesson completed after ${stepCount} steps`);
      break;
    }

    // Check if we're in answer phase
    const phase = state?.currentPhase;
    const stepType = state?.stepType;
    console.log(`  Step ${state?.currentStepIndex + 1}/6, phase=${phase}, type=${stepType}`);

    if (phase === 'answer' || phase === 'build_equation') {
      // Submit correct answer
      const submitted = await submitCorrectAnswer(page);
      console.log(`    Submitted: ${submitted}`);
      await page.waitForTimeout(1000);

      // After submit, we might be in 'explain' or advanced
      const afterState = await getState(page);
      if (afterState?.currentPhase === 'explain' || !afterState?.currentPhase) {
        // Need to advance past explain
        const advanced = await advancePhase(page);
        console.log(`    After-explain advance: ${advanced}`);
        await page.waitForTimeout(600);
        stepCount++;
      }
    } else {
      // Non-answer phase: just advance
      const advanced = await advancePhase(page);
      if (!advanced) {
        console.log('    Could not advance, trying answer submit');
        const submitted = await submitCorrectAnswer(page);
        if (!submitted) break;
        await page.waitForTimeout(800);
      }
      await page.waitForTimeout(500);
    }
  }

  const finalState = await getState(page);
  console.log('Final:', JSON.stringify({ completed: finalState?.completed, step: finalState?.currentStepIndex }));
  expect(finalState?.completed).toBe(true);
});

test('v2.11.0: Answer gate - cannot complete step 6 without answering', async ({ page }) => {
  test.setTimeout(120000);
  await setupAndGo(page);

  // Fast-forward through 5 steps using the test API
  for (let step = 0; step < 5; step++) {
    for (let i = 0; i < 15; i++) {
      const state = await getState(page);
      if (state?.currentStepIndex !== step) break;
      if (state?.currentPhase === 'answer' || state?.currentPhase === 'build_equation') {
        await submitCorrectAnswer(page);
        await page.waitForTimeout(800);
      }
      await advancePhase(page);
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(200);
  }

  // Now at step 6 (index 5). Advance through non-answer phases.
  for (let i = 0; i < 10; i++) {
    const state = await getState(page);
    if (state?.currentPhase === 'answer' || state?.currentPhase === 'build_equation') break;
    const advanced = await advancePhase(page);
    if (!advanced) break;
    await page.waitForTimeout(400);
  }

  // At answer phase - try advancing WITHOUT submitting answer
  console.log('At step 6 answer phase, trying to advance without answer...');
  const beforeState = await getState(page);
  console.log('Before:', JSON.stringify({ phase: beforeState?.currentPhase, step: beforeState?.currentStepIndex }));

  // Try goNext (which should call complete_phase or complete_step)
  const tryAdvance = await advancePhase(page);
  await page.waitForTimeout(500);

  const afterState = await getState(page);
  console.log('After no-answer advance:', JSON.stringify({ completed: afterState?.completed, step: afterState?.currentStepIndex }));

  // Lesson should NOT be completed
  expect(afterState?.completed).toBe(false);
});
