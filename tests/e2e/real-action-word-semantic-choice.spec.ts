import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * v2.11.3: Action word semantic choice E2E test.
 *
 * Tests that keyword direction is correctly validated in FindActionWordsPhased,
 * NOT confused with solution operation for reverse problems.
 *
 * Test cases:
 * 1. Keyword "加" → correct option is "数量变多，用加法" (increase), NOT "数量变少，用减法"
 * 2. Keyword "飞走" → correct option is "数量变少，用减法" (decrease)
 * 3. Reverse problem "又给了" → action direction is increase, even though solution is subtraction
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const today = new Date().toISOString().slice(0, 10);

function buildFixture(questionId: string, stepIndex: number) {
  const steps = [
    {
      id: `${today}_find_action_words_${stepIndex}_${questionId}`,
      type: 'find_action_words' as const,
      questionId,
      title: '找动作词',
      description: '找到加减动作词',
      phases: ['read', 'find_keywords', 'choose_operation', 'answer', 'explain'],
      currentPhaseIndex: 0,
      status: 'active' as const,
    },
  ];

  return {
    date: today,
    steps,
    currentStepIndex: 0,
    completed: false,
    caseStoryId: undefined,
    rewardClaimed: false,
    rewardShown: false,
    completedAt: null,
    generatedByVersion: '2.11.3',
    generatorVersion: 5,
    curriculumSnapshot: { semester: 'lower', grade: 1 },
  };
}

