/**
 * 发布闸门脚本 (v2.8.0)
 *
 * 依次运行所有验证，任何一项失败则 exit 1。
 *
 * 运行: node scripts/validate-release.mjs
 */

import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STEPS = [
  { name: 'validate:questions', cmd: 'node scripts/validate-themes.mjs' },
  { name: 'validate:themes', cmd: 'node scripts/validate-themes.mjs' },
  { name: 'validate:hints', cmd: 'node scripts/validate-hints.mjs' },
  { name: 'validate:child-ui', cmd: 'node scripts/validate-child-ui.mjs' },
  { name: 'build', cmd: 'npx next build' },
];

console.log('=== 发布闸门 validate:release (v2.8.0) ===\n');

let passed = 0;
let failed = 0;
const results = [];

for (const step of STEPS) {
  process.stdout.write(`  ${step.name} ... `);
  try {
    execSync(step.cmd, { cwd: __dirname + '/..', stdio: 'pipe', timeout: 180000 });
    console.log('✅ PASS');
    results.push({ name: step.name, status: 'PASS' });
    passed++;
  } catch (e) {
    console.log('❌ FAIL');
    results.push({ name: step.name, status: 'FAIL', error: e.stderr?.toString().slice(0, 200) });
    failed++;
  }
}

console.log(`\n=== 汇总 ===`);
console.log(`通过: ${passed}/${STEPS.length}`);
console.log(`失败: ${failed}/${STEPS.length}`);

if (failed > 0) {
  console.log('\n❌ 发布闸门未通过，不允许部署:');
  for (const r of results.filter(r => r.status === 'FAIL')) {
    console.log(`  ❌ ${r.name}`);
  }
  process.exit(1);
} else {
  console.log('\n✅ 发布闸门全部通过，可以部署。');
}
