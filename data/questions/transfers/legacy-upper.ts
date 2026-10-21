import type { Question } from '@/lib/types';
import { makeTransferEntry } from './helpers';
import type { TransferBatch, TransferExpression, TransferProof, TransferRelation } from './types';
import { buildLegacyGrade3Transfers } from './legacy-grade3';
import { buildLegacyGrade4Transfers } from './legacy-grade4';
import { buildLegacyGrade5Transfers } from './legacy-grade5';
import { buildLegacyGrade6Transfers } from './legacy-grade6';

/** Legacy upper-grade content is split into fixed, source-bound grade recipes. */
export function buildLegacyUpperTransfers(sources: readonly Question[]): TransferBatch {
  const batches = [buildLegacyGrade3Transfers(sources), buildLegacyGrade4Transfers(sources),
    buildLegacyGrade5Transfers(sources), buildLegacyGrade6Transfers(sources)];
  const entries = batches.flatMap(batch => batch.entries);
  const gaps = batches.flatMap(batch => batch.gaps);
  const missingInformationReasons: Record<string, string> = {
    miss_01: '只知道送出3颗，不知道原来或剩余数量；原数减3可对应多个非负剩余数，无法唯一确定原数。',
    miss_02: '只知道第一站上车15人，不知道原有人数；原人数加15有多个可能结果，无法唯一确定现在人数。',
    miss_03: '只知道平均分给5人，不知道铅笔总数；多个总数会产生不同的人均数量。',
    miss_04: '只知道每瓶5元，不知道购买瓶数；总价随瓶数变化，无法唯一确定。',
    miss_05: '只知道长方形菜地长20米，不知道宽；周长随宽变化，无法唯一确定篱笆长度。',
    miss_06: '只知道两组之间的数量差，没有任一人的绝对本数；可同时平移三人的本数而保持差值不变。',
    miss_07: '只知道原有30本和卖出了一部分，不知道卖出本数；剩余数量不唯一。',
    miss_08: '只知道男女生比例3:2，没有任何总人数或其中一组的具体人数；总人数可按比例任意缩放。',
  };
  for (const source of sources) if (source.gradeBand && /^G[3-6]$/.test(source.gradeBand) && missingInformationReasons[source.id]) {
    gaps.push({ sourceId: source.id, reason: 'constant-answer-by-design', detail: `这道题在现有题干下都只能判定信息不足，不能得到唯一数值答案。${missingInformationReasons[source.id]}` });
  }
  return { entries, gaps };
}

export interface UpperArithmeticRecipe {
  id: string; tree: TransferExpression; sourceFacts: Record<string, number>; sourceAnchors: Record<string, string>;
  facts: Record<string, number>; anchors: Record<string, string>; text: string; numbers: number[];
  unit: string; relationText: string; sourceAnswer: number; decimals?: number; format?: TransferProof['format'];
}

function evaluate(node: TransferExpression, facts: Record<string, number>): number {
  if (typeof node === 'number') return node;
  if ('fact' in node) return facts[node.fact];
  const values = node.args.map(arg => evaluate(arg, facts));
  switch (node.op) {
    case 'add': return values.reduce((a, b) => a + b, 0);
    case 'sub': return values[0] - values[1];
    case 'mul': return values.reduce((a, b) => a * b, 1);
    case 'div': return values[0] / values[1];
    case 'pow': return values[0] ** values[1];
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    case 'floor': return Math.floor(values[0]);
    case 'ceil': return Math.ceil(values[0]);
  }
}
export function buildUpperArithmeticBatch(sources: readonly Question[], grade: 'G4'|'G5'|'G6', recipes: readonly UpperArithmeticRecipe[]): TransferBatch {
  const byId = new Map(sources.filter(source => source.gradeBand === grade).map(source => [source.id, source]));
  const entries: TransferBatch['entries'] = [], gaps: TransferBatch['gaps'] = [];
  const storedAnswer = (answer: Question['answer']): number => typeof answer === 'string' && /%$/.test(answer)
    ? Number(answer.slice(0, -1)) / 100 : Number(answer);
  for (const recipe of recipes) {
    const source = byId.get(recipe.id);
    if (!source) continue;
    if (Math.abs(evaluate(recipe.tree, recipe.sourceFacts) - recipe.sourceAnswer) > 1e-10 || Math.abs(storedAnswer(source.answer) - recipe.sourceAnswer) > 1e-10) {
      gaps.push({ sourceId: recipe.id, reason: 'source-proof-conflict', detail: '固定题干事实和显式运算关系不匹配当前原题答案。' }); continue;
    }
    const rawAnswer = evaluate(recipe.tree, recipe.facts);
    const answer = recipe.format === 'percent' ? rawAnswer : recipe.decimals !== undefined ? Number(rawAnswer.toFixed(recipe.decimals)) : Math.abs(rawAnswer - Math.round(rawAnswer)) < 1e-10 ? Math.round(rawAnswer) : rawAnswer;
    if (!Number.isFinite(answer) || answer === recipe.sourceAnswer || (recipe.format !== 'percent' && recipe.decimals === undefined && !Number.isInteger(answer)) || (recipe.format !== 'percent' && recipe.decimals !== undefined && Math.abs(Number(answer.toFixed(recipe.decimals)) - answer) > 1e-10)) {
      gaps.push({ sourceId: recipe.id, reason: 'variant-domain-conflict', detail: '候选值不满足答案差异、有限数或题型精度约束。' }); continue;
    }
    const displayValue = recipe.format === 'percent' ? answer * 100 : answer;
    const display = recipe.format === 'percent' ? `${displayValue}%` : recipe.decimals === undefined ? String(answer) : answer.toFixed(recipe.decimals).replace(/0+$/, '').replace(/\.$/, '');
    const relation: TransferRelation = { family: `legacy-${recipe.id}`, targetRole: '题干要求的量', roles: Object.keys(recipe.facts), operations: [recipe.relationText], units: [recipe.unit], invariants: ['源题与变式使用同一显式算术树', '事实锚点逐项存在于完整题干', '答案数值与原题不同'] };
    const proof = (facts: Record<string, number>, anchors: Record<string, string>): TransferProof => ({ facts, anchors, result: recipe.tree, format: recipe.format || 'number', precision: recipe.decimals });
    const content = makeTransferEntry(source, { text: recipe.text, numbers: recipe.numbers, answer: recipe.format === 'percent' ? display : answer, answerType: 'number', equation: `${recipe.relationText}，结果为${display}`, answerSentence: `答案是${display}${recipe.format === 'percent' ? '' : recipe.unit}。`, explanation: `${recipe.relationText}，计算得到${display}${recipe.format === 'percent' ? '' : recipe.unit}。`, solutionSteps: [`根据题干中的已知数量，按“${recipe.relationText}”列式。`, `计算结果：${display}${recipe.format === 'percent' ? '' : recipe.unit}。`], hints: ['逐项找出题干中的已知条件。', `保持“${recipe.relationText}”的数量关系计算。`] }, relation, { kind: 'arithmetic', source: proof(recipe.sourceFacts, recipe.sourceAnchors), variant: proof(recipe.facts, recipe.anchors) });
    entries.push(content);
  }
  return { entries, gaps };
}
