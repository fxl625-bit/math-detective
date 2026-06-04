/**
 * 批量为题库添加 sceneType / themeTags / problemType
 * 运行: node scripts/add-question-scene-tags.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ========== 推断规则 ==========

function inferSceneType(text) {
  if (/超市|商店|购物|价格|优惠|找零|元|角|分|买|卖/.test(text)) return 'shopping';
  if (/兔子|兔|小兔/.test(text)) return 'animal_grass';
  if (/小鸟|鸟|飞/.test(text)) return 'animal_sky';
  if (/苹果|桃子|梨|水果|香蕉|橘子/.test(text)) return 'food_fruit';
  if (/包子|饺子|饭|吃/.test(text)) return 'food_meal';
  if (/操场|跑道|彩旗|每隔|种树|植树/.test(text)) return 'playground';
  if (/年龄|岁|爸爸.*岁|妈妈.*岁/.test(text)) return 'family_age';
  if (/正方形|长方形|三角形|圆形|面积|周长|角|棱|体积|表面积/.test(text)) return 'geometry';
  if (/名次|比赛|跑步|第几名/.test(text)) return 'competition';
  if (/糖果|零食/.test(text)) return 'snack';
  if (/铅笔|橡皮|书包|文具/.test(text)) return 'stationery';
  if (/牛奶|盒|瓶|箱/.test(text)) return 'shopping';
  if (/足球|篮球|皮球|球/.test(text)) return 'sports';
  if (/花|树|草|花园/.test(text)) return 'garden';
  if (/星星|月亮|太阳|天文/.test(text)) return 'science';
  if (/鱼|虾|螃蟹|海底|海洋/.test(text)) return 'ocean';
  if (/饼干|月饼|蛋糕/.test(text)) return 'food_dessert';
  if (/蛋糕|派对|生日/.test(text)) return 'party';
  if (/图书馆|书|借阅/.test(text)) return 'school';
  if (/银行|利息|存/.test(text)) return 'money';
  if (/地图|比例尺|藏宝/.test(text)) return 'adventure';
  if (/动物|宠物|猫|狗/.test(text)) return 'animal';
  if (/文具|玩具/.test(text)) return 'stationery';
  return 'generic';
}

function inferThemeTags(text) {
  const tags = [];
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
  if (/正方形|长方形|三角形|圆形|面积|周长|角|棱|体积/.test(text)) tags.push('geometry');
  if (/名次|比赛|跑步/.test(text)) tags.push('competition', 'ranking');
  if (/糖果|零食/.test(text)) tags.push('snack', 'food');
  if (/铅笔|橡皮|书包|文具/.test(text)) tags.push('stationery');
  if (/牛奶|盒|瓶|箱/.test(text)) tags.push('shopping', 'drink');
  if (/足球|篮球|皮球|球/.test(text)) tags.push('sports');
  if (/鱼|虾|螃蟹|海底|海洋/.test(text)) tags.push('ocean');
  if (/饼干|月饼|蛋糕/.test(text)) tags.push('food', 'dessert');
  if (/蛋糕|派对|生日/.test(text)) tags.push('party');
  if (/图书馆|书/.test(text)) tags.push('school', 'library');
  if (/银行|利息|存/.test(text)) tags.push('money', 'finance');
  if (/地图|比例尺|藏宝/.test(text)) tags.push('adventure', 'ratio');
  if (/动物|宠物|猫|狗/.test(text)) tags.push('animal', 'pet');
  if (/玩具/.test(text)) tags.push('toy');
  if (tags.length === 0) tags.push('generic');
  return [...new Set(tags)];
}

function inferProblemType(text, operation) {
  if (/名次|比赛|跑步|第几名|不是第一名|不是最后一名/.test(text)) return 'logic_ranking';
  if (/年龄|岁|几年后|再过/.test(text)) return 'age_problem';
  if (/每隔|植树|种树|两端|圆形|彩旗/.test(text)) return 'planting_problem';
  if (/规律|第几层|第几个|每次多/.test(text)) return 'pattern';
  if (/倍|几倍|是.*的几倍/.test(text)) return 'ratio_distribution';
  if (/三角形|正方形|圆形|图形|角|面积|周长|棱|体积|表面积/.test(text)) return 'shape_counting';
  if (/够不够|缺少|不足|信息.*不够/.test(text)) return 'information_check';
  if (operation === 'mixed') return 'multi_step';
  return 'basic_arithmetic';
}

// ========== 文件处理 ==========

const FILES = [
  'g1.ts', 'g2.ts', 'g3.ts', 'g4.ts', 'g5.ts', 'g6.ts',
  'g1-thinking.ts', 'g2-olympiad.ts', 'g3-multiplication.ts',
  'g3-olympiad.ts', 'g4-olympiad.ts', 'g5-olympiad.ts',
  'olympiadIntro.ts', 'extra-info.ts', 'missing-info.ts',
];

let totalFixed = 0;

for (const file of FILES) {
  const filepath = join(ROOT, 'data', 'questions', file);
  let content;
  try {
    content = readFileSync(filepath, 'utf-8');
  } catch {
    continue;
  }

  const lines = content.split('\n');
  let fixCount = 0;
  let currentText = '';
  let currentOp = '';
  let hasSceneType = false;
  let hasThemeTags = false;
  let hasProblemType = false;
  let insertAfterLine = -1;

  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检测新题目块开始
    if (/^\s*\{\s*$/.test(line) || /id:\s*'/.test(line)) {
      // 如果前一个题目缺少字段，插入
      if (insertAfterLine >= 0 && currentText) {
        const inserts = [];
        if (!hasSceneType) {
          inserts.push(`    sceneType: '${inferSceneType(currentText)}',`);
        }
        if (!hasThemeTags) {
          const tags = inferThemeTags(currentText);
          inserts.push(`    themeTags: ${JSON.stringify(tags)},`);
        }
        if (!hasProblemType) {
          inserts.push(`    problemType: '${inferProblemType(currentText, currentOp)}',`);
        }
        if (inserts.length > 0) {
          // 在 insertAfterLine 后插入
          newLines.splice(insertAfterLine + 1, 0, ...inserts);
          fixCount++;
        }
      }
      // 重置
      currentText = '';
      currentOp = '';
      hasSceneType = false;
      hasThemeTags = false;
      hasProblemType = false;
      insertAfterLine = -1;
    }

    // 提取 text 字段
    const textMatch = line.match(/text:\s*'([^']+)'/);
    if (textMatch) currentText = textMatch[1];

    // 提取 operation 字段
    const opMatch = line.match(/operation:\s*'([^']+)'/);
    if (opMatch) currentOp = opMatch[1];

    // 检查是否已有这些字段
    if (line.includes('sceneType:')) hasSceneType = true;
    if (line.includes('themeTags:')) hasThemeTags = true;
    if (line.includes('problemType:')) hasProblemType = true;

    // 记录 requiresAnswer 行位置（题目块的最后一个字段）
    if (line.includes('requiresAnswer:') || line.includes('stepCompatibility:')) {
      insertAfterLine = newLines.length;
    }

    newLines.push(line);
  }

  // 处理最后一个题目
  if (insertAfterLine >= 0 && currentText) {
    const inserts = [];
    if (!hasSceneType) {
      inserts.push(`    sceneType: '${inferSceneType(currentText)}',`);
    }
    if (!hasThemeTags) {
      const tags = inferThemeTags(currentText);
      inserts.push(`    themeTags: ${JSON.stringify(tags)},`);
    }
    if (!hasProblemType) {
      inserts.push(`    problemType: '${inferProblemType(currentText, currentOp)}',`);
    }
    if (inserts.length > 0) {
      newLines.splice(insertAfterLine + 1, 0, ...inserts);
      fixCount++;
    }
  }

  if (fixCount > 0) {
    writeFileSync(filepath, newLines.join('\n'), 'utf-8');
    console.log(`  [FIX] ${file}: ${fixCount} questions annotated`);
    totalFixed += fixCount;
  }
}

console.log(`\n✅ Done! Annotated ${totalFixed} questions.`);
