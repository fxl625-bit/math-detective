// ========== 年级与领域 ==========

export type ProblemType =
  | 'basic_arithmetic'
  | 'multi_step'
  | 'information_check'
  | 'planting_problem'
  | 'age_problem'
  | 'shape_counting'
  | 'pattern'              // v2.6.7: 规律题
  | 'ratio_distribution'
  | 'logic_ranking'
  | 'logic_truth'
  | 'logic_ordering'
  | 'unknown';

export interface RankingAnswer {
  first: string;
  second?: string;
  third?: string;
  fourth?: string;
  fifth?: string;
  order?: string[];
}

export interface Statement {
  speaker: string;
  text: string;
  means: string;
}

export interface SolutionStepDetailed {
  stepTitle: string;
  explanation: string;
  /** v2.6.7: 该步骤是否直接暴露最终答案（答题前默认隐藏） */
  revealsAnswer?: boolean;
}

export type AnswerType = 'number' | 'text' | 'ranking' | 'equation' | 'choice';

/** v2.6.6: 排名选择题选项 */
export interface RankingOption {
  id: string;
  label: string;
  order: string[];
  correct: boolean;
}

/** v2.6.6: 分层提示等级 */
export type HintLevel = 'light' | 'medium' | 'full';

/** v2.6.6: 结构化分层提示 */
export interface StructuredHints {
  light: string;
  medium?: string;
  fullSteps?: SolutionStepDetailed[];
}

export type GradeBand = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'OlympiadIntro';

export type MathDomain =
  | 'addition_subtraction'
  | 'multiplication_division'
  | 'comparison'
  | 'money'
  | 'time'
  | 'measurement'
  | 'geometry'
  | 'fractions'
  | 'decimals'
  | 'percent'
  | 'ratio'
  | 'equation_thinking'
  | 'pattern'
  | 'logic_reasoning'
  | 'word_problem_reading';

export type CognitiveSkill =
  | 'find_numbers'
  | 'find_keywords'
  | 'remove_noise'
  | 'understand_question'
  | 'choose_operation'
  | 'find_compare_numbers'
  | 'spot_extra_info'
  | 'spot_missing_info'
  | 'build_model'
  | 'multi_step_reasoning'
  | 'estimate'
  | 'explain_reasoning';

export type OperationType =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'mixed'
  | 'comparison'
  | 'fraction'
  | 'decimal'
  | 'geometry'
  | 'logic'
  | 'ratio';

// ========== 统一题型体系 (v2.6 P0修复) ==========

/** 关卡/教学目标类型 */
export type LessonType =
  | 'number_clue'           // 找到数字线索
  | 'add_sub_action'        // 找到动作线索（加减）
  | 'compare_more_less'     // 比较多少线索
  | 'equal_groups_intro'    // 几个一样多
  | 'times_intro'           // 认识倍
  | 'guarantee_worst_case'  // 保证问题/最坏情况/抽屉原理
  | 'irrelevant_info'       // 识别多余信息
  | 'logic_reasoning'       // 逻辑推理（排序/排除/判断）
  | 'planting_interval'     // 植树/间隔问题
  | 'geometry_count';       // 图形计数

/** 关键词类型 */
export type KeywordType =
  | 'add_action'            // 增加：来了、又来了、加入等
  | 'subtract_action'       // 减少：走了、吃掉、用掉等
  | 'compare'               // 比较：比……多、比……少、差几
  | 'equal_groups'          // 一样多的份：每份、每组、每人
  | 'times_intro'           // 倍：倍、几倍
  | 'guarantee_worst_case'  // 保证/最坏情况：至少、保证、一定
  | 'number_extract'        // 数字线索：题干中明确出现数字
  | 'logic_condition'        // 逻辑条件：不是、比谁快、排第几
  | 'irrelevant_info';      // 多余信息：年龄、颜色、编号等

/** 数字角色分类 */
export type NumberRole = 'useful_number' | 'background_number' | 'irrelevant_number';

