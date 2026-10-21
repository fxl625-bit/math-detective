import assert from 'node:assert/strict';
import { allQuestions, getQuestionById, safeQuestions, transferCatalog, questionsByGrade } from '@/data/questions';
import { selectTransferQuestion } from '@/lib/independentSolving';
import { transferFingerprint } from '@/data/questions/transfers/helpers';
import { validateTransferEntry } from '@/lib/transferContract';
import { inferAnswerSchema, serializePercentAnswer, validateAnswerSchema } from '@/lib/answerSchema';
import { checkAnswer } from '@/lib/answerChecker';

const originals = allQuestions.filter(question => /^G[1-6]$/.test(question.gradeBand));
assert.equal(originals.length, 625);
assert.equal(allQuestions.length, 655);
assert.ok(transferCatalog.entries.length > 20, 'the expansion must exceed the previous coverage');
assert.deepEqual(transferCatalog.validationErrors, [], 'rejected proposals must be fixed rather than hidden');
assert.equal(transferCatalog.bySourceId.size + transferCatalog.gaps.length, 625);
assert.equal(new Set(transferCatalog.gaps.map(gap => gap.sourceId)).size, transferCatalog.gaps.length);
assert.ok(transferCatalog.gaps.every(gap => ['source-unsafe', 'constant-answer-by-design', 'difficulty-not-preserved'].includes(gap.reason)
  && gap.detail.trim().length > 8), 'unfinished recipes and oracle work must not be presented as reviewed unavailability');
for (const gap of transferCatalog.gaps) {
  const source = getQuestionById(gap.sourceId)!;
  assert.equal(selectTransferQuestion(source, allQuestions).kind, 'unavailable', `${gap.sourceId} must not bypass the reviewed gap through an old generic match`);
}

for (const pool of [allQuestions, safeQuestions, ...Object.values(questionsByGrade)]) {
  assert.ok(pool.every(question => !question.id.startsWith('transfer_')), 'normal lesson pools must never contain transfer-only variants');
}
for (const entry of transferCatalog.entries) {
  const source = getQuestionById(entry.sourceId)!;
  assert.equal(getQuestionById(entry.variant.id), entry.variant);
  assert.equal(entry.sourceFingerprint, transferFingerprint(source));
  assert.deepEqual(validateTransferEntry(source, entry), []);
  assert.deepEqual(validateAnswerSchema(entry.variant), [], `${entry.variant.id} must have complete input data and valid answer bounds`);
  const inputSchema = inferAnswerSchema(entry.variant);
  const actualInput = entry.variant.subAnswers?.length
    ? Object.fromEntries(entry.variant.subAnswers.map(field => [field.id, inputSchema.kind === 'multi_field'
      && inputSchema.fields.find(item => item.id === field.id)?.kind === 'percent'
      ? serializePercentAnswer(String(field.answer)) : String(field.answer)])) : String(entry.variant.answer);
  assert.equal(checkAnswer(actualInput, entry.variant).correct, true, `${entry.variant.id} must accept its independently verified answer through the real checker`);
  if (entry.variant.correctRanking?.order) {
    const order = entry.variant.correctRanking.order;
    assert.equal(checkAnswer(order.join('，'), entry.variant).correct, true);
    assert.equal(checkAnswer([...order].reverse().join(','), entry.variant).correct, false);
    assert.equal(checkAnswer(`${order.join(',')},`, entry.variant).correct, false, 'an extra empty rank cannot be silently discarded');
  }
  assert.equal(selectTransferQuestion(source, allQuestions).kind, 'matched');
  assert.equal(selectTransferQuestion(source, [entry.variant]).kind, 'matched');
  assert.equal(selectTransferQuestion(entry.variant, [...allQuestions, entry.variant]).kind, 'unavailable', 'transfers cannot recursively create transfers');
  assert.equal(selectTransferQuestion(source, []).kind, 'unavailable');
  const alteredSource = { ...source, text: `${source.text}（条件已经改变）` };
  assert.ok(validateTransferEntry(alteredSource, entry).includes('source-drift'));
  assert.equal(selectTransferQuestion(alteredSource, [alteredSource]).kind, 'unavailable');
  for (const badVariant of [
    { ...entry.variant, difficulty: (entry.variant.difficulty === 5 ? 4 : 5) as 1 | 2 | 3 | 4 | 5 },
    { ...entry.variant, qualityStatus: 'unsafe' as const },
    { ...entry.variant, gradeBand: entry.variant.gradeBand === 'G6' ? 'G5' as const : 'G6' as const },
    { ...entry.variant, answerSchema: inferAnswerSchema(entry.variant).kind === 'text'
      ? { kind: 'integer' as const } : { kind: 'text' as const, acceptedAnswers: ['a different kind'] } },
  ]) {
    assert.ok(validateTransferEntry(source, { ...entry, variant: badVariant }).length > 0);
    assert.equal(selectTransferQuestion(source, [badVariant]).kind, 'unavailable');
  }
}
assert.equal(getQuestionById('transfer_not_a_real_source_v999_01'), undefined);
// Checking the source's old table facts would silently allow new, unlearned factors.
const tableSource = getQuestionById('prog_g2_u1_03')!;
assert.equal(selectTransferQuestion(tableSource, allQuestions).kind, 'matched');
const tableContext = { grade: 'G2' as const, unitId: 'g2-u1', learnedTableRange: [3, 5] };
assert.equal(selectTransferQuestion(tableSource, allQuestions, tableContext).kind, 'unavailable');
assert.equal(selectTransferQuestion(tableSource, allQuestions, { ...tableContext, learnedTableRange: [2, 4] }).kind, 'matched');
assert.equal(selectTransferQuestion(tableSource, allQuestions, { ...tableContext, learnedTableRange: [] }).kind, 'unavailable');
assert.equal(selectTransferQuestion(tableSource, allQuestions, { ...tableContext, learnedTableRange: null }).kind, 'unavailable');
const conceptSource = getQuestionById('prog_g2_u1_01')!;
assert.equal(selectTransferQuestion(conceptSource, allQuestions, { ...tableContext, learnedTableRange: [] }).kind, 'matched', 'equal-group concepts must not be mistaken for memorized table facts');
assert.equal(selectTransferQuestion(tableSource, allQuestions, { ...tableContext, unitId: 'g2-u3' }).kind, 'matched', 'the table setting guard belongs only to the two introduction units');
for (const grade of ['G1', 'G2', 'G3', 'G4', 'G5', 'G6']) {
  assert.ok(transferCatalog.entries.some(entry => entry.variant.gradeBand === grade), `${grade} must have reviewed new variants`);
}
console.log(`PASS transfer registry: ${transferCatalog.entries.length} variants, ${transferCatalog.bySourceId.size}/625 sources; ${transferCatalog.gaps.length} explicit gaps`);
