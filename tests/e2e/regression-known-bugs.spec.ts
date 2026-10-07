import { expect, test, type Page } from '@playwright/test';
import { assertNoForbiddenChildText, getTestState, openPlayE2E, seedG1State } from './helpers';

async function seedSingleStep(page: Page, questionId: string, type: string) {
  await openPlayE2E(page);
  await page.evaluate(({ questionId, type }: { questionId: string; type: string }) => {
    const today = new Date().toISOString().split('T')[0];
    window.MATH_DETECTIVE_TEST!.setLesson({
      ...(window.MATH_DETECTIVE_TEST!.getLesson() as Record<string, unknown>),
      date: today,
      currentStepIndex: 0,
      completed: false,
      rewardClaimed: false,
      rewardShown: false,
      steps: [{
        id: `seed_${questionId}`,
        type,
        title: 'seeded regression step',
        description: 'seeded regression step',
        questionId,
        phases: ['read', 'answer', 'explain'],
        currentPhaseIndex: 0,
        status: 'current',
        requiresAnswer: true,
      }],
    });
  }, { questionId, type });
  await expect.poll(async () => (await getTestState(page)).questionId).toBe(questionId);
}

test.describe('known P0 regressions', () => {
  test.beforeEach(async ({ page }) => {
    await seedG1State(page);
  });

  test('pattern question does not enter action words and answer 10 passes once', async ({ page }) => {
    await seedSingleStep(page, 'g1t_03', 'full_solve');
    const state = await getTestState(page);
    expect(state.questionId).toBe('g1t_03');
    expect(state.stepType).not.toBe('find_action_words');
    expect(page.url()).toContain('/play');
    await assertNoForbiddenChildText(page);
  });

  test('apple exchange question does not enter action words or repair', async ({ page }) => {
    await seedSingleStep(page, 'g1t_08', 'full_solve');
    const state = await getTestState(page);
    expect(state.questionId).toBe('g1t_08');
    expect(state.stepType).not.toBe('find_action_words');
    await assertNoForbiddenChildText(page);
  });

  test('noise question does not ask useful numbers as extra numbers', async ({ page }) => {
    await seedSingleStep(page, 'g1_extra_01', 'remove_noise');
    const status = await page.evaluate(() => window.MATH_DETECTIVE_TEST!.getValidationStatus());
    expect(status.compatibilityError).toBeNull();
    await assertNoForbiddenChildText(page);
  });
});
