import { expect, type Page } from '@playwright/test';

type TestState = {
  lesson: {
    steps?: Array<{ questionId?: string; type?: string }>;
    completed?: boolean;
    rewardClaimed?: boolean;
    rewardShown?: boolean;
  } | null;
  currentStepIndex: number | null;
  currentPhaseIndex: number | null;
  currentPhase: string | null;
  questionId: string | null;
  stepType: string | null;
  completed: boolean;
  rewardClaimed: boolean;
  rewardShown: boolean;
};

declare global {
  interface Window {
    MATH_DETECTIVE_TEST?: {
      getLesson: () => unknown;
      getState: () => Record<string, unknown>;
      getCorrectAnswer: () => number | string | null;
      submitAnswer: () => boolean;
      goNext: () => boolean;
      getValidationStatus: () => Record<string, unknown>;
    };
  }
}

export const forbiddenChildTexts = [
  '关卡数据异常',
  '正在自动修复',
  '系统已自动处理',
  '今天的任务已整理好',
  '该题目缺少多余信息',
  '不适合当前关卡',
  'invalid step',
  'repair failed',
  '数据不兼容',
];

export async function seedG1State(page: Page) {
  const token = `seed_${Date.now()}_${Math.random()}`;
  await page.addInitScript((seedToken: string) => {
    if (sessionStorage.getItem('__math_detective_e2e_seed') === seedToken) return;
    const today = new Date().toISOString().slice(0, 10);
    localStorage.clear();
    sessionStorage.setItem('__math_detective_e2e_seed', seedToken);
    localStorage.setItem('math-detective-state', JSON.stringify({
      version: 8,
      stars: 0,
      streak: 0,
      lastPlayDate: today,
      lastCheckinDate: '',
      completedToday: 0,
      totalCompleted: 0,
      correctCount: 0,
      wrongCount: 0,
      answerAttempts: 0,
      level: 1,
      badges: [],
      completedQuestions: [],
      mistakes: [],
      resumeCards: 1,
      parentSettings: { gradeBand: 'G1', dailyGoal: 6, maxDifficulty: 2 },
      lastStreakCheckDate: today,
      skillMistakes: {},
      parentRewards: [],
      rewardRedemptions: [],
      parentGateAttempts: [],
      weeklySnapshots: [],
      skillLevel: 1,
      decorations: [],
      collectibleCards: [],
      questionReviewDates: {},
      questionReviewCounts: {},
      attemptRecords: [],
    }));
  }, token);
}

export async function openPlayE2E(page: Page) {
  await page.goto('/play?e2e=1');
  await page.waitForFunction(() => Boolean(window.MATH_DETECTIVE_TEST));
  await page.waitForFunction(() => {
    const state = window.MATH_DETECTIVE_TEST?.getState();
    return Boolean(state?.lesson && state.questionId);
  });
}

export async function getTestState(page: Page): Promise<TestState> {
  return page.evaluate(() => window.MATH_DETECTIVE_TEST!.getState() as TestState);
}

export async function assertNoForbiddenChildText(page: Page) {
  const content = await page.content();
  for (const text of forbiddenChildTexts) {
    expect(content).not.toContain(text);
  }
}

export async function playThroughLesson(page: Page, expectedSteps = 6) {
  const questionCounts: Record<string, number> = {};
  let lastStepIndex = -1;
  let lastQuestionId: string | null = null;
  let submitCountForPhase = 0;

  for (let i = 0; i < 80; i++) {
    expect(page.url()).toContain('/play');
    await assertNoForbiddenChildText(page);

    const state = await getTestState(page);
    if (state.completed) {
      expect(state.lesson?.steps?.length ?? 0).toBeGreaterThanOrEqual(expectedSteps);
      return state;
    }

    expect(state.currentStepIndex ?? -1).toBeGreaterThanOrEqual(lastStepIndex);
    lastStepIndex = state.currentStepIndex ?? lastStepIndex;

    if (state.questionId && state.questionId !== lastQuestionId) {
      questionCounts[state.questionId] = (questionCounts[state.questionId] ?? 0) + 1;
      expect(questionCounts[state.questionId]).toBeLessThanOrEqual(2);
      lastQuestionId = state.questionId;
    }

    if (state.rewardClaimed || state.rewardShown) {
      throw new Error('Reward appeared before lesson completion');
    }

    if (state.currentPhase === 'answer' || state.currentPhase === 'ranking_answer') {
      submitCountForPhase += 1;
      expect(submitCountForPhase).toBe(1);
      const submitted = await page.evaluate(() => window.MATH_DETECTIVE_TEST!.submitAnswer());
      expect(submitted).toBe(true);
    } else {
      submitCountForPhase = 0;
      const advanced = await page.evaluate(() => window.MATH_DETECTIVE_TEST!.goNext());
      expect(advanced).toBe(true);
    }

    await page.waitForTimeout(450);
  }

  throw new Error('Lesson did not complete within 80 E2E actions');
}
