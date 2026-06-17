/**
 * v2.9.1: Expanded curriculum type system
 *
 * Extends v2.9.0 types with:
 * - SemesterProgress (early/middle/late/review/summer_bridge)
 * - UsageStage 0-4 (added Stage 4 for advanced challenge)
 * - Six-dimensional DifficultyProfile (knowledge, reading, relation, noise, reasoning, transfer)
 * - AssessmentTier (textbook/practice/test/challenge)
 * - ReasoningFrame (structured problem-solving framework)
 * - CurriculumSkill / ReadingSkill separation
 * - TrainingMode and schoolHarder settings
 */

// ========== Textbook & Semester ==========

export type TextbookEdition = 'PEP' | 'BNUP' | 'XISHi' | 'generic_cn';

export type Semester = 'upper' | 'lower';

/** v2.9.1: Month-based semester progress for difficulty calibration */
export type SemesterProgress = 'early' | 'middle' | 'late' | 'review' | 'summer_bridge';

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
  | 'multiplication:simple_table_2_5_10'
  | 'comparison:multiplicative_comparison_intro'
  | 'multi_step:multi_condition_reading'
  | 'word_problem:two_step_word_problem'
  // --- Measurement (G2+) ---
  | 'measurement:length_units_intro'
  // --- Addition & Subtraction (G2+) ---
  | 'addition_subtraction:two_digit_plus_two_digit'
  | 'addition_subtraction:two_digit_minus_two_digit';

/** v2.9.1: G2 preview skill IDs for stretch questions */
export type G2PreviewSkillId =
  | 'multiplication:equal_groups_intro'
  | 'multiplication:repeated_addition'
  | 'multiplication:simple_table_2_5_10'
  | 'comparison:multiplicative_comparison_intro'
  | 'measurement:length_units_intro'
  | 'pattern:advanced_patterns'
  | 'logic:simple_ordering'
  | 'word_problem:two_step_word_problem'
  | 'addition_subtraction:two_digit_plus_two_digit'
  | 'addition_subtraction:two_digit_minus_two_digit';

// ========== Skill Category Separation ==========

/**
 * v2.9.1: True math knowledge skills.
 * Only these count toward "skill coverage" in reports.
 */
export type CurriculumSkill =
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
  | 'number:counting_within_100'
  | 'number:composition_within_100'
  | 'number:order_within_100'
  | 'number:comparison_within_100'
  | 'comparison:difference_comparison'
  | 'unknown:unknown_addend'
  | 'unknown:unknown_subtrahend'
  | 'money:rmb_recognition'
  | 'money:simple_shopping'
  | 'money:shopping_and_change'
  | 'geometry:plane_shapes'
  | 'geometry:shape_counting'
  | 'classification:classify_objects'
  | 'pattern:simple_patterns'
  | 'pattern:advanced_patterns'
  | 'logic:simple_ordering'
  | 'logic:ranking'
  | 'logic:equivalence'
  | 'logic:enumeration'
  | 'reasoning:reverse_unknown'
  | 'reasoning:missing_number'
  | 'multiplication:equal_groups_intro'
  | 'multiplication:repeated_addition'
  | 'multiplication:simple_table_2_5_10'
  | 'measurement:length_units_intro'
  | 'addition_subtraction:two_digit_plus_two_digit'
  | 'addition_subtraction:two_digit_minus_two_digit';

/**
 * v2.9.1: Reading/comprehension skills — NOT math knowledge.
 * Used for diagnostic, not for skill coverage counting.
 */
export type ReadingSkill =
  | 'reading:identify_known_facts'
  | 'reading:identify_target'
  | 'reading:identify_noise_phrase'
  | 'reading:identify_irrelevant_number'
  | 'reading:information_sufficiency'
  | 'reading:relation_understanding'
  | 'reading:plan_solution'
  | 'reading:check_answer';

/**
 * v2.9.1: Lesson step types — UI workflow, NOT skills.
 */
export type LessonWorkflowStep =
  | 'read'
  | 'find_numbers'
  | 'find_action_words'
  | 'remove_noise'
  | 'identify_extra_info'
  | 'plan'
  | 'answer'
  | 'explain';

// ========== Assessment Tier ==========

/**
 * v2.9.1: Four-tier assessment difficulty model.
 * Reflects how questions appear in real school contexts.
 */
export type AssessmentTier = 'textbook' | 'practice' | 'test' | 'challenge';

/** v2.9.1: Six-dimensional difficulty profile */
export interface DifficultyProfile {
  /** Knowledge complexity: how hard is the underlying math concept */
  knowledgeLevel: 1 | 2 | 3 | 4 | 5;
  /** Reading load: text length, language complexity, condition ordering */
  readingLoad: 1 | 2 | 3 | 4 | 5;
  /** Relation complexity: how hard to establish relationships between conditions */
  relationComplexity: 1 | 2 | 3 | 4 | 5;
  /** Information noise: irrelevant text, irrelevant numbers, hidden conditions */
  informationNoise: 1 | 2 | 3 | 4 | 5;
  /** Reasoning steps: how many steps needed to solve */
  reasoningSteps: 1 | 2 | 3 | 4 | 5;
  /** Transfer level: textbook direct → variant → test-type → challenge migration */
  transferLevel: 1 | 2 | 3 | 4 | 5;
}

