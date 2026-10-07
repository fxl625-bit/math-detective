import type { GameState, LearningEvent } from '@/lib/types';
import { achievementCatalog, type AchievementDefinition } from '@/data/achievementCatalog';

export interface AchievementProgress extends AchievementDefinition {
  current: number;
  unlocked: boolean;
}

export const DETECTIVE_LEVEL_QUESTION_THRESHOLDS = [0, 5, 15, 30, 60, 100] as const;

/** Optional evidence emitted by a future review flow. Unknown shapes are ignored. */
export interface MistakeReviewEvidence {
  questionId?: string;
  correct?: boolean;
}

export type AchievementStateInput = Readonly<Partial<Omit<GameState, 'mistakeReviewAttempts' | 'unlockedAvatarItemIds'>> & {
  mistakeReviewAttempts?: readonly MistakeReviewEvidence[];
  unlockedAvatarItemIds?: readonly string[];
}>;

function validEvents(state: AchievementStateInput): LearningEvent[] {
  return Array.isArray(state.learningEvents) ? state.learningEvents.filter((event) =>
    Boolean(event && typeof event.eventId === 'string' && typeof event.timestamp === 'string'),
  ) : [];
}

function uniqueNonEmpty(values: Iterable<string | undefined>): Set<string> {
  return new Set(Array.from(values).filter((value): value is string =>
    typeof value === 'string' && value.trim().length > 0 && !value.includes('_reinforce_'),
  ));
}

function getMetricValues(state: AchievementStateInput): Record<AchievementDefinition['currentMetric'], number> {
  const events = validEvents(state);
  const completed = events.filter((event) => event.eventType === 'question_completed' && event.result !== 'incorrect');
  const uniqueQuestions = uniqueNonEmpty([
    ...completed.map((event) => event.questionId),
    ...(Array.isArray(state.completedQuestions) ? state.completedQuestions : []),
  ]);

  // Only dated, actual learning events contribute. Legacy totalCompleted has no dates and is not guessed.
  const activeDays = uniqueNonEmpty(completed.flatMap((event) => {
    const date = new Date(event.timestamp);
    return Number.isNaN(date.getTime()) ? [] : [`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`];
  }));

  const correctedQuestions = uniqueNonEmpty([
    ...(Array.isArray(state.mistakes) ? state.mistakes.filter((item) => item?.retriedCorrect).map((item) => item.questionId) : []),
    ...(Array.isArray(state.mistakeReviewAttempts)
      ? state.mistakeReviewAttempts.filter((attempt) => attempt && attempt.correct === true).map((attempt) => attempt.questionId)
      : []),
  ]);

  // The earliest attempt within each actual question instance decides first-try credit.
  const attemptsByInstance = new Map<string, LearningEvent[]>();
  for (const event of events) {
    if (event.eventType !== 'attempt_submitted' || !event.questionId) continue;
    const instanceKey = event.questionInstanceId || event.questionId;
    attemptsByInstance.set(instanceKey, [...(attemptsByInstance.get(instanceKey) || []), event]);
  }
  const earliestAttempts = Array.from(attemptsByInstance.values()).map((attempts) =>
    attempts.map((event, index) => ({ event, index }))
      .sort((left, right) => left.event.timestamp.localeCompare(right.event.timestamp) || left.index - right.index)[0].event,
  );
  // A first-try award requires explicit known evidence; legacy unknown attempts do not count.
  const independentFirstTry = uniqueNonEmpty(earliestAttempts
    .filter((event) => event.result === 'correct'
      && event.firstAttemptKnown === true
      && event.completionMode === 'independent'
      && event.hintLevel === 'none')
    .map((event) => event.questionId));

  const challengeQuestions = uniqueNonEmpty(completed
    .filter((event) => event.role === 'stretch' || event.role === 'olympiad')
    .map((event) => event.questionId));

  const distinctSkills = uniqueNonEmpty(completed.flatMap((event) => Array.isArray(event.skillIds) ? event.skillIds : []));

  return {
    unique_questions: uniqueQuestions.size,
    active_days: activeDays.size,
    corrected_questions: correctedQuestions.size,
    independent_first_try: independentFirstTry.size,
    challenge_questions: challengeQuestions.size,
    distinct_skills: distinctSkills.size,
  };
}

/** Pure, read-only achievement calculation. Repeated events for one question never inflate question milestones. */
export function getAchievementProgress(state: AchievementStateInput): AchievementProgress[] {
  const metrics = getMetricValues(state);
  return achievementCatalog.map((achievement) => {
    const current = metrics[achievement.currentMetric];
    return { ...achievement, current, unlocked: current >= achievement.target };
  });
}

/** Level from distinct completed questions, never stars; a valid higher legacy level is retained. */
export function getDetectiveLevel(state: AchievementStateInput): number {
  const questionCount = getMetricValues(state).unique_questions;
  const earnedLevel = DETECTIVE_LEVEL_QUESTION_THRESHOLDS.reduce((level, threshold, index) =>
    questionCount >= threshold ? Math.max(level, index + 1) : level, 1);
  const legacyLevel = Number.isInteger(state.level) && (state.level as number) >= 1 && (state.level as number) <= 6
    ? state.level as number
    : 1;
  return Math.max(earnedLevel, legacyLevel);
}
