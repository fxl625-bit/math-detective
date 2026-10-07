import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { submitCurrentAnswerThroughUi } from './helpers/legacy-lesson';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/**
 * v2.11.2: Full six-question real-flow E2E test.
 *
 * Verifies that all 6 questions proceed correctly:
 * Q1 (find_numbers) → Q2 (find_action_words) → Q3 (simulation)
 * → Q4 (remove_noise) → Q5 (answer_only) → Q6 (answer_only) → completion
 *
 * Questions:
 * Q1: g1ll_02 — 树上有13只小鸟，飞走了7只，树上还剩几只？ answer=6
 * Q2: g1ll_03 — 小红有15颗糖果，送给小明8颗，小红还剩几颗糖果？ answer=7
 * Q3: g1ll_29 — 公园里一共有多少朵花？ answer=23
 * Q4: g1ll_07 — 公园里还剩几只鸽子？ answer=8
 * Q5: g1ll_32 — 爷爷比小明大多少岁？ answer=57
 * Q6: g1ll_68 — 1 1 2 3 5 __ 横线上应该填几？ answer=8
 */

const today = new Date().toISOString().slice(0, 10);
const lessonDate = today;

function buildFullLessonFixture() {
  const steps = [
    {
      id: `${lessonDate}_find_numbers_0_g1ll_02`,
      type: 'find_numbers' as const,
      questionId: 'g1ll_02',
      title: '找数字线索',
      description: '从题目中找到数字',
      phases: ['read', 'find_numbers', 'answer', 'explain'],
      currentPhaseIndex: 0,
      status: 'active' as const,
    },
    {
      id: `${lessonDate}_find_action_words_1_g1ll_03`,
      type: 'find_action_words' as const,
      questionId: 'g1ll_03',
      title: '找动作词',
      description: '找到加减动作词',
      phases: ['read', 'find_keywords', 'choose_operation', 'answer', 'explain'],
      currentPhaseIndex: 0,
      status: 'locked' as const,
    },
    {
      id: `${lessonDate}_simulation_2_g1ll_29`,
      type: 'simulation' as const,
      questionId: 'g1ll_29',
      title: '模拟场景',
      description: '模拟题目场景',
      phases: ['read', 'choose_operation', 'answer', 'explain'],
      currentPhaseIndex: 0,
      status: 'locked' as const,
    },
    {
      id: `${lessonDate}_remove_noise_3_g1ll_07`,
      type: 'remove_noise' as const,
      questionId: 'g1ll_07',
      title: '擦掉没用的信息',
      description: '去掉多余信息',
      phases: ['read', 'remove_noise', 'answer', 'explain'],
      currentPhaseIndex: 0,
      status: 'locked' as const,
    },
    {
      id: `${lessonDate}_answer_only_4_g1ll_32`,
      type: 'answer_only' as const,
      questionId: 'g1ll_32',
      title: '今日挑战',
      description: '仔细读题，直接算出答案',
      phases: ['answer', 'explain'],
      currentPhaseIndex: 0,
      status: 'locked' as const,
    },
    {
      id: `${lessonDate}_answer_only_5_g1ll_68`,
      type: 'answer_only' as const,
      questionId: 'g1ll_68',
      title: '今日挑战',
      description: '仔细读题，直接算出答案',
      phases: ['answer', 'explain'],
      currentPhaseIndex: 0,
      status: 'locked' as const,
    },
  ];

  return {
    date: lessonDate,
    steps,
    currentStepIndex: 0,
    completed: false,
    caseStoryId: undefined,
    rewardClaimed: false,
    rewardShown: false,
    completedAt: null,
    generatedByVersion: '2.11.2',
    generatorVersion: 5,
    curriculumSnapshot: { semester: 'lower', grade: 1 },
  };
}

