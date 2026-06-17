/**
 * v2.9.1: Adaptive Difficulty Engine
 *
 * Core logic for selecting questions based on:
 * 1. Usage stage → determines review/core/applied/stretch ratio
 * 2. Semester progress → late/review stages use fixed slot layout
 * 3. Daily difficulty plan → determines per-slot difficulty target
 * 4. Assessment tier → filters questions by textbook/practice/test/challenge
 * 5. Skill mastery → reduces frequency of mastered skills, prioritizes learning/practicing
 * 6. Curriculum semester → prioritizes current semester skills
 */

import type {
  SkillId,
  LearnerProfile,
  UsageStage,
  DifficultyDistribution,
  DailyDifficultyPlan,
  Semester,
  SkillMastery,
  SemesterProgress,
} from '@/lib/curriculum/types';
import type { Question, AssessmentTier } from '@/lib/types';
import {
  getDifficultyDistribution,
  getDailyDifficultyPlan,
  getCoreSkillsForGrade,
  getAppliedSkillsForGrade,
  getStretchSkillsForGrade,
  getAllG1UpperSkillIds,
} from '@/lib/curriculum/curriculumMap';
import { detectUsageStage } from './learnerProfile';

// ========== v2.9.1: Fixed 6-slot layout for late G1 lower ==========
//
// Slot 1: 20以内退位减法 — practice (L2)
// Slot 2: 100以内数的认识 — practice (L2-3)
// Slot 3: 100以内加减法 — test (L3)
// Slot 4: 生活应用 — test (L3)
// Slot 5: 两步/逆向/信息筛选 — test (L3-4)
// Slot 6: 二年级预习/挑战 — challenge (L4)

export interface FixedSlotDefinition {
  category: 'review' | 'currentCore' | 'application' | 'stretch';
  assessmentTier: AssessmentTier;
  targetDifficulty: number;
  skillFilter?: string[]; // skillId prefixes to filter by
}

const FIXED_LATE_G1_LOWER_SLOTS: FixedSlotDefinition[] = [
  {
    category: 'currentCore',
    assessmentTier: 'practice',
    targetDifficulty: 2,
    skillFilter: ['addition_subtraction:subtraction_within_20_borrowing'],
  },
  {
    category: 'currentCore',
    assessmentTier: 'practice',
    targetDifficulty: 3,
    skillFilter: ['number:counting_within_100', 'number:order_within_100', 'number:composition_within_100', 'number:comparison_within_100'],
  },
  {
    category: 'currentCore',
    assessmentTier: 'test',
    targetDifficulty: 3,
    skillFilter: ['addition_subtraction:addition_within_100', 'addition_subtraction:subtraction_within_100', 'addition_subtraction:two_digit_plus_one_digit', 'addition_subtraction:two_digit_minus_one_digit', 'addition_subtraction:two_digit_plus_tens', 'addition_subtraction:two_digit_minus_tens'],
  },
  {
    category: 'application',
    assessmentTier: 'test',
    targetDifficulty: 3,
    skillFilter: ['money:', 'information:identify_extra_information', 'classification:'],
  },
  {
    category: 'application',
    assessmentTier: 'test',
    targetDifficulty: 4,
    skillFilter: ['reasoning:', 'word_problem:', 'unknown:', 'comparison:', 'pattern:', 'logic:'],
  },
  {
    category: 'stretch',
    assessmentTier: 'challenge',
    targetDifficulty: 4,
    skillFilter: ['multiplication:', 'measurement:', 'pattern:advanced_patterns', 'logic:enumeration'],
  },
];

// ========== Skill Priority ==========

/**
 * Compute skill selection priority.
 * Returns a score (higher = more likely to be selected).
 *
 * Prioritization:
 * - unseen skills: highest priority (100)
 * - learning skills with low mastery: high priority (80-60)
 * - practicing skills: medium priority (50-30)
 * - mastered skills: low priority (10-20)
 * - review (prior semester) skills: medium priority if not mastered (40)
 */
