import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { submitCurrentAnswerThroughUi } from './helpers/legacy-lesson';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/**
 * v2.11.2: Real Q2 answer page + Q6 finish button flow test.
 *
 * Full 6-question flow: Q1→Q2→Q3→Q4→Q5→Q6→completion
 *
 * Q1: g1ll_02 (find_numbers)      — 树上有13只小鸟，飞走了7只，树上还剩几只？ answer=6
 * Q2: g1ll_03 (find_action_words)  — 小红有15颗糖果，送给小明8颗，小红还剩几颗糖果？ answer=7
 * Q3: g1ll_29 (simulation)        — 公园里一共有多少朵花？ answer=23
 * Q4: g1ll_07 (remove_noise)      — 公园里还剩几只鸽子？ answer=8
 * Q5: g1ll_32 (answer_only)       — 爷爷比小明大多少岁？ answer=57
 * Q6: g1ll_68 (answer_only)       — 1 1 2 3 5 __ 横线上应该填几？ answer=8
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
      phases: ['read', 'find_numbers', 'answer', 'explain'] as string[],
      currentPhaseIndex: 0,
      status: 'active' as const,
    },
    {
      id: `${lessonDate}_find_action_words_1_g1ll_03`,
      type: 'find_action_words' as const,
      questionId: 'g1ll_03',
      title: '找动作词',
      description: '找到加减动作词',
      phases: ['read', 'find_keywords', 'choose_operation', 'answer', 'explain'] as string[],
      currentPhaseIndex: 0,
      status: 'locked' as const,
    },
    {
      id: `${lessonDate}_simulation_2_g1ll_29`,
      type: 'simulation' as const,
      questionId: 'g1ll_29',
      title: '模拟场景',
      description: '模拟题目场景',
      phases: ['read', 'choose_operation', 'answer', 'explain'] as string[],
      currentPhaseIndex: 0,
      status: 'locked' as const,
    },
    {
      id: `${lessonDate}_remove_noise_3_g1ll_07`,
      type: 'remove_noise' as const,
      questionId: 'g1ll_07',
      title: '擦掉没用的信息',
      description: '去掉多余信息',
      phases: ['read', 'remove_noise', 'answer', 'explain'] as string[],
      currentPhaseIndex: 0,
      status: 'locked' as const,
    },
    {
      id: `${lessonDate}_answer_only_4_g1ll_32`,
      type: 'answer_only' as const,
      questionId: 'g1ll_32',
      title: '今日挑战',
      description: '仔细读题，直接算出答案',
      phases: ['answer', 'explain'] as string[],
      currentPhaseIndex: 0,
      status: 'locked' as const,
    },
    {
      id: `${lessonDate}_answer_only_5_g1ll_68`,
      type: 'answer_only' as const,
      questionId: 'g1ll_68',
      title: '今日挑战',
      description: '仔细读题，直接算出答案',
      phases: ['answer', 'explain'] as string[],
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

async function dismissProgressToast(page: Page) {
  // Wait for overlay to appear first
  await page.waitForTimeout(500);
  try {
    // Try clicking backdrop (full-viewport overlay at z-40)
    const backdrop = page.locator('.fixed.inset-0.z-40').first();
    if (await backdrop.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click backdrop to dismiss
      await backdrop.click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(500);
    }
  } catch { /* no toast */ }
  // Also try clicking X button as fallback
  try {
    const closeBtn = page.locator('.fixed.inset-0.z-40 button').first();
    if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  } catch { /* no toast */ }
  await page.waitForTimeout(300);
}

// Generic helper: read phase → click "读完了" button
async function clickReadPhaseButton(page: Page) {
  const readBtn = page.locator('button:has-text("读完了"), button:has-text("读懂了")').first();
  if (await readBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await readBtn.click();
    await page.waitForTimeout(300);
  }
}

// Generic helper: find_numbers phase — click number buttons
async function clickFindNumbersPhase(page: Page, numbers: number[]) {
  for (const n of numbers) {
    const numBtn = page.locator(`button:has-text("${n}")`).first();
    if (await numBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await numBtn.click();
      await page.waitForTimeout(150);
    }
  }
  await page.waitForTimeout(200);
}

