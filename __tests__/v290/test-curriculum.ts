/**
 * v2.9.0 Test Suite: Curriculum Model
 *
 * Tests:
 * 1. G1 lower semester has correct knowledge points
 * 2. Semester detection works correctly
 * 3. Skill IDs are well-formed
 * 4. Difficulty distribution is valid (sums to 1.0)
 * 5. Daily difficulty plan has correct number of slots
 */

import {
  getCurriculumEntry,
  getKnowledgePointsForGrade,
  getCoreSkillsForGrade,
  getAppliedSkillsForGrade,
  getStretchSkillsForGrade,
  getDifficultyDistribution,
  getDailyDifficultyPlan,
  getAllG1LowerSkillIds,
  getAllG1UpperSkillIds,
  getKnowledgePointById,
} from '@/lib/curriculum/curriculumMap';
import { detectSemesterFromDate, buildCurriculumProfile } from '@/lib/curriculum/semesterDetector';

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

function assertClose(actual: number, expected: number, tolerance: number, message: string) {
  assert(Math.abs(actual - expected) <= tolerance, `${message} (expected ~${expected}, got ${actual})`);
}

// ========== Test Suite ==========

console.log('\n=== test:curriculum ===\n');

// 1. G1 lower has knowledge points
console.log('G1 Lower Semester Knowledge Points:');
const kp = getKnowledgePointsForGrade(1, 'lower');
assert(kp.length > 0, `G1 lower has ${kp.length} knowledge points`);
assert(kp.length >= 25, `G1 lower has at least 25 knowledge points (got ${kp.length})`);

// 2. G1 upper has knowledge points
console.log('\nG1 Upper Semester Knowledge Points:');
const upperKp = getKnowledgePointsForGrade(1, 'upper');
assert(upperKp.length > 0, `G1 upper has ${upperKp.length} knowledge points`);
assert(upperKp.length >= 4, `G1 upper has at least 4 knowledge points (got ${upperKp.length})`);

// 3. Curriculum entry exists
console.log('\nCurriculum Entries:');
const entry = getCurriculumEntry(1, 'lower');
assert(entry !== null, 'G1 lower curriculum entry exists');
assert(entry?.knowledgePoints.length === kp.length, 'Entry knowledge points match');

const nullEntry = getCurriculumEntry(7, 'upper');
assert(nullEntry === null, 'G7 upper returns null (not yet defined)');

// 4. Core / Applied / Stretch skills
console.log('\nSkill Categories:');
const core = getCoreSkillsForGrade(1, 'lower');
const applied = getAppliedSkillsForGrade(1, 'lower');
const stretch = getStretchSkillsForGrade(1, 'lower');
assert(core.length > 0, `G1 lower has ${core.length} core skills`);
assert(applied.length > 0, `G1 lower has ${applied.length} applied skills`);
assert(stretch.length > 0, `G1 lower has ${stretch.length} stretch skills`);
assert(core.length + applied.length + stretch.length === kp.length,
  `Category sum (${core.length}+${applied.length}+${stretch.length}) equals total (${kp.length})`);

// 5. Skill IDs are well-formed (domain:specific format)
console.log('\nSkill ID Format:');
const allSkillIds = getAllG1LowerSkillIds();
for (const id of allSkillIds) {
  assert(id.includes(':'), `SkillId "${id}" contains ":"`);
  const parts = id.split(':');
  assert(parts.length === 2, `SkillId "${id}" has exactly 2 parts`);
}

// 6. Semester detection
console.log('\nSemester Detection:');
assert(detectSemesterFromDate(new Date(2026, 2, 15)) === 'lower', 'March → lower');
assert(detectSemesterFromDate(new Date(2026, 0, 15)) === 'upper', 'January → upper');
assert(detectSemesterFromDate(new Date(2026, 8, 1)) === 'upper', 'September → upper');
assert(detectSemesterFromDate(new Date(2026, 6, 1)) === 'lower', 'July → lower');

// 7. Difficulty distribution sums to 1.0
console.log('\nDifficulty Distribution:');
for (let stage = 0; stage <= 3; stage++) {
  const dist = getDifficultyDistribution(stage);
  const sum = dist.review + dist.currentCore + dist.application + dist.stretch;
  assertClose(sum, 1.0, 0.01, `Stage ${stage} distribution sums to 1.0`);
}

// 8. Daily difficulty plan has 6 slots
console.log('\nDaily Difficulty Plan:');
for (let stage = 0; stage <= 3; stage++) {
  const plan = getDailyDifficultyPlan(stage);
  assert(plan.slotDifficulties.length === 6, `Stage ${stage} has 6 difficulty slots`);
}

// 9. Stage 0 has more review than stage 3
console.log('\nStage Comparison:');
const dist0 = getDifficultyDistribution(0);
const dist3 = getDifficultyDistribution(3);
assert(dist0.review > dist3.review, `Stage 0 review (${dist0.review}) > Stage 3 review (${dist3.review})`);

// 10. Knowledge point lookup
console.log('\nKnowledge Point Lookup:');
const borrowing = getKnowledgePointById('addition_subtraction:subtraction_within_20_borrowing');
assert(borrowing !== undefined, 'Borrowing subtraction exists');
assert(borrowing?.grade === 1, 'Borrowing subtraction is G1');
assert(borrowing?.semester === 'lower', 'Borrowing subtraction is lower semester');
assert(borrowing?.category === 'core', 'Borrowing subtraction is core');

// 11. Build curriculum profile
console.log('\nCurriculum Profile:');
const profile = buildCurriculumProfile({ grade: 1 });
assert(profile.grade === 1, 'Profile grade is 1');
assert(profile.country === 'CN', 'Default country is CN');
assert(profile.textbookEdition === 'PEP', 'Default textbook is PEP');

// ========== Summary ==========

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  process.exit(1);
}
