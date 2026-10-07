/**
 * v2.9.1: Semester & Progress auto-detection
 *
 * Chinese school calendar:
 * - Spring semester (下学期): February ~ July → "lower"
 * - Fall semester (上学期): September ~ January → "upper"
 *
 * SemesterProgress (month-based within semester):
 * - lower: Feb(early) → Mar(early) → Apr(middle) → May(late) → Jun(review)
 * - upper: Sep(early) → Oct(early) → Nov(middle) → Dec(late) → Jan(review)
 * - summer_bridge: Jul-Aug
 */

import type { Semester, SemesterProgress } from './types';

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
 * Resolve the semester used by profile creation, lesson generation, and cache checks.
 * Legacy `parentSettings.semester` is intentionally not accepted as a manual choice;
 * only the explicit override is authoritative.
 */
export function resolveEffectiveSemester(params: {
  semesterOverride?: Semester;
  date?: Date;
} = {}): { semester: Semester; source: 'override' | 'date' } {
  if (params.semesterOverride === 'upper' || params.semesterOverride === 'lower') {
    return { semester: params.semesterOverride, source: 'override' };
  }
  return { semester: detectSemesterFromDate(params.date), source: 'date' };
}

/**
 * v2.9.1: Detect progress within the current semester based on month.
 *
 * Lower semester (Feb-Jul):
 *   Feb → early (学期初)
 *   Mar → early
 *   Apr → middle (学期中)
 *   May → late (学期末)
 *   Jun → review (期末复习)
 *
 * Upper semester (Sep-Jan):
 *   Sep → early
 *   Oct → early
 *   Nov → middle
 *   Dec → late
 *   Jan → review
 *
 * Jul-Aug → summer_bridge (暑假衔接)
 */
export function detectSemesterProgress(date?: Date, effectiveSemester?: Semester): SemesterProgress {
  const d = date || new Date();
  const month = d.getMonth() + 1; // 1-12
  if (effectiveSemester && effectiveSemester !== detectSemesterFromDate(d)) return 'early';

  // Summer bridge
  if (month === 7 || month === 8) return 'summer_bridge';

  // Lower semester progress (Feb-Jun)
  if (month === 2 || month === 3) return 'early';
  if (month === 4) return 'middle';
  if (month === 5) return 'late';
  if (month === 6) return 'review';

  // Upper semester progress (Sep-Jan)
  if (month === 9 || month === 10) return 'early';
  if (month === 11) return 'middle';
  if (month === 12) return 'late';
  if (month === 1) return 'review';

  // Fallback
  return 'early';
}

/**
 * Build a CurriculumProfile with auto-detected semester and progress.
 */
export function buildCurriculumProfile(params: {
  country?: string;
  textbookEdition?: string;
  grade: number;
  semesterOverride?: Semester;
  date?: Date;
}): {
  country: string;
  textbookEdition: string;
  grade: number;
  semester: Semester;
  semesterOverride?: Semester;
  detectedAt: string;
  semesterProgress?: SemesterProgress;
} {
  const resolution = resolveEffectiveSemester({ semesterOverride: params.semesterOverride, date: params.date });
  const semesterProgress = detectSemesterProgress(params.date, resolution.semester);

  return {
    country: params.country || 'CN',
    textbookEdition: params.textbookEdition || 'PEP',
    grade: params.grade,
    semester: resolution.semester,
    semesterOverride: params.semesterOverride,
    detectedAt: new Date().toISOString(),
    semesterProgress,
  };
}