function computeSkillPriority(
  mastery: SkillMastery | undefined,
  isReviewSkill: boolean,
  usageStage: number,
): number {
  if (!mastery || mastery.status === 'unseen') {
    return isReviewSkill ? 40 : 100;
  }

  if (mastery.status === 'mastered') {
    return isReviewSkill ? 5 : 15;
  }

  if (mastery.status === 'practicing') {
    return isReviewSkill ? 20 : 50 - (mastery.masteryScore / 4);
  }

  // learning
  const base = isReviewSkill ? 30 : 70;
  return base - (mastery.masteryScore / 3);
}

// ========== Question Pool Filtering ==========

/**
 * Filter and score questions for a specific difficulty slot.
 * Returns scored questions ready for weighted random selection.
 */
export function selectQuestionsForSlot(params: {
  pool: Question[];
  targetDifficulty: number;
  learnerProfile: LearnerProfile;
  usageStage: UsageStage;
  grade: number;
  semester: Semester;
  excludeIds: string[];
  slotCategory: 'review' | 'currentCore' | 'application' | 'stretch';
  /** v2.9.1: Assessment tier filter */
  assessmentTier?: AssessmentTier;
  /** v2.9.1: Skill prefix filter (e.g., 'addition_subtraction:subtraction_within_20') */
  skillFilter?: string[];
}): Question[] {
  const {
    pool,
    targetDifficulty,
    learnerProfile,
    usageStage,
    grade,
    semester,
    excludeIds,
    slotCategory,
    assessmentTier,
    skillFilter,
  } = params;

  const excludeSet = new Set(excludeIds);
  const distribution = getDifficultyDistribution(usageStage);

  // Determine which skillIds are valid for this slot category
  let validSkillIds: Set<string>;

  switch (slotCategory) {
    case 'review':
      validSkillIds = new Set(getAllG1UpperSkillIds());
      break;
    case 'currentCore':
      validSkillIds = new Set(getCoreSkillsForGrade(grade, semester));
      break;
    case 'application':
      validSkillIds = new Set(getAppliedSkillsForGrade(grade, semester));
      break;
    case 'stretch':
      validSkillIds = new Set(getStretchSkillsForGrade(grade, semester));
      break;
    default:
      validSkillIds = new Set();
  }

  const candidates = pool.filter(q => {
    // Must not be already used
    if (excludeSet.has(q.id)) return false;

    // v2.10.2: Exclude single-digit arithmetic for experienced users
    if (usageStage >= 2) {
      const qSkills = (q.skillIds || []) as string[];
      const isSingleDigit = qSkills.some(s =>
        s === 'addition_subtraction:single_digit_addition' ||
        s === 'addition_subtraction:single_digit_subtraction' ||
        s === 'addition_subtraction:addition_within_10' ||
        s === 'addition_subtraction:subtraction_within_10'
      );
      if (isSingleDigit) {
        // Allow only if the user has recent errors on this exact skill
        // (future: check skillMastery for errors)
        return false;
      }
    }

    // v2.10.0 Sub-project C: assessmentTier filter — also reject unannotated
    if (assessmentTier && q.assessmentTier !== assessmentTier) return false;

    // v2.9.1: Skill prefix filter
    if (skillFilter && skillFilter.length > 0) {
      const qSkills = (q.skillIds || []) as string[];
      const matchesSkillFilter = skillFilter.some(prefix =>
        qSkills.some(s => s.startsWith(prefix))
      );
      if (!matchesSkillFilter) return false;
    }

    // v2.10.0 Sub-project C: Must have at least one valid skillId
    const qSkills = (q.skillIds || []) as string[];
    if (qSkills.length === 0) {
      if (slotCategory === 'review' && q.isReview) return true;
      if (slotCategory === 'stretch' && q.isStretch) return true;
      // v2.10.0: Old unannotated questions only pass through 'review' or 'stretch'
      // Never pass them as currentCore — this was the silent fallback hole
      return false;
    }

    // Must match target difficulty (allow ±1 for pool diversity)
    if (q.difficulty < targetDifficulty - 1 || q.difficulty > targetDifficulty + 1) return false;

    return qSkills.some((s: string) => validSkillIds.has(s));
  });

  // Score each candidate
  const scored = candidates.map(q => {
    const qSkills = (q.skillIds || []) as SkillId[];
    let maxPriority = 0;

    for (const skillId of qSkills) {
      const mastery = learnerProfile.skillMastery[skillId];
      const isReview = q.isReview || false;
      const priority = computeSkillPriority(mastery, isReview, usageStage);
      maxPriority = Math.max(maxPriority, priority);
    }

    // Bonus for exact difficulty match
    const diffBonus = q.difficulty === targetDifficulty ? 10 : 0;

    // Penalty for mastered skills
    const masteryPenalty = qSkills.some((s: string) => learnerProfile.skillMastery[s]?.status === 'mastered') ? -20 : 0;

    return { question: q, score: maxPriority + diffBonus + masteryPenalty };
  });

  // Sort by score descending, shuffle within same score
  scored.sort((a, b) => b.score - a.score);

  // Return top candidates (up to 10)
  return scored.slice(0, 10).map(s => s.question);
}

