import assert from 'node:assert/strict';
import { checkAnswer } from '@/lib/answerChecker';
import { inferAnswerSchema } from '@/lib/answerSchema';
import { getQuestionById } from '@/data/questions';

function question(id: string) {
  const value = getQuestionById(id);
  assert.ok(value, `missing question ${id}`);
  return value;
}

function permutations<T>(values: T[]): T[][] {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, candidateIndex) => candidateIndex !== index))
      .map(rest => [value, ...rest]),
  );
}

const digitSolutions: Array<[number, number]> = [];
for (let a = 1; a <= 9; a += 1) {
  for (let b = 1; b <= 9; b += 1) {
    if (a !== b && a > b && a - b === 2 && (10 * a + b) + (10 * b + a) === 88) {
      digitSolutions.push([a, b]);
    }
  }
}
assert.deepEqual(digitSolutions, [[5, 3]]);
const digitRiddle = question('g3o_20');
assert.deepEqual(digitRiddle.numbers, [88, 2]);
assert.match(digitRiddle.text, /A比B大2/);
assert.equal(digitRiddle.correctMeaning, 'A=5,B=3');
assert.ok(digitRiddle.equation.includes('A+B=8') && digitRiddle.equation.includes('A−B=2'));

const animalSolutions: Array<[number, number]> = [];
for (let spiders = 0; spiders <= 18; spiders += 1) {
  const dragonflies = 18 - spiders;
  if (8 * spiders + 6 * dragonflies === 118 && 2 * dragonflies === 26) {
    animalSolutions.push([spiders, dragonflies]);
  }
}
assert.deepEqual(animalSolutions, [[5, 13]]);
const animalQuestion = question('g4o_15');
assert.ok(animalQuestion.text.includes('26对翅'));
assert.ok(animalQuestion.usefulPhrases?.some(phrase => phrase.includes('26对翅')));
assert.ok(animalQuestion.explanation.includes('13×2=26对'));

const names = ['甲', '乙', '丙'];
const truthTellerSolutions = permutations(names).filter(order => {
  const rank = new Map(order.map((name, index) => [name, index + 1]));
  const truths = [rank.get('甲') !== 1, rank.get('乙') !== 3, rank.get('乙') === 1];
  return truths.filter(Boolean).length === 2;
});
assert.deepEqual(truthTellerSolutions, [['丙', '乙', '甲']]);
const truthTeller = question('g4o_11');
assert.equal(truthTeller.answer, '丙');
assert.equal(truthTeller.correctMeaning, '丙是第一名');
assert.match(truthTeller.explanation, /甲第一时.*至少两人说谎/);
assert.match(truthTeller.explanation, /乙第一时.*没有人说谎/);
assert.match(truthTeller.explanation, /乙不是最后，所以乙第二、甲第三/);
assert.ok(truthTeller.questionMeaningOptions?.includes(truthTeller.correctMeaning));

const raceSolutions = permutations(['A', 'B', 'C', 'D', 'E']).filter(order => {
  const rank = new Map(order.map((name, index) => [name, index + 1]));
  if (rank.get('D') !== 3) return false;
  const statements: Record<string, boolean> = {
    A: rank.get('A') !== 1 && rank.get('A') !== 5,
    B: rank.get('B')! < rank.get('C')!,
    C: rank.get('E')! > rank.get('C')!,
    D: rank.get('D') === 3,
    E: rank.get('E')! < rank.get('A')!,
  };
  return order.every((name, index) => statements[name] === (index !== 0 && index !== 4));
});
assert.deepEqual(raceSolutions, [['A', 'B', 'D', 'C', 'E']]);
const raceQuestion = question('g4o_26');
assert.equal(raceQuestion.answer, 'A');
assert.equal(raceQuestion.correctMeaning, 'A第1');
assert.ok(raceQuestion.questionMeaningOptions?.includes(raceQuestion.correctMeaning));

const june28Weekday = (1 + ((28 - 1) % 7)) % 7;
const mondayDates = Array.from({ length: 30 }, (_, index) => index + 1)
  .filter(day => (day - 1) % 7 === 0);
assert.equal(june28Weekday, 0, 'weekday 0 is Sunday when Monday is offset 1');
assert.deepEqual(mondayDates, [1, 8, 15, 22, 29]);
const calendarQuestion = question('g3o_25');
assert.equal(calendarQuestion.answer, '周日,5个');
assert.equal(calendarQuestion.subAnswers?.find(field => field.id === 'count')?.answer, 5);

const pencilQuestion = question('g3_02');
const pencilRemainder = 48 - 25;
assert.equal(Math.floor(pencilRemainder / 5), 4);
assert.equal(pencilRemainder % 5, 3);
assert.equal(inferAnswerSchema(pencilQuestion).kind, 'multi_field');
assert.equal(checkAnswer({ quotient: '4', remainder: '3' }, pencilQuestion).correct, true);
assert.equal(checkAnswer({ quotient: '5', remainder: '3' }, pencilQuestion).correct, false);

const triangleQuestion = question('g1t_25');
const triangleCount = 3 + 1;
assert.equal(triangleCount, 4);
assert.match(triangleQuestion.text, /内部取一点.*连到三个顶点.*线段不延长/);
assert.equal(triangleQuestion.answer, triangleCount);

const tileQuestion = question('g4_06');
const tileArea = 30 * 30;
const floorArea = 300 * 200;
const minimumTiles = Math.ceil(floorArea / tileArea);
assert.equal(tileArea, 900);
assert.equal(minimumTiles, 67);
assert.equal(tileQuestion.subAnswers?.find(field => field.id === 'area')?.answer, tileArea);
assert.equal(tileQuestion.subAnswers?.find(field => field.id === 'count')?.answer, minimumTiles);
assert.match(tileQuestion.text, /忽略切割损耗且允许裁切拼接/);

