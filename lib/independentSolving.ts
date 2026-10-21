import type { GradeBand, Question } from './types';
import { textRevealsAnswer } from './hintSafety';
import { inferAnswerSchema } from './answerSchema';
import { INTERACTIVE_HELP_OVERRIDES } from '@/data/interactiveHelp';

export interface SolvingEvidence {
  phase: 'attempt' | 'help' | 'review' | 'explanation' | 'transfer' | 'complete';
  firstAttemptCorrect: boolean | null;
  independentCorrect: boolean;
  hintCount: number;
  maxHintLevel: 0 | 1 | 2 | 3;
  guidedSolutionUsed: boolean;
  fullExplanationViewedBeforeSolve: boolean;
  attemptCount: number;
  finalCorrect: boolean;
  masteryStatus: 'independent' | 'assisted' | 'needs_reinforcement';
  outcome: 'unresolved' | 'first_independent' | 'retry_correct' | 'hint_correct' | 'guided_correct' | 'explanation';
  helpTaskIndex: number;
  helpWrongCount: number;
  completedTaskIds: string[];
}

export function createSolvingEvidence(): SolvingEvidence {
  return {
    phase: 'attempt', firstAttemptCorrect: null, independentCorrect: false,
    hintCount: 0, maxHintLevel: 0, guidedSolutionUsed: false,
    fullExplanationViewedBeforeSolve: false, attemptCount: 0, finalCorrect: false,
    masteryStatus: 'needs_reinforcement', outcome: 'unresolved', helpTaskIndex: 0,
    helpWrongCount: 0, completedTaskIds: [],
  };
}

export interface InteractiveHelpTask {
  id: string;
  prompt: string;
  skill: 'target' | 'condition' | 'relation' | 'intermediate';
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  feedback: string;
  scaffold: string;
}

export type TransferSelection =
  | { kind: 'matched'; questionId: string; reason: string }
  | { kind: 'unavailable'; reason: string; followupQuestionId?: string };

const option = (label: string, id: string): { id: string; label: string } => ({ id, label });

function shuffleCorrectPosition<T extends { id: string }>(items: T[], seed: string): T[] {
  const copy = [...items];
  const index = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % copy.length;
  const correct = copy.splice(copy.findIndex(item => item.id === 'correct'), 1)[0];
  copy.splice(index, 0, correct);
  return copy;
}

function targetTask(q: Question): InteractiveHelpTask | undefined {
  const choices = [...new Set(q.questionMeaningOptions || [])].filter(Boolean);
  const correctMeaning = q.correctMeaning;
  if (choices.length < 2 || !correctMeaning || !choices.includes(correctMeaning)) return undefined;
  const options = choices.map((label, i) => option(label, label === correctMeaning ? 'correct' : `other-${i}`));
  return {
    id: `${q.id}:target`, prompt: '题目最后要我们求什么？', skill: 'target',
    options: shuffleCorrectPosition(options, q.id), correctOptionId: 'correct',
    feedback: '对照题目最后一句，看看它要找的是哪一个量。',
    scaffold: '先读题目最后一句，圈出“多少、几、谁”后面的内容。',
  };
}

function factTask(q: Question): InteractiveHelpTask | undefined {
  const facts = q.reasoningFrame?.knownFacts;
  if (!facts || facts.length < 2) return undefined;
  const usable = facts.filter(f => typeof f.text === 'string' && f.text.trim() && f.role);
  if (usable.length < 2) return undefined;
  const rolePrompts = [
    { family: /减少量/, exact: '减少量', prompt: '哪条条件说明减少了多少？' },
    { family: /增加量/, exact: '增加量', prompt: '哪条条件说明后来增加了多少？' },
    { family: /每份|每组/, exact: '每份数量', prompt: '哪条条件说明每份的数量？' },
    { family: /份数|组数/, exact: '份数', prompt: '哪条条件说明分成几份？' },
    { family: /单价/, exact: '单价', prompt: '哪条条件说明每件的价格？' },
  ];
  const roleMatches = rolePrompts.flatMap(item => {
    const familyFacts = usable.filter(fact => item.family.test(fact.role));
    return familyFacts.length === 1 && familyFacts[0].role === item.exact
      ? [{ fact: familyFacts[0], prompt: item.prompt }]
      : [];
  });
  if (roleMatches.length !== 1) return undefined;
  const picked = roleMatches[0].fact;
  const ask = roleMatches[0].prompt;
  const labels = [...new Set([picked.text.trim(), ...usable.filter(f => f !== picked).map(f => f.text.trim())])];
  if (labels.length < 2 || labels.length > 5) return undefined;
  const options = labels.map((label, i) => option(label, label === picked.text.trim() ? 'correct' : `other-${i}`));
  if (options.filter(o => o.id === 'correct').length !== 1) return undefined;
  return {
    id: `${q.id}:condition`, prompt: ask, skill: 'condition',
    options: shuffleCorrectPosition(options, `${q.id}:condition`), correctOptionId: 'correct',
    feedback: '把这条条件和题目要找的量连起来想一想。',
    scaffold: '逐条看条件：它说的是题目里哪个数量或变化？',
  };
}

