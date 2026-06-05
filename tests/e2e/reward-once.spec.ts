import { expect, test } from '@playwright/test';
import { openPlayE2E, playThroughLesson, seedG1State } from './helpers';

test.describe('daily reward is shown once', () => {
  test('completion reward flags remain stable across navigation and reload', async ({ page }) => {
    await seedG1State(page);
    await openPlayE2E(page);
    await playThroughLesson(page, 6);

    const afterCompletion = await page.evaluate(() => {
      const lesson = JSON.parse(localStorage.getItem('math-detective-today-lesson') || 'null');
      const state = JSON.parse(localStorage.getItem('math-detective-state') || 'null');
      return { lesson, state };
    });
    expect(afterCompletion.lesson.rewardClaimed).toBe(true);
    expect(afterCompletion.lesson.rewardShown).toBe(true);
    const stars = afterCompletion.state?.stars ?? 0;
    const exp = afterCompletion.state?.exp ?? 0;
    const streak = afterCompletion.state?.streak ?? 0;

    await page.goto('/');
    await page.waitForTimeout(500);
    await page.goto('/play?e2e=1');
    await page.waitForTimeout(500);
    await page.goto('/');
    await page.reload();

    const afterReload = await page.evaluate(() => {
      const lesson = JSON.parse(localStorage.getItem('math-detective-today-lesson') || 'null');
      const state = JSON.parse(localStorage.getItem('math-detective-state') || 'null');
      return { lesson, state };
    });
    if (afterReload.lesson) {
      expect(afterReload.lesson.rewardClaimed).toBe(true);
      expect(afterReload.lesson.rewardShown).toBe(true);
    }
    expect(afterReload.state?.stars ?? 0).toBe(stars);
    expect(afterReload.state?.exp ?? 0).toBe(exp);
    expect(afterReload.state?.streak ?? 0).toBe(streak);
  });
});
