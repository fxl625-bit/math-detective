/**
 * v2.9.0: Semester auto-detection
 *
 * Chinese school calendar:
 * - Spring semester (下学期): February ~ July → "lower"
 * - Fall semester (上学期): September ~ January → "upper"
 *
 * Monthly mapping:
 * Feb-Jun: lower
 * Jul: transition (default lower)
 * Aug: summer break (default upper — approaching fall)
 * Sep-Jan: upper
 */

import type { Semester } from './types';

/**
 * Auto-detect semester from current month.
 * Chinese school calendar: Sep-Jan = upper (上学期), Feb-Jul = lower (下学期).
 */
export function detectSemesterFromDate(date?: Date): Semester {
  const d = date || new Date();
  const month = d.getMonth() + 1; // 1-12

  // Feb(2) through Jul(7) → lower semester (spring/下学期)
  if (month >= 2 && month <= 7) return 'lower';
  // Aug(8) → treat as transition, default to upper (approaching fall)
  // Sep(9) through Jan(1) → upper semester (fall/上学期)
  return 'upper';
}

/**
 * Build a CurriculumProfile with auto-detected semester.
 */
export function buildCurriculumProfile(params: {
  country?: string;
  textbookEdition?: string;
  grade: number;
  semesterOverride?: Semester;
}): {
  country: string;
  textbookEdition: string;
  grade: number;
  semester: Semester;
  semesterOverride?: Semester;
  detectedAt: string;
} {
  const detectedSemester = detectSemesterFromDate();

  return {
    country: params.country || 'CN',
    textbookEdition: params.textbookEdition || 'PEP',
    grade: params.grade,
    semester: params.semesterOverride || detectedSemester,
    semesterOverride: params.semesterOverride,
    detectedAt: new Date().toISOString(),
  };
}
