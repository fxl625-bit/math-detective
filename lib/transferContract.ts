import type { Question } from './types';
import { inferAnswerSchema } from './answerSchema';
import { transferFingerprint } from '@/data/questions/transfers/helpers';
import type { TransferEntry } from '@/data/questions/transfers/types';

function expressionShape(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(expressionShape).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${key}:${expressionShape(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function transferSchemaShape(question: Question): string {
  const schema = inferAnswerSchema(question);
  if (schema.kind === 'multi_field') return JSON.stringify({ kind: schema.kind,
    fields: schema.fields.map(field => ({ id: field.id, label: field.label.replace(/\d+(?:\.\d+)?/g, '#'), kind: field.kind, unit: field.unit })) });
  if (schema.kind === 'text') return 'text';
  if (schema.kind === 'choice') return JSON.stringify({ kind: schema.kind, multiple: schema.multiple,
    options: schema.options.map(option => ({ id: option.id })) });
  return JSON.stringify(Object.fromEntries(Object.entries(schema).filter(([key]) => key !== 'min' && key !== 'max')));
}

export function equivalentTransferDifficulty(a: Question, b: Question): boolean {
  return a.gradeBand === b.gradeBand && a.domain === b.domain && a.operation === b.operation
    && a.difficulty === b.difficulty && a.assessmentTier === b.assessmentTier
    && Boolean(a.isExtendedThinking) === Boolean(b.isExtendedThinking)
    && Boolean(a.isStretch) === Boolean(b.isStretch) && Boolean(a.isTwoStep) === Boolean(b.isTwoStep)
    && JSON.stringify(a.difficultyProfile) === JSON.stringify(b.difficultyProfile)
    && a.curriculumSemester === b.curriculumSemester && transferSchemaShape(a) === transferSchemaShape(b);
}

export function validateTransferEntry(source: Question, entry: TransferEntry): string[] {
  const errors: string[] = [];
  const q = entry.variant;
  if (source.id.startsWith('transfer_') || entry.sourceId !== source.id) errors.push('invalid-source');
  if (entry.sourceFingerprint !== transferFingerprint(source)) errors.push('source-drift');
  if (q.id !== `transfer_${source.id}_v1_01` || q.id === source.id) errors.push('invalid-variant-id');
  if (q.qualityStatus !== 'pass' || source.qualityStatus === 'fail' || source.qualityStatus === 'unsafe'
    || source.qualityStatus === 'needs_review') errors.push('unsafe-content');
  if (!equivalentTransferDifficulty(source, q)) errors.push('difficulty-or-schema-changed');
  if (!entry.relation.family || !entry.relation.targetRole || !entry.relation.roles.length
    || !entry.relation.operations.length || !entry.relation.invariants.length) errors.push('incomplete-relation');
  if (source.text === q.text || !q.explanation || !q.solutionSteps.length || !q.hints.length) errors.push('incomplete-content');
  if (q.gradeBand === 'G1' && /[×÷]|乘法|除法|乘以|除以/.test(
    [q.text, q.equation, q.explanation, ...q.solutionSteps, ...q.hints].join('\n'))) {
    errors.push('grade-one-unlearned-notation');
  }
  if (entry.verificationMode === 'numeric-distinct') {
    if (JSON.stringify([...source.numbers].sort((a, b) => a - b)) === JSON.stringify([...q.numbers].sort((a, b) => a - b))) errors.push('same-numbers');
    if (String(source.answer).trim() === String(q.answer).trim()) errors.push('same-answer');
  }
  if (entry.witness.kind === 'arithmetic') {
    if (expressionShape(entry.witness.source.result) !== expressionShape(entry.witness.variant.result)
      || Object.keys(entry.witness.source.facts).sort().join('|') !== Object.keys(entry.witness.variant.facts).sort().join('|')
      || (entry.witness.source.format || 'number') !== (entry.witness.variant.format || 'number')
      || entry.witness.source.precision !== entry.witness.variant.precision
      || expressionShape(entry.witness.source.slotFormats || {}) !== expressionShape(entry.witness.variant.slotFormats || {})) {
      errors.push('arithmetic-relationship-changed');
    }
    for (const [question, proof] of [[source, entry.witness.source], [q, entry.witness.variant]] as const) {
      for (const key of Object.keys(proof.facts)) {
        if (!Number.isFinite(proof.facts[key]) || !proof.anchors[key] || !question.text.includes(proof.anchors[key])) {
          errors.push(`unbound-fact:${question.id}:${key}`);
        }
      }
    }
  }
  return errors;
}
