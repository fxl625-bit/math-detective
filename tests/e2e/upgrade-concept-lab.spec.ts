import { expect, test } from '@playwright/test';

test('all nine concept tools remain interactive without answering or awarding', async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const initialStars = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').stars ?? 0);
  await page.getByTestId('start-lesson').click();
  await page.getByTestId('concept-lab-toggle').click();
  const lab = page.getByRole('region', { name: '概念小实验' });
  const chooser = lab.getByLabel('选择教具');

  await chooser.selectOption('line');
  await lab.getByLabel('起点').fill('7');
  await lab.getByLabel('走几格').fill('4');
  await expect(lab.getByText('从 7 向右走 4 格，到 11。')).toBeVisible();

  await chooser.selectOption('groups');
  await lab.getByLabel('每组个数').fill('5');
  await lab.getByLabel('组数').fill('2');
  await expect(lab.getByText(/2 组，每组 5 个，共 10 个/)).toBeVisible();

  await chooser.selectOption('fraction');
  await lab.getByLabel('平均分成').fill('4');
  await lab.getByLabel('取其中').fill('3');
  await lab.getByLabel('平均分成').fill('2');
  await expect(lab.getByLabel('取其中')).toHaveValue('2');
  await expect(lab.getByRole('img', { name: '分数条：2格，共2格' })).toBeVisible();

  await chooser.selectOption('chart');
  await lab.getByLabel('甲的数据').fill('20');
  await lab.getByLabel('乙的数据').fill('16');
  await expect(lab.getByText(/甲 20，乙 16；相差 4/)).toBeVisible();

  await chooser.selectOption('balance');
  await lab.getByLabel('左边').fill('6');
  await lab.getByLabel('右边').fill('4');
  await expect(lab.getByText(/较少的一边还需 2 个单位才平衡/)).toBeVisible();

  await chooser.selectOption('percent');
  await lab.getByLabel('百分数（%）').fill('0');
  await expect(lab.getByRole('img', { name: '百分格，100格中涂0格' })).toBeVisible();
  await lab.getByLabel('百分数（%）').fill('100');
  await expect(lab.getByRole('img', { name: '百分格，100格中涂100格' })).toBeVisible();

  await chooser.selectOption('area');
  await lab.getByLabel('长（单位格）').fill('5');
  await lab.getByLabel('宽（单位格）').fill('2');
  await expect(lab.getByRole('img', { name: '5列2行，面积10平方单位' })).toBeVisible();

  await chooser.selectOption('angle');
  await lab.getByLabel('角度（°）').fill('0');
  await expect(lab.getByText('0°：零度角；直角是 90°。')).toBeVisible();
  await lab.getByLabel('角度（°）').fill('120');
  await expect(lab.getByText('120°：钝角；直角是 90°。')).toBeVisible();

  await chooser.selectOption('circle');
  await lab.getByLabel('半径（厘米）').fill('5');
  await expect(lab.getByText(/直径是 10 厘米；取 π=3.14，周长约 31.40 厘米/)).toBeVisible();
  await page.screenshot({ path: info.outputPath('concept-lab-circle-360.png'), fullPage: true });

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}'));
  const supportEvents = (state.learningEvents || []).filter((event: { eventType: string }) => event.eventType === 'support_used');
  expect(new Set(supportEvents.map((event: { actionId: string }) => event.actionId)).size).toBe(9);
  expect(state.stars ?? 0).toBe(initialStars);
  expect((state.learningEvents || []).filter((event: { eventType: string }) => event.eventType === 'question_completed')).toHaveLength(0);
  expect(errors).toEqual([]);
});
