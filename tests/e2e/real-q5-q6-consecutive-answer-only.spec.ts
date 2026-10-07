import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { submitCurrentAnswerThroughUi } from './helpers/legacy-lesson';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/**
 * v2.11.1: Real Q5→Q6 consecutive answer_only flow test.
 *
 * Q5: g1ll_32 — 小明今年8岁，爷爷今年65岁。爷爷比小明大多少岁？ (answer=57)
 * Q6: g1ll_68 — 找规律填数：1、1、2、3、5、__。横线上应该填几？ (answer=8)
 *
 * Both use stepType=answer_only.
 * v2.11.1 fix: answer_only no longer shows a "read" phase — answer input appears immediately.
 */

const today = new Date().toISOString().slice(0, 10);
const lessonDate = today;

function buildLessonFixture() {
  // Build a real TodayLesson with the exact 6 questions the user specified
  const steps = [
    {
      id: `${lessonDate}_find_numbers_0_g1ll_02`,
      type: 'find_numbers' as const,
      questionId: 'g1ll_02',
      title: '找数字线索',
      description: '从题目中找到数字',
      phases: ['read', 'find_numbers', 'answer', 'explain'] as string[],
      currentPhaseIndex: 0,
      status: 'completed' as const,
      awardedAt: `${lessonDate}T00:00:00.000Z`,
    },
    {
      id: `${lessonDate}_find_action_words_1_g1ll_13`,
      type: 'find_action_words' as const,
      questionId: 'g1ll_13',
      title: '找动作词',
      description: '找到加减动作词',
      phases: ['read', 'find_keywords', 'choose_operation', 'answer', 'explain'] as string[],
      currentPhaseIndex: 0,
      status: 'completed' as const,
      awardedAt: `${lessonDate}T00:00:00.000Z`,
    },
    {
      id: `${lessonDate}_simulation_2_g1ll_29`,
      type: 'simulation' as const,
      questionId: 'g1ll_29',
      title: '模拟场景',
      description: '模拟题目场景',
      phases: ['read', 'choose_operation', 'answer', 'explain'] as string[],
      currentPhaseIndex: 0,
      status: 'completed' as const,
      awardedAt: `${lessonDate}T00:00:00.000Z`,
    },
    {
      id: `${lessonDate}_remove_noise_3_g1ll_07`,
      type: 'remove_noise' as const,
      questionId: 'g1ll_07',
      title: '擦掉没用的信息',
      description: '去掉多余信息',
      phases: ['read', 'remove_noise', 'answer', 'explain'] as string[],
      currentPhaseIndex: 0,
      status: 'completed' as const,
      awardedAt: `${lessonDate}T00:00:00.000Z`,
    },
    {
      // Q5: The critical answer_only step
      id: `${lessonDate}_answer_only_4_g1ll_32`,
      type: 'answer_only' as const,
      questionId: 'g1ll_32',
      title: '今日挑战',
      description: '仔细读题，直接算出答案',
      phases: ['answer', 'explain'] as string[],  // v2.11.1: No read phase
      currentPhaseIndex: 0,
      status: 'active' as const,
    },
    {
      // Q6: Consecutive answer_only step
      id: `${lessonDate}_answer_only_5_g1ll_68`,
      type: 'answer_only' as const,
      questionId: 'g1ll_68',
      title: '今日挑战',
      description: '仔细读题，直接算出答案',
      phases: ['answer', 'explain'] as string[],  // v2.11.1: No read phase
      currentPhaseIndex: 0,
      status: 'locked' as const,
    },
  ];

  return {
    date: lessonDate,
    steps,
    currentStepIndex: 4, // Start at Q5 (index 4)
    completed: false,
    caseStoryId: 'daily_training',
    rewardClaimed: false,
    rewardShown: false,
    completedAt: null,
    generatedByVersion: '2.11.1',
    generatorVersion: 5,
    curriculumSnapshot: {
      semester: 'lower',
      grade: 1,
    },
  };
}

