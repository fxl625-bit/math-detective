import type { AttemptRecord, LearningEvent, LearningEventType } from './types';

export interface EventIdentity {
  childProfileId: string;
  deviceId: string;
}

export interface LearningEventInput extends Omit<LearningEvent, 'eventId' | 'schemaVersion'> {
  eventId?: string;
}

export type EventAppendResult =
  | { accepted: true; events: LearningEvent[]; event: LearningEvent }
  | { accepted: false; events: LearningEvent[]; reason: 'invalid_event' | 'duplicate' | 'id_conflict'; event?: LearningEvent };

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => [key, stableValue(nested)]));
}

function samePayload(left: LearningEvent, right: LearningEvent): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function isEventType(value: unknown): value is LearningEventType {
  return ['attempt_submitted', 'hint_used', 'support_used', 'mistake_review_submitted', 'question_completed', 'lesson_completed', 'legacy_snapshot'].includes(String(value));
}

export function createLearningEvent(input: LearningEventInput): LearningEvent | null {
  const event: LearningEvent = { ...input, eventId: input.eventId || `${input.actionId}:${input.eventType}`, schemaVersion: 1 };
  if (!event.eventId || !event.actionId || !event.attemptId || !event.lessonId || !event.questionInstanceId
    || !event.questionId || !event.childProfileId || !event.deviceId || !event.sessionId
    || !isEventType(event.eventType) || !Number.isFinite(Date.parse(event.timestamp))
    || !Array.isArray(event.skillIds) || event.skillIds.some(skill => typeof skill !== 'string')
    || !['none', 'light', 'medium', 'full'].includes(event.hintLevel)
    || !['independent', 'assisted', 'legacy_unknown'].includes(event.completionMode)
    || (event.grade !== undefined && !/^G[1-6]$/.test(event.grade) && event.grade !== 'unknown')
    || (event.semester !== undefined && !['upper', 'lower', 'unknown'].includes(event.semester))
    || (event.durationMs !== undefined && (!Number.isFinite(event.durationMs) || event.durationMs < 0))) return null;
  return event;
}

export function appendUniqueEvent(events: readonly LearningEvent[], input: LearningEventInput): EventAppendResult {
  const event = createLearningEvent(input);
  if (!event) return { accepted: false, events: [...events], reason: 'invalid_event' };
  const existing = events.find(item => item.eventId === event.eventId);
  if (existing) {
    return samePayload(existing, event)
      ? { accepted: false, events: [...events], reason: 'duplicate', event }
      : { accepted: false, events: [...events], reason: 'id_conflict', event };
  }
  return { accepted: true, events: [...events, event], event };
}

export function createEventIdentity(): EventIdentity {
  const createId = () => {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    } catch { /* use local non-identifying fallback */ }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  };
  return { childProfileId: `local-child-${createId()}`, deviceId: `local-device-${createId()}` };
}

export function wrapLegacyAttempts(attempts: readonly AttemptRecord[], identity: EventIdentity): LearningEvent[] {
  return attempts.map((attempt, index) => ({
    eventId: `legacy:${index}:${attempt.questionId}:${attempt.submittedAt}`,
    schemaVersion: 1,
    childProfileId: identity.childProfileId,
    deviceId: identity.deviceId,
    sessionId: 'legacy',
    lessonId: 'legacy',
    questionInstanceId: `legacy:${index}:${attempt.questionId}`,
    questionId: attempt.questionId,
    questionVersion: 'unknown',
    skillIds: [],
    grade: 'unknown',
    semester: 'unknown',
    unitId: null,
    role: 'unknown',
    eventType: 'legacy_snapshot',
    actionId: `legacy:${index}`,
    attemptId: `legacy:${index}`,
    timestamp: attempt.submittedAt,
    hintLevel: 'none',
    completionMode: 'legacy_unknown',
    result: attempt.isCorrect ? 'correct' : 'incorrect',
    firstAttemptKnown: false,
  }));
}
