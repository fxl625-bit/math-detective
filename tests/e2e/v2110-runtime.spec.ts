import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';

async function setupFreshUser(page: Page) {
  await page.goto(`${BASE}/play`);
  await page.evaluate(() => {
    localStorage.clear();
    const state = {
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
  await page.reload();
  await page.waitForSelector('text=/侦探|任务|破案|读完|找到|开始/', { timeout: 15000 });
}

test('v2.11.0: Complete full lesson - 6 questions', async ({ page }) => {
  await setupFreshUser(page);

  for (let step = 0; step < 6; step++) {
    console.log(`--- Step ${step + 1}/6 ---`);
    for (let i = 0; i < 8; i++) {
      const btn = page.locator('button:has-text(/读完|找到|判断|理解|数字找|关键词|算式|擦掉|观察|确认|开始/)').first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(600);
        continue;
      }
      break;
    }
    const answerInput = page.locator('input[inputMode="decimal"], input[type="text"]');
    const submitBtn = page.locator('button[type="submit"]');
    const isAnswer = await answerInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (isAnswer) {
      const ans = await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.getCorrectAnswer?.());
      if (ans != null) {
        console.log(`  Answering: ${ans}`);
        await answerInput.fill(String(ans));
        await submitBtn.click();
        await page.waitForTimeout(800);
        const cont = page.locator('button:has-text("完成，进入下一关")');
        if (await cont.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log('  Continue -> next');
          await cont.click();
          await page.waitForTimeout(600);
        }
      }
    } else {
      const cont = page.locator('button:has-text(/完成|继续|下一/)').first();
      if (await cont.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cont.click();
        await page.waitForTimeout(600);
      }
    }
    const done = await page.locator('text=/今日任务完成|全部完成|宝箱/').isVisible({ timeout: 500 }).catch(() => false);
    if (done) { console.log('  LESSON COMPLETE!'); break; }
  }
  const isComplete = await page.locator('text=/今日任务完成|全部完成/').isVisible().catch(() => false);
  expect(isComplete).toBeTruthy();
});

test('v2.11.0: Last question requires answer', async ({ page }) => {
  await setupFreshUser(page);
  for (let step = 0; step < 5; step++) {
    for (let i = 0; i < 8; i++) {
      const btn = page.locator('button:has-text(/读完|找到|判断|理解|数字找|关键词|算式|擦掉|观察|确认|开始/)').first();
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click(); await page.waitForTimeout(400); continue;
      }
      break;
    }
    const input = page.locator('input[inputMode="decimal"], input[type="text"]');
    if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
      const ans = await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.getCorrectAnswer?.());
      if (ans != null) {
        await input.fill(String(ans));
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(500);
        const cont = page.locator('button:has-text("完成，进入下一关")');
        if (await cont.isVisible({ timeout: 800 }).catch(() => false)) { await cont.click(); await page.waitForTimeout(400); }
      }
    } else {
      const cont = page.locator('button:has-text(/完成|继续|下一/)').first();
      if (await cont.isVisible({ timeout: 500 }).catch(() => false)) { await cont.click(); await page.waitForTimeout(400); }
    }
  }
  // Step 6: try completing without answer
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('button:has-text(/读完|找到|判断|理解|数字找|关键词|算式|擦掉|观察|确认|开始/)').first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) { await btn.click(); await page.waitForTimeout(300); continue; }
    break;
  }
  const allBtns = page.locator('button:has-text(/完成|继续|下一/)');
  const cnt = await allBtns.count();
  for (let i = 0; i < cnt; i++) {
    const b = allBtns.nth(i);
    if (await b.isVisible()) { await b.click(); await page.waitForTimeout(300); }
  }
  const state = await page.evaluate(() => {
    const l = JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}');
    return { completed: l.completed };
  });
  console.log('After no-answer clicks:', JSON.stringify(state));
  expect(state.completed).toBe(false);
});
