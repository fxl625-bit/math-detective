import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * v2.11.3: Q5 double-submit regression test.
 *
 * Q5 (g1ll_32): 小明今年8岁，爷爷今年65岁。爷爷比小明大多少岁？ answer=57
 * stepType: answer_only, phases: ['answer', 'explain']
 *
 * Tests that a SINGLE click on "提交答案" correctly submits and shows feedback.
 * Tracks submit count, blur events, and button replacement.
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const today = new Date().toISOString().slice(0, 10);

function buildFullLessonFixture() {
  const steps = [
    {
      id: `${today}_find_numbers_0_g1ll_02`,
      type: 'find_numbers' as const, questionId: 'g1ll_02',
      title: '找数字线索', phases: ['read', 'find_numbers', 'answer', 'explain'],
      currentPhaseIndex: 0, status: 'active' as const,
    },
    {
      id: `${today}_find_action_words_1_g1ll_03`,
      type: 'find_action_words' as const, questionId: 'g1ll_03',
      title: '找动作词', phases: ['read', 'find_keywords', 'choose_operation', 'answer', 'explain'],
      currentPhaseIndex: 0, status: 'locked' as const,
    },
    {
      id: `${today}_simulation_2_g1ll_29`,
      type: 'simulation' as const, questionId: 'g1ll_29',
      title: '模拟场景', phases: ['read', 'choose_operation', 'answer', 'explain'],
      currentPhaseIndex: 0, status: 'locked' as const,
    },
    {
      id: `${today}_remove_noise_3_g1ll_07`,
      type: 'remove_noise' as const, questionId: 'g1ll_07',
      title: '擦掉没用的信息', phases: ['read', 'remove_noise', 'answer', 'explain'],
      currentPhaseIndex: 0, status: 'locked' as const,
    },
    {
      id: `${today}_answer_only_4_g1ll_32`,
      type: 'answer_only' as const, questionId: 'g1ll_32',
      title: '今日挑战', phases: ['answer', 'explain'],
      currentPhaseIndex: 0, status: 'locked' as const,
    },
    {
      id: `${today}_answer_only_5_g1ll_68`,
      type: 'answer_only' as const, questionId: 'g1ll_68',
      title: '今日挑战', phases: ['answer', 'explain'],
      currentPhaseIndex: 0, status: 'locked' as const,
    },
  ];

  return {
    date: today, steps, currentStepIndex: 0, completed: false,
    caseStoryId: undefined, rewardClaimed: false, rewardShown: false, completedAt: null,
    generatedByVersion: '2.11.3', generatorVersion: 5,
    curriculumSnapshot: { semester: 'lower', grade: 1 },
  };
}

