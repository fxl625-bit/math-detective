import type { LearningEvent } from './types';

export interface SkillLearningMetric {
  metricId: string;
  skillId: string;
  grade: string;
  semester: string;
  unitId: string | null;
  role: string;
  firstAnswerCount: number;
  firstCorrectCount: number;
  completedQuestionInstances: number;
  independentCompletions: number;
  assistedCompletions: number;
  fullHintCompletions: number;
  firstTryAccuracy: number | null;
}

export interface DifficultyDecision {
  ruleVersion: 'skill-evidence-v1';
  skillId: string;
  evidenceWindowId: string;
  from: number;
  to: number;
  reason: string;
  firstTryAccuracy: number;
  fullHintRate: number;
  sessionCount: number;
  variantCount: number;
  consumedEventIds: string[];
}

function ordered(events: readonly LearningEvent[]) {
  return events.map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.timestamp.localeCompare(b.event.timestamp) || a.index - b.index)
    .map(item => item.event);
}

export function reduceLearningMetrics(events: readonly LearningEvent[]): Record<string, SkillLearningMetric> {
  const byInstance = new Map<string, LearningEvent[]>();
  for (const event of ordered(events)) {
    if (event.eventType === 'legacy_snapshot' || event.eventType === 'mistake_review_submitted' || event.firstAttemptKnown === false) continue;
    const rows = byInstance.get(event.questionInstanceId) || [];
    rows.push(event);
    byInstance.set(event.questionInstanceId, rows);
  }

  const aggregate = new Map<string, Omit<SkillLearningMetric, 'firstTryAccuracy'>>();
  const ensure = (event: LearningEvent, skillId: string) => {
    const grade = event.grade || 'unknown';
    const semester = event.semester || 'unknown';
    const unitId = event.unitId ?? null;
    const role = event.role || 'unknown';
    const metricId = `${grade}:${semester}:${unitId || 'unknown'}:${role}:${skillId}`;
    let metric = aggregate.get(metricId);
    if (!metric) {
      metric = { metricId, skillId, grade, semester, unitId, role, firstAnswerCount: 0, firstCorrectCount: 0, completedQuestionInstances: 0, independentCompletions: 0, assistedCompletions: 0, fullHintCompletions: 0 };
      aggregate.set(metricId, metric);
    }
    return metric;
  };

  for (const rows of byInstance.values()) {
    const submissions = rows.filter(event => event.eventType === 'attempt_submitted' && event.result);
    const firstSubmission = submissions[0];
    const completion = rows.find(event => event.eventType === 'question_completed');
    const skillIds = [...new Set(rows.flatMap(event => event.skillIds))];
    for (const skillId of skillIds) {
      const metricEvent = firstSubmission || completion || rows[0];
      const metric = ensure(metricEvent, skillId);
      if (firstSubmission) {
        metric.firstAnswerCount += 1;
        if (firstSubmission.result === 'correct') metric.firstCorrectCount += 1;
      }
      if (completion) {
        metric.completedQuestionInstances += 1;
        const fullHint = rows.some(event => event.eventType === 'hint_used' && event.hintLevel === 'full');
        const usedLearningSupport = rows.some(event => event.eventType === 'support_used');
        if (fullHint || usedLearningSupport || completion.completionMode === 'assisted') metric.assistedCompletions += 1;
        else if (completion.completionMode === 'independent') metric.independentCompletions += 1;
        if (fullHint || completion.hintLevel === 'full') metric.fullHintCompletions += 1;
      }
    }
  }

  return Object.fromEntries([...aggregate].map(([skillId, metric]) => [skillId, {
    ...metric,
    firstTryAccuracy: metric.firstAnswerCount ? metric.firstCorrectCount / metric.firstAnswerCount : null,
  }]));
}

export function decideDifficultyIncrease(params: {
  events: readonly LearningEvent[];
  skillId: string;
  currentDifficulty: number;
  consumedWindowIds?: readonly string[];
  consumedEventIds?: readonly string[];
  prerequisitesReady: boolean;
  grade?: string;
  unitId?: string | null;
  role?: string;
}): DifficultyDecision | null {
  if (!params.prerequisitesReady || params.currentDifficulty >= 5) return null;
  const consumed = new Set(params.consumedEventIds || []);
  const firstByInstance = new Map<string, LearningEvent>();
  for (const event of ordered(params.events)) {
    if (event.eventType !== 'attempt_submitted' || !event.result || !event.skillIds.includes(params.skillId)
      || event.firstAttemptKnown === false
      || (params.grade !== undefined && event.grade !== params.grade)
      || (params.unitId !== undefined && (event.unitId ?? null) !== params.unitId)
      || (params.role !== undefined && event.role !== params.role)) continue;
    if (!firstByInstance.has(event.questionInstanceId)) firstByInstance.set(event.questionInstanceId, event);
  }
  // Only the true first submission of each instance can enter any evidence window.
  // A later retry must never replace a consumed first attempt.
  const first = [...firstByInstance.values()].filter(event => !consumed.has(event.eventId));
  const window = first.slice(-8);
  if (window.length < 8) return null;
  const windowId = `${params.skillId}:${window.map(event => event.eventId).join('|')}`;
  if (params.consumedWindowIds?.includes(windowId)) return null;
  const sessionCount = new Set(window.map(event => event.sessionId)).size;
  const variantCount = new Set(window.map(event => `${event.questionId}:${event.questionVersion}`)).size;
  const accuracy = window.filter(event => event.result === 'correct').length / window.length;
  const instanceIds = new Set(window.map(event => event.questionInstanceId));
  const fullHintCount = [...instanceIds].filter(instanceId => {
    const rows = params.events.filter(event => event.questionInstanceId === instanceId);
    const submitted = rows.some(event => event.eventType === 'attempt_submitted');
    const usedFullHint = rows.some(event => event.eventType === 'hint_used' && event.hintLevel === 'full');
    const completed = rows.some(event => event.eventType === 'question_completed' && event.hintLevel === 'full');
    return (submitted && usedFullHint) || completed;
  }).length;
  const fullHintRate = fullHintCount / window.length;
  if (sessionCount < 2 || variantCount < 2 || accuracy < 0.8 || fullHintRate > 0.2) return null;
  return {
    ruleVersion: 'skill-evidence-v1', skillId: params.skillId, evidenceWindowId: windowId,
    from: params.currentDifficulty, to: params.currentDifficulty + 1,
    reason: '8 valid first answers across at least 2 sessions, multiple versions, >=80% correct, <=20% full hints',
    firstTryAccuracy: accuracy, fullHintRate, sessionCount, variantCount,
    consumedEventIds: window.map(event => event.eventId),
  };
}
