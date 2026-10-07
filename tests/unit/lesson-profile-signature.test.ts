import assert from 'node:assert/strict';
import { buildDailyLesson, safeNormalizeLesson } from '@/lib/lessonPlanner';
import { DEFAULT_GAME_STATE } from '@/lib/types';
import { normalizeLearningSettings } from '@/lib/learningSettings';

const settings = normalizeLearningSettings({ grade: 'G2', semesterOverride: 'lower', unitId: 'g2-u1', learnedTableRange: [2, 3, 5] });
const state = {
  ...DEFAULT_GAME_STATE,
  parentSettings: {
    ...DEFAULT_GAME_STATE.parentSettings,
    gradeBand: 'G2' as const,
    semesterOverride: 'lower' as const,
    learningSettings: settings,
    textbookEdition: 'generic_cn' as const,
  },
  curriculumProfile: {
    country: 'CN', textbookEdition: 'generic_cn', grade: 2, semester: 'lower' as const,
    semesterOverride: 'lower' as const, detectedAt: '2026-09-28T00:00:00.000Z',
  },
};
const profile = { gradeBand: 'G2' as const, streakDays: 0, recentAccuracy: 100, weakSkills: [], dailyQuestionCount: 0, skillLevel: 1 };
const first = buildDailyLesson(profile, [], [], state);
const second = buildDailyLesson(profile, [], [], state);
assert.equal(first.lessonSignature, second.lessonSignature);
assert.equal(first.lessonId, second.lessonId);
assert.equal(first.settingSnapshot?.unitId, 'g2-u1');
assert.equal((first as any).curriculumSnapshot.semester, 'lower');
assert.equal((first as any).curriculumSnapshot.semesterSource, 'manual');
assert.ok(first.steps.every(step => step.questionInstanceId?.startsWith(`${first.lessonId}:`)));
assert.equal(new Set(first.steps.map(step => step.questionInstanceId)).size, first.steps.length);

const normalized = safeNormalizeLesson(first);
assert.equal(normalized?.lessonSignature, first.lessonSignature);
assert.equal((normalized as any)?.curriculumSnapshot?.lessonSignature, first.lessonSignature);
assert.deepEqual(normalized?.steps.map(step => step.questionInstanceId), first.steps.map(step => step.questionInstanceId));
console.log('PASS lesson settings signature and question instance identities survive build/normalize');
