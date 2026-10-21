import assert from 'node:assert/strict';
import { allQuestions } from '@/data/questions';
import { inferAnswerSchema } from '@/lib/answerSchema';
import {
  buildReasoningTasks,
  createSolvingEvidence,
  evaluateReasoningTask,
  getExplicitQuestionNumberLiterals,
  selectTransferQuestion,
} from '@/lib/independentSolving';

const evidence = createSolvingEvidence();
assert.deepEqual(evidence.completedTaskIds, []);
assert.equal(evidence.phase, 'attempt');
assert.equal(evidence.firstAttemptCorrect, null);

const reverseQuestion = allQuestions.find(q => q.reasoningFrame?.targetQuestion.questionType === 'find_remaining');
assert.ok(reverseQuestion, 'expected a structured remaining-quantity question');
const tasks = buildReasoningTasks(reverseQuestion);
assert.ok(tasks.length >= 1 && tasks.length <= 3);
assert.ok(tasks.some(task => task.skill === 'target'));
assert.equal(new Set(tasks.flatMap(task => task.options.map(o => o.id))).has('correct'), true);
for (const task of tasks) {
  assert.equal(task.options.filter(o => o.id === task.correctOptionId).length, 1);
  assert.notEqual(task.options[0].id, task.correctOptionId, 'correct answer position should vary');
  const right = evaluateReasoningTask(task, task.correctOptionId);
  assert.equal(right.correct, true);
  const wrong = evaluateReasoningTask(task, task.options.find(o => o.id !== task.correctOptionId)!.id);
  assert.equal(wrong.correct, false);
  assert.ok(wrong.scaffold);
  const visible = [task.prompt, task.feedback, task.scaffold, ...task.options.map(o => o.label)].join(' ');
  assert.ok(!visible.includes(String(reverseQuestion.answer)), 'help must not show final numeric answer');
  assert.ok(!visible.includes(reverseQuestion.answerSentence), 'help must not copy the final answer sentence');
}

const gradeSix = allQuestions.find(q => q.gradeBand === 'G6' && q.questionMeaningOptions.length >= 2);
assert.ok(gradeSix, 'G6 representative question missing');
assert.ok(buildReasoningTasks(gradeSix).some(task => task.skill === 'target'));
const gradeSixProgression = allQuestions.find(q => q.id.startsWith('prog_g6_') && /[，,].*[？?]/.test(q.text));
assert.ok(gradeSixProgression, 'G6 progression fallback fixture missing');
assert.ok(buildReasoningTasks(gradeSixProgression).some(task => task.skill === 'condition'), 'progression fallback should use a source-grounded numeric condition');
const g6PercentTransfer = selectTransferQuestion(allQuestions.find(q => q.id === 'g6_06')!, allQuestions);
assert.deepEqual(g6PercentTransfer, {
  kind: 'matched', questionId: 'g6_21',
  reason: '年级、兼容学期、知识点、运算、答案类型和结构化数量关系一致，题目数字及答案不同。',
});
const money = allQuestions.find(q => q.domain === 'money' && q.questionMeaningOptions.length >= 2);
assert.ok(money, 'money representative question missing');
assert.ok(buildReasoningTasks(money).length > 0, 'money representative should retain a safe microtask');
const multiField = allQuestions.find(q => inferAnswerSchema(q).kind === 'multi_field');
assert.ok(multiField, 'multi-field representative question missing');
assert.ok(buildReasoningTasks(multiField).length > 0);
const logic = allQuestions.find(q => ['logic_truth', 'logic_ranking', 'logic_ordering'].includes(q.problemType || '')
  && buildReasoningTasks(q).length > 0);
if (logic) assert.ok(buildReasoningTasks(logic).length > 0);
const positions = allQuestions.flatMap(q => buildReasoningTasks(q).map(task =>
  task.options.findIndex(o => o.id === task.correctOptionId)));
assert.ok(positions.some(index => index === 0) && positions.some(index => index > 0), 'correct option must not stay in one position');

