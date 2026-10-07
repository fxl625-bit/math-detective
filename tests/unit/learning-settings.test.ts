import assert from 'node:assert/strict';
import { createLessonSignature, normalizeLearningSettings } from '@/lib/learningSettings';

function run(name: string, fn: () => void) { fn(); console.log(`PASS ${name}`); }

console.log('\n[learning-settings]');

run('normalizes all six grades and uses the frozen date/override source', () => {
  for (const grade of ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'] as const) {
    assert.equal(normalizeLearningSettings({ grade, date: new Date('2026-09-28T04:00:00Z') }).grade, grade);
  }
  assert.deepEqual(
    normalizeLearningSettings({ grade: 'G6', semester: 'lower', date: new Date('2026-09-28T04:00:00Z') }),
    { schemaVersion: 1, grade: 'G6', semester: 'upper', semesterSource: 'auto', textbookEdition: 'generic_cn', unitId: null, learnedTableRange: null, dailyGoal: 5, challengePreference: 'balanced' },
  );
  const manual = normalizeLearningSettings({ grade: 'G3', semesterOverride: 'lower', date: new Date('2026-09-28T04:00:00Z') });
  assert.equal(manual.semester, 'lower');
  assert.equal(manual.semesterSource, 'manual');
});

run('rejects cross-grade units and canonicalizes learned multiplication rows', () => {
  const settings = normalizeLearningSettings({ grade: 'G2', unitId: 'g2-u1', learnedTableRange: [5, 2, 3, 2, 0, 10, 1.5] });
  assert.equal(settings.unitId, 'g2-u1');
  assert.deepEqual(settings.learnedTableRange, [2, 3, 5]);
  assert.equal(normalizeLearningSettings({ grade: 'G1', unitId: 'g2-u1' }).unitId, null);
  assert.equal(normalizeLearningSettings({ grade: 'G2', learnedTableRange: [] }).learnedTableRange?.length, 0);
  assert.equal(normalizeLearningSettings({ grade: 'G2' }).learnedTableRange, null);
});

run('signature is stable and only includes multiplication range for related units', () => {
  const settings = normalizeLearningSettings({ grade: 'G2', unitId: 'g2-u1', learnedTableRange: [2, 3, 5] });
  const base = { settings, curriculumVersion: 'curr-1', contentVersion: 'content-1' };
  assert.equal(createLessonSignature(base), createLessonSignature(base));
  const differentUnit = normalizeLearningSettings({ grade: 'G2', unitId: 'g2-u3', learnedTableRange: [2, 3, 5] });
  const otherRows = normalizeLearningSettings({ grade: 'G2', unitId: 'g2-u3', learnedTableRange: [1, 4, 9] });
  assert.notEqual(createLessonSignature(base), createLessonSignature({ ...base, settings: differentUnit }));
  assert.equal(
    createLessonSignature({ ...base, settings: differentUnit }),
    createLessonSignature({ ...base, settings: otherRows }),
  );
  assert.notEqual(createLessonSignature(base), createLessonSignature({ ...base, contentVersion: 'content-2' }));
});