// LessonType -> LessonStepType 映射
export const LESSON_TYPE_TO_STEP_TYPE: Record<LessonType, LessonStepType> = {
  number_clue: 'find_numbers',
  add_sub_action: 'find_action_words',
  compare_more_less: 'find_compare_numbers',
  equal_groups_intro: 'find_compare_numbers',
  times_intro: 'find_compare_numbers',
  guarantee_worst_case: 'find_action_words',  // 独立关卡类型
  irrelevant_info: 'spot_extra_info',
  logic_reasoning: 'full_solve',              // 独立推理关卡
  planting_interval: 'full_solve',
  geometry_count: 'full_solve',
};

// 每种 lessonType 允许的 keywordType
export const ALLOWED_KEYWORD_TYPES: Record<LessonType, KeywordType[]> = {
  number_clue: ['number_extract'],
  add_sub_action: ['add_action', 'subtract_action'],
  compare_more_less: ['compare', 'number_extract'],
  equal_groups_intro: ['equal_groups'],
  times_intro: ['times_intro'],
  guarantee_worst_case: ['guarantee_worst_case'],
  irrelevant_info: ['irrelevant_info', 'number_extract'],
  logic_reasoning: ['logic_condition'],
  planting_interval: ['number_extract'],
  geometry_count: ['number_extract'],
};

// 每种 lessonType 禁止的 keywordType
export const FORBIDDEN_KEYWORD_TYPES: Record<LessonType, KeywordType[]> = {
  number_clue: ['logic_condition', 'guarantee_worst_case', 'times_intro'],
  add_sub_action: ['guarantee_worst_case', 'times_intro', 'compare', 'equal_groups', 'logic_condition'],
  compare_more_less: ['guarantee_worst_case', 'times_intro', 'logic_condition'],
  equal_groups_intro: ['guarantee_worst_case', 'add_action', 'subtract_action'],
  times_intro: ['guarantee_worst_case', 'add_action', 'subtract_action', 'logic_condition'],
  guarantee_worst_case: ['add_action', 'subtract_action', 'times_intro', 'compare'],
  irrelevant_info: ['guarantee_worst_case', 'logic_condition'],
  logic_reasoning: ['number_extract', 'add_action', 'subtract_action', 'times_intro'],
  planting_interval: ['guarantee_worst_case', 'logic_condition'],
  geometry_count: ['guarantee_worst_case', 'logic_condition'],
};

// ========== 错误类型 ==========

export type ErrorType =
  | 'number_missing'
  | 'keyword_missing'
  | 'operation_wrong'
  | 'equation_wrong'
  | 'answer_wrong'
  | 'noise_wrong'
  | 'unit_missing'
  | 'meaning_wrong';

// ========== 题目可视化 ==========

export interface QuestionVisual {
  itemName: string;
  itemEmoji: string;
  unit: string;
  scene: string;
}

// ========== 题目 ==========

export interface KeywordItem {
  word: string;
  type: 'add' | 'subtract' | 'multiply' | 'divide';
}

/** 题目校验结果 */
export interface QuestionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  questionId: string;
  lessonType: LessonType | null;
  keywordType: KeywordType | null;
  grade: GradeBand;
}

