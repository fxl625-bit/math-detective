/**
 * v2.9.0: Learner Profile Engine
 *
 * Tracks per-skill mastery, computes usage stage,
 * and maintains the LearnerProfile within GameState.
 */

import type {
  SkillId,
  SkillMastery,
  MasteryStatus,
  CurriculumProfile,
  LearnerProfile,
  UsageStage,
  UsageStageInfo,
  Semester,
} from '@/lib/curriculum/types';
import type { AttemptRecord } from '@/lib/types';
import { buildCurriculumProfile } from '@/lib/curriculum/semesterDetector';

// ========== Default SkillMastery ==========

function createEmptySkillMastery(skillId: SkillId): SkillMastery {
  return {
    skillId,
    attempts: 0,
    correct: 0,
    firstTryCorrect: 0,
    streakCorrect: 0,
    streakWrong: 0,
    masteryScore: 0,
    lastPracticedAt: '',
    status: 'unseen',
    currentDifficulty: 1,
  };
}

// ========== Mastery Status Update ==========

/**
 * Update mastery status based on performance metrics.
 * Rules:
 * - unseen → learning: attempts >= 1
 * - learning → practicing: attempts >= 3 && accuracy >= 60%
 * - practicing → mastered: attempts >= 8 && accuracy >= 85% && streakCorrect >= 4
 * - Any → learning (demotion): accuracy drops below 50% after 5+ attempts
 */
function computeMasteryStatus(mastery: SkillMastery): MasteryStatus {
  if (mastery.attempts === 0) return 'unseen';

  const accuracy = mastery.attempts > 0
    ? (mastery.correct / mastery.attempts) * 100
    : 0;

  // Demotion: if accuracy drops significantly
  if (mastery.attempts >= 5 && accuracy < 50 && mastery.status !== 'learning') {
    return 'learning';
  }

  if (mastery.attempts >= 8 && accuracy >= 85 && mastery.streakCorrect >= 4) {
    return 'mastered';
  }

  if (mastery.attempts >= 3 && accuracy >= 60) {
    return 'practicing';
  }

  return 'learning';
}

// ========== Mastery Score ==========

/**
 * Compute mastery score (0-100).
 * Weighted: accuracy (60%) + consistency (25%) + volume (15%)
 */