async function setup(page: Page, questionId: string) {
  await page.goto(`${BASE}/play?e2e=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!(window as any).MATH_DETECTIVE_TEST, { timeout: 15000 });

  await page.evaluate((s: string) => {
    localStorage.setItem('math-detective-state', s);
  }, JSON.stringify({
    version: 9, stars: 57, streak: 2, totalCompleted: 24,
    correctCount: 23, wrongCount: 1, answerAttempts: 25, level: 2,
    badges: [], completedQuestions: [], mistakes: [],
    completedToday: 0, lastPlayDate: today, lastCheckinDate: '',
    lastStreakCheckDate: '', skillMistakes: {}, skillLevel: 2,
    parentRewards: [], rewardRedemptions: [], parentGateAttempts: [],
    weeklySnapshots: [], resumeCards: 1,
    decorations: [], collectibleCards: [],
    questionReviewDates: {}, questionReviewCounts: {},
    attemptRecords: [],
    parentSettings: { gradeBand: 'G1', dailyGoal: 6, maxDifficulty: 5, semester: 'lower' },
    curriculumProfile: {
      country: 'CN', textbookEdition: 'PEP', grade: 1,
      semester: 'lower', detectedAt: '2026-06-23T00:00:00.000Z',
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

  const lesson = buildFixture(questionId, 0);
  await page.evaluate((l: any) => {
    (window as any).MATH_DETECTIVE_TEST?.setLesson(l);
  }, lesson);
  await page.waitForTimeout(500);
}

// ================================================================
// Test 1: Keyword "加" — must select "increase" NOT "decrease"
// g1t_29: 5 + ⭐ = 12, keyword: "加" type:'add', operation:'subtraction'
// ================================================================
test('v2.11.3-action-word-semantic: keyword "加" must select increase', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page, 'g1t_29');

  // Read phase → click "读完了"
  await page.locator('button:has-text("读完了")').first().click();
  await page.waitForTimeout(300);

  // Find keywords phase — click keyword "加"
  const kwAddBtn = page.locator('button:has-text("加")').first();
  await expect(kwAddBtn, 'Keyword "加" button must be visible').toBeVisible({ timeout: 3000 });
  await kwAddBtn.click();
  await page.waitForTimeout(200);

  // Click "关键词找到了，判断运算 →"
  const advanceBtn = page.locator('button:has-text("关键词找到了")').first();
  await advanceBtn.click();
  await page.waitForTimeout(300);

  // Choose operation phase
  // Options should be: "数量变多，用加法" (increase) and "数量变少，用减法" (decrease)
  const increaseBtn = page.locator('button:has-text("变多")').first();
  const decreaseBtn = page.locator('button:has-text("变少")').first();

  await expect(increaseBtn, 'Increase option must be visible').toBeVisible({ timeout: 3000 });
  await expect(decreaseBtn, 'Decrease option must be visible').toBeVisible({ timeout: 3000 });

  // === CRITICAL ASSERTION: clicking increase should show GREEN (correct) ===
  console.log('=== Test: clicking INCREASE option ===');
  await increaseBtn.click();
  await page.waitForTimeout(500);

  // Check if the button turned green (bg-green-100)
  const increaseClasses = await increaseBtn.getAttribute('class');
  console.log('Increase button classes after click:', increaseClasses);
  const isIncreaseGreen = increaseClasses?.includes('bg-green-100') || increaseClasses?.includes('green');

  // Take screenshot
  await page.screenshot({ path: test.info().outputPath('action-word-increase.png') });

  // If increase is marked as CORRECT (green), the fix works
  expect(isIncreaseGreen,
    'Keyword "加" (increase) must be the CORRECT choice. Got: ' + (increaseClasses || 'null')
  ).toBe(true);

  // === CRITICAL ASSERTION: clicking decrease should show RED (incorrect) ===
  console.log('=== Test: clicking DECREASE option ===');
  await page.waitForTimeout(300);
  // Reset: click increase again to get back to initial, then click decrease
  // Actually, clicking decrease directly should show it as wrong
  await decreaseBtn.click();
  await page.waitForTimeout(500);

  const decreaseClasses = await decreaseBtn.getAttribute('class');
  console.log('Decrease button classes after click:', decreaseClasses);
  const isDecreaseRed = decreaseClasses?.includes('bg-red-100') || decreaseClasses?.includes('red');

  await page.screenshot({ path: test.info().outputPath('action-word-decrease-wrong.png') });

  expect(isDecreaseRed,
    'Keyword "加" → "数量变少，用减法" must be WRONG. Got: ' + (decreaseClasses || 'null')
  ).toBe(true);
});

// ================================================================
// Test 2: Keyword "飞走了" — must select "decrease" NOT "increase"
// g1_17: 花丛中有8只蝴蝶，飞走了3只... keyword: [{word:'飞走了', type:'subtract'}]
// Only ONE keyword, so clicking it enables the advance button immediately.
// ================================================================
test('v2.11.3-action-word-semantic: keyword "飞走了" must select decrease', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page, 'g1_17');

  // Read phase
  await page.locator('button:has-text("读完了")').first().click();
  await page.waitForTimeout(300);

  // Find keywords — g1_17 has only ONE keyword: "飞走了"
  const kwBtn = page.locator('button:has-text("飞走了")').first();
  await expect(kwBtn, 'Keyword "飞走了" button must be visible').toBeVisible({ timeout: 3000 });
  await kwBtn.click();
  await page.waitForTimeout(200);

  // Advance
  const advanceBtn = page.locator('button:has-text("关键词找到了")').first();
  await advanceBtn.click();
  await page.waitForTimeout(300);

  // Choose operation
  const decreaseBtn = page.locator('button:has-text("变少")').first();
  await expect(decreaseBtn, 'Decrease option must be visible').toBeVisible({ timeout: 3000 });

  // Click decrease
  await decreaseBtn.click();
  await page.waitForTimeout(500);

  const decreaseClasses = await decreaseBtn.getAttribute('class');
  const isDecreaseCorrect = decreaseClasses?.includes('bg-green-100') || decreaseClasses?.includes('green');

  await page.screenshot({ path: test.info().outputPath('action-word-flyaway-correct.png') });

  expect(isDecreaseCorrect,
    'Keyword "飞走" (decrease) must be the CORRECT choice'
  ).toBe(true);
});

// ================================================================
// Test 3: Reverse problem "又给了" — action increase, solution subtraction
// g1ll_10: 妈妈又给了他一些糖... keywords: [{word:'又给了', type:'add'}], operation:'subtraction'
// ================================================================
test('v2.11.3-action-word-semantic: reverse problem distinguishes action from solution', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page, 'g1ll_10');

  // Read phase
  await page.locator('button:has-text("读完了")').first().click();
  await page.waitForTimeout(300);

  // Find keywords
  const kwBtn = page.locator('button:has-text("又给了")').first();
  await expect(kwBtn, '"又给了" keyword must be visible').toBeVisible({ timeout: 3000 });
  await kwBtn.click();
  await page.waitForTimeout(200);

  // Advance
  const advanceBtn = page.locator('button:has-text("关键词找到了")').first();
  await advanceBtn.click();
  await page.waitForTimeout(300);

  // Choose operation phase
  const increaseBtn = page.locator('button:has-text("变多")').first();
  const decreaseBtn = page.locator('button:has-text("变少")').first();

  await expect(increaseBtn, 'Increase option must be visible').toBeVisible({ timeout: 3000 });

  // "又给了" means INCREASE even though the solution uses subtraction (20-11=9)
  await increaseBtn.click();
  await page.waitForTimeout(500);

  const increaseClasses = await increaseBtn.getAttribute('class');
  const isIncreaseCorrect = increaseClasses?.includes('bg-green-100') || increaseClasses?.includes('green');

  await page.screenshot({ path: test.info().outputPath('action-word-reverse-correct.png') });

  expect(isIncreaseCorrect,
    'Reverse problem: "又给了" means increase, must be correct. Solution is subtraction but action direction is increase.'
  ).toBe(true);
});

// ================================================================
// Save audit report
// ================================================================
test.afterAll(async () => {
  const report = {
    generatedAt: new Date().toISOString(),
    appVersion: '2.11.3',
    tests: [
      { id: 'test1', keyword: '加', expected: 'increase', status: 'run' },
      { id: 'test2', keyword: '飞走', expected: 'decrease', status: 'run' },
      { id: 'test3', keyword: '又给了', expected: 'increase (reverse)', status: 'run' },
    ],
    rootCause: 'checkOk in FindActionWordsPhased used question.operation instead of keyword direction',
    fix: 'checkOk now derives action direction from classifyKeyword() with keyword.type fallback',
  };
  const reportPath = path.join(__dirname, '..', '..', 'reports', 'action-word-choice-audit.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
});
