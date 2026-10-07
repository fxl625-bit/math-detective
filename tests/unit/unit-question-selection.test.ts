import assert from 'node:assert/strict';
import { orderDailyCandidates, selectDistinctCoreCandidates, type DailyCoreCandidate } from '@/lib/curriculum/unitQuestionSelection';

const candidate = (questionId: string, role: DailyCoreCandidate['role']): DailyCoreCandidate => ({ questionId, role });
const selection = selectDistinctCoreCandidates({
  due_review: [candidate('shared', 'foundation')],
  current_concept: [candidate('shared', 'foundation'), candidate('foundation-only', 'foundation')],
  same_skill_variant: [candidate('variant-only', 'foundation')],
  application: [candidate('app', 'application')],
  stretch: [candidate('advanced', 'advanced')],
  olympiad: [candidate('shared', 'olympiad'), candidate('olympiad-only', 'olympiad')],
});

assert.deepEqual(selection.map(item => item?.questionId ?? null), [
  'shared', 'foundation-only', 'variant-only', 'app', 'advanced', 'olympiad-only',
]);
assert.equal(new Set(selection.filter(Boolean).map(item => item!.questionId)).size, 6);

const insufficient = selectDistinctCoreCandidates({
  due_review: [candidate('f1', 'foundation')],
  current_concept: [candidate('f1', 'foundation')],
  same_skill_variant: [candidate('f1', 'foundation')],
  application: [candidate('a', 'application')],
  stretch: [candidate('s', 'advanced')],
  olympiad: [candidate('o', 'olympiad')],
});
assert.equal(insufficient.filter(Boolean).length, 4, 'reports actual shortage instead of reusing question IDs');

const partialOlympiadGap = selectDistinctCoreCandidates({
  due_review: [candidate('f1', 'foundation'), candidate('f2', 'foundation'), candidate('f3', 'foundation')],
  current_concept: [candidate('f1', 'foundation'), candidate('f2', 'foundation'), candidate('f3', 'foundation')],
  same_skill_variant: [candidate('f1', 'foundation'), candidate('f2', 'foundation'), candidate('f3', 'foundation')],
  application: [candidate('a1', 'application')],
  stretch: [candidate('s1', 'advanced')],
  olympiad: [],
});
assert.equal(partialOlympiadGap.filter(Boolean).length, 5, 'maximizes legal distinct slots when a later role has no candidates');

const variants = ['a', 'b', 'c', 'd', 'e'];
assert.deepEqual(orderDailyCandidates(variants, '2026-09-28', 'g1-u1', 'current_concept'),
  orderDailyCandidates(variants, '2026-09-28', 'g1-u1', 'current_concept'), 'same date is refresh-stable');
assert.notDeepEqual(orderDailyCandidates(variants, '2026-09-28', 'g1-u1', 'current_concept'),
  orderDailyCandidates(variants, '2026-09-29', 'g1-u1', 'current_concept'), 'adjacent days rotate variant order');

console.log('unit-question-selection: PASS');
