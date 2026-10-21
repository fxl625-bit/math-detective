import base from './playwright.no-server.config';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  ...base, workers: 4, retries: 0,
  outputDir: './reports/2026-10-21-transfer-expansion/final-local-results',
  reporter: [
    ['list'],
    ['json', { outputFile: './reports/2026-10-21-transfer-expansion/final-local-results.json' }],
    ['html', { outputFolder: './reports/2026-10-21-transfer-expansion/final-local-html', open: 'never' }],
  ],
});
