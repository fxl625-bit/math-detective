import { expect, test, type Page } from '@playwright/test';
import { getQuestionById } from '../../data/questions';
import { inferAnswerSchema, parseMoneyToJiao } from '../../lib/answerSchema';
import { questionLearningMetadata } from '../../data/questions/progression';
import type { Question, TodayLesson } from '../../lib/types';
import { authorizeParentAccess, expectParentAccessLocked } from './helpers/parent-access';

const readLesson = (page: Page): Promise<TodayLesson> => page.evaluate(() =>
  JSON.parse(localStorage.getItem('math-detective-today-lesson') || 'null'),
);
const readGame = (page: Page) => page.evaluate(() =>
  JSON.parse(localStorage.getItem('math-detective-state') || '{}'),
);

async function fillRealAnswer(page: Page, question: Question) {
  const schema = inferAnswerSchema(question);
  if (schema.kind === 'multi_field') {
    for (const field of schema.fields) {
      const answer = question.subAnswers?.find(item => item.id === field.id)?.answer;
      expect(answer, `${question.id}:${field.id} has an authored answer`).toBeDefined();
      await page.getByTestId(`lesson-answer-input-${field.id}`).fill(String(answer));
    }
  } else if (schema.kind === 'choice') {
    const option = schema.options.find(item => String(item.value) === String(question.answer) || item.id === String(question.answer));
    expect(option, `choice answer for ${question.id}`).toBeDefined();
    await page.getByRole('button', { name: option!.label, exact: true }).click();
  } else if (schema.kind === 'comparison_symbol') {
    await page.getByRole('button', { name: String(question.answer), exact: true }).click();
  } else if (schema.kind === 'money' && schema.inputMode === 'yuan_jiao') {
    const amount = typeof question.answer === 'number' ? Math.round(question.answer * 10) : parseMoneyToJiao(String(question.answer));
    expect(amount).not.toBeNull();
    const inputs = page.locator('form input');
    await inputs.nth(0).fill(String(Math.floor(amount! / 10)));
    await inputs.nth(1).fill(String(amount! % 10));
  } else {
    await page.getByTestId('lesson-answer-input').fill(String(question.answer));
  }
  await page.getByTestId('submit-answer').click();
}

async function advanceAndCloseFeedback(page: Page, expectedStepIndex: number) {
  await expect(page.getByTestId('continue-feedback')).toBeVisible();
  await page.getByTestId('continue-feedback').click();
  await expect.poll(async () => {
    const lesson = await readLesson(page);
    return lesson.completed ? lesson.steps.length : lesson.currentStepIndex;
  }).toBe(expectedStepIndex);
  const closeFeedback = page.getByRole('button', { name: '关闭反馈', exact: true });
  if (await closeFeedback.isVisible().catch(() => false)) await closeFeedback.click();
}

