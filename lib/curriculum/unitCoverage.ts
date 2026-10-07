import { allQuestions, isQuestionSafeForNewLesson } from '@/data/questions';
import { questionLearningMetadata, progressionQuestions } from '@/data/questions/progression';
import type { LearningGrade, LearningRole, LearningUnit } from './learningPath';
import { learningUnits } from './learningPath';

export interface LearningUnitCoverage {
  unit: LearningUnit;
  roleCounts: Record<LearningRole, number>;
  questionIdsByRole: Record<LearningRole, string[]>;
  available: boolean;
}

const minimumByRole: Record<LearningRole, number> = {
  foundation: 3,
  application: 2,
  advanced: 2,
  olympiad: 2,
};

/** Shared approved-unit truth: only grade-matched, safe, metadata-joined content counts. */
export function getLearningUnitCoverage(grade?: LearningGrade): LearningUnitCoverage[] {
  const questions = new Map([...allQuestions, ...progressionQuestions].map(question => [question.id, question]));
  return learningUnits.filter(unit => !grade || unit.grade === grade).map(unit => {
    const questionIdsByRole: Record<LearningRole, string[]> = {
      foundation: [], application: [], advanced: [], olympiad: [],
    };
    for (const metadata of questionLearningMetadata) {
      if (metadata.unitId !== unit.id) continue;
      const question = questions.get(metadata.questionId);
      if (!question || question.gradeBand !== unit.grade || !isQuestionSafeForNewLesson(question)) continue;
      questionIdsByRole[metadata.role].push(question.id);
    }
    for (const role of Object.keys(questionIdsByRole) as LearningRole[]) {
      questionIdsByRole[role] = [...new Set(questionIdsByRole[role])];
    }
    const roleCounts = Object.fromEntries((Object.keys(questionIdsByRole) as LearningRole[])
      .map(role => [role, questionIdsByRole[role].length])) as Record<LearningRole, number>;
    const available = (Object.keys(minimumByRole) as LearningRole[])
      .every(role => roleCounts[role] >= minimumByRole[role])
      && new Set(Object.values(questionIdsByRole).flat()).size >= 9;
    return { unit, roleCounts, questionIdsByRole, available };
  });
}

export function getAvailableLearningUnits(grade?: LearningGrade): LearningUnit[] {
  return getLearningUnitCoverage(grade).filter(result => result.available).map(result => result.unit);
}
