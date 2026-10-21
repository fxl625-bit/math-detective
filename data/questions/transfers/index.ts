import type { Question } from '@/lib/types';
import { validateTransferEntry } from '@/lib/transferContract';
import { buildProgressionTransfers } from './progression';
import { buildLegacyTransfers } from './legacy';
import type { TransferEntry, TransferGap } from './types';

export function buildTransferCatalog(sources: readonly Question[], isSafe: (question: Question) => boolean) {
  const batches = [buildProgressionTransfers(sources), buildLegacyTransfers(sources)];
  const proposed = batches.flatMap(batch => batch.entries);
  const declaredGaps = new Map(batches.flatMap(batch => batch.gaps).map(gap => [gap.sourceId, gap]));
  const entries: TransferEntry[] = [];
  const byId = new Map<string, Question>();
  const bySourceId = new Map<string, TransferEntry[]>();
  const gaps: TransferGap[] = [];
  const validationErrors: { sourceId: string; errors: string[] }[] = [];
  const sourceMap = new Map(sources.map(source => [source.id, source]));
  for (const entry of proposed) {
    const source = sourceMap.get(entry.sourceId);
    const errors = source ? validateTransferEntry(source, entry) : ['source-missing'];
    if (source && !isSafe(source)) errors.push('source-unsafe');
    if (byId.has(entry.variant.id)) errors.push('duplicate-variant-id');
    if (errors.length) { validationErrors.push({ sourceId: entry.sourceId, errors }); continue; }
    entries.push(entry);
    byId.set(entry.variant.id, entry.variant);
    bySourceId.set(entry.sourceId, [...(bySourceId.get(entry.sourceId) || []), entry]);
  }
  for (const source of sources.filter(question => /^G[1-6]$/.test(question.gradeBand))) {
    if (bySourceId.has(source.id)) continue;
    gaps.push(!isSafe(source) ? { sourceId: source.id, reason: 'source-unsafe', detail: '原题尚未通过安全复核，保持隔离。' }
      : declaredGaps.get(source.id) || { sourceId: source.id, reason: 'pending-review', detail: '该原题的独立数学合同尚待实现。' });
  }
  return { entries, proposed, byId, bySourceId, gaps, validationErrors };
}
