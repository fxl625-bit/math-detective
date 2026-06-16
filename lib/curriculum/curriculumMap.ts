/**
 * v2.9.0: Curriculum Map — Grade × Semester × Textbook knowledge point mapping
 *
 * Maps each grade/semester to a set of knowledge points (SkillIds)
 * with difficulty levels and category classification.
 */

import type {
  KnowledgePoint,
  TextbookEdition,
  Semester,
  SkillId,
  DifficultyDistribution,
  DailyDifficultyPlan,
} from './types';

// ========== G1 Lower Semester (一年级下学期) — Current Target ==========

const G1_LOWER_KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // Core: Addition within 20 (no borrowing)
  {
    id: 'addition_subtraction:addition_within_20',
    name: '20以内不进位加法',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: ['addition_subtraction:addition_within_10'],
    description: '一位数加一位数（和在20以内）及十几加几',
  },
  // Core: Subtraction within 20 (borrowing) — KEY skill
  {
    id: 'addition_subtraction:subtraction_within_20_borrowing',
    name: '20以内退位减法',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: ['addition_subtraction:subtraction_within_10'],
    description: '如 13-5, 15-8 等需要退位的减法',
  },
  {
    id: 'addition_subtraction:two_digit_plus_one_digit',
    name: '两位数加一位数（不进位）',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: ['addition_subtraction:addition_within_20'],
    description: '如 12+5, 23+6',
  },
  {
    id: 'addition_subtraction:two_digit_minus_one_digit',
    name: '两位数减一位数（不退位）',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: ['addition_subtraction:subtraction_within_20_borrowing'],
    description: '如 18-4, 27-3',
  },
  {
    id: 'addition_subtraction:two_digit_plus_tens',
    name: '两位数加整十数',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: ['number:counting_within_100'],
    description: '如 23+30, 45+20',
  },
  {
    id: 'addition_subtraction:two_digit_minus_tens',
    name: '两位数减整十数',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: ['number:counting_within_100'],
    description: '如 56-30, 48-20',
  },
  {
    id: 'addition_subtraction:addition_within_100',
    name: '100以内加法（基础）',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: [
      'addition_subtraction:two_digit_plus_one_digit',
      'addition_subtraction:two_digit_plus_tens',
    ],
    description: '100以内两位数加减法的综合运用',
  },
  {
    id: 'addition_subtraction:subtraction_within_100',
    name: '100以内减法（基础）',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: [
      'addition_subtraction:two_digit_minus_one_digit',
      'addition_subtraction:two_digit_minus_tens',
    ],
    description: '100以内减法的综合运用',
  },
  // Number sense
  {
    id: 'number:counting_within_100',
    name: '100以内数的认识',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: [],
    description: '数数、读写、数的组成、大小比较',
  },
  {
    id: 'number:order_within_100',
    name: '100以内数的顺序',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: ['number:counting_within_100'],
    description: '数的大小比较、相邻数、排序',
  },
  {
    id: 'number:comparison_within_100',
    name: '100以内数的比较',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: ['number:counting_within_100'],
    description: '用"多几""少几"描述数量关系',
  },
  // Money
  {
    id: 'money:rmb_recognition',
    name: '人民币认识',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: ['number:counting_within_100'],
    description: '认识元、角、分及其换算关系',
  },
  {
    id: 'money:simple_shopping',
    name: '简单购物问题',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: ['money:rmb_recognition', 'addition_subtraction:subtraction_within_100'],
    description: '用加减法解决简单的购物情境',
  },
  // Comparison & Unknown
  {
    id: 'comparison:difference_comparison',
    name: '求相差数',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: ['addition_subtraction:subtraction_within_20_borrowing'],
    description: 'A比B多几/少几 → 用减法',
  },
  {
    id: 'unknown:unknown_addend',
    name: '求未知加数',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: ['addition_subtraction:addition_within_20'],
    description: '如 5+?=12，用减法求加数',
  },
  {
    id: 'unknown:unknown_subtrahend',
    name: '求未知减数',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: ['addition_subtraction:subtraction_within_20_borrowing'],
    description: '如 ?-4=8，用加法求减数',
  },
  // Geometry
  {
    id: 'geometry:plane_shapes',
    name: '平面图形认识',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: [],
    description: '认识长方形、正方形、三角形、圆',
  },
  {
    id: 'geometry:shape_counting',
    name: '数图形',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: ['geometry:plane_shapes'],
    description: '在组合图形中数出各类图形个数',
  },
  {
    id: 'classification:classify_objects',
    name: '分类与整理',
    grade: 1, semester: 'lower', category: 'core',
    prerequisites: [],
    description: '按不同标准分类、计数',
  },
  // Pattern
  {
    id: 'pattern:simple_patterns',
    name: '简单规律',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: [],
    description: '发现和延续简单数字或图形规律',
  },
  {
    id: 'pattern:advanced_patterns',
    name: '复杂规律',
    grade: 1, semester: 'lower', category: 'stretch',
    prerequisites: ['pattern:simple_patterns'],
    description: '周期规律、间隔规律',
  },
  // Information skills
  {
    id: 'information:identify_extra_information',
    name: '识别多余信息',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: ['addition_subtraction:single_digit_addition'],
    description: '辨别题目中与计算无关的干扰信息',
  },
  {
    id: 'information:insufficient_information',
    name: '判断信息是否充足',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: [],
    description: '识别题目缺少必要条件的情况',
  },
  // Logic & reasoning
  {
    id: 'logic:simple_ordering',
    name: '简单排序推理',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: [],
    description: '根据比较关系排出顺序',
  },
  {
    id: 'logic:ranking',
    name: '排名推理',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: ['logic:simple_ordering'],
    description: '根据多条线索推断排名',
  },
  {
    id: 'logic:equivalence',
    name: '等量代换',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: [],
    description: '简单的等量替换（如苹果换橘子）',
  },
  {
    id: 'logic:enumeration',
    name: '有序枚举',
    grade: 1, semester: 'lower', category: 'stretch',
    prerequisites: [],
    description: '有规律地列出所有可能情况',
  },
  {
    id: 'reasoning:reverse_unknown',
    name: '逆向推理',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: ['addition_subtraction:addition_within_20'],
    description: '从结果反推原来的数量',
  },
  {
    id: 'reasoning:missing_number',
    name: '数字谜',
    grade: 1, semester: 'lower', category: 'applied',
    prerequisites: ['addition_subtraction:addition_within_20'],
    description: '在算式中找出缺失的数字',
  },
  // Measurement (stretch)
  {
    id: 'measurement:interval_planting',
    name: '间隔问题',
    grade: 1, semester: 'lower', category: 'stretch',
    prerequisites: ['addition_subtraction:addition_within_20'],
    description: '植树/挂灯笼等间隔问题（画图解决）',
  },
  {
    id: 'measurement:periodic_sequence',
    name: '周期问题',
    grade: 1, semester: 'lower', category: 'stretch',
    prerequisites: ['pattern:simple_patterns'],
    description: '按规律循环排列，求第N个是什么',
  },
];

