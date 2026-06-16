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
 * Detect usage stage based on days since start and total completed questions.
 * A 2-month user with 100 completed should be Stage 3.
 */
export function detectUsageStage(
  daysSinceStart: number,
  totalCompleted: number,
): UsageStageInfo {
  let stage: UsageStage;
  let description: string;
  let reviewRatio: number;

  if (totalCompleted >= 100 || daysSinceStart >= 45) {
    stage = 3;
    description = '经验丰富用户（45天+或100题+）';
    reviewRatio = 0.05;
  } else if (totalCompleted >= 30 || daysSinceStart >= 15) {
    stage = 2;
    description = '活跃用户（15-45天或30-100题）';
    reviewRatio = 0.05;
  } else if (totalCompleted >= 10 || daysSinceStart >= 4) {
    stage = 1;
    description = '初学用户（4-14天或10-30题）';
    reviewRatio = 0.15;
  } else {
    stage = 0;
    description = '新用户（0-3天或<10题）';
    reviewRatio = 0.30;
  }

  return { stage, daysSinceStart, totalCompleted, description, reviewRatio };
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
}): LearnerProfile {
  const { existingProfile, curriculumProfile, attemptRecords, totalCompleted, startedAt } = params;

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

  // Difficulty level based on recent accuracy and volume
  const currentDifficultyLevel = existingProfile?.currentDifficultyLevel || 2;
  // Auto-upgrade: if accuracy >= 85% over 20+ recent questions and level < 4
  const autoUpgrade = recentTotal >= 20 && recentAccuracy >= 85 && currentDifficultyLevel < 4;
  const autoDowngrade = recentTotal >= 15 && recentAccuracy < 50 && currentDifficultyLevel > 1;

  return {
    curriculumProfile,
    skillMastery: existingProfile?.skillMastery || {},
    currentDifficultyLevel: autoUpgrade
      ? currentDifficultyLevel + 1
      : autoDowngrade
        ? currentDifficultyLevel - 1
        : currentDifficultyLevel,
    startedAt: startedAt || new Date().toISOString(),
    totalCompleted,
    recentAccuracy,
    recentFirstTryAccuracy,
    averageAttempts,
    fullHintRate: existingProfile?.fullHintRate || 0,
    difficultyBias: existingProfile?.difficultyBias || 0,
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
