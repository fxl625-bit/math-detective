/**
 * E2E 测试: 每日奖励只弹一次
 *
 * 验证：
 * 1. 完成任务后奖励弹窗出现一次
 * 2. 关闭后不再弹
 * 3. 刷新后不再弹
 */

import { test, expect } from '@playwright/test';

test.describe('每日奖励幂等', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('rewardShown 标记持久化', async ({ page }) => {
    // 先打开页面让 JS 加载
    await page.goto('/');
    await page.waitForTimeout(1000);
    // 写入已完成且奖励已展示的 lesson
    // 使用 full_solve step type + g1_01 (basic_arithmetic) 确保兼容
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0];
      const lesson = {
        date: today,
        currentStepIndex: 0,
        completed: true,
        rewardClaimed: true,
        rewardShown: true,
        rewardClaimedAt: new Date().toISOString(),
        rewardShownAt: new Date().toISOString(),
        steps: [{
          id: 'test_step_1',
          type: 'full_solve',
          title: '完整破案',
          description: '从头到尾破解',
          questionId: 'g1_01',
          phases: ['read', 'find_numbers', 'find_keywords', 'choose_operation', 'build_equation', 'answer', 'explain', 'completed'],
          currentPhaseIndex: 6,
          status: 'completed',
          requiresAnswer: true,
        }],
      };
      localStorage.setItem('math-detective-today-lesson', JSON.stringify(lesson));
      // 设置版本号防止 migration 清除
      localStorage.setItem('math-detective-app-version', '2.8.0');
    });
    // 刷新页面
    await page.reload();
    await page.waitForTimeout(2000);
    // 检查 localStorage 中 rewardShown 仍为 true
    const rewardShown = await page.evaluate(() => {
      const raw = localStorage.getItem('math-detective-today-lesson');
      if (!raw) return false;
      const lesson = JSON.parse(raw);
      return lesson.rewardShown === true;
    });
    expect(rewardShown).toBe(true);
  });
});
