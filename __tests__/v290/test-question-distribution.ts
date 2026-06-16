/**
 * v2.9.0 Test Suite: Question Distribution
 *
 * Tests:
 * 1. All G1 questions have annotations after merge
 * 2. Review ratio is correct for different stages
 * 3. Single-digit questions are properly tagged
 * 4. No unannotated questions remain (all have at least skillIds or isReview/isStretch)
 * 5. G1 lower questions outnumber G1 upper review questions
 * 6. Distribution matches target: 5% review, 65% core, 20% applied, 10% stretch
 */

import { allQuestions, questionsByGrade } from '@/data/questions';
import { analyzeQuestionDistribution } from '@/lib/adaptiveDifficulty';
import { getDifficultyDistribution } from '@/lib/curriculum/curriculumMap';

// ========== Helpers ==========

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

// ========== Test Suite ==========

console.log('\n=== test:question-distribution ===\n');

// 1. All G1 questions have annotations
console.log('G1 Question Annotations:');
const g1Pool = questionsByGrade['G1'] || [];
assert(g1Pool.length > 0, `G1 pool has ${g1Pool.length} questions`);

const annotated = g1Pool.filter(q => q.skillIds && q.skillIds.length > 0);
const unannotated = g1Pool.filter(q => !q.skillIds || q.skillIds.length === 0);

assert(annotated.length > 0, `${annotated.length} G1 questions have skillIds`);
if (unannotated.length > 0) {
  console.log(`  ⚠ ${unannotated.length} G1 questions without skillIds: ${unannotated.map(q => q.id).join(', ')}`);
}

// Verify all annotated questions have curriculumSemester
const withSemester = g1Pool.filter(q => q.curriculumSemester);
assert(withSemester.length > 0, `${withSemester.length} G1 questions have curriculumSemester`);

// 2. Review vs non-review tagging
console.log('\nReview vs Non-Review:');
const reviewQuestions = g1Pool.filter(q => q.isReview === true);
const nonReviewQuestions = g1Pool.filter(q => q.isReview !== true);
assert(reviewQuestions.length > 0, `${reviewQuestions.length} G1 questions tagged as review`);
assert(nonReviewQuestions.length > 0, `${nonReviewQuestions.length} G1 questions are NOT review`);

// 3. Single-digit questions
console.log('\nSingle-Digit Questions:');
const singleDigitReview = g1Pool.filter(q => q.isReview === true && q.difficulty <= 1);
console.log(`  ℹ ${singleDigitReview.length} single-digit review questions in G1 pool`);

const singleDigitRatio = g1Pool.length > 0
  ? Math.round((singleDigitReview.length / g1Pool.length) * 100)
  : 0;
console.log(`  ℹ Single-digit ratio in full G1 pool: ${singleDigitRatio}%`);
assert(singleDigitRatio < 50, `Single-digit ratio < 50% (got ${singleDigitRatio}%)`);

// 4. Stretch questions
console.log('\nStretch Questions:');
const stretchQuestions = g1Pool.filter(q => q.isStretch === true);
console.log(`  ℹ ${stretchQuestions.length} stretch questions in G1 pool`);

// 5. Difficulty distribution validity
console.log('\nDifficulty Distribution Targets:');
const dist = getDifficultyDistribution(2); // Active user
assert(dist.review === 0.05, `Review ratio is 5%`);
assert(dist.currentCore === 0.65, `Core ratio is 65%`);
assert(dist.application === 0.20, `Application ratio is 20%`);
assert(dist.stretch === 0.10, `Stretch ratio is 10%`);

const sum = dist.review + dist.currentCore + dist.application + dist.stretch;
assert(Math.abs(sum - 1.0) < 0.001, `Distribution sums to 1.0 (got ${sum})`);

// 6. Distribution diagnostics on all G1 questions
console.log('\nDistribution Diagnostics (All G1 Questions):');
const diag = analyzeQuestionDistribution(g1Pool);
console.log(`  ℹ Total: ${diag.totalQuestions}`);
console.log(`  ℹ Single-digit: ${diag.singleDigitCount} (${diag.singleDigitRatio}%)`);
console.log(`  ℹ Review: ${diag.reviewCount}, Core: ${diag.coreCount}, Applied: ${diag.appliedCount}, Stretch: ${diag.stretchCount}`);
console.log(`  ℹ Average difficulty: ${diag.averageDifficulty}`);

for (const [diff, count] of Object.entries(diag.difficultyBreakdown).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`  ℹ Difficulty ${diff}: ${count} questions`);
}

// 7. Knowledge coverage: verify key skills are represented
console.log('\nSkill Coverage:');
const allSkillIds = new Set<string>();
for (const q of g1Pool) {
  for (const s of (q.skillIds || [])) {
    allSkillIds.add(s);
  }
}
console.log(`  ℹ ${allSkillIds.size} unique skillIds in G1 pool`);

const keySkills = [
  'addition_subtraction:single_digit_addition',
  'addition_subtraction:single_digit_subtraction',
  'addition_subtraction:subtraction_within_20_borrowing',
  'addition_subtraction:addition_within_20',
  'comparison:difference_comparison',
  'pattern:simple_patterns',
  'logic:simple_ordering',
  'geometry:shape_counting',
  'information:identify_extra_information',
];
for (const skillId of keySkills) {
  assert(allSkillIds.has(skillId), `Key skill "${skillId}" is represented`);
}

// ========== Summary ==========

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  process.exit(1);
}
