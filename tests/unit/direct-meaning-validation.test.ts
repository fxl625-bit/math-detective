import assert from 'node:assert/strict';
import { allQuestions } from '@/data/questions';
import { getDefaultPhasesForStepType, normalizeStep } from '@/lib/lessonPlanner';
import { hintRevealsAnswer } from '@/lib/hintSafety';
import { questionContainsVisibleNumber, validateQuestionIntegrity, validateQuestionMeaningMode } from '@/lib/questionValidation';
import { classifyKeyword } from '@/data/keywordRules';
import type { LessonStepType, Question } from '@/lib/types';

const stepTypes: LessonStepType[] = [
  'find_numbers', 'find_action_words', 'simulation', 'remove_noise', 'full_solve',
  'find_compare_numbers', 'spot_extra_info', 'spot_missing_info', 'answer_only',
];
const directQuestions = allQuestions.filter(question => question.questionMeaningMode === 'direct');
assert.equal(directQuestions.length, 225, 'all 225 progression questions must explicitly use direct meaning mode');

for (const question of directQuestions) {
  assert.deepEqual(validateQuestionMeaningMode(question), [], `${question.id} must satisfy direct-mode schema`);
  assert.equal(question.questionMeaningOptions.length, 0, `${question.id} must not expose a meaning choice`);
  assert.equal(question.correctMeaning, '', `${question.id} must not store a meaning choice answer`);
  assert.ok(!question.cognitiveSkills.includes('understand_question'), `${question.id} must not schedule the removed meaning skill`);
  for (const type of stepTypes) {
    assert.ok(!getDefaultPhasesForStepType(type, question).includes('choose_operation'), `${question.id}/${type} must skip choose_operation`);
  }
}

const cachedQuestion = directQuestions[0];
const migrated = normalizeStep({
  id: 'cached-direct-step', type: 'full_solve', title: 'cached', description: 'cached',
  questionId: cachedQuestion.id, status: 'current', requiresAnswer: true,
  phases: ['read', 'find_numbers', 'choose_operation', 'build_equation', 'answer'],
  currentPhaseIndex: 2,
}, cachedQuestion);
assert.deepEqual(migrated.phases, ['read', 'find_numbers', 'build_equation', 'answer']);
assert.equal(migrated.currentPhaseIndex, 2, 'old current choose_operation phase advances to the next phase');
const allSkipped = normalizeStep({
  id: 'cached-direct-empty', type: 'simulation', title: 'cached', description: 'cached',
  questionId: cachedQuestion.id, status: 'current', requiresAnswer: true,
  phases: ['choose_operation'], currentPhaseIndex: 0,
}, cachedQuestion);
assert.ok(allSkipped.phases.length > 0, 'malformed cached phase list falls back to safe defaults');
assert.ok(!allSkipped.phases.includes('choose_operation'));

const choiceBase = allQuestions.find(question => question.questionMeaningMode !== 'direct')!;
const withChoice = (overrides: Partial<Question>): Question => ({ ...choiceBase, ...overrides });
assert.deepEqual(validateQuestionMeaningMode(withChoice({
  questionMeaningOptions: ['选项甲', '选项乙'], correctMeaning: '选项甲', answerSchema: { kind: 'integer' },
})), [], 'answerSchema must not bypass choice constraints');
assert.ok(validateQuestionMeaningMode(withChoice({ questionMeaningOptions: ['只有一项'], correctMeaning: '只有一项' })).some(error => error.includes('至少需要2个')));
assert.ok(validateQuestionMeaningMode(withChoice({ questionMeaningOptions: ['重复', '重复'], correctMeaning: '重复' })).some(error => error.includes('必须唯一')));
assert.ok(validateQuestionMeaningMode(withChoice({ questionMeaningOptions: ['甲', '乙'], correctMeaning: '丙', answerSchema: { kind: 'integer' } })).some(error => error.includes('恰好出现1次')));

assert.equal(questionContainsVisibleNumber('小红有二十本书', 20), true);
assert.equal(questionContainsVisibleNumber('打八折', 80), false, 'discount rates are semantic conversions, not stated numeric clues');
assert.equal(questionContainsVisibleNumber('一半', 2), false, 'half must not be converted into a number clue');
assert.equal(questionContainsVisibleNumber('下午2时开始', 2), true);
assert.equal(questionContainsVisibleNumber('有12个苹果', 2), false, 'Arabic number matching must not use substring matches');
assert.deepEqual(allQuestions.find(question => question.id === 'prog_g5_u1_05')?.numbers, [3.6, 32.4]);
assert.deepEqual(allQuestions.find(question => question.id === 'prog_g6_u3_01')?.numbers, [240]);
assert.deepEqual(allQuestions.find(question => question.id === 'prog_g6_u3_03')?.numbers, [180]);
assert.deepEqual(allQuestions.find(question => question.id === 'prog_g5_u5_05')?.numbers, [1, 4, 6]);
const shapeCount = allQuestions.find(question => question.id === 'g1ll_53')!;
assert.deepEqual(shapeCount.numbers, []);
assert.deepEqual(shapeCount.keywords, []);
assert.equal(shapeCount.keywordType, undefined);
assert.deepEqual(shapeCount.stepCompatibility, ['answer_only']);
assert.ok(!getDefaultPhasesForStepType('answer_only', shapeCount).includes('find_numbers'));

const hintQuestion = allQuestions.find(question => question.id === 'prog_g1_u1_01');
assert.ok(hintQuestion, 'target hint regression question must exist');
assert.equal(hintQuestion.hints[1], '先试1，再试2，比较每次三个相同数相加的结果与9的大小。');
assert.equal(hintRevealsAnswer(hintQuestion.hints[1], hintQuestion), false, 'medium hint must not reveal the answer');

for (const id of ['g1ll_69', 'g1ll_73', 'g1ll_74']) {
  const question = allQuestions.find(item => item.id === id)!;
  assert.equal(validateQuestionIntegrity(question).valid, true, `${id} must satisfy the full runtime integrity validator`);
  assert.ok(question.structuredHints, `${id} must keep answer-bearing solution steps behind structured hints`);
  assert.equal(hintRevealsAnswer(question.structuredHints!.light, question), false, `${id} light hint must not reveal the answer`);
  assert.equal(hintRevealsAnswer(question.structuredHints!.medium!, question), false, `${id} medium hint must not reveal the answer`);
  assert.deepEqual(question.structuredHints!.fullSteps?.map(step => step.explanation), question.solutionSteps);
}
const rewrittenG1 = allQuestions.find(item => item.id === 'g1ll_74')!;
assert.deepEqual(rewrittenG1.keywords.map(keyword => keyword.word), ['送给', '买来']);
assert.ok(rewrittenG1.keywords.every(keyword => classifyKeyword(keyword.word)), 'G1 action terms must use existing classifications');

console.log(`PASS direct meaning validation (${directQuestions.length} questions)`);
