/**
 * v2.9.0: Adaptive Difficulty Engine
 *
 * Core logic for selecting questions based on:
 * 1. Usage stage → determines review/core/applied/stretch ratio
 * 2. Daily difficulty plan → determines per-slot difficulty target
 * 3. Skill mastery → reduces frequency of mastered skills, prioritizes learning/practicing
 * 4. Curriculum semester → prioritizes current semester skills
 */

import type {
  SkillId,
  LearnerProfile,
  UsageStage,
  DifficultyDistribution,
  DailyDifficultyPlan,
  Semester,
  SkillMastery,
} from '@/lib/curriculum/types';
import type { Question } from '@/lib/types';
import {
  getDifficultyDistribution,
  getDailyDifficultyPlan,
  getCoreSkillsForGrade,
  getAppliedSkillsForGrade,
  getStretchSkillsForGrade,
  getAllG1UpperSkillIds,
} from '@/lib/curriculum/curriculumMap';
import { detectUsageStage } from './learnerProfile';

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

    // Must match target difficulty (allow ±1 for pool diversity)
    if (q.difficulty < targetDifficulty - 1 || q.difficulty > targetDifficulty + 1) return false;

    // Must have at least one valid skillId
    const qSkills = q.skillIds || [];
    if (qSkills.length === 0) {
      // Fallback: for unannotated questions, use isReview/isStretch flags
      if (slotCategory === 'review' && q.isReview) return true;
      if (slotCategory === 'stretch' && q.isStretch) return true;
      if (slotCategory === 'currentCore' && !q.isReview && !q.isStretch) return true;
      if (slotCategory === 'application' && !q.isReview && !q.isStretch) return true;
      return false;
    }

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
 * Generate the slot categories for a daily lesson based on usage stage.
 * Returns 6 slots, each with category and target difficulty.
 */
export function generateDailySlotPlan(params: {
  usageStage: UsageStage;
  learnerProfile: LearnerProfile;
  grade: number;
  semester: Semester;
}): Array<{ category: 'review' | 'currentCore' | 'application' | 'stretch'; targetDifficulty: number }> {
  const plan = getDailyDifficultyPlan(params.usageStage);
  const distribution = getDifficultyDistribution(params.usageStage);

  // Build 6 slots according to distribution ratios
  const totalSlots = plan.slotDifficulties.length; // typically 6
  const slots: Array<{ category: 'review' | 'currentCore' | 'application' | 'stretch'; targetDifficulty: number }> = [];

  // Compute slot counts from distribution
  const reviewCount = Math.max(0, Math.round(distribution.review * totalSlots));
  const stretchCount = Math.max(0, Math.round(distribution.stretch * totalSlots));
  const coreCount = totalSlots - reviewCount - stretchCount;
  const appliedCount = Math.max(0, Math.round(distribution.application * (totalSlots - reviewCount - stretchCount)));
  const coreFinal = coreCount - appliedCount;

  // Fill slots: review first, then core+applied, then stretch
  let reviewIdx = 0;
  let coreIdx = 0;
  let appliedIdx = 0;
  let stretchIdx = 0;

  for (let i = 0; i < totalSlots; i++) {
    const targetDiff = plan.slotDifficulties[i] || params.learnerProfile.currentDifficultyLevel;

    if (reviewIdx < reviewCount) {
      slots.push({ category: 'review', targetDifficulty: Math.min(targetDiff, 2) });
      reviewIdx++;
    } else if (coreIdx < coreFinal) {
      slots.push({ category: 'currentCore', targetDifficulty: targetDiff });
      coreIdx++;
    } else if (appliedIdx < appliedCount) {
      slots.push({ category: 'application', targetDifficulty: targetDiff });
      appliedIdx++;
    } else if (stretchIdx < stretchCount) {
      slots.push({ category: 'stretch', targetDifficulty: Math.max(targetDiff, 4) });
      stretchIdx++;
    } else {
      slots.push({ category: 'currentCore', targetDifficulty: targetDiff });
    }
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
    default: return Math.max(1, Math.floor(totalSlots * 0.10)); // ≤10%
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
