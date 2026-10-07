import { expect, type Page } from '@playwright/test';

export type SubmitMethod = 'click' | 'enter';

export async function currentLessonState(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.getState());
}

export async function currentCorrectAnswer(page: Page): Promise<string> {
  const answer = await page.evaluate(() => (window as any).MATH_DETECTIVE_TEST?.getCorrectAnswer?.());
  if (answer === null || answer === undefined) throw new Error('Current lesson question has no answer');
  return String(answer);
}

async function attemptsForCurrentQuestion(page: Page, questionId: string): Promise<any[]> {
  return page.evaluate((id) => {
    const raw = localStorage.getItem('math-detective-state');
    if (!raw) return [];
    const state = JSON.parse(raw);
    return (state.learningEvents || []).filter((event: any) => event.eventType === 'attempt_submitted' && event.questionId === id);
  }, questionId);
}

/** Submit the currently displayed question through its real answer form exactly once. */
export async function submitCurrentAnswerThroughUi(page: Page, method: SubmitMethod = 'click', expectedAnswer?: string) {
  const beforeState = await currentLessonState(page);
  const questionId = beforeState?.questionId;
  if (!questionId) throw new Error('No current lesson question');
  const answer = await currentCorrectAnswer(page);
  if (expectedAnswer !== undefined) expect(answer, `Fixture oracle for ${questionId}`).toBe(expectedAnswer);
  const beforeAttempts = await attemptsForCurrentQuestion(page, questionId);
  const input = page.locator('input[name="answer"]').first();
  await expect(input).toBeVisible();
  await input.fill(answer);
  const formValue = await page.evaluate(() => {
    const form = document.querySelector('form');
    return form ? new FormData(form).get('answer') : null;
  });
  if (method === 'enter') await input.press('Enter');
  else await page.locator('button[type="submit"]').first().click();

  await expect.poll(async () => (await attemptsForCurrentQuestion(page, questionId)).length, {
    message: `Expected one recorded attempt for ${questionId} after one UI submit`,
  }).toBe(beforeAttempts.length + 1);

  const afterAttempts = await attemptsForCurrentQuestion(page, questionId);
  expect(afterAttempts.at(-1)?.result, 'Submitted answer should be recorded as correct').toBe('correct');
  const afterState = await currentLessonState(page);
  expect(afterState?.currentPhase, 'A correct submission should advance to the explanation phase').toBe('explain');
  return { answer, formValue, questionId, beforeAttempts: beforeAttempts.length, afterAttempts: afterAttempts.length, afterState };
}
