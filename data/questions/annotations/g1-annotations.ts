/**
 * v2.9.0: G1 question annotation patches
 *
 * Each entry maps questionId → partial Question override.
 * These patches are merged into original questions at index level,
 * avoiding modifications to the 15 original question data files.
 *
 * Annotation rules:
 * - Single-digit add/sub (answers ≤ 10, no borrowing) → skillIds: single_digit_add/sub, isReview: true
 * - Within-20 add/sub → skillIds: appropriate within-20 skill
 * - Noise-phrase questions → also tagged with information:identify_extra_information
 * - Logic/pattern questions → tagged with appropriate logic/pattern skillIds
 * - Difficulty recalculation: aligned to G1 lower-semester scale
 */

import type { Question } from '@/lib/types';

export interface QuestionAnnotationPatch {
  [questionId: string]: Partial<Question>;
}

/**
 * g1.ts annotations (25 questions)
 * All are single-digit addition/subtraction → review status for G1 lower semester
 */
export const g1Annotations: QuestionAnnotationPatch = {
  g1_01: {
    skillIds: ['addition_subtraction:single_digit_addition'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_02: {
    skillIds: ['addition_subtraction:single_digit_addition'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_03: {
    skillIds: ['addition_subtraction:single_digit_addition'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_04: {
    skillIds: ['addition_subtraction:single_digit_subtraction'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_05: {
    skillIds: ['addition_subtraction:single_digit_subtraction'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_06: {
    skillIds: ['addition_subtraction:single_digit_addition'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_07: {
    skillIds: ['addition_subtraction:single_digit_subtraction'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_08: {
    skillIds: ['addition_subtraction:single_digit_addition'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_09: {
    skillIds: ['addition_subtraction:single_digit_subtraction'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_10: {
    skillIds: ['addition_subtraction:single_digit_addition'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_11: {
    skillIds: ['addition_subtraction:single_digit_subtraction'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_12: {
    skillIds: ['addition_subtraction:single_digit_addition'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_13: {
    skillIds: ['comparison:difference_comparison'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_14: {
    skillIds: ['addition_subtraction:two_digit_plus_one_digit'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1_15: {
    skillIds: ['addition_subtraction:subtraction_within_20_no_borrowing'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1_16: {
    skillIds: ['addition_subtraction:two_digit_plus_one_digit'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1_17: {
    skillIds: ['addition_subtraction:single_digit_subtraction'],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_18: {
    skillIds: ['addition_subtraction:subtraction_within_20_borrowing'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1_19: {
    skillIds: ['addition_subtraction:subtraction_within_20_no_borrowing'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1_20: {
    skillIds: [
      'addition_subtraction:two_digit_plus_one_digit',
      'information:identify_extra_information',
    ],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1_21: {
    skillIds: [
      'addition_subtraction:two_digit_plus_one_digit',
      'information:identify_extra_information',
    ],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1_22: {
    skillIds: [
      'addition_subtraction:two_digit_plus_one_digit',
      'information:identify_extra_information',
    ],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1_23: {
    skillIds: [
      'addition_subtraction:single_digit_subtraction',
      'information:identify_extra_information',
    ],
    curriculumGrade: 1,
    curriculumSemester: 'both',
    isReview: true,
    isStretch: false,
  },
  g1_24: {
    skillIds: [
      'addition_subtraction:two_digit_plus_one_digit',
      'information:identify_extra_information',
    ],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1_25: {
    skillIds: [
      'addition_subtraction:subtraction_within_20_no_borrowing',
      'information:identify_extra_information',
    ],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
};

/**
 * g1-thinking.ts annotations (30 questions)
 * Mix of logic, pattern, comparison, geometry, and arithmetic
 */
export const g1ThinkingAnnotations: QuestionAnnotationPatch = {
  // Logic: ranking
  g1t_01: {
    skillIds: ['logic:simple_ordering'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1t_02: {
    skillIds: ['logic:ranking'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Pattern: number sequences
  g1t_03: {
    skillIds: ['pattern:simple_patterns'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1t_04: {
    skillIds: ['pattern:simple_patterns'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1t_05: {
    skillIds: ['pattern:simple_patterns'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Comparison: reverse reasoning
  g1t_06: {
    skillIds: ['reasoning:reverse_unknown'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1t_07: {
    skillIds: ['comparison:difference_comparison'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Logic: equivalence
  g1t_08: {
    skillIds: ['logic:equivalence'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1t_09: {
    skillIds: ['logic:equivalence'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Geometry: shape counting
  g1t_10: {
    skillIds: ['geometry:shape_counting'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Logic: insufficient info
  g1t_11: {
    skillIds: ['information:insufficient_information', 'logic:simple_ordering'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Information: extra info
  g1t_12: {
    skillIds: ['information:identify_extra_information'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Arithmetic: multi-step (within 20)
  g1t_13: {
    skillIds: ['addition_subtraction:addition_within_20'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Logic: age comparison (constant difference)
  g1t_14: {
    skillIds: ['logic:simple_ordering'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Pattern: visual sequence
  g1t_15: {
    skillIds: ['pattern:simple_patterns'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Logic: balance/equivalence
  g1t_16: {
    skillIds: ['comparison:difference_comparison', 'logic:equivalence'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Logic: multi-step reasoning
  g1t_17: {
    skillIds: ['addition_subtraction:subtraction_within_20_no_borrowing'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Pattern: growth sequence
  g1t_18: {
    skillIds: ['pattern:simple_patterns'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Measurement: interval planting (stretch)
  g1t_19: {
    skillIds: ['measurement:interval_planting'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: true,
  },
  g1t_20: {
    skillIds: ['measurement:interval_planting'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: true,
  },
  g1t_21: {
    skillIds: ['measurement:interval_planting', 'information:identify_extra_information'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: true,
  },
  // Pattern: periodic sequence (stretch)
  g1t_22: {
    skillIds: ['measurement:periodic_sequence'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: true,
  },
  g1t_23: {
    skillIds: ['pattern:simple_patterns'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1t_24: {
    skillIds: ['measurement:periodic_sequence'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: true,
  },
  // Geometry: composite shapes
  g1t_25: {
    skillIds: ['geometry:shape_counting'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1t_26: {
    skillIds: ['geometry:shape_counting'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Logic: enumeration (stretch)
  g1t_27: {
    skillIds: ['logic:enumeration'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: true,
  },
  g1t_28: {
    skillIds: ['logic:enumeration'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  // Missing number / unknown
  g1t_29: {
    skillIds: ['reasoning:missing_number'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
  g1t_30: {
    skillIds: ['reasoning:missing_number'],
    curriculumGrade: 1,
    curriculumSemester: 'lower',
    isReview: false,
    isStretch: false,
  },
};

/**
 * Combined annotations for all G1 questions
 */
export const allG1Annotations: QuestionAnnotationPatch = {
  ...g1Annotations,
  ...g1ThinkingAnnotations,
};
