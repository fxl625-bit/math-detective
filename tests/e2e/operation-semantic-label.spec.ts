import { test, expect, type Page } from '@playwright/test';
import { submitCurrentAnswerThroughUi } from './helpers/legacy-lesson';
import { getQuestionById } from '../../data/questions';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/**
 * v2.11.0: Operation semantic label E2E tests.
 * Verifies that operation labels match the actual operation of the question.
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

/**
 * Semantic categories to test:
 * - Direct addition (一共, 合起来)
 * - Direct subtraction (还剩, 飞走)
 * - Reverse unknown (原来有) → should be addition
 * - Money change (找回) → should be subtraction
 * - Comparison (比...多/少) → should be comparison or subtraction
 * - Multi-step (两步) → should be mixed
 */
test('v2.11.0-semantic: Operation label matches equation for each question in lesson', async ({ page }) => {
  test.setTimeout(120000);
  await setupFreshUser(page);

  const reviewedQuestionIds: string[] = [];
  for (let stepIndex = 0; stepIndex < 6; stepIndex += 1) {
    const feedbackDialog = page.getByRole('dialog');
    if (await feedbackDialog.isVisible().catch(() => false)) {
      const continueLearning = feedbackDialog.getByRole('button', { name: '继续学习', exact: true });
      if (await continueLearning.isVisible().catch(() => false)) await continueLearning.click();
    }
    const state = await getState(page);
    expect(state?.currentStepIndex).toBe(stepIndex);
    expect(state?.currentPhase).toBe('answer');
    const questionId = String(state.questionId);
    const question = getQuestionById(questionId);
    expect(question, `question ${questionId} is registered`).toBeDefined();

    await submitCurrentAnswerThroughUi(page);
    await expect(page.getByTestId('question-review')).toBeVisible();
    const reviewText = await page.locator('body').innerText();
    expect(reviewText, `${questionId} review shows the original explanation`).toContain(question!.explanation);
    expect(reviewText, `${questionId} review shows the answer sentence`).toContain(question!.answerSentence);

    const operationLabels = [
      { label: '加法', operation: 'addition', symbol: '+' },
      { label: '减法', operation: 'subtraction', symbol: '-' },
      { label: '乘法', operation: 'multiplication', symbol: '×' },
      { label: '除法', operation: 'division', symbol: '÷' },
    ].filter(item => reviewText.includes(item.label));
    for (const item of operationLabels) {
      expect(question!.operation, `${questionId} ${item.label} label matches the question operation`).toBe(item.operation);
      expect(question!.equation, `${questionId} equation uses ${item.symbol}`).toContain(item.symbol);
    }
    if (operationLabels.length === 0 && question!.equation) {
      const solution = `${question!.explanation} ${(question!.solutionSteps || []).join(' ')}`;
      const operator = question!.equation.match(/[+\-×÷]/)?.[0];
      if (operator) expect(solution, `${questionId} solution contains its equation operation`).toContain(operator);
    }
    reviewedQuestionIds.push(questionId);
    await page.getByTestId('continue-feedback').click();
    if (stepIndex < 5) await expect.poll(async () => (await getState(page))?.currentStepIndex).toBe(stepIndex + 1);
    else await expect.poll(async () => (await getState(page))?.completed).toBe(true);
  }
  expect(reviewedQuestionIds).toHaveLength(6);
  expect((await getState(page))?.completed).toBe(true);
});

test('v2.11.0-semantic: Money subtraction shows correct domain-aware text', async ({ page }) => {
  test.setTimeout(60000);
  await setupFreshUser(page);
  await page.evaluate(() => {
    const api = (window as any).MATH_DETECTIVE_TEST;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    api.setLesson({ date, currentStepIndex: 0, completed: false, steps: [{
      id: `${date}_money_semantic_g1ll_50`, type: 'answer_only', title: '金额变化', description: '',
      questionId: 'g1ll_50', phases: ['answer', 'explain'], currentPhaseIndex: 0, status: 'current', requiresAnswer: true,
    }] });
  });
  await expect(page.getByTestId('lesson-question-prompt')).toContainText('应找回多少钱');
  await submitCurrentAnswerThroughUi(page, 'click', '1元5角');
  const question = getQuestionById('g1ll_50')!;
  const reviewText = await page.locator('body').innerText();
  expect(reviewText).toContain(question.explanation);
  expect(reviewText).toContain(question.answerSentence);
  expect(reviewText).toContain('10元');
  expect(reviewText).toContain('8元5角');
});