// Generic helper: click phase advance button
async function clickPhaseAdvance(page: Page) {
  const btn = page.locator('button:has-text("下一步"), button:has-text("去算答案"), button:has-text("去列算式"), button:has-text("开始找规律"), button:has-text("规律找到了"), button:has-text("推理完成"), button:has-text("判断完毕"), button:has-text("开始破案"), button:has-text("算式确认")').first();
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

// Submit answer helper
async function submitAnswer(page: Page, expectedAnswer: string) {
  const input = page.locator('input[name="answer"]').first();
  const inputVisible = await input.isVisible({ timeout: 3000 }).catch(() => false);

  if (inputVisible) {
    await submitCurrentAnswerThroughUi(page, 'click', expectedAnswer);
    return true;
  }
  return false;
}

// Click continue/finish button after correct answer
async function clickContinueButton(page: Page) {
  const btn = page.locator('button:has-text("完成"), button:has-text("继续破案"), button:has-text("学会了")').first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

// Record hit-test for a button
async function recordHitTest(page: Page, buttonSelector: string): Promise<any> {
  return await page.evaluate((sel: string) => {
    const btn = sel === 'finishButton'
      ? Array.from(document.querySelectorAll('button')).find((candidate) => /学会|继续破案|完成/.test(candidate.textContent || ''))
      : document.querySelector(sel);
    if (!btn) return { error: 'button not found', selector: sel };

    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(x, y);

    // Get parent chain
    const parentChain: string[] = [];
    let el: Element | null = topElement;
    while (el && parentChain.length < 10) {
      const tag = el.tagName?.toLowerCase() || 'unknown';
      const cls = (el as HTMLElement).className?.toString?.()?.slice(0, 80) || '';
      const zIdx = el instanceof HTMLElement ? getComputedStyle(el).zIndex : '';
      const ptrEvents = el instanceof HTMLElement ? getComputedStyle(el).pointerEvents : '';
      parentChain.push(`${tag}${cls ? '.' + cls.split(' ')[0] : ''} z:${zIdx} ptr:${ptrEvents}`);
      el = el.parentElement;
    }

    const btnStyle = btn instanceof HTMLElement ? {
      disabled: (btn as HTMLButtonElement).disabled,
      ariaDisabled: btn.getAttribute('aria-disabled'),
      pointerEvents: getComputedStyle(btn).pointerEvents,
      visibility: getComputedStyle(btn).visibility,
      opacity: getComputedStyle(btn).opacity,
      zIndex: getComputedStyle(btn).zIndex,
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
    } : null;

    const topElStyle = topElement instanceof HTMLElement ? {
      tag: topElement.tagName,
      class: topElement.className?.toString?.()?.slice(0, 100),
      zIndex: getComputedStyle(topElement).zIndex,
      pointerEvents: getComputedStyle(topElement).pointerEvents,
    } : null;

    return {
      buttonCenter: { x, y },
      buttonStyle: btnStyle,
      topElement: topElStyle,
      topElementParentChain: parentChain,
      hitTarget: topElement === btn || btn.contains(topElement) || topElement?.contains(btn),
      hitTargetTag: topElement?.tagName?.toLowerCase() || 'unknown',
    };
  }, buttonSelector);
}

// ========== Test 1: Full Q1→Q6 flow with Q2 answer page diagnostics ==========

test('v2.11.2-full-flow-q2-answer-page: Q2 has visible answer input and submit button', async ({ page }) => {
  test.setTimeout(300000); // 5 min for full Q1→Q6 flow
  await setupFullFlow(page);

  // Inject event trackers
  await page.evaluate(() => {
    (window as any).__trace = [] as any[];
    const record = (event: string, detail: any) => {
      (window as any).__trace.push({ ts: Date.now(), event, ...detail });
    };
    document.addEventListener('pointerdown', (e) => {
      record('pointerdown', { tag: (e.target as any)?.tagName, text: (e.target as any)?.textContent?.slice(0, 30) });
    }, true);
    document.addEventListener('click', (e) => {
      record('click', { tag: (e.target as any)?.tagName, text: (e.target as any)?.textContent?.slice(0, 30), x: e.clientX, y: e.clientY });
    }, true);
    document.addEventListener('submit', (e) => {
      record('submit', { tag: (e.target as any)?.tagName });
    }, true);
  });

  // ==== Q1: find_numbers, g1ll_02, answer=6 ====
  console.log('=== Q1: find_numbers ===');
  await clickReadPhaseButton(page); // read → find_numbers
  const q1Numbers = [13, 7];
  await clickFindNumbersPhase(page, q1Numbers);
  await clickPhaseAdvance(page); // → answer
  const q1Submitted = await submitAnswer(page, '6');
  console.log('Q1 submit result:', q1Submitted);

  // Click continue to Q2
  await clickContinueButton(page);
  await dismissProgressToast(page);

  // ==== Q2: find_action_words, g1ll_03, answer=7 ====
  console.log('=== Q2: find_action_words ===');

  // Read phase first
  await clickReadPhaseButton(page);

  // Record Q2 state after read phase
  let q2State = await getState(page);
  console.log('Q2 state after read:', JSON.stringify({
    step: q2State?.currentStepIndex,
    phase: q2State?.currentPhase,
    questionId: q2State?.questionId,
    stepType: q2State?.stepType,
  }));

  // Advance through find_keywords phase
  // g1ll_03 has keywords ['送给','还剩'] — they are clickable buttons in FindActionWordsPhased
  // Click each keyword to mark it as found, then click "关键词找到了，判断运算 →"
  const q2Keywords = ['送给', '还剩'];
  for (const kw of q2Keywords) {
    const kwBtn = page.locator(`button:has-text("${kw}")`).first();
    if (await kwBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await kwBtn.click();
      await page.waitForTimeout(200);
    }
  }
  // Now click the "关键词找到了，判断运算 →" button
  const q2KeywordAdvanceBtn = page.locator('button:has-text("关键词找到了")').first();
  if (await q2KeywordAdvanceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await q2KeywordAdvanceBtn.click();
    await page.waitForTimeout(300);
  } else {
    await clickPhaseAdvance(page);
  }

  // Choose operation phase — click correct operation for g1ll_03 (subtraction)
  await page.waitForTimeout(500);
  q2State = await getState(page);
  console.log('Q2 state at choose_operation:', q2State?.currentPhase);

  if (q2State?.currentPhase === 'choose_operation') {
    // g1ll_03 is subtraction: click "变少了，用减法"
    const subtractBtn = page.locator('button:has-text("变少了"), button:has-text("用减法")').first();
    if (await subtractBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subtractBtn.click();
      await page.waitForTimeout(200);
    }
    // Now click "判断完毕，去算答案 →" to advance to answer
    await clickPhaseAdvance(page);
    await page.waitForTimeout(500);
  }

  // === DIAGNOSTIC: Record Q2 answer page state ===
  q2State = await getState(page);
  console.log('Q2 state at answer:', JSON.stringify({
    step: q2State?.currentStepIndex,
    phase: q2State?.currentPhase,
    questionId: q2State?.questionId,
    stepType: q2State?.stepType,
    answerType: q2State?.answerType,
  }));

  // Check answer input visibility
  const q2Input = page.locator('input[name="answer"]').first();
  const q2InputVisible = await q2Input.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Q2 input visible:', q2InputVisible);

  // Check submit button visibility
  const q2SubmitBtn = page.locator('button[type="submit"]').first();
  const q2SubmitVisible = await q2SubmitBtn.isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Q2 submit button visible:', q2SubmitVisible);

  // Check page body text for clues about what's rendered
  const q2BodyText = await page.locator('body').innerText();
  console.log('Q2 body text (first 300 chars):', q2BodyText.slice(0, 300));

  // Take screenshot
  await page.screenshot({ path: test.info().outputPath('q2-answer-page.png') });

  // === Q2 DIAGNOSTIC REPORT ===
  const q2Diagnostic: any = {
    questionId: q2State?.questionId,
    stepType: q2State?.stepType,
    phase: q2State?.currentPhase,
    answerType: q2State?.answerType,
    inputVisible: q2InputVisible,
    submitButtonVisible: q2SubmitVisible,
    bodyTextSnippet: q2BodyText.slice(0, 200),
    answerPageVisible: q2InputVisible && q2SubmitVisible,
  };

  // If answer input exists, submit it
  if (q2InputVisible) {
    const q2Result = await submitCurrentAnswerThroughUi(page, 'click', '7');
    q2Diagnostic.submitted = true;

    const q2FeedbackText = await page.locator('body').innerText();
    q2Diagnostic.feedbackText = q2FeedbackText.slice(0, 200);
    q2Diagnostic.correctFeedbackVisible = q2Result.afterState.currentPhase === 'explain';
  } else {
    q2Diagnostic.submitted = false;
    q2Diagnostic.missingAnswerPage = true;
    console.error('[P0] Q2 missing answer page!');
  }

  // Save Q2 diagnostic
  const q2ReportPath = test.info().outputPath('q2-missing-answer-page-trace.json');
  fs.mkdirSync(path.dirname(q2ReportPath), { recursive: true });
  fs.writeFileSync(q2ReportPath, JSON.stringify(q2Diagnostic, null, 2));
  console.log('Q2 diagnostic saved to reports/q2-missing-answer-page-trace.json');

  // Fail if Q2 has no answer page
  expect(q2Diagnostic.answerPageVisible).toBe(true);

  // Click continue to Q3
  await clickContinueButton(page);
  await dismissProgressToast(page);

  // ==== Q3: simulation, g1ll_29, answer=23 ====
  console.log('=== Q3: simulation ===');
  await clickReadPhaseButton(page); // read → choose_operation
  // In choose_operation phase: select "变多了（➕）" (g1ll_29 is addition)
  await page.waitForTimeout(300);
  const q3AddBtn = page.locator('button:has-text("变多了")').first();
  if (await q3AddBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await q3AddBtn.click();
    await page.waitForTimeout(200);
  }
  // Now click "判断完毕，去算答案 →"
  await clickPhaseAdvance(page); // → answer
  await page.waitForTimeout(300);
  await submitAnswer(page, '23');
  await clickContinueButton(page);
  await dismissProgressToast(page);

  // ==== Q4: remove_noise, g1ll_07, answer=8 ====
  console.log('=== Q4: remove_noise ===');
  await clickReadPhaseButton(page); // read → remove_noise
  await page.waitForTimeout(300);
  // Click noise phrases to remove them (they are clickable spans in RemoveNoisePhased)
  const noiseSegments = page.locator('span:has-text("星期天"), span:has-text("妈妈带小明去公园玩")');
  const noiseCount = await noiseSegments.count();
  for (let i = 0; i < noiseCount; i++) {
    const seg = noiseSegments.nth(i);
    if (await seg.isVisible({ timeout: 1000 }).catch(() => false)) {
      await seg.click();
      await page.waitForTimeout(200);
    }
  }
  await clickPhaseAdvance(page); // → answer
  await page.waitForTimeout(300);
  await submitAnswer(page, '8');
  await clickContinueButton(page);
  await dismissProgressToast(page);

  // ==== Q5: answer_only, g1ll_32, answer=57 ====
  console.log('=== Q5: answer_only ===');
  await page.waitForTimeout(500);
  const q5State = await getState(page);
  console.log('Q5 state:', JSON.stringify({
    step: q5State?.currentStepIndex,
    phase: q5State?.currentPhase,
    questionId: q5State?.questionId,
  }));
  // For answer_only with FullSolvePhased, the answer phase may show "继续 →"
  // if there's no reasoningFrame. Use test API to submit answer programmatically.
  const q5Submitted = await submitAnswer(page, '57');
  expect(q5Submitted, 'Q5 must submit through the visible answer form').toBe(true);
  // Now dismiss any overlay and click continue
  await dismissProgressToast(page);
  await clickContinueButton(page);
  await dismissProgressToast(page);

  // ==== Q6: answer_only, g1ll_68, answer=8 ====
  console.log('=== Q6: answer_only ===');
  await page.waitForTimeout(500);
  const q6State = await getState(page);
  console.log('Q6 state:', JSON.stringify({
    step: q6State?.currentStepIndex,
    phase: q6State?.currentPhase,
    questionId: q6State?.questionId,
  }));
  // Use test API to submit answer (handles both UI and non-UI answer flows)
  const q6Submitted = await submitAnswer(page, '8');
  expect(q6Submitted, 'Q6 must submit through the visible answer form').toBe(true);
  await page.waitForTimeout(1000);

  // Wait for feedback
  await page.waitForTimeout(1000);

  // === Q6 DIAGNOSTIC: Hit-test the finish button ===
  const q6BodyText = await page.locator('body').innerText();
  console.log('Q6 after submit body text:', q6BodyText.slice(0, 400));

  // Find the finish button
  const finishBtnSelector = 'button:has-text("学会"), button:has-text("继续破案"), button:has-text("完成")';
  const finishBtn = page.locator(finishBtnSelector).first();
  const finishBtnVisible = await finishBtn.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Q6 finish button visible:', finishBtnVisible);

  let q6HitTest: any = { error: 'no button found' };
  if (finishBtnVisible) {
    // Record button properties before clicking
    const btnProps = await finishBtn.evaluate((el) => {
      const btn = el as HTMLButtonElement;
      const rect = btn.getBoundingClientRect();
      const style = getComputedStyle(btn);
      return {
        tag: btn.tagName,
        text: btn.textContent?.slice(0, 30),
        disabled: btn.disabled,
        ariaDisabled: btn.getAttribute('aria-disabled'),
        pointerEvents: style.pointerEvents,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        boundingClientRect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      };
    });
    // Use page.evaluate with a specific selector that works in browser context
    const hitTestSelector = 'finishButton';
    q6HitTest = await recordHitTest(page, hitTestSelector);
    // If the above didn't find the right button, try getting element from Playwright locator
    if (q6HitTest.error) {
      // Fallback: get button info via Playwright locator evaluation
      const btnHandle = await finishBtn.elementHandle();
      if (btnHandle) {
        const box = await btnHandle.boundingBox();
        q6HitTest = {
          buttonCenter: box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null,
          buttonStyle: btnProps,
          buttonBox: box,
          finishButtonVisible: finishBtnVisible,
          finishButtonDisabled: btnProps.disabled || btnProps.ariaDisabled === 'true',
        };
      }
    }
    q6HitTest.buttonProps = btnProps;
    q6HitTest.finishButtonVisible = finishBtnVisible;
    q6HitTest.finishButtonDisabled = btnProps.disabled || btnProps.ariaDisabled === 'true';
    q6HitTest.feedbackVisible = (await getState(page))?.currentPhase === 'explain';

    console.log('Q6 hit test result:', JSON.stringify({
      hitTargetTag: q6HitTest.hitTargetTag,
      hitTarget: q6HitTest.hitTarget,
      buttonDisabled: q6HitTest.finishButtonDisabled,
      topElement: q6HitTest.topElement,
    }));

    // Take screenshot of Q6 feedback page
    await page.screenshot({ path: test.info().outputPath('q6-feedback-page.png') });

    // Count overlays that actually overlap the button position
    const btnBoundingBox = await finishBtn.boundingBox();
    const overlays = await page.evaluate((btnBox) => {
      const fixed = document.querySelectorAll('[style*="position: fixed"], .fixed');
      const overlays: any[] = [];
      fixed.forEach(el => {
        // Skip nav elements (BottomNav) and elements that are the button itself or its parents
        if (el.tagName === 'NAV') return;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) <= 0) return;
        if (style.pointerEvents === 'none') return;
        const rect = el.getBoundingClientRect();
        // Only count if overlay actually overlaps with the button
        if (!btnBox || rect.right < btnBox.x || rect.left > btnBox.x + btnBox.width ||
            rect.bottom < btnBox.y || rect.top > btnBox.y + btnBox.height) return;
        // Only count significant overlays (not tiny decorative elements)
        if (rect.width < 100 && rect.height < 100) return;
        overlays.push({
          tag: el.tagName,
          class: (el as HTMLElement).className?.toString?.()?.slice(0, 100),
          zIndex: style.zIndex,
          pointerEvents: style.pointerEvents,
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        });
      });
      return overlays;
    }, btnBoundingBox);
    q6HitTest.activeOverlays = overlays;
    q6HitTest.overlayBlockingCount = overlays.length;

    // Now click the finish button (ONCE)
    await finishBtn.click();
    await page.waitForTimeout(2000);
  }

  // Save Q6 diagnostic
  const q6ReportPath = test.info().outputPath('q6-feedback-button-hit-test.json');
  fs.writeFileSync(q6ReportPath, JSON.stringify(q6HitTest, null, 2));
  console.log('Q6 hit-test saved to reports/q6-feedback-button-hit-test.json');

  // Check completion
  const finalState = await getState(page);
  console.log('Final state:', JSON.stringify({
    completed: finalState?.completed,
    step: finalState?.currentStepIndex,
  }));

  const finalBodyText = await page.locator('body').innerText();
  const isComplete = finalState?.completed || finalBodyText.includes('侦破') || finalBodyText.includes('完成') || finalBodyText.includes('今日任务');

  // Save full diagnostic report
  const fullReport: any = {
    generatedAt: new Date().toISOString(),
    appVersion: '2.11.2',
    questions: {
      q2: q2Diagnostic,
      q6: q6HitTest,
    },
    finalState: {
      completed: finalState?.completed,
      currentStepIndex: finalState?.currentStepIndex,
    },
    summary: {
      question2_answerPageVisible: q2Diagnostic.answerPageVisible || false,
      question2_submitButtonVisible: q2Diagnostic.submitButtonVisible || false,
      question2_correctFeedbackVisible: q2Diagnostic.correctFeedbackVisible || false,
      question6_feedbackVisible: q6HitTest.feedbackVisible || false,
      question6_finishButtonVisible: q6HitTest.finishButtonVisible || false,
      question6_finishButtonDisabled: q6HitTest.finishButtonDisabled || false,
      question6_hitTestTarget: q6HitTest.hitTargetTag || 'unknown',
      question6_lessonCompleteVisible: isComplete,
      overlayBlockingCount: q6HitTest.overlayBlockingCount || 0,
    },
  };

  const fullReportPath = test.info().outputPath('q2-q6-runtime-trace.json');
  fs.writeFileSync(fullReportPath, JSON.stringify(fullReport, null, 2));
  console.log('Full diagnostic saved to reports/q2-q6-runtime-trace.json');

  // Collect event trace
  const trace = await page.evaluate(() => (window as any).__trace || []);
  fullReport.eventCount = trace.length;
  fullReport.events = trace;

  // Update the full report with trace
  fs.writeFileSync(fullReportPath, JSON.stringify(fullReport, null, 2));

  // === FINAL ASSERTIONS ===
  // Q2 assertions
  expect(q2Diagnostic.answerPageVisible, 'Q2 must have answer page').toBe(true);

  // Q6 assertions
  expect(q6HitTest.finishButtonVisible, 'Q6 finish button must be visible').toBe(true);
  expect(q6HitTest.finishButtonDisabled, 'Q6 finish button must not be disabled').toBe(false);
  expect(isComplete, 'Must reach completion page after Q6 finish').toBe(true);
  expect(q6HitTest.overlayBlockingCount || 0, 'No blocking overlays').toBe(0);
});

