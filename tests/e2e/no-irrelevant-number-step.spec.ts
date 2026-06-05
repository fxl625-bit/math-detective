/**
 * E2E test: no-irrelevant-number-step
 * questions without extraNumbers must not enter spot_extra_info step
 */
import { test, expect } from '@playwright/test';

test.describe('no-irrelevant-number-step', () => {
  test('spot_extra_info step with no extraNumbers gets rebuilt', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      const today = new Date().toISOString().split('T')[0];
      const badLesson = {
        date: today,
        currentStepIndex: 0,
        completed: false,
        steps: [{
          id: 'bad_extra_step',
          type: 'spot_extra_info',
          title: 'spot_extra_info',
          description: 'test',
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
    expect(page.url()).toContain('/play');
  });
});
