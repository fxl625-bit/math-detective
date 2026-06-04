/**
 * 批量为多答案题添加 subAnswers 元数据
 * 运行: node scripts/add-multi-answer-fields.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ========== 多答案题修复规则 ==========
// 格式: { id: { subAnswers: [...], answerType?, problemType? } }

const FIXES = {
  // === g2-olympiad.ts ===
  'g2o_01': { subAnswers: [{ id: 'ming', label: '小明', answer: 7 }, { id: 'hong', label: '小红', answer: 5 }] },
  'g2o_02': { subAnswers: [{ id: 'brother', label: '哥哥', answer: 11 }, { id: 'younger', label: '弟弟', answer: 7 }] },
  'g2o_04': { subAnswers: [{ id: 'class1', label: '一班', answer: 34 }, { id: 'class2', label: '二班', answer: 28 }] },

  // === g2.ts ===
  'g2_10': { subAnswers: [{ id: 'lower', label: '下层', answer: 19 }, { id: 'total', label: '总数', answer: 47 }] },

  // === g3-olympiad.ts ===
  'g3o_01': { subAnswers: [{ id: 'jia', label: '甲数', answer: 36 }, { id: 'yi', label: '乙数', answer: 12 }] },
  'g3o_02': { subAnswers: [{ id: 'tao', label: '桃树', answer: 96 }, { id: 'li', label: '梨树', answer: 24 }] },
  'g3o_03': { subAnswers: [{ id: 'jia', label: '甲数', answer: 36 }, { id: 'yi', label: '乙数', answer: 9 }] },
  'g3o_04': { subAnswers: [{ id: 'son', label: '小明', answer: 7 }, { id: 'dad', label: '爸爸', answer: 35 }] },
  'g3o_10': { subAnswers: [{ id: 'ji', label: '鸡', answer: 6 }, { id: 'tu', label: '兔', answer: 4 }] },
  'g3o_11': { subAnswers: [{ id: 'tricycle', label: '三轮车', answer: 10 }, { id: 'car', label: '汽车', answer: 5 }] },
  'g3o_12': { subAnswers: [{ id: 'five', label: '5元', answer: 10 }, { id: 'two', label: '2元', answer: 8 }] },
  'g3o_13': { subAnswers: [{ id: 'people', label: '人数', answer: 5 }, { id: 'candy', label: '糖数', answer: 19 }] },
  'g3o_14': { subAnswers: [{ id: 'people', label: '人数', answer: 5 }, { id: 'pencils', label: '铅笔数', answer: 31 }] },
  'g3o_25': { subAnswers: [{ id: 'weekday', label: '周几', answer: '周日' }, { id: 'count', label: '周一数', answer: 4 }] },

  // === g3.ts ===
  'g3_12': { subAnswers: [{ id: 'diff', label: '相差', answer: 2 }, { id: 'total', label: '总重', answer: 8 }] },
  'g3_13': { subAnswers: [{ id: 'fraction', label: '几分之几', answer: '1/4' }, { id: 'count', label: '个数', answer: 3 }] },
  'g3_16': { subAnswers: [{ id: 'soccer', label: '足球价格', answer: 72 }, { id: 'total', label: '总价', answer: 90 }] },

  // === g4-olympiad.ts ===
  'g4o_06': { subAnswers: [{ id: 'jia', label: '甲数', answer: 36 }, { id: 'yi', label: '乙数', answer: 10 }] },
  'g4o_07': { subAnswers: [{ id: 'jia', label: '甲', answer: 55 }, { id: 'yi', label: '乙', answer: 27.5 }, { id: 'bing', label: '丙', answer: 37.5 }] },
  'g4o_08': { subAnswers: [{ id: 'people', label: '人数', answer: 4 }, { id: 'apples', label: '苹果数', answer: 26 }] },
  'g4o_09': { subAnswers: [{ id: 'people', label: '人数', answer: 10 }, { id: 'books', label: '书数', answer: 42 }] },
  'g4o_14': { subAnswers: [{ id: 'ji', label: '鸡', answer: 16 }, { id: 'tu', label: '兔', answer: 11 }] },
  'g4o_15': { subAnswers: [{ id: 'spider', label: '蜘蛛', answer: 5 }, { id: 'dragonfly', label: '蜻蜓', answer: 13 }] },
  'g4o_16': { subAnswers: [{ id: 'first', label: '5※3', answer: 23 }, { id: 'second', label: '(2※3)※4', answer: 59 }] },
  'g4o_17': { subAnswers: [{ id: 'downstream', label: '顺水', answer: 4 }, { id: 'upstream', label: '逆水', answer: 6 }] },
  'g4o_18': { subAnswers: [{ id: 'diff', label: '公差', answer: 4 }, { id: 'term10', label: '第10项', answer: 44 }] },
  'g4o_22': { subAnswers: [{ id: 'before', label: '相遇前', answer: 2 }, { id: 'after', label: '相遇后', answer: 2.8 }] },

  // === g4.ts ===
  'g4_05': { subAnswers: [{ id: 'diff', label: '多多少', answer: 6.7 }, { id: 'total', label: '总共', answer: 24.5 }] },
  'g4_06': { subAnswers: [{ id: 'area', label: '面积', answer: 900 }, { id: 'count', label: '块数', answer: 67 }] },
  'g4_09': { subAnswers: [{ id: 'ml', label: '毫升', answer: 6000 }, { id: 'liter', label: '升', answer: 6 }] },
  'g4_11': { subAnswers: [{ id: 'revenue', label: '销售额', answer: 256 }, { id: 'profit', label: '利润', answer: 102.4 }] },
  'g4_13': { subAnswers: [{ id: 'capacity', label: '能坐', answer: 540 }, { id: 'needed', label: '需要', answer: 12 }] },
  'g4_17': { subAnswers: [{ id: 'days', label: '天数', answer: 12 }, { id: 'extra', label: '追加量', answer: 45 }] },
  'g4_23': { subAnswers: [{ id: 'spent', label: '花了', answer: 30 }, { id: 'left', label: '剩', answer: 20 }] },

  // === g5-olympiad.ts ===
  'g5o_09': { subAnswers: [{ id: 'boatspeed', label: '船速', answer: 18 }, { id: 'waterspeed', label: '水速', answer: 2 }] },
  'g5o_16': { subAnswers: [{ id: 'profit', label: '赚', answer: 18 }, { id: 'rate', label: '利润率', answer: 12 }] },
  'g5o_21': { subAnswers: [{ id: 'angle', label: '最大角', answer: 80 }, { id: 'type', label: '三角形类型', answer: '锐角' }] },
  'g5o_22': { subAnswers: [{ id: 'boatspeed', label: '船速', answer: 16 }, { id: 'waterspeed', label: '水速', answer: 4 }] },
  'g5o_25': { subAnswers: [{ id: 'sa', label: '表面积', answer: 208 }, { id: 'vol', label: '体积', answer: 192 }, { id: 'count', label: '个数', answer: 24 }] },
  'g5o_26': { subAnswers: [{ id: 'three', label: '三面红', answer: 8 }, { id: 'two', label: '两面红', answer: 36 }, { id: 'one', label: '一面红', answer: 54 }, { id: 'zero', label: '零面红', answer: 27 }] },
  'g5o_27': { subAnswers: [{ id: 'time', label: '时间', answer: 200 }, { id: 'laps', label: '圈数', answer: 2.5 }] },

  // === g5.ts ===
  'g5_04': { subAnswers: [{ id: 'unit', label: '单价', answer: 6.4 }, { id: 'total', label: '3千克价', answer: 19.2 }] },
  'g5_11': { subAnswers: [{ id: 'sum', label: '一共', answer: '3/5' }, { id: 'diff', label: '多', answer: '1/5' }] },
  'g5_13': { subAnswers: [{ id: 'eaten', label: '吃了', answer: 8 }, { id: 'left', label: '剩', answer: 16 }] },
  'g5_14': { subAnswers: [{ id: 'done', label: '已修', answer: '3/4' }, { id: 'left', label: '剩', answer: '1/4' }] },
  'g5_24': { subAnswers: [{ id: 'sum', label: '一共', answer: '5/8' }, { id: 'left', label: '剩', answer: '3/8' }] },

  // === g6.ts ===
  'g6_10': { subAnswers: [{ id: 'perimeter', label: '周长', answer: 31.4 }, { id: 'area', label: '面积', answer: 78.5 }] },
  'g6_24': { subAnswers: [{ id: 'perimeter', label: '周长', answer: 31.4 }, { id: 'area', label: '面积', answer: 78.5 }] },

  // === olympiadIntro.ts ===
  'oi_07': { subAnswers: [{ id: 'people', label: '人数', answer: 5 }, { id: 'candy', label: '糖数', answer: 19 }] },
  // oi_10 和 oi_12 已经修复过了
};

// ========== 文件路径映射 ==========

const FILE_MAP = {
  'g2o_': 'g2-olympiad.ts',
  'g3o_': 'g3-olympiad.ts',
  'g4o_': 'g4-olympiad.ts',
  'g5o_': 'g5-olympiad.ts',
  'g2_': 'g2.ts',
  'g3_': 'g3.ts',
  'g4_': 'g4.ts',
  'g5_': 'g5.ts',
  'g6_': 'g6.ts',
  'oi_': 'olympiadIntro.ts',
};

function getFileForId(id) {
  for (const [prefix, file] of Object.entries(FILE_MAP)) {
    if (id.startsWith(prefix)) return file;
  }
  return null;
}

// ========== 主逻辑 ==========

function processFile(filename) {
  const filepath = join(ROOT, 'data', 'questions', filename);
  let content = readFileSync(filepath, 'utf-8');

  // 找到该文件中需要修复的题目
  const idsToFix = Object.keys(FIXES).filter(id => getFileForId(id) === filename);
  if (idsToFix.length === 0) return 0;

  let fixCount = 0;

  for (const id of idsToFix) {
    const fix = FIXES[id];

    // 检查是否已经有 subAnswers
    const idPattern = new RegExp(`id:\\s*'${id}'`);
    if (!idPattern.test(content)) {
      console.warn(`  [SKIP] ${id} not found in ${filename}`);
      continue;
    }

    // 找到该题的结束位置（下一个 `{` 或 `}` 之前）
    // 策略：找到 id: 'xxx' 所在行，然后找到该题块的结束

    // 先检查是否已有 subAnswers
    const lines = content.split('\n');
    let idLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`id: '${id}'`)) {
        idLineIdx = i;
        break;
      }
    }

    if (idLineIdx === -1) {
      console.warn(`  [SKIP] ${id} line not found in ${filename}`);
      continue;
    }

    // 向后找该题块的结束（找 }, 或 }）
    let endLineIdx = -1;
    let braceDepth = 0;
    for (let i = idLineIdx; i < lines.length; i++) {
      const line = lines[i];
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (braceDepth <= 0 && i > idLineIdx) {
        endLineIdx = i;
        break;
      }
    }

    if (endLineIdx === -1) {
      console.warn(`  [SKIP] ${id} end not found`);
      continue;
    }

    // 检查该题块中是否已有 subAnswers
    const blockLines = lines.slice(idLineIdx, endLineIdx + 1);
    const blockText = blockLines.join('\n');
    if (blockText.includes('subAnswers:')) {
      console.log(`  [SKIP] ${id} already has subAnswers`);
      continue;
    }

    // 在结束行前插入 subAnswers 和 answerType
    const subAnswersStr = JSON.stringify(fix.subAnswers);
    const insertLine = `  answerType: 'multi_answer',\n  subAnswers: ${subAnswersStr},`;

    // 找到结束行（通常是 `  },`）
    // 在结束行前插入
    lines.splice(endLineIdx, 0, insertLine);

    content = lines.join('\n');
    fixCount++;
    console.log(`  [FIX] ${id} → added subAnswers (${fix.subAnswers.length} fields)`);
  }

  if (fixCount > 0) {
    writeFileSync(filepath, content, 'utf-8');
  }

  return fixCount;
}

// ========== 执行 ==========

const files = [
  'g2-olympiad.ts',
  'g2.ts',
  'g3-olympiad.ts',
  'g3.ts',
  'g4-olympiad.ts',
  'g4.ts',
  'g5-olympiad.ts',
  'g5.ts',
  'g6.ts',
  'olympiadIntro.ts',
];

let totalFixed = 0;
for (const file of files) {
  console.log(`\nProcessing ${file}...`);
  const count = processFile(file);
  totalFixed += count;
}

console.log(`\n✅ Done! Fixed ${totalFixed} questions.`);
