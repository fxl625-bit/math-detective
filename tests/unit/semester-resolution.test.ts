import assert from 'node:assert/strict';
import { buildCurriculumProfile, resolveEffectiveSemester } from '@/lib/curriculum/semesterDetector';

function run(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

console.log('\n[semester-resolution]');

run('auto-detects upper in September and ignores legacy semester values', () => {
  const result = resolveEffectiveSemester({ date: new Date('2026-09-28T04:00:00.000Z') });
  assert.deepEqual(result, { semester: 'upper', source: 'date' });
});

run('auto-detects lower in March', () => {
  const result = resolveEffectiveSemester({ date: new Date('2026-03-15T04:00:00.000Z') });
  assert.deepEqual(result, { semester: 'lower', source: 'date' });
});

run('uses a valid explicit override over the date', () => {
  assert.deepEqual(
    resolveEffectiveSemester({ semesterOverride: 'lower', date: new Date('2026-09-28T04:00:00.000Z') }),
    { semester: 'lower', source: 'override' },
  );
  assert.deepEqual(
    resolveEffectiveSemester({ semesterOverride: 'upper', date: new Date('2026-03-15T04:00:00.000Z') }),
    { semester: 'upper', source: 'override' },
  );
});

run('builds profile with the same resolved semester and progress date', () => {
  const profile = buildCurriculumProfile({
    grade: 2,
    date: new Date('2026-09-28T04:00:00.000Z'),
  });
  assert.equal(profile.semester, 'upper');
  assert.equal(profile.semesterProgress, 'early');
  const overridden = buildCurriculumProfile({
    grade: 2,
    semesterOverride: 'lower',
    date: new Date('2026-09-28T04:00:00.000Z'),
  });
  assert.equal(overridden.semester, 'lower');
  assert.equal(overridden.semesterOverride, 'lower');
  const oppositeTermOverride = buildCurriculumProfile({
    grade: 5,
    semesterOverride: 'upper',
    date: new Date('2026-05-10T04:00:00.000Z'),
  });
  assert.equal(oppositeTermOverride.semesterProgress, 'early');
  const septemberLower = buildCurriculumProfile({
    grade: 5,
    semesterOverride: 'lower',
    date: new Date('2026-09-28T04:00:00.000Z'),
  });
  assert.equal(septemberLower.semesterProgress, 'early');
});
