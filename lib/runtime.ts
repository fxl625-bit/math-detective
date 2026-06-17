/**
 * v2.11.0: Lesson Runtime State — Single Source of Truth
 *
 * Replaces the old multi-field state tracking with ONE authoritative runtime.
 * All old fields (currentPhaseIndex, currentStepIndex, etc.) become migration-only.
 */

// Types defined locally to avoid circular dependencies

// ========== Lesson Runtime ==========

export interface LessonRuntimeState {
  schemaVersion: number;
  lessonId: string;
  questionIndex: number;
  questionId: string;
  screen: LessonScreen;
  interaction: LessonInteraction;
  answerDraft: string;
  attemptCount: number;
  awarded: boolean;
  completedQuestionIds: string[];
}

export type LessonScreen =
  | 'intro'
  | 'known_facts'
  | 'target'
  | 'plan'
  | 'answer'
  | 'feedback'
  | 'lesson_complete';

export type LessonInteraction =
  | 'idle'
  | 'submitting'
  | 'wrong'
  | 'correct'
  | 'advancing';

// ========== ChildStepType: full_solve REMOVED ==========

export type ChildStepType =
  | 'find_numbers'
  | 'find_action_words'
  | 'simulation'
  | 'remove_noise'
  | 'three_question_flow'
  | 'answer_only'
  | 'pattern_answer'
  | 'choice_answer';

export type ExplanationMode = 'standard' | 'full_solution';

// ========== V2.11 Lesson Structure ==========

export interface LessonStepV2 {
  id: string;
  type: ChildStepType;
  title: string;
  description: string;
  questionId: string;
  status: 'locked' | 'current' | 'completed';
  explanationMode: ExplanationMode;
  firstTryCorrect: boolean;
  awardedAt: string | null;
  /** Answer was submitted for this question (prevents bypass) */
  answerSubmitted: boolean;
}

export interface TodayLessonV2 {
  date: string;
  version: string;
  steps: LessonStepV2[];
  currentStepIndex: number;
  completed: boolean;
  caseStoryId?: string;
  rewardClaimed: boolean;
  rewardShown: boolean;
  completedAt: string | null;
  runtime: LessonRuntimeState;
  generationReport: LessonGenerationReportV2;
}

export interface LessonGenerationReportV2 {
  appVersion: string;
  plannerVersion: number;
  grade: number;
  semester: string;
  semesterProgress: string;
  usageStage: number;
  learnerDifficulty: number;
  slotPlan: SlotPlanEntry[];
  fallbackUsed: boolean;
  generatedAt: string;
}

export interface SlotPlanEntry {
  slot: number;
  category: 'semesterReview' | 'foundationalRemediation' | 'currentCore' | 'application' | 'stretch';
  assessmentTier: string;
  targetDifficulty: number;
  questionId: string;
  stepType: ChildStepType;
}

// ========== Helpers ==========

export function createRuntimeState(lessonId: string, questionId: string): LessonRuntimeState {
  return {
    schemaVersion: 1,
    lessonId,
    questionIndex: 0,
    questionId,
    screen: 'intro',
    interaction: 'idle',
    answerDraft: '',
    attemptCount: 0,
    awarded: false,
    completedQuestionIds: [],
  };
}

export const DEFAULT_RUNTIME_STATE: LessonRuntimeState = {
  schemaVersion: 1,
  lessonId: '',
  questionIndex: 0,
  questionId: '',
  screen: 'intro',
  interaction: 'idle',
  answerDraft: '',
  attemptCount: 0,
  awarded: false,
  completedQuestionIds: [],
};

/**
 * v2.11 Replacement for getDefaultPhasesForStepType.
 * Maps child step types to their screen sequence.
 * NO full_solve. NO legacy phases.
 */
export function getScreensForStepType(type: ChildStepType): LessonScreen[] {
  switch (type) {
    case 'find_numbers':
      return ['intro', 'answer', 'feedback'];
    case 'find_action_words':
      return ['intro', 'answer', 'feedback'];
    case 'simulation':
      return ['intro', 'answer', 'feedback'];
    case 'remove_noise':
      return ['intro', 'answer', 'feedback'];
    case 'three_question_flow':
      return ['intro', 'known_facts', 'target', 'plan', 'answer', 'feedback'];
    case 'answer_only':
      return ['intro', 'answer', 'feedback'];
    case 'pattern_answer':
      return ['intro', 'answer', 'feedback'];
    case 'choice_answer':
      return ['intro', 'answer', 'feedback'];
    default:
      return ['intro', 'answer', 'feedback'];
  }
}

/**
 * Map old LessonStepType to new ChildStepType.
 * full_solve maps to three_question_flow if question has reasoningFrame, else answer_only.
 */
export function mapOldStepTypeToNew(
  oldType: string,
  hasReasoningFrame: boolean
): ChildStepType {
  switch (oldType) {
    case 'find_numbers': return 'find_numbers';
    case 'find_action_words': return 'find_action_words';
    case 'simulation': return 'simulation';
    case 'remove_noise': return 'remove_noise';
    case 'full_solve':
      return hasReasoningFrame ? 'three_question_flow' : 'answer_only';
    case 'find_compare_numbers': return 'answer_only';
    case 'spot_extra_info': return 'answer_only';
    case 'spot_missing_info': return 'answer_only';
    default: return 'answer_only';
  }
}
