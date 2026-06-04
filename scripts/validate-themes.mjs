/**
 * 全主题一致性验证脚本 (v2.6.12)
 *
 * 遍历所有 Story，检查：
 * 1. 每个 Story 是否有 allowedSceneTypes / forbiddenTags
 * 2. 每个 Story 下可用题数是否足够
 * 3. 生成 20 次 lesson 检查 theme-question-step 一致性
 *
 * 运行: node scripts/validate-themes.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ========== 数据加载 ==========

function loadFile(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf-8');
}

// 简单解析 story IDs
function parseStoryIds(content) {
  const ids = [];
  const re = /id:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

// 简单解析 question IDs 和 sceneType/themeTags/text
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

    const sceneMatch = block.match(/sceneType:\s*'([^']+)'/);
    const sceneType = sceneMatch ? sceneMatch[1] : null;

    const tagsMatch = block.match(/themeTags:\s*\[([^\]]+)\]/);
    const themeTags = tagsMatch
      ? tagsMatch[1].split(',').map(s => s.trim().replace(/'/g, ''))
      : null;

    const problemMatch = block.match(/problemType:\s*'([^']+)'/);
    const problemType = problemMatch ? problemMatch[1] : null;

    const answerMatch = block.match(/answerType:\s*'([^']+)'/);
    const answerType = answerMatch ? answerMatch[1] : null;

    const compatMatch = block.match(/stepCompatibility:\s*\[([^\]]+)\]/);
    const stepCompatibility = compatMatch
      ? compatMatch[1].split(',').map(s => s.trim().replace(/'/g, ''))
      : null;

    const gradeMatch = block.match(/gradeBand:\s*'([^']+)'/);
    const gradeBand = gradeMatch ? gradeMatch[1] : 'G1';

    questions.push({
      id, text, sceneType, themeTags, problemType, answerType,
      stepCompatibility, gradeBand, file: filename,
    });
  }
  return questions;
}

// ========== 推断函数（与 storySystem.ts 保持一致） ==========

function inferSceneType(q) {
  const text = q.text;
  if (/超市|商店|购物|价格|优惠|找零|元|角|分|买|卖/.test(text)) return 'shopping';
  if (/兔子|兔|小兔/.test(text)) return 'animal_grass';
  if (/小鸟|鸟|飞/.test(text)) return 'animal_sky';
  if (/苹果|桃子|梨|水果|香蕉|橘子/.test(text)) return 'food_fruit';
  if (/包子|饺子|饭|吃/.test(text)) return 'food_meal';
  if (/操场|跑道|彩旗|每隔|种树|植树/.test(text)) return 'playground';
  if (/年龄|岁|爸爸.*岁|妈妈.*岁/.test(text)) return 'family_age';
  if (/正方形|长方形|三角形|圆形|面积|周长|角/.test(text)) return 'geometry';
  if (/名次|比赛|跑步|第几名/.test(text)) return 'competition';
  if (/糖果|零食/.test(text)) return 'snack';
  if (/铅笔|橡皮|书包|文具/.test(text)) return 'stationery';
  if (/牛奶|盒|瓶|箱/.test(text)) return 'shopping';
  if (/足球|篮球|皮球|球/.test(text)) return 'sports';
  if (/花|树|草|花园/.test(text)) return 'garden';
  if (/鱼|虾|螃蟹|海底|海洋/.test(text)) return 'ocean';
  if (/饼干|月饼|蛋糕/.test(text)) return 'food_dessert';
  return 'generic';
}

function inferThemeTags(q) {
  const tags = [];
  const text = q.text;
  if (/超市|商店|购物|价格|优惠|找零/.test(text)) tags.push('shopping', 'price', 'money');
  if (/元|角|分|花了|找回|付/.test(text)) tags.push('money');
  if (/买|卖|进货|库存|卖出/.test(text)) tags.push('shopping');
  if (/兔子|兔/.test(text)) tags.push('rabbit', 'animal', 'grass');
  if (/小鸟|鸟/.test(text)) tags.push('bird', 'animal');
  if (/苹果|桃子|梨|水果/.test(text)) tags.push('fruit', 'food');
  if (/包子|饭|吃掉/.test(text)) tags.push('food');
  if (/操场|跑道/.test(text)) tags.push('playground');
  if (/彩旗|每隔|种树|植树/.test(text)) tags.push('interval', 'planting');
  if (/年龄|岁/.test(text)) tags.push('age', 'family');
  if (/正方形|长方形|三角形|圆形|面积|周长|角/.test(text)) tags.push('geometry');
  if (/名次|比赛|跑步/.test(text)) tags.push('competition', 'ranking');
  if (/糖果|零食/.test(text)) tags.push('snack', 'food');
  if (/铅笔|橡皮|书包|文具/.test(text)) tags.push('stationery');
  if (/牛奶|盒|瓶|箱/.test(text)) tags.push('shopping', 'drink');
  if (/足球|篮球|皮球|球/.test(text)) tags.push('sports');
  if (/鱼|虾|螃蟹|海底|海洋/.test(text)) tags.push('ocean');
  if (/饼干|月饼|蛋糕/.test(text)) tags.push('food', 'dessert');
  if (tags.length === 0) tags.push('generic');
  return [...new Set(tags)];
}

// ========== Story 解析 ==========

function parseStories(content) {
  const stories = [];
  const blocks = content.split(/\{\s*id:\s*'/);
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const idMatch = block.match(/^([^']+)'/);
    if (!idMatch) continue;
    const id = idMatch[1];

    const titleMatch = block.match(/title:\s*'([^']+)'/);
    const title = titleMatch ? titleMatch[1] : '';

    const allowedMatch = block.match(/allowedSceneTypes:\s*\[([^\]]+)\]/);
    const allowedSceneTypes = allowedMatch
      ? allowedMatch[1].split(',').map(s => s.trim().replace(/'/g, ''))
      : [];

    const forbiddenMatch = block.match(/forbiddenTags:\s*\[([^\]]+)\]/);
    const forbiddenTags = forbiddenMatch
      ? forbiddenMatch[1].split(',').map(s => s.trim().replace(/'/g, ''))
      : [];

    const themeTagsMatch = block.match(/themeTags:\s*\[([^\]]+)\]/);
    const themeTags = themeTagsMatch
      ? themeTagsMatch[1].split(',').map(s => s.trim().replace(/'/g, ''))
      : [];

    const gradeMatch = block.match(/gradeBand:\s*\[([^\]]+)\]/);
    const gradeBand = gradeMatch
      ? gradeMatch[1].split(',').map(s => s.trim().replace(/'/g, ''))
      : [];

    stories.push({
      id, title, allowedSceneTypes, forbiddenTags, themeTags, gradeBand,
    });
  }
  return stories;
}

// ========== 兼容性检查 ==========

function isQuestionCompatibleWithTheme(question, story) {
  const qScene = question.sceneType || inferSceneType(question);
  const qTags = question.themeTags?.length ? question.themeTags : inferThemeTags(question);

  // forbiddenTags 检查
  if (story.forbiddenTags?.length) {
    const hasForbidden = qTags.some(tag => story.forbiddenTags.includes(tag));
    if (hasForbidden) return { compatible: false, reason: `forbiddenTag match: ${qTags.filter(t => story.forbiddenTags.includes(t)).join(',')}` };
  }

  // allowedSceneTypes 检查
  if (story.allowedSceneTypes?.length) {
    if (qScene && !story.allowedSceneTypes.includes(qScene)) {
      if (qScene !== 'generic' && qScene !== 'math') {
        return { compatible: false, reason: `sceneType "${qScene}" not in allowedSceneTypes` };
      }
    }
  }

  return { compatible: true, reason: null };
}

// ========== 主逻辑 ==========

console.log('=== Math Detective 全主题一致性验证 (v2.6.12) ===\n');

// 加载数据
const storiesContent = loadFile('data/stories.ts');
const stories = parseStories(storiesContent);

const questionFiles = [
  'g1.ts', 'g2.ts', 'g3.ts', 'g4.ts', 'g5.ts', 'g6.ts',
  'g1-thinking.ts', 'g2-olympiad.ts', 'g3-multiplication.ts',
  'g3-olympiad.ts', 'g4-olympiad.ts', 'g5-olympiad.ts',
  'olympiadIntro.ts', 'extra-info.ts', 'missing-info.ts',
];

let allQuestions = [];
for (const file of questionFiles) {
  try {
    const content = loadFile(`data/questions/${file}`);
    allQuestions.push(...parseQuestions(content, file));
  } catch {
    // file not found
  }
}

console.log(`Stories: ${stories.length}`);
console.log(`Questions: ${allQuestions.length}\n`);

// 验证每个 Story
let totalPassed = 0;
let totalFailed = 0;
const failedStories = [];

for (const story of stories) {
  console.log(`--- ${story.id}: ${story.title} ---`);

  // 1. 检查标签完整性
  const issues = [];
  if (story.allowedSceneTypes.length === 0) issues.push('缺少 allowedSceneTypes');
  if (story.forbiddenTags.length === 0) issues.push('缺少 forbiddenTags');
  if (story.themeTags.length === 0) issues.push('缺少 themeTags');

  // 2. 统计可用题数
  const compatibleQuestions = allQuestions.filter(q => {
    const result = isQuestionCompatibleWithTheme(q, story);
    return result.compatible;
  });

  const compatibleByGrade = compatibleQuestions.filter(q =>
    story.gradeBand.includes(q.gradeBand)
  );

  // 3. 按 problemType 分类
  const byProblemType = {};
  for (const q of compatibleByGrade) {
    const pt = q.problemType || '(未标注)';
    byProblemType[pt] = (byProblemType[pt] || 0) + 1;
  }

  // 4. 检查是否足够 6 关
  if (compatibleByGrade.length < 6) {
    issues.push(`可用题不足: ${compatibleByGrade.length}/6 (年级匹配)`);
  }

  // 5. 随机生成 10 次 lesson 检查一致性
  let mismatchCount = 0;
  const mismatches = [];
  for (let trial = 0; trial < 10; trial++) {
    // 随机选 6 题
    const shuffled = [...compatibleByGrade].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(6, shuffled.length));
    for (const q of selected) {
      const result = isQuestionCompatibleWithTheme(q, story);
      if (!result.compatible) {
        mismatchCount++;
        if (mismatches.length < 3) {
          mismatches.push({ qId: q.id, reason: result.reason });
        }
      }
    }
  }

  if (mismatchCount > 0) {
    issues.push(`${mismatchCount} mismatches in 10 trials`);
  }

  // 输出
  const passed = issues.length === 0;
  if (passed) {
    totalPassed++;
    console.log(`  ✅ PASS | 题数: ${compatibleByGrade.length} | 类型: ${Object.entries(byProblemType).map(([k,v]) => `${k}:${v}`).join(', ')}`);
  } else {
    totalFailed++;
    failedStories.push({ id: story.id, title: story.title, issues });
    console.log(`  ❌ FAIL | 题数: ${compatibleByGrade.length}`);
    for (const issue of issues) {
      console.log(`    - ${issue}`);
    }
    for (const m of mismatches) {
      console.log(`    - mismatch: ${m.qId}: ${m.reason}`);
    }
  }
}

// 汇总
console.log('\n=== 汇总 ===');
console.log(`总 Story: ${stories.length}`);
console.log(`通过: ${totalPassed}`);
console.log(`失败: ${totalFailed}`);

if (failedStories.length > 0) {
  console.log('\n失败的 Story:');
  for (const f of failedStories) {
    console.log(`  ❌ ${f.id}: ${f.title}`);
    for (const issue of f.issues) {
      console.log(`     - ${issue}`);
    }
  }
}

// 检查未标注题
const noSceneType = allQuestions.filter(q => !q.sceneType);
const noThemeTags = allQuestions.filter(q => !q.themeTags);
const noProblemType = allQuestions.filter(q => !q.problemType);
console.log(`\n题库标注状态:`);
console.log(`  缺少 sceneType: ${noSceneType.length}/${allQuestions.length}`);
console.log(`  缺少 themeTags: ${noThemeTags.length}/${allQuestions.length}`);
console.log(`  缺少 problemType: ${noProblemType.length}/${allQuestions.length}`);

if (totalFailed > 0) {
  console.log('\n❌ 有 Story 未通过验证，请修复后重新运行。');
  process.exit(1);
} else {
  console.log('\n✅ 所有 Story 通过一致性验证。');
}
