import { defineConfig } from '@playwright/test';
import base from './playwright.no-server.config';

const evidence = process.env.DEPLOYMENT_EVIDENCE_NAME;
if (!evidence || !/^[a-z-]+$/.test(evidence)) throw new Error('Deployment evidence name required');
export default defineConfig({
  ...base, workers: 4, retries: 0,
  use: {
    ...base.use,
    storageState: process.env.CANDIDATE_STORAGE_STATE || undefined,
    trace: 'off', video: 'off', screenshot: 'off',
  },
  outputDir: `reports/2026-10-21-transfer-expansion/${evidence}-results`,
  reporter: [['list'], ['json', { outputFile: `reports/2026-10-21-transfer-expansion/${evidence}-results.json` }]],
});
