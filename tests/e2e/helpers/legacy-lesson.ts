import { expect, type Page } from '@playwright/test';
import { getQuestionById } from '../../../data/questions';
import { inferAnswerSchema } from '../../../lib/answerSchema';

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
  const feedbackDialog = page.getByRole('dialog');
  if (await feedbackDialog.isVisible().catch(() => false)) {
    const continueLearning = feedbackDialog.getByRole('button', { name: '继续学习', exact: true });
    if (await continueLearning.isVisible().catch(() => false)) await continueLearning.click();
    else {
      const close = feedbackDialog.getByRole('button', { name: '关闭反馈', exact: true });
      if (await close.isVisible().catch(() => false)) await close.click();
    }
    await expect(feedbackDialog).toHaveCount(0);
  }
  const beforeState = await currentLessonState(page);
  const questionId = beforeState?.questionId;
  if (!questionId) throw new Error('No current lesson question');
  const answer = await currentCorrectAnswer(page);
  if (expectedAnswer !== undefined) expect(answer, `Fixture oracle for ${questionId}`).toBe(expectedAnswer);
  const beforeAttempts = await attemptsForCurrentQuestion(page, questionId);
  const question = getQuestionById(questionId);
  if (!question) throw new Error(`Question ${questionId} is not registered`);
  const schema = inferAnswerSchema(question);
  let input = page.locator('input[name="answer"]').first();
  if (schema.kind === 'multi_field') {
    for (const field of schema.fields) {
      const value = question.subAnswers?.find(item => item.id === field.id)?.answer;
      expect(value, `${questionId}:${field.id} has a reviewed answer`).toBeDefined();
      await page.getByTestId(`lesson-answer-input-${field.id}`).fill(String(value).replace(/[%％]$/, ''));
    }
  } else if (schema.kind === 'choice') {
    const option = schema.options.find(item => String(item.value) === answer || item.id === answer);
    expect(option, `choice answer for ${questionId}`).toBeDefined();
    await page.getByRole('button', { name: option!.label, exact: true }).click();
  } else if (schema.kind === 'comparison_symbol') {
    await page.getByRole('button', { name: answer, exact: true }).click();
  } else if (schema.kind === 'money' && schema.inputMode === 'yuan_jiao') {
    const match = answer.match(/^(\d+)元(?:(\d+)角)?$/);
    expect(match, `yuan-jiao answer for ${questionId}`).not.toBeNull();
    const inputs = page.locator('form input');
    await inputs.nth(0).fill(match![1]);
    await inputs.nth(1).fill(match![2] || '0');
  } else {
    await expect(input).toBeVisible();
    await input.fill(answer.replace(/[%％]$/, ''));
  }
  const formValue = await page.evaluate(() => {
    const form = document.querySelector('form');
    return form ? new FormData(form).get('answer') : null;
  });
  if (method === 'enter') await page.locator('form').press('Enter');
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
