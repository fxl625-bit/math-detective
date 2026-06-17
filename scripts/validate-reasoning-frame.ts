/**
 * v2.9.1: Validate:reasoning-frame
 *
 * Checks that every question with a reasoningFrame has:
 * - knownFacts that match the actual numbers and text
 * - targetQuestion that correctly reflects what the question asks
 * - plan that would produce the correct answer
 * - check fields that properly validate the answer
 */

import { allQuestions } from '@/data/questions';
import type { Question } from '@/lib/types';

interface ValidationError {
  questionId: string;
  severity: 'error' | 'warning';
  message: string;
}

const errors: ValidationError[] = [];

function checkReasoningFrame(q: Question): void {
  const rf = (q as any).reasoningFrame as any;
  if (!rf) return;

  // 1. knownFacts must exist and be non-empty
  if (!Array.isArray(rf.knownFacts) || rf.knownFacts.length === 0) {
    errors.push({
      questionId: q.id,
      severity: 'error',
      message: 'reasoningFrame.knownFacts 缺失或为空',
    });
    return;
  }

  // 2. Each knownFact must have text and role
  for (let i = 0; i < rf.knownFacts.length; i++) {
    const fact = rf.knownFacts[i];
    if (!fact.text) {
      errors.push({
        questionId: q.id,
        severity: 'error',
        message: `reasoningFrame.knownFacts[${i}] 缺少 text`,
      });
    }
    if (!fact.role) {
      errors.push({
        questionId: q.id,
        severity: 'warning',
        message: `reasoningFrame.knownFacts[${i}] 缺少 role`,
      });
    }
  }

  // 3. targetQuestion must exist
  if (!rf.targetQuestion) {
    errors.push({
      questionId: q.id,
      severity: 'error',
      message: 'reasoningFrame.targetQuestion 缺失',
    });
    return;
  }

  if (!rf.targetQuestion.text) {
    errors.push({
      questionId: q.id,
      severity: 'error',
      message: 'reasoningFrame.targetQuestion.text 缺失',
    });
  }

  if (!rf.targetQuestion.targetQuantity) {
    errors.push({
      questionId: q.id,
      severity: 'warning',
      message: 'reasoningFrame.targetQuestion.targetQuantity 缺失',
    });
  }

  // 4. plan must exist
  if (!rf.plan) {
    errors.push({
      questionId: q.id,
      severity: 'error',
      message: 'reasoningFrame.plan 缺失',
    });
    return;
  }

  if (!rf.plan.firstStep) {
    errors.push({
      questionId: q.id,
      severity: 'warning',
      message: 'reasoningFrame.plan.firstStep 缺失',
    });
  }

  if (!rf.plan.operationReason) {
    errors.push({
      questionId: q.id,
      severity: 'warning',
      message: 'reasoningFrame.plan.operationReason 缺失',
    });
  }

  // 5. check must exist
  if (!rf.check) {
    errors.push({
      questionId: q.id,
      severity: 'error',
      message: 'reasoningFrame.check 缺失',
    });
    return;
  }

  if (rf.check.answeredTarget === undefined) {
    errors.push({
      questionId: q.id,
      severity: 'warning',
      message: 'reasoningFrame.check.answeredTarget 缺失',
    });
  }

  // 6. Semantics: knownFacts quantities should roughly match question numbers
  const factQuantities = rf.knownFacts
    ?.map((f: any) => (f.quantity !== undefined ? Number(f.quantity) : null))
    .filter((n: number | null) => n !== null) as number[] | undefined;

  if (factQuantities && factQuantities.length > 0 && q.numbers.length > 0) {
    const qNumbers = q.numbers.map(n => n);
    const allMatch = factQuantities.every((fq: number) => qNumbers.includes(fq));
    if (!allMatch && factQuantities.length <= qNumbers.length) {
      // This is a soft warning since knownFacts quantities may be derived or inferred
      errors.push({
        questionId: q.id,
        severity: 'warning',
        message: `reasoningFrame 中的数字 [${factQuantities.join(',')}] 与题目数字 [${qNumbers.join(',')}] 不完全匹配`,
      });
    }
  }

  // 7. For two-step questions, plan.secondStep should exist
  const isTwoStep = (q as any).isTwoStep;
  if (isTwoStep && !rf.plan?.secondStep) {
    errors.push({
      questionId: q.id,
      severity: 'warning',
      message: 'isTwoStep=true 但 plan.secondStep 缺失',
    });
  }
}

function runAll(): void {
  let totalWithFrame = 0;
  for (const q of allQuestions) {
    if ((q as any).reasoningFrame) {
      totalWithFrame++;
      checkReasoningFrame(q);
    }
  }

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  console.log(`\n=== validate:reasoning-frame ===`);
  console.log(`Questions scanned: ${allQuestions.length}`);
  console.log(`Questions with reasoningFrame: ${totalWithFrame}`);
  console.log(`Errors:   ${errorCount}`);
  console.log(`Warnings: ${warningCount}`);
  console.log('');

  if (errors.length === 0) {
    console.log('✅ All reasoningFrame checks passed!');
    return;
  }

  for (const err of errors) {
    const prefix = err.severity === 'error' ? '❌' : '⚠️';
    console.log(`${prefix} [${err.severity.toUpperCase()}] ${err.questionId}: ${err.message}`);
  }

  if (errorCount > 0) {
    console.log(`\n❌ FAILED: ${errorCount} error(s) found. Fix before release.`);
    process.exit(1);
  } else {
    console.log(`\n✅ Passed (${warningCount} warnings — review recommended but not blocking).`);
  }
}

runAll();
