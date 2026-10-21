import { expect, test } from '@playwright/test';
import { openIndependentFixture, readIndependentGame, readIndependentLesson, submitFixtureAnswer } from './helpers/independent-lesson';

test('a child can answer immediately, then review; one Enter records one independent attempt', async ({ page }) => {
  const question = await openIndependentFixture(page);
  await expect(page.getByText(question.answerSentence, { exact: true })).toHaveCount(0);
  await expect(page.getByText(question.explanation, { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('full-explanation')).toHaveCount(0);
  await submitFixtureAnswer(page, '6', true);
  await expect(page.getByTestId('question-review')).toBeVisible();
  const beforeReload = await readIndependentGame(page);
  const attempts = beforeReload.learningEvents!.filter(event => event.eventType === 'attempt_submitted');
  expect(attempts).toHaveLength(1);
  expect(attempts[0].result).toBe('correct');
  expect((await readIndependentLesson(page)).steps[0].solving?.masteryStatus).toBe('independent');
  await page.reload();
  await expect(page.getByTestId('question-review')).toBeVisible();
  expect((await readIndependentGame(page)).pointsWallet).toEqual(beforeReload.pointsWallet);
  expect((await readIndependentGame(page)).learningEvents).toEqual(beforeReload.learningEvents);
});

test('the enabled review control can be focused and activated with Enter', async ({ page }) => {
  await openIndependentFixture(page);
  await submitFixtureAnswer(page, '6', true);
  await expect(page.getByTestId('question-review')).toBeVisible();
  const continueButton = page.getByTestId('continue-feedback');
  await expect(continueButton).toBeEnabled();
  await continueButton.focus();
  await expect(continueButton).toBeFocused();
  await continueButton.press('Enter');
  await expect.poll(async () => (await readIndependentLesson(page)).currentStepIndex).toBe(1);
  expect((await readIndependentGame(page)).learningEvents?.filter(event => event.eventType === 'attempt_submitted')).toHaveLength(1);
});

test('an awarded legacy cache restores review without inventing new independent evidence', async ({ page }) => {
  await openIndependentFixture(page);
  const before = await readIndependentGame(page);
  await page.evaluate(() => {
    const api = window.MATH_DETECTIVE_TEST!;
    const lesson = api.getLesson() as import('../../lib/types').TodayLesson;
    api.setLesson({ ...lesson, steps: lesson.steps.map((step, index) => index ? step : {
      ...step, solving: undefined, phases: ['read', 'find_numbers', 'answer', 'explain'],
      currentPhaseIndex: 3, awardedAt: '2026-10-20T12:00:00Z',
    }) });
  });
  await page.reload();
  await expect(page.getByTestId('question-review')).toBeVisible();
  await expect(page.getByTestId('mastery-status')).toContainText('未知');
  await expect(page.getByTestId('submit-answer')).toHaveCount(0);
  await page.getByTestId('continue-feedback').click();
  await expect.poll(async () => (await readIndependentLesson(page)).currentStepIndex).toBe(1);
  const after = await readIndependentGame(page);
  expect(after.learningEvents).toEqual(before.learningEvents);
  expect(after.pointsWallet).toEqual(before.pointsWallet);
});
