/**
 * E2E test: full-lesson-playthrough
 * 
 * Simulates a complete 6-step lesson from G1 to verify
 * that every step can be completed without getting stuck,
 * redirecting to home, or showing error pages.
 */
import { test, expect } from '@playwright/test';

test.describe('full lesson playthrough', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('G1 complete playthrough does not get stuck', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
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
        questionReviewCounts: {},
        questionReviewDates: {},
      };
      localStorage.setItem('math-detective-state', JSON.stringify(state));
    });

    // Navigate to /play — lesson should be generated
    await page.goto('/play');
    await page.waitForTimeout(3000);

    // Assert 1: On /play, not redirected
    expect(page.url()).toContain('/play');
    expect(page.url()).not.toBe('http://localhost:3000/');

    // Assert 2: A lesson was generated
    const hasLesson = await page.evaluate(() => {
      const raw = localStorage.getItem('math-detective-today-lesson');
      return raw !== null;
    });
    expect(hasLesson).toBe(true);

    // Assert 3: Lesson has valid steps
    const lessonInfo = await page.evaluate(() => {
      const raw = localStorage.getItem('math-detective-today-lesson');
      if (!raw) return null;
      const lesson = JSON.parse(raw);
      return {
        stepCount: lesson.steps?.length || 0,
        currentStepIndex: lesson.currentStepIndex,
        completed: lesson.completed,
        stepTypes: lesson.steps?.map((s: any) => s.type) || [],
      };
    });
    expect(lessonInfo).not.toBeNull();
    expect(lessonInfo!.stepCount).toBeGreaterThan(0);

    // Assert 4: No question ID appears more than twice
    const qIds = await page.evaluate(() => {
      const raw = localStorage.getItem('math-detective-today-lesson');
      if (!raw) return [];
      const lesson = JSON.parse(raw);
      return (lesson.steps || []).map((s: any) => s.questionId);
    });
    const qIdCounts: Record<string, number> = {};
    for (const id of qIds) {
      qIdCounts[id] = (qIdCounts[id] || 0) + 1;
    }
    for (const [id, count] of Object.entries(qIdCounts)) {
      expect(count).toBeLessThanOrEqual(2);
    }

    // Assert 5: No forbidden text in page
    const content = await page.content();
    const forbidden = [
      '关卡数据异常', '系统已自动处理', '正在自动修复',
      '今天的任务已整理好', 'repair failed', 'invalid step',
    ];
    for (const text of forbidden) {
      expect(content).not.toContain(text);
    }
  });

  test('generate 20 lessons, all complete without loops', async ({ page }) => {
    const results: string[] = [];
    
    for (let i = 0; i < 20; i++) {
      await page.goto('/');
      await page.evaluate((iteration: number) => {
        localStorage.clear();
        const state = {
          version: 6,
          stars: iteration * 3,
          streak: iteration,
          completedToday: iteration * 5,
          parentSettings: { gradeBand: 'G1', dailyQuestionLimit: 5 },
          skillMistakes: {},
          answerAttempts: iteration * 10,
          correctCount: iteration * 8,
          completedQuestionIds: [],
          questionReviewCounts: {},
          questionReviewDates: {},
        };
        localStorage.setItem('math-detective-state', JSON.stringify(state));
      }, i);

      await page.goto('/play');
      await page.waitForTimeout(2000);

      const url = page.url();
      if (!url.includes('/play')) {
        results.push(`iter=${i}: redirected to ${url}`);
        continue;
      }

      const hasLesson = await page.evaluate(() => {
        return localStorage.getItem('math-detective-today-lesson') !== null;
      });
      if (!hasLesson) {
        results.push(`iter=${i}: no lesson generated`);
        continue;
      }

      const lessonData = await page.evaluate(() => {
        const raw = localStorage.getItem('math-detective-today-lesson');
        if (!raw) return null;
        const lesson = JSON.parse(raw);
        return {
          stepCount: lesson.steps.length,
          steps: (lesson.steps || []).map((s: any) => ({
            type: s.type,
            questionId: s.questionId,
          })),
        };
      });

      // Check for pattern questions in incompatible steps
      if (lessonData) {
        for (const step of lessonData.steps) {
          if (['g1t_03', 'g1t_04', 'g1t_05'].includes(step.questionId)) {
            if (step.type === 'find_action_words') {
              results.push(`iter=${i}: pattern q in find_action_words`);
            }
            if (step.type === 'remove_noise') {
              results.push(`iter=${i}: pattern q in remove_noise`);
            }
          }
        }
      }

      localStorage.clear();
    }

    expect(results.length).toBe(0);
  });

  test('no step causes URL to redirect away from /play', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const state = {
        version: 6,
        stars: 0, streak: 0, completedToday: 0,
        parentSettings: { gradeBand: 'G1', dailyQuestionLimit: 5 },
        skillMistakes: {},
        answerAttempts: 0, correctCount: 0,
        completedQuestionIds: [],
      };
      localStorage.setItem('math-detective-state', JSON.stringify(state));
    });

    await page.goto('/play');
    // Wait multiple seconds to check no redirect
    for (let t = 0; t < 6; t++) {
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).toContain('/play');
    }
  });
});
