import { questionsByGrade } from '@/data/questions/index';
import type { Question } from '@/lib/types';

const g1: Question[] = questionsByGrade['G1'];
console.log('=== G1 Question Pool Audit ===');
console.log('G1 total:', g1.length);

const annotated = g1.filter(q => q.skillIds && q.skillIds.length > 0);
console.log('Annotated (has skillIds):', annotated.length);
console.log('Unannotated:', g1.length - annotated.length);

const lowerSemester = g1.filter(q => q.curriculumSemester === 'lower' || q.curriculumSemester === 'both');
console.log('Lower semester eligible:', lowerSemester.length);

const byDifficulty: Record<number, number> = {};
for (const q of g1) {
  byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
}
console.log('By difficulty:', JSON.stringify(byDifficulty));

const isSingleDigitArith = (q: Question) => {
  const nums = (q as any).numbers || [];
  return nums.length > 0 && nums.every((n: any) => Math.abs(n.value) < 10) &&
    (q.operation === 'addition' || q.operation === 'subtraction');
};
const singleDigit = g1.filter(isSingleDigitArith);
console.log('Single-digit arithmetic:', singleDigit.length);

// Show unannotated questions
const unannotated = g1.filter(q => !q.skillIds || q.skillIds.length === 0);
console.log('\n=== Unannotated Questions ===');
for (const q of unannotated) {
  console.log(`  ${q.id}: diff=${q.difficulty} op=${q.operation} text="${q.text.substring(0, 40)}"`);
}

// Show difficulty distribution for annotated lower-semester
console.log('\n=== Annotated Lower Semester by Difficulty ===');
const annotatedLower = g1.filter(q => (q.skillIds?.length || 0) > 0 && (q.curriculumSemester === 'lower' || q.curriculumSemester === 'both'));
const byDiff2: Record<number, number> = {};
for (const q of annotatedLower) {
  byDiff2[q.difficulty] = (byDiff2[q.difficulty] || 0) + 1;
}
console.log('Annotated lower semester by difficulty:', JSON.stringify(byDiff2));