/**
 * Pick a single question from scored candidates using weighted random selection.
 */
export function pickQuestionFromCandidates(candidates: Question[]): Question | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Simple weighted random: top 3 get more weight
  const topN = Math.min(3, candidates.length);
  const weights = candidates.slice(0, topN).map((_, i) => topN - i);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let rand = Math.random() * totalWeight;
  for (let i = 0; i < topN; i++) {
    rand -= weights[i];
    if (rand <= 0) return candidates[i];
  }

  return candidates[0];
}

// ========== Daily Lesson Difficulty Plan ==========

/**
 * v2.9.1: Generate the slot categories for a daily lesson.
 *
 * For late/review G1 lower (usageStage >= 2, semesterProgress = 'late'|'review'),
 * uses a fixed 6-slot layout designed specifically for G1 lower late-semester review.
 *
 * For other stages/grade/semesters, uses the adaptive distribution from curriculumMap.
 */
export function generateDailySlotPlan(params: {
  usageStage: UsageStage;
  learnerProfile: LearnerProfile;
  grade: number;
  semester: Semester;
  semesterProgress?: SemesterProgress;
}): Array<{
  category: 'review' | 'currentCore' | 'application' | 'stretch';
  targetDifficulty: number;
  assessmentTier?: AssessmentTier;
  skillFilter?: string[];
}> {
  // v2.9.1: Fixed layout for late G1 lower (stage 2+, late/review semester progress)
  const isLateG1Lower =
    params.grade === 1 &&
    params.semester === 'lower' &&
    params.usageStage >= 2 &&
    (params.semesterProgress === 'late' || params.semesterProgress === 'review');

  if (isLateG1Lower) {
    return FIXED_LATE_G1_LOWER_SLOTS.map(slot => ({
      category: slot.category,
      targetDifficulty: slot.targetDifficulty,
      assessmentTier: slot.assessmentTier,
      skillFilter: slot.skillFilter,
    }));
  }

  // v2.9.0: Adaptive layout for other cases
  const plan = getDailyDifficultyPlan(params.usageStage);
  const distribution = getDifficultyDistribution(params.usageStage);

  const totalSlots = plan.slotDifficulties.length;
  const slots: Array<{
    category: 'review' | 'currentCore' | 'application' | 'stretch';
    targetDifficulty: number;
    assessmentTier?: AssessmentTier;
    skillFilter?: string[];
  }> = [];

  const reviewCount = Math.max(0, Math.round(distribution.review * totalSlots));
  const stretchCount = Math.max(0, Math.round(distribution.stretch * totalSlots));
  const coreCount = totalSlots - reviewCount - stretchCount;
  const appliedCount = Math.max(0, Math.round(distribution.application * (totalSlots - reviewCount - stretchCount)));
  const coreFinal = coreCount - appliedCount;

  // v2.9.1: Map assessment tiers to slots based on position and category
  const getSlotTier = (idx: number, cat: string): AssessmentTier => {
    if (cat === 'stretch') return 'challenge';
    if (cat === 'review') return 'practice';
    // Early slots → textbook/practice, middle → practice/test, late → test
    if (idx === 0) return 'practice';
    if (idx < 3) return 'practice';
    return 'test';
  };

  let reviewIdx = 0;
  let coreIdx = 0;
  let appliedIdx = 0;
  let stretchIdx = 0;

  for (let i = 0; i < totalSlots; i++) {
    const targetDiff = plan.slotDifficulties[i] || params.learnerProfile.currentDifficultyLevel;
    let category: 'review' | 'currentCore' | 'application' | 'stretch';

    if (reviewIdx < reviewCount) {
      category = 'review';
      reviewIdx++;
    } else if (coreIdx < coreFinal) {
      category = 'currentCore';
      coreIdx++;
    } else if (appliedIdx < appliedCount) {
      category = 'application';
      appliedIdx++;
    } else if (stretchIdx < stretchCount) {
      category = 'stretch';
      stretchIdx++;
    } else {
      category = 'currentCore';
    }

    slots.push({
      category,
      targetDifficulty: category === 'review' ? Math.min(targetDiff, 2) :
                        category === 'stretch' ? Math.max(targetDiff, 4) : targetDiff,
      assessmentTier: getSlotTier(i, category),
    });
  }

  return slots;
}

