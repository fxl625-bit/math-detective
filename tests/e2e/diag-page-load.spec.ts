import { test } from '@playwright/test';

test('diag: quick page load check', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text()}`); });
  page.on('pageerror', err => { errors.push(`PAGE: ${err.message}`); });
  page.on('response', resp => { if (resp.status() >= 400) errors.push(`RESP_${resp.status()}: ${resp.url()}`); });

  await page.goto('http://localhost:3104/play?e2e=1', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const hasApi = await page.evaluate(() => !!(window as any).MATH_DETECTIVE_TEST);
  console.log('HAS TEST API:', hasApi);
  console.log('ERRORS:', errors.length);
  errors.forEach(e => console.log(' ', e));
});
