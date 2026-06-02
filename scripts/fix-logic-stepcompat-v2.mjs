/**
 * 针对性修复：只移除 logic_reasoning 题目的 find_numbers stepCompatibility
 * 不影响其他类型的题目。
 * 
 * 用法: node scripts/fix-logic-stepcompat-v2.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_DIR = path.resolve(__dirname, '..', 'data', 'questions');

const ALL_FILES = [
  'g1.ts', 'g1-thinking.ts', 'g2.ts', 'g2-olympiad.ts',
  'g3.ts', 'g3-multiplication.ts', 'g3-olympiad.ts',
  'g4.ts', 'g4-olympiad.ts',
  'g5.ts', 'g5-olympiad.ts',
  'g6.ts',
  'extra-info.ts', 'missing-info.ts', 'olympiadIntro.ts',
];

// 特定数据修复
const SPECIFIC_FIXES = {
  // g4o_07: correctMeaning 去掉多余注释
  g4o_07: (source) => source.replace(
    /correctMeaning:'甲55乙27\.5丙37\.5\.\.\.这不对'/g,
    "correctMeaning:'甲55乙27.5丙37.5'"
  ),
  // g3o_25: 补充题干数字
  g3o_25: (source) => source.replace(
    /(id: 'g3o_25'.*?text: ')(2026年6月1日周一。这年的6月28日是周几\?6月有几个周一\?')/g,
    "$1一周有7天。$2"
  ),
};

function findQuestionObjects(source) {
  const questions = [];
  const idRegex = /id:\s*'([^']+)'/g;
  let match;

  while ((match = idRegex.exec(source)) !== null) {
    const qId = match[1];
    const objStart = source.lastIndexOf('{', match.index);
    if (objStart === -1) continue;

    let depth = 0;
    let objEnd = objStart;
    for (let i = source.indexOf('{', objStart); i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') { depth--; if (depth === 0) { objEnd = i; break; } }
    }

    questions.push({
      id: qId,
      start: objStart,
      end: objEnd,
      str: source.substring(objStart, objEnd + 1),
    });
  }

  return questions;
}

function isLogicReasoning(objStr) {
  return /lessonType:\s*'logic_reasoning'/.test(objStr);
}

function removeFindNumbers(arrStr) {
  // 输入: stepCompatibility: ['find_numbers', 'full_solve'],
  // 输出: stepCompatibility: ['full_solve'],
  
  // 处理 'find_numbers', 后面跟其他
  let result = arrStr.replace(/'find_numbers',\s*/g, '');
  // 处理 后面是 'find_numbers'（最后一项）
  result = result.replace(/,\s*'find_numbers'/g, '');
  // 处理 只有 'find_numbers'
  result = result.replace(/\['find_numbers'\]/g, '[]');
  return result;
}

let totalRemoved = 0;
let totalFilesFixed = 0;

for (const fileName of ALL_FILES) {
  const filePath = path.join(QUESTIONS_DIR, fileName);
  if (!fs.existsSync(filePath)) continue;

  let source = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 先应用特定修复
  for (const [qId, fixFn] of Object.entries(SPECIFIC_FIXES)) {
    if (source.includes(`id: '${qId}'`)) {
      const newSource = fixFn(source);
      if (newSource !== source) {
        source = newSource;
        modified = true;
        console.log(`   🔧 ${qId}: 数据修复`);
      }
    }
  }

  // 找所有题目对象
  const questions = findQuestionObjects(source);

  // 从后往前处理，避免位置偏移
  for (let i = questions.length - 1; i >= 0; i--) {
    const q = questions[i];
    if (!isLogicReasoning(q.str)) continue;

    // 检查是否有 find_numbers
    const scMatch = q.str.match(/stepCompatibility:\s*\[([^\]]*)\]/);
    if (!scMatch || !scMatch[1].includes('find_numbers')) continue;

    const oldSC = scMatch[0];
    const newSC = removeFindNumbers(oldSC);

    if (oldSC !== newSC) {
      source = source.substring(0, q.start) +
               q.str.replace(oldSC, newSC) +
               source.substring(q.end + 1);
      modified = true;
      totalRemoved++;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, source, 'utf-8');
    totalFilesFixed++;
    console.log(`✅ ${fileName}: 已修复`);
  }
}

console.log(`\n📊 共处理 ${totalFilesFixed} 个文件，移除 ${totalRemoved} 处 logic_reasoning 的 find_numbers`);