export interface Question {
  id: string;
  gradeBand: GradeBand;
  domain: MathDomain;
  cognitiveSkills: CognitiveSkill[];
  text: string;
  numbers: number[];
  keywords: KeywordItem[];
  noisePhrases: string[];
  usefulPhrases: string[];
  questionMeaningOptions: string[];
  correctMeaning: string;
  operation: OperationType;
  equation: string;
  answer: number | string;
  answerSentence: string;
  explanation: string;
  solutionSteps: string[];
  hints: string[];
  /** v2.6.6: 结构化分层提示（替代 hints 数组用于逻辑题） */
  structuredHints?: StructuredHints;
  difficulty: 1 | 2 | 3 | 4 | 5;
  category: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';
  visualKey: string;
  requiresAnswer: boolean;
  stepCompatibility?: LessonStepType[];
  isExtendedThinking?: boolean;
  extraNumbers?: number[];
  isInsufficient?: boolean;
  gradeFriendlyEquation?: Partial<Record<GradeBand, string>>;
  /** v2.6 P0修复：统一题型分类 */
  lessonType?: LessonType;
  /** v2.6 P0修复：关键词类型 */
  keywordType?: KeywordType;
  /** v2.6 P0修复：案件编号 */
  caseId?: string;
  /** v2.6 P0修复：关卡编号 */
  levelId?: string;
  /** v2.6 P0修复：故事标题 */
  storyTitle?: string;
  /** v2.6.5: 题型分类 */
  problemType?: ProblemType;
  /** v2.6.5: 是否需要列算式（逻辑题/排序题不需要） */
  requiresEquation?: boolean;
  /** v2.6.5: 答案类型 */
  answerType?: AnswerType;
  /** v2.6.5: 场景类型 */
  sceneType?: string;
  /** v2.6.5: 主题标签 */
  themeTags?: string[];
  /** v2.6.5: 逻辑排序题人物列表 */
  people?: string[];
  /** v2.6.5: 逻辑排序题陈述 */
  statements?: Statement[];
  /** v2.6.5: 排序答案 */
  correctRanking?: RankingAnswer;
  /** v2.6.6: 排名选择题选项 */
  rankingOptions?: RankingOption[];
  /** v2.6.5: 详细解题步骤 */
  solutionStepsDetailed?: SolutionStepDetailed[];
}

// ========== 关卡阶段 ==========

export type StepPhase =
  | 'read'
  | 'find_numbers'
  | 'find_keywords'
  | 'remove_noise'
  | 'simulation'
  | 'choose_operation'
  | 'build_equation'
  | 'answer'
  | 'explain'
  | 'find_compare_numbers'
  | 'spot_extra_info'
  | 'spot_missing_info'
  | 'understand_clues'
  | 'logic_elimination'
  | 'ranking_answer'
  | 'completed';

export type LessonStepType =
  | 'find_numbers'
  | 'find_action_words'
  | 'simulation'
  | 'remove_noise'
  | 'full_solve'
  | 'find_compare_numbers'
  | 'spot_extra_info'
  | 'spot_missing_info';

export const STEP_DEFAULT_PHASES: Record<LessonStepType, StepPhase[]> = {
  find_numbers: ['read', 'find_numbers', 'completed'],
  find_action_words: ['read', 'find_keywords', 'choose_operation', 'completed'],
  simulation: ['read', 'simulation', 'choose_operation', 'answer', 'completed'],
  remove_noise: ['read', 'remove_noise', 'build_equation', 'answer', 'completed'],
  full_solve: ['read', 'find_numbers', 'find_keywords', 'choose_operation', 'build_equation', 'answer', 'explain', 'completed'],
  find_compare_numbers: ['read', 'find_numbers', 'find_compare_numbers', 'choose_operation', 'answer', 'completed'],
  spot_extra_info: ['read', 'find_numbers', 'spot_extra_info', 'answer', 'completed'],
  spot_missing_info: ['read', 'spot_missing_info', 'answer', 'completed'],
};

export interface LessonStep {
  id: string;
  type: LessonStepType;
  title: string;
  description: string;
  questionId: string;
  phases: StepPhase[];
  currentPhaseIndex: number;
  status: 'locked' | 'current' | 'completed';
  requiresAnswer: boolean;
}

export interface TodayLesson {
  date: string;
  steps: LessonStep[];
  currentStepIndex: number;
  completed: boolean;
  caseStoryId?: string;
  /** v2.6.3: 完成时间 */
  completedAt?: string;
  /** v2.6.3: 奖励是否已发放（防重复加星） */
  rewardClaimed?: boolean;
  /** v2.6.3: 奖励弹窗是否已展示（防重复弹） */
  rewardShown?: boolean;
  /** v2.6.3: 奖励发放时间 */
  rewardClaimedAt?: string;
  /** v2.6.3: 奖励弹窗展示时间 */
  rewardShownAt?: string;
}

// ========== 错题记录 ==========

export interface MistakeRecord {
  questionId: string;
  questionText: string;
  myAnswer: number | string;
  correctAnswer: number | string;
  errorType: string;
  date: string;
  retriedCorrect: boolean;
}

// ========== 徽章 ==========

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

