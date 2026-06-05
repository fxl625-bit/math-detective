/**
 * Release blocker (v2.8.2)
 *
 * All gates must pass before deploy. Any failure exits 1.
 *
 * Usage: node scripts/validate-release.mjs
 */

import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STEPS = [
  { name: 'validate:questions', cmd: 'npx tsx -r tsconfig-paths/register scripts/validate-questions.ts' },
  { name: 'validate:themes', cmd: 'node scripts/validate-themes.mjs' },
  { name: 'validate:hints', cmd: 'node scripts/validate-hints.mjs' },
  { name: 'validate:child-ui', cmd: 'node scripts/validate-child-ui.mjs' },
  { name: 'validate:lesson-generation', cmd: 'node scripts/validate-lesson-generation.mjs' },
  { name: 'test:e2e:play', cmd: 'npx playwright test tests/e2e/play-no-home-redirect.spec.ts' },
  { name: 'test:e2e:repair', cmd: 'npx playwright test tests/e2e/repair-loop.spec.ts' },
  { name: 'test:e2e:reward', cmd: 'npx playwright test tests/e2e/reward-once.spec.ts' },
  { name: 'test:e2e:no-irrelevant', cmd: 'npx playwright test tests/e2e/no-irrelevant-number-step.spec.ts' },
  { name: 'test:e2e:pattern-loop', cmd: 'npx playwright test tests/e2e/pattern-step-loop.spec.ts' },
  { name: 'test:e2e:playthrough', cmd: 'npx playwright test tests/e2e/full-lesson-playthrough.spec.ts' },
  { name: 'build', cmd: 'npx next build --webpack && node scripts/postbuild-css.js' },
];

console.log('========================================');
console.log('  Math Detective validate:release v2.8.2');
console.log('========================================');
console.log('');

let passed = 0;
let failed = 0;
const results = [];

for (const step of STEPS) {
  process.stdout.write(`  ${step.name} ... `);
  try {
    execSync(step.cmd, { cwd: __dirname + '/..', stdio: 'pipe', timeout: 300000 });
    console.log('PASS');
    results.push({ name: step.name, status: 'PASS' });
    passed++;
  } catch (e) {
    console.log('FAIL');
    const errMsg = e.stderr?.toString() || e.message || '';
    results.push({ name: step.name, status: 'FAIL', error: errMsg.slice(0, 300) });
    failed++;
  }
}

console.log('');
console.log('========================================');
console.log('  Results');
console.log('========================================');
console.log(`  Passed: ${passed}/${STEPS.length}`);
console.log(`  Failed: ${failed}/${STEPS.length}`);

const canPublish = failed === 0 && passed === STEPS.length;

if (canPublish) {
  console.log('');
  console.log('  >>> CAN PUBLISH <<<');
} else {
  console.log('');
  console.log('  >>> CANNOT PUBLISH <<<');
  console.log('  Failed gates:');
  for (const r of results.filter(r => r.status === 'FAIL')) {
    console.log(`    - ${r.name}: ${r.error || 'unknown'}`);
  }
}

if (!canPublish) {
  process.exit(1);
}
