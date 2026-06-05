/**
 * E2E 测试: /play 不能自动跳首页
 *
 * 验证：
 * 1. 打开 /play 后不会自动跳回 /
 * 2. 页面不出现工程异常文案
 * 3. 能正常进入第一关
 */

import { test, expect } from '@playwright/test';

test.describe('/play 不跳首页', () => {
  test.beforeEach(async ({ page }) => {
    // 清空 localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('打开 /play 后停留在 /play', async ({ page }) => {
    await page.goto('/play');
    // 等待页面加载
    await page.waitForTimeout(2000);
    // 断言 URL 仍然是 /play
    expect(page.url()).toContain('/play');
    // 不应跳到首页
    expect(page.url()).not.toBe('http://localhost:3000/');
  });

  test('不出现工程异常文案', async ({ page }) => {
    await page.goto('/play');
    await page.waitForTimeout(2000);
    // 检查页面不包含异常文案
    const content = await page.content();
    const forbiddenTexts = [
      '关卡数据异常',
      '正在自动修复',
      '系统已自动处理',
      '该题目缺少多余信息',
      '不适合当前关卡',
      '今天的任务已整理好',
      'repair failed',
      'invalid step',
      '数据不兼容',
    ];
    for (const text of forbiddenTexts) {
      expect(content).not.toContain(text);
    }
  });

  test('等量代换题不触发 repair', async ({ page }) => {
    // 模拟包含等量代换题的 lesson
    await page.goto('/');
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0];
      const lesson = {
        date: today,
        currentStepIndex: 0,
        completed: false,
        steps: [{
          id: 'test_step_1',
          type: 'find_action_words',
          title: '找到动作线索',
          description: '找出关键词',
          questionId: 'g1t_08', // 等量代换题
          phases: ['read', 'find_keywords', 'choose_operation', 'answer'],
          currentPhaseIndex: 0,
          status: 'current',
          requiresAnswer: true,
        }],
      };
      localStorage.setItem('math-detective-today-lesson', JSON.stringify(lesson));
    });
    await page.goto('/play');
    await page.waitForTimeout(3000);
    // 应该重建 lesson 而不是跳首页
    expect(page.url()).toContain('/play');
  });
});
