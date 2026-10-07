import type { GameState, LearningSettings, ParentSettings } from './types';
import { detectSemesterProgress, resolveEffectiveSemester } from './curriculum/semesterDetector';
import type { Semester } from './curriculum/types';
import { learningUnits } from './curriculum/learningPath';

export type LearningGrade = LearningSettings['grade'];
export type ChallengePreference = LearningSettings['challengePreference'];

export interface LearningSettingsInput {
  grade?: unknown;
  semesterOverride?: unknown;
  /** Kept for migration callers; without an explicit source this legacy field is ignored. */
  semester?: unknown;
  textbookEdition?: unknown;
  unitId?: unknown;
  learnedTableRange?: unknown;
  dailyGoal?: unknown;
  challengePreference?: unknown;
  trainingMode?: ParentSettings['trainingMode'];
  schoolHarder?: boolean;
  date?: Date;
}

export interface LessonSignatureInput {
  settings: LearningSettings;
  curriculumVersion: string;
  contentVersion: string;
  trainingMode?: ParentSettings['trainingMode'];
  schoolHarder?: boolean;
}

const grades: readonly LearningGrade[] = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
const editions: readonly LearningSettings['textbookEdition'][] = ['PEP', 'BNUP', 'XISHi', 'generic_cn'];
const challenges: readonly ChallengePreference[] = ['guided', 'balanced', 'stretch'];

function normalizeRows(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  return [...new Set(value.filter((item): item is number =>
    typeof item === 'number' && Number.isInteger(item) && item >= 1 && item <= 9,
  ))].sort((a, b) => a - b);
}

export function normalizeLearningSettings(input: LearningSettingsInput = {}): LearningSettings {
  const grade = grades.includes(input.grade as LearningGrade) ? input.grade as LearningGrade : 'G1';
  const semesterOverride = input.semesterOverride === 'upper' || input.semesterOverride === 'lower'
    ? input.semesterOverride as Semester
    : undefined;
  const semesterResolution = resolveEffectiveSemester({ semesterOverride, date: input.date });
  const textbookEdition = editions.includes(input.textbookEdition as LearningSettings['textbookEdition'])
    ? input.textbookEdition as LearningSettings['textbookEdition']
    : 'generic_cn';
  const requestedUnit = typeof input.unitId === 'string' ? learningUnits.find(unit => unit.id === input.unitId) : undefined;
  const unitId = requestedUnit?.grade === grade ? requestedUnit.id : null;
  const dailyGoal = typeof input.dailyGoal === 'number' && Number.isFinite(input.dailyGoal) && input.dailyGoal >= 0
    ? Math.floor(input.dailyGoal)
    : 5;
  const challengePreference = challenges.includes(input.challengePreference as ChallengePreference)
    ? input.challengePreference as ChallengePreference
    : 'balanced';

  return {
    schemaVersion: 1,
    grade,
    semester: semesterResolution.semester,
    semesterSource: semesterResolution.source === 'override' ? 'manual' : 'auto',
    textbookEdition,
    unitId,
    learnedTableRange: normalizeRows(input.learnedTableRange),
    dailyGoal,
    challengePreference,
  };
}

export function normalizeLearningSettingsFromParent(
  parentSettings: ParentSettings,
  options: { date?: Date; learnedTableRange?: unknown; unitId?: unknown; challengePreference?: unknown } = {},
): LearningSettings {
  const nested = parentSettings.learningSettings;
  const hasCanonical = nested?.schemaVersion === 1;
  const explicitOverride = hasCanonical && nested.semesterSource === 'manual'
    ? nested.semester
    : !hasCanonical && (parentSettings.semesterOverride === 'upper' || parentSettings.semesterOverride === 'lower')
    ? parentSettings.semesterOverride
    : undefined;
  return normalizeLearningSettings({
    grade: hasCanonical ? nested.grade : parentSettings.gradeBand,
    semesterOverride: explicitOverride,
    // Legacy parentSettings.semester is intentionally not a manual source.
    semester: parentSettings.semester,
    textbookEdition: hasCanonical ? nested.textbookEdition : parentSettings.textbookEdition,
    dailyGoal: hasCanonical ? nested.dailyGoal : parentSettings.dailyGoal,
    trainingMode: parentSettings.trainingMode,
    schoolHarder: parentSettings.schoolHarder,
    unitId: options.unitId ?? nested?.unitId,
    learnedTableRange: options.learnedTableRange ?? nested?.learnedTableRange,
    challengePreference: options.challengePreference ?? nested?.challengePreference,
    date: options.date,
  });
}

