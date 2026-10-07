import assert from 'node:assert/strict';
import { availableMentalMathOperations, buildMentalMathLearningEvents, checkMentalMathAnswer, generateQuestions, summarizeSession } from '@/lib/mentalMath';
import { resolveConceptTool } from '@/components/lesson/ConceptLab';
import { getAccuracyStats } from '@/lib/storage';
import { DEFAULT_GAME_STATE } from '@/lib/types';

const rng = (() => { let value = 0; return () => { value = (value + 0.17) % 1; return value; }; })();
const every = (grade: string, op: Parameters<typeof generateQuestions>[0]) => generateQuestions(op, grade, 10, { rng });

assert.deepEqual(availableMentalMathOperations('G1'), ['addition', 'subtraction', 'mixed']);
for (const q of [...every('G1', 'addition'), ...every('G1', 'subtraction')]) {
  assert.ok(Number(q.answer) >= 0 && Number(q.answer) <= 20, q.text);
  assert.equal(Number(q.answer), q.operation === 'addition' ? q.left + q.right : q.left - q.right, q.text);
}
for (const extreme of [() => 0, () => 0.999999999]) {
  for (const q of generateQuestions('mixed', 'G1', 20, { rng: extreme })) {
    assert.ok(Number.isInteger(q.left) && Number.isInteger(q.right) && Number.isInteger(q.answer), q.text);
    assert.ok(Number(q.answer) >= 0 && Number(q.answer) <= 20, q.text);
    assert.equal(Number(q.answer), q.operation === 'addition' ? q.left + q.right : q.left - q.right, q.text);
  }
}
for (const q of generateQuestions('mixed', 'G2', 40, { rng, learnedTableRange: [2, 3, 5] })) {
  if (q.operation === 'multiplication') assert.ok([2, 3, 5].includes(q.left) || [2, 3, 5].includes(q.right), q.text);
  else assert.ok([2, 3, 5].includes(q.right), q.text);
  assert.equal(q.operation === 'multiplication' ? q.left * q.right : q.left / q.right, Number(q.answer), q.text);
}
for (const rows of [null, []]) {
  const intro = generateQuestions('mixed', 'G2', 6, { rng, learnedTableRange: rows });
  assert.ok(intro.every(q => /组|平均分/.test(q.text)));
}
for (const grade of ['G3', 'G4', 'G5', 'G6']) {
  const examples = every(grade, 'mixed');
  assert.ok(new Set(examples.map(q => q.text)).size >= 2, grade);
  assert.ok(examples.every(q => q.right !== 0), grade);
  assert.ok(examples.every(q => checkMentalMathAnswer(String(q.answer), q)), grade);
  assert.ok(examples.every(q => !checkMentalMathAnswer(`${q.answer}abc`, q)), grade);
}
for (const q of generateQuestions('mixed', 'G3', 40, { rng })) assert.ok(Number(q.answer) <= 1000, q.text);
const g5 = every('G5', 'division');
assert.ok(g5.every(q => /^\d+(?:\.\d+)?$/.test(String(q.answer))));
assert.ok(g5.every(q => Math.abs(q.left / q.right - Number(q.answer)) < 1e-9));
const fraction = generateQuestions('division', 'G6', 2, { rng })[0];
assert.equal(fraction.answerKind, 'fraction');
const [numerator, denominator] = String(fraction.answer).split('/').map(Number);
if (denominator) assert.equal(checkMentalMathAnswer(`${numerator * 2}/${denominator * 2}`, fraction), true);
assert.equal(checkMentalMathAnswer('1/0', fraction), false);
const percent = generateQuestions('multiplication', 'G6', 2, { rng })[1];
assert.equal(percent.answerKind, 'percent');
assert.equal(checkMentalMathAnswer(String(percent.answer).replace('%', ''), percent), false);

const summary = summarizeSession({ id: 'test', date: '2026-09-28', grade: 'G6', operation: 'division', mode: 'learning', totalQuestions: 1,
  answers: [{ questionId: 'q', correct: false, submitted: '1/3', answer: '1/2', timeMs: 1200, attempts: 2, finalCorrect: true }], completedAt: '2026-09-28T00:00:00Z' });
assert.equal(summary.correctCount, 0, 'retry must not rewrite first-attempt accuracy');
assert.equal(summary.answers[0].finalCorrect, true);
const oralSession = {
  id: 'oral-ten', date: new Date().toISOString().slice(0, 10), grade: 'G6', operation: 'mixed' as const,
  totalQuestions: 10, correctCount: 9, avgTimeMs: 1000,
  answers: Array.from({ length: 10 }, (_, index) => ({
    questionId: `oral-q${index}`, correct: index !== 9, finalCorrect: true,
    submitted: index === 9 ? 'wrong-first' : 'right', answer: 'right', timeMs: 1000,
    attempts: index === 9 ? 2 : 1,
  })),
  completedAt: new Date().toISOString(),
};
const oralEvents = buildMentalMathLearningEvents(oralSession, { childProfileId: 'child', deviceId: 'device' });
const oralStats = getAccuracyStats({ ...DEFAULT_GAME_STATE, learningEvents: oralEvents });
assert.equal(oralStats.totalAttempts, 10);
assert.equal(oralStats.correctAttempts, 9, 'eventual correction must not rewrite first-attempt accuracy');
assert.equal(oralStats.todayCompleted, 10, 'eventual corrections count completed oral questions');
assert.equal(oralEvents.filter(event => event.eventType === 'question_completed').length, 10);
assert.ok(oralEvents.findIndex(event => event.questionId === 'oral-q9' && event.eventType === 'attempt_submitted')
  < oralEvents.findIndex(event => event.questionId === 'oral-q9' && event.eventType === 'question_completed'),
  'attempt event stays before the completion event');
assert.equal(resolveConceptTool('G1', 'g1-u1'), 'line');
assert.equal(resolveConceptTool('G2', 'g2-u1'), 'groups');
assert.equal(resolveConceptTool('G3', 'g3-u3'), 'fraction');
assert.equal(resolveConceptTool('G4', 'g4-u5'), 'chart');
assert.equal(resolveConceptTool('G5', 'g5-u5'), 'balance');
assert.equal(resolveConceptTool('G6', 'g6-u3'), 'percent');
console.log('PASS mental math six-grade generation, strict answers, retry summary, concept routes');
