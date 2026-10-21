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
      type: 'answer_only' as const,
      questionId,
      title: '独立作答与互动帮助',
      description: '判断动作方向后仍需独立回答原题',
      phases: ['answer', 'explain'],
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

async function submitDirectionTask(page: Page, questionId: string, correctLabel: string, wrongLabel: string, oracleAnswer: string) {
  await expect(page.getByTestId('lesson-question-prompt')).toBeVisible();
  await expect(page.getByTestId('submit-answer')).toBeVisible();
  const oracle = await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST.getCorrectAnswer());
  expect(String(oracle), `fixed answer oracle for ${questionId}`).toBe(oracleAnswer);

  await page.getByTestId('request-help').click();
  await expect(page.getByTestId('help-task')).toBeVisible();
  await expect(page.getByTestId('help-task')).toContainText(questionId === 'g1t_29' ? '“加”' : questionId === 'g1_17' ? '飞走了' : '又给了');
  const correctOption = page.getByTestId('help-option-correct');
  const wrongOption = page.getByTestId('help-option-other-0');
  await expect(correctOption).toContainText(correctLabel);
  await expect(wrongOption).toContainText(wrongLabel);

  // Confirming the wrong direction must preserve the same task and original question.
  await wrongOption.click();
  await page.getByTestId('submit-help-task').click();
  await expect.poll(async () => page.evaluate(() => {
    const lesson = (window as any).MATH_DETECTIVE_TEST.getLesson();
    const step = lesson.steps[lesson.currentStepIndex];
    return { taskIndex: step.solving.helpTaskIndex, feedbackCorrect: step.helpFeedback?.correct, questionId: step.questionId, currentStepIndex: lesson.currentStepIndex };
  })).toEqual({ taskIndex: 0, feedbackCorrect: false, questionId, currentStepIndex: 0 });
  await expect(page.getByTestId('help-task')).toBeVisible();
  await expect(page.getByTestId('help-task')).toContainText(questionId === 'g1t_29' ? '“加”' : questionId === 'g1_17' ? '飞走了' : '又给了');
  const failedHelp = await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST.getLesson().steps[0].helpFeedback);
  expect(failedHelp).toMatchObject({ correct: false });
  expect(await page.evaluate((id) => JSON.parse(localStorage.getItem('math-detective-state') || '{}').learningEvents.filter((event: any) => event.eventType === 'attempt_submitted' && event.questionId === id), questionId)).toHaveLength(0);
  expect((await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST.getState())).currentStepIndex).toBe(0);

  await correctOption.click();
  await page.getByTestId('submit-help-task').click();
  await expect.poll(async () => page.evaluate(() => {
    const lesson = (window as any).MATH_DETECTIVE_TEST.getLesson();
    return lesson.steps[lesson.currentStepIndex].solving.completedTaskIds;
  })).toContain(`${questionId}:curated-1`);

  // A completed reasoning task does not answer the original question.
  await expect(page.getByTestId('submit-answer')).toBeVisible();
  expect((await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST.getLesson())).steps[0].solving.finalCorrect).toBe(false);
  await page.getByTestId('lesson-answer-input').fill(oracleAnswer);
  await page.getByTestId('submit-answer').click();
  await expect(page.getByTestId('question-review')).toBeVisible();
  const result = await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST.getLesson().steps[0]);
  expect(result.solving).toMatchObject({ finalCorrect: true, masteryStatus: 'assisted', outcome: 'hint_correct' });
}

// ================================================================
// Test 1: Keyword "加" — must select "increase" NOT "decrease"
// g1t_29: 5 + ⭐ = 12, keyword: "加" type:'add', operation:'subtraction'
// ================================================================
test('v2.11.3-action-word-semantic: keyword "加" must select increase', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page, 'g1t_29');
  await submitDirectionTask(page, 'g1t_29', '数量变多', '数量变少', '7');
});

// ================================================================
// Test 2: Keyword "飞走了" — must select "decrease" NOT "increase"
// g1_17: 花丛中有8只蝴蝶，飞走了3只... keyword: [{word:'飞走了', type:'subtract'}]
// Only ONE keyword, so clicking it enables the advance button immediately.
// ================================================================
test('v2.11.3-action-word-semantic: keyword "飞走了" must select decrease', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page, 'g1_17');
  await submitDirectionTask(page, 'g1_17', '数量变少', '数量变多', '5');
});

// ================================================================
// Test 3: Reverse problem "又给了" — action increase, solution subtraction
// g1ll_10: 妈妈又给了他一些糖... keywords: [{word:'又给了', type:'add'}], operation:'subtraction'
// ================================================================
test('v2.11.3-action-word-semantic: reverse problem distinguishes action from solution', async ({ page }) => {
  test.setTimeout(120000);
  await setup(page, 'g1ll_10');
  // "又给了" is an increase action, while the unknown amount is found by subtraction.
  await submitDirectionTask(page, 'g1ll_10', '数量变多', '数量变少', '9');
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
    rootCause: 'Action direction and the arithmetic operation used to find an unknown quantity are separate reasoning facts.',
    fix: 'Curated help tasks verify action direction; the learner must still submit the original answer through its answer schema.',
  };
  const reportPath = path.join(__dirname, '..', '..', 'reports', 'action-word-choice-audit.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
});