test('a real non-foundation explanation is first in the next-day G2 unit lesson', async ({ page }) => {
  test.setTimeout(180000);
  await page.clock.setFixedTime(new Date('2026-10-21T10:00:00+08:00'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('learning-settings-toggle').click();
  await expect(page.getByTestId('grade-select')).toHaveCount(0);
  await expectParentAccessLocked(page);
  await authorizeParentAccess(page);
  await expect(page.getByTestId('grade-select')).toBeVisible();
  await page.getByTestId('grade-select').selectOption('G2');
  await page.getByTestId('unit-select').selectOption('g2-u3');
  await page.getByTestId('semester-select').selectOption('upper');
  await page.getByTestId('save-learning-settings').click();
  await expect(page.getByRole('status').filter({ hasText: '设置已保存' })).toBeVisible();
  await page.getByTestId('start-lesson').click();
  await expect(page.getByTestId('submit-answer')).toBeVisible();

  const dayOneLesson = await readLesson(page);
  expect(dayOneLesson.actualCore).toBe(6);
  expect(dayOneLesson.settingSnapshot?.grade).toBe('G2');
  expect(dayOneLesson.settingSnapshot?.unitId).toBe('g2-u3');
  const targetIndex = dayOneLesson.steps.findIndex(step => step.questionId === 'g2_16');
  expect(targetIndex, 'the real G2 unit lesson must contain the application question g2_16').toBeGreaterThanOrEqual(0);
  expect(dayOneLesson.steps[targetIndex].role).toBe('application');
  const targetQuestion = getQuestionById('g2_16')!;
  expect(targetQuestion).toBeDefined();

  for (let index = 0; index < dayOneLesson.steps.length; index += 1) {
    const currentLesson = await readLesson(page);
    expect(currentLesson.currentStepIndex).toBe(index);
    const step = currentLesson.steps[index];
    const question = getQuestionById(step.questionId)!;
    expect(question, `question ${step.questionId} is in the authored bank`).toBeDefined();
    expect(question.gradeBand).toBe('G2');
    await expect(page.getByTestId('lesson-question-prompt')).toHaveText(question.text);

    if (question.id === targetQuestion.id) {
      await page.getByTestId('reveal-explanation').click();
      await expect(page.getByTestId('full-explanation')).toContainText(question.answerSentence || String(question.answer));
      const explained = await readGame(page);
      const explanationEvent = explained.learningEvents.find((event: any) =>
        event.eventType === 'explanation_viewed' && event.questionId === question.id,
      );
      expect(explanationEvent).toBeTruthy();
      expect(explanationEvent.solvingEvidence).toMatchObject({
        phase: 'explanation', fullExplanationViewedBeforeSolve: true, finalCorrect: false, masteryStatus: 'needs_reinforcement',
      });
      expect(explained.needsReinforcementQueue?.some((item: any) => item.questionId === question.id)).toBe(true);
      await page.getByTestId('start-transfer').click();
      const deferTransfer = page.getByTestId('defer-transfer');
      if (await deferTransfer.isVisible().catch(() => false)) await deferTransfer.click();
      await expect(page.getByTestId('continue-feedback')).toBeVisible();
    } else {
      await fillRealAnswer(page, question);
      await expect(page.getByTestId('question-review')).toBeVisible();
    }
    await advanceAndCloseFeedback(page, index + 1);
  }

  await expect(page.getByRole('heading', { name: '今日任务完成', exact: true })).toBeVisible();
  const afterDayOne = await readGame(page);
  const explanationRecord = afterDayOne.learningEvents.find((event: any) =>
    event.eventType === 'explanation_viewed' && event.questionId === targetQuestion.id,
  );
  expect(explanationRecord).toBeTruthy();
  expect(explanationRecord.solvingEvidence).toMatchObject({
    fullExplanationViewedBeforeSolve: true, finalCorrect: false, masteryStatus: 'needs_reinforcement', independentCorrect: false,
  });
  expect(afterDayOne.needsReinforcementQueue?.some((item: any) => item.questionId === targetQuestion.id)).toBe(true);
  const originalExplanationRecord = structuredClone(explanationRecord);

  await page.clock.setFixedTime(new Date('2026-10-22T10:00:00+08:00'));
  await page.goto('/');
  await page.getByTestId('start-lesson').click();
  await expect(page.getByTestId('submit-answer')).toBeVisible();
  const dayTwoLesson = await readLesson(page);
  expect(dayTwoLesson.actualCore).toBe(6);
  expect(dayTwoLesson.steps).toHaveLength(6);
  expect(dayTwoLesson.steps[0].questionId).toBe(targetQuestion.id);
  expect(dayTwoLesson.steps[0].role).toBe('due_review');
  expect(dayTwoLesson.settingSnapshot?.grade).toBe('G2');
  expect(dayTwoLesson.settingSnapshot?.unitId).toBe('g2-u3');
  for (const step of dayTwoLesson.steps) {
    const question = getQuestionById(step.questionId)!;
    const metadata = questionLearningMetadata.find(item => item.questionId === step.questionId);
    expect(question, `day-two question ${step.questionId} is in the authored bank`).toBeDefined();
    expect(question.gradeBand).toBe('G2');
    expect(metadata?.unitId).toBe('g2-u3');
  }
  const afterDayTwoStart = await readGame(page);
  const persistedExplanationRecord = afterDayTwoStart.learningEvents.find((event: any) => event.eventId === originalExplanationRecord.eventId);
  expect(persistedExplanationRecord).toEqual(originalExplanationRecord);
  expect(persistedExplanationRecord.solvingEvidence).toMatchObject({
    phase: 'explanation', fullExplanationViewedBeforeSolve: true, finalCorrect: false,
    masteryStatus: 'needs_reinforcement', independentCorrect: false,
  });
});
