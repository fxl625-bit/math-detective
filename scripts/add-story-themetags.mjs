/**
 * 为每个 Story 添加 allowedSceneTypes / themeTags / forbiddenTags
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const filepath = join(ROOT, 'data', 'stories.ts');
let content = readFileSync(filepath, 'utf-8');

// 每个 story 的主题标签
const STORY_TAGS = {
  forest_shop_theft: {
    allowedSceneTypes: ['shopping', 'animal_grass', 'animal', 'forest', 'generic'],
    themeTags: ['shopping', 'animal', 'forest', 'food', 'quantity'],
    forbiddenTags: ['playground', 'geometry', 'age', 'competition', 'ocean', 'interval'],
  },
  pond_duckling_mystery: {
    allowedSceneTypes: ['animal_grass', 'animal', 'forest', 'ocean', 'generic'],
    themeTags: ['animal', 'bird', 'forest', 'nature', 'quantity'],
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'interval'],
  },
  bunny_carrot_garden: {
    allowedSceneTypes: ['animal_grass', 'animal', 'forest', 'garden', 'food_fruit', 'generic'],
    themeTags: ['rabbit', 'animal', 'garden', 'food', 'forest', 'quantity'],
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'interval'],
  },
  ocean_shell_treasure: {
    allowedSceneTypes: ['ocean', 'generic'],
    themeTags: ['ocean', 'nature', 'quantity'],
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'interval'],
  },
  crab_sandcastle: {
    allowedSceneTypes: ['ocean', 'generic'],
    themeTags: ['ocean', 'nature', 'quantity'],
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'interval'],
  },
  school_canteen_mystery: {
    allowedSceneTypes: ['food_meal', 'food', 'snack', 'generic'],
    themeTags: ['food', 'snack', 'school', 'quantity'],
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'interval', 'ocean'],
  },
  playground_ball_mystery: {
    allowedSceneTypes: ['sports', 'playground', 'generic'],
    themeTags: ['sports', 'playground', 'school', 'quantity'],
    forbiddenTags: ['shopping', 'geometry', 'age', 'competition', 'ocean', 'interval'],
  },
  candy_shop_inventory: {
    allowedSceneTypes: ['snack', 'shopping', 'food', 'generic'],
    themeTags: ['snack', 'food', 'shopping', 'quantity'],
    forbiddenTags: ['playground', 'geometry', 'age', 'competition', 'ocean', 'interval'],
  },
  toy_store_puzzle: {
    allowedSceneTypes: ['shopping', 'generic'],
    themeTags: ['shopping', 'toy', 'quantity'],
    forbiddenTags: ['playground', 'geometry', 'age', 'competition', 'ocean', 'interval'],
  },
  birthday_party_math: {
    allowedSceneTypes: ['party', 'food', 'generic'],
    themeTags: ['party', 'food', 'family', 'quantity'],
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'ocean', 'interval'],
  },
  pet_shop_adventure: {
    allowedSceneTypes: ['animal_grass', 'animal', 'shopping', 'pet', 'generic'],
    themeTags: ['animal', 'pet', 'shopping', 'quantity'],
    forbiddenTags: ['playground', 'geometry', 'age', 'competition', 'ocean', 'interval'],
  },
  supermarket_price_puzzle: {
    allowedSceneTypes: ['shopping', 'snack', 'food', 'stationery', 'generic'],
    themeTags: ['shopping', 'price', 'money', 'quantity'],
    forbiddenTags: ['rabbit', 'animal', 'playground', 'flag', 'interval', 'age', 'geometry', 'competition', 'ocean', 'planting'],
  },
  science_lab_data: {
    allowedSceneTypes: ['generic', 'math'],
    themeTags: ['science', 'math', 'quantity'],
    forbiddenTags: ['shopping', 'playground', 'age', 'competition', 'ocean'],
  },
  charity_sale_ledger: {
    allowedSceneTypes: ['shopping', 'school', 'money', 'generic'],
    themeTags: ['shopping', 'money', 'school', 'quantity'],
    forbiddenTags: ['playground', 'geometry', 'age', 'competition', 'ocean', 'interval'],
  },
  library_overdue_research: {
    allowedSceneTypes: ['school', 'generic'],
    themeTags: ['school', 'library', 'quantity'],
    forbiddenTags: ['shopping', 'playground', 'geometry', 'age', 'competition', 'ocean', 'interval'],
  },
  sports_day_scoring: {
    allowedSceneTypes: ['sports', 'competition', 'playground', 'generic'],
    themeTags: ['sports', 'competition', 'school', 'quantity'],
    forbiddenTags: ['shopping', 'geometry', 'age', 'ocean', 'interval'],
  },
  observatory_data_cloud: {
    allowedSceneTypes: ['generic', 'math', 'science'],
    themeTags: ['science', 'math', 'quantity'],
    forbiddenTags: ['shopping', 'playground', 'age', 'competition', 'ocean'],
  },
  city_planning_ratio: {
    allowedSceneTypes: ['geometry', 'generic', 'math'],
    themeTags: ['geometry', 'engineering', 'math', 'ratio'],
    forbiddenTags: ['shopping', 'playground', 'age', 'competition', 'ocean'],
  },
  bank_interest_case: {
    allowedSceneTypes: ['money', 'shopping', 'generic', 'math'],
    themeTags: ['money', 'finance', 'math', 'percent'],
    forbiddenTags: ['playground', 'age', 'competition', 'ocean', 'interval'],
  },
  map_scale_mystery: {
    allowedSceneTypes: ['geometry', 'generic', 'math'],
    themeTags: ['geometry', 'ratio', 'adventure', 'math'],
    forbiddenTags: ['shopping', 'playground', 'age', 'competition', 'ocean'],
  },
};

// 为每个 story 插入标签
let fixCount = 0;
for (const [id, tags] of Object.entries(STORY_TAGS)) {
  // 找到 rewardHint 行后插入
  const rewardPattern = new RegExp(
    `(id:\\s*'${id}'[\\s\\S]*?rewardHint:\\s*'[^']*')`,
  );
  const match = content.match(rewardPattern);
  if (!match) {
    console.warn(`[SKIP] ${id} not found`);
    continue;
  }

  // 检查是否已有 allowedSceneTypes
  if (match[0].includes('allowedSceneTypes:')) {
    console.log(`[SKIP] ${id} already has allowedSceneTypes`);
    continue;
  }

  // 在 rewardHint 后插入
  const insertText = `,\n    allowedSceneTypes: ${JSON.stringify(tags.allowedSceneTypes)},\n    themeTags: ${JSON.stringify(tags.themeTags)},\n    forbiddenTags: ${JSON.stringify(tags.forbiddenTags)}`;

  content = content.replace(
    match[1],
    match[1] + insertText,
  );
  fixCount++;
  console.log(`[FIX] ${id} → added themeTags`);
}

writeFileSync(filepath, content, 'utf-8');
console.log(`\n✅ Done! Fixed ${fixCount} stories.`);