// ========== Test 2: Q6 finish button hit-test only ==========

test('v2.11.2-q6-finish-button-hit-test: Button receives pointer/click events', async ({ page }) => {
  test.setTimeout(300000); // 5 min for full flow
  await setupFullFlow(page);

  // Inject event trackers
  await page.evaluate(() => {
    (window as any).__trace = [] as any[];
    const record = (event: string, detail: any) => {
      (window as any).__trace.push({ ts: Date.now(), event, ...detail });
    };
    document.addEventListener('pointerdown', (e) => {
      record('pointerdown', { tag: (e.target as any)?.tagName, text: (e.target as any)?.textContent?.slice(0, 30) });
    }, true);
    document.addEventListener('click', (e) => {
      record('click', { tag: (e.target as any)?.tagName, text: (e.target as any)?.textContent?.slice(0, 30), x: e.clientX, y: e.clientY });
    }, true);
    document.addEventListener('submit', (e) => {
      record('submit', { tag: (e.target as any)?.tagName });
    }, true);
  });

  // ==== Q1: find_numbers, g1ll_02, answer=6 ====
  console.log('=== Q1: find_numbers ===');
  await clickReadPhaseButton(page);
  await clickFindNumbersPhase(page, [13, 7]);
  await clickPhaseAdvance(page);
  await submitAnswer(page, '6');
  await clickContinueButton(page);
  await dismissProgressToast(page);

  // ==== Q2: find_action_words, g1ll_03, answer=7 ====
  console.log('=== Q2: find_action_words ===');
  await clickReadPhaseButton(page);

  // Click each keyword to mark it as found
  const q2Keywords = ['送给', '还剩'];
  for (const kw of q2Keywords) {
    const kwBtn = page.locator(`button:has-text("${kw}")`).first();
    if (await kwBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await kwBtn.click();
      await page.waitForTimeout(200);
    }
  }
  // Click "关键词找到了，判断运算 →"
  const q2KeywordAdvanceBtn = page.locator('button:has-text("关键词找到了")').first();
  if (await q2KeywordAdvanceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await q2KeywordAdvanceBtn.click();
    await page.waitForTimeout(300);
  } else {
    await clickPhaseAdvance(page);
  }

  // Choose operation: subtraction for g1ll_03
  await page.waitForTimeout(300);
  const q2State = await getState(page);
  if (q2State?.currentPhase === 'choose_operation') {
    const subtractBtn = page.locator('button:has-text("变少了"), button:has-text("用减法")').first();
    if (await subtractBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subtractBtn.click();
      await page.waitForTimeout(200);
    }
    await clickPhaseAdvance(page);
    await page.waitForTimeout(500);
  }

  // Submit Q2 answer
  const q2Input = page.locator('input[name="answer"]').first();
  if (await q2Input.isVisible({ timeout: 3000 }).catch(() => false)) {
    await q2Input.fill('7');
    await page.waitForTimeout(200);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1500);
  }
  await clickContinueButton(page);
  await dismissProgressToast(page);

  // ==== Q3: simulation, g1ll_29, answer=23 ====
  console.log('=== Q3: simulation ===');
  await clickReadPhaseButton(page);
  await page.waitForTimeout(300);
  const q3AddBtn = page.locator('button:has-text("变多了")').first();
  if (await q3AddBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await q3AddBtn.click();
    await page.waitForTimeout(200);
  }
  await clickPhaseAdvance(page);
  await page.waitForTimeout(300);
  await submitAnswer(page, '23');
  await clickContinueButton(page);
  await dismissProgressToast(page);

  // ==== Q4: remove_noise, g1ll_07, answer=8 ====
  console.log('=== Q4: remove_noise ===');
  await clickReadPhaseButton(page);
  await page.waitForTimeout(300);
  // Noise phrases are <motion.span> elements, NOT buttons
  const noiseSegments = page.locator('span:has-text("星期天"), span:has-text("妈妈带小明去公园玩")');
  const noiseCount = await noiseSegments.count();
  for (let i = 0; i < noiseCount; i++) {
    const seg = noiseSegments.nth(i);
    if (await seg.isVisible({ timeout: 1000 }).catch(() => false)) {
      await seg.click();
      await page.waitForTimeout(200);
    }
  }
  await clickPhaseAdvance(page);
  await page.waitForTimeout(300);
  await submitAnswer(page, '8');
  await clickContinueButton(page);
  await dismissProgressToast(page);

  // ==== Q5: answer_only, g1ll_32, answer=57 ====
  console.log('=== Q5: answer_only ===');
  await page.waitForTimeout(500);
  const q5Submitted = await submitAnswer(page, '57');
  expect(q5Submitted, 'Q5 must submit through the visible answer form').toBe(true);
  await dismissProgressToast(page);
  await clickContinueButton(page);
  await dismissProgressToast(page);

  // ==== Q6: answer_only, g1ll_68, answer=8 ====
  console.log('=== Q6: answer_only ===');
  await page.waitForTimeout(500);
  const q6Submitted = await submitAnswer(page, '8');
  expect(q6Submitted, 'Q6 must submit through the visible answer form').toBe(true);
  await page.waitForTimeout(1000);

  // === Q6 HIT-TEST: Verify button receives pointer/click events ===
  const q6BodyText = await page.locator('body').innerText();
  console.log('Q6 after submit body text:', q6BodyText.slice(0, 400));

  // Find the finish button via Playwright locator
  const finishBtnSelector = 'button:has-text("学会"), button:has-text("继续破案"), button:has-text("完成")';
  const finishBtn = page.locator(finishBtnSelector).first();
  const finishBtnVisible = await finishBtn.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Q6 finish button visible:', finishBtnVisible);

  let q6HitTest: any = { error: 'no button found' };
  if (finishBtnVisible) {
    // Get button properties via Playwright
    const btnProps = await finishBtn.evaluate((el) => {
      const btn = el as HTMLButtonElement;
      const rect = btn.getBoundingClientRect();
      const style = getComputedStyle(btn);
      return {
        tag: btn.tagName,
        text: btn.textContent?.slice(0, 30),
        disabled: btn.disabled,
        ariaDisabled: btn.getAttribute('aria-disabled'),
        pointerEvents: style.pointerEvents,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        boundingClientRect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      };
    });

    // Use CSS selector (not Playwright :has-text) for page.evaluate
    const hitTestSelector = 'finishButton';
    q6HitTest = await recordHitTest(page, hitTestSelector);
    // If CSS-only selector didn't find the right button, get element info from Playwright handle
    if (q6HitTest.error) {
      const btnHandle = await finishBtn.elementHandle();
      if (btnHandle) {
        const box = await btnHandle.boundingBox();
        q6HitTest = {
          buttonCenter: box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null,
          buttonStyle: btnProps,
          buttonBox: box,
          finishButtonVisible: finishBtnVisible,
          finishButtonDisabled: btnProps.disabled || btnProps.ariaDisabled === 'true',
        };
      }
    }
    q6HitTest.buttonProps = btnProps;
    q6HitTest.finishButtonVisible = finishBtnVisible;
    q6HitTest.finishButtonDisabled = btnProps.disabled || btnProps.ariaDisabled === 'true';
    q6HitTest.feedbackVisible = (await getState(page))?.currentPhase === 'explain';

    console.log('Q6 hit test result:', JSON.stringify({
      hitTargetTag: q6HitTest.hitTargetTag,
      hitTarget: q6HitTest.hitTarget,
      buttonDisabled: q6HitTest.finishButtonDisabled,
      topElement: q6HitTest.topElement,
    }));

    await page.screenshot({ path: test.info().outputPath('q6-hit-test.png') });

    // Count overlays that actually overlap the button position
    const btnBoundingBox2 = await finishBtn.boundingBox();
    const overlays2 = await page.evaluate((btnBox) => {
      const fixed = document.querySelectorAll('[style*="position: fixed"], .fixed');
      const overlays: any[] = [];
      fixed.forEach(el => {
        if (el.tagName === 'NAV') return;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) <= 0) return;
        if (style.pointerEvents === 'none') return;
        const rect = el.getBoundingClientRect();
        if (!btnBox || rect.right < btnBox.x || rect.left > btnBox.x + btnBox.width ||
            rect.bottom < btnBox.y || rect.top > btnBox.y + btnBox.height) return;
        if (rect.width < 100 && rect.height < 100) return;
        overlays.push({
          tag: el.tagName,
          class: (el as HTMLElement).className?.toString?.()?.slice(0, 100),
          zIndex: style.zIndex,
          pointerEvents: style.pointerEvents,
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        });
      });
      return overlays;
    }, btnBoundingBox2);
    q6HitTest.activeOverlays = overlays2;
    q6HitTest.overlayBlockingCount = overlays2.length;

    // Click the finish button ONCE and verify it responds
    await finishBtn.click();
    await page.waitForTimeout(2000);
  }

  // Save Q6 diagnostic
  const q6ReportPath = test.info().outputPath('q6-feedback-button-hit-test.json');
  fs.mkdirSync(path.dirname(q6ReportPath), { recursive: true });
  q6HitTest.q6BodyText = q6BodyText.slice(0, 500);
  fs.writeFileSync(q6ReportPath, JSON.stringify(q6HitTest, null, 2));
  console.log('Q6 hit-test report saved');

  // Check completion
  const finalState = await getState(page);
  const finalBodyText = await page.locator('body').innerText();
  const isComplete = finalState?.completed || finalBodyText.includes('侦破') || finalBodyText.includes('完成') || finalBodyText.includes('今日任务');

  // Collect event trace
  const trace = await page.evaluate(() => (window as any).__trace || []);
  const q6ClickEvents = trace.filter((e: any) =>
    e.event === 'click' || e.event === 'pointerdown'
  );
  const finishBtnClick = q6ClickEvents.filter((e: any) =>
    e.text?.includes('学会') || e.text?.includes('继续破案') || e.text?.includes('完成')
  );

  console.log('Q6 finish button click events found:', finishBtnClick.length);

  // === ASSERTIONS ===
  // Button must be visible
  expect(q6HitTest.finishButtonVisible, 'Q6 finish button must be visible').toBe(true);
  // Button must not be disabled
  expect(q6HitTest.finishButtonDisabled, 'Q6 finish button must not be disabled').toBe(false);
  // Button must be the hit target (or a descendant)
  expect(q6HitTest.hitTarget, 'Q6 finish button must be the click hit target (no overlay blocking)').toBe(true);
  // Lesson must complete
  expect(isComplete, 'Must reach completion page after Q6 finish').toBe(true);
  // No blocking overlays
  expect(q6HitTest.overlayBlockingCount || 0, 'No blocking overlays over Q6 finish button').toBe(0);
});
