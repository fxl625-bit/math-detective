import { expect, test } from '@playwright/test';

const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!configuredBaseURL) throw new Error('Source verification requires PLAYWRIGHT_BASE_URL');
const expectedOrigin = new URL(configuredBaseURL).origin;

test('uses the configured production origin and version', async ({ page }, info) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).origin).toBe(expectedOrigin);
  await expect(page.getByTestId('start-lesson')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('math-detective-app-version'))).toBe('2.13.3');
  const identity = await page.evaluate(() => ({
    origin: location.origin,
    version: localStorage.getItem('math-detective-app-version'),
    scripts: [...document.scripts].map(script => script.src).filter(Boolean),
  }));
  await info.attach('production-identity', { body: JSON.stringify(identity, null, 2), contentType: 'application/json' });
});