/** v2.9.1: Structured reasoning framework for word problems */
export interface ReasoningFrame {
  /** What does the problem tell us? */
  knownFacts: Array<{
    text: string;
    quantity?: number | string;
    unit?: string;
    object?: string;
    role: string;
  }>;
  /** What does the problem ask us to find? */
  targetQuestion: {
    text: string;
    targetQuantity: string;
    targetUnit?: string;
    questionType: string; // 'find_total' | 'find_remaining' | 'find_difference' | 'find_original' | 'find_part' | 'find_pattern' | 'find_groups' | 'other'
  };
  /** How do I plan to solve it? */
  plan: {
    firstStep: string;
    secondStep?: string;
    thirdStep?: string;
    operationReason: string;
  };
  /** Post-solve check */
  check: {
    answeredTarget: boolean;
    unitCorrect: boolean;
    resultReasonable: boolean;
  };
}

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
  /** v2.9.1: Month-based progress within semester */
  semesterProgress?: SemesterProgress;
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
  /** v2.9.1: Consecutive check-in streak */
  consecutiveCheckInDays?: number;
}

// ========== Usage Stage (upgraded 0-4) ==========

export type UsageStage = 0 | 1 | 2 | 3 | 4;
// 0: New user — initial diagnosis, first 10-15 questions
// 1: Beginner — first 30 questions or <7 days
// 2: Active — current semester core, 30+ completed
// 3: Comprehensive & test adaptation — 30+ days OR 60+ completed OR 10+ check-in days OR core skills mastered
// 4: Advanced challenge — 85%+ accuracy on recent 20, low hint usage, most core skills mastered

export interface UsageStageInfo {
  stage: UsageStage;
  daysSinceStart: number;
  totalCompleted: number;
  description: string;
  /** Recommended review ratio for this stage */
  reviewRatio: number;
  /** v2.9.1: G2 preview ratio for this stage */
  stretchPreviewRatio: number;
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
  /** v2.9.1: True math knowledge skills (subset of skillIds) */
  curriculumSkills?: SkillId[];
  /** v2.9.1: Reading/comprehension skills (subset of skillIds) */
  readingSkills?: ReadingSkill[];
  difficulty: number;         // 1-5
  /** v2.9.1: Six-dimensional difficulty profile */
  difficultyProfile?: DifficultyProfile;
  /** v2.9.1: Assessment tier */
  assessmentTier?: AssessmentTier;
  curriculumGrade: number;    // 1-6
  curriculumSemester: Semester | 'both';
  isReview: boolean;
  isStretch: boolean;
  /** v2.9.1: Structured reasoning framework */
  reasoningFrame?: ReasoningFrame;
  /** v2.9.1: Whether this question requires explicit planning step */
  requiresPlan?: boolean;
  /** v2.9.1: Whether this is a two-step problem */
  isTwoStep?: boolean;
  prerequisiteSkills?: SkillId[];
}

// ========== Daily Lesson Structure ==========

export interface DailyDifficultyPlan {
  /** 6 slots per day, each slot specifies target difficulty */
  slotDifficulties: number[];
  /** How many slots are "occasional stretch" (L5) */
  stretchSlots: number;
  /** v2.9.1: Assessment tier targets per slot */
  slotAssessmentTiers?: AssessmentTier[];
  /** v2.9.1: Whether this plan targets G1 late review mode */
  isReviewMode?: boolean;
}

// ========== Training Mode ==========

export type TrainingMode = 'basic_consolidation' | 'school_sync' | 'test_adaptation' | 'thinking_challenge' | 'adaptive';

export interface TrainingPreferences {
  mode: TrainingMode;
  /** v2.9.1: "school exercises are harder" — increases test-tier ratio */
  schoolHarder: boolean;
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

// ========== Calibration Data ==========

export type CalibrationCategory =
  | 'grade1LowerTextbook'
  | 'grade1LowerPractice'
  | 'grade1LowerUnitTest'
  | 'grade1LowerMidterm'
  | 'grade1LowerFinal'
  | 'grade2UpperPreview';

export interface CalibrationQuestion {
  id: string;
  questionText: string;
  curriculumSkills: SkillId[];
  assessmentTier: AssessmentTier;
  difficultyProfile: DifficultyProfile;
  reasoningFrame: ReasoningFrame;
  sourceType: CalibrationCategory;
  reviewed: boolean;
  reviewNotes?: string;
}

// ========== Supply Audit ==========

export interface SkillSupplyInfo {
  skillId: SkillId;
  skillName: string;
  totalCount: number;
  textbookCount: number;
  practiceCount: number;
  testCount: number;
  challengeCount: number;
  deficit: boolean;
}
