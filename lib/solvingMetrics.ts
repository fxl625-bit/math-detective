import type { LearningEvent } from './types';

export interface SolvingSummary {
  resolved: number;
  independent: number;
  assisted: number;
  needsReinforcement: number;
  unknown: number;
  finalCorrect: number;
  firstAttempts: number;
  firstCorrect: number;
  helped: number;
  transferInstances: number;
  transferIndependent: number;
  independentRate: number | null;
  finalCorrectRate: number | null;
  helpDependenceRate: number | null;
  transferMasteryRate: number | null;
}

/** Original outcomes and transfer evidence always have separate denominators. */
export function summarizeSolving(events: readonly LearningEvent[]): SolvingSummary {
  const groups = new Map<string, LearningEvent[]>();
  const unique = [...new Map(events.map(event => [event.eventId, event])).values()]
    .filter(event => event.eventType !== 'legacy_snapshot' && event.eventType !== 'mistake_review_submitted')
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const event of unique) {
    const rows = groups.get(event.questionInstanceId) || [];
    rows.push(event);
    groups.set(event.questionInstanceId, rows);
  }
  const summary: SolvingSummary = {
    resolved: 0, independent: 0, assisted: 0, needsReinforcement: 0, unknown: 0,
    finalCorrect: 0, firstAttempts: 0, firstCorrect: 0, helped: 0,
    transferInstances: 0, transferIndependent: 0, independentRate: null,
    finalCorrectRate: null, helpDependenceRate: null, transferMasteryRate: null,
  };
  for (const rows of groups.values()) {
    const submissions = rows.filter(event => event.eventType === 'attempt_submitted');
    const first = submissions[0];
    const evidence = [...rows].reverse().find(event => event.solvingEvidence)?.solvingEvidence;
    const isTransfer = rows.some(event => event.source === 'transfer');
    const help = rows.some(event => ['hint_used', 'support_used', 'help_task_submitted'].includes(event.eventType))
      || Boolean(evidence && (evidence.hintCount > 0 || evidence.guidedSolutionUsed));
    if (isTransfer) {
      if (first || rows.some(event => event.eventType === 'transfer_completed')) {
        summary.transferInstances += 1;
        if (first?.result === 'correct' && evidence?.independentCorrect && !help) summary.transferIndependent += 1;
      }
      continue;
    }
    if (first && first.firstAttemptKnown !== false) {
      summary.firstAttempts += 1;
      if (first.result === 'correct') summary.firstCorrect += 1;
    }
    const explanation = rows.some(event => event.eventType === 'explanation_viewed') || evidence?.fullExplanationViewedBeforeSolve;
    const completed = rows.some(event => event.eventType === 'question_completed');
    if (!explanation && !completed) continue;
    summary.resolved += 1;
    if (help && (explanation || evidence)) summary.helped += 1;
    if (explanation) {
      summary.needsReinforcement += 1;
    } else if (evidence) {
      if (evidence.finalCorrect) summary.finalCorrect += 1;
      if (evidence.independentCorrect && first?.result === 'correct' && !help) summary.independent += 1;
      else if (evidence.finalCorrect) summary.assisted += 1;
      else summary.needsReinforcement += 1;
    } else {
      // Historical events cannot establish whether an unrecorded light hint was seen.
      summary.unknown += 1;
    }
  }
  const known = summary.resolved - summary.unknown;
  summary.independentRate = known ? summary.independent / known : null;
  summary.finalCorrectRate = known ? summary.finalCorrect / known : null;
  summary.helpDependenceRate = known ? summary.helped / known : null;
  summary.transferMasteryRate = summary.transferInstances ? summary.transferIndependent / summary.transferInstances : null;
  return summary;
}
