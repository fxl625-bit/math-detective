/**
 * 全局标签分类体系 (v2.7.3)
 *
 * 所有 question 和 story 只能使用此文件中定义的枚举值。
 * 不允许随手新增字符串标签。
 */

// ========== SceneType：题目场景类型 ==========
// 每道题有且只有一个 sceneType

export const SCENE_TYPES = [
  'generic',           // 通用数学题，无明确场景
  'supermarket',       // 超市购物
  'toy_store',         // 玩具店
  'pet_shop',          // 宠物店
  'candy_store',       // 糖果店/零食店
  'canteen',           // 食堂/餐厅
  'home_food',         // 家庭食物（冰箱、做饭、早餐）
  'animal_grass',      // 草地动物（兔子、小鸟）
  'animal_domestic',   // 家养动物（猫、狗、宠物）
  'playground',        // 操场/运动场
  'sports',            // 运动/比赛
  'geometry',          // 图形/几何
  'age_family',        // 年龄/家庭
  'logic_race',        // 逻辑排序/比赛名次
  'sequence_pattern',  // 数列/规律
  'planting_route',    // 植树/路线/间隔
  'library',           // 图书馆
  'school',            // 校园
  'money_bank',        // 银行/理财
  'science_lab',       // 科学实验室
  'ocean',             // 海洋
  'party',             // 派对/生日
  'stationery',        // 文具
  'fruit',             // 水果
  'garden',            // 花园/种植
] as const;

export type SceneType = typeof SCENE_TYPES[number];

// ========== ThemeTag：主题标签 ==========
// 每道题可以有多个 themeTags

export const THEME_TAGS = [
  // 购物相关
  'shopping', 'price', 'money', 'discount', 'change', 'total',
  // 玩具相关
  'toy', 'toy_car', 'doll', 'blocks', 'stationery_toy',
  // 宠物相关
  'pet', 'pet_food', 'cat', 'dog', 'rabbit', 'animal',
  // 食物相关
  'food', 'snack', 'dairy', 'yogurt', 'fridge', 'baozi', 'bun',
  'candy', 'sweet', 'fruit', 'apple', 'bread', 'cake', 'mooncake',
  'breakfast', 'canteen_food',
  // 操场/运动
  'playground', 'flag', 'sports', 'race', 'ball', 'running',
  // 几何
  'geometry', 'shape', 'triangle', 'square', 'circle', 'angle', 'area', 'perimeter',
  // 年龄/家庭
  'age', 'family', 'father', 'mother', 'son', 'daughter',
  // 逻辑
  'logic', 'ranking', 'ordering', 'truth',
  // 数列/规律
  'sequence', 'pattern', 'arithmetic_sequence',
  // 植树/间隔
  'planting', 'interval', 'road', 'one_side', 'both_sides',
  // 海洋
  'ocean', 'shell', 'crab', 'fish',
  // 校园
  'school', 'library', 'book', 'charity',
  // 科学
  'science', 'lab', 'experiment',
  // 金融
  'bank', 'interest', 'percent',
  // 派对
  'party', 'birthday', 'cake_party',
  // 通用
  'generic', 'quantity',
] as const;

export type ThemeTag = typeof THEME_TAGS[number];

// ========== Domain：数学领域 ==========
export const DOMAINS = [
  'addition_subtraction',
  'multiplication_division',
  'comparison',
  'money',
  'time',
  'measurement',
  'geometry',
  'fractions',
  'decimals',
  'percent',
  'ratio',
  'equation_thinking',
  'pattern',
  'logic_reasoning',
  'word_problem_reading',
] as const;

export type Domain = typeof DOMAINS[number];

// ========== ProblemType：题型 ==========
export const PROBLEM_TYPES = [
  'basic_arithmetic',
  'multi_step',
  'information_check',
  'identify_extra_info',
  'remove_noise',
  'shape_counting',
  'planting_problem',
  'age_problem',
  'ratio_distribution',
  'logic_ranking',
  'logic_truth',
  'logic_ordering',
  'sequence_arithmetic',
  'pattern',
  'equal_sharing',
  'multiplicative_comparison',
  'grouping',
  'comparison',
  'visual_counting',
  'unknown',
] as const;

export type ProblemType = typeof PROBLEM_TYPES[number];

// ========== AnswerType：答案类型 ==========
export const ANSWER_TYPES = [
  'number',
  'text',
  'ranking',
  'multi_answer',
  'choice',
  'expression',
  'not_enough_information',
] as const;

export type AnswerType = typeof ANSWER_TYPES[number];

