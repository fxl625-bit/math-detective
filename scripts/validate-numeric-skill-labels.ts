/**
 * v2.9.1: Numeric Skill Label Validation
 *
 * Validates that skill labels match the actual numbers in the question.
 *
 * Run: npx tsx -r tsconfig-paths/register scripts/validate-numeric-skill-labels.ts
 * Or: npm run validate:numeric-skill-labels
 *
 * Rules:
 * - two_digit_plus_one_digit: one operand 10-99, another 0-9
 * - two_digit_minus_one_digit: minuend 10-99, subtrahend 0-9
 * - two_digit_plus_tens: one operand 10-99, another is multiple of 10
 * - two_digit_minus_tens: minuend 10-99, subtrahend is multiple of 10
 * - subtraction_within_20_borrowing: minuend 11-19 AND ones digit < subtrahend
 * - subtraction_within_20_no_borrowing: minuend 11-20 AND ones digit >= subtrahend
 * - addition_within_20: both operands single-digit, sum > 10
 * - addition_within_10: both operands single-digit, sum <= 10
 * - single_digit_addition: both operands 0-9, sum <= 10
 * - single_digit_subtraction: both operands 0-9, result >= 0
 * - addition_within_100: at least one operand >= 20, sum <= 100
 * - subtraction_within_100: at least one operand >= 20, result >= 0
 */

import { allQuestions } from '@/data/questions';
import type { Question } from '@/lib/types';

interface NumericValidationResult {
  questionId: string;
  text: string;
  numbers: number[];
  skillIds: string[];
  errors: string[];
  warnings: string[];
}

function extractOperands(q: Question): { operands: number[]; operation: string } {
  // Try to extract from equation string
  const eq = q.equation || '';
  const addMatch = eq.match(/(\d+)\s*\+\s*(\d+)/);
  const subMatch = eq.match(/(\d+)\s*-\s*(\d+)/);

  if (addMatch) {
    return { operands: [parseInt(addMatch[1]), parseInt(addMatch[2])], operation: 'addition' };
  }
  if (subMatch) {
    return { operands: [parseInt(subMatch[1]), parseInt(subMatch[2])], operation: 'subtraction' };
  }
  return { operands: q.numbers, operation: q.operation || 'unknown' };
}