export function updateLearningSettingsState(
  state: GameState,
  patch: Partial<ParentSettings>,
  date = new Date(),
): GameState {
  const nestedPatch = patch.learningSettings;
  const priorNested = state.parentSettings.learningSettings;
  const nestedMerge = { ...priorNested, ...nestedPatch } as LearningSettings | undefined;
  if (nestedMerge) {
    if (patch.gradeBand) nestedMerge.grade = patch.gradeBand === 'OlympiadIntro' ? 'G1' : patch.gradeBand;
    if (patch.textbookEdition) nestedMerge.textbookEdition = patch.textbookEdition;
    if (patch.dailyGoal !== undefined) nestedMerge.dailyGoal = patch.dailyGoal;
    if (Object.prototype.hasOwnProperty.call(patch, 'semesterOverride')) {
      nestedMerge.semesterSource = patch.semesterOverride ? 'manual' : 'auto';
      if (patch.semesterOverride) nestedMerge.semester = patch.semesterOverride;
    }
  }
  const parentSettings = {
    ...state.parentSettings,
    ...patch,
    learningSettings: nestedMerge,
  };
  if (Object.prototype.hasOwnProperty.call(patch, 'semesterOverride')) {
    parentSettings.semesterOverride = patch.semesterOverride;
    if (patch.semesterOverride === undefined && parentSettings.learningSettings) {
      parentSettings.learningSettings = { ...parentSettings.learningSettings, semesterSource: 'auto' };
    }
  } else if (nestedMerge?.semesterSource === 'manual') {
    parentSettings.semesterOverride = nestedMerge.semester;
  } else if (nestedMerge?.semesterSource === 'auto') {
    parentSettings.semesterOverride = undefined;
  }
  const canonical = normalizeLearningSettingsFromParent(parentSettings, {
    date,
    unitId: parentSettings.learningSettings?.unitId,
    learnedTableRange: parentSettings.learningSettings?.learnedTableRange,
    challengePreference: parentSettings.learningSettings?.challengePreference,
  });
  const grade = Number(canonical.grade.slice(1));
  const priorProfile = state.curriculumProfile;
  const sameProfile = priorProfile?.grade === grade
    && priorProfile.textbookEdition === canonical.textbookEdition
    && priorProfile.semester === canonical.semester
    && priorProfile.semesterOverride === (canonical.semesterSource === 'manual' ? canonical.semester : undefined);

  parentSettings.learningSettings = canonical;
  parentSettings.gradeBand = canonical.grade;
  parentSettings.semesterOverride = canonical.semesterSource === 'manual' ? canonical.semester : undefined;
  parentSettings.textbookEdition = canonical.textbookEdition;
  parentSettings.dailyGoal = canonical.dailyGoal;
  return {
    ...state,
    parentSettings,
    curriculumProfile: {
      country: priorProfile?.country || 'CN',
      textbookEdition: canonical.textbookEdition,
      grade,
      semester: canonical.semester,
      semesterOverride: canonical.semesterSource === 'manual' ? canonical.semester : undefined,
      detectedAt: sameProfile && priorProfile ? priorProfile.detectedAt : new Date().toISOString(),
      semesterProgress: detectSemesterProgress(date),
    },
  };
}

export function createLessonSignature(input: LessonSignatureInput): string {
  const { settings } = input;
  const unit = settings.unitId ? learningUnits.find(candidate => candidate.id === settings.unitId) : undefined;
  const signature = {
    schemaVersion: settings.schemaVersion,
    grade: settings.grade,
    semester: settings.semester,
    textbookEdition: settings.textbookEdition,
    unitId: settings.unitId,
    learnedTableRange: unit?.id === 'g2-u1' || unit?.id === 'g2-u2' ? settings.learnedTableRange : null,
    dailyGoal: settings.dailyGoal,
    challengePreference: settings.challengePreference,
    trainingMode: input.trainingMode ?? null,
    schoolHarder: input.schoolHarder ?? false,
    curriculumVersion: input.curriculumVersion,
    contentVersion: input.contentVersion,
  };
  return JSON.stringify(signature);
}
