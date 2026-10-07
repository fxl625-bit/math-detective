import { defineConfig } from '@playwright/test';
import base from './playwright.rewards.config';

export default defineConfig({
  ...base,
  outputDir: './reports/2026-10-07-parent-password/browser',
  reporter: [['list'], ['json', { outputFile: './reports/2026-10-07-parent-password/browser.json' }]],
});
