/**
 * 综合修复：移除逻辑推理题的 find_numbers 兼容 + 特定数据修复
 * 
 * 修复项目：
 * 1. 所有 logic_reasoning 题移除 stepCompatibility 中的 'find_numbers'
 * 2. g4o_07: correctMeaning 修复
 * 3. g3o_25: 补充题干中的数字
 * 
 * 用法: node scripts/fix-all-logic-stepcompat.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_DIR = path.resolve(__dirname, '..', 'data', 'questions');

// 文件 → 是否需要处理
const ALL_FILES = [
  'g1.ts', 'g1-thinking.ts', 'g2.ts', 'g2-olympiad.ts',
  'g3.ts', 'g3-multiplication.ts', 'g3-olympiad.ts',
  'g4.ts', 'g4-olympiad.ts',
  'g5.ts', 'g5-olympiad.ts',
  'g6.ts',
  'extra-info.ts', 'missing-info.ts', 'olympiadIntro.ts',
];

function fixStepCompatibility(source) {
  // 移除多行格式：stepCompatibility: ['find_numbers', ...
  let modified = false;
  
  // 模式1: 多行格式，find_numbers 在数组第一个位置
  //   stepCompatibility: ['find_numbers', 'full_solve'],
  //   stepCompatibility: ['find_numbers'],
  source = source.replace(
    /(stepCompatibility:\s*\[)('find_numbers',\s*)/g,
    (match, prefix) => {
      modified = true;
      return prefix;
    }
  );
  
  // 模式2: 多行格式，find_numbers 在数组中间或末尾（紧凑格式）
  //   stepCompatibility:['find_numbers','full_solve'],
  source = source.replace(
    /(stepCompatibility:\s*\[)'find_numbers',\s*/g,
    (match, prefix) => {
      modified = true;
      return prefix;
    }
  );
  
  return { source, modified };
}

// 特定题目修复
function fixSpecificIssues(source) {
  // g4o_07: correctMeaning
  source = source.replace(
    /correctMeaning:'甲55乙27\.5丙37\.5\.\.\.这不对'/g,
    "correctMeaning:'甲55乙27.5丙37.5'"
  );
  
  // g3o_25: 补充题干中的"一周有7天"
  source = source.replace(
    /text: '2026年6月1日周一。这年的6月28日是周几\?6月有几个周一\?'/g,
    "text: '一周有7天。2026年6月1日周一。这年的6月28日是周几？6月有几个周一？'"
  );
  
  return source;
}

let totalFilesFixed = 0;
let totalReplacements = 0;

for (const fileName of ALL_FILES) {
  const filePath = path.join(QUESTIONS_DIR, fileName);
  if (!fs.existsSync(filePath)) continue;
  
  let source = fs.readFileSync(filePath, 'utf-8');
  const original = source;
  
  // 修复 stepCompatibility
  const result1 = fixStepCompatibility(source);
  source = result1.source;
  
  // 特定数据修复
  source = fixSpecificIssues(source);
  
  if (source !== original) {
    fs.writeFileSync(filePath, source, 'utf-8');
    const changes = (original.match(/'find_numbers'/g) || []).length - (source.match(/'find_numbers'/g) || []).length;
    if (changes > 0) {
      console.log(`✅ ${fileName}: 移除 ${changes} 处 'find_numbers'`);
      totalReplacements += changes;
    }
    if (source.includes("'甲55乙27.5丙37.5'") && original.includes("这不对")) {
      console.log(`✅ ${fileName}: 修复 g4o_07 correctMeaning`);
    }
    totalFilesFixed++;
  }
}

console.log(`\n📊 共处理 ${totalFilesFixed} 个文件，移除 ${totalReplacements} 处 'find_numbers'`);
