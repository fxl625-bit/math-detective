import type { Question } from '@/lib/types';

/** Explicit arithmetic graph; units and structural constants are never free parameters. */
export type TransferExpression = number | { fact: string } | {
  op: 'add' | 'sub' | 'mul' | 'div' | 'floor' | 'ceil' | 'pow' | 'min' | 'max';
  args: TransferExpression[];
};
export interface TransferProof {
  facts: Record<string, number>;
  /** Every fact must be bound to an actual literal or explicit property in the prompt. */
  anchors: Record<string, string>;
  result: TransferExpression | Record<string, TransferExpression>;
  format?: 'number' | 'fraction' | 'percent' | 'ratio' | 'time' | 'text' | 'money';
  /** Explicit learner-answer slots, e.g. {tens}个十和{ones}个一. */
  template?: string;
  slotFormats?: Record<string, 'number' | 'fraction'>;
  precision?: number;
}
export interface TransferRelation {
  family: string;
  targetRole: string;
  roles: string[];
  operations: string[];
  units: string[];
  invariants: string[];
}
export type TransferWitness = {
  kind: 'arithmetic';
  source: TransferProof;
  variant: TransferProof;
} | {
  kind: 'enumeration';
  model: string;
  source: Record<string, number | string | number[] | string[]>;
  variant: Record<string, number | string | number[] | string[]>;
} | {
  kind: 'structural';
  model: string;
  source: Record<string, number | string | number[] | string[]>;
  variant: Record<string, number | string | number[] | string[]>;
};
export interface TransferEntry {
  sourceId: string;
  sourceFingerprint: string;
  relation: TransferRelation;
  variant: Question;
  witness: TransferWitness;
  verificationMode: 'numeric-distinct' | 'structural-proof';
}
export interface TransferGap {
  sourceId: string;
  reason: string;
  detail: string;
}
export interface TransferBatch { entries: TransferEntry[]; gaps: TransferGap[] }
