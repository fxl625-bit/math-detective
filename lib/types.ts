// ========== 年级与领域 ==========

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
  | 'logic';

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
  difficulty: 1 | 2 | 3 | 4 | 5;
  category: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';
  visualKey: string;
  requiresAnswer: boolean;
  stepCompatibility?: LessonStepType[];
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
  | 'completed';

export type LessonStepType =
  | 'find_numbers'
  | 'find_action_words'
  | 'simulation'
  | 'remove_noise'
  | 'full_solve';

export const STEP_DEFAULT_PHASES: Record<LessonStepType, StepPhase[]> = {
  find_numbers: ['read', 'find_numbers', 'completed'],
  find_action_words: ['read', 'find_keywords', 'choose_operation', 'completed'],
  simulation: ['read', 'simulation', 'choose_operation', 'answer', 'completed'],
  remove_noise: ['read', 'remove_noise', 'build_equation', 'answer', 'completed'],
  full_solve: ['read', 'find_numbers', 'find_keywords', 'choose_operation', 'build_equation', 'answer', 'explain', 'completed'],
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
  olympiadEnabled: boolean;
  maxDifficulty: number;
}

// ========== 学习画像 ==========

export interface LearningProfile {
  gradeBand: GradeBand;
  streakDays: number;
  recentAccuracy: number;
  weakSkills: CognitiveSkill[];
  unlockedOlympiad: boolean;
  dailyQuestionCount: number;
}

// ========== 全局状态 ==========

export interface GameState {
  stars: number;
  streak: number;
  lastPlayDate: string;
  completedToday: number;
  totalCompleted: number;
  correctCount: number;
  wrongCount: number;
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
}

export const DEFAULT_GAME_STATE: GameState = {
  stars: 0,
  streak: 0,
  lastPlayDate: '',
  completedToday: 0,
  totalCompleted: 0,
  correctCount: 0,
  wrongCount: 0,
  level: 1,
  badges: [],
  completedQuestions: [],
  mistakes: [],
  resumeCards: 1,
  parentSettings: {
    gradeBand: 'G1',
    dailyGoal: 5,
    olympiadEnabled: false,
    maxDifficulty: 2,
  },
  lastStreakCheckDate: '',
  skillMistakes: {},
  parentRewards: [],
  rewardRedemptions: [],
  parentGateAttempts: [],
};
