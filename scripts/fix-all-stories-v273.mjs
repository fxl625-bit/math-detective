/**
 * v2.7.3: 全量修复所有 Story 标签
 * 运行: node scripts/fix-all-stories-v273.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const filepath = join(ROOT, 'data', 'stories.ts');
let content = readFileSync(filepath, 'utf-8');

const STORY_FIXES = {
  forest_shop_theft: {
    allowedSceneTypes: ['animal_grass', 'animal_domestic', 'garden'],
    requiredTags: ['animal'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['food', 'snack', 'dairy', 'yogurt', 'fridge', 'baozi', 'toy', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean', 'sports'],
  },
  pond_duckling_mystery: {
    allowedSceneTypes: ['animal_grass', 'ocean'],
    requiredTags: ['animal'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['food', 'snack', 'dairy', 'yogurt', 'fridge', 'shopping', 'toy', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'sports'],
  },
  bunny_carrot_garden: {
    allowedSceneTypes: ['animal_grass', 'garden'],
    requiredTags: ['rabbit', 'animal'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['food', 'snack', 'dairy', 'yogurt', 'fridge', 'shopping', 'toy', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean', 'sports'],
  },
  ocean_shell_treasure: {
    allowedSceneTypes: ['ocean'],
    requiredTags: ['ocean'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['food', 'snack', 'dairy', 'yogurt', 'fridge', 'shopping', 'toy', 'pet', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'sports'],
  },
  crab_sandcastle: {
    allowedSceneTypes: ['ocean'],
    requiredTags: ['ocean'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['food', 'snack', 'dairy', 'yogurt', 'fridge', 'shopping', 'toy', 'pet', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'sports'],
  },
  school_canteen_mystery: {
    allowedSceneTypes: ['canteen', 'home_food'],
    requiredTags: ['food', 'canteen_food'],
    themeStrictness: 'strict',
    forbiddenTags: ['pet', 'animal', 'toy', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean', 'sports', 'shopping'],
  },
  playground_ball_mystery: {
    allowedSceneTypes: ['playground', 'sports'],
    requiredTags: ['playground', 'sports', 'ball'],
    themeStrictness: 'strict',
    forbiddenTags: ['food', 'snack', 'dairy', 'yogurt', 'fridge', 'shopping', 'toy', 'pet', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean'],
  },
  candy_shop_inventory: {
    allowedSceneTypes: ['candy_store'],
    requiredTags: ['candy', 'sweet', 'snack'],
    themeStrictness: 'strict',
    forbiddenTags: ['pet', 'animal', 'toy', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean', 'sports'],
  },
  toy_store_puzzle: {
    allowedSceneTypes: ['toy_store', 'stationery'],
    requiredTags: ['toy', 'stationery_toy'],
    themeStrictness: 'strict',
    forbiddenTags: ['food', 'snack', 'dairy', 'yogurt', 'fridge', 'baozi', 'bun', 'candy', 'sweet', 'fruit', 'apple', 'bread', 'cake', 'breakfast', 'canteen_food', 'pet', 'animal', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean', 'sports'],
  },
  birthday_party_math: {
    allowedSceneTypes: ['party'],
    requiredTags: ['party'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['pet', 'animal', 'toy', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean', 'sports', 'shopping'],
  },
  pet_shop_adventure: {
    allowedSceneTypes: ['pet_shop', 'animal_domestic'],
    requiredTags: ['pet', 'animal'],
    themeStrictness: 'strict',
    forbiddenTags: ['food', 'snack', 'dairy', 'yogurt', 'fridge', 'baozi', 'toy', 'stationery', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean', 'sports', 'shopping'],
  },
  supermarket_price_puzzle: {
    allowedSceneTypes: ['supermarket'],
    requiredTags: ['shopping', 'price', 'money'],
    themeStrictness: 'strict',
    forbiddenTags: ['rabbit', 'animal', 'pet', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean', 'sports'],
  },
  science_lab_data: {
    allowedSceneTypes: ['science_lab'],
    requiredTags: ['science'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['food', 'snack', 'shopping', 'toy', 'pet', 'playground', 'flag', 'age', 'logic', 'sequence', 'planting', 'ocean'],
  },
  charity_sale_ledger: {
    allowedSceneTypes: ['school', 'supermarket'],
    requiredTags: ['shopping', 'money', 'school'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['pet', 'animal', 'toy', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean', 'food', 'snack'],
  },
  library_overdue_research: {
    allowedSceneTypes: ['library', 'school'],
    requiredTags: ['school', 'library'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['food', 'snack', 'shopping', 'toy', 'pet', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean'],
  },
  sports_day_scoring: {
    allowedSceneTypes: ['playground', 'sports'],
    requiredTags: ['sports', 'competition'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['food', 'snack', 'dairy', 'yogurt', 'fridge', 'shopping', 'toy', 'pet', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean'],
  },
  observatory_data_cloud: {
    allowedSceneTypes: ['science_lab'],
    requiredTags: ['science'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['food', 'snack', 'shopping', 'toy', 'pet', 'playground', 'flag', 'age', 'logic', 'sequence', 'planting', 'ocean'],
  },
  city_planning_ratio: {
    allowedSceneTypes: ['geometry'],
    requiredTags: ['geometry'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['food', 'snack', 'shopping', 'toy', 'pet', 'playground', 'flag', 'age', 'logic', 'sequence', 'planting', 'ocean'],
  },
  bank_interest_case: {
    allowedSceneTypes: ['money_bank'],
    requiredTags: ['money', 'bank', 'interest'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['food', 'snack', 'toy', 'pet', 'playground', 'flag', 'geometry', 'age', 'logic', 'sequence', 'planting', 'ocean'],
  },
  map_scale_mystery: {
    allowedSceneTypes: ['geometry'],
    requiredTags: ['geometry', 'ratio'],
    themeStrictness: 'semi_strict',
    forbiddenTags: ['food', 'snack', 'shopping', 'toy', 'pet', 'playground', 'flag', 'age', 'logic', 'sequence', 'planting', 'ocean'],
  },
};

// 替换每个 story 的标签
let fixCount = 0;
for (const [id, fix] of Object.entries(STORY_FIXES)) {
  // 替换 allowedSceneTypes
  const asPattern = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?allowedSceneTypes:)\\s*\\[[^\\]]*\\]`);
  if (asPattern.test(content)) {
    content = content.replace(asPattern, `$1 ${JSON.stringify(fix.allowedSceneTypes)}`);
  }

  // 替换 requiredTags
  const rtPattern = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?requiredTags:)\\s*\\[[^\\]]*\\]`);
  if (rtPattern.test(content)) {
    content = content.replace(rtPattern, `$1 ${JSON.stringify(fix.requiredTags)}`);
  }

  // 替换 themeStrictness
  const tsPattern = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?themeStrictness:)\\s*'[^']*'`);
  if (tsPattern.test(content)) {
    content = content.replace(tsPattern, `$1 '${fix.themeStrictness}'`);
  }

  // 替换 forbiddenTags
  const ftPattern = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?forbiddenTags:)\\s*\\[[^\\]]*\\]`);
  if (ftPattern.test(content)) {
    content = content.replace(ftPattern, `$1 ${JSON.stringify(fix.forbiddenTags)}`);
  }

  fixCount++;
  console.log(`[FIX] ${id}: requiredTags=${fix.requiredTags.join(',')}, strictness=${fix.themeStrictness}`);
}

writeFileSync(filepath, content, 'utf-8');
console.log(`\n✅ Done! Fixed ${fixCount} stories.`);
