import { expect, test } from '@playwright/test';
import { openIndependentFixture, readIndependentGame, readIndependentLesson } from './helpers/independent-lesson';

test('viewing the full lesson ends the original attempt permanently, including after reload', async ({ page }) => {
  const question = await openIndependentFixture(page);
  await page.getByTestId('reveal-explanation').click();
  await expect(page.getByTestId('full-explanation')).toBeVisible();
  await expect(page.getByTestId('full-explanation')).toContainText(question.answerSentence);
  await expect(page.getByTestId('submit-answer')).toHaveCount(0);
  const evidence = (await readIndependentLesson(page)).steps[0].solving!;
  expect(evidence.fullExplanationViewedBeforeSolve).toBe(true);
  expect(evidence.masteryStatus).toBe('needs_reinforcement');
  expect(evidence.finalCorrect).toBe(false);
  expect((await readIndependentGame(page)).learningEvents?.filter(event => event.eventType === 'attempt_submitted')).toHaveLength(0);
  await page.reload();
  await expect(page.getByTestId('full-explanation')).toBeVisible();
  await expect(page.getByTestId('submit-answer')).toHaveCount(0);
  expect((await readIndependentLesson(page)).steps[0].solving?.finalCorrect).toBe(false);
});

test('a failed persistence write never exposes the full solution', async ({ page }) => {
  await openIndependentFixture(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key: string, value: string) {
      if (key === 'math-detective-state') throw new DOMException('Synthetic full storage', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByTestId('reveal-explanation').click();
  await expect(page.getByTestId('full-explanation')).toHaveCount(0);
  await expect(page.getByTestId('submit-answer')).toBeVisible();
  expect((await readIndependentLesson(page)).steps[0].solving?.fullExplanationViewedBeforeSolve).toBe(false);
  expect((await readIndependentGame(page)).learningEvents?.filter(event => event.eventType === 'explanation_viewed')).toHaveLength(0);
});

test('six explained questions can finish the lesson without fabricated correct answers or points', async ({ page }) => {
  await openIndependentFixture(page);
  for (let index = 0; index < 6; index += 1) {
    await page.getByTestId('reveal-explanation').click();
    await expect(page.getByTestId('full-explanation')).toBeVisible();
    await page.getByTestId('start-transfer').click();
    const step = (await readIndependentLesson(page)).steps[index];
    if (step.transfer?.status === 'pending' || step.transfer?.status === 'answering') {
      await page.getByTestId('defer-transfer').click();
    }
    await page.getByTestId('continue-feedback').click();
    await expect.poll(async () => {
      const lesson = await readIndependentLesson(page);
      return lesson.completed ? 6 : lesson.currentStepIndex;
    }).toBe(index + 1);
    const close = page.getByRole('button', { name: '关闭反馈', exact: true });
    if (await close.isVisible()) await close.click();
  }
  await expect(page.getByRole('heading', { name: '今日任务完成', exact: true })).toBeVisible();
  const state = await readIndependentGame(page);
  expect(state.learningEvents?.filter(event => event.eventType === 'attempt_submitted')).toHaveLength(0);
  expect(state.learningEvents?.filter(event => event.eventType === 'question_completed')).toHaveLength(0);
  expect(state.learningEvents?.filter(event => event.eventType === 'explanation_viewed')).toHaveLength(6);
  expect(state.pointsWallet?.ledger.filter(entry => entry.type === 'perfect_lesson')).toHaveLength(0);
  expect(state.needsReinforcementQueue).toHaveLength(6);
});