// ========== G1 Upper Semester (一年级上学期) — Review for lower-semester students ==========

const G1_UPPER_KNOWLEDGE_POINTS: KnowledgePoint[] = [
  {
    id: 'addition_subtraction:single_digit_addition',
    name: '10以内加法',
    grade: 1, semester: 'upper', category: 'core',
    prerequisites: [],
    description: '10以内的加法（如 3+5, 6+4）',
  },
  {
    id: 'addition_subtraction:single_digit_subtraction',
    name: '10以内减法',
    grade: 1, semester: 'upper', category: 'core',
    prerequisites: ['addition_subtraction:single_digit_addition'],
    description: '10以内的减法（如 9-3, 8-5）',
  },
  {
    id: 'addition_subtraction:addition_within_10',
    name: '10以内连加',
    grade: 1, semester: 'upper', category: 'core',
    prerequisites: ['addition_subtraction:single_digit_addition'],
    description: '10以内的连续加法',
  },
  {
    id: 'addition_subtraction:subtraction_within_10',
    name: '10以内连减',
    grade: 1, semester: 'upper', category: 'core',
    prerequisites: ['addition_subtraction:single_digit_subtraction'],
    description: '10以内的连续减法',
  },
  {
    id: 'number:composition_within_100',
    name: '数的组成与分解',
    grade: 1, semester: 'upper', category: 'core',
    prerequisites: [],
    description: '10以内数的组成与分解',
  },
];