const byId = (id: string) => allQuestions.find(q => q.id === id)!;
function independentCorrectChoiceLeaks(questionId: string, label: string): boolean {
  const q = byId(questionId);
  const compact = (value: string) => value.toLowerCase().replace(/[\s，,。；;：:、()（）]/g, '');
  const shown = compact(label), answer = compact(String(q.answer)), sentence = compact(q.answerSentence || '');
  if (answer && (shown === answer || (answer.length >= 2 && shown.includes(answer)))) return true;
  if (sentence && shown.includes(sentence)) return true;
  if (/\d+(?:\.\d+)?\s*[+＋\-−×*÷/]\s*\d+(?:\.\d+)?\s*(?:=|＝)\s*[-+]?\d/.test(label)) return true;
  if (/[=＝<>]/.test(label) && /\d/.test(label)) return true;
  if (typeof q.answer === 'number') {
    const escaped = String(q.answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^\\d.])${escaped}(?![\\d.])`).test(label)) return true;
  }
  return false;
}
const unsafeCorrectChoices = allQuestions.flatMap(q => buildReasoningTasks(q).flatMap(task =>
  task.options.filter(item => item.id === task.correctOptionId && independentCorrectChoiceLeaks(q.id, item.label))
    .map(item => `${q.id}:${task.id}=${item.label}`)));
assert.deepEqual(unsafeCorrectChoices, [], 'no correct microtask option may be the final answer, answer sentence, comparator answer, or completed equation');
for (const id of ['g1ll_61', 'g1ll_64', 'g1ll_75', 'g1ll_79']) {
  const tasks = buildReasoningTasks(byId(id));
  assert.ok(!tasks.some(item => item.skill === 'target'), `${id} must not reuse its answer-bearing meaning option as a target task`);
  assert.ok(tasks.length > 0, `${id} should fall back to a safe source-grounded microtask`);
  assert.ok(tasks.every(item => item.options.filter(option => option.id === item.correctOptionId)
    .every(option => !independentCorrectChoiceLeaks(id, option.label))));
}

for (const [id, expected, rejected] of [
  ['g1t_29', '数量变多', '数量变少'],
  ['g1_17', '数量变少', '数量变多'],
  ['g1ll_10', '数量变多', '数量变少'],
] as const) {
  const actionTask = buildReasoningTasks(byId(id)).find(item => item.prompt.includes('数量怎样变化'));
  assert.ok(actionTask, `${id} must retain the action-direction learning task`);
  const correctLabel = actionTask.options.find(item => item.id === actionTask.correctOptionId)!.label;
  const wrongLabel = actionTask.options.find(item => item.id !== actionTask.correctOptionId)!.label;
  assert.equal(correctLabel, expected, `${id} action meaning`);
  assert.equal(wrongLabel, rejected, `${id} opposite action must be wrong`);
}

for (const id of ['g1ll_54', 'g3_24', 'prog_g6_u6_03', 'prog_g4_u4_07']) {
  const q = byId(id);
  const literals = getExplicitQuestionNumberLiterals(q.text);
  const task = buildReasoningTasks(q).find(item => item.prompt === '题目中给出的数字是哪一组？');
  assert.ok(task, `${id} should use only explicit text numerals`);
  assert.ok(task.options.find(item => item.id === task.correctOptionId)!.label.includes(literals[0]));
  const forbidden = id === 'g3_24' ? ['2.5'] : id === 'prog_g6_u6_03' ? ['10', '11']
    : id === 'prog_g4_u4_07' ? ['180', '2'] : ['0'];
  for (const value of forbidden) assert.ok(!task.options.some(item => item.label.includes(value)), `${id} leaked derived/bank-only value ${value}`);
}
assert.deepEqual(getExplicitQuestionNumberLiterals(byId('g1ll_54').text).includes('0'), false, 'unmentioned circle edge count must not be invented');
assert.deepEqual(getExplicitQuestionNumberLiterals(byId('g1_01').text), ['6只', '3只'], '一共 is grammar, not a given quantity');
assert.deepEqual(
  getExplicitQuestionNumberLiterals('一共来了，一起玩，一同出发，一样多，一些，一部分，两只小鸟。'),
  ['两只'],
  'Chinese number words require an explicit quantity unit and must not be extracted from grammar phrases',
);
assert.deepEqual(getExplicitQuestionNumberLiterals('十二张卡片和三十六分钟'), ['十二张', '三十六分钟']);
assert.ok(!buildReasoningTasks(byId('g1ll_09')).some(task => task.skill === 'condition' && /减少了多少/.test(task.prompt)), 'ambiguous reduction roles must not be selected');

assert.ok(buildReasoningTasks(byId('prog_g2_u2_08')).some(task => task.options.some(item => item.label.includes('最少再添几张'))));
assert.ok(buildReasoningTasks(byId('prog_g3_u5_08')).some(task => task.options.some(item => item.label.includes('至少放几袋'))));
assert.ok(buildReasoningTasks(byId('prog_g4_u3_06')).some(task => task.options.some(item => item.label.includes('还差多少钱') && item.label.includes('找回多少钱'))));

const curatedTransferPairs = [
  ['g2_01', 'g2_09'], ['g3_04', 'g3_11'], ['g4_19', 'g4_25'],
  ['g5_01', 'g5_21'], ['g6_06', 'g6_21'],
] as const;
for (const [from, to] of curatedTransferPairs) {
  const a = byId(from), b = byId(to);
  assert.equal(a.gradeBand, b.gradeBand);
  assert.equal(a.operation, b.operation);
  assert.equal(a.domain, b.domain);
  assert.notDeepEqual(a.numbers, b.numbers);
  assert.notEqual(String(a.answer), String(b.answer));
  const match = selectTransferQuestion(a, [b]);
  assert.equal(match.kind, 'matched', `${from} should match real same-relation transfer ${to}`);
  if (match.kind === 'matched') assert.equal(match.questionId, to);
}
const verifiedTransferPairs = [
  ['g1_01', 'g1_06', [6, 3], 9, [5, 3], 8],
  ['g1_01', 'g1_08', [6, 3], 9, [6, 4], 10],
  ['prog_g2_u2_01', 'g2_05', [18, 3], 6, [20, 4], 5],
] as const;
for (const [from, to, sourceNumbers, sourceAnswer, transferNumbers, transferAnswer] of verifiedTransferPairs) {
  const a = byId(from), b = byId(to);
  assert.equal(a.gradeBand, b.gradeBand);
  assert.equal(a.operation, b.operation);
  assert.equal(a.domain, b.domain);
  assert.deepEqual(a.numbers, sourceNumbers);
  assert.equal(a.answer, sourceAnswer);
  assert.deepEqual(b.numbers, transferNumbers);
  assert.equal(b.answer, transferAnswer);
  assert.notDeepEqual(a.numbers, b.numbers);
  assert.notEqual(a.answer, b.answer);
  if (from === 'g1_01') {
    assert.equal(a.text.includes('又跑来了'), true);
    assert.equal(b.text.includes('又开了') || b.text.includes('又进来了'), true);
    assert.equal(a.correctMeaning, '问总数');
    assert.equal(b.correctMeaning, '问总数');
  } else {
    assert.match(a.text, /平均分给3个小朋友，每人分到几张/);
    assert.match(b.text, /平均放在4个盒子里，每个盒子放几颗/);
  }
  const match = selectTransferQuestion(a, [b]);
  assert.equal(match.kind, 'matched', `${from} should match its verified same-structure transfer ${to}`);
  if (match.kind === 'matched') assert.equal(match.questionId, to);
}
for (const [a, b] of [['g1ll_18', 'g1ll_22'], ['g1ll_48', 'g1ll_50'], ['g1ll_64', 'g1ll_61'], ['g1ll_69', 'g1ll_74'], ['g1ll_75', 'g1ll_79']]) {
  assert.equal(selectTransferQuestion(byId(a), [byId(b)]).kind, 'unavailable', `${a}/${b} must not be called a transfer pair`);
}
assert.equal(allQuestions.filter(q => /^G[1-6]$/.test(q.gradeBand) || q.gradeBand === 'OlympiadIntro').length, 655);

const candidate = {
  ...reverseQuestion,
  id: `${reverseQuestion.id}_transfer_fixture`,
  text: '盒子里原来有几张卡片，后来取出了多少张？还剩下多少张？',
  answer: typeof reverseQuestion.answer === 'number' ? reverseQuestion.answer + 37 : 'fixture-answer',
  numbers: (reverseQuestion.numbers || []).map(n => n + 37),
  reasoningFrame: {
    ...reverseQuestion.reasoningFrame!,
    knownFacts: reverseQuestion.reasoningFrame!.knownFacts.map(f => ({ ...f, quantity: typeof f.quantity === 'number' ? f.quantity + 37 : f.quantity })),
  },
};
assert.equal(selectTransferQuestion(reverseQuestion, [candidate]).kind, 'matched');
const inverse = {
  ...candidate,
  id: `${candidate.id}_inverse`,
  operation: 'addition' as const,
  reasoningFrame: {
    ...candidate.reasoningFrame,
    targetQuestion: { ...candidate.reasoningFrame.targetQuestion, questionType: 'find_initial' },
  },
};
assert.equal(selectTransferQuestion(reverseQuestion, [inverse]).kind, 'unavailable', 'inverse unknown must not match direct remaining');
assert.equal(selectTransferQuestion(reverseQuestion, [{ ...candidate, answer: reverseQuestion.answer }]).kind, 'unavailable', 'a same-answer candidate is not a distinct transfer');
assert.equal(selectTransferQuestion(reverseQuestion, []).kind, 'unavailable');

console.log(`independent-solving content tests passed (${allQuestions.filter(q => /^G[1-6]$/.test(q.gradeBand)).length} G1-G6 questions available)`);