// ========== 奖励 ==========

export interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  type: 'parent' | 'virtual';
}

// ========== 家长自定义奖励 ==========

export interface ParentReward {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  enabled: boolean;
  createdAt: string;
}

export interface RewardRedemption {
  id: string;
  rewardId: string;
  rewardName: string;
  starsSpent: number;
  redeemedAt: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

// ========== 家长验证记录 ==========

export interface ParentGateAttempt {
  id: string;
  attemptedAt: string;
  question: string;
  inputAnswer: string;
  correct: boolean;
  reason: 'wrong_answer' | 'empty_answer' | 'cancelled' | 'success';
}

// ========== 虚拟奖励 ==========

export interface VirtualReward {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockCondition: string;
  category: 'badge' | 'decoration' | 'treasure' | 'streak';
}

export const DEFAULT_PARENT_REWARDS: Omit<ParentReward, 'id' | 'createdAt'>[] = [
  {
    name: '让爸爸妈妈陪自己玩10分钟',
    description: '兑换后请找爸爸妈妈确认',
    cost: 50,
    icon: '🎮',
    enabled: true,
  },
  {
    name: '获得一张小贴纸',
    description: '由家长线下发放',
    cost: 80,
    icon: '⭐',
    enabled: true,
  },
  {
    name: '周末亲子活动一次',
    description: '由家长决定具体活动',
    cost: 200,
    icon: '🎪',
    enabled: true,
  },
];

// ========== 明日预告 ==========

export interface TomorrowLessonPreview {
  date: string;
  stepCount: number;
  stepTypes: LessonStepType[];
  difficultyRange: { min: number; max: number };
  gradeBand: GradeBand;
  sampleQuestionPreview: string;
  estimatedStars: number;
}

// ========== 家长设置 ==========

export interface ParentSettings {
  gradeBand: GradeBand;
  dailyGoal: number;
  maxDifficulty: number;
}

// ========== 学习画像 ==========

export interface WeeklySnapshot {
  weekStart: string;
  skills: Record<string, { correct: number; total: number }>;
  totalCorrect: number;
  totalWrong: number;
}

export interface LearningProfile {
  gradeBand: GradeBand;
  streakDays: number;
  recentAccuracy: number;
  weakSkills: CognitiveSkill[];
  dailyQuestionCount: number;
  skillLevel: number;
}

// ========== 全局状态 ==========

export interface GameState {
  stars: number;
  streak: number;
  lastPlayDate: string;
  lastCheckinDate: string;
  completedToday: number;
  totalCompleted: number;
  correctCount: number;
  wrongCount: number;
  answerAttempts: number;
  level: number;
  badges: string[];
  completedQuestions: string[];
  mistakes: MistakeRecord[];
  resumeCards: number;
  parentSettings: ParentSettings;
  lastStreakCheckDate: string;
  skillMistakes: Record<string, number>;
  parentRewards: ParentReward[];
  rewardRedemptions: RewardRedemption[];
  parentGateAttempts: ParentGateAttempt[];
  weeklySnapshots: WeeklySnapshot[];
  skillLevel: number;
  decorations: string[];
  collectibleCards: string[];
  questionReviewDates: Record<string, string>;
  questionReviewCounts: Record<string, number>;
}

export const DEFAULT_GAME_STATE: GameState = {
  stars: 0,
  streak: 0,
  lastPlayDate: '',
  lastCheckinDate: '',
  completedToday: 0,
  totalCompleted: 0,
  correctCount: 0,
  wrongCount: 0,
  answerAttempts: 0,
  level: 1,
  badges: [],
  completedQuestions: [],
  mistakes: [],
  resumeCards: 1,
  parentSettings: {
    gradeBand: 'G1',
    dailyGoal: 5,
    maxDifficulty: 2,
  },
  lastStreakCheckDate: '',
  skillMistakes: {},
  parentRewards: [],
  rewardRedemptions: [],
  parentGateAttempts: [],
  weeklySnapshots: [],
  skillLevel: 1,
  decorations: [],
  collectibleCards: [],
  questionReviewDates: {},
  questionReviewCounts: {},
};
