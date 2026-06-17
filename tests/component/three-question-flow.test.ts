/**
 * Sub-project B: Three Question Flow Component Tests
 */
import { getDefaultPhasesForStepType, isThreeQuestionFlowCompatible } from '@/lib/lessonPlanner';
import type { Question } from '@/lib/types';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; console.log(`  ❌ ${name}: ${(e as Error).message}`); }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const questionWithFrame: Question = {
  id: 'g1ll_01', gradeBand: 'G1', domain: 'addition_subtraction',
  cognitiveSkills: ['find_numbers', 'find_keywords', 'understand_question'],
  text: '果盘里有11颗草莓，吃掉了5颗，还剩几颗草莓？',
  numbers: [11, 5],
  keywords: [{ word: '吃掉了', type: 'subtract' }, { word: '还剩', type: 'subtract' }],
  noisePhrases: [], usefulPhrases: ['果盘里有11颗草莓', '吃掉了5颗'],
  questionMeaningOptions: ['问总数', '问还剩多少', '问新摘了几颗'],
  correctMeaning: '问还剩多少', operation: 'subtraction', equation: '11 - 5 = ?',
  answer: 6, answerSentence: '还剩6颗草莓。', explanation: '草莓被吃掉了！11-5=6。',
  solutionSteps: ['找到11和5', '"吃掉了"表示减少', '11-5=6'],
  hints: ['草莓变多了还是变少了？'],
  difficulty: 2, category: 'subtraction', visualKey: 'strawberry',
  requiresAnswer: true, lessonType: 'add_sub_action', keywordType: 'subtract_action',
  stepCompatibility: ['find_numbers', 'find_action_words', 'simulation', 'full_solve'],
  answerType: 'number', sceneType: 'food_fruit', themeTags: ['fruit', 'food'],
  problemType: 'basic_arithmetic',
  skillIds: ['addition_subtraction:subtraction_within_20_borrowing'],
  curriculumGrade: 1, curriculumSemester: 'lower', isReview: false, isStretch: false,
  assessmentTier: 'test' as const,
  difficultyProfile: { knowledgeLevel: 2 as const, readingLoad: 2 as const, relationComplexity: 2 as const, informationNoise: 1 as const, reasoningSteps: 2 as const, transferLevel: 2 as const },
  reasoningFrame: {
    knownFacts: [
      { text: '果盘里有11颗草莓', quantity: 11, unit: '颗', object: '草莓', role: '初始数量' },
      { text: '吃掉了5颗', quantity: 5, unit: '颗', object: '草莓', role: '减少量' },
    ],
    targetQuestion: { text: '还剩几颗草莓', targetQuantity: '剩余草莓数量', targetUnit: '颗', questionType: 'find_remaining' },
    plan: { firstStep: '从11颗里面减去吃掉的5颗', operationReason: '草莓变少了，用减法' },
    check: { answeredTarget: true, unitCorrect: true, resultReasonable: true },
  },
};

const simpleQuestion: Question = {
  id: 'g1_01', gradeBand: 'G1', domain: 'addition_subtraction',
  cognitiveSkills: ['find_numbers', 'find_keywords', 'understand_question'],
  text: '草地上有6只小兔子，又跑来了3只',
  numbers: [6, 3], keywords: [{ word: '跑来了', type: 'add' }],
  noisePhrases: [], usefulPhrases: ['草地上有6只', '又跑来了3只'],
  questionMeaningOptions: ['问总数', '问还剩'],
  correctMeaning: '问总数', operation: 'addition', equation: '6 + 3 = ?',
  answer: 9, answerSentence: '一共9只', explanation: '6+3=9',
  solutionSteps: ['找到6和3', '6+3=9'], hints: ['增加了还是减少了？'],
  difficulty: 1, category: 'addition', visualKey: 'rabbit',
  requiresAnswer: true, lessonType: 'add_sub_action', keywordType: 'add_action',
  stepCompatibility: ['find_numbers', 'find_action_words', 'simulation', 'full_solve'],
  answerType: 'number', sceneType: 'animal_grassland', themeTags: ['animals'],
  problemType: 'basic_arithmetic',
};

console.log('\n=== test:three-question-render ===\n');

test('question with reasoningFrame returns compatible', () => {
  assert(isThreeQuestionFlowCompatible(questionWithFrame) === true, 'should be compatible');
});

test('simple question without reasoningFrame returns not compatible', () => {
  assert(isThreeQuestionFlowCompatible(simpleQuestion) === false, 'should not be compatible');
});

test('full_solve with compatible question returns three-question phases', () => {
  const p = getDefaultPhasesForStepType('full_solve', questionWithFrame);
  assert(p.includes('known_facts'), `should have known_facts, got [${p}]`);
  assert(p.includes('target'), `should have target, got [${p}]`);
  assert(p.includes('plan'), `should have plan, got [${p}]`);
  assert(p.includes('check'), `should have check, got [${p}]`);
  assert(p.includes('answer'), `should have answer, got [${p}]`);
  assert(p.includes('explain'), `should have explain, got [${p}]`);
});

test('full_solve without reasoning frame returns standard phases', () => {
  const p = getDefaultPhasesForStepType('full_solve', simpleQuestion);
  assert(p.includes('find_numbers'), `should use standard, got [${p}]`);
  assert(!p.includes('known_facts'), 'should NOT have known_facts');
});

test('three-question phases exclusive from standard', () => {
  const tqf = getDefaultPhasesForStepType('full_solve', questionWithFrame);
  const std = getDefaultPhasesForStepType('full_solve', simpleQuestion);
  const tqfOnly = tqf.filter(p => !['read','answer','explain'].includes(p));
  const stdOnly = std.filter(p => !['read','answer','explain'].includes(p));
  assert(tqfOnly.length === 4, `TQF unique: ${tqfOnly.length} expected 4`);
  const overlap = tqfOnly.some(p => stdOnly.includes(p));
  assert(!overlap, 'phases should not overlap');
});

test('first phase is always read', () => {
  const types = ['full_solve','find_numbers','find_action_words','simulation','remove_noise','find_compare_numbers','spot_extra_info','spot_missing_info'] as const;
  for (const t of types) {
    const p = getDefaultPhasesForStepType(t, questionWithFrame);
    assert(p[0] === 'read', `${t} first phase: '${p[0]}'`);
  }
});

test('read is always first', () => {
  assert(getDefaultPhasesForStepType('full_solve', questionWithFrame)[0] === 'read', 'read should be first');
});

test('reasoningFrame has all required fields', () => {
  const rf = (questionWithFrame as any).reasoningFrame;
  assert(rf !== undefined, 'exists');
  assert(Array.isArray(rf.knownFacts) && rf.knownFacts.length > 0, 'knownFacts non-empty');
  assert(rf.targetQuestion && rf.targetQuestion.text, 'targetQuestion exists');
  assert(rf.plan && rf.plan.firstStep, 'plan exists');
  assert(rf.check, 'check exists');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) { process.exit(1); } else { console.log('✅ All three-question-render tests PASSED'); }
