import type { Question } from '@/lib/types';
import type { TransferEntry, TransferExpression, TransferGap, TransferProof } from '@/data/questions/transfers/types';
import { inferAnswerSchema } from '@/lib/answerSchema';

// Independent mathematical oracle. This module deliberately imports no builder,
// registry helper, or generator evaluator.
type Q = { n: bigint; d: bigint };
const ZERO = BigInt(0), ONE = BigInt(1), TEN = BigInt(10);
const HISTORICALLY_UNSAFE_SOURCES = new Set(['g1ll_65', 'g1ll_67', 'g2_24', 'g5o_13', 'g5o_32']);
const gcd = (a: bigint, b: bigint): bigint => b === ZERO ? (a < ZERO ? -a : a) : gcd(b, a % b);
function rational(n: bigint, d = ONE): Q {
  if (!d) throw new Error('zero denominator');
  const g = gcd(n, d); return { n: n / g * (d < ZERO ? -ONE : ONE), d: d / g * (d < ZERO ? -ONE : ONE) };
}
function parse(raw: string | number): Q {
  const s = String(raw).trim();
  const f = s.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if (f) return rational(BigInt(f[1]), BigInt(f[2]));
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) throw new Error(`not a strict rational: ${s}`);
  const parts = s.replace(/^[+-]/, '').split('.');
  return rational(BigInt(`${parts[0] || '0'}${parts[1] || ''}`) * (s.startsWith('-') ? -ONE : ONE), TEN ** BigInt(parts[1]?.length || 0));
}
const add = (a: Q, b: Q) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a: Q, b: Q) => rational(a.n * b.n, a.d * b.d);
const div = (a: Q, b: Q) => rational(a.n * b.d, a.d * b.n);
const sub = (a: Q, b: Q) => add(a, { n: -b.n, d: b.d });
const equal = (a: Q, b: Q) => a.n * b.d === b.n * a.d;
const value = (a: Q) => Number(a.n) / Number(a.d);
const key = (a: Q) => `${a.n}/${a.d}`;
function evaluate(node: TransferExpression, facts: Record<string, number>): Q {
  if (typeof node === 'number') return parse(node);
  if ('fact' in node) {
    if (!Object.hasOwn(facts, node.fact)) throw new Error(`missing fact ${node.fact}`);
    return parse(facts[node.fact]);
  }
  const args = node.args.map(arg => evaluate(arg, facts));
  if (!args.length) throw new Error('empty operation');
  switch (node.op) {
    case 'add': return args.reduce(add);
    case 'mul': return args.reduce(mul);
    case 'sub': if (args.length !== 2) throw new Error('sub arity'); return sub(args[0], args[1]);
    case 'div': if (args.length !== 2) throw new Error('div arity'); return div(args[0], args[1]);
    case 'floor': if (args.length !== 1) throw new Error('floor arity'); return parse(Math.floor(value(args[0])));
    case 'ceil': if (args.length !== 1) throw new Error('ceil arity'); return parse(Math.ceil(value(args[0])));
    case 'pow': {
      if (args.length !== 2 || args[1].d !== ONE || args[1].n < ZERO || args[1].n > TEN) throw new Error('unsafe exponent');
      return rational(args[0].n ** args[1].n, args[0].d ** args[1].n);
    }
    case 'min': return args.reduce((a, b) => value(a) < value(b) ? a : b);
    case 'max': return args.reduce((a, b) => value(a) > value(b) ? a : b);
  }
}
function resultMap(proof: TransferProof): Record<string, Q> {
  const node = proof.result;
  return typeof node === 'number' || 'fact' in node || 'op' in node
    ? { answer: evaluate(node as TransferExpression, proof.facts) }
    : Object.fromEntries(Object.entries(node).map(([id, expression]) => [id, evaluate(expression, proof.facts)]));
}
function answerNumber(answer: string | number, format?: TransferProof['format']): Q {
  const s = String(answer).trim();
  if (format === 'money') {
    const amount = s.match(/^(?:(\d+)元)?(?:(\d+)角)?$/);
    if (!amount || !amount[1] && !amount[2]) throw new Error('money answer must explicitly use yuan/jiao');
    return parse(Number(amount[1] || 0) * 10 + Number(amount[2] || 0));
  }
  if (format === 'time') {
    const clock = s.match(/^(\d{1,2}):(\d{2})$/);
    if (clock) return parse(Number(clock[1]) * 60 + Number(clock[2]));
    const duration = s.match(/^(?:(\d+)小时)?(?:(\d+)分(?:钟)?)?$/);
    if (duration && (duration[1] || duration[2])) return parse(Number(duration[1] || 0) * 60 + Number(duration[2] || 0));
  }
  if (s.endsWith('%')) return div(parse(s.slice(0, -1)), parse(100));
  return parse(s.replace(/(?:平方厘米|平方分米|平方米|立方厘米|立方分米|立方米|千克|千米|厘米|分米|小时|分钟|毫升|公斤|公里|克|吨|米|升|元|角|个|只|张|支|本|人|条|件|份|袋|杯|块|页|辆|棵|枚|倍|圈|天|度)$/, ''));
}
function exactTextNumber(answer: Q, fraction: boolean): string {
  if (answer.d === ONE) return String(answer.n);
  if (fraction) return `${answer.n}/${answer.d}`;
  let denominator = answer.d, twos = 0, fives = 0;
  while (denominator % BigInt(2) === ZERO) { denominator /= BigInt(2); twos++; }
  while (denominator % BigInt(5) === ZERO) { denominator /= BigInt(5); fives++; }
  if (denominator !== ONE) return `${answer.n}/${answer.d}`;
  const places = Math.max(twos, fives);
  const scaled = answer.n * BigInt(2) ** BigInt(places - twos) * BigInt(5) ** BigInt(places - fives);
  const digits = String(scaled < ZERO ? -scaled : scaled).padStart(places + 1, '0');
  return `${scaled < ZERO ? '-' : ''}${digits.slice(0, -places)}.${digits.slice(-places)}`.replace(/0+$/, '').replace(/\.$/, '');
}
function assertAnswers(question: Question, expected: Record<string, Q>, proof?: TransferProof): void {
  if (proof?.format === 'text' && proof.template) {
    const slots = [...proof.template.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match => match[1]);
    if (!slots.length || [...new Set(slots)].sort().join('|') !== Object.keys(expected).sort().join('|')) throw new Error('text answer template must bind every independently computed target');
    const rendered = proof.template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (_, id: string) => {
      const answer = expected[id];
      return exactTextNumber(answer, proof.slotFormats?.[id] === 'fraction');
    });
    const normalize = (text: string) => text.replace(/\s/g, '');
    if (normalize(rendered) !== normalize(String(question.answer))) throw new Error('text answer differs from independently computed template targets');
    const schema = inferAnswerSchema(question);
    if (schema.kind === 'multi_field') {
      const numericFields = schema.fields.filter(field => field.kind !== 'text');
      if (numericFields.length !== slots.length) throw new Error('text-template computed targets do not cover every numeric answer field');
      numericFields.forEach((field, index) => {
        const subAnswer = question.subAnswers?.find(answer => answer.id === field.id);
        if (!subAnswer) throw new Error('computed text answer has no matching UI subanswer');
        const actual = field.kind === 'percent' ? parse(String(subAnswer.answer).replace(/%$/, '')) : answerNumber(subAnswer.answer);
        if (!equal(actual, expected[slots[index]])) throw new Error(`text-template UI field ${field.id} disagrees with independently computed target ${slots[index]}`);
      });
    }
    if (schema.kind === 'choice' && (schema.multiple
      || schema.options.filter(option => normalize(String(option.value)) === normalize(rendered)).length !== 1
      || !schema.options.some(option => normalize(String(option.value)) === normalize(rendered) && normalize(option.label) === normalize(rendered)))) throw new Error('textual choices must show the one correct computed answer');
    return;
  }
  if (proof?.format === 'ratio') {
    const parts = String(question.answer).split(':');
    const computed = Object.values(expected);
    if (parts.length !== computed.length || parts.length < 2) throw new Error('ratio component count differs');
    const actual = parts.map(parse);
    if (!actual[0].n || !computed[0].n || actual.some((part, index) => !equal(div(part, actual[0]), div(computed[index], computed[0])))) throw new Error('ratio values differ');
    if (/最简整数比/.test(question.text) && (actual.some(part => part.d !== ONE || part.n <= ZERO) || actual.reduce((g, part) => gcd(g, part.n), ZERO) !== ONE)) throw new Error('ratio is not in simplest positive integer form');
    return;
  }
  const answers = question.subAnswers?.length
    ? Object.fromEntries(question.subAnswers.map(field => [field.id, field.answer])) : { answer: question.answer };
  if (Object.keys(answers).sort().join('|') !== Object.keys(expected).sort().join('|')) throw new Error('oracle target fields differ from answer fields');
  for (const [id, answer] of Object.entries(answers)) {
    const actual = answerNumber(answer, proof?.format);
    const exact = expected[id];
    if (!equal(actual, exact)) {
      const scale = String(answer).endsWith('%') ? 100 : 1;
      if (proof?.precision === undefined || Math.abs(value(actual) - Number((value(exact) * scale).toFixed(proof.precision)) / scale) > 1e-9) {
        throw new Error(`${id}: answer ${answer} differs from independently computed ${key(exact)}`);
      }
      if (!/保留|精确到|四舍五入/.test(question.text)) throw new Error('rounded answer lacks prompt precision requirement');
    }
  }
}
function topology(node: TransferExpression): unknown {
  if (typeof node === 'number') return { constant: node };
  if ('fact' in node) return { fact: node.fact };
  return { op: node.op, args: node.args.map(topology) };
}
function proofTopology(proof: TransferProof): string {
  const result = proof.result;
  return JSON.stringify(typeof result === 'number' || 'fact' in result || 'op' in result
    ? topology(result as TransferExpression)
    : Object.fromEntries(Object.entries(result).map(([id, expression]) => [id, topology(expression)])));
}
function anchorMatches(anchor: string, fact: number): boolean {
  const numbers = [...anchor.matchAll(/\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
  if (numbers.some(number => Math.abs(number - fact) < 1e-10)) return true;
  const chinese: Record<string, number> = { '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
  if ([...anchor.matchAll(/(?:^|[^一二两三四五六七八九十])([一二三四五六七八九])折/g)].some(match => equal(parse(fact), div(parse(chinese[match[1]]), parse(10))))) return true;
  if ([...anchor.matchAll(/([一二两三四五六七八九十])(?:袋|组|个|人|张|只|块|件|份|杯|本|条|盒|天|小时|科|项|段|层|行|排|瓶|盘|队|种|次)/g)].some(match => chinese[match[1]] === fact)) return true;
  const dots = anchor.match(/[●•]+/g);
  if (dots?.length === 1 && dots[0].length === fact) return true;
  const repeatedUnknowns = anchor.split(/\s*\+\s*/);
  if (repeatedUnknowns.length >= 2 && repeatedUnknowns.every(symbol => symbol.trim() === '🔍')
    && repeatedUnknowns.length === fact) return true;
  const fractions = [...anchor.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
  if (fractions.some(match => Math.abs(Number(match[1]) / Number(match[2]) - fact) < 1e-10)) return true;
  const clock = anchor.match(/(\d{1,2}):(\d{2})/);
  if (clock && Number(clock[1]) * 60 + Number(clock[2]) === fact) return true;
  const currency = anchor.match(/(\d+)元(?:(\d)角)?/);
  if (currency && Number(currency[1]) * 10 + Number(currency[2] || 0) === fact) return true;
  const compound = anchor.match(/(\d+(?:\.\d+)?)\s*(千克|千米|米|升|小时)(?:\s*(\d+(?:\.\d+)?)\s*(克|米|厘米|毫升|分钟|分))?/);
  if (compound) {
    const scale = ['千克', '千米', '升'].includes(compound[2]) ? 1000 : compound[2] === '小时' ? 60 : 100;
    const expectedMinor: Record<string, string[]> = { '千克': ['克'], '千米': ['米'], '米': ['厘米'], '升': ['毫升'], '小时': ['分钟', '分'] };
    if (!compound[4] || expectedMinor[compound[2]].includes(compound[4])) {
      const inMinor = Number(compound[1]) * scale + Number(compound[3] || 0);
      if (Math.abs(inMinor - fact) < 1e-10 || Math.abs(inMinor / scale - fact) < 1e-10) return true;
    }
  }
  const properties: Array<[RegExp, number]> = [[/正方形|长方形|四条边|四周/, 4], [/三角形|三条边/, 3], [/^(?:一个|一张)?圆(?:形)?$/, 0], [/一周|星期/, 7], [/直角/, 90], [/平角|三角形/, 180], [/π|圆周率/, 3.14], [/一半|半/, 0.5]];
  return properties.some(([pattern, number]) => pattern.test(anchor) && fact === number);
}
function assertAnchors(question: Question, proof: TransferProof): void {
  if (!Object.keys(proof.facts).length) throw new Error('proof has no prompt facts');
  if (Object.keys(proof.facts).length !== Object.keys(proof.anchors).length) throw new Error('facts/anchors keys differ');
  for (const [name, fact] of Object.entries(proof.facts)) {
    const anchor = proof.anchors[name];
    if (!Number.isFinite(fact) || !anchor || !question.text.includes(anchor)) throw new Error(`unbound prompt fact ${name}=${fact}`);
    if (!anchorMatches(anchor, fact)) throw new Error(`anchor "${anchor}" does not substantiate ${name}=${fact}`);
  }
  const baseline = Object.values(resultMap(proof)).map(key).join('|');
  for (const [name, fact] of Object.entries(proof.facts)) {
    const relevant = [1, 2, 11, 0.1, -1, 1000, -1000].some(delta => {
      try { return Object.values(resultMap({ ...proof, facts: { ...proof.facts, [name]: fact + delta } })).map(key).join('|') !== baseline; } catch { return false; }
    });
    if (!relevant) throw new Error(`irrelevant/cancelled fact ${name}`);
  }
}
function carryCount(a: number, b: number, subtracting = false): number {
  let carry = 0, count = 0;
  while (a || b) {
    const digit = a % 10 + (subtracting ? -(b % 10) - carry : b % 10 + carry);
    carry = subtracting ? Number(digit < 0) : Number(digit >= 10);
    count += carry; a = Math.floor(a / 10); b = Math.floor(b / 10);
  }
  return count;
}
function arithmeticBurden(proof: TransferProof, countingWithinTen = false): string[] {
  const hasDecimalGivens = Object.values(proof.facts).some(number => !Number.isInteger(number));
  const signatures: string[] = Object.entries(proof.facts).map(([name, number]) => {
    const unsigned = Math.abs(number), integerDigits = String(Math.floor(unsigned)).length;
    const decimals = String(number).split('.')[1]?.length || 0;
    return `fact:${name}:digits=${integerDigits}:decimals=${decimals}:negative=${number < 0}`;
  });
  const rateDenominators = (node: TransferExpression): [number, number] | undefined => {
    if (typeof node === 'number' || 'fact' in node || node.op !== 'div' || node.args[0] !== 1) return undefined;
    const sum = node.args[1];
    if (typeof sum === 'number' || 'fact' in sum || sum.op !== 'add' || sum.args.length !== 2) return undefined;
    const denominators = sum.args.map(rate => {
      if (typeof rate === 'number' || 'fact' in rate || rate.op !== 'div' || rate.args[0] !== 1 || rate.args.length !== 2) return NaN;
      return value(evaluate(rate.args[1], proof.facts));
    });
    return denominators.every(n => Number.isInteger(n) && n >= 2) ? denominators as [number, number] : undefined;
  };
  const resultNode = proof.result;
  const rates = typeof resultNode === 'number' || 'fact' in resultNode || 'op' in resultNode ? rateDenominators(resultNode as TransferExpression) : undefined;
  if (rates) {
    // Work-rate lessons add exact unit fractions. Whether 1/a happens to
    // terminate in base ten is unrelated to the taught common-denominator method.
    const [a, b] = rates, commonFactor = Number(gcd(BigInt(a), BigInt(b))), common = a / commonFactor * b;
    const left = common / a, right = common / b, numerator = left + right;
    const reduction = Number(gcd(BigInt(numerator), BigInt(common)));
    signatures.push(`unit-fractions:shared-factor=${commonFactor > 1}:one-divides-other=${a % b === 0 || b % a === 0}:lcm-digits=${String(common).length}:multipliers=${String(left).length},${String(right).length}:numerator-carry=${carryCount(left, right)}:reduces=${reduction > 1}:reduction-digits=${String(reduction).length}`);
  }
  function walk(node: TransferExpression): void {
    if (typeof node === 'number' || 'fact' in node) return;
    node.args.forEach(walk);
    const args = node.args.map(arg => value(evaluate(arg, proof.facts)));
    const ints = args.every(number => Number.isInteger(number) && number >= 0);
    if ((node.op === 'add' || node.op === 'sub') && args.length === 2 && ints) signatures.push(countingWithinTen && node.op === 'add' && args[0] + args[1] <= 10
      ? 'add:within-ten-number-composition' : `${node.op}:carry=${carryCount(args[0], args[1], node.op === 'sub')}`);
    if (node.op === 'add' && args.length > 2 && ints) {
      let total = args[0];
      for (const next of args.slice(1)) { signatures.push(`add:carry=${carryCount(total, next)}`); total += next; }
    }
    if (node.op === 'div' && args.length === 2) signatures.push(`div:exact=${div(evaluate(node.args[0], proof.facts), evaluate(node.args[1], proof.facts)).d === ONE}`);
    if (node.op === 'mul' && args.length === 2) signatures.push(`mul:operand-digits=${args.map(number => Math.abs(number) < 10 ? 'single' : Math.abs(number) < 100 ? 'two' : 'large').join(',')}`);
    if (!rates && !['floor', 'ceil'].includes(node.op) && args.some(number => !Number.isInteger(number))) {
      const decimals = node.args.map(arg => {
        const r = evaluate(arg, proof.facts); let denominator = r.d, twos = 0, fives = 0;
        while (denominator % BigInt(2) === ZERO) { denominator /= BigInt(2); twos++; }
        while (denominator % BigInt(5) === ZERO) { denominator /= BigInt(5); fives++; }
        return denominator === ONE ? Math.max(twos, fives) : 'fraction';
      });
      signatures.push(`${node.op}:decimal-places=${decimals.join(',')}`);
      if (hasDecimalGivens && (node.op === 'add' || node.op === 'sub') && args.length === 2 && args.every(n => n >= 0)
        && decimals.every((places): places is number => typeof places === 'number' && places <= 6)) {
        const scale = 10 ** Math.max(...decimals);
        signatures.push(`${node.op}:decimal-carry=${carryCount(Math.round(args[0] * scale), Math.round(args[1] * scale), node.op === 'sub')}`);
      }
    }
  }
  const result = proof.result;
  if (typeof result === 'number' || 'fact' in result || 'op' in result) walk(result as TransferExpression);
  else Object.values(result).forEach(walk);
  return signatures.sort();
}
type Params = Record<string, number | string | number[] | string[]>;
function num(p: Params, name: string): number { const n = p[name]; if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`invalid parameter ${name}`); return n; }
function promptNumber(question: Question, n: number): void {
  if (![...question.text.matchAll(/\d+(?:\.\d+)?/g)].some(match => Number(match[0]) === n)) throw new Error(`enumeration parameter ${n} is absent from prompt`);
}
function enumerate(question: Question, model: string, p: Params): Record<string, Q> {
  const get = (name: string) => { const n = num(p, name); promptNumber(question, n); return n; };
  let answer: number;
  switch (model) {
    case 'progression-g5-two-digit-multiple-of-three-count-v1': {
      const digits = p.digits as number[], visible = question.text.match(/从数字([0-9、,，\s]+?)中选两个不同数字/)?.[1];
      if (!Array.isArray(digits) || digits.length !== 4 || new Set(digits).size !== 4 || !digits.every(n => Number.isInteger(n) && n >= 1 && n <= 9)
        || p.target !== 'count' || !visible || JSON.stringify(visible.split(/[、,，\s]+/).filter(Boolean).map(Number)) !== JSON.stringify(digits)
        || !/两位数/.test(question.text) || !/3的倍数/.test(question.text)) throw new Error('two-digit multiple domain or constraints missing');
      const results = new Set<number>();
      for (const a of digits) for (const b of digits) if (a !== b && (10 * a + b) % 3 === 0) results.add(10 * a + b);
      answer = results.size; break;
    }
    case 'progression-g6-middle-pair-constraints-v1': {
      const lower = get('lower'), upper = get('upper'), mean = get('mean'), median = get('median'), difference = get('difference');
      if (p.target !== 'a' || ![lower, upper, mean, median, difference].every(Number.isInteger) || lower < 0 || upper > 200 || difference <= 0
        || !question.text.includes(`从小到大为${lower}、a、b、${upper}`) || !question.text.includes(`平均数是${mean}`) || !question.text.includes(`中位数是${median}`)
        || !question.text.includes(`b比a大${difference}`) || !/a是多少/.test(question.text)) throw new Error('middle-pair ordering/mean/median/difference constraints missing');
      // These two independent linear equations uniquely determine the pair
      // over the reals; the remaining stated constraints must all hold too.
      const a = median - difference / 2, b = median + difference / 2;
      if (!(lower <= a && a <= b && b <= upper) || (lower + a + b + upper) / 4 !== mean) throw new Error('middle-pair constraints are inconsistent');
      answer = a; break;
    }
    case 'progression-g4-min-digit-permutation-threshold-v1':
    case 'progression-g4-four-digit-place-constraints-v1': {
      const digits = p.digits as number[], visible = question.text.match(/(?:用数字|用数字)([0-9、,，\s]+?)各一次/)?.[1];
      if (!Array.isArray(digits) || digits.length !== 4 || new Set(digits).size !== 4 || !digits.every(n => Number.isInteger(n) && n >= 0 && n <= 9)
        || !visible || JSON.stringify(visible.split(/[、,，\s]+/).filter(Boolean).map(Number)) !== JSON.stringify(digits)) throw new Error('four-digit permutation domain differs from prompt list');
      const domain = permutations(digits).filter(order => order[0] !== 0);
      if (model === 'progression-g4-min-digit-permutation-threshold-v1') {
        const threshold = get('threshold');
        if (!Number.isInteger(threshold) || threshold < 1000 || threshold > 9000 || threshold % 1000 || p.target !== 'minimum-above'
          || !question.text.includes(`大于${threshold}的最小四位数`)) throw new Error('threshold minimum target missing');
        const values = domain.map(order => order.reduce((value, digit) => 10 * value + digit, 0)).filter(n => n > threshold);
        if (!values.length) throw new Error('no valid four-digit permutation above threshold');
        answer = Math.min(...values);
      } else {
        const difference = get('tensMinusUnits'), multiplier = get('thousandsTimesHundreds');
        if (!Number.isInteger(difference) || difference < 1 || difference > 8 || !Number.isInteger(multiplier) || multiplier < 2 || multiplier > 9 || p.target !== 'unique'
          || !question.text.includes(`十位数字比个位大${difference}`) || !question.text.includes(`千位数字是百位数字的${multiplier}倍`)) throw new Error('digit place constraints are not explicitly bound');
        const values = domain.filter(([a, b, c, d]) => c - d === difference && a === b * multiplier);
        if (values.length !== 1) throw new Error(`four-digit constraints have ${values.length} solutions`);
        answer = values[0].reduce((value, digit) => 10 * value + digit, 0);
      }
      break;
    }
    case 'periodic-coincidence-v1': {
      const periods = p.periods as number[], origin = String(p.originClock), originMatch = origin.match(/^(\d{1,2}):(\d{2})$/);
      if (!Array.isArray(periods) || periods.length !== 2 || !periods.every(n => Number.isInteger(n) && n >= 2 && n <= 60) || !originMatch
        || !question.text.includes(origin) || !/同时/.test(question.text) || periods.some(n => !question.text.includes(`每${n}分钟`) && !question.text.includes(`每隔${n}分钟`))) throw new Error('periodic event periods or common origin not bound');
      const originMinute = Number(originMatch[1]) * 60 + Number(originMatch[2]);
      if (Number(originMatch[1]) > 23 || Number(originMatch[2]) > 59) throw new Error('invalid periodic origin clock');
      const first = (() => { for (let n = 1; n <= periods[0] * periods[1]; n++) if (periods.every(period => n % period === 0)) return n; throw new Error('no coincident event'); })();
      if (p.target === 'next') { if (!/下次同时/.test(question.text)) throw new Error('next coincident target missing'); answer = first; }
      else if (p.target === 'count') {
        const start = num(p, 'windowStart'), end = num(p, 'windowEnd');
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > 1440 || !['true', 'false'].includes(String(p.startInclusive)) || !['true', 'false'].includes(String(p.endInclusive))) throw new Error('invalid coincidence window');
        for (const [offset, anchorValue, inclusive, isStart] of [[start, p.windowStartAnchor, p.startInclusive, true], [end, p.windowEndAnchor, p.endInclusive, false]] as const) {
          const anchor = String(anchorValue || '');
          if (!anchor || !question.text.includes(anchor)) throw new Error('coincidence window anchor missing');
          if (isStart && offset === 0 && anchor === '再次' && inclusive === 'false') continue;
          const clocks = [...anchor.matchAll(/(\d{1,2}):(\d{2})/g)].map(match => Number(match[1]) * 60 + Number(match[2]));
          if (!clocks.includes(originMinute + offset)) throw new Error('window minute offset contradicts visible bound clock');
          if (!(inclusive === 'true' ? /含端点/.test(anchor) || /含端点/.test(question.text) : /不含/.test(anchor))) throw new Error('window endpoint inclusion is not explicit');
        }
        answer = 0;
        for (let t = start + (p.startInclusive === 'true' ? 0 : 1); t <= end - (p.endInclusive === 'true' ? 0 : 1); t++) if (periods.every(period => t % period === 0)) answer++;
      } else throw new Error('unknown coincidence target');
      break;
    }
    case 'progression-five-observation-mode-v1': {
      const observations = p.observations as number[];
      if (!Array.isArray(observations) || observations.length !== 5 || !observations.every(n => Number.isInteger(n) && n >= 0 && n <= 99)
        || p.target !== 'unique-mode' || !/众数/.test(question.text)) throw new Error('mode target or five-observation domain missing');
      const visible = question.text.match(/\d+(?:\s*[、,，]\s*\d+){4}/)?.[0];
      if (!visible || JSON.stringify(visible.split(/[、,，]/).map(Number)) !== JSON.stringify(observations)) throw new Error('mode observations differ from complete visible list');
      const frequencies = new Map<number, number>();
      observations.forEach(n => frequencies.set(n, (frequencies.get(n) || 0) + 1));
      const maximum = Math.max(...frequencies.values()), modes = [...frequencies].filter(([, count]) => count === maximum);
      if (maximum < 2 || modes.length !== 1) throw new Error('observation list has no unique repeated mode');
      answer = modes[0][0]; break;
    }
    case 'progression-coin-combination-count-v1': {
      const denominations = p.denominations as number[], minima = p.minimumCounts as number[], total = get('total');
      if (!Array.isArray(denominations) || JSON.stringify(denominations) !== '[1,2]' || !Array.isArray(minima) || minima.length !== 2
        || minima[0] !== 0 || ![0, 1].includes(minima[1]) || !Number.isInteger(total) || total < 2 || total > 20 || p.target !== 'count'
        || !/用1元和2元硬币/.test(question.text) || !question.text.includes(`凑成${total}元`) || !/几种|多少种/.test(question.text)
        || !(minima[1] === 1 ? /至少用一枚2元硬币/.test(question.text) : /每种硬币可以一枚也不取/.test(question.text))) throw new Error('coin combination domain or minimum constraint missing');
      const solutions: Array<[number, number]> = [];
      for (let ones = minima[0]; ones <= total; ones++) for (let twos = minima[1]; twos * 2 <= total; twos++) if (ones + 2 * twos === total) solutions.push([ones, twos]);
      answer = solutions.length; break;
    }
    case 'progression-g5-three-digit-even-sum-v1': {
      const digits = p.digits as number[], digitSum = get('digitSum');
      if (!Array.isArray(digits) || digits.length !== 5 || new Set(digits).size !== 5 || !digits.every(n => Number.isInteger(n) && n >= 0 && n <= 9)
        || !Number.isInteger(digitSum) || digitSum < 1 || digitSum > 27 || p.target !== 'count' || !/各最多一次|不重复/.test(question.text)
        || !/三位偶数/.test(question.text) || !question.text.includes(`三个数字相加等于${digitSum}`)) throw new Error('three-digit even sum constraints missing');
      const visibleDigits = question.text.match(/用数字([0-9、,，\s]+?)(?:各最多一次|不重复)/)?.[1].split(/[、,，\s]+/).filter(Boolean).map(Number);
      if (JSON.stringify(visibleDigits) !== JSON.stringify(digits)) throw new Error('digit enumeration domain differs from actual prompt list');
      const results = new Set<number>();
      for (const a of digits) for (const b of digits) for (const c of digits) if (a !== 0 && a !== b && a !== c && b !== c && c % 2 === 0 && a + b + c === digitSum) results.add(100 * a + 10 * b + c);
      answer = results.size; break;
    }
    case 'progression-g5-frequency-fraction-v1': {
      const observations = p.observations as number[], target = num(p, 'target');
      if (!Array.isArray(observations) || observations.length !== 7 || observations.some(n => !Number.isInteger(n) || n < 0 || n > 99)
        || !question.text.includes(`骑行${target}千米的天数`) || !/一周.*几分之几/.test(question.text)) throw new Error('frequency-fraction target or weekly domain missing');
      const series = [...question.text.matchAll(/\d+(?:\s*[、,，]\s*\d+){6}/g)].map(match => match[0]);
      if (!series.some(list => JSON.stringify(list.split(/[、,，]/).map(Number)) === JSON.stringify(observations))) throw new Error('weekly observations differ from visible series');
      const count = observations.filter(n => n === target).length;
      return { answer: rational(BigInt(count), BigInt(observations.length)) };
    }
    case 'progression-g3-rectangle-integer-max-area-v1': {
      const perimeter = get('perimeter');
      if (!Number.isInteger(perimeter) || perimeter < 6 || perimeter > 100 || perimeter % 2 || p.target !== 'maximum-area'
        || !/长方形/.test(question.text) || !/整厘米|整数/.test(question.text) || !/面积最大/.test(question.text)) throw new Error('rectangle maximum-area domain missing');
      const areas: number[] = [];
      for (let width = 1; width * 2 <= perimeter / 2; width++) { const length = perimeter / 2 - width; if (length >= width) areas.push(length * width); }
      answer = Math.max(...areas); break;
    }
    case 'progression-g3-rectangle-fixed-area-min-perimeter-v1': {
      const area = get('area');
      if (!Number.isInteger(area) || area < 2 || area > 1000 || p.target !== 'minimum-perimeter'
        || !/长方形/.test(question.text) || !/整厘米|整数/.test(question.text) || !/周长最短|最短周长/.test(question.text)) throw new Error('rectangle minimum-perimeter domain missing');
      const perimeters: number[] = [];
      for (let width = 1; width * width <= area; width++) if (area % width === 0) perimeters.push(2 * (width + area / width));
      answer = Math.min(...perimeters); break;
    }
    case 'progression-g6-two-digit-pair-min-difference-v1': {
      const digits = p.digits as number[];
      if (!Array.isArray(digits) || digits.length !== 4 || new Set(digits).size !== 4 || !digits.every(n => Number.isInteger(n) && n >= 1 && n <= 9)
        || p.target !== 'minimum-positive-difference' || !/每张恰用一次|各用一次/.test(question.text) || !/两个两位数/.test(question.text) || !/差最小/.test(question.text)) throw new Error('two-digit pair domain missing');
      digits.forEach(digit => promptNumber(question, digit));
      const pairs = new Map<string, number>();
      for (const order of permutations(digits)) { const a = 10 * order[0] + order[1], b = 10 * order[2] + order[3]; if (a > b) pairs.set(`${a},${b}`, a - b); }
      answer = Math.min(...pairs.values());
      if ([...pairs.values()].filter(n => n === answer).length !== 1) throw new Error('minimal digit-pair difference has multiple optimal unordered pairs');
      break;
    }
    case 'bounded-congruence-v1': {
      const lower = num(p, 'lower'), upper = num(p, 'upper'), divisors = p.divisors as number[], remainders = p.remainders as number[], anchors = p.conditionAnchors as string[];
      const interval = String(p.intervalAnchor || '');
      if (!Number.isInteger(lower) || !Number.isInteger(upper) || lower < 0 || upper < lower || upper > 10000 || upper - lower > 1000
        || !interval || !question.text.includes(interval) || !anchorMatches(interval, lower) || !anchorMatches(interval, upper)
        || !['true', 'false'].includes(String(p.lowerInclusive)) || !['true', 'false'].includes(String(p.upperInclusive))
        || !Array.isArray(divisors) || divisors.length < 1 || divisors.length > 3 || !Array.isArray(remainders) || remainders.length !== divisors.length
        || !Array.isArray(anchors) || anchors.length !== divisors.length) throw new Error('invalid bounded congruence domain');
      for (let i = 0; i < divisors.length; i++) {
        const d = divisors[i], r = remainders[i], anchor = anchors[i];
        if (!Number.isInteger(d) || d < 2 || d > 100 || !Number.isInteger(r) || r < 0 || r >= d || !question.text.includes(anchor)) throw new Error('invalid congruence condition');
        const explicitDivision = anchorMatches(anchor, d) || d === 2 && /两两分组|偶数/.test(anchor);
        const exact = /没有剩余|没有剩下|没有余数|没有剩|一张不剩|整除|倍数|分完|偶数/.test(anchor);
        const remainderMatch = [...anchor.matchAll(/(?:余|剩)\s*(\d+)/g)].some(match => Number(match[1]) === r);
        if (!explicitDivision || !(r === 0 ? exact : remainderMatch)) throw new Error('congruence is not substantiated by visible division/remainder condition');
      }
      const start = lower + (p.lowerInclusive === 'true' ? 0 : 1), end = upper - (p.upperInclusive === 'true' ? 0 : 1);
      const solutions: number[] = [];
      for (let n = start; n <= end; n++) if (divisors.every((d, index) => n % d === remainders[index])) solutions.push(n);
      if (p.target === 'unique') { if (solutions.length !== 1) throw new Error(`bounded congruence has ${solutions.length} solutions`); answer = solutions[0]; }
      else if (p.target === 'minimum') { if (!solutions.length || !/最少|最小|至少/.test(question.text)) throw new Error('minimum congruence target missing'); answer = solutions[0]; }
      else if (p.target === 'count') { if (!/有几个|有多少个/.test(question.text)) throw new Error('congruence count target missing'); answer = solutions.length; }
      else throw new Error('unknown congruence target');
      break;
    }
    case 'least-natural-congruence-v1': {
      const divisors = p.divisors as number[], remainders = p.remainders as number[], anchors = p.conditionAnchors as string[];
      if (!Array.isArray(divisors) || divisors.length !== 2 || !Array.isArray(remainders) || remainders.length !== 2 || !Array.isArray(anchors) || anchors.length !== 2
        || p.target !== 'least-natural' || !/自然数/.test(question.text) || !/最小/.test(question.text)
        || !divisors.every(n => Number.isInteger(n) && n >= 2 && n <= 30) || !remainders.some(n => n > 0)) throw new Error('least-natural congruence domain missing');
      for (let index = 0; index < 2; index++) {
        const d = divisors[index], r = remainders[index];
        if (!Number.isInteger(r) || r < 0 || r >= d || !question.text.includes(anchors[index]) || !anchors[index].includes(`除以${d}余${r}`)) throw new Error('least-natural remainder condition is not explicit');
      }
      // The product is a complete common period, an independently derived
      // search bound; it is not a fabricated interval given in the story.
      const solutions: number[] = [];
      for (let n = 0; n < divisors[0] * divisors[1]; n++) if (divisors.every((d, i) => n % d === remainders[i])) solutions.push(n);
      if (!solutions.length) throw new Error('least-natural congruence constraints have no solution');
      answer = solutions[0]; break;
    }
    case 'progression-g1-triangle-square-card-count-v1': {
      const cards = get('cards'), edges = get('totalEdges'), triangle = get('triangleEdges'), square = get('squareEdges');
      if (!Number.isInteger(cards) || cards < 2 || cards > 20 || triangle !== 3 || square !== 4 || !/三角形.*正方形/.test(question.text) || !/正方形卡有几张/.test(question.text)) throw new Error('invalid card side-count constraints');
      const feasible: number[] = [];
      for (let squares = 0; squares <= cards; squares++) if ((cards - squares) * triangle + squares * square === edges) feasible.push(squares);
      if (feasible.length !== 1) throw new Error('card side-count has no unique feasible solution');
      answer = feasible[0]; break;
    }
    case 'progression-g2-max-product-plus-unused-v1':
    case 'progression-g2-max-product-minus-unused-v1': {
      const digits = p.digits as number[];
      const minus = model === 'progression-g2-max-product-minus-unused-v1';
      if (!Array.isArray(digits) || digits.length !== 3 || new Set(digits).size !== 3
        || !digits.every(n => Number.isInteger(n) && n >= 1 && n <= 9) || p.target !== (minus ? 'max-product-minus-unused' : 'max-product-plus-unused')
        || !/各用一次/.test(question.text) || !(minus ? /□×□[−\-]□/ : /□×□\+□/).test(question.text) || !/最大/.test(question.text)) throw new Error('invalid product-plus-unused constraints');
      digits.forEach(digit => promptNumber(question, digit));
      const choices = digits.map((unused, index) => { const factors = digits.filter((_, i) => i !== index); return { unused, result: factors[0] * factors[1] + (minus ? -unused : unused) }; });
      answer = Math.max(...choices.map(choice => choice.result));
      if (choices.filter(choice => choice.result === answer).length !== 1) throw new Error('nonunique optimal unordered factor pair');
      break;
    }
    case 'progression-g2-rectangle-grid-v1': {
      const rows = get('rows'), columns = get('columns');
      if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || columns < 1 || rows > 20 || columns > 20 || !/正方形也算长方形/.test(question.text)) throw new Error('grid constraints missing');
      answer = 0;
      for (let top = 0; top < rows; top++) for (let bottom = top + 1; bottom <= rows; bottom++) for (let left = 0; left < columns; left++) for (let right = left + 1; right <= columns; right++) answer++;
      break;
    }
    case 'progression-g3-two-digit-even-v1': {
      const digits = p.digits;
      if (!Array.isArray(digits) || !digits.every(digit => typeof digit === 'number' && Number.isInteger(digit) && digit >= 0 && digit <= 9)) throw new Error('invalid digits');
      (digits as number[]).forEach(digit => promptNumber(question, digit));
      if (!/没有重复|不重复/.test(question.text) || !/十位不能为0|首位不能为0/.test(question.text) || !/两位偶数/.test(question.text)) throw new Error('digit constraints missing');
      const solutions = new Set<number>();
      for (const tens of digits as number[]) for (const units of digits as number[]) if (tens && tens !== units && units % 2 === 0) solutions.add(tens * 10 + units);
      answer = solutions.size; break;
    }
    case 'progression-g5-painted-prism-two-faces-v1': {
      const length = get('length'), width = get('width'), height = get('height'), edge = get('cubeEdge');
      const dimensions = [length / edge, width / edge, height / edge];
      if (!dimensions.every(n => Number.isInteger(n) && n >= 3 && n <= 30) || !/恰好.*两面/.test(question.text) || !/外表全部涂色|表面.*涂色/.test(question.text)) throw new Error('painting constraints missing');
      answer = 0;
      for (let x = 0; x < dimensions[0]; x++) for (let y = 0; y < dimensions[1]; y++) for (let z = 0; z < dimensions[2]; z++) {
        const painted = Number(x === 0) + Number(x === dimensions[0] - 1) + Number(y === 0) + Number(y === dimensions[1] - 1) + Number(z === 0) + Number(z === dimensions[2] - 1);
        if (painted === 2) answer++;
      }
      break;
    }
    case 'progression-g6-max-product-fixed-sum-v1': {
      const min = get('minValue'), max = get('maxValue'), sum = get('sum');
      if (!/不同整数/.test(question.text) || !/积最大/.test(question.text)) throw new Error('product constraints missing');
      const solutions: Array<[number, number, number]> = [];
      for (let a = min; a <= max; a++) for (let b = a + 1; b <= max; b++) if (a + b === sum) solutions.push([a, b, a * b]);
      if (!solutions.length) throw new Error('no feasible product pair');
      answer = Math.max(...solutions.map(s => s[2]));
      if (solutions.filter(s => s[2] === answer).length !== 1) throw new Error('nonunique optimal product pair');
      break;
    }
    case 'progression-g6-wall-rectangle-max-area-v1': {
      const fence = get('fenceLength');
      if (!/墙.*不需要围/.test(question.text) || !/整米/.test(question.text) || !/垂直墙/.test(question.text)) throw new Error('wall constraints missing');
      const solutions: Array<[number, number]> = [];
      for (let side = 1; side * 2 < fence; side++) solutions.push([side, side * (fence - side * 2)]);
      const area = Math.max(...solutions.map(s => s[1])); const maxima = solutions.filter(s => s[1] === area);
      if (maxima.length !== 1) throw new Error('nonunique wall maximum');
      answer = maxima[0][0]; break;
    }
    default: throw new Error(`unimplemented independent model ${model}`);
  }
  return { answer: parse(answer) };
}

function permutations<T>(values: T[]): T[][] {
  return values.length ? values.flatMap((value, index) => permutations(values.filter((_, i) => i !== index)).map(rest => [value, ...rest])) : [[]];
}
function truthRanking(question: Question, p: Params): string {
  const people = p.people as string[], statements = p.statements as string[], known = (p.knownRanks || []) as string[];
  if (!Array.isArray(people) || people.length < 3 || people.length > 6 || new Set(people).size !== people.length || !people.every(person => question.text.includes(person))) throw new Error('ranking people not bound');
  if (!Array.isArray(statements) || statements.length !== people.length || !statements.every(statement => people.includes(statement.split(':')[0]))) throw new Error('ranking statements invalid');
  const rankWords: Record<number, string> = { 1: '第一名', 2: '第二名', 3: '第三名', 4: '第四名', 5: '第五名', 6: '第六名' };
  for (const statement of statements) {
    const [speaker, kind, a, b] = statement.split(':');
    const claim = question.text.match(new RegExp(`${speaker}说[：:]?["“]([^"”]+)["”]`))?.[1].replace(/[。\s]/g, '');
    if (!claim) throw new Error(`missing actual statement by ${speaker}`);
    let bound = false;
    if (kind === 'not-ranks') {
      const ranks = a.split(',').map(Number);
      bound = ranks.length === 1
        ? claim === `我不是${rankWords[ranks[0]]}` || claim === `我不是第${ranks[0]}` || (ranks[0] === people.length && claim === '我不是最后一名')
        : ranks.length === 2 && claim === `我不是第${ranks[0]}和第${ranks[1]}`;
    }
    if (kind === 'rank') {
      const person = b === undefined ? '我' : a, rank = Number(b === undefined ? a : b);
      bound = claim === `${person}是${rankWords[rank]}` || claim === `${person}是第${rank}` || claim === `${person}是第${rank}名`;
    }
    if (kind === 'before') bound = claim === `我比${a}快` || claim === `${a}比我慢`;
    if (kind === 'after') bound = claim === `我比${a}慢` || claim === `${a}比我快`;
    if (!bound) throw new Error(`predicate ${statement} is not bound to actual claim "${claim}"`);
  }
  const liarPositions = (p.liarPositions || []) as number[];
  const liarCount = typeof p.liarCount === 'number' ? p.liarCount : undefined;
  if (liarCount !== undefined && !new RegExp(`只有${liarCount === 1 ? '[一1]' : liarCount}人说谎`).test(question.text)) throw new Error('liar count not bound to prompt');
  if (liarPositions.length && !/第1和第5说谎|第一.*第五.*说谎/.test(question.text)) throw new Error('liar positions not bound to prompt');
  for (const item of known) {
    const [person, rank] = item.split(':');
    if (!question.text.includes(`${person}确实是第${rank}名`)) throw new Error(`unbound verified rank ${item}`);
  }
  const solutions: string[][] = [];
  for (const order of permutations(people)) {
    const position = (person: string) => { if (!people.includes(person)) throw new Error(`unknown person ${person}`); return order.indexOf(person) + 1; };
    if (known.some(item => { const [person, rank] = item.split(':'); return position(person) !== Number(rank); })) continue;
    const truths = statements.map(statement => {
      const [speaker, kind, a, b] = statement.split(':');
      switch (kind) {
        case 'not-ranks': return !a.split(',').map(Number).includes(position(speaker));
        case 'rank': return position(b === undefined ? speaker : a) === Number(b === undefined ? a : b);
        case 'before': return position(speaker) < position(a);
        case 'after': return position(speaker) > position(a);
        default: throw new Error(`unknown truth predicate ${kind}`);
      }
    });
    if (liarCount !== undefined && truths.filter(truth => !truth).length !== liarCount) continue;
    if (liarPositions.length && statements.some((statement, index) => truths[index] === liarPositions.includes(position(statement.split(':')[0])))) continue;
    solutions.push(order);
  }
  if (solutions.length !== 1) throw new Error(`ranking has ${solutions.length} solutions, expected unique full ranking`);
  if (p.target !== 'first' || !/谁是第1|谁是第一/.test(question.text)) throw new Error('unsupported ranking target');
  return solutions[0][0];
}
function booleanTruth(question: Question, p: Params): string {
  const people = p.people as string[], statements = p.statements as string[];
  if (!Array.isArray(people) || people.length !== 3 || new Set(people).size !== 3 || !people.every(person => question.text.includes(person))
    || !Array.isArray(statements) || statements.length !== 3 || new Set(statements.map(statement => statement.split(':')[0])).size !== 3
    || p.truthCount !== 1 || p.target !== 'true-person' || !/只有一人说真话/.test(question.text)) throw new Error('three-person boolean truth domain missing');
  const clauses = statements.map(statement => {
    const [speaker, kind, references] = statement.split(':'), targets = String(references).split(',');
    const claim = question.text.match(new RegExp(`${speaker}说[：:]?["“]([^"”]+)["”]`))?.[1].replace(/[。\s]/g, '');
    if (!people.includes(speaker) || !targets.every(target => people.includes(target) && target !== speaker) || new Set(targets).size !== targets.length
      || !(kind === 'not' && targets.length === 1 && claim === `${targets[0]}在说谎`
        || kind === 'and-not' && targets.length === 2 && (claim === `${targets[0]}和${targets[1]}都在说谎` || claim === `${targets[1]}和${targets[0]}都在说谎`))) throw new Error('boolean truth clause differs from actual quoted claim');
    return { speaker, kind, targets };
  });
  const solutions: boolean[][] = [];
  for (let mask = 0; mask < 2 ** people.length; mask++) {
    const truth = people.map((_, i) => Boolean(mask & 2 ** i));
    if (truth.filter(Boolean).length !== 1) continue;
    if (clauses.every(clause => truth[people.indexOf(clause.speaker)] === clause.targets.every(target => !truth[people.indexOf(target)]))) solutions.push(truth);
  }
  if (solutions.length !== 1 || String(question.answer) !== people[solutions[0].indexOf(true)]) throw new Error('boolean truth problem lacks the stored unique true speaker');
  return JSON.stringify(clauses.map(clause => clause.kind).sort());
}
function reverseProduct(question: Question, p: Params): string {
  const factor = num(p, 'factor');
  if (!Number.isInteger(factor) || factor < 2 || factor > 9 || p.target !== 'unique-number' || !question.text.includes(`ABCD×${factor}=DCBA`)
    || !/各代表不同数字/.test(question.text) || !/A≠0/.test(question.text)) throw new Error('reverse-product decimal-digit domain or constraint missing');
  const solutions: number[] = [];
  for (let number = 1000; number <= 9999; number++) if (new Set(String(number)).size === 4 && number * factor === Number([...String(number)].reverse().join(''))) solutions.push(number);
  if (solutions.length !== 1 || Number(question.answer) !== solutions[0]) throw new Error('reverse-product does not have the stored unique four-digit solution');
  let carry = 0, carries = 0;
  for (const digit of [...String(solutions[0])].reverse()) { carry = Math.floor((Number(digit) * factor + carry) / 10); if (carry) carries++; }
  return JSON.stringify({ digits: 4, carries });
}
function calendarWeekdayAndCount(question: Question, p: Params): string {
  const year = num(p, 'year'), month = num(p, 'month'), targetDay = num(p, 'targetDay'), startWeekday = num(p, 'startWeekday'), countWeekday = num(p, 'countWeekday');
  const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  if (!Number.isInteger(year) || year < 1950 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12 || p.startDay !== 1
    || !Number.isInteger(startWeekday) || startWeekday < 1 || startWeekday > 7 || !Number.isInteger(countWeekday) || countWeekday < 1 || countWeekday > 7
    || p.target !== 'weekday-and-month-count' || !question.text.includes(`${year}年${month}月1日${names[startWeekday - 1]}`)
    || !question.text.includes(`${month}月${targetDay}日是周几`) || !question.text.includes(`${month}月有几个${names[countWeekday - 1]}`)) throw new Error('combined calendar prompt does not bind its complete dates and weekday target');
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstActual = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7 + 1;
  if (firstActual !== startWeekday || !Number.isInteger(targetDay) || targetDay < 1 || targetDay > days) throw new Error('calendar premise contradicts the actual Gregorian month');
  let weekday = startWeekday, count = 0, target = '';
  for (let day = 1; day <= days; day++) { if (weekday === countWeekday) count++; if (day === targetDay) target = names[weekday - 1]; weekday = weekday === 7 ? 1 : weekday + 1; }
  if (question.answer !== `${target},${count}个` || question.subAnswers?.find(field => field.id === 'weekday')?.answer !== target
    || question.subAnswers?.find(field => field.id === 'count')?.answer !== count) throw new Error('calendar weekday/month-count stored targets disagree with full day enumeration');
  return JSON.stringify({ days, offsetDigits: String(targetDay - 1).length, wholeWeeks: (targetDay - 1) % 7 === 0, countWeekday });
}
function medianThreshold(question: Question, p: Params): string {
  const count = num(p, 'count'), threshold = num(p, 'threshold'), below = num(p, 'below'), same = num(p, 'equal'), above = num(p, 'above');
  if (![count, threshold, below, same, above].every(Number.isInteger) || count < 2 || count > 50 || Math.min(below, same, above) < 0 || below + same + above !== count
    || p.target !== 'relation-to-threshold' || !question.text.includes(`有${count}个数据`) || !question.text.includes(`${below}个小于${threshold}`)
    || !question.text.includes(`${same}个等于${threshold}`) || !question.text.includes(`${above}个大于${threshold}`) || !question.text.includes(`中位数与${threshold}相比`)) throw new Error('median threshold count categories are not bound to the prompt');
  const ordered = [...Array<string>(below).fill('<'), ...Array<string>(same).fill('='), ...Array<string>(above).fill('>')];
  const middle = Math.floor(count / 2), centers = count % 2 ? [ordered[middle]] : [ordered[middle - 1], ordered[middle]];
  if (centers.includes('<') && centers.includes('>')) throw new Error('median lies between opposite strict sides and its relation is not determined');
  const relation = centers.includes('<') ? '小于' : centers.includes('>') ? '大于' : '等于';
  if (question.answer !== `${relation}${threshold}`) throw new Error('median threshold answer contradicts the central ordered categories');
  return JSON.stringify({ count, equal: same, sideCounts: [below, above].sort((a, b) => a - b),
    centralBranch: centers.every(side => side === '=') ? 'all-equal' : centers.includes('=') ? 'strict-and-equal' : 'all-one-strict-side' });
}
function repeatedAddition(question: Question, params: Params): void {
  const count = Number(params.count), each = Number(params.each);
  if (!Number.isInteger(count) || count < 2 || count > 9 || !Number.isInteger(each) || each < 1 || each > 9) throw new Error('repeated-addition facts outside the learned table');
  for (const [name, number] of [['count', count], ['each', each]] as const) {
    const anchor = String(params[`${name}Anchor`] || '');
    if (!anchor || !question.text.includes(anchor) || !anchorMatches(anchor, number)) throw new Error(`unbound repeated-addition ${name}`);
  }
  const visibleSum = question.text.match(/\d+(?:\s*\+\s*\d+){1,8}/)?.[0];
  if (visibleSum) {
    const addends = visibleSum.split('+').map(Number);
    if (addends.length !== count || addends.some(number => number !== each)) throw new Error('repeated-addition count or value contradicts visible sum');
  }
  if (!/乘法/.test(question.text)) throw new Error('repeated-addition target is not a multiplication representation');
  let total = 0;
  for (let index = 0; index < count; index++) total += each;
  const valid = (raw: string | number) => {
    const parts = String(raw).replace(/\s/g, '').split(/[;；]/);
    const order = String(params.answerOrder);
    const equation = parts[order === 'total-equation' ? 1 : 0]?.match(/^(\d+)[×x*](\d+)=(\d+)$/);
    if (!equation) return false;
    const [left, right, result] = equation.slice(1).map(Number);
    if (!(left === count && right === each || left === each && right === count) || result !== total) return false;
    if (order === 'equation') return parts.length === 1;
    if (order !== 'equation-total' && order !== 'total-equation') return false;
    return parts.length === 2 && Number(parts[order === 'total-equation' ? 0 : 1]) === total;
  };
  if (!valid(question.answer)) throw new Error('repeated-addition representation or product is incorrect');
  const schema = inferAnswerSchema(question);
  if (schema.kind === 'choice') {
    if (schema.multiple || schema.options.filter(option => valid(option.value)).length !== 1
      || !schema.options.some(option => valid(option.value) && option.value === String(question.answer))
      || schema.options.some(option => valid(option.value) !== valid(option.label.replace(/积是/g, '')))) throw new Error('repeated-addition choices lack one unique correct representation');
  }
}

function weekdayCycle(question: Question, params: Params): void {
  const normalize = (label: string) => label.replace(/^周/, '星期').replace(/星期天/g, '星期日').replace(/[。\s]/g, '');
  const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  const start = String(params.startWeekday), startAnchor = String(params.startAnchor || '');
  let offset = Number(params.dayOffset);
  const offsetAnchor = String(params.offsetAnchor || '');
  if (!startAnchor || !question.text.includes(startAnchor) || !normalize(startAnchor).includes(normalize(start))) throw new Error('weekday start is not bound to prompt');
  if (params.mode === 'same-month-date') {
    const month = Number(params.month), first = Number(params.startDay), target = Number(params.targetDay);
    const maximum = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    if (!Number.isInteger(month) || !maximum || !Number.isInteger(first) || !Number.isInteger(target)
      || first < 1 || target < first || target > maximum) throw new Error('invalid same-month weekday dates');
    if (!question.text.includes(`${month}月${first}日`) || !question.text.includes(`${month}月${target}日`)) throw new Error('weekday dates are not bound to prompt');
    offset = target - first;
  } else if (!Number.isInteger(offset) || offset < 0 || offset > 1000 || !offsetAnchor
    || !question.text.includes(offsetAnchor) || !anchorMatches(offsetAnchor, offset)
    || !/过|后/.test(offsetAnchor)) throw new Error('weekday offset is not explicitly forward and bound to prompt');
  let position = days.indexOf(normalize(start));
  if (position < 0) throw new Error('invalid starting weekday');
  for (let elapsed = 0; elapsed < offset; elapsed++) position = position === days.length - 1 ? 0 : position + 1;
  if (normalize(String(question.answer)) !== days[position]) throw new Error('weekday answer differs from daily enumeration');
}

function periodicSequence(question: Question, params: Params): void {
  const pattern = params.pattern as string[], anchor = String(params.patternAnchor || '');
  const index = Number(params.askIndex);
  if (!Array.isArray(pattern) || pattern.length < 2 || pattern.length > 9 || pattern.some(token => typeof token !== 'string' || !token)
    || params.startIndex !== 1 || !Number.isInteger(index) || index < 1 || index > 1000) throw new Error('invalid periodic sequence domain');
  if (!anchor || !question.text.includes(anchor)) throw new Error('periodic pattern is not bound to prompt');
  const runs = params.runLengths as number[] | undefined, tokens = params.runTokens as string[] | undefined;
  if (runs || tokens) {
    if (!Array.isArray(runs) || !Array.isArray(tokens) || runs.length !== tokens.length
      || runs.some(count => !Number.isInteger(count) || count < 1 || count > 9)) throw new Error('invalid periodic runs');
    const expanded = runs.flatMap((count, position) => Array<string>(count).fill(tokens[position]));
    if (JSON.stringify(expanded) !== JSON.stringify(pattern)
      || runs.some((count, position) => !anchor.includes(`${count}颗${tokens[position]}`))) throw new Error('periodic runs contradict visible quantities');
  } else {
    const compact = anchor.replace(/[、，,\s"'“”「」.。…]/g, '');
    if (!compact.startsWith(pattern.join(''))) throw new Error('periodic token order differs from visible pattern');
  }
  const itemsAnchor = String(params.itemsAnchor || '');
  if (itemsAnchor) {
    if (!question.text.includes(itemsAnchor)) throw new Error('periodic prefix is not bound to prompt');
    const visible = Array.from(itemsAnchor);
    if (index !== visible.length + 1 || visible.some((token, position) => token !== pattern[position % pattern.length])) throw new Error('periodic prefix or next-item target is incorrect');
  } else {
    const indexAnchor = String(params.indexAnchor || '');
    if (!indexAnchor || !question.text.includes(indexAnchor) || !anchorMatches(indexAnchor, index)) throw new Error('periodic target index is not bound to prompt');
  }
  let cursor = 0, answer = '';
  for (let position = 1; position <= index; position++) {
    answer = pattern[cursor]; cursor++;
    if (cursor === pattern.length) cursor = 0;
  }
  const normalized = String(question.answer).replace(/(?:色|生)$/, '').trim();
  if (normalized !== answer) throw new Error('periodic answer differs from item-by-item enumeration');
}

function comparisonSign(question: Question, params: Params): { signature: string; left: number; right: number } {
  const left = params.left as number[], right = params.right as number[];
  if (![left, right].every(terms => Array.isArray(terms) && terms.length >= 1 && terms.length <= 3
    && terms.every(number => Number.isInteger(number) && number >= 0 && number <= 1000))) throw new Error('invalid comparison terms');
  const anchor = String(params.comparisonAnchor || '');
  if (!anchor || !question.text.includes(anchor) || anchor.replace(/\s/g, '') !== `${left.join('+')}○${right.join('+')}`) throw new Error('comparison expression does not match the prompt');
  const sum = (terms: number[]) => terms.reduce((total, number) => total + number, 0);
  const a = sum(left), b = sum(right), expected = a < b ? '<' : a > b ? '>' : '=';
  if (question.answer !== expected) throw new Error('comparison sign is mathematically incorrect');
  const work = (terms: number[]) => {
    let total = terms[0]; const carrying: number[] = [];
    for (const number of terms.slice(1)) { carrying.push(carryCount(total, number)); total += number; }
    return { widths: terms.map(number => String(number).length), carrying };
  };
  const aDigits = String(a), bDigits = String(b);
  const firstDifference = aDigits.length === bDigits.length ? [...aDigits].findIndex((digit, index) => digit !== bDigits[index]) : -2;
  return { signature: JSON.stringify({ left: work(left), right: work(right), resultWidths: [aDigits.length, bDigits.length], firstDifference }), left: a, right: b };
}

function heightOrder(question: Question, params: Params): { signature: string; rank: number[] } {
  const people = params.people as string[], heights = params.heights as number[], anchors = params.anchors as string[];
  if (!Array.isArray(people) || people.length !== 3 || new Set(people).size !== people.length
    || !Array.isArray(heights) || heights.length !== people.length || new Set(heights).size !== heights.length
    || heights.some(number => !Number.isInteger(number) || number <= 0 || number > 300)
    || !Array.isArray(anchors) || anchors.length !== people.length || !/从高到矮/.test(question.text)) throw new Error('invalid height ordering domain');
  const units = anchors.map((anchor, index) => {
    if (!question.text.includes(anchor) || !anchor.includes(people[index]) || !anchorMatches(anchor, heights[index])) throw new Error('height is not bound to its named person');
    const meters = anchor.match(/(\d+)\s*米/), centimeters = anchor.match(/(\d+)\s*厘米/);
    if (Number(meters?.[1] || 0) * 100 + Number(centimeters?.[1] || 0) !== heights[index]) throw new Error('height unit conversion is incorrect');
    return `${meters ? 'm' : ''}${centimeters ? 'cm' : ''}`;
  });
  const rank = people.map((_, index) => index).sort((a, b) => heights[b] - heights[a]);
  if (String(question.answer).replace(/\s/g, '') !== rank.map(index => people[index]).join('>')) throw new Error('height ranking differs from independent sorting');
  return { signature: JSON.stringify({ units, widths: heights.map(height => String(height).length) }), rank };
}
function orderRelations(question: Question, p: Params): string {
  const people = p.people as string[], relations = p.relations as string[], anchors = p.anchors as string[];
  const anonymous = (p.anonymousPeople || []) as string[];
  if (!Array.isArray(people) || people.length !== 3 || new Set(people).size !== people.length
    || !Array.isArray(relations) || relations.length !== 2 || !Array.isArray(anchors) || anchors.length !== relations.length
    || !['height', 'speed'].includes(String(p.quantity)) || p.target !== 'maximum') throw new Error('invalid three-person order domain');
  if (people.some(person => !question.text.includes(person) && !anonymous.includes(person))
    || anonymous.some(person => !people.includes(person)) || anonymous.length > 1) throw new Error('order people not bound to prompt');
  if (anonymous.length && !/三个小朋友/.test(question.text)) throw new Error('anonymous third person lacks explicit three-person domain');
  for (let i = 0; i < relations.length; i++) {
    const [person, relation, other] = relations[i].split(':'), anchor = anchors[i];
    if (!people.includes(person) || !question.text.includes(anchor)) throw new Error('order relation anchor missing');
    const actualClaim = question.text.match(new RegExp(`${person}说[：:]?["“]([^"”]+)["”]`))?.[1];
    const boundSpeaker = anchor.includes(person) || Boolean(actualClaim?.includes(anchor));
    let bound = false;
    if (relation === 'not-ranks') {
      bound = boundSpeaker && (other === '1' && /我不是第一名/.test(anchor) || other === '3' && /我不是最后一名/.test(anchor));
    } else if (people.includes(other) && ['greater', 'less'].includes(relation)) {
      if (p.quantity === 'height') bound = anchor.includes(`${person}比${other}${relation === 'greater' ? '高' : '矮'}`);
      else bound = boundSpeaker && (anchor.includes(`我比${other}跑得${relation === 'greater' ? '快' : '慢'}`)
        || anchor.includes(`${person}比${other}跑得${relation === 'greater' ? '快' : '慢'}`));
    }
    if (!bound) throw new Error(`order predicate ${relations[i]} is not expressed by its anchor`);
  }
  const solutions = permutations(people).filter(order => relations.every(condition => {
    const [person, relation, other] = condition.split(':'), rank = order.indexOf(person) + 1;
    return relation === 'not-ranks' ? !other.split(',').map(Number).includes(rank)
      : relation === 'greater' ? rank < order.indexOf(other) + 1 : rank > order.indexOf(other) + 1;
  }));
  if (solutions.length !== 1) throw new Error(`order problem has ${solutions.length} full rankings`);
  if (String(question.answer) !== solutions[0][0]) throw new Error('order answer differs from independent complete enumeration');
  return JSON.stringify({ quantity: p.quantity, clues: relations.map(condition => condition.split(':')[1] === 'not-ranks' ? 'excluded-endpoint' : 'comparison') });
}
function lengthEstimation(question: Question, p: Params): void {
  const object = String(p.object), anchor = String(p.objectAnchor || ''), magnitudeAnchor = String(p.magnitudeAnchor || '');
  const magnitude = Number(p.magnitude);
  const bounds: Record<string, [number, number]> = { pencil: [100, 250], eraser: [20, 80] };
  if (!bounds[object] || !anchor || !question.text.includes(anchor) || !magnitudeAnchor || !question.text.includes(magnitudeAnchor)
    || !Number.isInteger(magnitude) || magnitude < 10 || magnitude > 99 || !anchorMatches(magnitudeAnchor, magnitude)
    || !/填.*合适.*单位/.test(question.text)) throw new Error('invalid length-estimation evidence');
  if (object === 'pencil' && !/铅笔/.test(anchor) || object === 'eraser' && !/普通文具橡皮/.test(anchor)) throw new Error('object category contradicts visible noun');
  const candidates = [{ unit: '毫米', mm: magnitude }, { unit: '厘米', mm: magnitude * 10 }, { unit: '米', mm: magnitude * 1000 }]
    .filter(candidate => candidate.mm >= bounds[object][0] && candidate.mm <= bounds[object][1]);
  if (candidates.length !== 1 || question.answer !== candidates[0].unit) throw new Error('length-estimation unit is not uniquely plausible for the common object');
}
function triangleClassification(question: Question, p: Params): void {
  const sides = p.sides as number[];
  if (!Array.isArray(sides) || sides.length !== 3 || sides.some(side => !Number.isFinite(side) || side <= 0)
    || !/三角形/.test(question.text) || !/哪种边|按边.*分类|属于.*三角形/.test(question.text)) throw new Error('triangle classification target missing');
  const visibleSides = question.text.match(/(?:三条边分别是|边长分别为)([^。？]+)/)?.[1];
  if (!visibleSides || JSON.stringify([...visibleSides.matchAll(/\d+(?:\.\d+)?/g)].map(match => Number(match[0]))) !== JSON.stringify(sides)) throw new Error('triangle sides differ from visible measurements');
  const sorted = [...sides].sort((a, b) => a - b);
  if (sorted[0] + sorted[1] <= sorted[2]) throw new Error('invalid or degenerate triangle');
  const expected = new Set(sides).size === 1 ? '等边三角形' : new Set(sides).size === 2 ? '等腰三角形' : '不等边三角形';
  if (question.answer !== expected) throw new Error('triangle side classification incorrect');
}
function rightAnglePresenceSignature(question: Question, p: Params): string {
  const angles = p.angles as number[], visible = question.text.match(/三个内角(?:是|分别是)([^。？]+)/)?.[1];
  if (!Array.isArray(angles) || angles.length !== 3 || !angles.every(n => Number.isInteger(n) && n > 0 && n < 180)
    || angles.reduce((sum, n) => sum + n, 0) !== 180 || !visible || p.target !== 'right-angle-presence' || !/有直角吗/.test(question.text)
    || JSON.stringify([...visible.matchAll(/\d+/g)].map(match => Number(match[0]))) !== JSON.stringify(angles)) throw new Error('right-angle presence constraints are not a valid visible triangle');
  if (question.answer !== (angles.includes(90) ? '有' : '没有')) throw new Error('right-angle presence answer contradicts actual angles');
  return JSON.stringify(angles.map(n => String(n).length));
}
function relativeAngle(question: Question, p: Params): void {
  const relation = String(p.relation), anchor = String(p.relationAnchor || '');
  const forms: Record<string, [RegExp, string]> = { 'less-than-right': [/比直角小/, '锐角'], 'greater-than-right': [/比直角大/, '钝角'] };
  if (!forms[relation] || p.threshold !== 90 || p.target !== 'angle-type' || !anchor || !question.text.includes(anchor) || !forms[relation][0].test(anchor)
    || !/锐角、直角还是钝角/.test(question.text)) throw new Error('relative-angle predicate or classification target missing');
  if (question.answer !== forms[relation][1]) throw new Error('relative-angle classification contradicts comparison predicate');
}
function geometryProperty(question: Question, p: Params): string {
  const shapes = p.shapes as string[], anchors = p.anchors as string[];
  const properties: Record<string, { noun: string; sides: number }> = { triangle: { noun: '三角形', sides: 3 }, rectangle: { noun: '长方形', sides: 4 }, square: { noun: '正方形', sides: 4 }, circle: { noun: '圆', sides: 0 } };
  if (!Array.isArray(shapes) || shapes.length < 1 || shapes.length > 2 || !Array.isArray(anchors) || anchors.length !== shapes.length || !['side-counts', 'joined-boundary', 'region-side-sum'].includes(String(p.target))
    || !(p.target === 'region-side-sum' ? /边数/.test(question.text) : /条边/.test(question.text))) throw new Error('basic geometry side-identification target missing');
  const expected = shapes.map((shape, index) => {
    const property = properties[shape], anchor = anchors[index];
    const identicalPair = ['joined-boundary', 'region-side-sum'].includes(String(p.target)) && shapes.length === 2 && shapes[0] === shapes[1] && /两(?:个|张)/.test(anchor);
    if (!property || !anchor || !question.text.includes(anchor) || !anchor.includes(property.noun) || !(/一(?:个|张)/.test(anchor) || identicalPair)) throw new Error('basic geometry shape is not bound to one visible object');
    return property.sides;
  });
  if (p.target === 'region-side-sum') {
    const diagonal = p.cut === 'diagonal' && shapes.every(shape => shape === 'triangle') && /一条对角线分成两个三角形/.test(question.text);
    const midpoint = p.cut === 'opposite-midpoints' && shapes.every(shape => shape === 'rectangle') && /对边.*中点.*连线/.test(question.text) && /分成两个长方形/.test(question.text);
    if (shapes.length !== 2 || p.output !== 'single-number' || !/正方形/.test(question.text) || !/分别.*边数/.test(question.text)
      || !/边数相加/.test(question.text) || !/公共.*各算一次/.test(question.text) || !(diagonal || midpoint)) throw new Error('region side sum lacks an explicit valid two-region square cut and double-counted common side');
    if (!equal(parse(String(question.answer)), parse(expected[0] + expected[1]))) throw new Error('two-region side counts do not sum to the stored answer');
  } else if (p.target === 'joined-boundary') {
    if (shapes.length !== 2 || p.sharedEdges !== 1 || p.output !== 'single-number' || shapes.includes('circle')
      || !/沿.*一整条边/.test(question.text) || !/共用的?边藏在里面/.test(question.text)
      || !/一样大|一样长|同长|同样长|边长相等/.test(question.text) || !/(?:一条|每条)边看作1段/.test(question.text)) throw new Error('two-polygon boundary lacks one whole hidden shared edge of the same length and one-edge segments');
    if (!equal(parse(String(question.answer)), parse(expected[0] + expected[1] - 2))) throw new Error('joined polygon outside segment count incorrect');
  } else if (p.output === 'single-number' && shapes.length === 1) {
    if (!equal(parse(String(question.answer)), parse(expected[0]))) throw new Error('basic geometry side count incorrect');
  } else if (p.output === 'joined-and' && shapes.length === 2) {
    if (String(question.answer).replace(/\s/g, '') !== expected.join('和')) throw new Error('independent geometry side counts incorrect');
  } else throw new Error('geometry side-identification output contract missing');
  return JSON.stringify({ count: shapes.length, target: p.target, output: p.output });
}
function angleProperty(question: Question, p: Params): void {
  const angle = String(p.angle), anchor = String(p.anchor || '');
  const kinds: Record<string, { noun: string; degrees: number }> = { right: { noun: '直角', degrees: 90 }, straight: { noun: '平角', degrees: 180 } };
  const property = kinds[angle];
  if (!property || p.target !== 'degree-measure' || !anchor || !question.text.includes(anchor) || !anchor.includes(`${property.noun}一样大`) || !/多少度/.test(question.text)) throw new Error('learned angle property target is not bound to the visible comparison');
  if (!equal(parse(String(question.answer)), parse(property.degrees))) throw new Error('learned angle property degree measure incorrect');
}
function divisorListSignature(question: Question, model: string, p: Params): string {
  const parseList = (text: string) => {
    if (!/^\d+(?:\s*[,，、]\s*\d+)*$/.test(text.trim())) throw new Error('divisor-list answer must be a complete ordered integer list');
    return text.trim().split(/[,，、]/).map(Number);
  };
  let expected: number[], signature: unknown;
  if (model === 'progression-filter-divisor-list-v1') {
    const candidates = p.candidates as number[], divisor = num(p, 'divisor');
    const visible = question.text.match(/倍数[：:]([\d、,，\s]+)[？?]/)?.[1];
    if (!Array.isArray(candidates) || candidates.length !== 4 || new Set(candidates).size !== 4 || !candidates.every(n => Number.isInteger(n) && n >= 10 && n <= 99)
      || !Number.isInteger(divisor) || divisor < 2 || divisor > 9 || p.target !== 'ordered-multiples'
      || !question.text.includes(`哪些是${divisor}的倍数`) || !visible || JSON.stringify(parseList(visible)) !== JSON.stringify(candidates)) throw new Error('multiple-list domain differs from complete visible candidate list');
    expected = candidates.filter(n => n % divisor === 0);
    signature = { count: candidates.length, matchedPositions: candidates.map(n => n % divisor === 0), quotientDigits: candidates.map(n => String(Math.floor(n / divisor)).length) };
  } else {
    const n = num(p, 'number');
    if (!Number.isInteger(n) || n < 2 || n > 200 || !(model === 'progression-positive-divisors-v1' ? question.text.includes(`列出${n}的所有正因数`) && p.target === 'ordered-all'
      : question.text.includes(`${n}的因数中`) && /哪些是质数/.test(question.text) && p.target === 'ordered-prime')) throw new Error('divisor-list target does not match the prompt');
    const all: number[] = [];
    for (let divisor = 1; divisor <= n; divisor++) if (n % divisor === 0) all.push(divisor);
    const primes = all.filter(divisor => { if (divisor < 2) return false; for (let d = 2; d * d <= divisor; d++) if (divisor % d === 0) return false; return true; });
    expected = model === 'progression-positive-divisors-v1' ? all : primes;
    signature = { numberDigits: String(n).length, factorCount: all.length, primeCount: model === 'progression-prime-divisors-v1' ? primes.length : undefined, square: Number.isInteger(Math.sqrt(n)) };
  }
  if (JSON.stringify(parseList(String(question.answer))) !== JSON.stringify(expected)) throw new Error('ordered divisor-list answer differs from independent complete enumeration');
  return JSON.stringify(signature);
}

function schemaShape(question: Question): string {
  const schema = inferAnswerSchema(question);
  const withoutNumericBounds = <T extends object>(value: T) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'min' && key !== 'max'));
  return JSON.stringify(schema.kind === 'text' ? { kind: 'text' }
    : schema.kind === 'choice' ? { kind: 'choice', multiple: schema.multiple, options: schema.options.map(option => ({ id: option.id })) }
    : schema.kind === 'multi_field' ? { kind: 'multi_field', fields: schema.fields.map(field => ({ ...withoutNumericBounds(field), label: field.label.replace(/\d+(?:\.\d+)?/g, '#') })) } : withoutNumericBounds(schema));
}
function assertSchemaUsable(question: Question): void {
  const schema = inferAnswerSchema(question);
  if (schema.kind === 'ordering' && !question.correctRanking?.first) throw new Error('ordering answer checker has no correct ranking');
  if (schema.kind === 'choice' && (!schema.options.length || new Set(schema.options.map(option => option.id)).size !== schema.options.length)) throw new Error('choice answer UI has no unique options');
  if (schema.kind === 'multi_field') {
    if (!schema.fields.length || !question.subAnswers?.length || schema.fields.length !== question.subAnswers.length) throw new Error('multi-field answer UI has no complete answer fields');
    for (const field of schema.fields) {
      const subAnswer = question.subAnswers.find(answer => answer.id === field.id);
      if (!subAnswer || subAnswer.label !== field.label) throw new Error('answer field label differs from the actual subquestion label');
    }
  }
}
function sequenceSignature(question: Question): string | undefined {
  if (!/规律|数列/.test(question.text)) return undefined;
  const candidates = [...question.text.matchAll(/\d+(?:\s*[、,，]\s*(?:\d+|__)){3,}/g)]
    .map(match => match[0]).filter(sequence => sequence.includes('__')).sort((a, b) => b.length - a.length);
  if (!candidates.length) return undefined;
  const terms = candidates[0].split(/[、,，]/).map(term => term.trim() === '__' ? null : Number(term.trim()));
  if (terms.filter(term => term === null).length !== 1) throw new Error('series must contain exactly one unknown slot');
  const missing = terms.indexOf(null), answer = Number(question.answer);
  if (!Number.isFinite(answer)) throw new Error('numeric series has a nonnumeric answer');
  const filled = terms.map(term => term === null ? answer : term);
  const difference = filled[1] - filled[0];
  const arithmetic = filled.slice(1).every((term, index) => term - filled[index] === difference);
  const fibonacci = filled.slice(2).every((term, index) => term === filled[index] + filled[index + 1]);
  if (!arithmetic && !fibonacci) throw new Error(`full visible series contradicts its answer: ${candidates[0]} -> ${answer}`);
  const computationCarries = arithmetic ? filled.slice(1).reduce((total, _, index) => total + carryCount(
    Math.abs(filled[index]), Math.abs(difference), difference < 0), 0)
    : filled.slice(2).reduce((total, _, index) => total + carryCount(filled[index], filled[index + 1]), 0);
  return JSON.stringify({ kind: arithmetic ? 'arithmetic' : 'fibonacci', count: terms.length, missing,
    direction: arithmetic ? Math.sign(difference) : 'sum-previous-two',
    maxKnownDigits: Math.max(...terms.filter((term): term is number => term !== null).map(term => String(Math.abs(term)).length)),
    answerDigits: String(Math.abs(answer)).length, computationCarries });
}
function displayMathValue(raw: string): Q | undefined {
  const input = raw.replace(/\s/g, '').replace(/（/g, '(').replace(/）/g, ')').replace(/−/g, '-');
  const tokens = input.match(/\d+(?:\.\d+)?\/\d+(?:\.\d+)?|\d+(?:\.\d+)?%?|[()+\-*×÷/]/g);
  if (!tokens || tokens.join('') !== input) return undefined;
  let index = 0;
  const atom = (): Q => {
    const token = tokens[index++];
    if (token === '+') return atom();
    if (token === '-') { const r = atom(); return { n: -r.n, d: r.d }; }
    if (token === '(') { const result = sum(); if (tokens[index++] !== ')') throw new Error('unclosed display bracket'); return result; }
    if (!token) throw new Error('missing display operand');
    return token.endsWith('%') ? div(parse(token.slice(0, -1)), parse(100)) : parse(token);
  };
  const product = (): Q => {
    let result = atom();
    while (['*', '×', '/', '÷'].includes(tokens[index])) { const operation = tokens[index++], right = atom(); result = operation === '*' || operation === '×' ? mul(result, right) : div(result, right); }
    return result;
  };
  const sum = (): Q => {
    let result = product();
    while (['+', '-'].includes(tokens[index])) { const operation = tokens[index++], right = product(); result = operation === '+' ? add(result, right) : sub(result, right); }
    return result;
  };
  try { const result = sum(); return index === tokens.length ? result : undefined; } catch { return undefined; }
}
function assertDisplayedEqualities(question: Question): void {
  const visible = [question.equation, question.explanation, ...question.solutionSteps, ...question.hints];
  for (const text of visible) for (const match of text.matchAll(/[\d(（][\d.%+×÷*/−\-()（）\s=＝]+/g)) {
    if (!/[=＝]/.test(match[0])) continue;
    const start = match.index || 0, previous = text[start - 1], following = text.slice(start + match[0].length);
    // A substring after an unknown variable, a verbal operation, a clock colon,
    // or an unsupported operator is not a complete numeric equality.
    if (previous && !/[：:；;,，。=→\s(（]/.test(previous)) continue;
    if ((previous === ':' || previous === '：') && /\d/.test(text[start - 2] || '')) continue;
    if (/^(?:余|(?:周|组|份|袋|块|个)余|…|又|个十|个百|个千|个一)/.test(following)) continue;
    const sides = match[0].trim().replace(/[(（]\s*$/, '').split(/[=＝]/).map(displayMathValue);
    if (sides.some(side => !side)) continue;
    if (sides.some(side => !equal(side!, sides[0]!))) throw new Error(`learner-facing equality is false: ${match[0].trim()}`);
  }
}
function visibleMedianSignature(question: Question): string | undefined {
  if (!/中位数/.test(question.text) || !/(?:命中数是|身高.*是|客流量.*为)/.test(question.text)) return undefined;
  const list = [...question.text.matchAll(/\d+(?:\s*[、,，]\s*\d+){4,}/g)].sort((a, b) => b[0].length - a[0].length)[0]?.[0];
  if (!list) throw new Error('median requires the complete visible observation list');
  const data = list.split(/[、,，]/).map(Number), sorted = [...data].sort((a, b) => a - b), middle = Math.floor(data.length / 2);
  const expected = data.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  if (!equal(parse(expected), parse(String(question.answer)))) throw new Error('median answer differs from independently sorted complete list');
  return JSON.stringify({ count: data.length, alreadySorted: data.every((n, i) => i === 0 || data[i - 1] <= n), digitWidths: data.map(n => String(n).length).sort() });
}
function assertCubeCutFeasible(question: Question): string | undefined {
  if (!/长方体/.test(question.text) || !/切成棱长.*小正方体/.test(question.text)) return;
  const length = question.text.match(/长(?:为)?\s*(\d+(?:\.\d+)?)/)?.[1];
  const width = question.text.match(/宽(?:为)?\s*(\d+(?:\.\d+)?)/)?.[1];
  const height = question.text.match(/高(?:为)?\s*(\d+(?:\.\d+)?)/)?.[1];
  const edge = question.text.match(/切成棱长(?:为)?\s*(\d+(?:\.\d+)?)/)?.[1];
  if (![length, width, height, edge].every(Boolean)) throw new Error('cube cutting dimensions are not fully visible');
  const side = Number(edge);
  if (side <= 0 || ![length, width, height].every(n => Number.isInteger(Number(n) / side))) throw new Error('box cannot be completely cut into stated cubes: every dimension must divide by the cube edge');
  return JSON.stringify([length, width, height].map((n, index, list) => list.findIndex(value => value === n)));
}
function assertContextFeasible(question: Question, sourceId: string): void {
  if (/一周天气统计/.test(question.text)) {
    const records = [...question.text.matchAll(/(?:晴天|阴天|雨天)(\d+)天/g)].map(match => Number(match[1]));
    if (records.length !== 3 || records.reduce((sum, n) => sum + n, 0) !== 7) throw new Error('mutually exclusive weekly weather counts must total seven days');
  }
  if (sourceId === 'g4o_27' && (Number(question.answer) < 0 || Number(question.answer) > 100)) throw new Error('required mathematics test score exceeds the source hundred-point scale');
  if (sourceId === 'g5o_21') {
    const ratio = question.text.match(/比(?:是)?\s*(\d+(?::\d+){2})/)?.[1].split(':').map(Number);
    if (!ratio || ratio.some(n => n <= 0)) throw new Error('triangle angle ratio is not visible');
    const maximum = Math.max(...ratio) * 180 / ratio.reduce((sum, n) => sum + n, 0);
    const kind = maximum < 90 ? '锐角' : maximum === 90 ? '直角' : '钝角';
    if (!String(question.answer).endsWith(kind) || question.subAnswers?.find(field => field.id === 'type')?.answer !== kind) throw new Error('triangle angle type contradicts independently computed largest angle');
  }
  if (['prog_g4_u2_03', 'prog_g4_u2_06'].includes(sourceId)) {
    const factor = question.text.match(/125×(\d+)/)?.[1];
    if (!factor || Number(factor) % 8 !== 0 || !/125×8[=＝]1000/.test([question.equation, question.explanation, ...question.solutionSteps].join(''))) throw new Error('simplified 125 multiplication must preserve the 125-times-eight grouping strategy');
  }
}
function exchangeUnitSignature(question: Question): string | undefined {
  const match = question.text.match(/(\d+)个苹果[=＝](\d+)个橘子/);
  if (!match) return undefined;
  return Number(match[1]) === Number(match[2]) ? 'identity-exchange' : 'nonidentity-exchange';
}
export interface OracleIssue { sourceId: string; message: string }
export function auditTransferEntry(source: Question, entry: TransferEntry): string[] {
  const issues: string[] = [];
  const check = (fn: () => void) => { try { fn(); } catch (error) { issues.push(error instanceof Error ? error.message : String(error)); } };
  const variant = entry.variant;
  const earlyAdditionWithinTen = source.gradeBand === 'G1' && source.operation === 'addition' && typeof source.answer === 'number'
    && source.answer <= 10 && (source.difficulty === 1 || (source.curriculumSkillIds || source.skillIds || []).some(skill => /addition_within_10/.test(skill)));
  check(() => {
    if (source.gradeBand !== variant.gradeBand || source.operation !== variant.operation || source.domain !== variant.domain) throw new Error('grade/domain/operation drift');
    for (const field of ['difficulty', 'difficultyProfile', 'assessmentTier', 'curriculumSemester', 'isTwoStep'] as const) if (JSON.stringify(source[field]) !== JSON.stringify(variant[field])) throw new Error(`${field} drift`);
    if (schemaShape(source) !== schemaShape(variant)) throw new Error('answer schema contract drift');
    if ([source, variant].some(question => ['fail', 'unsafe', 'needs_review'].includes(question.qualityStatus || ''))) throw new Error('unreviewed or unsafe content');
    if (HISTORICALLY_UNSAFE_SOURCES.has(source.id)) throw new Error('historically unsafe source must remain isolated from new transfers');
    if (source.text === variant.text) throw new Error('unchanged prompt');
    if (String(source.answer) === String(variant.answer) && entry.verificationMode === 'numeric-distinct') throw new Error('unchanged answer');
    if (entry.verificationMode === 'numeric-distinct' && JSON.stringify([...source.numbers].sort((a, b) => a - b)) === JSON.stringify([...variant.numbers].sort((a, b) => a - b))) throw new Error('unchanged numeric inputs');
    if (!entry.relation.family || !entry.relation.targetRole || !entry.relation.roles.length || !entry.relation.invariants.length) throw new Error('incomplete relation contract');
    if (earlyAdditionWithinTen && (typeof variant.answer !== 'number' || variant.answer < 0 || variant.answer > 10)) throw new Error('early G1 number-composition task exceeded the learned range within ten');
    const originalNoise = source.noisePhrases.filter(phrase => source.text.includes(phrase));
    const variantNoise = variant.noisePhrases.filter(phrase => variant.text.includes(phrase));
    if (originalNoise.length !== variantNoise.length) throw new Error('visible irrelevant-text reading burden changed');
    const schema = inferAnswerSchema(variant);
    if (schema.kind === 'integer' || schema.kind === 'decimal') {
      const number = value(answerNumber(variant.answer));
      if (schema.min !== undefined && number < schema.min || schema.max !== undefined && number > schema.max) throw new Error('answer outside schema range');
      if (schema.kind === 'integer' && !Number.isInteger(number)) throw new Error('noninteger answer in integer schema');
      if (schema.kind === 'decimal' && schema.decimalPlaces !== undefined && (String(number).split('.')[1]?.length || 0) > schema.decimalPlaces) throw new Error('answer exceeds schema precision');
    }
  });
  check(() => { if (assertCubeCutFeasible(source) !== assertCubeCutFeasible(variant)) throw new Error('cube-cut box dimension equality structure changed'); });
  check(() => { assertSchemaUsable(source); assertSchemaUsable(variant); });
  check(() => { assertContextFeasible(source, source.id); assertContextFeasible(variant, source.id); });
  check(() => { if (exchangeUnitSignature(source) !== exchangeUnitSignature(variant)) throw new Error('nontrivial unit exchange became an identity conversion'); });
  check(() => { if (visibleMedianSignature(source) !== visibleMedianSignature(variant)) throw new Error('median list sorting/observation burden changed'); });
  check(() => {
    const original = sequenceSignature(source), changed = sequenceSignature(variant);
    if (original !== changed) throw new Error(`series rule/slot/information burden differs: ${original} -> ${changed}`);
  });
  check(() => assertDisplayedEqualities(variant));
  if (entry.witness.kind === 'arithmetic') {
    const witness = entry.witness;
    check(() => assertAnchors(source, witness.source));
    check(() => assertAnchors(variant, witness.variant));
    check(() => { if (proofTopology(witness.source) !== proofTopology(witness.variant)) throw new Error('arithmetic relation graph differs'); });
    check(() => assertAnswers(source, resultMap(witness.source), witness.source));
    check(() => assertAnswers(variant, resultMap(witness.variant), witness.variant));
    check(() => {
      if (entry.verificationMode !== 'numeric-distinct') throw new Error('arithmetic entries require distinct numeric outcomes');
      const a = resultMap(witness.source), b = resultMap(witness.variant);
      if (Object.keys(a).sort().join('|') === Object.keys(b).sort().join('|') && Object.entries(a).every(([id, number]) => equal(number, b[id]))) throw new Error('mathematically unchanged result despite formatting changes');
    });
    check(() => {
      const original = arithmeticBurden(witness.source, earlyAdditionWithinTen), changed = arithmeticBurden(witness.variant, earlyAdditionWithinTen);
      if (JSON.stringify(original) !== JSON.stringify(changed)) throw new Error(`arithmetic burden differs: ${JSON.stringify(original)} -> ${JSON.stringify(changed)}`);
    });
  } else {
    const witness = entry.witness;
    if (witness.model === 'geometry-angle-property-v1') {
      check(() => { angleProperty(source, witness.source); angleProperty(variant, witness.variant); if (witness.source.angle === witness.variant.angle || source.answer === variant.answer) throw new Error('angle property transfer must change the familiar angle and its measure'); });
    } else if (witness.model === 'median-threshold-counts-v1') {
      check(() => {
        if (medianThreshold(source, witness.source) !== medianThreshold(variant, witness.variant)) throw new Error('median threshold frequency/central-position reasoning burden changed');
        if (witness.source.below === witness.variant.below && witness.source.above === witness.variant.above) throw new Error('median threshold transfer merely relabels its threshold without changing the category relation');
        const category = (answer: number | string) => String(answer).replace(/\d+(?:\.\d+)?/g, '');
        if (category(source.answer) === category(variant.answer)) throw new Error('median threshold relation did not actually transfer');
      });
    } else if (witness.model === 'legacy-four-digit-reverse-product-v1') {
      check(() => { if (reverseProduct(source, witness.source) !== reverseProduct(variant, witness.variant)) throw new Error('reverse-product digit multiplication carry burden changed'); });
    } else if (witness.model === 'legacy-calendar-weekday-and-count-v1') {
      check(() => { if (calendarWeekdayAndCount(source, witness.source) !== calendarWeekdayAndCount(variant, witness.variant)) throw new Error('calendar month length/weekday-offset counting burden changed'); });
    } else if (witness.model === 'legacy-boolean-truth-v1') {
      check(() => {
        if (booleanTruth(source, witness.source) !== booleanTruth(variant, witness.variant)) throw new Error('boolean truth logical-clause burden changed');
        if (JSON.stringify(witness.source.people) !== JSON.stringify(witness.variant.people) || JSON.stringify(witness.source.statements) === JSON.stringify(witness.variant.statements) || source.answer === variant.answer) throw new Error('boolean truth transfer requires changed claims with the same people and a new true speaker');
      });
    } else if (witness.model === 'geometry-property-v1') {
      check(() => {
        if (geometryProperty(source, witness.source) !== geometryProperty(variant, witness.variant)) throw new Error('basic geometry identification count or response burden changed');
        if (JSON.stringify(witness.source.shapes) === JSON.stringify(witness.variant.shapes) || String(source.answer) === String(variant.answer)) throw new Error('geometry property transfer lacks a changed learned shape and answer');
      });
    } else if (witness.model === 'progression-angle-relative-to-right-v1') {
      check(() => { relativeAngle(source, witness.source); relativeAngle(variant, witness.variant); if (witness.source.relation === witness.variant.relation || source.answer === variant.answer) throw new Error('relative-angle transfer must reverse the actual comparison predicate'); });
    } else if (witness.model === 'progression-g4-triangle-right-angle-v1') {
      check(() => { if (rightAnglePresenceSignature(source, witness.source) !== rightAnglePresenceSignature(variant, witness.variant)) throw new Error('right-angle presence numeric reading burden changed'); });
    } else if (witness.model === 'progression-g4-triangle-side-classification-v1') {
      check(() => triangleClassification(source, witness.source));
      check(() => triangleClassification(variant, witness.variant));
      check(() => {
        const a = witness.source.sides as number[], b = witness.variant.sides as number[];
        if (a.some((number, index) => String(number).length !== String(b[index]).length) || source.answer === variant.answer) throw new Error('triangle classification burden or output did not transfer');
      });
    } else if (witness.model === 'legacy-length-estimation-v1') {
      check(() => lengthEstimation(source, witness.source));
      check(() => lengthEstimation(variant, witness.variant));
      check(() => { if (witness.source.object === witness.variant.object || witness.source.magnitude === witness.variant.magnitude || source.answer === variant.answer) throw new Error('length-estimation task lacks real changed facts and target unit'); });
    } else if (witness.model === 'legacy-order-relations-v1') {
      check(() => {
        if (orderRelations(source, witness.source) !== orderRelations(variant, witness.variant)) throw new Error('order relation burden changed');
        const a = witness.source.relations as string[], b = witness.variant.relations as string[];
        const predicates = (relations: string[]) => relations.map(condition => { const [, kind, operand] = condition.split(':'); return kind === 'not-ranks' ? `${kind}:${operand}` : kind; });
        if (JSON.stringify(predicates(a)) === JSON.stringify(predicates(b))) throw new Error('order variant only renamed people');
        if (source.answer === variant.answer) throw new Error('order target answer unchanged');
      });
    } else if (witness.model === 'legacy-number-comparison-v1') {
      check(() => {
        const a = comparisonSign(source, witness.source), b = comparisonSign(variant, witness.variant);
        if (a.signature !== b.signature || source.answer === variant.answer) throw new Error('comparison digit/carry burden changed or sign did not change');
      });
    } else if (witness.model === 'legacy-height-order-v1') {
      check(() => {
        const a = heightOrder(source, witness.source), b = heightOrder(variant, witness.variant);
        if (a.signature !== b.signature || JSON.stringify(a.rank) !== JSON.stringify(b.rank)
          || JSON.stringify([...(witness.source.people as string[])].sort()) !== JSON.stringify([...(witness.variant.people as string[])].sort())
          || JSON.stringify(witness.source.heights) === JSON.stringify(witness.variant.heights)
          || source.answer === variant.answer) throw new Error('height unit/order burden changed or named result did not change');
      });
    } else if (['progression-filter-divisor-list-v1', 'progression-positive-divisors-v1', 'progression-prime-divisors-v1'].includes(witness.model)) {
      check(() => { if (divisorListSignature(source, witness.model, witness.source) !== divisorListSignature(variant, witness.model, witness.variant)) throw new Error('divisor-list factor classification/enumeration burden changed'); });
    } else if (witness.model === 'legacy-periodic-sequence-v1') {
      check(() => periodicSequence(source, witness.source));
      check(() => periodicSequence(variant, witness.variant));
      check(() => {
        const a = witness.source.pattern as string[], b = witness.variant.pattern as string[];
        const equalityPattern = (tokens: string[]) => tokens.map(token => tokens.indexOf(token));
        if (a.length !== b.length || JSON.stringify(equalityPattern(a)) !== JSON.stringify(equalityPattern(b))
          || JSON.stringify(witness.source.runLengths) !== JSON.stringify(witness.variant.runLengths)
          || String(witness.source.askIndex).length !== String(witness.variant.askIndex).length
          || Boolean(witness.source.itemsAnchor) !== Boolean(witness.variant.itemsAnchor)
          || a.length > 2 && (Number(witness.source.askIndex) % a.length === 0) !== (Number(witness.variant.askIndex) % b.length === 0)) throw new Error('periodic structure or index burden changed');
        if (source.answer === variant.answer) throw new Error('periodic answer did not change');
        if (Number(witness.source.askIndex) === Number(witness.variant.askIndex)) throw new Error('periodic task only changed token names or colors');
      });
    } else if (witness.model === 'legacy-weekday-cycle-v1') {
      check(() => weekdayCycle(source, witness.source));
      check(() => weekdayCycle(variant, witness.variant));
      check(() => {
        const sourceParams = witness.source, variantParams = witness.variant;
        if (sourceParams.mode !== variantParams.mode) throw new Error('weekday question format changed');
        const a = sourceParams.mode === 'same-month-date' ? Number(sourceParams.targetDay) - Number(sourceParams.startDay) : Number(sourceParams.dayOffset);
        const b = variantParams.mode === 'same-month-date' ? Number(variantParams.targetDay) - Number(variantParams.startDay) : Number(variantParams.dayOffset);
        if (String(a).length !== String(b).length || (a % 7 === 0) !== (b % 7 === 0)) throw new Error('weekday cycle difficulty changed');
        if (sourceParams.mode === 'same-month-date' && (sourceParams.month !== variantParams.month
          || String(sourceParams.startDay).length !== String(variantParams.startDay).length
          || String(sourceParams.targetDay).length !== String(variantParams.targetDay).length
          || carryCount(Number(sourceParams.targetDay), Number(sourceParams.startDay), true)
            !== carryCount(Number(variantParams.targetDay), Number(variantParams.startDay), true))) throw new Error('weekday date subtraction burden changed');
      });
    } else if (witness.model === 'legacy-repeated-addition-v1') {
      check(() => repeatedAddition(source, witness.source));
      check(() => repeatedAddition(variant, witness.variant));
      check(() => {
        const a = witness.source, b = witness.variant;
        if (a.answerOrder !== b.answerOrder || (a.count === a.each) !== (b.count === b.each)) throw new Error('repeated-addition structural burden differs');
        if (Number(a.count) * Number(a.each) === Number(b.count) * Number(b.each)) throw new Error('repeated-addition product did not change');
      });
    } else if (witness.model === 'legacy-truth-ranking-v1') {
      check(() => { if (String(source.answer) !== truthRanking(source, witness.source)) throw new Error('source ranking answer incorrect'); });
      check(() => { if (String(variant.answer) !== truthRanking(variant, witness.variant)) throw new Error('variant ranking answer incorrect'); });
      check(() => { if (JSON.stringify(witness.source) === JSON.stringify(witness.variant)) throw new Error('unchanged ranking constraints'); });
      check(() => {
        const shape = (p: Params) => JSON.stringify({ people: (p.people as string[]).length, knownRanks: ((p.knownRanks || []) as string[]).length,
          liarCount: p.liarCount, liarPositions: [...((p.liarPositions || []) as number[])].sort((a, b) => a - b),
          statements: (p.statements as string[]).map(statement => { const parts = statement.split(':');
            return parts[1] === 'before' || parts[1] === 'after' ? 'comparison' : parts[1] === 'not-ranks' ? `not-ranks:${parts[2].split(',').length}` : parts.length === 4 ? 'other-rank' : 'self-rank'; }).sort() });
        if (shape(witness.source) !== shape(witness.variant)) throw new Error('truth-ranking statement/known-rank/liar-policy burden changed');
      });
    } else {
      check(() => assertAnswers(source, enumerate(source, witness.model, witness.source)));
      check(() => assertAnswers(variant, enumerate(variant, witness.model, witness.variant)));
      if (witness.model === 'progression-g1-triangle-square-card-count-v1') check(() => {
        if (witness.source.cards !== witness.variant.cards || String(witness.source.totalEdges).length !== String(witness.variant.totalEdges).length) throw new Error('card enumeration domain burden changed');
      });
      if (['progression-g2-max-product-plus-unused-v1', 'progression-g2-max-product-minus-unused-v1'].includes(witness.model)) check(() => {
        const minus = witness.model === 'progression-g2-max-product-minus-unused-v1';
        const shape = (p: Params) => {
          const digits = p.digits as number[];
          return JSON.stringify({ hasIdentityFactor: digits.includes(1), rows: digits.map((unused, index) => {
            const factors = digits.filter((_, i) => i !== index), product = factors[0] * factors[1];
            return `${String(product).length}:${carryCount(product, unused, minus)}`;
          }).sort() });
        };
        if (shape(witness.source) !== shape(witness.variant)) throw new Error('product optimization candidate digit/carry/identity burden changed');
      });
      if (witness.model === 'progression-five-observation-mode-v1') check(() => {
        const shape = (p: Params) => { const observations = p.observations as number[]; return JSON.stringify({ digits: observations.map(n => String(n).length).sort(), frequencies: [...new Set(observations)].map(n => observations.filter(x => n === x).length).sort() }); };
        if (shape(witness.source) !== shape(witness.variant)) throw new Error('mode observation frequency/number-range burden changed');
      });
      if (witness.model === 'progression-g6-middle-pair-constraints-v1') check(() => {
        for (const field of ['lower', 'upper', 'mean', 'median', 'difference']) if (String(witness.source[field]).length !== String(witness.variant[field]).length) throw new Error('middle-pair number-range burden changed');
        if (Number(witness.source.difference) % 2 !== Number(witness.variant.difference) % 2) throw new Error('middle-pair integer/fraction burden changed');
      });
      if (['progression-g4-min-digit-permutation-threshold-v1', 'progression-g4-four-digit-place-constraints-v1'].includes(witness.model)) check(() => {
        const a = witness.source, b = witness.variant;
        if ((a.digits as number[]).includes(0) !== (b.digits as number[]).includes(0) || a.target !== b.target) throw new Error('four-digit enumeration leading-zero/target burden changed');
      });
      if (witness.model === 'periodic-coincidence-v1') check(() => {
        const shape = (p: Params) => {
          const periods = p.periods as number[], common = (() => { for (let n = 1; n <= periods[0] * periods[1]; n++) if (periods.every(period => n % period === 0)) return n; return 0; })();
          return JSON.stringify({ target: p.target, digits: periods.map(n => String(n).length), oneDividesOther: periods[0] % periods[1] === 0 || periods[1] % periods[0] === 0,
            coprime: gcd(BigInt(periods[0]), BigInt(periods[1])) === ONE, commonDigits: String(common).length, startInclusive: p.startInclusive, endInclusive: p.endInclusive });
        };
        if (shape(witness.source) !== shape(witness.variant)) throw new Error('period coincidence common-multiple/endpoint burden changed');
      });
      if (witness.model === 'progression-coin-combination-count-v1') check(() => {
        const a = witness.source, b = witness.variant;
        if (JSON.stringify(a.denominations) !== JSON.stringify(b.denominations) || JSON.stringify(a.minimumCounts) !== JSON.stringify(b.minimumCounts)
          || String(a.total).length !== String(b.total).length || Number(a.total) % 2 !== Number(b.total) % 2) throw new Error('coin enumeration minimum/domain parity burden changed');
      });
      if (witness.model === 'progression-g5-three-digit-even-sum-v1') check(() => {
        const a = witness.source, b = witness.variant;
        const shape = (p: Params) => { const digits = p.digits as number[]; return JSON.stringify({ count: digits.length, zero: digits.includes(0), even: digits.filter(n => n % 2 === 0).length, sumDigits: String(p.digitSum).length }); };
        if (shape(a) !== shape(b)) throw new Error('three-digit even enumeration domain burden changed');
      });
      if (witness.model === 'bounded-congruence-v1') check(() => {
        const a = witness.source, b = witness.variant;
        const shape = (p: Params) => JSON.stringify({ target: p.target, lowerInclusive: p.lowerInclusive, upperInclusive: p.upperInclusive,
          boundDigits: [String(p.lower).length, String(p.upper).length], divisors: (p.divisors as number[]).map(String).map(s => s.length),
          remainders: (p.remainders as number[]).map(String).map(s => s.length) });
        if (shape(a) !== shape(b)) throw new Error('congruence constraint/number-range burden changed');
      });
      if (witness.model === 'least-natural-congruence-v1') check(() => {
        const shape = (p: Params) => { const divisors = p.divisors as number[], remainders = p.remainders as number[];
          return JSON.stringify({ divisorDigits: divisors.map(n => String(n).length), remainderDigits: remainders.map(n => String(n).length),
            coprime: gcd(BigInt(divisors[0]), BigInt(divisors[1])) === ONE, zeroRemainders: remainders.map(n => n === 0) }); };
        if (shape(witness.source) !== shape(witness.variant)) throw new Error('least-natural remainder constraint burden changed');
      });
      if (witness.model === 'progression-g3-rectangle-integer-max-area-v1') check(() => {
        const a = Number(witness.source.perimeter), b = Number(witness.variant.perimeter);
        if (String(a).length !== String(b).length || a / 2 % 2 !== b / 2 % 2) throw new Error('rectangle maximum-area parity/number-range burden changed');
      });
      if (witness.model === 'progression-g3-rectangle-fixed-area-min-perimeter-v1') check(() => {
        const factorPairs = (area: number) => { let count = 0; for (let d = 1; d * d <= area; d++) if (area % d === 0) count++; return count; };
        const a = Number(witness.source.area), b = Number(witness.variant.area);
        if (String(a).length !== String(b).length || factorPairs(a) !== factorPairs(b)) throw new Error('rectangle factor-pair enumeration burden changed');
      });
    }
  }
  return issues;
}
export function auditTransferExpansion(sources: Question[], entries: TransferEntry[], gaps: TransferGap[]) {
  const issues: OracleIssue[] = [];
  const byId = new Map(sources.map(source => [source.id, source]));
  const assigned = new Map<string, number>();
  for (const entry of entries) {
    assigned.set(entry.sourceId, (assigned.get(entry.sourceId) || 0) + 1);
    const source = byId.get(entry.sourceId);
    if (!source) issues.push({ sourceId: entry.sourceId, message: 'unknown source' });
    else auditTransferEntry(source, entry).forEach(message => issues.push({ sourceId: source.id, message }));
  }
  for (const gap of gaps) {
    assigned.set(gap.sourceId, (assigned.get(gap.sourceId) || 0) + 1);
    if (!gap.reason || !gap.detail) issues.push({ sourceId: gap.sourceId, message: 'unexplained coverage gap' });
    if (!['source-unsafe', 'constant-answer-by-design', 'difficulty-not-preserved'].includes(gap.reason)) {
      issues.push({ sourceId: gap.sourceId, message: 'unfinished content work is not an accepted coverage gap' });
    }
    if (gap.reason === 'source-unsafe' && !HISTORICALLY_UNSAFE_SOURCES.has(gap.sourceId)) issues.push({ sourceId: gap.sourceId, message: 'unexpected unsafe-source exclusion outside the five historical IDs' });
    if (!(gap.reason === 'source-unsafe' && HISTORICALLY_UNSAFE_SOURCES.has(gap.sourceId)) && /尚未|尚待|当前无|待审|待\s*SOL|本批仅|需另行|合同待|模板不支持|未实现|待实现|未建|未支持|暂未|等待|需先.*(?:合同|模型|审算|核验)|当前.*(?:缺少|缺乏).*(?:合同|模型|实现|证据)/i.test(gap.detail)) {
      issues.push({ sourceId: gap.sourceId, message: 'coverage gap detail describes unfinished implementation rather than a mathematical/difficulty limit' });
    }
  }
  for (const source of sources) if (assigned.get(source.id) !== 1) issues.push({ sourceId: source.id, message: `source assigned ${assigned.get(source.id) || 0} times` });
  const grades = Object.fromEntries(['G1', 'G2', 'G3', 'G4', 'G5', 'G6'].map(grade => [grade, { total: sources.filter(q => q.gradeBand === grade).length, matched: entries.filter(e => byId.get(e.sourceId)?.gradeBand === grade).length, unavailable: gaps.filter(g => byId.get(g.sourceId)?.gradeBand === grade).length }]));
  const coverageRows = sources.map(source => {
    const entry = entries.find(item => item.sourceId === source.id), gap = gaps.find(item => item.sourceId === source.id);
    return { sourceId: source.id, grade: source.gradeBand, status: entry ? 'variant' : 'gap', variantId: entry?.variant.id || null,
      verificationMode: entry?.verificationMode || null, schemaKind: inferAnswerSchema(entry?.variant || source).kind,
      reason: gap?.reason || null, detail: gap?.detail || null };
  });
  const unsafeSourceIds = sources.filter(source => HISTORICALLY_UNSAFE_SOURCES.has(source.id)).map(source => source.id);
  return { sourceCount: sources.length, allowedSafeSources: sources.length - unsafeSourceIds.length, unsafeSourceCount: unsafeSourceIds.length, unsafeSourceIds,
    entries: entries.length, numericDistinctCount: entries.filter(entry => entry.verificationMode === 'numeric-distinct').length,
    structuralCount: entries.filter(entry => entry.verificationMode === 'structural-proof').length,
    gaps: gaps.length, grades, coverageRows, issues, passed: issues.length === 0 };
}
