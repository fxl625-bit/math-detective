import { expect, test } from '@playwright/test';
import { openIndependentFixture, readIndependentGame, submitFixtureAnswer } from './helpers/independent-lesson';

test('viewing a mistake solution locks correction and reward until the next day, including after reload', async ({ page }) => {
  await openIndependentFixture(page);
  await submitFixtureAnswer(page, '999');
  await page.goto('/mistakes');
  await page.getByRole('button', { name: /待订正/ }).click();
  await expect(page.getByRole('button', { name: '提交订正', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '查看原答案与解析', exact: true }).click();
  await expect(page.getByRole('button', { name: '明天可重新订正', exact: true })).toBeDisabled();
  await expect(page.getByTestId('lesson-answer-input')).toBeDisabled();
  const viewed = await readIndependentGame(page);
  expect(Object.keys(viewed.reviewExplanationViews || {})).toHaveLength(1);
  expect(viewed.mistakes[0].retriedCorrect).toBe(false);
  expect(viewed.pointsWallet?.ledger.filter(entry => entry.type === 'mistake_review')).toHaveLength(0);
  await page.reload();
  await page.getByRole('button', { name: /待订正/ }).click();
  await expect(page.getByRole('button', { name: '明天可重新订正', exact: true })).toBeDisabled();
  const restored = await readIndependentGame(page);
  expect(restored.reviewExplanationViews).toEqual(viewed.reviewExplanationViews);
  expect(restored.answerAttempts).toBe(viewed.answerAttempts);
  expect(restored.pointsWallet).toEqual(viewed.pointsWallet);
});
