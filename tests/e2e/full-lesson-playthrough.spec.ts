import { expect, test } from '@playwright/test';
import { getTestState, openPlayE2E, playThroughLesson, seedG1State } from './helpers';

test.describe('full lesson playthrough', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error' && text.includes('[P0]')) {
        throw new Error(`P0 console error: ${text}`);
      }
    });
    await seedG1State(page);
  });

  test('completes a real 6-step lesson from /play', async ({ page }) => {
    await openPlayE2E(page);
    const initial = await getTestState(page);
    expect(initial.lesson?.steps?.length ?? 0).toBeGreaterThanOrEqual(6);

    const completed = await playThroughLesson(page, 6);
    expect(completed.completed).toBe(true);
    expect(completed.rewardClaimed).toBe(true);
    expect(completed.rewardShown).toBe(true);
  });

  test('does not redirect away from /play while idle', async ({ page }) => {
    await openPlayE2E(page);
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(750);
      expect(page.url()).toContain('/play');
    }
  });
});
