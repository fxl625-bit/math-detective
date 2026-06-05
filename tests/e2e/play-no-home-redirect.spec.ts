import { expect, test } from '@playwright/test';
import { assertNoForbiddenChildText, openPlayE2E, seedG1State } from './helpers';

test.describe('/play no home redirect', () => {
  test.beforeEach(async ({ page }) => {
    await seedG1State(page);
  });

  test('opens and remains on /play', async ({ page }) => {
    await openPlayE2E(page);
    await page.waitForTimeout(1500);
    expect(page.url()).toContain('/play');
    expect(page.url()).not.toBe('http://localhost:3000/');
    await assertNoForbiddenChildText(page);
  });

  test('bad legacy lesson is rebuilt without redirecting home', async ({ page }) => {
    await page.addInitScript(() => {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('math-detective-today-lesson', JSON.stringify({
        date: today,
        currentStepIndex: 0,
        completed: false,
        rewardClaimed: false,
        rewardShown: false,
        steps: [{
          id: 'legacy_bad_step',
          type: 'find_action_words',
          title: 'legacy bad step',
          description: 'legacy bad step',
          questionId: 'g1t_03',
          phases: ['read', 'find_keywords', 'choose_operation', 'answer'],
          currentPhaseIndex: 0,
          status: 'current',
          requiresAnswer: true,
        }],
      }));
    });

    await openPlayE2E(page);
    expect(page.url()).toContain('/play');
    await assertNoForbiddenChildText(page);
  });
});