const ARABIC_DIGIT = '\\d+(?:\\.\\d+)?(?:/\\d+(?:\\.\\d+)?)?(?::\\d+(?:\\.\\d+)?)*(?:[%％])?';
const CHINESE_DIGIT = '[零〇一二两三四五六七八九十百千万亿]+(?:点[零〇一二三四五六七八九]+)?(?:成|折)?';
const NUMBER_UNIT = '(?:平方厘米|平方分米|立方厘米|立方分米|立方米|平方米|千克|公斤|千米|公里|小时|分钟|秒钟|毫升|公顷|分米|厘米|毫米|年|月|日|时|分|秒|个|只|张|支|本|人|条|件|份|袋|杯|块|元|角|克|吨|米|升|度|页|辆|层|名|次|棵|枚|倍)?';
const REQUIRED_NUMBER_UNIT = NUMBER_UNIT.slice(0, -1);
const QUESTION_NUMBER = new RegExp(`(?:${ARABIC_DIGIT}${NUMBER_UNIT}|${CHINESE_DIGIT}${REQUIRED_NUMBER_UNIT})`, 'g');

function extractExplicitNumberLiterals(text: string): string[] {
  const expression = new RegExp(QUESTION_NUMBER.source, 'g');
  return [...text.matchAll(expression)].map(match => match[0]);
}

/** Exact numeric tokens found in the learner-facing question text; used by the audit. */
export function getExplicitQuestionNumberLiterals(text: string): string[] {
  return extractExplicitNumberLiterals(text);
}

function mutateExplicitNumber(literal: string): string | undefined {
  const arabic = literal.match(/^\d+(?:\.\d+)?/);
  if (arabic) {
    const value = Number(arabic[0]);
    if (!Number.isFinite(value)) return undefined;
    const replacement = String(value + 1);
    return replacement + literal.slice(arabic[0].length);
  }
  const chinese = literal.match(/^([零〇一二两三四五六七八九十百千万亿]+(?:点[零〇一二三四五六七八九]+)?(?:成|折)?)(.*)$/);
  if (!chinese) return undefined;
  const [, numeral, unit] = chinese;
  const chineseDigits = '零〇一二两三四五六七八九';
  const last = numeral.at(-1)!;
  if (chineseDigits.includes(last)) {
    const next = chineseDigits[(chineseDigits.indexOf(last) + 1) % chineseDigits.length];
    return `${numeral.slice(0, -1)}${next}${unit}`;
  }
  return '十百千万亿'.includes(last) ? `${numeral}一${unit}` : undefined;
}

function optionAddsAnswer(optionLabel: string, originalTextLiterals: string[], q: Question): boolean {
  const answerLiterals = [...extractExplicitNumberLiterals(String(q.answer)), ...extractExplicitNumberLiterals(q.answerSentence)];
  const sourceSet = new Set(originalTextLiterals);
  return answerLiterals.some(answerLiteral => optionLabel.includes(answerLiteral) && !sourceSet.has(answerLiteral));
}

