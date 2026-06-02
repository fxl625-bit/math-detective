/**
 * 为紧凑格式题库文件注入 lessonType 和 keywordType
 * 
 * 紧凑格式的特点：每道题目是单行对象，包含嵌套的数组（如 keywords、questionMeaningOptions）
 * 必须用括号深度匹配来定位题目对象的真正边界，不能用简单的 lastIndexOf('},')
 * 
 * 用法: node scripts/inject-compact-lesson-keyword.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 紧凑格式题库文件 → 导出的数组名
const COMPACT_FILES = {
  'g3-olympiad.ts': 'g3OlympiadQuestions',
  'g4-olympiad.ts': 'g4OlympiadQuestions',
  'g5-olympiad.ts': 'g5OlympiadQuestions',
};

const QUESTIONS_DIR = path.resolve(__dirname, '..', 'data', 'questions');

// ===== 推断函数（纯 JS 版本，避免依赖 TS 模块以简化执行） =====

function inferLessonType(q) {
  const text = q.text || '';
  const domain = q.domain || '';
  const operation = q.operation || '';
  const keywords = q.keywords || [];
  const numbers = q.numbers || [];
  const extraNumbers = q.extraNumbers || [];

  if (domain === 'logic_reasoning') return 'logic_reasoning';
  if (operation === 'logic' && domain !== 'pattern' && domain !== 'geometry' && domain !== 'measurement' && domain !== 'time') {
    return 'logic_reasoning';
  }

  const hasGuarantee = keywords.some(k => ['至少','保证','至少','一定'].some(w => (k.word||'').includes(w)));
  if (hasGuarantee) return 'guarantee_worst_case';

  const hasTimes = keywords.some(k => (k.word||'').includes('倍'));
  if (hasTimes && ['multiplication','division','mixed'].includes(operation)) return 'times_intro';

  const hasPlanting = text.includes('植树') || text.includes('种一棵') ||
    (text.includes('每隔') || text.includes('每')) && (text.includes('米') || text.includes('棵'));
  if (hasPlanting && domain === 'geometry') return 'planting_interval';

  const hasGeomCount = text.includes('正方形') || text.includes('三角形') ||
    text.includes('长方形') || text.includes('有几个');
  if (hasGeomCount && domain === 'geometry') return 'geometry_count';

  if (extraNumbers && extraNumbers.length > 0) return 'irrelevant_info';

  const hasEqual = keywords.some(k => ['每','平均','每人','每组','每份'].some(w => (k.word||'').includes(w)));
  if (hasEqual && ['multiplication','division'].includes(operation)) return 'equal_groups_intro';

  const hasCompare = keywords.some(k => ['比','差'].some(w => (k.word||'').includes(w)));
  if (hasCompare && ['comparison','subtraction','mixed'].includes(operation)) return 'compare_more_less';

  const hasAdd = keywords.some(k => k.type === 'add' || ['一共','共有','合起来','总共'].some(w => (k.word||'').includes(w)));
  const hasSub = keywords.some(k => k.type === 'subtract' || ['还剩','剩下','走了','吃了','用了'].some(w => (k.word||'').includes(w)));
  if ((hasAdd || hasSub) && ['addition','subtraction'].includes(operation)) return 'add_sub_action';

  if (numbers.length > 0 && operation !== 'logic') return 'number_clue';

  return null;
}

function inferKeywordType(q) {
  const keywords = q.keywords || [];
  const numbers = q.numbers || [];

  const hasGuarantee = keywords.some(k => ['至少','保证','至少','一定'].some(w => (k.word||'').includes(w)));
  if (hasGuarantee) return 'guarantee_worst_case';

  const hasTimes = keywords.some(k => (k.word||'').includes('倍'));
  if (hasTimes) return 'times_intro';

  const hasEqual = keywords.some(k => ['每','平均','每人','每组','每份'].some(w => (k.word||'').includes(w)));
  if (hasEqual) return 'equal_groups';

  const hasLogic = keywords.some(k => ['不是','第几','排第','说谎','真话'].some(w => (k.word||'').includes(w)));
  if (hasLogic) return 'logic_condition';

  const hasCompare = keywords.some(k => ['比','差'].some(w => (k.word||'').includes(w)));
  if (hasCompare) return 'compare';

  const hasIrrel = keywords.some(k => ['年龄','颜色','编号','节'].some(w => (k.word||'').includes(w)));
  if (hasIrrel) return 'irrelevant_info';

  const hasAdd = keywords.some(k => k.type === 'add' || ['一共','共有','合起来','总共','又跑来','又飞来','又给了','加入'].some(w => (k.word||'').includes(w)));
  if (hasAdd) return 'add_action';

  const hasSub = keywords.some(k => k.type === 'subtract' || ['还剩','剩下','走了','吃掉','用掉','用了','飞走','剪掉','划走'].some(w => (k.word||'').includes(w)));
  if (hasSub) return 'subtract_action';

  if (numbers.length > 0) return 'number_extract';

  return null;
}

// ===== 从紧凑行解析题目对象 =====

function parseFieldValue(str, start) {
  // 跳过空格
  let i = start;
  while (i < str.length && str[i] === ' ') i++;
  
  if (i >= str.length) return { value: null, end: i };
  
  if (str[i] === "'" || str[i] === '"') {
    // 字符串
    const quote = str[i];
    i++;
    let val = '';
    while (i < str.length && str[i] !== quote) {
      if (str[i] === '\\') { val += str[i]; i++; val += str[i]; }
      else val += str[i];
      i++;
    }
    return { value: val, end: i + 1 };
  }
  
  if (str[i] === '[') {
    // 数组 - 深度匹配
    let depth = 0;
    const start2 = i;
    while (i < str.length) {
      if (str[i] === '[') depth++;
      else if (str[i] === ']') { depth--; if (depth === 0) { i++; break; } }
      i++;
    }
    return { value: JSON.parse(str.substring(start2, i)), end: i };
  }
  
  if (str[i] === '{') {
    let depth = 0;
    const start2 = i;
    while (i < str.length) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') { depth--; if (depth === 0) { i++; break; } }
      i++;
    }
    return { value: null, end: i };  // 嵌套对象不解析
  }
  
  // 数字或布尔值
  let val = '';
  while (i < str.length && /[\w.]/.test(str[i])) { val += str[i]; i++; }
  if (val === 'true') return { value: true, end: i };
  if (val === 'false') return { value: false, end: i };
  if (!isNaN(Number(val))) return { value: Number(val), end: i };
  return { value: val, end: i };
}

function parseCompactQuestion(objStr) {
  // 从 { id: 'xxx', ... } 解析关键字段
  // 简单方式：用正则匹配关键字段
  const q = {};

  const getStr = (key) => {
    const m = objStr.match(new RegExp(`${key}:\\s*'([^']*)'`));
    return m ? m[1] : undefined;
  };
  const getNumArr = (key) => {
    const m = objStr.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
    if (!m) return [];
    if (m[1].trim() === '') return [];
    return m[1].split(',').map(s => Number(s.trim()));
  };

  q.text = getStr('text');
  q.domain = getStr('domain');
  q.operation = getStr('operation');
  q.numbers = getNumArr('numbers');
  q.extraNumbers = getNumArr('extraNumbers');
  q.keywords = [];
  // 解析 keywords（数组中的对象）
  const kwMatch = objStr.match(/keywords:\s*(\[[^\]]*\{[^}]*word:\s*'([^']*)',\s*type:\s*'([^']*)'\}[^\]]*\])/);
  if (kwMatch) {
    // 更复杂的解析...
    const kwStr = kwMatch[1];
    const wordMatches = [...kwStr.matchAll(/word:\s*'([^']*)'/g)];
    const typeMatches = [...kwStr.matchAll(/type:\s*'([^']*)'/g)];
    for (let i = 0; i < wordMatches.length; i++) {
      q.keywords.push({
        word: wordMatches[i][1],
        type: typeMatches[i] ? typeMatches[i][1] : 'add'
      });
    }
  }

  return q;
}

// ===== 在紧凑格式中注入字段 =====

function injectCompactFields(questionStr, lessonType, keywordType) {
  const fields = [];
  if (lessonType) fields.push(`lessonType:'${lessonType}'`);
  if (keywordType) fields.push(`keywordType:'${keywordType}'`);
  if (fields.length === 0) return questionStr;

  // 找 requiresAnswer: true/false 位置，在其后插入
  const raMatch = questionStr.match(/requiresAnswer:\s*(true|false)/);
  if (raMatch) {
    const insertPos = raMatch.index + raMatch[0].length;
    return questionStr.substring(0, insertPos) + ',' + fields.join(',') + questionStr.substring(insertPos);
  }

  // 找 stepCompatibility 前
  const scMatch = questionStr.match(/stepCompatibility:/);
  if (scMatch) {
    return questionStr.substring(0, scMatch.index) + fields.join(',') + ',' + questionStr.substring(scMatch.index);
  }

  // 兜底：在最后一个 } 前（但需要加逗号）
  const lastBrace = questionStr.lastIndexOf('}');
  if (lastBrace > 0) {
    // 检查是否需要加逗号
    const before = questionStr.substring(0, lastBrace).trimEnd();
    const needsCommaBefore = !before.endsWith(',') && !before.endsWith('{');
    const needsCommaAfter = !questionStr[lastBrace + 1] || questionStr[lastBrace + 1] !== ',';
    
    let insert = '';
    if (needsCommaBefore) insert += ',';
    insert += fields.join(',');
    
    return before + insert + questionStr.substring(lastBrace);
  }

  return questionStr;
}

// ===== 主逻辑 =====

for (const [fileName, exportName] of Object.entries(COMPACT_FILES)) {
  const filePath = path.join(QUESTIONS_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  跳过: ${fileName} (不存在)`);
    continue;
  }

  let source = fs.readFileSync(filePath, 'utf-8');
  const originalSource = source;
  let modified = false;
  let fixedCount = 0;
  let skipCount = 0;

  // 找到数组中每个题目对象（单行，以 { id: '...' 开头）
  // 策略：找到所有 id: '...' 的位置，然后从那里往前找 { ，用深度匹配找到对应的 }
  const idRegex = /id:\s*'([^']+)'/g;
  const questions = [];
  let match;
  while ((match = idRegex.exec(source)) !== null) {
    const id = match[1];
    const idStart = match.index;

    // 往前找包含这个题目的 {
    let objStart = source.lastIndexOf('{', idStart);
    if (objStart === -1) continue;

    // 用深度匹配找题目的结束 }
    let depth = 0;
    let objEnd = objStart;
    for (let i = source.indexOf('{', objStart); i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) { objEnd = i; break; }
      }
    }

    const objStr = source.substring(objStart, objEnd + 1);

    // 检查是否已有 lessonType
    if (objStr.includes('lessonType:') && objStr.includes('keywordType:')) {
      skipCount++;
      continue;
    }

    // 解析关键字段
    const q = parseCompactQuestion(objStr);

    // 推断
    const lessonType = inferLessonType(q);
    const keywordType = inferKeywordType(q);

    // 边缘 case 手动覆盖
    const EDGE_CASES = {
      g5o_08: { lessonType: 'number_clue', keywordType: 'number_extract' },
      g5o_20: { lessonType: 'number_clue', keywordType: 'number_extract' },
      g5o_21: { lessonType: 'geometry_count', keywordType: 'number_extract' },
    };

    let lt = lessonType;
    let kt = keywordType;
    if (EDGE_CASES[id]) {
      lt = EDGE_CASES[id].lessonType;
      kt = EDGE_CASES[id].keywordType;
    }

    // 注入
    const newObjStr = injectCompactFields(objStr, lt, kt);
    if (newObjStr !== objStr) {
      source = source.substring(0, objStart) + newObjStr + source.substring(objEnd + 1);
      modified = true;
      fixedCount++;
      console.log(`   ✅ ${id}: lessonType=${lt}, keywordType=${kt}`);
    } else {
      console.log(`   ⚠️  ${id}: 注入失败`);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, source, 'utf-8');
    console.log(`💾 已保存 ${fileName}: 修复 ${fixedCount}, 跳过 ${skipCount}`);
  } else {
    console.log(`⏭️  跳过 ${fileName}: 全部已有字段`);
  }
}

console.log('\n✅ 紧凑格式文件注入完成！');
