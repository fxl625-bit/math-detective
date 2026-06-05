/**
 * E2E test: pattern-step-loop
 * 
 * Verify that pattern questions (e.g. "2、4、6、8、__") do not
 * cause the /play page to get stuck, loop, redirect to home, or
 * enter inappropriate phases like find_action_words.
 */
import { test, expect } from '@playwright/test';

test.describe('pattern step loop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('pattern question in pond duck theme does not cause loop', async ({ page }) => {
    // Inject a bad lesson: pond_duckling_mystery theme +
    // find_numbers step with pattern question g1t_03
    await page.goto('/');
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0];
      const badLesson = {
        date: today,
        currentStepIndex: 0,
        completed: false,
        caseStoryId: 'pond_duckling_mystery',
        steps: [{
          id: 'step_1',
          type: 'find_numbers',
          title: '找到数字线索',
          description: '先找出题目里出现的所有数字',
          questionId: 'g1t_03',
          phases: ['read', 'find_numbers', 'answer'],
          currentPhaseIndex: 0,
          status: 'current',
          requiresAnswer: true,
        }],
      };
      localStorage.setItem('math-detective-today-lesson', JSON.stringify(badLesson));
    });

    await page.goto('/play');
    await page.waitForTimeout(3000);

    // Assert 1: URL remains /play — no redirect to home
    expect(page.url()).toContain('/play');
    expect(page.url()).not.toBe('http://localhost:3000/');

    // Assert 2: No engineering error page shown
    const content = await page.content();
    const forbidden = [
      '关卡数据异常', '系统已自动处理', '正在自动修复',
      '今天的任务已整理好', '不适合当前关卡',
    ];
    for (const text of forbidden) {
      expect(content).not.toContain(text);
    }
  });

  test('pattern question does not enter find_action_words step', async ({ page }) => {
    // Create a lesson that forces a find_action_words step with a pattern question
    await page.goto('/');
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0];
      const badLesson = {
        date: today,
        currentStepIndex: 0,
        completed: false,
        steps: [{
          id: 'step_1',
          type: 'find_action_words',
          title: '找到动作词',
          description: '找加减关键词',
          questionId: 'g1t_03', // pattern question — has no keywords
          phases: ['read', 'find_keywords', 'choose_operation', 'answer'],
          currentPhaseIndex: 0,
          status: 'current',
          requiresAnswer: true,
        }],
      };
      localStorage.setItem('math-detective-today-lesson', JSON.stringify(badLesson));
    });

    await page.goto('/play');
    await page.waitForTimeout(4000);

    // Should NOT show find_action_words UI with a pattern question
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('加减关键词');
    // Should NOT loop or redirect
    expect(page.url()).toContain('/play');
  });

  test('full 6-step lesson with pattern question can complete', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      // Set G1 state
      const state = {
        version: 6,
        stars: 0,
        streak: 0,
        completedToday: 0,
        parentSettings: { gradeBand: 'G1', dailyQuestionLimit: 5 },
        skillMistakes: {},
        answerAttempts: 0,
        correctCount: 0,
        completedQuestionIds: [],
      };
      localStorage.setItem('math-detective-state', JSON.stringify(state));
    });

    // Navigate to /play to trigger lesson generation
    await page.goto('/play');
    await page.waitForTimeout(5000);

    // Should remain on /play
    expect(page.url()).toContain('/play');

    // Read the generated lesson
    const lessonJson = await page.evaluate(() => {
      return localStorage.getItem('math-detective-today-lesson');
    });
    expect(lessonJson).toBeTruthy();

    const lesson = JSON.parse(lessonJson!);
    // Check that pattern questions are not in incompatible steps
    for (const step of lesson.steps) {
      if (step.questionId === 'g1t_03' || step.questionId === 'g1t_04' || step.questionId === 'g1t_05') {
        // Pattern questions should NOT be in find_action_words step
        expect(step.type).not.toBe('find_action_words');
        // Pattern questions should NOT be in remove_noise step
        expect(step.type).not.toBe('remove_noise');
        // Pattern questions should NOT be in spot_extra_info step
        expect(step.type).not.toBe('spot_extra_info');
      }
    }
  });
});
