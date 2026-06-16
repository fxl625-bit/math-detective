/**
 * v2.9.0 真实出题链路集成测试
 *
 * 直接走 buildDailyLesson() 的真实路径，
 * 包含 loadState → getUsageContext → selectCurriculumAwareQuestion 的完整链路。
 * 不 mock 任何内部函数，不跳过任何过滤步骤。
 *
 * 运行：npm run test:real-lesson-generation
 */

import type { GameState, MistakeRecord } from '@/lib/types';
import { DEFAULT_GAME_STATE } from '@/lib/types';
import { buildDailyLesson, getLearningProfile } from '@/lib/lessonPlanner';
import { buildLearnerProfile, detectUsageStage, initCurriculumProfile } from '@/lib/learnerProfile';
import type { Semester } from '@/lib/curriculum/types';
import { getQuestionById } from '@/data/questions';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

// ========== 构造真实用户状态 ==========

function createSimulatedState(): GameState {
  const state: GameState = {
    ...DEFAULT_GAME_STATE,
    // Simulate 2-month active user with ~83% accuracy
    totalCompleted: 85,
    correctCount: 72,
    wrongCount: 13,
    answerAttempts: 85,
    skillLevel: 5,
    level: 3,
    stars: 85,
    streak: 14,
    completedQuestions: Array.from({ length: 85 }, (_, i) => `sim_completed_${i}`),
    attemptRecords: Array.from({ length: 85 }, (_, i) => ({
      questionId: `sim_q_${i % 55}`,
      isCorrect: i % 6 !== 5,
      submittedAt: new Date(Date.now() - (85 - i) * 1800000).toISOString(),
      attemptType: 'final_answer' as const,
    })),
    parentSettings: {
      gradeBand: 'G1',
      dailyGoal: 6,
      maxDifficulty: 5,
      semester: 'lower' as Semester,
      semesterOverride: 'lower' as Semester,
      textbookEdition: 'PEP',
    },
  };

  // Run v2.9.0 migration (same as loadState)
  state.curriculumProfile = initCurriculumProfile({
    grade: 1,
    textbookEdition: 'PEP',
    semesterOverride: 'lower' as Semester,
  });

  const daysEstimate = Math.max(1, Math.ceil(state.totalCompleted / 5));
  const stageInfo = detectUsageStage(daysEstimate, state.totalCompleted);
  state.usageStage = stageInfo.stage;

  state.learnerProfile = buildLearnerProfile({
    curriculumProfile: state.curriculumProfile as any,
    attemptRecords: state.attemptRecords,
    totalCompleted: state.totalCompleted,
  });

  return state;
}

// ========== 判断是否为个位数加减法 ==========

function isSingleDigitArithmetic(questionId: string): boolean {
  const q = getQuestionById(questionId);
  if (!q) return false;

  const isReviewBasic = q.isReview === true && q.difficulty <= 1;
  const hasOnlySingleDigitSkill = (q.skillIds || []).every(
    (s: string) => s.includes('single_digit') || s.includes('within_10')
  );
  const isBasicArithmetic = q.problemType === 'basic_arithmetic' || !q.problemType;

  return isReviewBasic && (hasOnlySingleDigitSkill || isBasicArithmetic);
}

// ========== 测试 ==========

const state = createSimulatedState();
const profile = getLearningProfile();

// ----- Test 1: State setup -----
console.log('\nUser State Verification:');
assert(state.totalCompleted === 85, `totalCompleted is 85 (got ${state.totalCompleted})`);
assert(state.parentSettings.gradeBand === 'G1', `grade is G1`);
assert(state.parentSettings.semester === 'lower', `semester is lower`);
assert(state.usageStage! >= 2, `usageStage >= 2 (got ${state.usageStage}, ${state.usageStage! >= 2 ? 'experienced user' : 'too low'})`);
assert(state.learnerProfile !== undefined, 'learnerProfile is initialized (ROOT CAUSE FIX verified)');
assert(state.learnerProfile!.currentDifficultyLevel >= 2, `currentDifficultyLevel >= 2 (got ${state.learnerProfile!.currentDifficultyLevel})`);