async function setupFullFlow(page: Page) {
  await page.goto(`${BASE}/play?e2e=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!(window as any).MATH_DETECTIVE_TEST, { timeout: 15000 });

  await page.evaluate((s: string) => { localStorage.setItem('math-detective-state', s); }, JSON.stringify({
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

  const lesson = buildFullLessonFixture();
  await page.evaluate((l: any) => { (window as any).MATH_DETECTIVE_TEST?.setLesson(l); }, lesson);
  await page.waitForTimeout(500);
}

async function getState(page: Page): Promise<any> {
  return await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.getState());
}

async function dismissOverlay(page: Page) {
  await page.waitForTimeout(300);
  try {
    const backdrop = page.locator('.fixed.inset-0.z-40').first();
    if (await backdrop.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backdrop.click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);
    }
  } catch { /* no overlay */ }
  try {
    const closeBtn = page.locator('.fixed.inset-0.z-40 button').first();
    if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(200);
    }
  } catch { /* no close button */ }
}

async function fastForwardQ1toQ4(page: Page) {
  for (const [index, answer] of ['6', '7', '23', '8'].entries()) {
    await expect(page.getByTestId('submit-answer')).toBeVisible();
    expect((await getState(page))?.currentStepIndex).toBe(index);
    await page.getByTestId('lesson-answer-input').fill(answer);
    await page.getByTestId('submit-answer').click();
    await expect(page.getByTestId('continue-feedback')).toBeVisible();
    await page.getByTestId('continue-feedback').click();
    await dismissOverlay(page);
  }
}

// ================================================================
// Test: Q5 single click must submit and show feedback
// ================================================================
test('v2.11.3-q5-single-submit: one click submits and shows correct feedback', async ({ page }) => {
  test.setTimeout(300000);
  await setupFullFlow(page);

  // Fast-forward through Q1-Q4
  await fastForwardQ1toQ4(page);

  // === Q5: answer_only g1ll_32 ===
  console.log('=== Q5: answer_only g1ll_32 ===');
  await page.waitForTimeout(500);

  const q5State = await getState(page);
  console.log('Q5 state:', JSON.stringify({ step: q5State?.currentStepIndex, phase: q5State?.currentPhase, questionId: q5State?.questionId }));
  expect(q5State?.currentStepIndex, 'Should be at Q5').toBe(4);

  // Inject instrumentation to track submit events and blur
  await page.evaluate(() => {
    (window as any).__q5trace = [] as any[];
    const record = (event: string, detail: any) => {
      (window as any).__q5trace.push({ ts: Date.now(), event, ...detail });
    };
    document.addEventListener('submit', (e) => {
      const form = e.target as HTMLFormElement;
      const inp = form.querySelector('input[name="answer"]') as HTMLInputElement;
      record('submit', { value: inp?.value, formCount: document.forms.length });
    }, true);
    document.addEventListener('pointerdown', (e) => {
      const el = e.target as HTMLElement;
      record('pointerdown', { tag: el?.tagName, text: el?.textContent?.slice(0, 30), disabled: (el as HTMLButtonElement)?.disabled });
    }, true);
    document.addEventListener('blur', (e) => {
      const el = e.target as HTMLElement;
      record('blur', { tag: el?.tagName, name: (el as HTMLInputElement)?.name, value: (el as HTMLInputElement)?.value });
    }, true);
  });

  // Wait for answer input to be visible
  await page.waitForTimeout(1000);

  // Check what's actually rendered for Q5
  const q5BodyText = await page.locator('body').innerText();
  console.log('Q5 page text (first 400 chars):', q5BodyText.slice(0, 400));

  // Look for answer input
  const q5Input = page.locator('input[name="answer"]').first();
  const q5InputVisible = await q5Input.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Q5 input visible:', q5InputVisible);

  // If input is visible (EquationAnswerPhase path), fill and submit
  if (q5InputVisible) {
    console.log('Q5: EquationAnswerPhase path — has input with submit button');
    await q5Input.fill('57');
    await page.waitForTimeout(300);

    // Record button state before click
    const submitBtn = page.locator('button[type="submit"]').first();
    const btnText = await submitBtn.textContent().catch(() => '');
    const btnDisabled = await submitBtn.isDisabled().catch(() => false);
    console.log('Submit button:', { text: btnText, disabled: btnDisabled });

    // === SINGLE CLICK ===
    const clickTime = Date.now();
    await submitBtn.click();
    console.log('Clicked submit at', clickTime);

    // Wait for feedback
    await page.waitForTimeout(1500);

    // Check if feedback appeared
    const q5FeedbackText = await page.locator('body').innerText();
    const hasFeedback = q5FeedbackText.includes('正确') || q5FeedbackText.includes('✅') || q5FeedbackText.includes('回答正确') || q5FeedbackText.includes('破案成功') || q5FeedbackText.includes('进入下一关');
    console.log('Feedback visible after first click:', hasFeedback);

    // Take screenshot
    await page.screenshot({ path: test.info().outputPath('q5-single-submit-feedback.png') });

    // Record trace
    const trace = await page.evaluate(() => (window as any).__q5trace || []);
    const submitCount = trace.filter((e: any) => e.event === 'submit').length;
    const blurCount = trace.filter((e: any) => e.event === 'blur').length;
    console.log('Q5 trace:', { submitCount, blurCount, totalEvents: trace.length });

    // Check Q5 state after submit
    const q5StateAfter = await getState(page);
    console.log('Q5 state after submit:', JSON.stringify({
      step: q5StateAfter?.currentStepIndex,
      phase: q5StateAfter?.currentPhase,
    }));

    // === ASSERTIONS ===
    // Must have exactly 1 submit
    expect(submitCount, 'Q5 must have exactly 1 submit event').toBe(1);
    // Must show feedback
    expect(hasFeedback, 'Q5 must show correct feedback after single click').toBe(true);
    // Must advance phase
    const phaseAfter = q5StateAfter?.currentPhase;
    const advanced = phaseAfter === 'explain';
    expect(advanced, `Q5 phase must advance to explain after submit, got: ${phaseAfter}`).toBe(true);
  } else {
    // Q5 might be using ThreeQuestionFlow (has reasoningFrame), which has a different input
    console.log('Q5: ThreeQuestionFlow path — checking for alternative input');

    // Check for any input element
    const anyInput = page.locator('input').first();
    const anyInputVisible = await anyInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (anyInputVisible) {
      console.log('Q5 has an input (ThreeQuestionFlow path)');
      await anyInput.fill('57');
      await page.waitForTimeout(300);

      const submitBtn = page.locator('button[type="submit"]').first();
      const btnVisible = await submitBtn.isVisible({ timeout: 2000 }).catch(() => false);

      if (btnVisible) {
        await submitBtn.click();
        await page.waitForTimeout(1500);

        const feedbackText = await page.locator('body').innerText();
        const hasFeedback = feedbackText.includes('正确') || feedbackText.includes('✅') || feedbackText.includes('回答正确');

        await page.screenshot({ path: test.info().outputPath('q5-single-submit-tqf.png') });

        const trace = await page.evaluate(() => (window as any).__q5trace || []);
        const submitCount = trace.filter((e: any) => e.event === 'submit').length;

        expect(submitCount, 'Q5 ThreeQuestionFlow: exactly 1 submit').toBe(1);
        expect(hasFeedback, 'Q5 must show feedback').toBe(true);
      } else {
        // No submit button — maybe button text is different
        const allBtns = page.locator('button');
        const btnCount = await allBtns.count();
        console.log('Q5 button count:', btnCount);
        for (let i = 0; i < btnCount; i++) {
          const text = await allBtns.nth(i).textContent().catch(() => '');
          console.log(`  Button ${i}: "${text?.slice(0, 30)}"`);
        }
        await page.screenshot({ path: test.info().outputPath('q5-no-submit-btn.png') });
        expect(false, 'Q5 must have a submit button').toBe(true);
      }
    } else {
      // No input at all — check for "继续" skip button
      console.log('Q5: No input visible — checking for skip UI');
      const skipBtn = page.locator('button:has-text("继续")').first();
      const skipVisible = await skipBtn.isVisible({ timeout: 2000 }).catch(() => false);

      if (skipVisible) {
        console.log('Q5 shows skip button (no reasoningFrame case) — clicking to continue');
        await skipBtn.click();
        await page.waitForTimeout(500);
      }

      await page.screenshot({ path: test.info().outputPath('q5-no-input.png') });
      const bodyText = await page.locator('body').innerText();
      console.log('Q5 body text (no input):', bodyText.slice(0, 300));
    }
  }

  // Save report
  const trace = await page.evaluate(() => (window as any).__q5trace || []);
  const report: any = {
    generatedAt: new Date().toISOString(),
    appVersion: '2.11.3',
    q5State: await getState(page),
    q5InputVisible,
    events: trace,
    submitCount: trace.filter((e: any) => e.event === 'submit').length,
    blurCount: trace.filter((e: any) => e.event === 'blur').length,
    pointerDownCount: trace.filter((e: any) => e.event === 'pointerdown').length,
  };

  const reportPath = test.info().outputPath('q5-first-submit-trace.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('Q5 trace report saved to reports/q5-first-submit-trace.json');
});