async function setupFullFlow(page: Page) {
  await page.goto(`${BASE}/play?e2e=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!(window as any).MATH_DETECTIVE_TEST, { timeout: 15000 });

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

  const lesson = buildFullLessonFixture();
  await page.evaluate((lessonData: any) => {
    (window as any).MATH_DETECTIVE_TEST?.setLesson(lessonData);
  }, lesson);
  await page.waitForTimeout(500);
}

async function getState(page: Page): Promise<any> {
  return await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.getState());
}

async function dismissOverlay(page: Page) {
  await page.waitForTimeout(500);
  try {
    const backdrop = page.locator('.fixed.inset-0.z-40').first();
    if (await backdrop.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backdrop.click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(500);
    }
  } catch { /* no overlay */ }
  try {
    const closeBtn = page.locator('.fixed.inset-0.z-40 button').first();
    if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  } catch { /* no close button */ }
  await page.waitForTimeout(300);
}

// ========== Test: Full six-question real flow ==========

test('v2.11.2-full-six-question-flow: All 6 questions progress to completion', async ({ page }) => {
  test.setTimeout(300000); // 5 minutes
  await setupFullFlow(page);

  const report: any = {
    generatedAt: new Date().toISOString(),
    appVersion: '2.11.2',
    steps: [] as any[],
  };

  // =====================================================================
  // Q1: find_numbers (g1ll_02) — answer=6
  // =====================================================================
  console.log('=== Q1: find_numbers (g1ll_02) ===');

  // Read phase → "读完了，开始找数字 →"
  const q1ReadBtn = page.locator('button:has-text("读完了")').first();
  await q1ReadBtn.click();
  await page.waitForTimeout(300);

  // Find numbers: click 13 and 7
  for (const n of [13, 7]) {
    const numBtn = page.locator(`button:has-text("${n}")`).first();
    if (await numBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await numBtn.click();
      await page.waitForTimeout(150);
    }
  }
  await page.waitForTimeout(200);

  // Advance to answer
  const q1Advance = page.locator('button:has-text("数字找齐了"), button:has-text("去列算式"), button:has-text("去算答案")').first();
  await expect(q1Advance, 'Q1 advance button must be visible').toBeVisible({ timeout: 3000 });
  await q1Advance.click();
  await page.waitForTimeout(300);

  // Submit answer
  const q1Input = page.locator('input[name="answer"]').first();
  await expect(q1Input, 'Q1 answer input must be visible').toBeVisible({ timeout: 3000 });
  const q1Result = await submitCurrentAnswerThroughUi(page, 'click', '6');
  expect(q1Result.questionId).toBe('g1ll_02');
  report.steps.push({ question: 'Q1-g1ll_02', answer: q1Result.answer, attemptDelta: q1Result.afterAttempts - q1Result.beforeAttempts, phase: q1Result.afterState.currentPhase });

  // Continue → Q2
  await page.locator('button:has-text("继续"), button:has-text("下一关")').first().click();
  await page.waitForTimeout(1500);
  await dismissOverlay(page);

  // =====================================================================
  // Q2: find_action_words (g1ll_03) — answer=7
  // =====================================================================
  console.log('=== Q2: find_action_words (g1ll_03) ===');

  // Read phase
  await page.locator('button:has-text("读完了")').first().click();
  await page.waitForTimeout(300);

  // Find keywords: click "送给" and "还剩"
  for (const kw of ['送给', '还剩']) {
    const kwBtn = page.locator(`button:has-text("${kw}")`).first();
    if (await kwBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await kwBtn.click();
      await page.waitForTimeout(200);
    }
  }

  // Click "关键词找到了，判断运算 →"
  const kwAdvance = page.locator('button:has-text("关键词找到了")').first();
  if (await kwAdvance.isVisible({ timeout: 2000 }).catch(() => false)) {
    await kwAdvance.click();
    await page.waitForTimeout(300);
  }

  // Choose operation: subtraction
  await page.waitForTimeout(300);
  const subtractBtn = page.locator('button:has-text("变少了"), button:has-text("用减法")').first();
  if (await subtractBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await subtractBtn.click();
    await page.waitForTimeout(200);
  }

  // Advance to answer
  const q2Advance = page.locator('button:has-text("判断完毕"), button:has-text("去算答案")').first();
  await q2Advance.click();
  await page.waitForTimeout(500);

  // Verify answer page
  const q2Input = page.locator('input[name="answer"]').first();
  await expect(q2Input, 'Q2 answer input must be visible').toBeVisible({ timeout: 3000 });
  const q2SubmitBtn = page.locator('button[type="submit"]').first();
  await expect(q2SubmitBtn, 'Q2 submit button must be visible').toBeVisible({ timeout: 2000 });

  // Submit answer
  const q2Result = await submitCurrentAnswerThroughUi(page, 'click', '7');
  expect(q2Result.questionId).toBe('g1ll_03');
  report.steps.push({ question: 'Q2-g1ll_03', answer: q2Result.answer, inputVisible: true, submitVisible: true, attemptDelta: q2Result.afterAttempts - q2Result.beforeAttempts, phase: q2Result.afterState.currentPhase });

  // Continue → Q3
  await page.locator('button:has-text("继续"), button:has-text("下一关")').first().click();
  await page.waitForTimeout(1500);
  await dismissOverlay(page);

  // =====================================================================
  // Q3: simulation (g1ll_29) — answer=23
  // =====================================================================
  console.log('=== Q3: simulation (g1ll_29) ===');

  // Read phase
  await page.locator('button:has-text("读完了")').first().click();
  await page.waitForTimeout(300);

  // Choose operation: addition (变多了)
  const addBtn = page.locator('button:has-text("变多了")').first();
  if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addBtn.click();
    await page.waitForTimeout(200);
  }

  // Advance to answer
  const q3Advance = page.locator('button:has-text("判断完毕"), button:has-text("去算答案")').first();
  await q3Advance.click();
  await page.waitForTimeout(300);

  // Submit answer
  const q3Input = page.locator('input[name="answer"]').first();
  await expect(q3Input, 'Q3 answer input must be visible').toBeVisible({ timeout: 3000 });
  const q3Result = await submitCurrentAnswerThroughUi(page, 'click', '23');
  expect(q3Result.questionId).toBe('g1ll_29');
  report.steps.push({ question: 'Q3-g1ll_29', answer: q3Result.answer, attemptDelta: q3Result.afterAttempts - q3Result.beforeAttempts, phase: q3Result.afterState.currentPhase });

  // Continue → Q4
  await page.locator('button:has-text("继续"), button:has-text("下一关")').first().click();
  await page.waitForTimeout(1500);
  await dismissOverlay(page);

  // =====================================================================
  // Q4: remove_noise (g1ll_07) — answer=8
  // =====================================================================
  console.log('=== Q4: remove_noise (g1ll_07) ===');

  // Read phase
  await page.locator('button:has-text("读完了")').first().click();
  await page.waitForTimeout(300);

  // Click noise phrases to remove them (they are <span> elements)
  const noiseSegments = page.locator('span:has-text("星期天"), span:has-text("妈妈带小明去公园玩")');
  const noiseCount = await noiseSegments.count();
  for (let i = 0; i < noiseCount; i++) {
    const seg = noiseSegments.nth(i);
    if (await seg.isVisible({ timeout: 1000 }).catch(() => false)) {
      await seg.click();
      await page.waitForTimeout(200);
    }
  }

  // Advance to answer
  const q4Advance = page.locator('button:has-text("废话擦干净了"), button:has-text("去算答案")').first();
  if (await q4Advance.isVisible({ timeout: 2000 }).catch(() => false)) {
    await q4Advance.click();
    await page.waitForTimeout(300);
  }

  // Submit answer
  const q4Input = page.locator('input[name="answer"]').first();
  await expect(q4Input, 'Q4 answer input must be visible').toBeVisible({ timeout: 3000 });
  const q4Result = await submitCurrentAnswerThroughUi(page, 'click', '8');
  expect(q4Result.questionId).toBe('g1ll_07');
  report.steps.push({ question: 'Q4-g1ll_07', answer: q4Result.answer, attemptDelta: q4Result.afterAttempts - q4Result.beforeAttempts, phase: q4Result.afterState.currentPhase });

  // Continue → Q5
  await page.locator('button:has-text("继续"), button:has-text("下一关")').first().click();
  await page.waitForTimeout(1500);
  await dismissOverlay(page);

  // =====================================================================
  // Q5: answer_only (g1ll_32), submitted through the real answer form.
  // =====================================================================
  console.log('=== Q5: answer_only (g1ll_32) ===');
  await page.waitForTimeout(500);

  const q5State = await getState(page);
  expect(q5State?.currentStepIndex, 'Should be at Q5').toBe(4);
  expect(q5State?.questionId, 'Should be g1ll_32').toBe('g1ll_32');

  const q5Result = await submitCurrentAnswerThroughUi(page, 'click', '57');
  expect(q5Result.questionId).toBe('g1ll_32');
  report.steps.push({ question: 'Q5-g1ll_32', answer: q5Result.answer, attemptDelta: q5Result.afterAttempts - q5Result.beforeAttempts, phase: q5Result.afterState.currentPhase });

  await dismissOverlay(page);
  await page.locator('button:has-text("下一关"), button:has-text("完成"), button:has-text("继续"), button:has-text("学会了")').first().click();
  await page.waitForTimeout(1500);
  await dismissOverlay(page);

  // =====================================================================
  // Q6: answer_only (g1ll_68), submitted through the real answer form.
  // =====================================================================
  console.log('=== Q6: answer_only (g1ll_68) ===');
  await page.waitForTimeout(500);

  const q6State = await getState(page);
  expect(q6State?.currentStepIndex, 'Should be at Q6').toBe(5);
  expect(q6State?.questionId, 'Should be g1ll_68').toBe('g1ll_68');

  const q6Result = await submitCurrentAnswerThroughUi(page, 'click', '8');
  expect(q6Result.questionId).toBe('g1ll_68');
  await page.waitForTimeout(1000);

  // =====================================================================
  // Q6 Finish: Verify explain phase shows completion button
  // =====================================================================
  console.log('=== Q6: verify completion ===');

  expect((await getState(page))?.currentPhase, 'Q6 must reach its explanation phase').toBe('explain');

  // Find and verify the finish button
  const finishBtn = page.locator('button:has-text("学会"), button:has-text("继续破案"), button:has-text("完成")').first();
  await expect(finishBtn, 'Q6 finish button must be visible').toBeVisible({ timeout: 3000 });

  // Verify button is not disabled
  const btnDisabled = await finishBtn.evaluate((el) => (el as HTMLButtonElement).disabled);
  expect(btnDisabled, 'Q6 finish button must NOT be disabled').toBe(false);

  // Take screenshot for visual verification
  await page.screenshot({ path: test.info().outputPath('full-six-q-finish.png') });

  // Click the finish button once
  await finishBtn.click();
  await page.waitForTimeout(2000);

  // =====================================================================
  // Verify completion
  // =====================================================================
  const finalState = await getState(page);
  const finalBody = await page.locator('body').innerText();
  const isComplete = finalState?.completed
    || finalBody.includes('侦破')
    || finalBody.includes('完成')
    || finalBody.includes('今日任务已全部完成');

  expect(isComplete, 'Must reach completion page after all 6 questions').toBe(true);

  report.steps.push({ question: 'Q6-g1ll_68', answer: q6Result.answer, attemptDelta: q6Result.afterAttempts - q6Result.beforeAttempts, finishButtonDisabled: btnDisabled, phase: q6Result.afterState.currentPhase });
  report.finalState = {
    completed: finalState?.completed,
    completionReached: isComplete,
    totalSteps: 6,
  };

  // Save report
  const reportPath = test.info().outputPath('full-six-question-flow.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('Full six-question report saved to reports/full-six-question-flow.json');

  // Final assertion: all 6 steps completed
  expect(report.steps.length, 'All 6 questions must be completed').toBe(6);
  expect(isComplete, 'Must reach completion page').toBe(true);
});
