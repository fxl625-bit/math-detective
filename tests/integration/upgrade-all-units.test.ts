import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { learningUnits } from '../../lib/curriculum/learningPath';
import { normalizeLearningSettings } from '../../lib/learningSettings';
import { buildDailyLesson } from '../../lib/lessonPlanner';
import { DEFAULT_GAME_STATE, type LearningProfile, type LearningEvent } from '../../lib/types';
import { getQuestionById } from '../../data/questions';
import { questionLearningMetadata } from '../../data/questions/progression';
import { checkAnswer } from '../../lib/answerChecker';

// Exercise the production generator and registry together, including unknown
// multiplication fluency. Every browser fixture uses isolated synthetic data.
const RealDate = Date;
let clock = '2026-09-28T12:00:00+08:00';
class FixedDate extends RealDate {
  constructor(value?: string | number) { super(value === undefined ? clock : value); }
  static now() { return new RealDate(clock).getTime(); }
}
globalThis.Date = FixedDate as DateConstructor;
const failures: unknown[] = [];
let cases = 0;
try {
  for (const unit of learningUnits) {
    for (const semester of ['upper', 'lower'] as const) {
      for (const preference of ['guided', 'balanced', 'stretch'] as const) {
       for (const evidence of ['beginner', 'earned', 'weak-prerequisites'] as const) {
        for (let day = 1; day <= 30; day++) {
          clock = `2026-${semester === 'upper' ? '09' : '03'}-${String(day).padStart(2, '0')}T12:00:00+08:00`;
          const state = structuredClone(DEFAULT_GAME_STATE);
          state.parentSettings = { ...state.parentSettings, gradeBand: unit.grade, dailyGoal: 6 };
          state.parentSettings.learningSettings = normalizeLearningSettings({
            grade: unit.grade, unitId: unit.id, semesterOverride: semester,
            challengePreference: preference, dailyGoal: 6,
            learnedTableRange: evidence === 'beginner' ? null : [1, 2, 3, 4, 5, 6, 7, 8, 9],
          });
          if (evidence !== 'beginner') {
            state.learningDifficultyProgress = Object.fromEntries(unit.skillKeys.map(skillId => [
              `${unit.grade}:${unit.id}:${skillId}`,
              { grade: unit.grade, unitId: unit.id, role: 'all', skillId, difficulty: 2 as const, consumedEventIds: [], consumedWindowIds: [] },
            ]));
          }
          if (evidence === 'weak-prerequisites') {
            const prerequisites = [...new Set(questionLearningMetadata.filter(item => item.unitId === unit.id).flatMap(item => item.prerequisiteSkillKeys))];
            state.learningEvents = prerequisites.flatMap(skillId => Array.from({ length: 3 }, (_, index): LearningEvent => ({
              schemaVersion: 1, eventId: `${skillId}:${index}`, childProfileId: 'synthetic', deviceId: 'fixture',
              sessionId: `prior-${index}`, lessonId: `prior-${index}`, questionInstanceId: `${skillId}:${index}`,
              questionId: `prerequisite-${index}`, questionVersion: 'v1', skillIds: [skillId],
              grade: unit.grade, semester, unitId: skillId.split(':')[0], role: 'current_concept',
              eventType: 'attempt_submitted', actionId: `${skillId}:${index}`, attemptId: `${skillId}:${index}`,
              timestamp: `2026-01-0${index + 1}T00:00:00.000Z`, hintLevel: 'none', completionMode: 'independent',
              result: 'incorrect', firstAttemptKnown: true,
            })));
          }
          const profile: LearningProfile = {
            gradeBand: unit.grade, streakDays: 0, recentAccuracy: 100,
            weakSkills: [], dailyQuestionCount: 0, skillLevel: 1,
          };
          const lesson = buildDailyLesson(profile, [], [], state);
          const issues: string[] = [];
          if (lesson.steps.length !== 6 || lesson.actualCore !== 6) issues.push(`core=${lesson.actualCore}; ${lesson.coreGapReasons}`);
          if (new Set(lesson.steps.map(step => step.questionId)).size !== lesson.steps.length) issues.push('duplicate question');
          if (lesson.steps.find(step => step.role === 'current_concept')?.skill !== lesson.steps.find(step => step.role === 'same_skill_variant')?.skill) {
            issues.push('concept and same-skill variant target different skills');
          }
          for (const step of lesson.steps) {
            const question = getQuestionById(step.questionId);
            if (!question) { issues.push(`unregistered ${step.questionId}`); continue; }
            if (question.gradeBand !== unit.grade) issues.push(`wrong grade ${question.id}`);
            if (!step.skill?.startsWith(`${unit.id}:`)) issues.push(`missing unit skill ${question.id}`);
            if (evidence === 'beginner' && step.tier !== 'tier1') issues.push(`unearned challenge ${question.id}`);
            if (evidence === 'earned' && preference !== 'guided' && (step.role === 'stretch' || step.role === 'olympiad') && step.tier !== 'tier2') {
              issues.push(`earned tier2 not selected for ${step.role}: ${question.id}`);
            }
            const metadata = questionLearningMetadata.find(item => item.questionId === question.id && item.unitId === unit.id);
            if (evidence === 'weak-prerequisites' && metadata?.prerequisiteSkillKeys.length && step.tier !== 'tier1') {
              issues.push(`weak prerequisite did not hold ${question.id} at tier1`);
            }
            const submission = question.subAnswers?.length
              ? Object.fromEntries(question.subAnswers.map(field => [field.id, String(field.answer)]))
              : String(question.answer);
            if (!checkAnswer(submission, question).correct) issues.push(`canonical answer rejected ${question.id}`);
          }
          cases++;
          if (issues.length) failures.push({ unit: unit.id, semester, preference, evidence, day, issues });
        }
       }
      }
    }
  }
} finally { globalThis.Date = RealDate; }
const result = { cases, failureCount: failures.length, failures };
writeFileSync('reports/2026-09-28-upgrade/all-unit-generation.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ cases, failureCount: failures.length, examples: failures.slice(0, 5) }, null, 2));
assert.equal(failures.length, 0, 'every advertised unit must generate six distinct, registered and answerable core questions');
