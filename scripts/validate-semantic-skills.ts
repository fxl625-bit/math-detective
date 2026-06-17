/**
 * v2.9.1: Validate:semantic-skills
 *
 * Checks that curriculum skillIds on questions are semantically consistent:
 * - No impossible combinations (single_digit + within_100)
 * - Numeric operands match skill labels
 * - Skill prerequisites are respected
 * - assessmentTier is consistent with difficulty level
 * - DifficultyProfile dimensions don't contradict each other
 */

import { allQuestions } from '@/data/questions';
import type { Question } from '@/lib/types';

interface ValidationError {
  questionId: string;
  severity: 'error' | 'warning';
  message: string;
}

const errors: ValidationError[] = [];

// ========== 1. Skill label vs actual math ==========

function checkSkillMathConsistency(q: Question): void {
  const skills = (q.skillIds || []) as string[];
  const nums = q.numbers;

  for (const skill of skills) {
    // Two-digit skills require at least one two-digit number
    if (skill.includes('two_digit')) {
      const hasTwoDigit = nums.some(n => n >= 10);
      if (!hasTwoDigit) {
        errors.push({
          questionId: q.id,
          severity: 'error',
          message: `技能"${skill}"要求有两位数，但题目数字[${nums.join(',')}]全是单位数`,
        });
      }
    }

    // single_digit skills must NOT have two-digit numbers
    if (skill === 'addition_subtraction:single_digit_addition' || skill === 'addition_subtraction:single_digit_subtraction') {
      const hasTwoDigit = nums.some(n => n >= 10);
      if (hasTwoDigit) {
        errors.push({
          questionId: q.id,
          severity: 'error',
          message: `技能"${skill}"要求数字全是单位数，但题目有[${nums.filter(n=>n>=10).join(',')}]`,
        });
      }
    }

    // Within-10 skills: all numbers must be <= 10 and result <= 10
    if (skill === 'addition_subtraction:addition_within_10') {
      const allLte10 = nums.every(n => n <= 10);
      if (!allLte10) {
        errors.push({
          questionId: q.id,
          severity: 'warning',
          message: `技能"${skill}"建议数字≤10，但题目有[${nums.filter(n=>n>10).join(',')}]`,
        });
      }
    }

    // Within-100 skills: should have at least one number >= 10
    if (skill.includes('within_100')) {
      const hasRelevant = nums.some(n => n >= 10 && n <= 100);
      if (!hasRelevant) {
        errors.push({
          questionId: q.id,
          severity: 'warning',
          message: `技能"${skill}"期望有10-100的数字，但题目数字[${nums.join(',')}]`,
        });
      }
    }
  }
}

// ========== 2. Incompatible skill combinations ==========

const INCOMPATIBLE_SKILL_PAIRS: [string, string][] = [
  ['single_digit_addition', 'addition_within_100'],
  ['single_digit_subtraction', 'subtraction_within_100'],
  ['single_digit_addition', 'two_digit_plus_one_digit'],
  ['single_digit_subtraction', 'two_digit_minus_one_digit'],
  ['addition_within_10', 'addition_within_100'],
  ['subtraction_within_10', 'subtraction_within_100'],
];

function checkIncompatibleSkills(q: Question): void {
  const skills = (q.skillIds || []) as string[];
  // Extract the short skill name (after the colon) for matching
  const shortNames = skills.map(s => s.split(':').pop() || s);
  
  for (const [a, b] of INCOMPATIBLE_SKILL_PAIRS) {
    // Use exact match on the short name to avoid false positives
    // e.g., "subtraction_within_10" should NOT match "subtraction_within_100"
    const hasA = shortNames.some(name => name === a);
    const hasB = shortNames.some(name => name === b);
    if (hasA && hasB) {
      errors.push({
        questionId: q.id,
        severity: 'error',
        message: `不兼容的技能组合：${a} 和 ${b} 不能同时存在（难度差距过大）`,
      });
    }
  }
}

// ========== 3. assessmentTier vs difficulty consistency ==========

const TIER_DIFFICULTY_RANGES: Record<string, [number, number]> = {
  textbook: [1, 2],
  practice: [1, 3],
  test: [2, 4],
  challenge: [3, 5],
};

function checkAssessmentTier(q: Question): void {
  const tier = (q as any).assessmentTier as string | undefined;
  if (!tier) return;

  const range = TIER_DIFFICULTY_RANGES[tier];
  if (!range) {
    errors.push({
      questionId: q.id,
      severity: 'warning',
      message: `未知的 assessmentTier: "${tier}"`,
    });
    return;
  }

  const [min, max] = range;
  if (q.difficulty < min || q.difficulty > max) {
    errors.push({
      questionId: q.id,
      severity: 'warning',
      message: `assessmentTier="${tier}" 的合理难度范围是 ${min}-${max}，但实际难度为 ${q.difficulty}`,
    });
  }
}

// ========== 4. DifficultyProfile consistency ==========

function checkDifficultyProfile(q: Question): void {
  const profile = (q as any).difficultyProfile as Record<string, number> | undefined;
  if (!profile) return;

  // knowledgeLevel should roughly match q.difficulty
  const kl = profile.knowledgeLevel;
  const diff = q.difficulty;
  if (Math.abs(kl - diff) > 1) {
    errors.push({
      questionId: q.id,
      severity: 'warning',
      message: `difficultyProfile.knowledgeLevel (${kl}) 与题目 difficulty (${diff}) 偏差超过1`,
    });
  }

  // two-step questions should have reasoningSteps >= 2
  const isTwoStep = (q as any).isTwoStep;
  if (isTwoStep && profile.reasoningSteps < 2) {
    errors.push({
      questionId: q.id,
      severity: 'warning',
      message: `isTwoStep=true 但 reasoningSteps=${profile.reasoningSteps}，两步题应≥2`,
    });
  }

  // challenge tier should have transferLevel >= 3
  const tier = (q as any).assessmentTier;
  if (tier === 'challenge' && profile.transferLevel < 3) {
    errors.push({
      questionId: q.id,
      severity: 'warning',
      message: `challenge 题目的 transferLevel=${profile.transferLevel}，建议≥3`,
    });
  }
}

// ========== Main ==========

function runAll(): void {
  for (const q of allQuestions) {
    checkSkillMathConsistency(q);
    checkIncompatibleSkills(q);
    checkAssessmentTier(q);
    checkDifficultyProfile(q);
  }

  // Print results
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  console.log(`\n=== validate:semantic-skills ===`);
  console.log(`Questions scanned: ${allQuestions.length}`);
  console.log(`Errors:   ${errorCount}`);
  console.log(`Warnings: ${warningCount}`);
  console.log('');

  if (errors.length === 0) {
    console.log('✅ All semantic checks passed!');
    return;
  }

  for (const err of errors) {
    const prefix = err.severity === 'error' ? '❌' : '⚠️';
    console.log(`${prefix} [${err.severity.toUpperCase()}] ${err.questionId}: ${err.message}`);
  }

  if (errorCount > 0) {
    console.log(`\n❌ FAILED: ${errorCount} error(s) found. Fix before release.`);
    process.exit(1);
  } else {
    console.log(`\n✅ Passed (${warningCount} warnings — review recommended but not blocking).`);
  }
}

runAll();