function validateNumericSkillLabel(q: Question): NumericValidationResult {
  const result: NumericValidationResult = {
    questionId: q.id,
    text: q.text,
    numbers: q.numbers,
    skillIds: q.skillIds || [],
    errors: [],
    warnings: [],
  };

  if (!q.skillIds || q.skillIds.length === 0) {
    result.warnings.push('No skillIds assigned');
    return result;
  }

  const { operands, operation } = extractOperands(q);
  if (operands.length < 2) {
    result.warnings.push('Could not extract 2 operands from equation');
    return result;
  }

  const [a, b] = operands;
  const hasTwoDigit = (a >= 10 && a <= 99) || (b >= 10 && b <= 99);
  const hasSingleDigit = (a >= 0 && a <= 9) || (b >= 0 && b <= 9);

  // v2.9.1: Skip strict operation checks for multi-step questions
  const isMultiStep = q.isTwoStep === true || (q as any).problemType === 'multi_step';
  // v2.9.1: Detect money questions (have 元/角 or money: skill)
  const isMoneyQuestion = q.text.includes('元') || q.text.includes('角') ||
    (q.skillIds || []).some(s => (s as string).startsWith('money:'));

  for (const skillId of q.skillIds) {
    switch (skillId) {
      case 'addition_subtraction:two_digit_plus_one_digit':
        if (!(hasTwoDigit && hasSingleDigit)) {
          result.errors.push(
            `Labeled "two_digit_plus_one_digit" but operands are ${a} and ${b} (both ${a <= 9 ? 'single' : 'two'}-digit, ${b <= 9 ? 'single' : 'two'}-digit)`
          );
        }
        break;

      case 'addition_subtraction:two_digit_minus_one_digit':
        if (!(a >= 10 && a <= 99 && b >= 0 && b <= 9)) {
          result.errors.push(
            `Labeled "two_digit_minus_one_digit" but operands are ${a} and ${b}`
          );
        }
        break;

      case 'addition_subtraction:two_digit_plus_tens':
        if (!(hasTwoDigit && (b % 10 === 0 || a % 10 === 0))) {
          result.errors.push(
            `Labeled "two_digit_plus_tens" but operands are ${a} and ${b} (neither is multiple of 10)`
          );
        }
        break;

      case 'addition_subtraction:two_digit_minus_tens':
        if (!(a >= 10 && a <= 99 && b >= 10 && b % 10 === 0)) {
          result.errors.push(
            `Labeled "two_digit_minus_tens" but operands are ${a} and ${b}`
          );
        }
        break;

      case 'addition_subtraction:subtraction_within_20_borrowing': {
        const requiresBorrowing = a >= 11 && a <= 19 && (a % 10) < b;
        if (!isMultiStep && !isMoneyQuestion && operation !== 'subtraction') {
          result.errors.push(`Labeled "subtraction_within_20_borrowing" but operation is ${operation}`);
        } else if (!requiresBorrowing && !isMoneyQuestion) {
          result.errors.push(
            `Labeled "subtraction_within_20_borrowing" but ${a}-${b} does NOT require borrowing (ones digit ${a % 10} >= ${b})`
          );
        }
        break;
      }

      case 'addition_subtraction:subtraction_within_20_no_borrowing': {
        const noBorrowNeeded = a >= 11 && a <= 20 && (a % 10) >= b;
        if (!isMultiStep && !isMoneyQuestion && operation !== 'subtraction') {
          result.errors.push(`Labeled "subtraction_within_20_no_borrowing" but operation is ${operation}`);
        } else if (!noBorrowNeeded && !isMoneyQuestion) {
          result.warnings.push(
            `Labeled "subtraction_within_20_no_borrowing" but ${a}-${b} might need borrowing`
          );
        }
        break;
      }

      case 'addition_subtraction:addition_within_20': {
        const bothSingle = a >= 0 && a <= 9 && b >= 0 && b <= 9;
        const sumGT10 = (a + b) > 10;
        // Skip for multi-step (equation may not reflect all operations)
        if (!isMultiStep && bothSingle && !sumGT10) {
          result.errors.push(
            `Labeled "addition_within_20" but ${a}+${b}=${a + b} ≤ 10 (should be addition_within_10 or single_digit_addition)`
          );
        }
        if (!isMultiStep && !bothSingle) {
          result.warnings.push(
            `Labeled "addition_within_20" but at least one operand is two-digit (${a}, ${b})`
          );
        }
        break;
      }

      case 'addition_subtraction:addition_within_10': {
        const sumLE10 = (a + b) <= 10;
        if (!sumLE10) {
          result.errors.push(
            `Labeled "addition_within_10" but ${a}+${b}=${a + b} > 10`
          );
        }
        break;
      }

      case 'addition_subtraction:single_digit_addition': {
        if (a > 9 || b > 9) {
          result.errors.push(
            `Labeled "single_digit_addition" but operands include two-digit number (${a}, ${b})`
          );
        }
        if ((a + b) > 10) {
          result.warnings.push(
            `Labeled "single_digit_addition" but ${a}+${b}=${a + b} > 10 (might be addition_within_20)`
          );
        }
        break;
      }

      case 'addition_subtraction:single_digit_subtraction': {
        if (a > 9 || b > 9) {
          result.errors.push(
            `Labeled "single_digit_subtraction" but operands include two-digit number (${a}, ${b})`
          );
        }
        break;
      }
    }
  }

  return result;
}

// ========== Main ==========

const questions = allQuestions;
let totalErrors = 0;
let totalWarnings = 0;
const errorResults: NumericValidationResult[] = [];
const warningResults: NumericValidationResult[] = [];

for (const q of questions) {
  const result = validateNumericSkillLabel(q);
  if (result.errors.length > 0) {
    totalErrors += result.errors.length;
    errorResults.push(result);
  }
  if (result.warnings.length > 0) {
    totalWarnings += result.warnings.length;
    warningResults.push(result);
  }
}

console.log(`\n=== Numeric Skill Label Validation (v2.9.1) ===`);
console.log(`Total questions checked: ${questions.length}`);
console.log(`Errors: ${totalErrors}`);
console.log(`Warnings: ${totalWarnings}`);
console.log('');

if (errorResults.length > 0) {
  console.log('--- ERRORS ---');
  for (const r of errorResults) {
    console.log(`[${r.questionId}] ${r.text.slice(0, 60)}...`);
    for (const e of r.errors) {
      console.log(`  ERROR: ${e}`);
    }
  }
}

if (warningResults.length > 0) {
  console.log('--- WARNINGS ---');
  for (const r of warningResults) {
    console.log(`[${r.questionId}] ${r.text.slice(0, 60)}...`);
    for (const w of r.warnings) {
      console.log(`  WARN: ${w}`);
    }
  }
}

if (totalErrors === 0) {
  console.log('All numeric skill labels are valid!');
  process.exit(0);
} else {
  console.log(`\nFAILED: ${totalErrors} error(s) found.`);
  process.exit(1);
}
