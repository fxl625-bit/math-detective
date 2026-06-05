/**
 * 孩子端 UI 验证脚本 (v2.8.0)
 *
 * 扫描 app/play 和 components/lesson，
 * 确保孩子端不出现工程异常文案。
 *
 * 运行: node scripts/validate-child-ui.mjs
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 孩子端禁止出现的文案
const FORBIDDEN_TEXTS = [
  '关卡数据异常',
  '正在自动修复',
  '系统已自动处理',
  '该题目缺少多余信息',
  '不适合当前关卡',
  '今天的任务已整理好',
  'repair failed',
  'invalid step',
  '数据不兼容',
  '系统已记录',
  '正在自动修复',
];

// 扫描目录
function scanDir(dir, extensions) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...scanDir(fullPath, extensions));
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

console.log('=== 孩子端 UI 验证 (v2.8.0) ===\n');

const dirs = [
  join(ROOT, 'app', 'play'),
  join(ROOT, 'components', 'lesson'),
];

const files = dirs.flatMap(d => scanDir(d, ['.tsx', '.ts']));

let errorCount = 0;
const errors = [];

for (const file of files) {
  const relPath = file.replace(ROOT + '/', '').replace(/\\/g, '/');
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 跳过注释
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('{/*')) continue;

    for (const text of FORBIDDEN_TEXTS) {
      if (line.includes(text)) {
        errorCount++;
        errors.push({ file: relPath, line: i + 1, text });
        console.error(`  ❌ ${relPath}:${i + 1} — 禁止文案: "${text}"`);
      }
    }
  }
}

console.log(`\n扫描文件: ${files.length}`);
console.log(`错误: ${errorCount}`);

if (errorCount > 0) {
  console.log('\n❌ 孩子端 UI 验证未通过:');
  for (const e of errors) {
    console.log(`  ${e.file}:${e.line} — "${e.text}"`);
  }
  process.exit(1);
} else {
  console.log('\n✅ 孩子端 UI 验证通过。');
}
