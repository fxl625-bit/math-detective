import { expect, test } from '@playwright/test';
import { authorizeParentAccess, expectParentAccessLocked } from './helpers/parent-access';

for (const [width, height] of [[360, 800], [390, 844], [768, 1024], [1024, 768], [1440, 900], [844, 390]]) {
  test(`home, settings and learning fit ${width}x${height}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByTestId('start-lesson')).toBeVisible();
    if (width <= 390 && height >= 800) {
      const action = await page.getByTestId('start-lesson').boundingBox();
      expect(action).not.toBeNull();
      expect(action!.y + action!.height).toBeLessThan(height - 72);
    }
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(await overflow()).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`home-${width}.png`), fullPage: true });
    await page.getByTestId('learning-settings-toggle').click();
    await expect(page.getByTestId('grade-select')).toHaveCount(0);
    await expectParentAccessLocked(page);
    await authorizeParentAccess(page);
    await expect(page.getByTestId('grade-select')).toBeVisible();
    await page.getByTestId('grade-select').selectOption('G6');
    await page.getByTestId('unit-select').selectOption('g6-u3');
    expect(await overflow()).toBeLessThanOrEqual(1);
    await page.getByTestId('save-learning-settings').click();
    await expect(page.getByRole('status').filter({ hasText: '设置已保存' })).toBeVisible();
    await page.getByTestId('start-lesson').click();
    await expect(page.getByTestId('submit-answer')).toBeVisible();
    await expect(page.getByTestId('submit-answer')).toBeVisible();
    expect(await page.getByRole('navigation').count()).toBe(0);
    expect(await overflow()).toBeLessThanOrEqual(1);
    await page.getByTestId('submit-answer').scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`play-${width}.png`), fullPage: true });
    await page.locator('body').evaluate(element => { element.style.zoom = '2'; });
    await page.getByTestId('submit-answer').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('submit-answer')).toBeInViewport();
    expect(await overflow()).toBeLessThanOrEqual(1);
    await page.goto('/parent-report');
    await expect(page.getByRole('heading', { name: /家长报告/, level: 1 })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(1);
    if (width === 360 || width === 768) await page.screenshot({ path: info.outputPath(`parent-report-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}
