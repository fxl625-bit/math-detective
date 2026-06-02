/**
 * 修复边缘 case 题目的 lessonType/keywordType
 * 
 * 用法: node scripts/fix-edge-lesson-keyword.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_DIR = path.resolve(__dirname, '..', 'data', 'questions');

// 边缘 case 映射: 题目ID -> { lessonType?, keywordType? }
const FIXES = {
  // ========== 完全缺失 (6题) ==========
  g1t_15:  { lessonType: 'logic_reasoning' },                 // 纯规律/模式识别
  g3_10:   { lessonType: 'number_clue', keywordType: 'number_extract' },  // 时间计算
  g5o_08:  { lessonType: 'number_clue', keywordType: 'number_extract' },  // 比率统一
  g5o_20:  { lessonType: 'number_clue', keywordType: 'number_extract' },  // 比率统一
  g5o_21:  { lessonType: 'geometry_count', keywordType: 'number_extract' },// 内角和比例
  g6_02:   { lessonType: 'number_clue', keywordType: 'number_extract' },  // 分数乘法

  // ========== 缺 lessonType (11题) ==========
  g1t_22:  { lessonType: 'logic_reasoning' },                 // 周期规律
  g1t_23:  { lessonType: 'logic_reasoning' },                 // 奇偶规律
  g1t_24:  { lessonType: 'logic_reasoning' },                 // 周期规律
  g2o_05:  { lessonType: 'logic_reasoning' },                 // 日历周期
  g2o_06:  { lessonType: 'logic_reasoning' },                 // 日历周期
  g2o_07:  { lessonType: 'logic_reasoning' },                 // 日历周期
  g5_11:   { lessonType: 'number_clue' },                     // 分数加减
  g5_12:   { lessonType: 'number_clue' },                     // 分数减法
  g5_14:   { lessonType: 'number_clue' },                     // 分数加减
  g5_24:   { lessonType: 'number_clue' },                     // 分数加减+干扰
  oi_21:   { lessonType: 'logic_reasoning' },                 // 数字谜/凑算式

  // ========== 缺 keywordType (7题) —— 纯逻辑题不需要 keywordType ==========
  // g1t_11, g4o_10, g4o_11, g4o_26, oi_13, oi_14: logic_reasoning 不需要 keyword
  // oi_28: geometry_count 需要 keywordType
  oi_28:   { keywordType: 'number_extract' },
};

// 文件 → 题目ID 映射
const FILE_MAP = {
  'g1-thinking.ts':   ['g1t_15','g1t_22','g1t_23','g1t_24'],
  'g3.ts':            ['g3_10'],
  'g5-olympiad.ts':   ['g5o_08','g5o_20','g5o_21'],
  'g6.ts':            ['g6_02'],
  'g2-olympiad.ts':   ['g2o_05','g2o_06','g2o_07'],
  'g5.ts':            ['g5_11','g5_12','g5_14','g5_24'],
  'olympiadIntro.ts': ['oi_21','oi_28'],
};

function injectField(source, qId, fieldName, fieldValue) {
  // 找题目的 id 行
  const idPattern = `id: '${qId}'`;
  const idIdx = source.indexOf(idPattern);
  if (idIdx === -1) {
    console.log(`   ⚠️  ${qId}: 找不到 id`);
    return source;
  }

  // 找题目对象开始位置
  const objStart = source.lastIndexOf('{', idIdx);
  if (objStart === -1) return source;

  // 括号匹配找对象结束
  let depth = 0;
  let objEnd = objStart;
  for (let i = source.indexOf('{', objStart); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) { objEnd = i; break; }
    }
  }

  // 提取这个题目对象
  const objStr = source.substring(objStart, objEnd + 1);
  
  // 检测是否已有该字段
  if (objStr.includes(`${fieldName}:`)) return source;

  // 判断格式：紧凑行 vs 多行
  const isCompact = objStr.indexOf('\n') === -1 || objStr.trim().split('\n').length <= 2;

  if (isCompact) {
    // 紧凑格式：在最后一个 }, 之前插入
    const lastComma = objStr.lastIndexOf('},');
    if (lastComma !== -1) {
      const injection = `,${fieldName}:'${fieldValue}'`;
      const newObj = objStr.substring(0, lastComma + 1) + injection + objStr.substring(lastComma + 1);
      return source.substring(0, objStart) + newObj + source.substring(objEnd + 1);
    }
  } else {
    // 多行格式：在 requiresAnswer 行之后插入
    const lines = objStr.split('\n');
    const requireIdx = lines.findIndex(l => /requiresAnswer:\s*(true|false),?\s*$/.test(l.trim()));
    if (requireIdx !== -1) {
      const indent = '  ';
      lines.splice(requireIdx + 1, 0, `${indent}${fieldName}:'${fieldValue}',`);
      const newObj = lines.join('\n');
      return source.substring(0, objStart) + newObj + source.substring(objEnd + 1);
    }
    // 兜底：在最后 } 之前插入
    const lastBrace = lines.findLastIndex(l => l.trim() === '},' || l.trim() === '}');
    if (lastBrace !== -1) {
      const indent = '  ';
      lines.splice(lastBrace, 0, `${indent}${fieldName}:'${fieldValue}',`);
      const newObj = lines.join('\n');
      return source.substring(0, objStart) + newObj + source.substring(objEnd + 1);
    }
  }
  return source;
}

let totalFixed = 0;
for (const [fileName, questionIds] of Object.entries(FILE_MAP)) {
  const filePath = path.join(QUESTIONS_DIR, fileName);
  if (!fs.existsSync(filePath)) continue;
  
  let source = fs.readFileSync(filePath, 'utf-8');
  let fileModified = false;

  for (const qId of questionIds) {
    const fix = FIXES[qId];
    if (!fix) continue;

    if (fix.lessonType) {
      source = injectField(source, qId, 'lessonType', fix.lessonType);
      fileModified = true;
    }
    if (fix.keywordType) {
      source = injectField(source, qId, 'keywordType', fix.keywordType);
      fileModified = true;
    }
  }

  if (fileModified) {
    fs.writeFileSync(filePath, source, 'utf-8');
    console.log(`✅ 已修复 ${fileName}: ${questionIds.join(', ')}`);
    totalFixed += questionIds.length;
  } else {
    console.log(`⏭️  跳过 ${fileName} (无需修复)`);
  }
}

console.log(`\n共修复 ${totalFixed} 道边缘 case 题目`);

// 统计纯逻辑题缺少 keywordType 的情况（这是正确的，无需修复）
const NO_KEYWORD_LOGICS = ['g1t_11', 'g4o_10', 'g4o_11', 'g4o_26', 'oi_13', 'oi_14'];
console.log(`以下 ${NO_KEYWORD_LOGICS.length} 道纯逻辑题不需要 keywordType: ${NO_KEYWORD_LOGICS.join(', ')}`);
