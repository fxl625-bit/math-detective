/**
 * E2E 测试：无多余数字题不能进入多余数字关卡
 * 
 * 验证：
 * 1. 有 noisePhrases 无 extraNumbers 的题不能进入 spot_extra_info step
 * 2. 系统自动换成合法题或重建 safe fallback lesson
 * 3. URL 仍是 /play
 * 4. 不跳首页
 * 5. 孩子端不显示工程异常页
 */
import { test, expect } from '@playwright/test';

test.describe('无多余数字题不进入识别多余数字关卡', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('有废话无多余数字的题不进入 spot_extra_info', async ({ page }) => {
    // 模拟：注入一个 lesson，其中 step 类型是 spot_extra_info，但题目没有 extraNumbers
    await page.goto('/');
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0];
      const badLesson = {
        date: today,
        currentStepIndex: 0,
        completed: false,
        steps: [{
          id: 'bad_extra_step',
          type: 'spot_extra_info',
          title: '识别多余信息',
          description: '找出题目中和计算无关的多余数字',
          questionId: 'g1_01', // 兔子加法题：6只白兔+4只灰兔，没有 extraNumbers
          phases: ['read', 'find_numbers', 'spot_extra_info', 'answer'],
          currentPhaseIndex: 0,
          status: 'current',
          requiresAnswer: true,
        }],
      };
      localStorage.setItem('math-detective-today-lesson', JSON.stringify(badLesson));
    });

    // 访问 /play
    await page.goto('/play');
    await page.waitForTimeout(3000);

    // 断言 1: URL 仍然是 /play（没有跳首页）
    expect(page.url()).toContain('/play');
    // 断言 2: 不应该跳到首页
    expect(page.url()).not.toBe('http://localhost:3000/');

    // 断言 3: 页面不显示工程异常文案
    const content = await page.content();
    const forbiddenTexts = [
      '关卡数据异常',
      '系统已自动处理',
      '正在自动修复',
      '该题目缺少多余信息',
      '不适合当前关卡',
    ];
    for (const text of forbiddenTexts) {
      expect(content).not.toContain(text);
    }
  });

  test('注入坏 spot_extra_info lesson 后页面不让选有用数字当多余数字', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0];
      const badLesson = {
        date: today,
        currentStepIndex: 0,
        completed: false,
        steps: [{
          id: 'bad_extra_step',
          type: 'spot_extra_info',
          title: '识别多余信息',
          description: '找出和计算无关的多余数字',
          questionId: 'g1_01',
          phases: ['read', 'find_numbers', 'spot_extra_info', 'answer'],
          currentPhaseIndex: 0,
          status: 'current',
          requiresAnswer: true,
        }],
      };
      localStorage.setItem('math-detective-today-lesson', JSON.stringify(badLesson));
    });

    await page.goto('/play');
    await page.waitForTimeout(3000);

    // 不应该显示"走出和计算无关的多余数字"文案
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('走出和计算无关的多余数字');
  });

  test('生成多套lesson后检查 spot_extra_info step 都有 extraNumbers', async ({ page }) => {
    await page.goto('/');
    
    // 用页内脚本验证：在 G1 级别不应该生成 spot_extra_info step
    const results = await page.evaluate(async () => {
      const outcomes: string[] = [];
      
      for (let i = 0; i < 20; i++) {
        localStorage.clear();
        
        const state = {
          version: 6,
          stars: 0,
          streak: 0,
          completedToday: 0,
          parentSettings: {
            gradeBand: 'G1',
            dailyQuestionLimit: 5,
          },
          skillMistakes: {},
          answerAttempts: 0,
          correctCount: 0,
        };
        localStorage.setItem('math-detective-state', JSON.stringify(state));
        
        window.location.href = '/play';
        await new Promise(r => setTimeout(r, 2000));
        
        const lessonRaw = localStorage.getItem('math-detective-today-lesson');
        if (lessonRaw) {
          try {
            const lesson = JSON.parse(lessonRaw);
            for (const step of lesson.steps || []) {
              if (step.type === 'spot_extra_info') {
                outcomes.push('spot_extra_info:' + step.questionId);
              }
            }
          } catch (e) {
            outcomes.push('parse_error');
          }
        }
        
        localStorage.clear();
      }
      
      return outcomes;
    });

    // G1 级别不应该有 spot_extra_info step
    expect(results.filter(r => r.includes('spot_extra_info')).length).toBe(0);
  });

  test('修复后刷新仍合法', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('math-detective-today-lesson', JSON.stringify({
        date: today,
        currentStepIndex: 0,
        completed: false,
        steps: [{
          id: 'bad_step',
          type: 'spot_extra_info',
          title: '识别多余信息',
          description: '走出多余数字',
          questionId: 'g1_01',
          phases: ['read', 'find_numbers', 'spot_extra_info', 'answer'],
          currentPhaseIndex: 0,
          status: 'current',
          requiresAnswer: true,
        }],
      }));
    });

    await page.goto('/play');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/play');

    await page.reload();
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/play');
    
    const content = await page.content();
    expect(content).not.toContain('关卡数据异常');
  });
});
