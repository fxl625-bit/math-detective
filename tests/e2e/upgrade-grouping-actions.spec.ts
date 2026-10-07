import { expect, test } from '@playwright/test';

for (const width of [390, 768]) {
  test(`grouping lesson helper is reversible and conserves items at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const initialStars = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').stars ?? 0);
    await page.getByTestId('start-lesson').click();
    await page.getByTestId('concept-lab-toggle').click();
    const lab = page.getByRole('region', { name: '概念小实验' });
    const chooser = lab.getByLabel('选择教具');
    await chooser.selectOption('groups');
    const conservation = lab.getByTestId('grouping-conservation');
    const shareAction = lab.getByRole('button', { name: '每组轮流放1个', exact: true });

    await expect(lab.getByText(/3 组，每组 4 个，共 12 个/)).toBeVisible();
    await expect(conservation).toHaveText('总数 12 = 已分配 0 + 未分配 12');
    await shareAction.focus();
    await page.keyboard.press('Enter');
    await expect(conservation).toHaveText('总数 12 = 已分配 1 + 未分配 11');
    await shareAction.focus();
    await page.keyboard.press('Space');
    await expect(conservation).toHaveText('总数 12 = 已分配 2 + 未分配 10');
    await expect(lab.getByRole('group', { name: '第1组：1个' })).toBeVisible();
    await expect(lab.getByRole('group', { name: '第2组：1个' })).toBeVisible();
    for (let step = 0; step < 10; step += 1) await shareAction.click();
    await expect(conservation).toHaveText('总数 12 = 已分配 12 + 未分配 0');
    await expect(lab.getByText('每组数量相同，已经分完。')).toBeVisible();
    await expect(shareAction).toBeDisabled();
    await lab.getByRole('button', { name: '撤销最近一步' }).click();
    await expect(conservation).toHaveText('总数 12 = 已分配 11 + 未分配 1');
    await shareAction.click();
    await expect(conservation).toHaveText('总数 12 = 已分配 12 + 未分配 0');
    await lab.getByRole('button', { name: '重新分配' }).click();
    await expect(conservation).toHaveText('总数 12 = 已分配 0 + 未分配 12');

    await lab.getByLabel('每组个数').fill('5');
    await expect(lab.getByText('参数已调整，分配操作已重置，请从头开始。')).toBeVisible();
    await expect(conservation).toHaveText('总数 15 = 已分配 0 + 未分配 15');
    await lab.getByLabel('组数').fill('2');
    await expect(conservation).toHaveText('总数 10 = 已分配 0 + 未分配 10');
    await lab.getByRole('button', { name: '按每组个数分组' }).click();
    await expect(lab.getByText('分配方式已切换，分配操作已重置，请从头开始。')).toBeVisible();
    const groupAction = lab.getByRole('button', { name: '取5个成一组' });
    await expect(conservation).toHaveText('总数 10 = 已分配 0 + 未分配 10');
    await groupAction.click();
    await expect(conservation).toHaveText('总数 10 = 已分配 5 + 未分配 5');
    await groupAction.focus();
    await page.keyboard.press('Space');
    await expect(conservation).toHaveText('总数 10 = 已分配 10 + 未分配 0');
    await expect(groupAction).toBeDisabled();
    await lab.getByRole('button', { name: '撤销最近一步' }).click();
    await expect(conservation).toHaveText('总数 10 = 已分配 5 + 未分配 5');
    await groupAction.click();
    await expect(conservation).toHaveText('总数 10 = 已分配 10 + 未分配 0');
    await lab.getByRole('button', { name: '重新分配' }).click();
    await expect(conservation).toHaveText('总数 10 = 已分配 0 + 未分配 10');

    await groupAction.click();
    await expect(conservation).toHaveText('总数 10 = 已分配 5 + 未分配 5');
    await lab.getByRole('button', { name: '复位示例' }).click();
    await expect(conservation).toHaveText('总数 12 = 已分配 0 + 未分配 12');
    await expect(lab.getByText(/3 组，每组 4 个，共 12 个/)).toBeVisible();
    await expect(lab.getByRole('button', { name: '平均分：每组轮流放1个' })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: testInfo.outputPath('grouping-actions.png'), fullPage: true });

    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}'));
    expect(state.stars ?? 0).toBe(initialStars);
    expect(state.attemptRecords ?? []).toHaveLength(0);
    expect((state.learningEvents || []).filter((event: { eventType: string }) => event.eventType === 'attempt_submitted' || event.eventType === 'question_completed')).toHaveLength(0);
  });
}
