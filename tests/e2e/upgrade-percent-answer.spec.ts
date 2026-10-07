import { expect, test } from '@playwright/test';

for (const submitMode of ['click', 'enter'] as const) {
test(`g6_21 percent control serializes a bare value and submits by ${submitMode}`, async ({ page }) => {
  await page.goto('/play?e2e=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => Boolean((window as any).MATH_DETECTIVE_TEST), { timeout: 15000 });

  await page.evaluate(() => {
    const date = new Date();
    const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    (window as any).MATH_DETECTIVE_TEST.setLesson({
      date: today,
      currentStepIndex: 0,
      completed: false,
      steps: [{
        id: `${today}_percent_g6_21`, type: 'answer_only', title: '提高挑战 · 进阶',
        description: '', questionId: 'g6_21', phases: ['read', 'answer', 'explain'],
        currentPhaseIndex: 0, status: 'current', requiresAnswer: true,
      }],
    });
  });

  await page.getByTestId('read-question-next').click();
  await expect(page.getByTestId('lesson-question-prompt')).toContainText('达标率是多少');
  const input = page.getByTestId('lesson-answer-input');
  await expect(input).toHaveValue('');
  await expect(page.getByText('%', { exact: true })).toBeVisible();

  await input.fill('0.25');
  await page.getByTestId('submit-answer').click();
  await expect(page.getByTestId('submit-answer')).toBeVisible();
  await expect(input).toHaveValue('0.25');

  await input.fill('92');
  if (submitMode === 'click') await page.getByTestId('submit-answer').click();
  else await input.press('Enter');
  await expect(page.getByRole('button', { name: '完成，进入下一关' })).toBeVisible();
  const state = await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST.getState());
  expect(state.currentPhase).toBe('explain');
  const answerAttempts = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').answerAttempts);
  expect(answerAttempts).toBe(2);
});
}
