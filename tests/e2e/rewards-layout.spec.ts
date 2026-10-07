import { expect, test } from '@playwright/test';

for (const [width, height] of [[360, 800], [390, 844], [768, 1024], [1440, 900], [844, 390]]) {
  test(`rewards, medals and wardrobe fit ${width}x${height}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/rewards');
    await expect(page.getByRole('heading', { name: '奖励与侦探档案', exact: true })).toBeVisible();
    const tabs = page.getByRole('navigation', { name: '奖励中心分区' });
    for (const label of ['积分', '荣誉', '换装']) {
      await tabs.getByRole('button', { name: label, exact: true }).click();
      if (label === '积分') await expect(page.getByTestId('points-balance')).toContainText('0');
      if (label === '荣誉') await expect(page.getByRole('heading', { name: '成就勋章', exact: true })).toBeVisible();
      if (label === '换装') {
        await expect(page.getByRole('heading', { name: '换上你的侦探装备', exact: true })).toBeVisible();
        await page.getByRole('button', { name: '场景', exact: true }).click();
        await page.getByRole('button', { name: '试穿', exact: true }).last().click();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: info.outputPath(`rewards-${label}-${width}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
