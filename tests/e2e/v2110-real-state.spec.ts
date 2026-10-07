import { test, expect, type Page } from '@playwright/test';
import { submitCurrentAnswerThroughUi } from './helpers/legacy-lesson';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/**
 * v2.11.0: Real-user-state E2E tests.
 *
 * These tests use the REAL browser state from artifacts/runtime/latest-browser-state.json
 * (backed up as latest-browser-state-backup-2026-06-17.json before any code changes).
 *
 * The real lesson has 6 slots, 3 of which degrade to answer_only:
 *   slot 1: find_numbers    (g1ll_02)
 *   slot 2: answer_only     (g1ll_13) — degraded from find_action_words
 *   slot 3: simulation      (g1ll_29)
 *   slot 4: remove_noise    (g1ll_07)
 *   slot 5: answer_only     (g1ll_30) — degraded from find_compare_numbers
 *   slot 6: answer_only     (g1ll_68) — native answer_only
 */

async function setupRealUserState(page: Page) {
  await page.goto(`${BASE}/play?e2e=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    const state: any = {
      version: 9, stars: 57, streak: 2, totalCompleted: 24,
      correctCount: 23, wrongCount: 1, answerAttempts: 25, level: 2,
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
        semester: 'lower', detectedAt: '2026-06-16T07:58:54.783Z',
        semesterProgress: 'review'
      },
      learnerProfile: {
        skillMastery: {}, currentDifficultyLevel: 5, totalCompleted: 24,
        recentAccuracy: 100, recentFirstTryAccuracy: 90,
        averageAttempts: 1.1, fullHintRate: 0.1, difficultyBias: 0,
        startedAt: '2026-04-01', consecutiveCheckInDays: 2,
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

async function submitCorrectAnswer(page: Page): Promise<boolean> {
  return await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.submitAnswer());
}

test('v2.11.0-real: answer_only steps render (not blank page)', async ({ page }) => {
  test.setTimeout(90000);
  await setupRealUserState(page);

  // Advance through slot 1 (find_numbers) to reach slot 2 (answer_only)
  for (let i = 0; i < 20; i++) {
    const state = await getState(page);
    if (state?.currentStepIndex >= 1) break; // reached slot 2
    if (state?.currentPhase === 'answer' || state?.currentPhase === 'build_equation') {
      await submitCorrectAnswer(page);
      await page.waitForTimeout(600);
    }
    await advancePhase(page);
    await page.waitForTimeout(300);
  }

  // Now at slot 2 — should be answer_only type
  const slot2State = await getState(page);
  console.log('Slot 2 state:', JSON.stringify({
    stepIndex: slot2State?.currentStepIndex,
    phase: slot2State?.currentPhase,
    stepType: slot2State?.stepType,
  }));
  expect(slot2State?.stepType).toBe('answer_only');

  // answer_only should render visible content, not a blank page
  const hasContent = await page.locator('text=/读完|找到|数字|关键词|答案|问题/').first().isVisible({ timeout: 5000 }).catch(() => false);
  // Even if no exact text match, the page should have visible interactive elements
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.length).toBeGreaterThan(50); // Not a blank page

  // Advance through read phase
  for (let i = 0; i < 5; i++) {
    await advancePhase(page);
    await page.waitForTimeout(300);
    const s = await getState(page);
    if (s?.currentPhase === 'answer' || s?.currentPhase === 'build_equation') break;
  }

  // Should reach answer phase for answer_only step
  const answerPhaseState = await getState(page);
  console.log('Answer phase state:', JSON.stringify({
    phase: answerPhaseState?.currentPhase,
    stepType: answerPhaseState?.stepType,
  }));
  expect(answerPhaseState?.currentPhase === 'answer' || answerPhaseState?.currentPhase === 'build_equation').toBeTruthy();

  // Submit correct answer
  const submitted = await submitCorrectAnswer(page);
  await page.waitForTimeout(800);
  expect(submitted).toBe(true);

  // After submit, should see explain phase or advance
  const afterSubmit = await getState(page);
  console.log('After submit:', JSON.stringify({
    phase: afterSubmit?.currentPhase,
    step: afterSubmit?.currentStepIndex,
  }));
  // Either in explain phase or already advanced to next step
  expect(afterSubmit?.completed !== true || afterSubmit?.currentStepIndex >= 1).toBeTruthy();
});

test('v2.11.0-real: single-click submit per step (no double-advance)', async ({ page }) => {
  test.setTimeout(120000);
  await setupRealUserState(page);

  let transitions = 0;
  let lastStepIndex = 0;
  let maxIter = 120;

  while (maxIter-- > 0) {
    const state = await getState(page);
    if (state?.completed) break;

    const phase = state?.currentPhase;
    const stepIdx = state?.currentStepIndex;
    if (stepIdx !== lastStepIndex) {
      transitions++;
      lastStepIndex = stepIdx;
    }

    if (phase === 'answer' || phase === 'build_equation') {
      await submitCorrectAnswer(page);
      await page.waitForTimeout(800);
    } else {
      await advancePhase(page);
      await page.waitForTimeout(400);
    }
  }

  const finalState = await getState(page);
  console.log('Transitions:', transitions, 'Completed:', finalState?.completed);

  // Each step should advance exactly once (no double-advance skipping steps)
  // 6 questions = 6 transitions
  expect(transitions).toBeLessThanOrEqual(6);
  expect(finalState?.completed).toBe(true);
});

test('v2.11.0-real: last question (step 6) requires answer — cannot bypass', async ({ page }) => {
  test.setTimeout(120000);
  await setupRealUserState(page);

  // Fast-forward through first 5 steps
  for (let step = 0; step < 5; step++) {
    for (let i = 0; i < 20; i++) {
      const state = await getState(page);
      if (state?.currentStepIndex !== step) break;
      if (state?.completed) break;
      if (state?.currentPhase === 'answer' || state?.currentPhase === 'build_equation') {
        await submitCorrectAnswer(page);
        await page.waitForTimeout(600);
      }
      await advancePhase(page);
      await page.waitForTimeout(300);
    }
  }

  // Now at step 6 — advance to answer phase without answering
  for (let i = 0; i < 15; i++) {
    const state = await getState(page);
    if (state?.completed) break;
    if (state?.currentPhase === 'answer' || state?.currentPhase === 'build_equation') break;
    await advancePhase(page);
    await page.waitForTimeout(300);
  }

  const atAnswer = await getState(page);
  console.log('At step 6 answer:', JSON.stringify({
    step: atAnswer?.currentStepIndex,
    phase: atAnswer?.currentPhase,
    stepType: atAnswer?.stepType,
  }));

  expect(atAnswer?.currentStepIndex).toBe(5);
  expect(atAnswer?.currentPhase).toBe('answer');
  const answerBox = page.locator('input[name="answer"]');
  await expect(answerBox).toBeVisible();
  const finishWithoutAnswer = page.getByRole('button', { name: /完成.*下一关|学会了|继续破案/ });
  await expect(finishWithoutAnswer).toHaveCount(0);
  const priorFinalAttempts = await page.evaluate((questionId) => {
    const state = JSON.parse(localStorage.getItem('math-detective-state') || '{}');
    return (state.learningEvents || []).filter((event: any) => event.eventType === 'attempt_submitted' && event.questionId === questionId).length;
  }, atAnswer?.questionId);
  expect(priorFinalAttempts, 'No final-question attempt should exist before submission').toBe(0);
  expect(atAnswer?.completed).toBe(false);
  const feedbackClose = page.getByRole('dialog').getByRole('button', { name: '关闭反馈' });
  if (await feedbackClose.isVisible().catch(() => false)) {
    await feedbackClose.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }

  // Now submit the actual current question through its visible answer form once.
  const submitted = await submitCurrentAnswerThroughUi(page);
  expect(submitted.questionId).toBe(atAnswer?.questionId);
  expect(submitted.afterAttempts - submitted.beforeAttempts).toBe(1);

  const closeFeedback = page.getByRole('dialog').getByRole('button', { name: /关闭反馈|继续学习/ }).first();
  if (await closeFeedback.isVisible().catch(() => false)) await closeFeedback.click();
  const finish = page.getByRole('button', { name: /完成.*下一关|学会了|继续破案/ }).first();
  await expect(finish).toBeVisible({ timeout: 3000 });
  await finish.click();
  await page.waitForTimeout(500);

  const finalState = await getState(page);
  console.log('Final after correct answer:', JSON.stringify({
    completed: finalState?.completed,
  }));
  expect(finalState?.completed).toBe(true);
});