function numericConditionTask(q: Question): InteractiveHelpTask | undefined {
  const sourceLiterals = extractExplicitNumberLiterals(q.text);
  if (sourceLiterals.length < 1 || sourceLiterals.length > 8) return undefined;
  const correctLabel = sourceLiterals.join('、');
  const options = [option(correctLabel, 'correct')];
  for (let i = 0; i < sourceLiterals.length && options.length < 3; i += 1) {
    const changed = [...sourceLiterals];
    const mutated = mutateExplicitNumber(changed[i]);
    if (!mutated) continue;
    changed[i] = mutated;
    const label = changed.join('、');
    if (label !== correctLabel && !options.some(existing => existing.label === label) && !optionAddsAnswer(label, sourceLiterals, q)) {
      options.push(option(label, `other-${options.length}`));
    }
  }
  if (options.length < 2) return undefined;
  return {
    id: `${q.id}:condition`, prompt: '题目中给出的数字是哪一组？', skill: 'condition',
    options: shuffleCorrectPosition(options, `${q.id}:numeric-condition`), correctOptionId: 'correct',
    feedback: '把选中的数字逐个对照题干中的已知条件。',
    scaffold: '逐项核对题干里的数量；只选题目明确给出的数字。',
  };
}

function relationTask(q: Question): InteractiveHelpTask | undefined {
  const frame = q.reasoningFrame;
  if (!frame?.knownFacts?.length || !frame.targetQuestion?.questionType) return undefined;
  const roles = frame.knownFacts.map(f => f.role);
  let labels: string[] | undefined;
  let answer: string | undefined;
  const target = frame.targetQuestion.questionType;
  if (roles.some(r => /减少|用掉|吃掉|离开|飞走/.test(r)) && roles.some(r => /初始|原来|开始/.test(r))
    && /remaining|remain|剩余/.test(target) && q.operation === 'subtraction') {
    labels = ['从原来的数量中去掉减少的部分', '把减少的部分加到剩余数量上', '比较两个数量相差多少']; answer = labels[0];
  } else if (roles.some(r => /减少|用掉|吃掉|离开|飞走/.test(r)) && roles.some(r => /剩余/.test(r))
    && /initial|original|原来/.test(target) && q.operation === 'addition') {
    labels = ['把剩下的数量和减少的部分合起来还原原来的数量', '从原来的数量中再减去剩下的数量', '比较两个数量相差多少']; answer = labels[0];
  } else if (roles.some(r => /增加|加入|又来|增加量/.test(r)) && roles.some(r => /初始|原来|开始/.test(r))
    && /total|after|现在|一共/.test(target) && q.operation === 'addition') {
    labels = ['把后来增加的部分合到原来的数量里', '从增加量中减去原来的数量', '把原来的数量平均分']; answer = labels[0];
  } else if (roles.some(r => /总数|全部|合计/.test(r)) && roles.some(r => /份数|每份|每组|单价|每个/.test(r))) {
    labels = ['根据每份数量和份数一起求总量', '把总量平均分成相同的份', '用两个量相减求差']; answer = q.operation === 'multiplication' ? labels[0] : undefined;
  }
  if (!labels || !answer) return undefined;
  const options = labels.map((label, i) => option(label, label === answer ? 'correct' : `other-${i}`));
  return {
    id: `${q.id}:relation`, prompt: '这些已知量和问题目标之间是什么关系？', skill: 'relation',
    options: shuffleCorrectPosition(options, `${q.id}:relation`), correctOptionId: 'correct',
    feedback: '回到已知条件，想想数量是合并、减少还是平均分。',
    scaffold: '先说清每个数量代表什么，再判断它们怎样联系。',
  };
}

function normalizedForAnswerCheck(value: string): string {
  return value.toLowerCase().replace(/[\s，,。；;：:、()（）]/g, '');
}

