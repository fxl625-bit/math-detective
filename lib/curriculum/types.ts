/**
 * v2.9.0: Curriculum type system
 *
 * Defines types for semester-aware curriculum mapping,
 * learner profiling, and adaptive difficulty.
 */

// ========== Textbook & Semester ==========

export type TextbookEdition = 'PEP' | 'BNUP' | 'XISHi' | 'generic_cn';

export type Semester = 'upper' | 'lower';

// ========== Skill IDs (domain:specific_skill) ==========

export type SkillId =
  // --- Addition & Subtraction ---
  | 'addition_subtraction:single_digit_addition'
  | 'addition_subtraction:single_digit_subtraction'
  | 'addition_subtraction:addition_within_10'
  | 'addition_subtraction:subtraction_within_10'
  | 'addition_subtraction:addition_within_20'
  | 'addition_subtraction:subtraction_within_20_no_borrowing'
  | 'addition_subtraction:subtraction_within_20_borrowing'
  | 'addition_subtraction:two_digit_plus_one_digit'
  | 'addition_subtraction:two_digit_minus_one_digit'
  | 'addition_subtraction:two_digit_plus_tens'
  | 'addition_subtraction:two_digit_minus_tens'
  | 'addition_subtraction:addition_within_100'
  | 'addition_subtraction:subtraction_within_100'
  // --- Number Sense ---
  | 'number:counting_within_100'
  | 'number:composition_within_100'
  | 'number:order_within_100'
  | 'number:comparison_within_100'
  // --- Comparison & Unknown ---
  | 'comparison:difference_comparison'
  | 'unknown:unknown_addend'
  | 'unknown:unknown_subtrahend'
  // --- Money ---
  | 'money:rmb_recognition'
  | 'money:simple_shopping'
  | 'money:shopping_and_change'
  // --- Geometry ---
  | 'geometry:plane_shapes'
  | 'geometry:shape_counting'
  | 'classification:classify_objects'
  // --- Pattern ---
  | 'pattern:simple_patterns'
  | 'pattern:advanced_patterns'
  // --- Word Problem Reading ---
  | 'information:identify_extra_information'
  | 'information:insufficient_information'
  // --- Logic & Reasoning ---
  | 'logic:simple_ordering'
  | 'logic:ranking'
  | 'logic:equivalence'
  | 'logic:enumeration'
  | 'reasoning:reverse_unknown'
  | 'reasoning:missing_number'
  // --- Measurement ---
  | 'measurement:interval_planting'
  | 'measurement:periodic_sequence'
  // --- Multiplication (G2+) ---
  | 'multiplication:equal_groups_intro'
  | 'multiplication:repeated_addition'
  | 'comparison:multiplicative_comparison_intro'
  | 'multi_step:multi_condition_reading'
  | 'word_problem:two_step_word_problem';

// ========== Mastery Tracking ==========

export type MasteryStatus = 'unseen' | 'learning' | 'practicing' | 'mastered';

export interface SkillMastery {
  skillId: SkillId;
  attempts: number;
  correct: number;
  firstTryCorrect: number;
  streakCorrect: number;
  streakWrong: number;
  masteryScore: number;        // 0-100
  lastPracticedAt: string;     // ISO 8601
  status: MasteryStatus;
  currentDifficulty: 1 | 2 | 3 | 4 | 5;
}

// ========== Curriculum Profile ==========

export interface CurriculumProfile {
  country: string;              // 'CN'
  textbookEdition: TextbookEdition;
  grade: number;                // 1-6
  semester: Semester;           // auto-detected
  semesterOverride?: Semester;  // manual override
  detectedAt: string;           // ISO 8601
}

// ========== Learner Profile ==========

export interface LearnerProfile {
  curriculumProfile: CurriculumProfile;
  skillMastery: Record<string, SkillMastery>;
  currentDifficultyLevel: number;
  startedAt: string;
  totalCompleted: number;
  recentAccuracy: number;
  recentFirstTryAccuracy: number;
  averageAttempts: number;
  fullHintRate: number;
  difficultyBias: number;       // -1 to 1 (negative = easier, positive = harder)
}

// ========== Usage Stage ==========

export type UsageStage = 0 | 1 | 2 | 3;
// 0: New user (0-3 days, <10 completed)
// 1: Beginner (4-14 days, 10-30 completed)
// 2: Active (15-45 days, 30-100 completed)
// 3: Experienced (45+ days, 100+ completed)

export interface UsageStageInfo {
  stage: UsageStage;
  daysSinceStart: number;
  totalCompleted: number;
  description: string;
  /** Recommended review ratio for this stage */
  reviewRatio: number;
}

// ========== Difficulty Distribution ==========

export interface DifficultyDistribution {
  /** Review / prior semester skills (should be low for experienced users) */
  review: number;       // default 0.05
  /** Current semester core skills */
  currentCore: number;  // default 0.65
  /** Applied / word-problem variants */
  application: number; // default 0.20
  /** Stretch / next-semester preview */
  stretch: number;      // default 0.10
}

// ========== Question Annotation ==========

export interface CurriculumAnnotation {
  skillIds: SkillId[];
  difficulty: number;         // 1-5
  curriculumGrade: number;    // 1-6
  curriculumSemester: Semester | 'both';
  isReview: boolean;
  isStretch: boolean;
  prerequisiteSkills?: SkillId[];
}

// ========== Daily Lesson Structure ==========

export interface DailyDifficultyPlan {
  /** 6 slots per day, each slot specifies target difficulty */
  slotDifficulties: number[];
  /** How many slots are "occasional stretch" (L5) */
  stretchSlots: number;
}

// ========== Curriculum Knowledge Point ==========

export interface KnowledgePoint {
  id: SkillId;
  name: string;
  grade: number;
  semester: Semester;
  category: string;       // 'core' | 'applied' | 'stretch'
  prerequisites: SkillId[];
  description: string;
}
