/**
 * Release blocker (v2.8.3)
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
  { name: 'lint', cmd: 'npm run lint' },
  { name: 'typecheck', cmd: 'npm run typecheck' },
  { name: 'validate:questions', cmd: 'npm run validate:questions' },
  { name: 'validate:themes', cmd: 'npm run validate:themes' },
  { name: 'validate:hints', cmd: 'npm run validate:hints' },
  { name: 'validate:child-ui', cmd: 'npm run validate:child-ui' },
  { name: 'test:state-machine', cmd: 'npm run test:state-machine' },
  { name: 'test:e2e', cmd: 'npm run test:e2e' },
  { name: 'build', cmd: 'npm run build' },
];

console.log('========================================');
console.log('  Math Detective validate:release v2.8.3');
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
