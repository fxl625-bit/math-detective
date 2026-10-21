import type { SolvingEvidence } from './independentSolving';

/** Validate persisted/imported evidence without turning missing history into mastery. */
export function isSolvingEvidence(value: unknown): value is SolvingEvidence {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (!['attempt', 'help', 'review', 'explanation', 'transfer', 'complete'].includes(String(row.phase))
    || !['independent', 'assisted', 'needs_reinforcement'].includes(String(row.masteryStatus))
    || !['unresolved', 'first_independent', 'retry_correct', 'hint_correct', 'guided_correct', 'explanation'].includes(String(row.outcome))
    || (row.firstAttemptCorrect !== null && typeof row.firstAttemptCorrect !== 'boolean')
    || ['independentCorrect', 'guidedSolutionUsed', 'fullExplanationViewedBeforeSolve', 'finalCorrect'].some(key => typeof row[key] !== 'boolean')
    || ['hintCount', 'attemptCount', 'helpTaskIndex', 'helpWrongCount'].some(key => !Number.isSafeInteger(row[key]) || Number(row[key]) < 0)
    || ![0, 1, 2, 3].includes(Number(row.maxHintLevel))
    || !Array.isArray(row.completedTaskIds) || row.completedTaskIds.some(id => typeof id !== 'string')
    || new Set(row.completedTaskIds).size !== row.completedTaskIds.length) return false;
  if (row.fullExplanationViewedBeforeSolve && (row.independentCorrect || row.finalCorrect || row.masteryStatus !== 'needs_reinforcement')) return false;
  if (row.independentCorrect && (row.firstAttemptCorrect !== true || row.attemptCount !== 1
    || row.hintCount !== 0 || row.maxHintLevel !== 0 || row.guidedSolutionUsed || !row.finalCorrect
    || row.masteryStatus !== 'independent')) return false;
  return true;
}
