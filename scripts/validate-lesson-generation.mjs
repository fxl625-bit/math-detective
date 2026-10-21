/** Use the real imported question bank and active 36-unit planner. The retired
 * regex parser counted only 352 literals and simulated a theme route no longer
 * used by /play, so its result was unrelated to production lesson generation. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(process.execPath, [
  'node_modules/tsx/dist/cli.mjs', '-r', 'tsconfig-paths/register',
  'tests/integration/real-curriculum-generation.test.ts',
], { cwd: root, stdio: 'inherit', timeout: 120_000 });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
