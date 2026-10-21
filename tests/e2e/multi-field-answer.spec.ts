import { expect, test, type Page } from '@playwright/test';

async function setQuestion(page: Page, questionId: string) {
  await page.goto('/play?e2e=1');
  await page.waitForFunction(() => Boolean((window as any).MATH_DETECTIVE_TEST), { timeout: 15000 });

  await page.evaluate(({ questionId }) => {
    const date = new Date();
    const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const lesson = {
      date: today,
      currentStepIndex: 0,
      completed: false,
      steps: [{
        id: `${today}_s02_${questionId}`,
        type: 'answer_only',
        title: '答案输入回归',
        description: '',
        questionId,
        phases: ['read', 'answer', 'explain'],
        currentPhaseIndex: 0,
        status: 'current',
        requiresAnswer: true,
      }],
    };
    (window as any).MATH_DETECTIVE_TEST.setLesson(lesson);
  }, { questionId });

  await page.waitForFunction(
    (expectedId) => (window as any).MATH_DETECTIVE_TEST?.getState().questionId === expectedId,
    questionId,
    { timeout: 10000 },
  );
  // Normalized legacy fixtures now enter the answer phase directly.
  expect((await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST.getState())).currentPhase).toBe('answer');
  await expect(page.getByTestId('submit-answer')).toBeVisible();
  await expect(page.getByTestId('lesson-question-prompt')).toBeVisible();
}

async function readAnswerAttempts(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').answerAttempts || 0);
}

test('retains both structured fields through rerender and wrong-answer retry', async ({ page }) => {
  test.setTimeout(90000);
  await setQuestion(page, 'g2o_01');

  const inputs = page.locator('input[type="text"]');
  await expect(inputs).toHaveCount(2);
  await expect(page.locator('body')).toContainText('小明和小红一共有12颗糖果');

  await inputs.nth(0).fill('99');
  await inputs.nth(1).fill('5');
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.locator('body')).toContainText(/还不对|换个方法/);
  await expect(inputs.nth(0)).toHaveValue('99');
  await expect(inputs.nth(1)).toHaveValue('5');
  const attemptsAfterWrong = await readAnswerAttempts(page);

  await inputs.nth(0).fill('7');
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByRole('button', { name: /完成，进入下一关/ })).toBeVisible();
  await expect.poll(() => readAnswerAttempts(page)).toBe(attemptsAfterWrong + 1);
  const correctState = await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST.getState());
  expect(correctState.questionId).toBe('g2o_01');
  expect(correctState.currentPhase).toBe('explain');
  expect(correctState.completed).toBe(false);

  await page.getByRole('button', { name: '完成，进入下一关' }).click();
  await expect.poll(async () => (await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST.getState())).completed).toBe(true);
  expect(await readAnswerAttempts(page)).toBe(attemptsAfterWrong + 1);
});

test('keeps a regular integer answer input as a single value', async ({ page }) => {
  test.setTimeout(60000);
  await setQuestion(page, 'g1_01');
  const inputs = page.locator('input[type="text"]');
  await expect(inputs).toHaveCount(1);
  await inputs.first().fill('9');
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByRole('button', { name: /完成，进入下一关/ })).toBeVisible();
});

test('keeps yuan and jiao money input working', async ({ page }) => {
  test.setTimeout(60000);
  // This is an actual currency-value answer. g2_08 asks for a numeric count
  // of yuan and intentionally uses the plain integer schema.
  await setQuestion(page, 'g1ll_50');
  const inputs = page.locator('input[type="text"]');
  await expect(inputs).toHaveCount(2);
  await inputs.nth(0).fill('1');
  await inputs.nth(1).fill('5');
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByRole('button', { name: /完成，进入下一关/ })).toBeVisible();
});

test('serializes the real multi-field profit rate as a percentage', async ({ page }) => {
  test.setTimeout(60000);
  await setQuestion(page, 'g5o_16');

  const profit = page.getByTestId('lesson-answer-input-profit');
  const rate = page.getByTestId('lesson-answer-input-rate');
  await expect(profit).toBeVisible();
  await expect(rate).toBeVisible();
  await expect(page.locator('label[for="answer-rate"]')).toContainText('利润率');
  await expect(rate.locator('xpath=..')).toContainText('%');

  await profit.fill('18');
  await rate.fill('12');
  await expect(rate).toHaveValue('12');
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByRole('button', { name: /完成，进入下一关/ })).toBeVisible();
});