const pricingQuestion = question('g5o_17');
const priceAsPercent = (1.15 / 0.85) * 100;
assert.equal(Number(priceAsPercent.toFixed(1)), 135.3);
assert.equal(pricingQuestion.answer, '135.3%');
assert.match(pricingQuestion.text, /保留一位小数/);
assert.match(pricingQuestion.text, /打八五折（按定价的85%出售）/);
assert.deepEqual(pricingQuestion.numbers, [85, 15]);

const originalOil = question('g6_15');
assert.match(originalOil.text, /第一次倒出原来全桶的1\/4，第二次也倒出原来全桶的1\/3/);
assert.equal((35 * 12) / 7, 60, '35 liters are 7/12 of the original amount');

const pipeQuestion = question('g6_18');
const fillTime = 1 / (1 / 6 + 1 / 8);
assert.ok(Math.abs(fillTime - 24 / 7) < 1e-12);
assert.equal(pipeQuestion.answer, '24/7');
assert.match(pipeQuestion.text, /答案用最简分数表示/);
assert.doesNotMatch(pipeQuestion.text, /约多少小时/);
assert.equal(inferAnswerSchema(pipeQuestion).kind, 'fraction');
assert.equal(checkAnswer('24/7', pipeQuestion).correct, true);
assert.equal(checkAnswer('3.43', pipeQuestion).correct, false, 'rounded display value is not the exact answer');

const grainQuestion = question('g6_19');
const radius = 12.56 / (2 * 3.14);
const cylinderVolume = 3.14 * radius ** 2 * 3;
const grainTons = cylinderVolume * 550 / 1000;
assert.equal(radius, 2);
assert.equal(cylinderVolume, 37.68);
assert.equal(grainTons, 20.724);
assert.equal(inferAnswerSchema(grainQuestion).kind, 'decimal');
assert.equal(checkAnswer('20.724', grainQuestion).correct, true);
assert.equal(checkAnswer('20.72', grainQuestion).correct, false);

const promotionQuestion = question('g6_20');
const paidBottles = 12;
const freeBottles = paidBottles / 3;
const totalBottles = paidBottles + freeBottles;
const savedPerBottle = 4 - (paidBottles * 4) / totalBottles;
assert.equal(totalBottles, 16);
assert.equal(savedPerBottle, 1);
assert.match(promotionQuestion.text, /买3送1/);
assert.match(promotionQuestion.text, /付12瓶饮料的钱/);
assert.match(promotionQuestion.text, /赠品另计/);
assert.doesNotMatch(promotionQuestion.text, /获赠4瓶|共得到16瓶/);
assert.match(promotionQuestion.explanation, /12÷3=4瓶，共得16瓶/);
assert.equal(inferAnswerSchema(promotionQuestion).kind, 'integer');
assert.equal(checkAnswer('1', promotionQuestion).correct, true);
assert.equal(checkAnswer('2', promotionQuestion).correct, false);

const heightOrderQuestion = question('g1ll_87');
assert.deepEqual(heightOrderQuestion.correctRanking?.order, ['小鹿', '小熊', '小猴']);
assert.equal(checkAnswer('小鹿 > 小熊 > 小猴', heightOrderQuestion).correct, true);
assert.equal(checkAnswer('小鹿，小熊，小猴', heightOrderQuestion).correct, true);
assert.equal(checkAnswer('小熊,小鹿,小猴', heightOrderQuestion).correct, false);
assert.equal(checkAnswer('小鹿,小熊,小猴,', heightOrderQuestion).correct, false);
const profitQuestion = question('g5o_16');
assert.equal(checkAnswer({ profit: '18', rate: '12%' }, profitQuestion).correct, true, 'legacy numeric percent with explicit percent unit retains its intended meaning');
assert.equal(checkAnswer({ profit: '18', rate: '1200%' }, profitQuestion).correct, false);
assert.equal(checkAnswer({ profit: '18', rate: '12' }, profitQuestion).correct, false, 'the UI serializes percent values explicitly rather than accepting an ambiguous bare number');
for (const [id, answer] of [['g3_22', 256 - 89 + 134], ['g3_mul_06', 10 * 4], ['g5_25', (520 - 80 * 5) / 3]] as const) {
  const arithmeticQuestion = question(id);
  assert.equal(inferAnswerSchema(arithmeticQuestion).kind, 'integer', 'a sports setting does not turn an arithmetic task into a ranking task');
  assert.equal(checkAnswer(String(answer), arithmeticQuestion).correct, true);
  assert.equal(checkAnswer(String(answer + 1), arithmeticQuestion).correct, false);
}
assert.match(question('g3_mul_06').text, /每个班各出1队/);
assert.equal(checkAnswer({ enough: '够', remaining: '5' }, question('g4_20')).correct, true);
assert.equal(checkAnswer({ enough: '不够', remaining: '5' }, question('g4_20')).correct, false);
assert.equal(checkAnswer({ enough: '够' }, question('g4_20')).correct, false);
assert.equal(checkAnswer({ now: '96', comparison: '低' }, question('g6_16')).correct, true);
assert.equal(checkAnswer({ now: '96', comparison: '高' }, question('g6_16')).correct, false);
assert.equal(checkAnswer({ comparison: '低' }, question('g6_16')).correct, false);

console.log('PASS corrected transfer source questions through independent enumeration, arithmetic, and answer-checker assertions');