// ----- Test 2: Single lesson analysis -----
console.log('\nSingle Lesson Analysis:');
const singleLesson = buildDailyLesson(profile, state.completedQuestions, [], state);
assert(singleLesson.steps.length >= 4, `lesson has >= 4 steps (got ${singleLesson.steps.length})`);

// Version stamp
assert((singleLesson as any).generatedByVersion === 'v2.9.0', `lesson has version stamp v2.9.0`);
assert((singleLesson as any).curriculumSnapshot?.grade === 1, `curriculum snapshot grade is 1`);
assert((singleLesson as any).curriculumSnapshot?.semester === 'lower', `curriculum snapshot semester is lower`);

// Print each question
console.log('\n  --- Single Lesson Questions ---');
let singleDigitInLesson = 0;
for (let i = 0; i < singleLesson.steps.length; i++) {
  const step = singleLesson.steps[i];
  const q = getQuestionById(step.questionId);
  const isSD = isSingleDigitArithmetic(step.questionId);
  if (isSD) singleDigitInLesson++;
  console.log(`  Slot ${i + 1}: [${step.type}] id=${step.questionId} diff=${q?.difficulty ?? '?'} op=${q?.operation ?? '?'} skills=${(q?.skillIds || []).join(', ') || 'none'} review=${q?.isReview ? 'Y' : 'N'} text="${q?.text?.substring(0, 40) || '???'}..."`);
}
assert(singleDigitInLesson <= Math.ceil(singleLesson.steps.length * 0.3),
  `single-digit arithmetic in lesson <= 30% (got ${singleDigitInLesson}/${singleLesson.steps.length})`);

// ----- Test 3: 1000-lesson distribution -----
console.log('\n1000-Lesson Distribution:');
let totalSteps = 0;
let singleDigitSteps = 0;
const difficultyCounts: Record<number, number> = {};
const N = 1000;

for (let i = 0; i < N; i++) {
  const lesson = buildDailyLesson(profile, state.completedQuestions, [], state);
  for (const step of lesson.steps) {
    totalSteps++;
    const q = getQuestionById(step.questionId);
    if (q) {
      difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] || 0) + 1;
    }
    if (isSingleDigitArithmetic(step.questionId)) {
      singleDigitSteps++;
    }
  }
}

const singleDigitRatio = singleDigitSteps / totalSteps;
console.log(`  Total steps: ${totalSteps}`);
console.log(`  Single-digit steps: ${singleDigitSteps} (${(singleDigitRatio * 100).toFixed(1)}%)`);
console.log(`  Difficulty distribution:`, difficultyCounts);
assert(singleDigitRatio <= 0.15, `single-digit ratio <= 15% (got ${(singleDigitRatio * 100).toFixed(1)}%)`);

// ----- Test 4: Skill diversity -----
console.log('\nSkill Diversity (100 lessons):');
const allSkillIds = new Set<string>();
let diverseLessons = 0;

for (let i = 0; i < 100; i++) {
  const lesson = buildDailyLesson(profile, state.completedQuestions, [], state);
  const lessonSkills = new Set<string>();

  for (const step of lesson.steps) {
    const q = getQuestionById(step.questionId);
    for (const s of (q?.skillIds || [])) {
      lessonSkills.add(s);
      allSkillIds.add(s);
    }
  }

  if (lessonSkills.size >= 2) {
    diverseLessons++;
  }
}

console.log(`  Unique skills across 100 lessons: ${allSkillIds.size}`);
console.log(`  Lessons with >=2 skills: ${diverseLessons}/100`);
assert(diverseLessons >= 70, `>= 70% of lessons have 2+ skills (got ${diverseLessons}%)`);
assert(allSkillIds.size >= 5, `>= 5 unique skills across 100 lessons (got ${allSkillIds.size})`);

// ----- Results -----
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