function optionRevealsFinalAnswer(label: string, q: Question): boolean {
  const normalized = normalizedForAnswerCheck(label);
  const answer = normalizedForAnswerCheck(String(q.answer));
  if (answer && (normalized === answer || (answer.length >= 2 && normalized.includes(answer)))) return true;
  const sentence = normalizedForAnswerCheck(q.answerSentence || '');
  if (sentence && normalized.includes(sentence)) return true;
  // Reject displayed solutions and completed equalities, even when the stored
  // answer is a multi-field string that a generic hint checker cannot parse.
  if (/\d+(?:\.\d+)?\s*[+＋\-−×*÷/]\s*\d+(?:\.\d+)?\s*(?:=|＝)\s*[-+]?\d/.test(label)) return true;
  if (/[=＝<>]/.test(label) && /\d/.test(label)) return true;
  if (typeof q.answer === 'number') {
    const literal = String(q.answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^\\d.])${literal}(?![\\d.])`).test(label)) return true;
  }
  return false;
}

function helpTaskHasAnswerLeak(task: InteractiveHelpTask, q: Question): boolean {
  if (task.correctOptionId !== 'correct' || task.options.filter(option => option.id === 'correct').length !== 1) return true;
  return task.options.some(item => optionRevealsFinalAnswer(item.label, q));
}

export function buildReasoningTasks(question: Question): InteractiveHelpTask[] {
  const overrides = (INTERACTIVE_HELP_OVERRIDES[question.id] || []).map(task => ({
    ...task,
    options: shuffleCorrectPosition([...task.options], task.id),
  }));
  const candidates = [...overrides, targetTask(question), factTask(question), relationTask(question), numericConditionTask(question)]
    .filter((task): task is InteractiveHelpTask => Boolean(task));
  // A target task is useful even without an RF. Never manufacture arithmetic or reveal a solution.
  return candidates.filter(task => {
    const learnerFacing = [task.prompt, task.feedback, task.scaffold, ...task.options.map(o => o.label)];
    return !helpTaskHasAnswerLeak(task, question)
      && learnerFacing.every(text => !textRevealsAnswer(text, question));
  }).slice(0, 3);
}

export function evaluateReasoningTask(
  task: InteractiveHelpTask,
  value: string,
): { correct: boolean; feedback: string; scaffold?: string } {
  const correct = value === task.correctOptionId;
  return correct
    ? { correct: true, feedback: task.feedback }
    : { correct: false, feedback: '再对照题目中的目标和条件想一想。', scaffold: task.scaffold };
}

function skillKeys(q: Question): string[] {
  const curated = curatedTransferIdentity[q.id]?.skill;
  if (curated) return [curated];
  return [...new Set([...(q.curriculumSkillIds || []), ...(q.skillIds || []), ...(q.curriculumSkillIds ? [] : q.skillIds || [])])].sort();
}

function semester(q: Question): string | undefined {
  return q.curriculumSemester;
}

function relationSignature(q: Question): string | undefined {
  const curated = curatedTransferIdentity[q.id]?.relation;
  if (curated) return curated;
  const frame = q.reasoningFrame;
  if (!frame?.targetQuestion?.questionType || !frame.knownFacts?.length) return undefined;
  const roleFamily = frame.knownFacts.map(f => {
    const role = f.role;
    if (/减少|用掉|吃掉|离开|飞走/.test(role)) return 'decrease';
    if (/增加|加入|后来|又来/.test(role)) return 'increase';
    if (/初始|原来|开始/.test(role)) return 'initial';
    if (/每份|每组|单价|每个/.test(role)) return 'per_unit';
    if (/份数|组数|数量/.test(role)) return 'groups';
    if (/总数|全部|合计/.test(role)) return 'total';
    return `role:${role}`;
  });
  return `${frame.targetQuestion.questionType}|${frame.targetQuestion.targetQuantity}|${frame.targetQuestion.targetUnit || ''}|${roleFamily.join(',')}|two:${q.isTwoStep === true}`;
}

// Hand-audited legacy G6 pair: both ask for a percentage from a part and whole
// (part ÷ whole × 100%), with different counts and results.
const curatedTransferIdentity: Record<string, { skill: string; relation: string }> = {
  g1_01: { skill: 'G1:addition-increase-to-total', relation: 'addition|initial+increase=total|single' },
  g1_06: { skill: 'G1:addition-increase-to-total', relation: 'addition|initial+increase=total|single' },
  g1_08: { skill: 'G1:addition-increase-to-total', relation: 'addition|initial+increase=total|single' },
  g2_05: { skill: 'G2:equal-sharing-per-recipient', relation: 'equal-sharing|total÷recipient-count=per-recipient|single' },
  prog_g2_u2_01: { skill: 'G2:equal-sharing-per-recipient', relation: 'equal-sharing|total÷recipient-count=per-recipient|single' },
  g2_01: { skill: 'G2:equal-groups-total', relation: 'equal-groups-total|per-unit×group-count|single' },
  g2_09: { skill: 'G2:equal-groups-total', relation: 'equal-groups-total|per-unit×group-count|single' },
  g3_04: { skill: 'G3:total-divided-by-per-group', relation: 'group-count|total÷per-group|single' },
  g3_11: { skill: 'G3:total-divided-by-per-group', relation: 'group-count|total÷per-group|single' },
  g4_19: { skill: 'G4:constant-rate-times-time', relation: 'total-quantity|rate×time|single' },
  g4_25: { skill: 'G4:constant-rate-times-time', relation: 'total-quantity|rate×time|single' },
  g5_01: { skill: 'G5:decimal-equal-groups-total', relation: 'equal-groups-total|per-unit×group-count|single' },
  g5_21: { skill: 'G5:decimal-equal-groups-total', relation: 'equal-groups-total|per-unit×group-count|single' },
  g6_06: { skill: 'G6:rate-from-part-and-whole', relation: 'percent-from-part-and-whole|single' },
  g6_21: { skill: 'G6:rate-from-part-and-whole', relation: 'percent-from-part-and-whole|single' },
};

const blockedTransferPairs = new Set([
  'g1ll_18|g1ll_22', 'g1ll_22|g1ll_18', // comparison sides occupy different roles
  'g1ll_48|g1ll_50', 'g1ll_50|g1ll_48', // currency units require different borrowing
  'g1ll_64|g1ll_61', 'g1ll_61|g1ll_64', // missing middle term versus next term
  'g1ll_69|g1ll_74', 'g1ll_74|g1ll_69', // operation order is reversed
  'g1ll_75|g1ll_79', 'g1ll_79|g1ll_75', // repeated equal factor degeneracy
]);

function answerSchemaFamily(q: Question): string {
  const schema = inferAnswerSchema(q);
  const kind = schema.kind;
  if (kind === 'integer' || kind === 'decimal') return 'numeric';
  if (kind === 'multi_field') return `multi_field:${schema.fields.map(field => field.kind).join(',')}`;
  return kind;
}

function differentNumbers(a: Question, b: Question): boolean {
  const numsA = (a.numbers || []).map(String).sort().join(',');
  const numsB = (b.numbers || []).map(String).sort().join(',');
  return numsA !== numsB && String(a.answer) !== String(b.answer);
}

export function selectTransferQuestion(original: Question, pool: Question[]): TransferSelection {
  const originalSkills = skillKeys(original);
  const originalRelation = relationSignature(original);
  if (!originalSkills.length || !originalRelation) {
    return { kind: 'unavailable', reason: '原题缺少可验证的知识点或结构化数量关系，无法确认同构变式。' };
  }
  const candidates = pool.filter(candidate => {
    if (candidate.id === original.id || candidate.gradeBand !== original.gradeBand) return false;
    if (blockedTransferPairs.has(`${original.id}|${candidate.id}`)) return false;
    const aSemester = semester(original), bSemester = semester(candidate);
    if (aSemester && bSemester && aSemester !== 'both' && bSemester !== 'both' && aSemester !== bSemester) return false;
    if (!originalSkills.some(skill => skillKeys(candidate).includes(skill))) return false;
    if (candidate.operation !== original.operation || candidate.domain !== original.domain) return false;
    if (answerSchemaFamily(candidate) !== answerSchemaFamily(original)) return false;
    if (relationSignature(candidate) !== originalRelation) return false;
    if (!differentNumbers(original, candidate)) return false;
    return true;
  });
  if (candidates.length) return {
    kind: 'matched', questionId: candidates[0].id,
    reason: '年级、兼容学期、知识点、运算、答案类型和结构化数量关系一致，题目数字及答案不同。',
  };

  const followup = pool.find(candidate => candidate.id !== original.id
    && candidate.gradeBand === original.gradeBand
    && originalSkills.some(skill => skillKeys(candidate).includes(skill))
    && candidate.operation === original.operation && candidate.domain === original.domain);
  return {
    kind: 'unavailable',
    reason: '这题暂时没有确认过的同结构变式。',
    ...(followup ? { followupQuestionId: followup.id } : {}),
  };
}

export function isSupportedGrade(grade: GradeBand): boolean {
  return /^G[1-6]$/.test(grade);
}
