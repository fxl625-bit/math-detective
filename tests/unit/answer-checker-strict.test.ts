import assert from 'node:assert/strict';
import { checkAnswer } from '@/lib/answerChecker';
import { displayPercentInputValue, inferAnswerSchema, isValidPercentEntry, serializePercentAnswer } from '@/lib/answerSchema';
import { formatYuanJiaoValue } from '@/components/lesson/MoneyInput';
import { getQuestionById, isQuestionSafeForNewLesson, questionsByGrade } from '@/data/questions';

function question(id: string) {
  const value = getQuestionById(id);
  assert.ok(value, `missing fixture ${id}`);
  return value;
}

const fraction = question('g3_06');
assert.equal(checkAnswer('3/8', fraction).correct, true);
assert.equal(checkAnswer('6/16', fraction).correct, true);
assert.equal(checkAnswer('3/999', fraction).correct, false);
assert.equal(checkAnswer('3/0', fraction).correct, false);
assert.equal(checkAnswer('12abc', { ...fraction, answer: 12 }).correct, false);
assert.equal(checkAnswer('１２', { ...fraction, answer: 12 }).correct, true);
assert.equal(checkAnswer('', { ...fraction, answer: 12 }).correct, false);
assert.equal(checkAnswer('0.25', { ...fraction, answer: 0.25 }).correct, true);
assert.equal(checkAnswer('1/4', { ...fraction, answer: 0.25 }).correct, true);
assert.equal(checkAnswer('0.29', { ...fraction, answer: 0.29 }).correct, true);
assert.equal(checkAnswer('0.29', { ...fraction, answer: '29/100' }).correct, true);

const percentage = question('g5o_14');
assert.equal(checkAnswer('28%', percentage).correct, true);
assert.equal(checkAnswer('28abc', percentage).correct, false);
assert.equal(checkAnswer('28', percentage).correct, false);
assert.equal(checkAnswer('7/25', percentage).correct, true);
const percentInput = question('g6_21');
assert.equal(inferAnswerSchema(percentInput).kind, 'percent');
assert.equal(displayPercentInputValue(serializePercentAnswer('92')), '92');
assert.equal(serializePercentAnswer('92'), '92%');
assert.equal(checkAnswer(serializePercentAnswer('92'), percentInput).correct, true);
assert.equal(serializePercentAnswer('92%'), '92%', 'pasted percent sign is not duplicated');
assert.equal(checkAnswer(serializePercentAnswer('92%'), percentInput).correct, true);
assert.equal(serializePercentAnswer('0.25'), '0.25%');
assert.equal(checkAnswer(serializePercentAnswer('0.25'), { ...percentInput, answer: '0.25%' }).correct, true);
assert.equal(isValidPercentEntry('1/4'), false, 'the fixed-percent widget cannot render a fraction with a percent suffix');
assert.equal(checkAnswer('1/4', { ...percentInput, answer: '25%' }).correct, true, 'the checker still recognizes an explicitly supplied rational equivalent');
assert.equal(checkAnswer('0.25', percentInput).correct, false, 'bare 0.25 is not reinterpreted as 25%');
const decimalPercent = question('g5o_17');
assert.equal(inferAnswerSchema(decimalPercent).kind, 'percent');
assert.equal(checkAnswer(serializePercentAnswer('135.3'), decimalPercent).correct, true);
const multiPercent = question('g5o_16');
const multiPercentSchema = inferAnswerSchema(multiPercent);
assert.equal(multiPercentSchema.kind, 'multi_field');
if (multiPercentSchema.kind === 'multi_field') assert.equal(multiPercentSchema.fields.find(field => field.id === 'rate')?.kind, 'percent');
assert.equal(checkAnswer({ profit: '18', rate: serializePercentAnswer('12') }, multiPercent).correct, true);
assert.equal(checkAnswer({ profit: '18', rate: serializePercentAnswer('12%') }, multiPercent).correct, true, 'pasted percent in the real multi-field question is accepted');
assert.equal(checkAnswer({ profit: '18', rate: serializePercentAnswer('0.12') }, multiPercent).correct, false);
const ratio = question('g5o_08');
assert.equal(checkAnswer('3:4:6', ratio).correct, true);
assert.equal(checkAnswer('3xxx', ratio).correct, false);
assert.equal(checkAnswer('6:8:12', ratio).correct, true);

const coinCount = question('g1ll_45');
assert.deepEqual(inferAnswerSchema(coinCount), { kind: 'integer', allowNegative: false });
assert.equal(checkAnswer('10', coinCount).correct, true);
const yuanAmount = question('g1ll_49');
assert.equal(inferAnswerSchema(yuanAmount).kind, 'integer');
assert.equal(checkAnswer('7', yuanAmount).correct, true);
const pureMoneyAnswer = { ...coinCount, answer: '1元5角', answerType: 'money' as const, answerSchema: undefined };
assert.equal(inferAnswerSchema(pureMoneyAnswer).kind, 'money');
assert.equal(checkAnswer('15角', pureMoneyAnswer).correct, true);
const amountAndVerdict = question('g1ll_46');
const verdictSchema = inferAnswerSchema(amountAndVerdict);
assert.equal(verdictSchema.kind, 'choice');
if (verdictSchema.kind === 'choice') assert.ok(verdictSchema.options.some(option => option.value === '13角，够1元'));
assert.equal(checkAnswer('13角，够1元', amountAndVerdict).correct, true);
assert.equal(checkAnswer('correct', amountAndVerdict).correct, true, 'choice UI submits option id and checker resolves it through schema value');
assert.equal(checkAnswer('13角，不够1元', amountAndVerdict).correct, false);
const jiaoAmount = question('g1ll_48');
assert.equal(inferAnswerSchema(jiaoAmount).kind, 'money');
assert.equal(checkAnswer(formatYuanJiaoValue('', '2'), jiaoAmount).correct, true, 'yuan/jiao UI serialization reaches the checker as 2角');
const changeAmount = question('g1ll_50');
assert.equal(inferAnswerSchema(changeAmount).kind, 'money');
assert.equal(checkAnswer(formatYuanJiaoValue('1', '5'), changeAmount).correct, true, 'yuan/jiao UI serialization reaches the checker as 1元5角');

const accepted = { ...question('g2_07'), answerType: 'text' as const, answerSchema: { kind: 'text' as const, acceptedAnswers: ['8时50分'] } };
assert.equal(checkAnswer('8时50分', accepted).correct, true);
assert.equal(checkAnswer('8时51分', accepted).correct, false);

const q2Multi = question('g2o_01');
if (q2Multi.subAnswers?.[0]) {
  const first = q2Multi.subAnswers[0];
  assert.equal(checkAnswer({ [first.id]: '7abc', ...(q2Multi.subAnswers[1] ? { [q2Multi.subAnswers[1].id]: String(q2Multi.subAnswers[1].answer) } : {}) }, q2Multi).correct, false);
}

for (const id of ['g1ll_65', 'g1ll_67', 'g2_24', 'g5o_13']) {
  const unsafe = question(id);
  assert.equal(isQuestionSafeForNewLesson(unsafe), false);
  assert.equal(questionsByGrade[unsafe.gradeBand].some(candidate => candidate.id === id), false);
}
console.log('PASS strict full-string numeric checking and safe question pool filtering');