// ========== StepType：关卡类型 ==========
export const STEP_TYPES = [
  'find_numbers',
  'find_action_words',
  'simulation',
  'remove_noise',
  'full_solve',
  'find_compare_numbers',
  'spot_extra_info',
  'spot_missing_info',
] as const;

export type StepType = typeof STEP_TYPES[number];

// ========== ThemeStrictness：主题严格程度 ==========
export const THEME_STRICTNESSES = ['strict', 'semi_strict', 'generic'] as const;
export type ThemeStrictness = typeof THEME_STRICTNESSES[number];

// ========== 互斥矩阵：哪些标签不能进入哪些场景 ==========

/**
 * forbiddenMatrix[sceneType] = 该场景禁止的 themeTags
 *
 * 这是全局规则，所有 story 共享。
 * story 级别的 forbiddenTags 是额外叠加的。
 */
export const FORBIDDEN_MATRIX: Record<string, ThemeTag[]> = {
  toy_store: [
    'food', 'snack', 'dairy', 'yogurt', 'fridge', 'baozi', 'bun',
    'candy', 'sweet', 'fruit', 'apple', 'bread', 'cake', 'mooncake',
    'breakfast', 'canteen_food',
    'pet', 'pet_food', 'cat', 'dog', 'rabbit', 'animal',
    'playground', 'flag', 'sports', 'race', 'ball', 'running',
    'geometry', 'shape', 'triangle', 'square', 'circle', 'angle', 'area', 'perimeter',
    'age', 'family', 'father', 'mother', 'son', 'daughter',
    'logic', 'ranking', 'ordering', 'truth',
    'sequence', 'pattern', 'arithmetic_sequence',
    'planting', 'interval', 'road', 'one_side', 'both_sides',
    'ocean', 'shell', 'crab', 'fish',
  ],
  pet_shop: [
    'food', 'snack', 'dairy', 'yogurt', 'fridge', 'baozi', 'bun',
    'candy', 'sweet', 'fruit', 'apple', 'bread', 'cake', 'mooncake',
    'breakfast', 'canteen_food',
    'toy', 'toy_car', 'doll', 'blocks', 'stationery_toy',
    'playground', 'flag', 'sports', 'race', 'ball', 'running',
    'geometry', 'shape', 'triangle', 'square', 'circle', 'angle', 'area', 'perimeter',
    'age', 'family', 'father', 'mother', 'son', 'daughter',
    'logic', 'ranking', 'ordering', 'truth',
    'sequence', 'pattern', 'arithmetic_sequence',
    'planting', 'interval', 'road', 'one_side', 'both_sides',
    'ocean', 'shell', 'crab', 'fish',
  ],
  supermarket: [
    'rabbit', 'animal', 'pet', 'pet_food', 'cat', 'dog',
    'playground', 'flag',
    'geometry', 'shape', 'triangle', 'square', 'circle', 'angle',
    'age', 'family', 'father', 'mother',
    'logic', 'ranking', 'ordering', 'truth',
    'sequence', 'pattern', 'arithmetic_sequence',
    'planting', 'interval', 'road',
    'ocean', 'shell', 'crab', 'fish',
  ],
  candy_store: [
    'pet', 'pet_food', 'cat', 'dog', 'rabbit', 'animal',
    'toy', 'toy_car', 'doll', 'blocks', 'stationery_toy',
    'playground', 'flag', 'sports', 'race', 'ball',
    'geometry', 'shape', 'triangle', 'square', 'circle', 'angle',
    'age', 'family', 'father', 'mother',
    'logic', 'ranking', 'ordering', 'truth',
    'sequence', 'pattern', 'arithmetic_sequence',
    'planting', 'interval', 'road',
    'ocean', 'shell', 'crab', 'fish',
  ],
  canteen: [
    'pet', 'pet_food', 'cat', 'dog', 'rabbit', 'animal',
    'toy', 'toy_car', 'doll', 'blocks', 'stationery_toy',
    'playground', 'flag', 'sports', 'race', 'ball',
    'geometry', 'shape', 'triangle', 'square', 'circle', 'angle',
    'age', 'family', 'father', 'mother',
    'logic', 'ranking', 'ordering', 'truth',
    'sequence', 'pattern', 'arithmetic_sequence',
    'planting', 'interval', 'road',
    'ocean', 'shell', 'crab', 'fish',
  ],
  home_food: [
    'pet', 'pet_food', 'cat', 'dog', 'rabbit', 'animal',
    'toy', 'toy_car', 'doll', 'blocks', 'stationery_toy',
    'playground', 'flag', 'sports', 'race', 'ball',
    'geometry', 'shape', 'triangle', 'square', 'circle', 'angle',
    'logic', 'ranking', 'ordering', 'truth',
    'sequence', 'pattern', 'arithmetic_sequence',
    'planting', 'interval', 'road',
    'ocean', 'shell', 'crab', 'fish',
  ],
  playground: [
    'food', 'snack', 'dairy', 'yogurt', 'fridge', 'baozi', 'bun',
    'candy', 'sweet', 'fruit', 'apple', 'bread', 'cake',
    'shopping', 'price', 'money', 'discount', 'change',
    'toy', 'toy_car', 'doll', 'blocks', 'stationery_toy',
    'pet', 'pet_food', 'cat', 'dog',
    'geometry', 'shape', 'triangle', 'square', 'circle', 'angle',
    'age', 'family', 'father', 'mother',
    'logic', 'ranking', 'ordering', 'truth',
    'sequence', 'pattern', 'arithmetic_sequence',
    'planting', 'interval', 'road',
    'ocean', 'shell', 'crab', 'fish',
  ],
  geometry: [
    'food', 'snack', 'dairy', 'yogurt', 'fridge', 'baozi', 'bun',
    'shopping', 'price', 'money', 'discount',
    'toy', 'toy_car', 'doll', 'blocks', 'stationery_toy',
    'pet', 'pet_food', 'cat', 'dog', 'rabbit', 'animal',
    'playground', 'flag', 'sports', 'race', 'ball',
    'age', 'family', 'father', 'mother',
    'logic', 'ranking', 'ordering', 'truth',
    'sequence', 'pattern', 'arithmetic_sequence',
    'planting', 'interval', 'road',
    'ocean', 'shell', 'crab', 'fish',
  ],
  age_family: [
    'shopping', 'price', 'money', 'discount', 'change', 'total',
    'food', 'snack', 'dairy', 'yogurt', 'fridge', 'baozi', 'bun',
    'toy', 'toy_car', 'doll', 'blocks', 'stationery_toy',
    'pet', 'pet_food', 'cat', 'dog', 'rabbit', 'animal',
    'playground', 'flag', 'sports', 'race', 'ball',
    'geometry', 'shape', 'triangle', 'square', 'circle', 'angle',
    'logic', 'ranking', 'ordering', 'truth',
    'sequence', 'pattern', 'arithmetic_sequence',
    'planting', 'interval', 'road',
    'ocean', 'shell', 'crab', 'fish',
  ],
  logic_race: [
    'shopping', 'price', 'money', 'discount', 'change', 'total',
    'food', 'snack', 'dairy', 'yogurt', 'fridge', 'baozi', 'bun',
    'toy', 'toy_car', 'doll', 'blocks', 'stationery_toy',
    'pet', 'pet_food', 'cat', 'dog', 'rabbit', 'animal',
    'geometry', 'shape', 'triangle', 'square', 'circle', 'angle',
    'planting', 'interval', 'road',
    'ocean', 'shell', 'crab', 'fish',
  ],
  planting_route: [
    'shopping', 'price', 'money', 'discount',
    'food', 'snack', 'dairy', 'yogurt', 'fridge',
    'toy', 'toy_car', 'doll', 'blocks', 'stationery_toy',
    'pet', 'pet_food', 'cat', 'dog', 'rabbit', 'animal',
    'playground', 'flag', 'sports', 'race', 'ball',
    'geometry', 'shape', 'triangle', 'square', 'circle', 'angle',
    'age', 'family', 'father', 'mother',
    'logic', 'ranking', 'ordering', 'truth',
    'ocean', 'shell', 'crab', 'fish',
  ],
  sequence_pattern: [
    'shopping', 'price', 'money', 'discount',
    'food', 'snack', 'dairy', 'yogurt', 'fridge',
    'toy', 'toy_car', 'doll', 'blocks', 'stationery_toy',
    'pet', 'pet_food', 'cat', 'dog', 'rabbit', 'animal',
    'playground', 'flag', 'sports', 'race', 'ball',
    'geometry', 'shape', 'triangle', 'square', 'circle', 'angle',
    'age', 'family', 'father', 'mother',
    'planting', 'interval', 'road',
    'ocean', 'shell', 'crab', 'fish',
  ],
};

// ========== 辅助函数 ==========

/**
 * 检查 sceneType 是否有效
 */
export function isValidSceneType(s: string): s is SceneType {
  return (SCENE_TYPES as readonly string[]).includes(s);
}

/**
 * 检查 themeTag 是否有效
 */
export function isValidThemeTag(t: string): t is ThemeTag {
  return (THEME_TAGS as readonly string[]).includes(t);
}

/**
 * 获取场景的全局禁止标签
 */
export function getForbiddenTagsForScene(sceneType: string): ThemeTag[] {
  return FORBIDDEN_MATRIX[sceneType] || [];
}
