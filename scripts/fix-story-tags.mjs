/**
 * 修复 Story 标签：增加 requiredTags 和 themeStrictness
 * 运行: node scripts/fix-story-tags.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const filepath = join(ROOT, 'data', 'stories.ts');
let content = readFileSync(filepath, 'utf-8');

// 每个 story 的修复
const FIXES = {
  forest_shop_theft: {
    allowedSceneTypes: ['animal_grass', 'animal', 'forest', 'shopping', 'generic'],
    requiredTags: ['animal', 'forest'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['playground', 'geometry', 'age', 'competition', 'ocean', 'interval', 'food_meal'],
  },
  pond_duckling_mystery: {
    allowedSceneTypes: ['animal_grass', 'animal', 'ocean', 'generic'],
    requiredTags: ['animal'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'interval', 'food_meal'],
  },
  bunny_carrot_garden: {
    allowedSceneTypes: ['animal_grass', 'animal', 'garden', 'food_fruit', 'generic'],
    requiredTags: ['rabbit', 'animal'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'interval', 'food_meal'],
  },
  ocean_shell_treasure: {
    allowedSceneTypes: ['ocean', 'generic'],
    requiredTags: ['ocean'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'interval', 'food_meal'],
  },
  crab_sandcastle: {
    allowedSceneTypes: ['ocean', 'generic'],
    requiredTags: ['ocean'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'interval', 'food_meal'],
  },
  school_canteen_mystery: {
    allowedSceneTypes: ['food_meal', 'food', 'snack', 'generic'],
    requiredTags: ['food'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'interval', 'ocean', 'animal'],
  },
  playground_ball_mystery: {
    allowedSceneTypes: ['sports', 'playground', 'generic'],
    requiredTags: ['sports', 'playground'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'geometry', 'age', 'competition', 'ocean', 'interval', 'food_meal', 'animal'],
  },
  candy_shop_inventory: {
    allowedSceneTypes: ['snack', 'shopping', 'food', 'generic'],
    requiredTags: ['snack', 'food'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['playground', 'geometry', 'age', 'competition', 'ocean', 'interval', 'animal'],
  },
  toy_store_puzzle: {
    allowedSceneTypes: ['shopping', 'stationery', 'generic'],
    requiredTags: ['shopping', 'toy', 'stationery'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['playground', 'geometry', 'age', 'competition', 'ocean', 'interval', 'food_meal', 'animal'],
  },
  birthday_party_math: {
    allowedSceneTypes: ['party', 'food', 'generic'],
    requiredTags: ['party', 'food'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'ocean', 'interval', 'animal'],
  },
  pet_shop_adventure: {
    allowedSceneTypes: ['animal', 'pet', 'animal_grass', 'animal_sky'],
    requiredTags: ['animal', 'pet'],
    themeStrictness: 'strict',
    forbiddenTags: ['shopping', 'food_meal', 'snack', 'playground', 'geometry', 'age', 'competition', 'ocean', 'interval', 'fruit', 'food', 'stationery'],
  },
  supermarket_price_puzzle: {
    allowedSceneTypes: ['shopping', 'snack', 'food', 'stationery'],
    requiredTags: ['shopping', 'price', 'money'],
    themeStrictness: 'strict',
    forbiddenTags: ['rabbit', 'animal', 'playground', 'flag', 'interval', 'age', 'geometry', 'competition', 'ocean', 'planting', 'pet'],
  },
  science_lab_data: {
    allowedSceneTypes: ['generic', 'math', 'science'],
    requiredTags: ['science', 'math'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'playground', 'age', 'competition', 'ocean', 'food_meal', 'animal'],
  },
  charity_sale_ledger: {
    allowedSceneTypes: ['shopping', 'school', 'money', 'generic'],
    requiredTags: ['shopping', 'money', 'school'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['playground', 'geometry', 'age', 'competition', 'ocean', 'interval', 'animal'],
  },
  library_overdue_research: {
    allowedSceneTypes: ['school', 'generic'],
    requiredTags: ['school', 'library'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'ocean', 'interval', 'food_meal', 'animal'],
  },
  sports_day_scoring: {
    allowedSceneTypes: ['sports', 'competition', 'playground', 'generic'],
    requiredTags: ['sports', 'competition'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'geometry', 'age', 'ocean', 'interval', 'food_meal', 'animal'],
  },
  observatory_data_cloud: {
    allowedSceneTypes: ['generic', 'math', 'science'],
    requiredTags: ['science', 'math'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'playground', 'age', 'competition', 'ocean', 'food_meal', 'animal'],
  },
  city_planning_ratio: {
    allowedSceneTypes: ['geometry', 'generic', 'math'],
    requiredTags: ['geometry', 'engineering', 'math', 'ratio'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'playground', 'age', 'competition', 'ocean', 'food_meal', 'animal'],
  },
  bank_interest_case: {
    allowedSceneTypes: ['money', 'shopping', 'generic', 'math'],
    requiredTags: ['money', 'finance', 'math'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['playground', 'age', 'competition', 'ocean', 'interval', 'food_meal', 'animal'],
  },
  map_scale_mystery: {
    allowedSceneTypes: ['geometry', 'generic', 'math', 'adventure'],
    requiredTags: ['geometry', 'ratio', 'adventure', 'math'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['shopping', 'playground', 'age', 'competition', 'ocean', 'food_meal', 'animal'],
  },
};

// 替换每个 story 的标签
let fixCount = 0;
for (const [id, fix] of Object.entries(FIXES)) {
  // 找到该 story 块中的 allowedSceneTypes 行
  const storyPattern = new RegExp(
    `(id:\\s*'${id}'[\\s\\S]*?allowedSceneTypes:)\\s*\\[[^\\]]+\\]`,
  );
  const match = content.match(storyPattern);
  if (!match) {
    console.warn(`[SKIP] ${id} not found or missing allowedSceneTypes`);
    continue;
  }

  // 替换 allowedSceneTypes
  content = content.replace(
    new RegExp(`(id:\\s*'${id}'[\\s\\S]*?allowedSceneTypes:)\\s*\\[[^\\]]+\\]`),
    `$1 ${JSON.stringify(fix.allowedSceneTypes)}`,
  );

  // 替换 requiredTags（如果有）
  const reqPattern = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?requiredTags:)\\s*\\[[^\\]]*\\]`);
  if (reqPattern.test(content)) {
    content = content.replace(reqPattern, `$1 ${JSON.stringify(fix.requiredTags)}`);
  } else {
    // 在 forbiddenTags 前插入 requiredTags
    const beforeForbidden = new RegExp(
      `(id:\\s*'${id}'[\\s\\S]*?themeTags:\\s*\\[[^\\]]+\\],)\\s*(forbiddenTags:)`,
    );
    if (beforeForbidden.test(content)) {
      content = content.replace(
        beforeForbidden,
        `$1\n    requiredTags: ${JSON.stringify(fix.requiredTags)},\n    themeStrictness: '${fix.themeStrictness}',\n    $2`,
      );
    }
  }

  // 替换 forbiddenTags
  const forbPattern = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?forbiddenTags:)\\s*\\[[^\\]]+\\]`);
  if (forbPattern.test(content)) {
    content = content.replace(forbPattern, `$1 ${JSON.stringify(fix.forbiddenTags)}`);
  }

  // 替换 themeStrictness（如果有）
  const strictPattern = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?themeStrictness:)\\s*'[^']*'`);
  if (strictPattern.test(content)) {
    content = content.replace(strictPattern, `$1 '${fix.themeStrictness}'`);
  }

  fixCount++;
  console.log(`[FIX] ${id}: requiredTags=${fix.requiredTags.join(',')}, strictness=${fix.themeStrictness}`);
}

writeFileSync(filepath, content, 'utf-8');
console.log(`\n✅ Done! Fixed ${fixCount} stories.`);
