import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) throw new Error('Rewards verification requires an explicit PLAYWRIGHT_BASE_URL');
const tag = (process.env.PLAYWRIGHT_ARTIFACT_TAG || 'verification').replace(/[^a-zA-Z0-9_-]/g, '_');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 90000,
  outputDir: `./reports/2026-09-29-rewards/browser-${tag}`,
  reporter: [
    ['list'],
    ['json', { outputFile: `./reports/2026-09-29-rewards/browser-${tag}.json` }],
  ],
  use: { baseURL, actionTimeout: 10000, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