function computeMasteryScore(mastery: SkillMastery): number {
  if (mastery.attempts === 0) return 0;

  const accuracy = (mastery.correct / mastery.attempts) * 100;
  const firstTryRate = mastery.attempts > 0
    ? (mastery.firstTryCorrect / mastery.attempts) * 100
    : 0;
  // Consistency: how many correct out of last few attempts
  const consistency = Math.min(100, (mastery.streakCorrect / Math.max(1, mastery.attempts)) * 200);
  // Volume bonus: caps at 15 points for 10+ attempts
  const volume = Math.min(15, mastery.attempts * 1.5);

  const raw = (accuracy * 0.60) + (consistency * 0.25) + volume;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

// ========== Process Attempt ==========

/**
 * Process a single attempt and update skill mastery.
 * Returns updated SkillMastery.
 */
export function processAttempt(
  existing: SkillMastery,
  isCorrect: boolean,
  isFirstTry: boolean,
  usedFullHint: boolean,
): SkillMastery {
  const updated: SkillMastery = {
    ...existing,
    attempts: existing.attempts + 1,
    lastPracticedAt: new Date().toISOString(),
  };

  if (isCorrect) {
    updated.correct += 1;
    if (isFirstTry) updated.firstTryCorrect += 1;
    updated.streakCorrect += 1;
    updated.streakWrong = 0;
  } else {
    updated.streakWrong += 1;
    updated.streakCorrect = 0;
  }

  updated.masteryScore = computeMasteryScore(updated);
  updated.status = computeMasteryStatus(updated);

  // Adaptive difficulty: increase if mastery > 80, decrease if mastery < 40
  if (updated.masteryScore >= 80 && updated.currentDifficulty < 5) {
    updated.currentDifficulty = Math.min(5, updated.currentDifficulty + 1) as 1 | 2 | 3 | 4 | 5;
  } else if (updated.masteryScore < 40 && updated.currentDifficulty > 1) {
    updated.currentDifficulty = Math.max(1, updated.currentDifficulty - 1) as 1 | 2 | 3 | 4 | 5;
  }

  return updated;
}

// ========== Usage Stage Detection ==========

/**
 * v2.9.1: Detect usage stage based on days, completed count, and mastery.
 * Stage 0-4 replaces the old 0-3 model.
 *
 * Stage 0: Initial diagnosis — first 10-15 questions (<10 completed or <4 days)
 * Stage 1: Basic adaptation — first 30 questions or <7 days
 * Stage 2: Current semester core — 30+ completed
 * Stage 3: Comprehensive & test adaptation — 30+ days OR 60+ completed
 *   OR 10+ consecutive check-in days OR basic skills mastered
 * Stage 4: Advanced challenge — 85%+ accuracy on 20 recent, low hint rate,
 *   most current core skills mastered
 */
export function detectUsageStage(
  daysSinceStart: number,
  totalCompleted: number,
  extraParams?: {
    recentAccuracy?: number;
    fullHintRate?: number;
    masteredSkillRatio?: number;
    consecutiveCheckInDays?: number;
  },
): UsageStageInfo {
  let stage: UsageStage;
  let description: string;
  let reviewRatio: number;
  let stretchPreviewRatio: number;

  const { recentAccuracy, fullHintRate, masteredSkillRatio, consecutiveCheckInDays } = extraParams || {};

  // Stage 4: Advanced challenge
  // Requires: 85+ completed, 85%+ first-try accuracy, low hint usage (<15%), most skills mastered (>=60%)
  const canStage4 = (
    totalCompleted >= 85 &&
    (recentAccuracy !== undefined && recentAccuracy >= 85) &&
    (fullHintRate !== undefined && fullHintRate < 0.15) &&
    (masteredSkillRatio !== undefined && masteredSkillRatio >= 0.6)
  );

  // Stage 3: Comprehensive & test adaptation
  const canStage3 = (
    daysSinceStart >= 30 ||
    totalCompleted >= 60 ||
    (consecutiveCheckInDays !== undefined && consecutiveCheckInDays >= 10) ||
    (masteredSkillRatio !== undefined && masteredSkillRatio >= 0.5)
  );

  if (canStage4) {
    stage = 4;
    description = '进阶挑战（高正确率、低提示率、核心技能多数掌握）';
    reviewRatio = 0.02;
    stretchPreviewRatio = 0.25;
  } else if (canStage3) {
    stage = 3;
    description = '综合与测试适应（30天+或60题+或连续打卡10天+）';
    reviewRatio = 0.05;
    stretchPreviewRatio = 0.20;
  } else if (totalCompleted >= 18) {
    stage = 2;
    description = '当前学期核心学习（30题+）';
    reviewRatio = 0.08;
    stretchPreviewRatio = 0.10;
  } else if (totalCompleted >= 10 || daysSinceStart >= 4) {
    stage = 1;
    description = '基础适应期（10-30题或4-7天）';
    reviewRatio = 0.15;
    stretchPreviewRatio = 0.05;
  } else {
    stage = 0;
    description = '初始诊断期（前10题或<4天）';
    reviewRatio = 0.30;
    stretchPreviewRatio = 0.00;
  }

  return { stage, daysSinceStart, totalCompleted, description, reviewRatio, stretchPreviewRatio };
}

// ========== LearnerProfile Builder ==========

/**
 * Build or update a LearnerProfile from GameState data.
 */
export function buildLearnerProfile(params: {
  existingProfile?: LearnerProfile;
  curriculumProfile: CurriculumProfile;
  attemptRecords: AttemptRecord[];
  totalCompleted: number;
  startedAt?: string;
  consecutiveCheckInDays?: number;
}): LearnerProfile {
  const { existingProfile, curriculumProfile, attemptRecords, totalCompleted, startedAt, consecutiveCheckInDays } = params;

  // Compute recent accuracy (last 30 attempts)
  const recentRecords = attemptRecords.slice(-30);
  const recentCorrect = recentRecords.filter(r => r.isCorrect).length;
  const recentTotal = recentRecords.length;
  const recentAccuracy = recentTotal > 0 ? Math.round((recentCorrect / recentTotal) * 100) : 100;

  // First-try accuracy (last 30 attempts where type is 'final_answer')
  const recentFinalAttempts = recentRecords.filter(r => r.attemptType === 'final_answer');
  const recentFirstTryCorrect = recentFinalAttempts.filter(r => r.isCorrect).length;
  const recentFirstTryAccuracy = recentFinalAttempts.length > 0
    ? Math.round((recentFirstTryCorrect / recentFinalAttempts.length) * 100)
    : 100;

  // Average attempts per question
  const averageAttempts = totalCompleted > 0
    ? Math.round((recentRecords.length / Math.max(1, recentRecords.filter(r => r.attemptType === 'final_answer').length)) * 10) / 10
    : 1;

  // v2.9.1: Difficulty calibration based on stage and semester progress
  let currentDifficultyLevel = existingProfile?.currentDifficultyLevel || 1;

  // Stage 3+ users start at minimum difficulty 3
  // Stage 4 users start at minimum difficulty 4
  const stageInfo = detectUsageStage(
    totalCompleted > 0 ? Math.max(1, Math.ceil(totalCompleted / 5)) : 0,
    totalCompleted,
    { recentAccuracy, fullHintRate: 0, masteredSkillRatio: 0 },
  );

  if (stageInfo.stage >= 4 && currentDifficultyLevel < 4) {
    currentDifficultyLevel = 4;
  } else if (stageInfo.stage >= 3 && currentDifficultyLevel < 3) {
    currentDifficultyLevel = 3;
  }

  // Auto-upgrade: if accuracy >= 85% over 20+ recent questions
  const autoUpgrade = recentTotal >= 20 && recentAccuracy >= 85 && currentDifficultyLevel < 5;
  const autoDowngrade = recentTotal >= 15 && recentAccuracy < 50 && currentDifficultyLevel > 1;

  if (autoUpgrade) currentDifficultyLevel += 1;
  if (autoDowngrade) currentDifficultyLevel -= 1;

  return {
    curriculumProfile,
    skillMastery: existingProfile?.skillMastery || {},
    currentDifficultyLevel,
    startedAt: startedAt || new Date().toISOString(),
    totalCompleted,
    recentAccuracy,
    recentFirstTryAccuracy,
    averageAttempts,
    fullHintRate: existingProfile?.fullHintRate || 0,
    difficultyBias: existingProfile?.difficultyBias || 0,
    consecutiveCheckInDays: consecutiveCheckInDays || existingProfile?.consecutiveCheckInDays,
  };
}

// ========== Initialize CurriculumProfile ==========

/**
 * Initialize a CurriculumProfile from ParentSettings.
 * Auto-detects semester if not manually overridden.
 */
export function initCurriculumProfile(params: {
  grade: number;
  textbookEdition?: string;
  semesterOverride?: Semester;
}): CurriculumProfile {
  return buildCurriculumProfile(params) as CurriculumProfile;
}
