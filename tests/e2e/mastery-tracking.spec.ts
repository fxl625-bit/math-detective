import { expect, test } from '@playwright/test';
import { openIndependentFixture, readIndependentGame, readIndependentLesson, submitFixtureAnswer } from './helpers/independent-lesson';

test('a retry can finish a question without rewriting its first wrong attempt as independent mastery', async ({ page }) => {
  await openIndependentFixture(page);
  await submitFixtureAnswer(page, '99');
  await expect(page.getByTestId('submit-answer')).toBeVisible();
  await submitFixtureAnswer(page, '6');
  await expect(page.getByTestId('question-review')).toBeVisible();
  const step = (await readIndependentLesson(page)).steps[0];
  expect(step.solving?.firstAttemptCorrect).toBe(false);
  expect(step.solving?.independentCorrect).toBe(false);
  expect(step.solving?.attemptCount).toBe(2);
  expect(step.solving?.outcome).toBe('retry_correct');
  expect(step.solving?.finalCorrect).toBe(true);
  const state = await readIndependentGame(page);
  expect(state.learningEvents?.filter(event => event.eventType === 'attempt_submitted').map(event => event.result)).toEqual(['incorrect', 'correct']);
  expect(state.mistakes.some(record => record.questionId === 'g1ll_02')).toBe(true);
  await page.goto('/parent-report');
  await expect(page.getByTestId('independent-mastery-rate')).toHaveText('0%');
  await expect(page.getByTestId('final-correct-rate')).toHaveText('100%');
  await expect(page.getByTestId('solving-outcomes')).toContainText('辅助完成 1');
  await expect(page.getByTestId('mastery-evidence-denominator')).toContainText('1 道已结束原题');
});
