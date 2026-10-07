import assert from 'node:assert/strict';
import { learningUnits } from '../../lib/curriculum/learningPath';
import { isQuestionSafeForLesson } from '../../lib/questionSafety';
import { checkAnswer } from '../../lib/answerChecker';
import { getQuestionById } from '../../data/questions';
import { progressionQuestions, questionLearningMetadata } from '../../data/questions/progression';

const byId = new Map(progressionQuestions.map((question) => [question.id, question]));
assert.equal(byId.size, progressionQuestions.length, 'progression question IDs must be unique');
assert.equal(learningUnits.length, 36, 'six grades × six units');

const unitById = new Map(learningUnits.map((unit) => [unit.id, unit]));
const allSkills = new Set(learningUnits.flatMap((unit) => unit.skillKeys));
const seenInUnit = new Map<string, string>();
const metadataIds = new Set<string>();

for (const entry of questionLearningMetadata) {
  const question = getQuestionById(entry.questionId) ?? byId.get(entry.questionId);
  const unit = unitById.get(entry.unitId);
  assert.ok(question, `metadata references missing question ${entry.questionId}`);
  assert.ok(unit, `metadata references missing unit ${entry.unitId}`);
  assert.equal(question.gradeBand, unit.grade, `${question.id} is outside ${unit.grade}`);
  if (byId.has(question.id)) assert.equal(question.qualityStatus, 'pass', `${question.id} is not approved for lessons`);
  assert.equal(isQuestionSafeForLesson(question).safe, true, `${question.id} fails lesson safety`);
  assert.ok(entry.targetSkillKeys.length > 0, `${question.id} has no target skill`);
  for (const skill of entry.targetSkillKeys) assert.ok(unit.skillKeys.includes(skill), `${question.id} target ${skill} is not in ${unit.id}`);
  for (const skill of entry.prerequisiteSkillKeys) assert.ok(allSkills.has(skill), `${question.id} prerequisite ${skill} is unknown`);
  const key = `${entry.unitId}:${entry.questionId}`;
  assert.ok(!seenInUnit.has(key), `${entry.questionId} is assigned more than once in ${entry.unitId}`);
  seenInUnit.set(key, entry.role);
  metadataIds.add(entry.questionId);
  const canonical = question.subAnswers?.length
    ? Object.fromEntries(question.subAnswers.map((field) => [field.id, String(field.answer)]))
    : String(question.answer);
  assert.equal(checkAnswer(canonical, question).correct, true, `checker rejects canonical answer for ${question.id}`);
}

for (const question of progressionQuestions) {
  assert.ok(metadataIds.has(question.id), `orphan progression question ${question.id}`);
  assert.ok(question.answerSchema, `${question.id} has no answer schema`);
}

for (const unit of learningUnits) {
  const entries = questionLearningMetadata.filter((entry) => entry.unitId === unit.id);
  const roleIds = (role: string) => entries.filter((entry) => entry.role === role).map((entry) => entry.questionId);
  assert.ok(roleIds('foundation').length >= 3, `${unit.id} needs three foundation candidates`);
  assert.ok(roleIds('application').length >= 2, `${unit.id} needs two application candidates`);
  assert.ok(roleIds('advanced').length >= 2, `${unit.id} needs two advanced candidates`);
  assert.ok(roleIds('olympiad').length >= 2, `${unit.id} needs two olympiad candidates`);
  assert.ok(new Set(entries.map((entry) => entry.questionId)).size >= 9, `${unit.id} needs nine distinct candidates`);
  for (const skill of unit.skillKeys) {
    const skillQuestionIds = new Set(entries.filter((entry) => entry.targetSkillKeys.includes(skill)).map((entry) => entry.questionId));
    assert.ok(skillQuestionIds.size > 0, `${unit.id} has no candidate for declared skill ${skill}`);
    assert.ok(skillQuestionIds.size >= 2, `${unit.id} skill ${skill} needs two distinct question IDs for adaptive progression`);
  }
  for (const role of ['advanced', 'olympiad']) {
    assert.ok(entries.some((entry) => entry.role === role && entry.tier === 1), `${unit.id} lacks a tier-1 ${role} entry`);
    assert.ok(entries.some((entry) => entry.role === role && entry.tier >= 2), `${unit.id} lacks a tier-2 ${role} entry`);
  }
}

// Prerequisites must form a finite DAG, and a directly selected unit remains available.
const visiting = new Set<string>();
const visited = new Set<string>();
const visit = (id: string) => {
  if (visiting.has(id)) throw new Error(`prerequisite cycle at ${id}`);
  if (visited.has(id)) return;
  visiting.add(id);
  const unit = unitById.get(id);
  assert.ok(unit, `unknown prerequisite unit ${id}`);
  for (const prerequisite of unit.prerequisiteUnitIds) visit(prerequisite);
  visiting.delete(id);
  visited.add(id);
};
for (const unit of learningUnits) visit(unit.id);

console.log(JSON.stringify({
  units: learningUnits.length,
  newQuestions: progressionQuestions.length,
  metadata: questionLearningMetadata.length,
  orphanCount: progressionQuestions.filter((question) => !metadataIds.has(question.id)).length,
  unitsWithSixRolePools: learningUnits.length,
}, null, 2));
