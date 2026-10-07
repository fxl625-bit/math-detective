import { test } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

async function setupQ5Start(page: any) {
  await page.goto(`${BASE}/play?e2e=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!(window as any).MATH_DETECTIVE_TEST, { timeout: 15000 });

  const today = new Date().toISOString().slice(0, 10);
  await page.evaluate((stateJson: string) => {
    localStorage.setItem('math-detective-state', stateJson);
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

  const steps = [
    { id: `${today}_find_numbers_0_g1ll_02`, type: 'find_numbers', questionId: 'g1ll_02', title: '找数字线索', description: '从题目中找到数字', phases: ['read', 'find_numbers', 'answer', 'explain'], currentPhaseIndex: 0, status: 'completed', awardedAt: `${today}T00:00:00.000Z` },
    { id: `${today}_find_action_words_1_g1ll_13`, type: 'find_action_words', questionId: 'g1ll_13', title: '找动作词', description: '找到加减动作词', phases: ['read', 'find_keywords', 'choose_operation', 'answer', 'explain'], currentPhaseIndex: 0, status: 'completed', awardedAt: `${today}T00:00:00.000Z` },
    { id: `${today}_simulation_2_g1ll_29`, type: 'simulation', questionId: 'g1ll_29', title: '模拟场景', description: '模拟题目场景', phases: ['read', 'choose_operation', 'answer', 'explain'], currentPhaseIndex: 0, status: 'completed', awardedAt: `${today}T00:00:00.000Z` },
    { id: `${today}_remove_noise_3_g1ll_07`, type: 'remove_noise', questionId: 'g1ll_07', title: '擦掉没用的信息', description: '去掉多余信息', phases: ['read', 'remove_noise', 'answer', 'explain'], currentPhaseIndex: 0, status: 'completed', awardedAt: `${today}T00:00:00.000Z` },
    { id: `${today}_answer_only_4_g1ll_32`, type: 'answer_only', questionId: 'g1ll_32', title: '今日挑战', description: '仔细读题，直接算出答案', phases: ['answer', 'explain'], currentPhaseIndex: 0, status: 'active' },
    { id: `${today}_answer_only_5_g1ll_68`, type: 'answer_only', questionId: 'g1ll_68', title: '今日挑战', description: '仔细读题，直接算出答案', phases: ['answer', 'explain'], currentPhaseIndex: 0, status: 'locked' },
  ];

  const lesson = {
    date: today, steps, currentStepIndex: 4, completed: false,
    caseStoryId: 'daily_training', rewardClaimed: false, rewardShown: false,
    completedAt: null, generatedByVersion: '2.11.1', generatorVersion: 5,
    curriculumSnapshot: { semester: 'lower', grade: 1 },
  };

  await page.evaluate((lessonData: any) => {
    (window as any).MATH_DETECTIVE_TEST?.setLesson(lessonData);
  }, lesson);
  await page.waitForTimeout(500);
}

test('diag: inspect input element', async ({ page }) => {
  await setupQ5Start(page);
  
  const inputCount = await page.locator('input').count();
  console.log('Input count:', inputCount);
  
  for (let i = 0; i < inputCount; i++) {
    const input = page.locator('input').nth(i);
    const name = await input.getAttribute('name');
    const type = await input.getAttribute('type');
    const visible = await input.isVisible();
    console.log(`Input ${i}: name="${name}", type="${type}", visible=${visible}`);
  }
  
  const answerInputs = await page.locator('input[name="answer"]').count();
  console.log('input[name="answer"] count:', answerInputs);
  
  await page.screenshot({ path: test.info().outputPath('diag-input.png'), fullPage: true });
});