// ========== Curriculum Map ==========

export interface CurriculumEntry {
  grade: number;
  semester: Semester;
  knowledgePoints: KnowledgePoint[];
}

const CURRICULUM_MAP: Record<string, CurriculumEntry> = {
  'G1_upper': { grade: 1, semester: 'upper', knowledgePoints: G1_UPPER_KNOWLEDGE_POINTS },
  'G1_lower': { grade: 1, semester: 'lower', knowledgePoints: G1_LOWER_KNOWLEDGE_POINTS },
  // G2+ stubs — will be populated when those grades need support
  'G2_upper': { grade: 2, semester: 'upper', knowledgePoints: [] },
  'G2_lower': { grade: 2, semester: 'lower', knowledgePoints: [] },
  'G3_upper': { grade: 3, semester: 'upper', knowledgePoints: [] },
  'G3_lower': { grade: 3, semester: 'lower', knowledgePoints: [] },
};

// ========== Difficulty Distribution per Usage Stage ==========

const DIFFICULTY_DISTRIBUTIONS: Record<number, DifficultyDistribution> = {
  0: { review: 0.30, currentCore: 0.40, application: 0.20, stretch: 0.10 },
  1: { review: 0.15, currentCore: 0.55, application: 0.20, stretch: 0.10 },
  2: { review: 0.05, currentCore: 0.65, application: 0.20, stretch: 0.10 },
  3: { review: 0.05, currentCore: 0.65, application: 0.20, stretch: 0.10 },
};

// ========== Daily Lesson Difficulty Plan ==========

const DAILY_DIFFICULTY_PLANS: Record<number, DailyDifficultyPlan> = {
  0: { slotDifficulties: [1, 1, 2, 2, 2, 2], stretchSlots: 0 },
  1: { slotDifficulties: [2, 2, 3, 3, 3, 3], stretchSlots: 0 },
  2: { slotDifficulties: [2, 2, 3, 3, 3, 4], stretchSlots: 0 },
  3: { slotDifficulties: [2, 3, 3, 3, 4, 5], stretchSlots: 1 },
};

// ========== Lookup Functions ==========

export function getCurriculumEntry(
  grade: number,
  semester: Semester,
  _textbook?: TextbookEdition
): CurriculumEntry | null {
  const key = `G${grade}_${semester}`;
  return CURRICULUM_MAP[key] || null;
}

export function getKnowledgePointsForGrade(
  grade: number,
  semester: Semester,
): KnowledgePoint[] {
  const entry = getCurriculumEntry(grade, semester);
  return entry?.knowledgePoints || [];
}

export function getCoreSkillsForGrade(grade: number, semester: Semester): SkillId[] {
  return getKnowledgePointsForGrade(grade, semester)
    .filter(kp => kp.category === 'core')
    .map(kp => kp.id);
}

export function getAppliedSkillsForGrade(grade: number, semester: Semester): SkillId[] {
  return getKnowledgePointsForGrade(grade, semester)
    .filter(kp => kp.category === 'applied')
    .map(kp => kp.id);
}

export function getStretchSkillsForGrade(grade: number, semester: Semester): SkillId[] {
  return getKnowledgePointsForGrade(grade, semester)
    .filter(kp => kp.category === 'stretch')
    .map(kp => kp.id);
}

export function getDifficultyDistribution(usageStage: number): DifficultyDistribution {
  return DIFFICULTY_DISTRIBUTIONS[usageStage] || DIFFICULTY_DISTRIBUTIONS[2];
}

export function getDailyDifficultyPlan(usageStage: number): DailyDifficultyPlan {
  return DAILY_DIFFICULTY_PLANS[usageStage] || DAILY_DIFFICULTY_PLANS[2];
}

export function getAllG1LowerSkillIds(): SkillId[] {
  return G1_LOWER_KNOWLEDGE_POINTS.map(kp => kp.id);
}

export function getAllG1UpperSkillIds(): SkillId[] {
  return G1_UPPER_KNOWLEDGE_POINTS.map(kp => kp.id);
}

export function getKnowledgePointById(id: SkillId): KnowledgePoint | undefined {
  const all = [...G1_LOWER_KNOWLEDGE_POINTS, ...G1_UPPER_KNOWLEDGE_POINTS];
  return all.find(kp => kp.id === id);
}
