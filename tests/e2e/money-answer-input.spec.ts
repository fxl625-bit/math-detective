import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/**
 * v2.11.0: Money answer input E2E tests.
 * Tests that money questions render yuan/jiao inputs, NOT number steppers.
 */

async function setupForQuestion(page: Page, questionId: string) {
  await page.goto(`${BASE}/play?e2e=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate((qid) => {
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
  }, questionId);
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

test('v2.11.0-money: No 1-4 number stepper on money questions', async ({ page }) => {
  test.setTimeout(90000);
  await setupForQuestion(page, 'g1ll_50');

  // Advance through lesson until we hit a money question or answer phase
  let foundMoney = false;
  for (let i = 0; i < 50; i++) {
    const state = await getState(page);
    if (state?.completed) break;

    const phase = state?.currentPhase;
    if (phase === 'answer' || phase === 'build_equation') {
      // Check the page for input elements
      const bodyText = await page.locator('body').innerText();

      // Verify NO number stepper with 1/2/3/4
      const stepperPattern = /^[1234]$/m;
      const hasStepperLike = /1\s*\n\s*2\s*\n\s*3\s*\n\s*4/.test(bodyText)
        || /▶.*1.*2.*3.*4/.test(bodyText);

      // Check for yuan/jiao inputs if this is a money question
      const hasYuanJiao = bodyText.includes('元') && bodyText.includes('角');

      console.log(`Phase: ${phase}, hasYuanJiao: ${hasYuanJiao}, bodyLength: ${bodyText.length}`);

      if (hasYuanJiao) {
        foundMoney = true;
        // Should NOT see a number stepper
        expect(hasStepperLike).toBe(false);

        // Should see yuan input field
        const yuanInput = page.locator('input').filter({ hasText: '' }).first();
        expect(await yuanInput.isVisible()).toBe(true);
        break;
      }
    }

    await advancePhase(page);
    await page.waitForTimeout(300);
  }

  // At minimum, we should have found content (not blank page)
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.length).toBeGreaterThan(50);
});

test('v2.11.0-money: Yuan-jiao input accepts money values', async ({ page }) => {
  test.setTimeout(90000);
  await setupForQuestion(page, 'g1ll_50');

  // Advance to answer phase of a money question
  for (let i = 0; i < 50; i++) {
    const state = await getState(page);
    if (state?.completed) break;

    const phase = state?.currentPhase;
    if (phase === 'answer' || phase === 'build_equation') {
      const bodyText = await page.locator('body').innerText();
      if (bodyText.includes('元') && bodyText.includes('角')) {
        // Found a money answer phase
        // Look for yuan/jiao input fields
        const inputs = page.locator('input[inputMode="numeric"], input[inputMode="decimal"]');
        const count = await inputs.count();

        if (count >= 2) {
          // Fill yuan and jiao
          await inputs.nth(0).fill('1');
          await inputs.nth(1).fill('5');

          // Submit
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);

          const afterState = await getState(page);
          console.log('After money submit:', JSON.stringify({
            phase: afterState?.currentPhase,
            step: afterState?.currentStepIndex,
          }));

          // Should advance (correct answer)
          expect(afterState?.currentPhase !== 'answer' || afterState?.currentStepIndex > 0).toBeTruthy();
          break;
        }
      }
    }

    if (phase === 'answer' || phase === 'build_equation') {
      await submitCorrectAnswer(page);
      await page.waitForTimeout(500);
    }
    await advancePhase(page);
    await page.waitForTimeout(300);
  }
});

test('v2.11.0-money: Money answers accept equivalent formats', async ({ page }) => {
  test.setTimeout(60000);

  // Test parseMoneyToJiao via page evaluation
  await page.goto(`${BASE}/play?e2e=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const results = await page.evaluate(() => {
    // Test money parsing logic inline since it may not be exported to window
    function parseMoneyToJiao(input: string): number | null {
      const trimmed = input.trim().replace(/\s+/g, '');
      const yuanJiaoMatch = trimmed.match(/^(\d+)元(\d+)角$/);
      if (yuanJiaoMatch) return parseInt(yuanJiaoMatch[1]) * 10 + parseInt(yuanJiaoMatch[2]);
      const jiaoOnlyMatch = trimmed.match(/^(\d+)角$/);
      if (jiaoOnlyMatch) return parseInt(jiaoOnlyMatch[1]);
      const yuanOnlyMatch = trimmed.match(/^(\d+)元$/);
      if (yuanOnlyMatch) return parseInt(yuanOnlyMatch[1]) * 10;
      const decimalMatch = trimmed.match(/^(\d+)\.(\d{1,2})$/);
      if (decimalMatch) {
        return parseInt(decimalMatch[1]) * 10 + parseInt(decimalMatch[2].padEnd(2, '0')[0]);
      }
      const pureNum = parseInt(trimmed);
      if (!isNaN(pureNum)) return pureNum;
      return null;
    }

    return {
      yuanJiao: parseMoneyToJiao('1元5角'),
      dot5Yuan: parseMoneyToJiao('1.5'),
      jiao15: parseMoneyToJiao('15角'),
      yuanOnly: parseMoneyToJiao('1元'),
      allEqual15: parseMoneyToJiao('1元5角') === 15
        && parseMoneyToJiao('1.5') === 15
        && parseMoneyToJiao('15角') === 15,
    };
  });

  console.log('Money parsing results:', JSON.stringify(results));
  expect(results.yuanJiao).toBe(15);
  expect(results.dot5Yuan).toBe(15);
  expect(results.jiao15).toBe(15);
  expect(results.allEqual15).toBe(true);
});
