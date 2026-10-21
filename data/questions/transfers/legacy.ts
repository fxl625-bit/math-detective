import type { Question } from '@/lib/types';
import type { TransferBatch } from './types';
import { buildLegacyGrade1Transfers } from './legacy-grade1';
import { buildLegacyGrade2Transfers } from './legacy-grade2';
import { buildLegacyUpperTransfers } from './legacy-upper';

/** Fixed, per-source legacy G1–G6 recipes; every result is bound back to its original ID. */
export function buildLegacyTransfers(sources: readonly Question[]): TransferBatch {
  const batches = [buildLegacyGrade1Transfers(sources), buildLegacyGrade2Transfers(sources), buildLegacyUpperTransfers(sources)];
  return { entries: batches.flatMap(batch => batch.entries), gaps: batches.flatMap(batch => batch.gaps) };
}
