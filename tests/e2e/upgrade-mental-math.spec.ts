import { expect, test } from '@playwright/test';

for (const [grade, label, operation] of [
  ['G1', '一年级', '加法'], ['G2', '二年级', '乘法'], ['G3', '三年级', '乘法'],
  ['G4', '四年级', '加法'], ['G5', '五年级', '加法'],
]) {
  test(`${grade} oral practice supports retry, two variants and a clear exit`, async ({ page }) => {
    await page.goto('/mental-math');
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByRole('button', { name: new RegExp(operation), exact: true }).click();
    await page.getByRole('button', { name: '开始练习', exact: true }).click();
    const answer = page.getByRole('textbox', { name: '我的答案' });
    for (let index = 0; index < 2; index++) {
      const prompt = (await page.getByRole('heading', { level: 2 }).textContent())!;
      const numbers = prompt.match(/\d+(?:\.\d+)?/g)!.map(Number);
      const expected = operation === '乘法' ? numbers.reduce((a, b) => a * b, 1) : numbers.reduce((a, b) => a + b, 0);
      if (index === 0) {
        await answer.fill('999999');
        await answer.press('Enter');
        await page.getByRole('button', { name: '再试一次', exact: true }).click();
      }
      await answer.fill(String(Number(expected.toFixed(8))));
      await answer.press('Enter');
      await expect(page.getByText('答对了。', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: '继续下一题', exact: true }).click();
    }
    await page.getByRole('button', { name: '退出本次练习（未完成不保存）', exact: true }).click();
    await expect(page.getByRole('button', { name: '开始练习', exact: true })).toBeVisible();
    expect(await page.evaluate(() => (JSON.parse(localStorage.getItem('math-detective-state') || '{}').mentalMathRecords || []).length)).toBe(0);
  });
}

test('sixth-grade fractions accept keyboard input, preserve wrong first attempts and save once', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/mental-math');
  await page.getByRole('button', { name: '六年级', exact: true }).click();
  await page.getByRole('button', { name: /除法/, exact: true }).click();
  await page.getByRole('button', { name: '开始练习', exact: true }).click();
  const answer = page.getByRole('textbox', { name: '我的答案' });
  await expect(answer).toHaveAttribute('inputmode', 'text');
  for (let index = 0; index < 10; index++) {
    const prompt = await page.getByRole('heading', { level: 2 }).textContent();
    const match = prompt?.match(/(\d+)\/(\d+)\s*÷\s*(\d+)/);
    expect(match, `fraction division question: ${prompt}`).not.toBeNull();
    if (index === 0) {
      await answer.fill('0');
      await answer.press('Enter');
      await expect(page.getByText('首答未正确', { exact: false })).toBeVisible();
      // Feedback must stay until a real child action; time alone must not advance.
      await page.waitForTimeout(1100);
      await expect(page.getByRole('button', { name: '再试一次', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '再试一次', exact: true }).click();
    }
    await answer.fill(`${match![1]}/${Number(match![2]) * Number(match![3])}`);
    await answer.press('Enter');
    await expect(page.getByText('答对了。', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: index === 9 ? '查看结果' : '继续下一题', exact: true }).click();
  }
  await expect(page.getByText('首答正确 9/10 题；重试后完成 10/10 题。', { exact: true })).toBeVisible();
  const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').mentalMathRecords);
  expect(sessions).toHaveLength(1);
  expect(sessions[0].answers[0]).toMatchObject({ correct: false, finalCorrect: true, attempts: 2, helpUsed: true });
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').mentalMathRecords.length)).toBe(1);
  const mistakes = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').mistakes);
  expect(mistakes).toHaveLength(1);
  expect(mistakes[0].questionText).toContain('÷');
  await page.goto('/mistakes');
  await expect(page.getByText(mistakes[0].questionText, { exact: true }).first()).toBeVisible();
});
