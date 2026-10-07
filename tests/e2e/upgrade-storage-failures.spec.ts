import { expect, test } from '@playwright/test';
import { getQuestionById } from '../../data/questions';

test('failed answer save stays pending, retries the same action and survives refresh', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('button', { name: /读完了/ }).click();
  const before = await page.evaluate(() => ({
    state: JSON.parse(localStorage.getItem('math-detective-state') || '{}'),
    lesson: JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}'),
  }));
  const question = getQuestionById(before.lesson.steps[0].questionId)!;
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).__restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) {
      if (key === 'math-detective-state') throw new DOMException('Injected quota failure', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByTestId('lesson-answer-input').fill(String(question.answer));
  await page.getByTestId('submit-answer').click();
  await expect(page.getByTestId('pending-save-error')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').stars)).toBe(before.state.stars);
  await page.evaluate(() => (window as any).__restoreStorage());
  await page.getByTestId('pending-save-retry').click();
  await expect(page.getByTestId('pending-save-error')).not.toBeVisible();
  const feedbackClose = page.getByRole('button', { name: '关闭反馈', exact: true });
  if (await feedbackClose.isVisible()) await feedbackClose.click();
  await expect(page.getByRole('button', { name: /完成，进入下一关/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /完成，进入下一关/ })).toBeVisible();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}'));
  expect(after.learningEvents.filter((event: any) => event.eventType === 'attempt_submitted')).toHaveLength(1);
  expect(after.learningEvents.find((event: any) => event.eventType === 'attempt_submitted').result).toBe('correct');
});

test('corrupt saved data is retained and reported without a blank screen', async ({ page }) => {
  const corrupt = '{"stars":42, damaged';
  await page.addInitScript(raw => {
    if (!sessionStorage.getItem('corrupt-fixture-seeded')) {
      sessionStorage.setItem('corrupt-fixture-seeded', '1');
      localStorage.setItem('math-detective-state', raw);
    }
  }, corrupt);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: /损坏|读取|恢复/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('math-detective-state'))).toBe(corrupt);
  expect(errors).toEqual([]);
});

test('unavailable browser storage shows an actionable message instead of crashing', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = function () { throw new DOMException('Injected storage disabled', 'SecurityError'); };
    Storage.prototype.setItem = function () { throw new DOMException('Injected storage disabled', 'SecurityError'); };
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: /存储|保存/ })).toBeVisible();
  expect(errors).toEqual([]);
});
