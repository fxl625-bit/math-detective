/**
 * 标记题库不足的 Story 为 fallback_generic
 * 运行: node scripts/mark-fallback-stories.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const filepath = join(ROOT, 'data', 'stories.ts');
let content = readFileSync(filepath, 'utf-8');

// 题库不足 6 题的 Story，标记 fallbackToGeneric
const FALLBACK_STORIES = [
  'ocean_shell_treasure',
  'crab_sandcastle',
  'playground_ball_mystery',
  'toy_store_puzzle',
  'birthday_party_math',
  'science_lab_data',
  'sports_day_scoring',
  'observatory_data_cloud',
];

let fixCount = 0;
for (const id of FALLBACK_STORIES) {
  // 检查是否已有 fallbackToGeneric
  const pattern = new RegExp(`id:\\s*'${id}'[\\s\\S]*?forbiddenTags:\\s*\\[([^\\]]+)\\]`);
  const match = content.match(pattern);
  if (!match) {
    console.warn(`[SKIP] ${id} not found`);
    continue;
  }

  if (match[0].includes('fallbackToGeneric')) {
    console.log(`[SKIP] ${id} already has fallbackToGeneric`);
    continue;
  }

  // 在 forbiddenTags 后插入 fallbackToGeneric
  const insertPattern = new RegExp(
    `(id:\\s*'${id}'[\\s\\S]*?forbiddenTags:\\s*\\[[^\\]]+\\]),`
  );
  content = content.replace(insertPattern, `$1,\n    fallbackToGeneric: true,`);
  fixCount++;
  console.log(`[FIX] ${id}: fallbackToGeneric = true`);
}

writeFileSync(filepath, content, 'utf-8');
console.log(`\n✅ Done! Marked ${fixCount} stories as fallbackToGeneric.`);
