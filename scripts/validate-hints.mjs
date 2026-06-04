/**
 * 提示系统验证脚本 (v2.7.5)
 *
 * 扫描源码和题库，验证提示系统合规性。
 *
 * 运行: node scripts/validate-hints.mjs
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let errorCount = 0;
const errors = [];

function addError(category, file, line, message) {
  errorCount++;
  errors.push({ category, file, line, message });
  console.error(`  ❌ [${category}] ${file}:${line} — ${message}`);
}

// ========== 1. 扫描源码：非 HintSystem 文件不得硬编码"小提示" ==========

console.log('=== 扫描源码：提示渲染合规性 ===\n');

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

const sourceFiles = [
  ...scanDir(join(ROOT, 'app'), ['.tsx', '.ts']),
  ...scanDir(join(ROOT, 'components'), ['.tsx', '.ts']),
];

for (const file of sourceFiles) {
  const relPath = file.replace(ROOT + '/', '');
  if (relPath.includes('HintSystem.tsx')) continue; // HintSystem 本身可以有"小提示"
  if (relPath.includes('LogicRankingGuide.tsx')) continue; // 有自己的 HintPanel

  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 检查硬编码"小提示"标题（只检查 JSX 渲染，跳过注释）
    if (/['"]💡\s*小提示['"]/.test(line)) {
      // 跳过注释行
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('{/*')) continue;
      addError('HARDCODED_HINT', relPath, i + 1, '非 HintSystem 文件中出现"💡 小提示"硬编码');
    }
  }
}

// ========== 2. 扫描题库：light hint 泄题检查 ==========

console.log('\n=== 扫描题库：提示安全性 ===\n');

function parseQuestions(content, filename) {
  const questions = [];
  const blocks = content.split(/\{\s*id:\s*'/);
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const idMatch = block.match(/^([^']+)'/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const textMatch = block.match(/text:\s*'([^']+)'/);
    const text = textMatch ? textMatch[1] : '';
    // 匹配 answer 字段（必须是独立字段，不是 correctMeaning/answerSentence 等）
    const answerMatch = block.match(/(?<![a-zA-Z])answer:\s*'?([^',\n]+?)'?\s*[,}]/);
    const answer = answerMatch ? answerMatch[1].trim() : '';
    const gradeMatch = block.match(/gradeBand:\s*'([^']+)'/);
    const gradeBand = gradeMatch ? gradeMatch[1] : 'G1';
    const hintsMatch = block.match(/hints:\s*\[([^\]]+)\]/);
    const hints = hintsMatch
      ? hintsMatch[1].split(',').map(s => s.trim().replace(/^'|'$/g, ''))
      : [];
    questions.push({ id, text, answer, gradeBand, hints, file: filename });
  }
  return questions;
}

const questionFiles = [
  'g1.ts', 'g2.ts', 'g3.ts', 'g4.ts', 'g5.ts', 'g6.ts',
  'g1-thinking.ts', 'g2-olympiad.ts', 'g3-olympiad.ts',
  'g4-olympiad.ts', 'g5-olympiad.ts', 'olympiadIntro.ts',
];

let allQuestions = [];
for (const file of questionFiles) {
  try {
    const content = readFileSync(join(ROOT, 'data', 'questions', file), 'utf-8');
    allQuestions.push(...parseQuestions(content, file));
  } catch {}
}

// G1/G2 高阶术语检查
const ADVANCED_TERMS = ['方程', '等量关系', '设x', '未知数', '代数', '公式', '比例式', '函数', '方程两边', '关系式'];

for (const q of allQuestions) {
  const isLowGrade = q.gradeBand === 'G1' || q.gradeBand === 'G2';

  // 检查 light hint
  if (q.hints.length > 0) {
    const lightHint = q.hints[0];

    // 泄题检查：light hint 包含答案（使用词边界匹配，避免 180→80 误报）
    if (q.answer) {
      const ans = String(q.answer);
      // 只检查长度>=2的答案，避免单字符误报
      if (ans.length >= 2) {
        // 使用正则词边界匹配
        const escaped = ans.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?:^|[^0-9])${escaped}(?:$|[^0-9°%])`);
        if (re.test(lightHint)) {
          addError('HINT_LEAK', q.file, 0, `${q.id}: light hint 可能泄露答案 "${ans}"`);
        }
      }
    }

    // G1/G2 高阶术语检查
    if (isLowGrade) {
      for (const term of ADVANCED_TERMS) {
        if (lightHint.includes(term)) {
          addError('ADVANCED_TERM', q.file, 0, `${q.id} (${q.gradeBand}): light hint 含高阶术语"${term}"`);
        }
      }
    }
  }
}

// ========== 3. 统计 ==========

console.log('\n=== 汇总 ===');
console.log(`扫描源码文件: ${sourceFiles.length}`);
console.log(`扫描题库: ${allQuestions.length} 题`);
console.log(`错误: ${errorCount}`);

if (errorCount > 0) {
  console.log('\n❌ 提示系统验证未通过:');
  for (const e of errors) {
    console.log(`  [${e.category}] ${e.file}: ${e.message}`);
  }
  process.exit(1);
} else {
  console.log('\n✅ 提示系统验证通过。');
}
