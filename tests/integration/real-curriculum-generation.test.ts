import assert from 'node:assert/strict';
import { allQuestions, getQuestionById, isQuestionSafeForNewLesson } from '@/data/questions';
import { questionLearningMetadata } from '@/data/questions/progression';
import { learningUnits } from '@/lib/curriculum/learningPath';
import { buildDailyLesson } from '@/lib/lessonPlanner';
import { DEFAULT_GAME_STATE, type GameState, type LearningProfile } from '@/lib/types';

/** Exercise the current 36-unit production planner, not the retired cross-grade
 * theme planner. In particular an experienced G1 child must not be forced into
 * G2 preview when the parent has explicitly selected a G1 unit. */
let lessons = 0;
let steps = 0;
const roles = ['due_review', 'current_concept', 'same_skill_variant', 'application', 'stretch', 'olympiad'];
assert.equal(learningUnits.length, 36);
assert.equal(allQuestions.length, 655, 'transfer variants must not enlarge the original lesson pool');

for (const unit of learningUnits) {
  for (let scenario = 0; scenario < 28; scenario++) {
    const tier = scenario % 2 === 0 ? 1 : 2;
    const settings = {
      schemaVersion: 1 as const, grade: unit.grade, semester: scenario % 3 === 0 ? 'lower' as const : 'upper' as const,
      semesterSource: 'manual' as const, textbookEdition: 'generic_cn' as const,
      unitId: unit.id, learnedTableRange: scenario % 4 === 0 ? null : [2, 3, 4, 5, 6, 7, 8, 9],
      dailyGoal: 6, challengePreference: scenario % 3 === 0 ? 'guided' as const : 'balanced' as const,
    };
    const state: GameState = {
      ...DEFAULT_GAME_STATE,
      parentSettings: { ...DEFAULT_GAME_STATE.parentSettings, gradeBand: unit.grade, dailyGoal: 6,
        maxDifficulty: 5, learningSettings: settings },
      totalCompleted: scenario * 7,
      completedQuestions: [],
      learningDifficultyProgress: Object.fromEntries(unit.skillKeys.map(skillId => [
        `${unit.grade}:${unit.id}:${skillId}`,
        { grade: unit.grade, unitId: unit.id, role: 'foundation', skillId, difficulty: tier,
          consumedEventIds: [], consumedWindowIds: [] },
      ])),
    };
    const profile: LearningProfile = { gradeBand: unit.grade, streakDays: scenario, recentAccuracy: 80,
      weakSkills: [], dailyQuestionCount: 0, skillLevel: tier };
    const lesson = buildDailyLesson(profile, [], [], state);
    const label = `${unit.id}/scenario-${scenario}`;
    assert.equal(lesson.steps.length, 6, `${label}: all six roles need distinct safe original questions`);
    assert.equal(lesson.actualCore, 6, `${label}: the current planner must report full core coverage`);
    assert.deepEqual(lesson.coreGapReasons, [], `${label}: no hidden fallback or missing role`);
    assert.equal(new Set(lesson.steps.map(step => step.questionId)).size, 6, `${label}: no duplicate source`);
    assert.deepEqual(lesson.steps.map(step => step.role), roles, `${label}: application, stretch and olympiad are required`);
    for (const step of lesson.steps) {
      const question = getQuestionById(step.questionId);
      assert.ok(question, `${label}: ${step.questionId} resolves`);
      assert.equal(question.gradeBand, unit.grade, `${label}: preserve the parent's grade`);
      assert.equal(isQuestionSafeForNewLesson(question), true, `${label}: no unsafe source`);
      assert.ok(!question.id.startsWith('transfer_'), `${label}: transfer-only variants cannot enter normal daily lessons`);
      const metadata = questionLearningMetadata.find(item => item.unitId === unit.id && item.questionId === question.id);
      assert.ok(metadata, `${label}: every question belongs to the selected current unit`);
      assert.deepEqual(step.phases, ['answer', 'explain'], `${label}: independent answering remains the first phase`);
      assert.equal(step.solving?.firstAttemptCorrect ?? null, null, `${label}: fresh lessons cannot claim a correct attempt`);
    }
    const concept = questionLearningMetadata.find(item => item.unitId === unit.id && item.questionId === lesson.steps[1].questionId)!;
    const practice = questionLearningMetadata.find(item => item.unitId === unit.id && item.questionId === lesson.steps[2].questionId)!;
    assert.ok(concept.targetSkillKeys.some(skill => practice.targetSkillKeys.includes(skill)), `${label}: concept and practice share an actual skill`);
    lessons++;
    steps += lesson.steps.length;
  }
}
assert.equal(lessons, 1008);
console.log(`PASS real curriculum generation: ${lessons} lessons, ${steps} original-question slots, all 36 units across G1-G6; zero cross-unit, transfer-only, unsafe, duplicate or missing-role slots.`);
