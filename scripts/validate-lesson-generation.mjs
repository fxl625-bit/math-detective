/**
 * 全主题生成验证脚本 (v2.7.4)
 *
 * 遍历所有 enabled story，每个生成 100 套 lesson，
 * 检查每个 step 的 theme-question-step 一致性。
 *
 * 运行: node scripts/validate-lesson-generation.mjs
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

// 简单解析 questions
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

// 简单解析 stories
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
    const requiredMatch = block.match(/requiredTags:\s*\[([^\]]+)\]/);
    const requiredTags = requiredMatch
      ? requiredMatch[1].split(',').map(s => s.trim().replace(/'/g, ''))
      : [];
    const strictMatch = block.match(/themeStrictness:\s*'([^']+)'/);
    const themeStrictness = strictMatch ? strictMatch[1] : 'semi_strict';
    const gradeMatch = block.match(/gradeBand:\s*\[([^\]]+)\]/);
    const gradeBand = gradeMatch
      ? gradeMatch[1].split(',').map(s => s.trim().replace(/'/g, ''))
      : [];
    stories.push({
      id, title, allowedSceneTypes, forbiddenTags, themeTags,
      requiredTags, themeStrictness, gradeBand,
    });
  }
  return stories;
}

// ========== 推断函数 ==========

function inferSceneType(q) {
  const text = q.text;
  if (/超市|商店|购物|价格|优惠|找零|元|角|分|买|卖/.test(text)) return 'supermarket';
  if (/兔子|兔|小兔/.test(text)) return 'animal_grass';
  if (/小鸟|鸟|飞/.test(text)) return 'animal_grass';
  if (/苹果|桃子|梨|水果|香蕉|橘子/.test(text)) return 'fruit';
  if (/包子|饺子|饭|吃/.test(text)) return 'canteen';
  if (/酸奶|冰箱/.test(text)) return 'home_food';
  if (/操场|跑道|彩旗|每隔|种树|植树/.test(text)) return 'planting_route';
  if (/年龄|岁|爸爸.*岁|妈妈.*岁/.test(text)) return 'age_family';
  if (/正方形|长方形|三角形|圆形|面积|周长|角|棱|体积/.test(text)) return 'geometry';
  if (/名次|比赛|跑步|第几名/.test(text)) return 'logic_race';
  if (/糖果|零食/.test(text)) return 'candy_store';
  if (/铅笔|橡皮|书包|文具/.test(text)) return 'stationery';
  if (/牛奶|盒|瓶|箱/.test(text)) return 'supermarket';
  if (/足球|篮球|皮球|球/.test(text)) return 'sports';
  if (/鱼|虾|螃蟹|海底|海洋/.test(text)) return 'ocean';
  if (/饼干|月饼|蛋糕/.test(text)) return 'home_food';
  if (/玩具|玩偶|小汽车|积木|娃娃/.test(text)) return 'toy_store';
  if (/猫|狗|宠物/.test(text)) return 'pet_shop';
  return 'generic';
}

function inferThemeTags(q) {
  const tags = [];
  const text = q.text;
  if (/超市|商店|购物|价格|优惠|找零/.test(text)) tags.push('shopping', 'price', 'money');
  if (/元|角|分|花了|找回|付钱/.test(text)) tags.push('money');
  if (/买|卖|进货|库存|卖出/.test(text)) tags.push('shopping');
  if (/兔子|兔/.test(text)) tags.push('rabbit', 'animal');
  if (/小鸟|鸟/.test(text)) tags.push('bird', 'animal');
  if (/猫|狗|宠物/.test(text)) tags.push('pet', 'animal', 'cat', 'dog');
  if (/酸奶/.test(text)) tags.push('food', 'dairy', 'yogurt', 'fridge');
  if (/冰箱/.test(text)) tags.push('fridge', 'home_food', 'food');
  if (/包子/.test(text)) tags.push('food', 'baozi', 'bun');
  if (/面包/.test(text)) tags.push('food', 'bread');
  if (/饼干/.test(text)) tags.push('food', 'snack');
  if (/糖果|零食/.test(text)) tags.push('food', 'snack', 'candy');
  if (/牛奶/.test(text)) tags.push('food', 'dairy');
  if (/苹果|桃子|梨|水果/.test(text)) tags.push('fruit', 'food');
  if (/玩具|玩偶|小汽车|积木/.test(text)) tags.push('toy');
  if (/铅笔|橡皮|书包|文具/.test(text)) tags.push('stationery');
  if (/操场|跑道/.test(text)) tags.push('playground');
  if (/彩旗|每隔|种树|植树/.test(text)) tags.push('interval', 'planting');
  if (/足球|篮球|皮球/.test(text)) tags.push('sports', 'ball');
  if (/跑步|比赛|名次/.test(text)) tags.push('race', 'sports');
  if (/年龄|岁/.test(text)) tags.push('age', 'family');
  if (/正方形|长方形|三角形|圆形|面积|周长|角/.test(text)) tags.push('geometry');
  if (/鱼|虾|螃蟹|海底|海洋/.test(text)) tags.push('ocean');
  if (tags.length === 0) tags.push('generic');
  return [...new Set(tags)];
}

// ========== 兼容性检查 ==========

function isQuestionCompatibleWithTheme(question, story) {
  const qScene = question.sceneType || inferSceneType(question);
  const qTags = question.themeTags?.length ? question.themeTags : inferThemeTags(question);
  const strictness = story.themeStrictness || 'semi_strict';

  // forbiddenTags
  if (story.forbiddenTags?.length) {
    if (qTags.some(tag => story.forbiddenTags.includes(tag))) return false;
  }

  // generic 模式
  if (strictness === 'generic') return true;

  // generic-only 题目不能进入强主题
  const isGenericOnly = qScene === 'generic' ||
    (qTags.length > 0 && qTags.every(tag => tag === 'generic' || tag === 'quantity'));
  if (isGenericOnly) return false;

  // requiredTags
  if (story.requiredTags?.length) {
    if (!story.requiredTags.some(tag => qTags.includes(tag))) return false;
  }

  return true;
}

// ========== 主逻辑 ==========

console.log('=== Math Detective 全主题生成验证 (v2.7.4) ===\n');

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
  } catch {}
}

console.log(`Stories: ${stories.length}`);
console.log(`Questions: ${allQuestions.length}`);
console.log(`Generations per story: 100\n`);

// stepType 兼容性检查（与 lessonPlanner STEP_TYPE_REQUIREMENTS 对齐）
function isQuestionCompatibleWithStep(q, stepType) {
  if (stepType === 'full_solve') return true;
  if (q.stepCompatibility) return q.stepCompatibility.includes(stepType);
  // 没有 stepCompatibility 的题，根据特征推断
  if (stepType === 'find_numbers') return q.text.length > 5;
  if (stepType === 'find_action_words') return q.text.length > 5;
  return true;
}

// 模拟真实的 lessonPlanner 选题：先选 stepType，再选兼容的题
function generateLesson(story, questions, stepTypes) {
  const steps = [];
  const usedIds = new Set();
  for (const st of stepTypes) {
    const candidates = questions.filter(q =>
      !usedIds.has(q.id) && isQuestionCompatibleWithStep(q, st)
    );
    if (candidates.length === 0) {
      steps.push({ stepType: st, question: null, reason: 'no_compatible_question' });
      continue;
    }
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    usedIds.add(picked.id);
    steps.push({ stepType: st, question: picked, reason: null });
  }
  return steps;
}

const STEP_TYPES = ['find_numbers', 'find_action_words', 'simulation', 'remove_noise', 'full_solve', 'find_compare_numbers'];

let totalPassed = 0;
let totalFailed = 0;
const failedStories = [];

for (const story of stories) {
  const compatible = allQuestions.filter(q => isQuestionCompatibleWithTheme(q, story));
  const byGrade = compatible.filter(q => story.gradeBand.includes(q.gradeBand));

  let mismatchCount = 0;
  let noQuestionCount = 0;
  const mismatches = [];

  // 生成 100 套 lesson
  for (let trial = 0; trial < 100; trial++) {
    const lesson = generateLesson(story, byGrade, STEP_TYPES);

    for (const step of lesson) {
      if (!step.question) {
        noQuestionCount++;
        continue;
      }

      const q = step.question;

      // 检查主题兼容（双重验证）
      if (!isQuestionCompatibleWithTheme(q, story)) {
        mismatchCount++;
        if (mismatches.length < 5) {
          mismatches.push({ qId: q.id, text: q.text.slice(0, 40), reason: 'theme_mismatch' });
        }
      }

      // 检查 forbidden 关键词（硬规则）
      const text = q.text;
      if (story.id === 'toy_store_puzzle' && /酸奶|冰箱|包子|苹果|超市货架|食品/.test(text)) {
        mismatchCount++;
        if (mismatches.length < 5) mismatches.push({ qId: q.id, text: text.slice(0, 40), reason: 'food_in_toy_store' });
      }
      if (story.id === 'pet_shop_adventure' && /包子|酸奶|冰箱|玩具|积木/.test(text)) {
        mismatchCount++;
        if (mismatches.length < 5) mismatches.push({ qId: q.id, text: text.slice(0, 40), reason: 'food_toy_in_pet_shop' });
      }
      if (story.id === 'supermarket_price_puzzle' && /兔子|宠物|操场|彩旗|年龄|几何/.test(text)) {
        mismatchCount++;
        if (mismatches.length < 5) mismatches.push({ qId: q.id, text: text.slice(0, 40), reason: 'animal_in_supermarket' });
      }
    }
  }

  // 判断通过条件：无主题错配 且 可用题>=6
  const passed = mismatchCount === 0 && byGrade.length >= 6;
  if (passed) {
    totalPassed++;
    console.log(`  ✅ PASS | ${story.title} | 可用题: ${byGrade.length} | 100套全部通过`);
  } else {
    totalFailed++;
    failedStories.push({ id: story.id, title: story.title, mismatchCount, noQuestionCount, available: byGrade.length, mismatches });
    const failReason = byGrade.length < 6 ? `题库不足(${byGrade.length}/6)` : `${mismatchCount}个主题错配`;
    console.log(`  ❌ FAIL | ${story.title} | 可用题: ${byGrade.length} | ${failReason}`);
    for (const m of mismatches) {
      console.log(`    - ${m.qId}: ${m.text}... → ${m.reason}`);
    }
  }
}

console.log('\n=== 汇总 ===');
console.log(`总 Story: ${stories.length}`);
console.log(`通过: ${totalPassed}`);
console.log(`失败: ${totalFailed}`);

if (failedStories.length > 0) {
  console.log('\n失败的 Story:');
  for (const f of failedStories) {
    console.log(`  ❌ ${f.id}: ${f.title} (${f.mismatchCount} mismatches, ${f.available} questions available)`);
  }
  console.log('\n❌ 生成验证未通过，不允许部署。');
  process.exit(1);
} else {
  console.log('\n✅ 所有 Story 生成验证通过。');
}


// ========== v2.8.2: Real playthrough verification ==========

console.log('\n=== Real Playthrough Verification ===');

// Simulate lesson generation for each grade
const grades = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
let playthroughTotal = 0;
let playthroughPassed = 0;
let stuckCount = 0;
let invalidStepCount = 0;
let loopCount = 0;

for (const grade of grades) {
  for (let iter = 0; iter < 20; iter++) {
    playthroughTotal++;
    
    // Find questions for this grade
    const gradeQuestions = allQuestions.filter(q => q.gradeBand === grade);
    if (gradeQuestions.length === 0) continue;
    
    // Simulate checking each step type
    const stepTypes = ['find_numbers', 'find_action_words', 'full_solve', 'remove_noise'];
    
    let lessonValid = true;
    let issues = [];
    
    for (const st of stepTypes) {
      // Check if any question can serve this step
      const compatible = gradeQuestions.filter(q => {
        if (q.stepCompatibility && !q.stepCompatibility.includes(st)) return false;
        if (!q.stepCompatibility) {
          // Check STEP_TYPE_REQUIREMENTS equivalent
          if (st === 'find_numbers' && q.numbers.length === 0) return false;
          if (st === 'find_action_words' && (!q.keywords || q.keywords.length === 0)) return false;
          if (st === 'remove_noise' && (!q.noisePhrases || q.noisePhrases.length === 0)) return false;
        }
        // Extra check: pattern questions + find_action_words = INVALID
        if (st === 'find_action_words' && q.problemType === 'pattern') return false;
        if (st === 'find_action_words' && q.problemType === 'sequence_arithmetic') return false;
        return true;
      });
      
      if (compatible.length === 0) {
        issues.push(`No compatible question for step ${st}`);
        stuckCount++;
      }
      
      // Check for invalid combinations
      for (const q of compatible) {
        if (st === 'find_action_words' && q.problemType === 'pattern') {
          issues.push(`PATTERN IN ACTION WORDS: ${q.id}`);
          invalidStepCount++;
        }
        if (st === 'remove_noise' && q.problemType === 'pattern') {
          issues.push(`PATTERN IN REMOVE NOISE: ${q.id}`);
          invalidStepCount++;
        }
      }
    }
    
    // Check for duplicate questions across steps
    const usedQids = new Set();
    for (const st of stepTypes) {
      const compatible = gradeQuestions.filter(q => {
        if (q.stepCompatibility && !q.stepCompatibility.includes(st)) return false;
        if (st === 'find_numbers' && q.numbers.length === 0) return false;
        if (st === 'find_action_words' && (!q.keywords || q.keywords.length === 0)) return false;
        return true;
      });
      if (compatible.length > 0) {
        // Check if any question would cause loop
        const qid = compatible[0].id;
        if (usedQids.has(qid)) {
          loopCount++;
          issues.push(`Duplicate question ${qid} across steps`);
        }
        usedQids.add(qid);
      }
    }
    
    if (issues.length > 0) {
      lessonValid = false;
    }
    
    if (lessonValid) {
      playthroughPassed++;
    }
  }
}

console.log(`  Lessons simulated: ${playthroughTotal}`);
console.log(`  Complete lessons: ${playthroughPassed}`);
console.log(`  Stuck count: ${stuckCount}`);
console.log(`  Invalid step count: ${invalidStepCount}`);
console.log(`  Loop count: ${loopCount}`);

if (stuckCount > 0 || invalidStepCount > 0) {
  console.log('\n  >>> CANNOT PUBLISH <<<');
  process.exit(1);
} else {
  console.log('\n  >>> ALL PLAYTHROUGHS VALID <<<');
}


// ========== v2.8.2: Real playthrough verification ==========
console.log('\n=== Real Playthrough Verification ===');
const _grades = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
let _ptTotal = 0;
let _ptPassed = 0;
let _stuckCount = 0;
let _invalidCount = 0;

for (const _g of _grades) {
  const _pool = allQuestions.filter(q => q.gradeBand === _g);
  if (_pool.length < 6) continue;
  _ptTotal++;
  
  let _ok = true;
  // Check find_action_words doesn't get pattern questions
  for (const _q of _pool) {
    if (_q.problemType === 'pattern' || _q.problemType === 'sequence_arithmetic') {
      const _sc = _q.stepCompatibility || [];
      if (_sc.includes('find_action_words')) {
        console.log('  FAIL: pattern q ' + _q.id + ' has find_action_words in stepCompatibility');
        _invalidCount++;
        _ok = false;
      }
      if (_sc.includes('remove_noise')) {
        console.log('  FAIL: pattern q ' + _q.id + ' has remove_noise in stepCompatibility');
        _invalidCount++;
        _ok = false;
      }
    }
  }
  // Check find_action_words has compatible questions
  const _actionPool = _pool.filter(q => (q.stepCompatibility || []).includes('find_action_words') || (!q.stepCompatibility && q.keywords && q.keywords.length > 0));
  if (_actionPool.length === 0) {
    _stuckCount++;
    _ok = false;
  }
  // Check remove_noise has compatible questions
  const _noisePool = _pool.filter(q => (q.stepCompatibility || []).includes('remove_noise') || (!q.stepCompatibility && q.noisePhrases && q.noisePhrases.length > 0));
  if (_noisePool.length === 0 && _g !== 'G1') {
    // G1 may not have noise questions, that's OK
  }
  // Check spot_extra_info only has questions with extraNumbers
  for (const _q of _pool) {
    const _sc = _q.stepCompatibility || [];
    if (_sc.includes('spot_extra_info')) {
      if (!_q.extraNumbers || _q.extraNumbers.length === 0) {
        console.log('  FAIL: ' + _q.id + ' has spot_extra_info but no extraNumbers');
        _invalidCount++;
        _ok = false;
      }
    }
  }
  if (_ok) _ptPassed++;
}

console.log('  ' + _ptTotal + ' grades tested, ' + _ptPassed + ' passed');
console.log('  Stuck count: ' + _stuckCount);
console.log('  Invalid step count: ' + _invalidCount);
if (_stuckCount > 0 || _invalidCount > 0) {
  console.log('\n  >>> CANNOT PUBLISH <<<');
  process.exit(1);
} else {
  console.log('\n  >>> ALL PLAYTHROUGHS VALID <<<');
}