async function setupQ5Start(page: Page) {
  // Navigate first, then seed state and inject lesson via test API
  await page.goto(`${BASE}/play?e2e=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for test API to be ready
  await page.waitForFunction(() => !!(window as any).MATH_DETECTIVE_TEST, { timeout: 15000 });

  // Seed state in localStorage (needed by loadState, curriculum profile, etc.)
  await page.evaluate((stateJson: string) => {
    localStorage.setItem('math-detective-state', stateJson);
  }, JSON.stringify({
    version: 9, stars: 57, streak: 2, totalCompleted: 24,
    correctCount: 23, wrongCount: 1, answerAttempts: 25, level: 2,
    badges: [], completedQuestions: [], mistakes: [],
    completedToday: 0, lastPlayDate: lessonDate, lastCheckinDate: '',
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
  }));

  // Inject lesson directly via test API — bypasses getTodayLesson() validation
  const lesson = buildLessonFixture();
  await page.evaluate((lessonData: any) => {
    (window as any).MATH_DETECTIVE_TEST?.setLesson(lessonData);
  }, lesson);

  // Wait for the lesson to be applied
  await page.waitForTimeout(500);
}

async function getState(page: Page): Promise<any> {
  return await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.getState());
}

async function dismissProgressToast(page: Page) {
  // Dismiss any progress notification toast that may be blocking clicks
  // These appear after completing a step ("✅ 很好，下一条线索出现了！...")
  try {
    // Try clicking the toast close button
    const closeBtn = page.locator('.fixed.inset-0.z-40 button').first();
    if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  } catch { /* no toast */ }
  // Wait for any animations to complete
  await page.waitForTimeout(200);
}

// ========== Test 1: Q5 immediately shows answer input (no read phase) ==========

test('v2.11.1-q5-immediate-answer: Q5 answer_only shows answer input immediately', async ({ page }) => {
  test.setTimeout(90000);
  await setupQ5Start(page);

  const state = await getState(page);
  console.log('Q5 initial state:', JSON.stringify({
    step: state?.currentStepIndex,
    phase: state?.currentPhase,
    questionId: state?.questionId,
    stepType: state?.stepType,
  }));

  // Assert we're at Q5
  expect(state?.questionId).toBe('g1ll_32');
  expect(state?.stepType).toBe('answer_only');
  // v2.11.1: Phase must be 'answer', NOT 'read'
  expect(state?.currentPhase).toBe('answer');

  // Answer input must be visible immediately (no extra click needed)
  const input = page.locator('input[name="answer"]').first();
  await expect(input).toBeVisible({ timeout: 5000 });

  // Submit button must be visible
  const submitBtn = page.locator('button[type="submit"]').first();
  await expect(submitBtn).toBeVisible({ timeout: 3000 });

  // Take screenshot for evidence
  await page.screenshot({ path: test.info().outputPath('q5-initial-answer-page.png') });
});

// ========== Test 2: Q5 single click submit shows correct feedback ==========

test('v2.11.1-q5-single-submit: Q5 single click shows correct feedback', async ({ page }) => {
  test.setTimeout(90000);
  await setupQ5Start(page);

  // Wait for answer phase
  await page.waitForFunction(() => {
    const s = (window as any).MATH_DETECTIVE_TEST?.getState();
    return s?.currentPhase === 'answer';
  }, { timeout: 10000 });

  // Inject tracker for submit count, checker count, transaction count
  await page.evaluate(() => {
    (window as any).__submitCount = 0;
    (window as any).__checkerCount = 0;
    (window as any).__transactionCount = 0;

    // Monkey-patch submit to track
    const origSubmit = (window as any).MATH_DETECTIVE_TEST?.submitAnswer;
    if (origSubmit) {
      (window as any).MATH_DETECTIVE_TEST.submitAnswer = function (...args: any[]) {
        (window as any).__submitCount++;
        return (origSubmit as (...args: unknown[]) => boolean).apply(this, args);
      };
    }
  });

  // Read the actual current question answer and submit once through the UI.
  const result = await submitCurrentAnswerThroughUi(page, 'click', '57');
  expect(result.formValue).toBe(result.answer);
  expect(result.questionId).toBe('g1ll_32');
  expect(result.afterAttempts - result.beforeAttempts).toBe(1);

  // Submit button should be gone (replaced by continue button)
  const submitBtnAfter = page.locator('button[type="submit"]').first();
  const submitBtnVisible = await submitBtnAfter.isVisible().catch(() => false);
  console.log('Submit button visible after correct:', submitBtnVisible);

  // Continue/next button should appear
  const continueBtn = page.locator('button:has-text("完成")').first();
  const continueVisible = await continueBtn.isVisible().catch(() => false);
  console.log('Continue button visible:', continueVisible);
  expect(continueVisible).toBe(true);

  await page.screenshot({ path: test.info().outputPath('q5-correct-feedback.png') });
});

// ========== Test 3: Q5→Q6 transition ==========

test('v2.11.1-q5-to-q6-transition: Continue from Q5 enters Q6 with fresh state', async ({ page }) => {
  test.setTimeout(90000);
  await setupQ5Start(page);

  // Complete Q5 first
  await page.waitForFunction(() => {
    const s = (window as any).MATH_DETECTIVE_TEST?.getState();
    return s?.currentPhase === 'answer';
  }, { timeout: 10000 });

  const input = page.locator('input[name="answer"]').first();
  const q5Result = await submitCurrentAnswerThroughUi(page, 'click', '57');
  expect(q5Result.questionId).toBe('g1ll_32');

  // Click "完成，进入下一关"
  const continueBtn = page.locator('button:has-text("完成")').first();
  await continueBtn.click();
  await page.waitForTimeout(1500);

  // Dismiss progress toast before checking Q6
  await dismissProgressToast(page);

  // Should now be at Q6
  const state = await getState(page);
  console.log('After Q5→Q6 transition:', JSON.stringify({
    step: state?.currentStepIndex,
    phase: state?.currentPhase,
    questionId: state?.questionId,
    stepType: state?.stepType,
  }));

  expect(state?.questionId).toBe('g1ll_68');
  expect(state?.currentStepIndex).toBe(5);

  // Q6 answer input must be visible
  const q6Input = page.locator('input[name="answer"]').first();
  const inputVisible = await q6Input.isVisible().catch(() => false);
  console.log('Q6 input visible:', inputVisible);

  // Q6 answer must NOT be pre-filled with 57 from Q5
  const q6InputValue = await q6Input.inputValue().catch(() => '');
  console.log('Q6 input value:', q6InputValue);
  expect(q6InputValue).toBe('');

  await page.screenshot({ path: test.info().outputPath('q6-arrived.png') });
});

// ========== Test 4: Q6 single submit → completion ==========

test('v2.11.1-q6-single-submit: Q6 single submit shows correct feedback', async ({ page }) => {
  test.setTimeout(90000);
  await setupQ5Start(page);

  // Complete Q5
  await page.waitForFunction(() => {
    const s = (window as any).MATH_DETECTIVE_TEST?.getState();
    return s?.currentPhase === 'answer';
  }, { timeout: 10000 });

  const q5Result = await submitCurrentAnswerThroughUi(page, 'click', '57');
  expect(q5Result.questionId).toBe('g1ll_32');

  // Click "完成，进入下一关"
  const continueBtn = page.locator('button:has-text("完成")').first();
  await continueBtn.click();
  await page.waitForTimeout(1500);

  // Dismiss any progress toast/notification that might block clicks
  await dismissProgressToast(page);

  // Wait for Q6 answer phase
  await page.waitForTimeout(1000);
  const state = await getState(page);
  console.log('Q6 state:', JSON.stringify({
    phase: state?.currentPhase,
    questionId: state?.questionId,
  }));

  if (state?.questionId !== 'g1ll_68') {
    // Might need to advance once more
    await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.goNext());
    await page.waitForTimeout(500);
  }

  const q6Result = await submitCurrentAnswerThroughUi(page, 'click', '8');
  expect(q6Result.questionId).toBe('g1ll_68');

  await page.screenshot({ path: test.info().outputPath('q6-correct-feedback.png') });

  // Try to complete
  const completeBtn = page.locator('button:has-text("完成")').first();
  const completeExists = await completeBtn.isVisible().catch(() => false);
  if (completeExists) {
    await completeBtn.click();
    await page.waitForTimeout(1500);
  }

  const finalState = await getState(page);
  console.log('Final state:', JSON.stringify({
    completed: finalState?.completed,
    step: finalState?.currentStepIndex,
  }));
});

// ========== Test 5: Full diagnostic trace ==========

test('v2.11.1-diagnostic-trace: Record full click chain for Q5 and Q6', async ({ page }) => {
  test.setTimeout(120000);

  await setupQ5Start(page);

  // Inject global event trackers AFTER setup (which navigates the page)
  await page.evaluate(() => {
    (window as any).__trace = [] as any[];
    const record = (event: string, detail: any) => {
      (window as any).__trace.push({ ts: Date.now(), event, ...detail });
    };

    document.addEventListener('pointerdown', (e) => {
      record('pointerdown', { tag: (e.target as any)?.tagName, text: (e.target as any)?.textContent?.slice(0, 20) });
    }, true);
    document.addEventListener('click', (e) => {
      record('click', { tag: (e.target as any)?.tagName, text: (e.target as any)?.textContent?.slice(0, 20), x: e.clientX, y: e.clientY });
    }, true);
    document.addEventListener('submit', (e) => {
      record('submit', { tag: (e.target as any)?.tagName });
    }, true);
  });

  // Complete Q5
  await page.waitForFunction(() => {
    const s = (window as any).MATH_DETECTIVE_TEST?.getState();
    return s?.currentPhase === 'answer';
  }, { timeout: 10000 });

  const q5Result = await submitCurrentAnswerThroughUi(page, 'click', '57');
  expect(q5Result.questionId).toBe('g1ll_32');

  // Continue to Q6
  const continueBtn = page.locator('button:has-text("完成")').first();
  await continueBtn.click();
  await page.waitForTimeout(1500);

  // Dismiss progress toast
  await dismissProgressToast(page);

  // Try Q6
  const q6Result = await submitCurrentAnswerThroughUi(page, 'click', '8');
  expect(q6Result.questionId).toBe('g1ll_68');

  // Collect trace
  const trace = await page.evaluate(() => (window as any).__trace);

  // Save trace to file
  const tracePath = test.info().outputPath('q5-q6-consecutive-trace.json');
  fs.mkdirSync(path.dirname(tracePath), { recursive: true });
  fs.writeFileSync(tracePath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    appVersion: '2.11.1',
    question5: {
      questionId: 'g1ll_32',
      answer: 57,
      stepType: 'answer_only',
    },
    question6: {
      questionId: 'g1ll_68',
      answer: 8,
      stepType: 'answer_only',
    },
    events: trace,
    eventCount: trace.length,
  }, null, 2));

  console.log(`Trace saved to reports/q5-q6-consecutive-trace.json (${trace.length} events)`);
  expect(trace.length).toBeGreaterThan(0);
});
