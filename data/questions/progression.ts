/** Independent content batch; intentionally does not import data/questions/index. */
import {
  progressionGrade1Metadata,
  progressionGrade1Questions,
} from './progression/grade1';
import {
  progressionGrade2Metadata,
  progressionGrade2Questions,
} from './progression/grade2';
import {
  progressionGrade3Metadata,
  progressionGrade3Questions,
} from './progression/grade3';
import {
  progressionGrade4Metadata,
  progressionGrade4Questions,
} from './progression/grade4';
import {
  progressionGrade5Metadata,
  progressionGrade5Questions,
} from './progression/grade5';
import {
  progressionGrade6Metadata,
  progressionGrade6Questions,
} from './progression/grade6';
import type { QuestionLearningMetadata } from './progression/helpers';

export const progressionQuestions = [
  ...progressionGrade1Questions,
  ...progressionGrade2Questions,
  ...progressionGrade3Questions,
  ...progressionGrade4Questions,
  ...progressionGrade5Questions,
  ...progressionGrade6Questions,
];

export const questionLearningMetadata: readonly QuestionLearningMetadata[] = [
  ...progressionGrade1Metadata,
  ...progressionGrade2Metadata,
  ...progressionGrade3Metadata,
  ...progressionGrade4Metadata,
  ...progressionGrade5Metadata,
  ...progressionGrade6Metadata,
];
