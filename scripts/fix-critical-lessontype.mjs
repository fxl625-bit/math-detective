/**
 * 修复 lessonType 与题目内容不匹配导致的 CRITICAL 错误
 * 用法: node scripts/fix-critical-lessontype.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_DIR = path.resolve(__dirname, '..', 'data', 'questions');

// lessonType 修正映射
const FIXES = {
  // 分数加减题→add_sub_action（有关键词如"一共""还剩""剪掉"）
  g5_11:  'add_sub_action',
  g5_12:  'add_sub_action',
  g5_14:  'add_sub_action',
  g5_24:  'add_sub_action',
  // 时间计算→add_sub_action（有减法操作）
  g3_10:  'add_sub_action',
  // 比率统一→logic_reasoning（纯数学推理）
  g5o_08: 'logic_reasoning',
  g5o_20: 'logic_reasoning',
  // 分数乘法→logic_reasoning（无标准动作关键词）
  g6_02:  'logic_reasoning',
};

const FILE_MAP = {
  'g3.ts': ['g3_10'],
  'g5.ts': ['g5_11', 'g5_12', 'g5_14', 'g5_24'],
  'g5-olympiad.ts': ['g5o_08', 'g5o_20'],
  'g6.ts': ['g6_02'],
};

function replaceLessonType(source, qId, newType) {
  const idPattern = `id: '${qId}'`;
  const idIdx = source.indexOf(idPattern);
  if (idIdx === -1) return source;

  // 找题目对象
  const objStart = source.lastIndexOf('{', idIdx);
  if (objStart === -1) return source;
  
  let depth = 0;
  let objEnd = objStart;
  for (let i = source.indexOf('{', objStart); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) { objEnd = i; break; } }
  }

  const objStr = source.substring(objStart, objEnd + 1);
  
  // 替换 lessonType
  const ltMatch = objStr.match(/lessonType:'([^']+)'/);
  if (ltMatch) {
    const newObj = objStr.replace(/lessonType:'([^']+)'/, `lessonType:'${newType}'`);
    return source.substring(0, objStart) + newObj + source.substring(objEnd + 1);
  }
  return source;
}

for (const [fileName, ids] of Object.entries(FILE_MAP)) {
  const filePath = path.join(QUESTIONS_DIR, fileName);
  let source = fs.readFileSync(filePath, 'utf-8');
  for (const qId of ids) {
    source = replaceLessonType(source, qId, FIXES[qId]);
  }
  fs.writeFileSync(filePath, source, 'utf-8');
  console.log(`✅ ${fileName}: ${ids.join(', ')} → 已修复`);
}
console.log('\n✅ CRITICAL lessonType 修复完成');
