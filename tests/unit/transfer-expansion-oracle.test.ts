import assert from 'node:assert/strict';
import { allQuestions, transferCatalog } from '@/data/questions';
import { buildLegacyTransfers } from '@/data/questions/transfers/legacy';
import { buildProgressionTransfers } from '@/data/questions/transfers/progression';
import type { TransferEntry } from '@/data/questions/transfers/types';
import { auditTransferEntry, auditTransferExpansion } from '../content/transferOracle';

const sources = allQuestions.filter(question => /^G[1-6]$/.test(question.gradeBand));
assert.equal(sources.length, 625, 'coverage denominator must remain the original 625 questions');

const fixture = sources.find(question => question.id === 'g1_01')!;
const entry: TransferEntry = {
  sourceId: fixture.id, sourceFingerprint: 'independent-fixture', verificationMode: 'numeric-distinct',
  relation: { family: 'increase-total', targetRole: 'total', roles: ['initial', 'increase'], operations: ['addition'], units: ['只'], invariants: ['no carry, within ten'] },
  variant: { ...fixture, id: 'transfer_oracle_fixture', text: '草地上有5只小兔子，又跑来了2只，现在一共有几只小兔子？', numbers: [5, 2], answer: 7 },
  witness: {
    kind: 'arithmetic',
    source: { facts: { initial: 6, increase: 3 }, anchors: { initial: '有6只小兔子', increase: '又跑来了3只' }, result: { op: 'add', args: [{ fact: 'initial' }, { fact: 'increase' }] } },
    variant: { facts: { initial: 5, increase: 2 }, anchors: { initial: '有5只小兔子', increase: '又跑来了2只' }, result: { op: 'add', args: [{ fact: 'initial' }, { fact: 'increase' }] } },
  },
};
assert.deepEqual(auditTransferEntry(fixture, entry), []);
const clone = () => structuredClone(entry);
const wrong = clone(); wrong.variant.answer = 8;
assert.ok(auditTransferEntry(fixture, wrong).some(issue => issue.includes('independently computed')), 'oracle must reject a wrong stored answer');
const unsafe = clone(); unsafe.variant.qualityStatus = 'unsafe';
assert.ok(auditTransferEntry(fixture, unsafe).some(issue => issue.includes('unsafe')), 'unsafe content must never pass');
const harder = clone(); harder.variant.difficulty = 5;
assert.ok(auditTransferEntry(fixture, harder).some(issue => issue.includes('difficulty drift')), 'copied relation cannot conceal difficulty drift');
const badAnchor = clone();
if (badAnchor.witness.kind === 'arithmetic') badAnchor.witness.variant.anchors.initial = '又跑来了2只';
assert.ok(auditTransferEntry(fixture, badAnchor).some(issue => issue.includes('does not substantiate')), 'a real substring carrying the wrong fact value must fail');
const fake = clone();
if (fake.witness.kind === 'arithmetic') {
  fake.witness.variant.facts.unused = 5; fake.witness.variant.anchors.unused = '有5只小兔子';
}
assert.ok(auditTransferEntry(fixture, fake).some(issue => issue.includes('irrelevant/cancelled')), 'padding a proof with unused prompt facts must fail');
const carry = clone(); carry.variant.text = '草地上有8只小兔子，又跑来了3只，现在一共有几只小兔子？'; carry.variant.answer = 11;
if (carry.witness.kind === 'arithmetic') { carry.witness.variant.facts = { initial: 8, increase: 3 }; carry.witness.variant.anchors = { initial: '有8只小兔子', increase: '又跑来了3只' }; }
assert.ok(auditTransferEntry(fixture, carry).some(issue => issue.includes('burden differs')), 'crossing into carrying must fail despite a correct answer');
const unknown = clone(); unknown.witness = { kind: 'enumeration', model: 'unimplemented-model', source: {}, variant: {} };
assert.ok(auditTransferEntry(fixture, unknown).some(issue => issue.includes('unimplemented independent model')), 'unknown models must fail closed');
const repeatedSource = sources.find(question => question.id === 'g1t_30')!;
const repeated: TransferEntry = {
  sourceId: repeatedSource.id, sourceFingerprint: 'independent-symbol-fixture', verificationMode: 'numeric-distinct',
  relation: { family: 'repeated-equal-addends', targetRole: 'one-addend', roles: ['sum', 'copies'],
    operations: ['inverse-of-repeated-addition'], units: ['number'], invariants: ['three identical unknowns'] },
  variant: { ...repeatedSource, id: 'transfer_symbols_fixture', text: '🔍 + 🔍 + 🔍 = 6，🔍代表同一个数字。🔍是几？', numbers: [6], answer: 2 },
  witness: { kind: 'arithmetic',
    source: { facts: { total: 9, copies: 3 }, anchors: { total: '= 9', copies: '🔍 + 🔍 + 🔍' }, result: { op: 'div', args: [{ fact: 'total' }, { fact: 'copies' }] } },
    variant: { facts: { total: 6, copies: 3 }, anchors: { total: '= 6', copies: '🔍 + 🔍 + 🔍' }, result: { op: 'div', args: [{ fact: 'total' }, { fact: 'copies' }] } },
  },
};
assert.deepEqual(auditTransferEntry(repeatedSource, repeated), []);
const miscounted = structuredClone(repeated);
if (miscounted.witness.kind === 'arithmetic') miscounted.witness.variant.facts.copies = 2;
assert.ok(auditTransferEntry(repeatedSource, miscounted).some(issue => issue.includes('does not substantiate')), 'three visible repeated symbols cannot substantiate a count of two');
const expressionSource = sources.find(question => question.id === 'g1ll_77')!;
const expressionEntry: TransferEntry = {
  sourceId: expressionSource.id, sourceFingerprint: 'independent-expression-fixture', verificationMode: 'numeric-distinct',
  relation: { family: 'equal-groups-to-multiplication', targetRole: 'multiplication-expression', roles: ['count', 'each'],
    operations: ['repeated-addition'], units: ['apples'], invariants: ['distinct single-digit factors'] },
  variant: { ...expressionSource, id: 'transfer_expression_fixture', text: '每盘有4个苹果，6盘一共有多少个苹果？用乘法算式表示。', numbers: [4, 6], answer: '4×6=24' },
  witness: { kind: 'enumeration', model: 'legacy-repeated-addition-v1',
    source: { count: 5, each: 3, countAnchor: '5 盘', eachAnchor: '每盘有 3 个苹果', answerOrder: 'equation' },
    variant: { count: 6, each: 4, countAnchor: '6盘', eachAnchor: '每盘有4个苹果', answerOrder: 'equation' },
  },
};
assert.deepEqual(auditTransferEntry(expressionSource, expressionEntry), []);
assert.ok(auditTransferEntry(expressionSource, { ...expressionEntry, variant: { ...expressionEntry.variant, answer: '4×6=25' } }).length);
const weekdaySource = sources.find(question => question.id === 'g2o_06')!;
const weekdayEntry: TransferEntry = {
  sourceId: weekdaySource.id, sourceFingerprint: 'independent-weekday-fixture', verificationMode: 'numeric-distinct',
  relation: { family: 'forward-weekday-cycle', targetRole: 'future-weekday', roles: ['starting-weekday', 'elapsed-days'],
    operations: ['daily-enumeration'], units: ['days'], invariants: ['forward non-whole-week offset'] },
  variant: { ...weekdaySource, id: 'transfer_weekday_fixture', text: '今天是星期五。再过22天是星期几？', numbers: [22, 7], answer: '星期六' },
  witness: { kind: 'enumeration', model: 'legacy-weekday-cycle-v1',
    source: { startWeekday: '星期五', startAnchor: '今天是星期五', dayOffset: 20, offsetAnchor: '再过20天' },
    variant: { startWeekday: '星期五', startAnchor: '今天是星期五', dayOffset: 22, offsetAnchor: '再过22天' },
  },
};
assert.deepEqual(auditTransferEntry(weekdaySource, weekdayEntry), []);
assert.ok(auditTransferEntry(weekdaySource, { ...weekdayEntry, variant: { ...weekdayEntry.variant, answer: '星期日' } }).length);
const calendarSource = sources.find(question => question.id === 'g2o_05')!;
const calendarEntry: TransferEntry = {
  ...weekdayEntry, sourceId: calendarSource.id,
  variant: { ...calendarSource, id: 'transfer_calendar_fixture', text: '6月2日是星期四。6月16日是星期几？', numbers: [2, 16, 7], answer: '星期四' },
  witness: { kind: 'enumeration', model: 'legacy-weekday-cycle-v1',
    source: { mode: 'same-month-date', month: 6, startDay: 1, targetDay: 15, startWeekday: '星期三', startAnchor: '6月1日是星期三' },
    variant: { mode: 'same-month-date', month: 6, startDay: 2, targetDay: 16, startWeekday: '星期四', startAnchor: '6月2日是星期四' },
  },
};
assert.deepEqual(auditTransferEntry(calendarSource, calendarEntry), []);
const invalidDate = structuredClone(calendarEntry);
if (invalidDate.witness.kind !== 'arithmetic') invalidDate.witness.variant.targetDay = 31;
invalidDate.variant.text = '6月2日是星期四。6月31日是星期几？';
assert.ok(auditTransferEntry(calendarSource, invalidDate).some(issue => issue.includes('invalid same-month')), 'June 31 must never be generated');
const moneySource = sources.find(question => question.id === 'g1ll_50')!;
const moneyEntry: TransferEntry = {
  ...entry, sourceId: moneySource.id,
  variant: { ...moneySource, id: 'transfer_money_fixture', text: '一本书7元6角，小红付了10元，应找回多少钱？', numbers: [7, 6, 10], answer: '2元4角' },
  witness: { kind: 'arithmetic',
    source: { facts: { paid: 100, price: 85 }, anchors: { paid: '10元', price: '8元5角' }, result: { op: 'sub', args: [{ fact: 'paid' }, { fact: 'price' }] }, format: 'money' },
    variant: { facts: { paid: 100, price: 76 }, anchors: { paid: '10元', price: '7元6角' }, result: { op: 'sub', args: [{ fact: 'paid' }, { fact: 'price' }] }, format: 'money' },
  },
};
assert.deepEqual(auditTransferEntry(moneySource, moneyEntry), []);
assert.ok(auditTransferEntry(moneySource, { ...moneyEntry, variant: { ...moneyEntry.variant, answer: '2元5角' } }).length);
const comparisonSource = sources.find(question => question.id === 'g1ll_18')!;
const comparisonEntry: TransferEntry = {
  ...entry, sourceId: comparisonSource.id,
  variant: { ...comparisonSource, id: 'transfer_comparison_fixture', text: '在○里填上">"或"<"：46○34 + 10。', numbers: [46, 34, 10], answer: '>' },
  witness: { kind: 'enumeration', model: 'legacy-number-comparison-v1',
    source: { left: [45], right: [38, 10], comparisonAnchor: '45○38 + 10' },
    variant: { left: [46], right: [34, 10], comparisonAnchor: '46○34 + 10' },
  },
};
assert.deepEqual(auditTransferEntry(comparisonSource, comparisonEntry), []);
assert.ok(auditTransferEntry(comparisonSource, { ...comparisonEntry, variant: { ...comparisonEntry.variant, answer: '<' } }).length);
// Isolate the positive model control from the bank's legacy ranking annotation;
// full-catalog acceptance below still audits the original annotation separately.
const heightOriginal = sources.find(question => question.id === 'g1ll_87')!;
const heightSource = { ...heightOriginal, answerType: 'text' as const, answerSchema: { kind: 'text' as const, acceptedAnswers: [String(heightOriginal.answer)] } };
const heightEntry: TransferEntry = {
  ...entry, sourceId: heightSource.id,
  variant: { ...heightSource, id: 'transfer_height_fixture', text: '三只小动物比身高：小鹿1米，小熊1米20厘米，小猴80厘米。请按从高到矮排队。', numbers: [1, 1, 20, 80], answer: '小熊 > 小鹿 > 小猴', answerSchema: { kind: 'text', acceptedAnswers: ['小熊 > 小鹿 > 小猴'] } },
  witness: { kind: 'enumeration', model: 'legacy-height-order-v1',
    source: { people: ['小熊', '小鹿', '小猴'], heights: [100, 130, 90], anchors: ['小熊 1 米', '小鹿 1 米 30 厘米', '小猴 90 厘米'] },
    variant: { people: ['小鹿', '小熊', '小猴'], heights: [100, 120, 80], anchors: ['小鹿1米', '小熊1米20厘米', '小猴80厘米'] },
  },
};
assert.deepEqual(auditTransferEntry(heightSource, heightEntry), []);
assert.ok(auditTransferEntry(heightSource, { ...heightEntry, variant: { ...heightEntry.variant, answer: '小熊 > 小猴 > 小鹿' } }).length);
const patternSource = sources.find(question => question.id === 'g1t_15')!;
const patternEntry: TransferEntry = {
  ...entry, sourceId: patternSource.id, verificationMode: 'structural-proof',
  variant: { ...patternSource, id: 'transfer_pattern_fixture', text: '按规律接着画：🔴🔵🔴🔵🔴🔵__。下一个是什么？', numbers: [], answer: '🔴', answerSchema: { kind: 'text', acceptedAnswers: ['🔴'] } },
  witness: { kind: 'enumeration', model: 'legacy-periodic-sequence-v1',
    source: { pattern: ['🔴', '🔵'], startIndex: 1, askIndex: 6, patternAnchor: '🔴🔵', itemsAnchor: '🔴🔵🔴🔵🔴' },
    variant: { pattern: ['🔴', '🔵'], startIndex: 1, askIndex: 7, patternAnchor: '🔴🔵', itemsAnchor: '🔴🔵🔴🔵🔴🔵' },
  },
};
assert.deepEqual(auditTransferEntry(patternSource, patternEntry), []);
assert.ok(auditTransferEntry(patternSource, { ...patternEntry, variant: { ...patternEntry.variant, answer: '🔵' } }).length);
const renamedHeights = structuredClone(heightEntry);
if (renamedHeights.witness.kind !== 'arithmetic') renamedHeights.witness.variant.heights = [100, 130, 90];
renamedHeights.variant.text = '三只小动物比身高：小鹿1米，小熊1米30厘米，小猴90厘米。请按从高到矮排队。';
if (renamedHeights.witness.kind !== 'arithmetic') renamedHeights.witness.variant.anchors = ['小鹿1米', '小熊1米30厘米', '小猴90厘米'];
assert.ok(auditTransferEntry(heightSource, renamedHeights).length, 'changing only the named owners of unchanged heights is not a quantitative transfer');
const onlyColors = structuredClone(patternEntry);
onlyColors.variant.text = '按规律接着画：🟢🟡🟢🟡🟢__。下一个是什么？'; onlyColors.variant.answer = '🟡';
if (onlyColors.witness.kind !== 'arithmetic') onlyColors.witness.variant = { pattern: ['🟢', '🟡'], startIndex: 1, askIndex: 6, patternAnchor: '🟢🟡', itemsAnchor: '🟢🟡🟢🟡🟢' };
assert.ok(auditTransferEntry(patternSource, onlyColors).length, 'recoloring an unchanged periodic question is not a transfer');
const workSource = sources.find(question => question.id === 'g6_14')!;
const unitFractionTree = { op: 'div' as const, args: [1, { op: 'add' as const, args: [{ op: 'div' as const, args: [1, { fact: 'a' }] }, { op: 'div' as const, args: [1, { fact: 'b' }] }] }] };
const workEntry: TransferEntry = {
  ...entry, sourceId: workSource.id,
  variant: { ...workSource, id: 'transfer_work_fixture', text: '一项工程，甲队单独做需要30天完成，乙队单独做需要45天完成。两队合作，需要几天完成？', numbers: [30, 45], answer: 18 },
  witness: { kind: 'arithmetic', source: { facts: { a: 10, b: 15 }, anchors: { a: '需要10天', b: '需要15天' }, result: unitFractionTree }, variant: { facts: { a: 30, b: 45 }, anchors: { a: '需要30天', b: '需要45天' }, result: unitFractionTree } },
};
assert.deepEqual(auditTransferEntry(workSource, workEntry), [], 'exact unit-fraction work must compare LCM/reduction burden rather than accidental decimal expansions');
const pipeSource = sources.find(question => question.id === 'g6_18')!;
const harderFractions: TransferEntry = {
  ...workEntry, sourceId: pipeSource.id,
  variant: { ...pipeSource, id: 'transfer_pipe_fixture', text: '一个水池装有甲、乙两个进水管。单开甲管3小时注满，单开乙管8小时注满。两管同时开，几小时可以注满水池？答案用最简分数表示。', numbers: [3, 8], answer: '24/11' },
  witness: { kind: 'arithmetic', source: { facts: { a: 6, b: 8 }, anchors: { a: '甲管6小时', b: '乙管8小时' }, result: unitFractionTree }, variant: { facts: { a: 3, b: 8 }, anchors: { a: '甲管3小时', b: '乙管8小时' }, result: unitFractionTree } },
};
assert.ok(auditTransferEntry(pipeSource, harderFractions).some(issue => issue.includes('burden differs')), 'coprime denominators plus numerator carrying change the original work-rate burden');
const massSource = sources.find(question => question.id === 'g3_24')!;
const massEntry: TransferEntry = {
  ...entry, sourceId: massSource.id,
  variant: { ...massSource, id: 'transfer_mass_fixture', text: '妈妈在厨房里一边哼着歌一边忙碌着。一桶油重7千克，用去了3千克500克，还剩多少千克？', numbers: [7, 3.5], answer: 3.5 },
  witness: { kind: 'arithmetic', source: { facts: { total: 5, used: 2.5 }, anchors: { total: '重5千克', used: '2千克500克' }, result: { op: 'sub', args: [{ fact: 'total' }, { fact: 'used' }] } }, variant: { facts: { total: 7, used: 3.5 }, anchors: { total: '重7千克', used: '3千克500克' }, result: { op: 'sub', args: [{ fact: 'total' }, { fact: 'used' }] } } },
};
assert.deepEqual(auditTransferEntry(massSource, massEntry), []);
const badMass = structuredClone(massEntry);
if (badMass.witness.kind === 'arithmetic') badMass.witness.variant.facts.used = 3.05;
assert.ok(auditTransferEntry(massSource, badMass).some(issue => issue.includes('does not substantiate')), '3kg500g is 3.5kg, never 3.05kg');
const raceSource = sources.find(question => question.id === 'g1t_02')!;
const raceEntry: TransferEntry = {
  ...entry, sourceId: raceSource.id, verificationMode: 'structural-proof',
  variant: { ...raceSource, id: 'transfer_race_fixture', text: '小丽、小刚和小华三个小朋友赛跑。小丽说："我不是第一名。"小刚说："我比小丽跑得慢。"谁跑得最快？', numbers: [], answer: '小华' },
  witness: { kind: 'enumeration', model: 'legacy-order-relations-v1', source: { people: ['小丽', '小刚', '小华'], anonymousPeople: ['小华'], relations: ['小丽:not-ranks:3', '小刚:greater:小丽'], anchors: ['小丽说："我不是最后一名。"', '小刚说："我比小丽跑得快。"'], quantity: 'speed', target: 'maximum' }, variant: { people: ['小丽', '小刚', '小华'], relations: ['小丽:not-ranks:1', '小刚:less:小丽'], anchors: ['小丽说："我不是第一名。"', '小刚说："我比小丽跑得慢。"'], quantity: 'speed', target: 'maximum' } },
};
assert.deepEqual(auditTransferEntry(raceSource, raceEntry), []);
assert.ok(auditTransferEntry(raceSource, { ...raceEntry, variant: { ...raceEntry.variant, answer: '小丽' } }).length);
const seriesSource = sources.find(question => question.id === 'g1ll_64')!;
const seriesEntry: TransferEntry = {
  ...entry, sourceId: seriesSource.id,
  variant: { ...seriesSource, id: 'transfer_series_fixture', text: '按规律填数：3、6、__、12、15。横线上应该填几？', numbers: [3, 6, 12, 15], answer: 9 },
  witness: { kind: 'arithmetic', source: { facts: { previous: 4, step: 2 }, anchors: { previous: '2、4', step: '2、4' }, result: { op: 'add', args: [{ fact: 'previous' }, { fact: 'step' }] } }, variant: { facts: { previous: 6, step: 3 }, anchors: { previous: '3、6', step: '3、6' }, result: { op: 'add', args: [{ fact: 'previous' }, { fact: 'step' }] } } },
};
assert.deepEqual(auditTransferEntry(seriesSource, seriesEntry), []);
const brokenSeries = { ...seriesEntry, variant: { ...seriesEntry.variant, text: '按规律填数：3、6、9、__、12、15。横线上应该填几？' } };
assert.ok(auditTransferEntry(seriesSource, brokenSeries).some(issue => issue.includes('full visible series')), 'a locally correct calculation cannot prove a contradictory complete sequence');
const falseExplanation = structuredClone(entry);
falseExplanation.variant.explanation = '5+2=8。';
assert.ok(auditTransferEntry(fixture, falseExplanation).some(issue => issue.includes('learner-facing equality')), 'a correct AST answer cannot excuse a false displayed equality');
const tenSource = sources.find(question => question.id === 'g1_08')!;
const withinTen: TransferEntry = {
  ...entry, sourceId: tenSource.id,
  variant: { ...tenSource, id: 'transfer_within_ten_fixture', text: '教室里有5个小朋友，又进来了4个，教室里现在有几个小朋友？', numbers: [5, 4], answer: 9 },
  witness: { kind: 'arithmetic', source: { facts: { a: 6, b: 4 }, anchors: { a: '有6个小朋友', b: '又进来了4个' }, result: { op: 'add', args: [{ fact: 'a' }, { fact: 'b' }] } }, variant: { facts: { a: 5, b: 4 }, anchors: { a: '有5个小朋友', b: '又进来了4个' }, result: { op: 'add', args: [{ fact: 'a' }, { fact: 'b' }] } } },
};
assert.deepEqual(auditTransferEntry(tenSource, withinTen), [], 'ten itself is a number-composition boundary, not permission to introduce within-twenty carrying');
const beyondTen = structuredClone(withinTen); beyondTen.variant.text = '教室里有8个小朋友，又进来了5个，教室里现在有几个小朋友？'; beyondTen.variant.answer = 13;
if (beyondTen.witness.kind === 'arithmetic') { beyondTen.witness.variant.facts = { a: 8, b: 5 }; beyondTen.witness.variant.anchors = { a: '有8个小朋友', b: '又进来了5个' }; }
assert.ok(auditTransferEntry(tenSource, beyondTen).some(issue => issue.includes('learned range within ten')));
const congruenceSource = sources.find(question => question.id === 'prog_g3_u1_07')!;
const congruenceEntry: TransferEntry = {
  ...entry, sourceId: congruenceSource.id,
  variant: { ...congruenceSource, id: 'transfer_congruence_fixture', text: '一个数大于20、小于50，除以5余3，除以6也余3。这个数是多少？', numbers: [20, 50, 5, 6, 3], answer: 33 },
  witness: { kind: 'enumeration', model: 'bounded-congruence-v1',
    source: { lower: 20, upper: 40, lowerInclusive: 'false', upperInclusive: 'false', divisors: [5, 6], remainders: [2, 2], intervalAnchor: '大于20、小于40', conditionAnchors: ['除以5余2', '除以6也余2'], target: 'unique' },
    variant: { lower: 20, upper: 50, lowerInclusive: 'false', upperInclusive: 'false', divisors: [5, 6], remainders: [3, 3], intervalAnchor: '大于20、小于50', conditionAnchors: ['除以5余3', '除以6也余3'], target: 'unique' } },
};
assert.deepEqual(auditTransferEntry(congruenceSource, congruenceEntry), []);
assert.ok(auditTransferEntry(congruenceSource, { ...congruenceEntry, variant: { ...congruenceEntry.variant, answer: 53 } }).length);
const cubeSource = sources.find(question => question.id === 'g5o_25')!;
const cubeFixture = { ...entry, sourceId: cubeSource.id, variant: { ...cubeSource, id: 'cube_cut_fixture', text: '长方体长10宽6高4。表面积是多少？体积是多少？切成棱长2的小正方体能切几个？', answer: '248,240,30' } };
assert.ok(!auditTransferEntry(cubeSource, cubeFixture).some(issue => issue.includes('box cannot be completely cut')));
assert.ok(auditTransferEntry(cubeSource, { ...cubeFixture, variant: { ...cubeFixture.variant, text: '长方体长9宽6高4。表面积是多少？体积是多少？切成棱长2的小正方体能切几个？', answer: '228,216,27' } }).some(issue => issue.includes('box cannot be completely cut')), 'a correct volume quotient is insufficient when one dimension leaves a strip');
const medianSource = sources.find(question => question.id === 'prog_g6_u5_02')!;
const medianFixture = { ...entry, sourceId: medianSource.id, variant: { ...medianSource, id: 'median_fixture', text: '五次投篮命中数是3、7、5、8、12。中位数是多少？', answer: 7 } };
assert.ok(!auditTransferEntry(medianSource, medianFixture).some(issue => /median/.test(issue)));
assert.ok(auditTransferEntry(medianSource, { ...medianFixture, variant: { ...medianFixture.variant, answer: 5 } }).some(issue => issue.includes('independently sorted complete list')));
assert.ok(auditTransferEntry(medianSource, { ...medianFixture, variant: { ...medianFixture.variant, text: '五次投篮命中数是3、5、7、8、12。中位数是多少？' } }).some(issue => issue.includes('median list sorting')));
type EnumerationControl = { id: string; model: string; source: Record<string, number | string | number[] | string[]>; variant: Record<string, number | string | number[] | string[]>; text: string; numbers: number[]; answer: number | string };
const enumerationControls: EnumerationControl[] = [
  { id: 'prog_g2_u6_01', model: 'progression-coin-combination-count-v1', source: { denominations: [1, 2], total: 6, minimumCounts: [0, 1], target: 'count' }, variant: { denominations: [1, 2], total: 8, minimumCounts: [0, 1], target: 'count' }, text: '用1元和2元硬币凑成8元，至少用一枚2元硬币。不同枚数的硬币算不同凑法，一共有几种？', numbers: [1, 2, 8], answer: 4 },
  { id: 'prog_g5_u6_04', model: 'progression-five-observation-mode-v1', source: { observations: [12, 15, 15, 18, 20], target: 'unique-mode' }, variant: { observations: [11, 14, 14, 18, 22], target: 'unique-mode' }, text: '五个观测值是11、14、14、18、22。众数是多少？', numbers: [11, 14, 14, 18, 22], answer: 14 },
  { id: 'prog_g5_u6_08', model: 'progression-g5-three-digit-even-sum-v1', source: { digits: [0, 1, 2, 3, 4], digitSum: 6, target: 'count' }, variant: { digits: [0, 1, 2, 3, 4], digitSum: 7, target: 'count' }, text: '用数字0、1、2、3、4各最多一次组成三位偶数，且三个数字相加等于7。一共能组成几个？', numbers: [0, 1, 2, 3, 4, 7], answer: 7 },
  { id: 'prog_g5_u2_01', model: 'progression-positive-divisors-v1', source: { number: 24, target: 'ordered-all' }, variant: { number: 30, target: 'ordered-all' }, text: '列出30的所有正因数。', numbers: [30], answer: '1,2,3,5,6,10,15,30' },
  { id: 'prog_g5_u2_04', model: 'progression-prime-divisors-v1', source: { number: 18, target: 'ordered-prime' }, variant: { number: 20, target: 'ordered-prime' }, text: '20的因数中，哪些是质数？', numbers: [20], answer: '2,5' },
  { id: 'prog_g4_u1_08', model: 'progression-g4-min-digit-permutation-threshold-v1', source: { digits: [0, 2, 5, 8], threshold: 5000, target: 'minimum-above' }, variant: { digits: [0, 1, 6, 9], threshold: 6000, target: 'minimum-above' }, text: '用数字0、1、6、9各一次组成大于6000的最小四位数。这个数是多少？', numbers: [0, 1, 6, 9, 6000], answer: 6019 },
  { id: 'prog_g4_u1_09', model: 'progression-g4-four-digit-place-constraints-v1', source: { digits: [1, 2, 3, 4], tensMinusUnits: 2, thousandsTimesHundreds: 2, target: 'unique' }, variant: { digits: [1, 2, 3, 6], tensMinusUnits: 2, thousandsTimesHundreds: 3, target: 'unique' }, text: '一个四位数用数字1、2、3、6各一次组成。十位数字比个位大2，千位数字是百位数字的3倍。这个数是多少？', numbers: [1, 2, 3, 6, 2, 3], answer: 6231 },
  { id: 'prog_g4_u6_02', model: 'periodic-coincidence-v1', source: { periods: [12, 18], originClock: '9:00', target: 'next' }, variant: { periods: [18, 24], originClock: '9:00', target: 'next' }, text: '两个报时器在9:00同时响。一个每18分钟响一次，另一个每24分钟响一次。它们下次同时响是在几分钟后？', numbers: [9, 18, 24], answer: 72 },
  { id: 'prog_g4_u4_05', model: 'progression-g4-triangle-right-angle-v1', source: { angles: [50, 60, 70], target: 'right-angle-presence' }, variant: { angles: [30, 60, 90], target: 'right-angle-presence' }, text: '一个三角形的三个内角是30度、60度和90度。它有直角吗？', numbers: [30, 60, 90], answer: '有' },
  { id: 'prog_g5_u6_10', model: 'progression-g5-two-digit-multiple-of-three-count-v1', source: { digits: [1, 2, 3, 4], target: 'count' }, variant: { digits: [1, 2, 4, 5], target: 'count' }, text: '从数字1、2、4、5中选两个不同数字组成两位数，且该数是3的倍数。一共有几个这样的数？', numbers: [1, 2, 4, 5, 3], answer: 8 },
  { id: 'prog_g6_u5_05', model: 'progression-g6-middle-pair-constraints-v1', source: { lower: 8, upper: 16, mean: 12, median: 12, difference: 2, target: 'a' }, variant: { lower: 8, upper: 18, mean: 13, median: 13, difference: 2, target: 'a' }, text: '四个数从小到大为8、a、b、18，平均数是13，中位数是13，且b比a大2。a是多少？', numbers: [8, 18, 13, 13, 2], answer: 12 },
];
for (const control of enumerationControls) {
  const source = sources.find(question => question.id === control.id)!;
  const candidate: TransferEntry = { ...entry, sourceId: source.id, variant: { ...source, id: `control_${source.id}`, text: control.text, numbers: control.numbers, answer: control.answer, equation: '', explanation: '', solutionSteps: [], hints: [], ...(source.answerSchema?.kind === 'text' ? { answerSchema: { kind: 'text', acceptedAnswers: [String(control.answer)] } } : {}) }, witness: { kind: 'enumeration', model: control.model, source: control.source, variant: control.variant } };
  assert.deepEqual(auditTransferEntry(source, candidate), [], control.model);
  assert.ok(auditTransferEntry(source, { ...candidate, variant: { ...candidate.variant, answer: typeof control.answer === 'number' ? control.answer + 1 : 'invalid' } }).length, `${control.model} must reject a wrong complete result`);
}
const angleSource = sources.find(question => question.id === 'prog_g4_u4_03')!;
const angleControl: TransferEntry = { ...entry, sourceId: angleSource.id, verificationMode: 'structural-proof', variant: { ...angleSource, id: 'relative_angle_fixture', text: '一个角比直角大。它是锐角、直角还是钝角？', answer: '钝角', answerSchema: { kind: 'text', acceptedAnswers: ['钝角'] } }, witness: { kind: 'structural', model: 'progression-angle-relative-to-right-v1', source: { relation: 'less-than-right', relationAnchor: '比直角小', threshold: 90, target: 'angle-type' }, variant: { relation: 'greater-than-right', relationAnchor: '比直角大', threshold: 90, target: 'angle-type' } } };
assert.deepEqual(auditTransferEntry(angleSource, angleControl), []);
assert.ok(auditTransferEntry(angleSource, { ...angleControl, variant: { ...angleControl.variant, answer: '锐角' } }).length);
for (const [id, sourceShapes, variantShapes, sourceAnchors, variantAnchors, text, answer, output] of [
  ['g1ll_53', ['rectangle', 'square'], ['triangle', 'square'], ['一个长方形', '一个正方形'], ['一个三角形', '一个正方形'], '数一数，一个三角形有（）条边，一个正方形有（）条边。', '3和4', 'joined-and'],
  ['prog_g2_u5_01', ['rectangle'], ['triangle'], ['一张长方形卡片'], ['一张三角形卡片'], '一张三角形卡片有几条边？', 3, 'single-number'],
] as const) {
  const source = sources.find(question => question.id === id)!;
  const candidate: TransferEntry = { ...entry, sourceId: id, verificationMode: 'structural-proof', variant: { ...source, id: `geometry_${id}`, text, answer,
    ...(source.answerSchema?.kind === 'text' ? { answerSchema: { kind: 'text', acceptedAnswers: [String(answer)] } } : {}) }, witness: { kind: 'structural', model: 'geometry-property-v1', source: { shapes: [...sourceShapes], anchors: [...sourceAnchors], target: 'side-counts', output }, variant: { shapes: [...variantShapes], anchors: [...variantAnchors], target: 'side-counts', output } } };
  assert.deepEqual(auditTransferEntry(source, candidate), []);
  assert.ok(auditTransferEntry(source, { ...candidate, variant: { ...candidate.variant, answer: 9 } }).length);
}
const fixedPermutation = sources.find(question => question.id === 'g1t_27')!;
assert.ok(auditTransferExpansion([fixedPermutation], [], [{ sourceId: fixedPermutation.id, reason: 'difficulty-not-preserved', detail: '当前无枚举器，需另行建立合同待SOL审。' }]).issues.some(issue => issue.message.includes('unfinished implementation')));
assert.deepEqual(auditTransferExpansion([fixedPermutation], [], [{ sourceId: fixedPermutation.id, reason: 'constant-answer-by-design', detail: '三个不同非零数字组成不重复两位数时，排列恒为3×2=6；增加数字会增加枚举规模。' }]).issues, []);
const isolatedSource = sources.find(question => question.id === 'g1ll_65')!;
assert.deepEqual(auditTransferExpansion([isolatedSource], [], [{ sourceId: isolatedSource.id, reason: 'source-unsafe', detail: '原题尚未通过安全复核，保留既有历史隔离。' }]).issues, []);
const widerRange = structuredClone(congruenceEntry);
widerRange.variant.text = '一个数大于50、小于80，除以5余3，除以6也余3。这个数是多少？';
widerRange.variant.numbers = [50, 80, 5, 6, 3]; widerRange.variant.answer = 63;
widerRange.variant.answerSchema = { kind: 'integer', min: 0, max: 100 };
if (widerRange.witness.kind === 'enumeration') { widerRange.witness.variant.lower = 50; widerRange.witness.variant.upper = 80; widerRange.witness.variant.intervalAnchor = '大于50、小于80'; }
assert.deepEqual(auditTransferEntry(congruenceSource, widerRange), [], 'a truthful numeric answer range may expand without changing the taught mathematics');
const booleanSource = sources.find(question => question.id === 'g4o_10')!;
const booleanControl: TransferEntry = { ...entry, sourceId: booleanSource.id, verificationMode: 'structural-proof', variant: { ...booleanSource, id: 'boolean_truth_fixture', text: booleanSource.text.replace('B在说谎', 'C在说谎'), answer: 'C', answerSchema: { kind: 'text', acceptedAnswers: ['C'] } }, witness: { kind: 'structural', model: 'legacy-boolean-truth-v1', source: { people: ['A', 'B', 'C'], statements: ['A:not:B', 'B:not:C', 'C:and-not:A,B'], truthCount: 1, target: 'true-person' }, variant: { people: ['A', 'B', 'C'], statements: ['A:not:C', 'B:not:C', 'C:and-not:A,B'], truthCount: 1, target: 'true-person' } } };
assert.deepEqual(auditTransferEntry(booleanSource, booleanControl), []);
assert.ok(auditTransferEntry(booleanSource, { ...booleanControl, variant: { ...booleanControl.variant, answer: 'B' } }).length);
for (const minus of [false, true]) {
  const source = sources.find(question => question.id === (minus ? 'prog_g2_u1_04' : 'prog_g2_u1_03'))!;
  const target = minus ? 'max-product-minus-unused' : 'max-product-plus-unused';
  const candidate: TransferEntry = { ...entry, sourceId: source.id, variant: { ...source, id: 'maximum_product_fixture', text: `把数字2、4、6各用一次，填入□×□${minus ? '−' : '+'}□中。最大的结果是多少？`, numbers: [2, 4, 6], answer: minus ? 22 : 26, answerSchema: { kind: 'integer', min: 0, max: 100 } }, witness: { kind: 'enumeration', model: `progression-g2-${target}-v1`, source: { digits: [2, 3, 5], target }, variant: { digits: [2, 4, 6], target } } };
  assert.deepEqual(auditTransferEntry(source, candidate), []);
  const identity = structuredClone(candidate); identity.variant.text = identity.variant.text.replace('2、4、6', '1、3、5'); identity.variant.numbers = [1, 3, 5]; identity.variant.answer = minus ? 14 : 16;
  if (identity.witness.kind === 'enumeration') identity.witness.variant.digits = [1, 3, 5];
  assert.ok(auditTransferEntry(source, identity).some(issue => issue.includes('identity burden')), 'multiplication by one must not replace the three genuine candidate products');
}
const reverseSource = sources.find(question => question.id === 'g4o_23')!;
const reverseControl: TransferEntry = { ...entry, sourceId: reverseSource.id, variant: { ...reverseSource, id: 'reverse_product_fixture', text: reverseSource.text.replace('×9', '×4'), numbers: [4], answer: '2178', equation: '2178×4=8712', explanation: '逐个核对四位数，唯一解2178乘4得到倒序8712。', solutionSteps: ['检验2178×4=8712。'], hints: ['四个数字必须互不相同。'] }, witness: { kind: 'enumeration', model: 'legacy-four-digit-reverse-product-v1', source: { factor: 9, target: 'unique-number' }, variant: { factor: 4, target: 'unique-number' } } };
assert.deepEqual(auditTransferEntry(reverseSource, reverseControl), []);
assert.ok(auditTransferEntry(reverseSource, { ...reverseControl, variant: { ...reverseControl.variant, answer: '2187' } }).length);
const calendarCombinedSource = sources.find(question => question.id === 'g3o_25')!;
const calendarCombined: TransferEntry = { ...entry, sourceId: calendarCombinedSource.id, variant: { ...calendarCombinedSource, id: 'calendar_combined_fixture', text: '一周有7天。2027年6月1日周二。这年的6月28日是周几？6月有几个周一？', numbers: [28, 7, 1, 2027], answer: '周一,4个', subAnswers: [{ id: 'weekday', label: '周几', answer: '周一' }, { id: 'count', label: '周一数', answer: 4 }], equation: '', explanation: '', solutionSteps: [], hints: [] }, witness: { kind: 'enumeration', model: 'legacy-calendar-weekday-and-count-v1', source: { year: 2026, month: 6, startDay: 1, startWeekday: 1, targetDay: 28, countWeekday: 1, target: 'weekday-and-month-count' }, variant: { year: 2027, month: 6, startDay: 1, startWeekday: 2, targetDay: 28, countWeekday: 1, target: 'weekday-and-month-count' } } };
assert.deepEqual(auditTransferEntry(calendarCombinedSource, calendarCombined), []);
const falseCalendarPremise = structuredClone(calendarCombined); falseCalendarPremise.variant.text = falseCalendarPremise.variant.text.replace('周二', '周三');
if (falseCalendarPremise.witness.kind === 'enumeration') falseCalendarPremise.witness.variant.startWeekday = 3;
assert.ok(auditTransferEntry(calendarCombinedSource, falseCalendarPremise).some(issue => issue.includes('actual Gregorian')));
const leastSource = sources.find(question => question.id === 'g5o_24')!;
const leastControl: TransferEntry = { ...entry, sourceId: leastSource.id, variant: { ...leastSource, id: 'least_natural_fixture', text: '一个自然数除以5余1，除以6余2。这个数最小是多少？', numbers: [5, 1, 6, 2], answer: typeof leastSource.answer === 'string' ? '26' : 26 }, witness: { kind: 'enumeration', model: 'least-natural-congruence-v1', source: { divisors: [5, 6], remainders: [2, 3], conditionAnchors: ['除以5余2', '除以6余3'], target: 'least-natural' }, variant: { divisors: [5, 6], remainders: [1, 2], conditionAnchors: ['除以5余1', '除以6余2'], target: 'least-natural' } } };
assert.deepEqual(auditTransferEntry(leastSource, leastControl), []);
assert.ok(auditTransferEntry(leastSource, { ...leastControl, variant: { ...leastControl.variant, answer: 56 } }).some(issue => issue.includes('independently computed')), 'a later congruent value must not masquerade as the minimum');
const thresholdSource = sources.find(question => question.id === 'prog_g6_u5_09')!;
const thresholdControl: TransferEntry = { ...entry, sourceId: thresholdSource.id, verificationMode: 'structural-proof', variant: { ...thresholdSource, id: 'median_threshold_fixture', text: '一组有10个数据，其中1个小于20，3个等于20，6个大于20。中位数与20相比是什么关系？', answer: '大于20', answerSchema: { kind: 'text', acceptedAnswers: ['大于20'] } }, witness: { kind: 'structural', model: 'median-threshold-counts-v1', source: { threshold: 20, below: 6, equal: 3, above: 1, count: 10, target: 'relation-to-threshold' }, variant: { threshold: 20, below: 1, equal: 3, above: 6, count: 10, target: 'relation-to-threshold' } } };
assert.deepEqual(auditTransferEntry(thresholdSource, thresholdControl), []);
const ambiguousThreshold = structuredClone(thresholdControl); ambiguousThreshold.variant.text = '一组有10个数据，其中5个小于20，0个等于20，5个大于20。中位数与20相比是什么关系？';
if (ambiguousThreshold.witness.kind === 'structural') ambiguousThreshold.witness.variant = { ...ambiguousThreshold.witness.variant, below: 5, equal: 0, above: 5 };
assert.ok(auditTransferEntry(thresholdSource, ambiguousThreshold).some(issue => issue.includes('not determined')));
const anglePropertySource = sources.find(question => question.id === 'prog_g4_u4_01')!;
const anglePropertyControl: TransferEntry = { ...entry, sourceId: anglePropertySource.id, verificationMode: 'structural-proof', variant: { ...anglePropertySource, id: 'angle_property_fixture', text: '一个角和平角一样大。这个角是多少度？', answer: 180, answerSchema: { kind: 'integer', min: 0, max: 180 } }, witness: { kind: 'structural', model: 'geometry-angle-property-v1', source: { angle: 'right', anchor: '和直角一样大', target: 'degree-measure' }, variant: { angle: 'straight', anchor: '和平角一样大', target: 'degree-measure' } } };
assert.deepEqual(auditTransferEntry(anglePropertySource, anglePropertyControl), []);
assert.ok(auditTransferEntry(anglePropertySource, { ...anglePropertyControl, variant: { ...anglePropertyControl.variant, answer: 90 } }).length);
const regionSource = sources.find(question => question.id === 'prog_g2_u5_05')!;
const regionControl: TransferEntry = { ...entry, sourceId: regionSource.id, verificationMode: 'structural-proof', variant: { ...regionSource, id: 'region_sides_fixture', text: '一个正方形沿一组对边的中点连线分成两个长方形。请分别数两个小长方形各自的边数，再把边数相加；公共分割边在两个长方形中各算一次。一共有几条长方形边？', answer: 8, answerSchema: { kind: 'integer', min: 0, max: 10 } }, witness: { kind: 'structural', model: 'geometry-property-v1', source: { shapes: ['triangle', 'triangle'], anchors: ['两个三角形', '两个三角形'], target: 'region-side-sum', output: 'single-number', cut: 'diagonal' }, variant: { shapes: ['rectangle', 'rectangle'], anchors: ['两个长方形', '两个长方形'], target: 'region-side-sum', output: 'single-number', cut: 'opposite-midpoints' } } };
assert.deepEqual(auditTransferEntry(regionSource, regionControl), []);
assert.ok(auditTransferEntry(regionSource, { ...regionControl, variant: { ...regionControl.variant, text: regionControl.variant.text.replace('一组对边的中点连线', '一条对角线') } }).some(issue => issue.includes('valid two-region square cut')));
if (process.argv.includes('--self-checks-only')) {
  console.log('Independent oracle controls passed, including wrong answers, unsafe content, difficulty, anchors, cancelled facts, carrying, unknown models and repeated-symbol counts.');
  process.exit(0);
}

// Inspect proposals too: registry rejection must not make bad generated data
// disappear from the independent acceptance denominator.
const proposals = [...buildProgressionTransfers(sources).entries, ...buildLegacyTransfers(sources).entries];
const report = auditTransferExpansion(sources, proposals, transferCatalog.gaps);
assert.equal(report.coverageRows.length, 625);
assert.equal(new Set(report.coverageRows.map(row => row.sourceId)).size, 625, 'every original source has one reviewable coverage row');
assert.equal(report.allowedSafeSources, 620);
assert.equal(report.unsafeSourceCount, 5);
assert.equal(report.numericDistinctCount + report.structuralCount, report.entries);
assert.deepEqual(transferCatalog.validationErrors, [], 'registry must not silently filter malformed proposed variants');
assert.deepEqual(report.issues, [], JSON.stringify(report.issues, null, 2));
console.log(`Independent transfer oracle passed: ${report.entries} variants, ${report.gaps} explicit gaps, ${report.sourceCount} original sources.`);
