import { expect, test } from '@playwright/test';
import { getQuestionById } from '../../data/questions';
import { getTestState, openPlayE2E, seedG1State } from './helpers';

for (const cachedPhaseIndex of [0, 1, 2]) {
  test(`direct questions hide answer choices and resume cached phase ${cachedPhaseIndex}`, async ({ page }) => {
    await seedG1State(page);
    await openPlayE2E(page);
    const question = getQuestionById('prog_g1_u1_01')!;
    await page.evaluate(({ questionId, index }) => {
      const api = window.MATH_DETECTIVE_TEST!;
      api.setLesson({
        ...(api.getLesson() as Record<string, unknown>),
        currentStepIndex: 0, completed: false, rewardClaimed: false, rewardShown: false,
        steps: [{
          id: 'cached-direct-regression', questionId, type: 'full_solve',
          title: '思考挑战', description: '', status: 'current', requiresAnswer: true,
          phases: ['read', 'choose_operation', 'answer', 'explain'], currentPhaseIndex: index,
        }],
      });
    }, { questionId: question.id, index: cachedPhaseIndex });
    await expect.poll(async () => (await getTestState(page)).questionId).toBe(question.id);
    await expect(page.locator('main')).not.toContainText(question.answerSentence);
    await expect(page.getByText('题目在问什么', { exact: true })).toHaveCount(0);
    expect((await getTestState(page)).currentStepIndex).toBe(0);
    expect((await getTestState(page)).currentPhase).toBe('answer');
    const answerInput = page.locator('form input[name="answer"]');
    await expect(answerInput).toBeVisible();
    await expect(page.locator('main')).not.toContainText(question.answerSentence);
    expect((await getTestState(page)).currentPhase).toBe('answer');
    await answerInput.fill('3');
    await page.getByRole('button', { name: '提交答案', exact: true }).click();
    await expect.poll(async () => (await getTestState(page)).currentPhase).toBe('explain');
    await expect(page.locator('main')).toContainText(question.answerSentence);
  });
}
