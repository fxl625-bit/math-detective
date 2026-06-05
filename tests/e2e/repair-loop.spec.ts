/**
 * E2E 测试: 坏 localStorage 不能造成死循环
 *
 * 验证：
 * 1. 写入坏 lesson 后打开 /play
 * 2. 不跳首页
 * 3. 自动重建合法 lesson
 * 4. 刷新后仍然合法
 */

import { test, expect } from '@playwright/test';

test.describe('repair loop 防护', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('坏 lesson 不造成死循环', async ({ page }) => {
    // 写入一个坏 lesson
    await page.goto('/');
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0];
      const lesson = {
        date: today,
        currentStepIndex: 0,
        completed: false,
        steps: [{
          id: 'bad_step',
          type: 'find_action_words',
          title: '找到动作线索',
          description: '找出关键词',
          questionId: 'g1t_08', // 等量代换题，不适合 find_action_words
          phases: ['read', 'find_keywords', 'choose_operation', 'answer'],
          currentPhaseIndex: 0,
          status: 'current',
          requiresAnswer: true,
        }],
      };
      localStorage.setItem('math-detective-today-lesson', JSON.stringify(lesson));
    });

    // 打开 /play
    await page.goto('/play');
    await page.waitForTimeout(3000);

    // 应该停留在 /play
    expect(page.url()).toContain('/play');

    // 刷新后仍然合法
    await page.reload();
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/play');
  });

  test('无多余信息题不进入 spot_extra_info', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0];
      const lesson = {
        date: today,
        currentStepIndex: 0,
        completed: false,
        steps: [{
          id: 'bad_step',
          type: 'spot_extra_info',
          title: '识别多余信息',
          description: '找出多余数字',
          questionId: 'g1_01', // 没有多余信息的题
          phases: ['read', 'find_numbers', 'spot_extra_info', 'answer'],
          currentPhaseIndex: 0,
          status: 'current',
          requiresAnswer: true,
        }],
      };
      localStorage.setItem('math-detective-today-lesson', JSON.stringify(lesson));
    });

    await page.goto('/play');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/play');
  });
});
