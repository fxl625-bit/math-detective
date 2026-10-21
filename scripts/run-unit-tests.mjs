import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = fs.readdirSync(path.join(root, 'tests/unit')).filter(file => file.endsWith('.test.ts')).sort();
if (!files.length) throw new Error('No unit suites found');
const outputIndex = process.argv.indexOf('--output');
const output = outputIndex < 0 ? null : path.resolve(root, process.argv[outputIndex + 1] || '');
if (output && !output.toLowerCase().startsWith(`${root.toLowerCase()}${path.sep}`)) throw new Error('Unit evidence must remain in the project workspace');
if (output) fs.mkdirSync(output, { recursive: true });
const results = [];
for (const file of files) {
  const started = Date.now();
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/tsx/dist/cli.mjs'), '-r', 'tsconfig-paths/register', path.join(root, 'tests/unit', file)], {
    cwd: root, encoding: 'utf8', timeout: 180_000, maxBuffer: 16 * 1024 * 1024,
  });
  const passed = run.status === 0 && !run.error;
  const log = `${run.stdout || ''}${run.stderr || ''}${run.error ? `\n${run.error.message}` : ''}`;
  if (output) fs.writeFileSync(path.join(output, file.replace(/\.ts$/, '.log')), log, 'utf8');
  results.push({ suite: file, passed, exitCode: run.status, durationMs: Date.now() - started });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${file}`);
  if (!passed) console.error(log.slice(-12_000));
}
const summary = { suites: files.length, passed: results.filter(item => item.passed).length,
  failed: results.filter(item => !item.passed).length, results };
if (output) fs.writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(`Unit suites: ${summary.passed}/${summary.suites} passed; ${summary.failed} failed`);
if (summary.failed) process.exitCode = 1;