// ========== Single-Digit Ratio Control ==========

/**
 * For experienced users (stage 2+), limit single-digit questions to ≤10%.
 * Returns the maximum number of single-digit review questions allowed in a lesson.
 */
export function maxSingleDigitQuestions(usageStage: UsageStage, totalSlots: number): number {
  switch (usageStage) {
    case 0: return totalSlots; // New users: no restriction
    case 1: return Math.floor(totalSlots * 0.3); // 30%
    case 2:
    case 3:
    case 4:
    default: return Math.max(0, Math.floor(totalSlots * 0.10)); // ≤10%
  }
}

// ========== Question Distribution Diagnostics ==========

/**
 * Analyze the last N questions for distribution diagnostics.
 */
export interface DistributionDiagnostic {
  totalQuestions: number;
  singleDigitCount: number;
  singleDigitRatio: number;
  difficultyBreakdown: Record<number, number>;
  skillBreakdown: Record<string, number>;
  reviewCount: number;
  stretchCount: number;
  coreCount: number;
  appliedCount: number;
  averageDifficulty: number;
}

export function analyzeQuestionDistribution(
  recentQuestions: Question[],
): DistributionDiagnostic {
  if (recentQuestions.length === 0) {
    return {
      totalQuestions: 0,
      singleDigitCount: 0,
      singleDigitRatio: 0,
      difficultyBreakdown: {},
      skillBreakdown: {},
      reviewCount: 0,
      stretchCount: 0,
      coreCount: 0,
      appliedCount: 0,
      averageDifficulty: 0,
    };
  }

  const total = recentQuestions.length;
  let singleDigitCount = 0;
  let reviewCount = 0;
  let stretchCount = 0;
  let coreCount = 0;
  let appliedCount = 0;
  let diffSum = 0;
  const difficultyBreakdown: Record<number, number> = {};
  const skillBreakdown: Record<string, number> = {};

  for (const q of recentQuestions) {
    // Single-digit detection
    if (q.isReview && q.difficulty <= 1) singleDigitCount++;

    // Difficulty breakdown
    difficultyBreakdown[q.difficulty] = (difficultyBreakdown[q.difficulty] || 0) + 1;
    diffSum += q.difficulty;

    // Category
    if (q.isReview) reviewCount++;
    else if (q.isStretch) stretchCount++;
    else if (q.skillIds?.some((s: string) => s.includes('pattern') || s.includes('logic') || s.includes('measurement'))) {
      appliedCount++;
    }
    else coreCount++;

    // Skill breakdown
    for (const skillId of (q.skillIds || [])) {
      skillBreakdown[skillId] = (skillBreakdown[skillId] || 0) + 1;
    }
  }

  return {
    totalQuestions: total,
    singleDigitCount,
    singleDigitRatio: Math.round((singleDigitCount / total) * 100),
    difficultyBreakdown,
    skillBreakdown,
    reviewCount,
    stretchCount,
    coreCount,
    appliedCount,
    averageDifficulty: Math.round((diffSum / total) * 10) / 10,
  };
}
