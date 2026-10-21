import { expect, test } from '@playwright/test';
import { buildReasoningTasks } from '../../lib/independentSolving';
import { openIndependentFixture, readIndependentGame, readIndependentLesson, submitFixtureAnswer } from './helpers/independent-lesson';

test('help requires a real judgment; wrong choices do not unlock the next task or reveal the answer', async ({ page }) => {
  const question = await openIndependentFixture(page);
  const tasks = buildReasoningTasks(question);
  expect(tasks.length).toBeGreaterThan(0);
  await page.getByTestId('request-help').click();
  await expect(page.getByTestId('help-task')).toContainText(tasks[0].prompt);
  await expect(page.getByTestId('submit-help-task')).toBeDisabled();
  const wrong = tasks[0].options.find(option => option.id !== tasks[0].correctOptionId)!;
  await page.getByTestId(`help-option-${wrong.id}`).click();
  await page.getByTestId('submit-help-task').click();
  expect((await readIndependentLesson(page)).steps[0].solving?.completedTaskIds).toHaveLength(0);
  expect((await readIndependentGame(page)).learningEvents?.filter(event => event.eventType === 'attempt_submitted')).toHaveLength(0);
  await expect(page.getByTestId('full-explanation')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('help-task')).toContainText(tasks[0].prompt);
  const saved = (await readIndependentLesson(page)).steps[0].solving!;
  expect(saved.hintCount).toBeGreaterThan(0);
  expect(saved.helpWrongCount).toBeGreaterThan(0);
  expect(saved.finalCorrect).toBe(false);
});

test('returning to a wrong original answer preserves the same help task across resume and refresh', async ({ page }) => {
  const question = await openIndependentFixture(page);
  const tasks = buildReasoningTasks(question);
  expect(tasks.length).toBeGreaterThan(0);
  const firstTask = tasks[0];

  await page.getByTestId('request-help').click();
  await expect(page.getByTestId('help-task')).toContainText(firstTask.prompt);
  await page.getByTestId('return-to-answer').click();
  await expect(page.getByTestId('help-task')).toHaveCount(0);
  await submitFixtureAnswer(page, String(Number(question.answer) + 1));
  let step = (await readIndependentLesson(page)).steps[0];
  expect(step.solving?.attemptCount).toBe(1);
  expect(step.solving?.finalCorrect).toBe(false);
  expect(step.solving?.helpTaskIndex).toBe(0);
  expect(step.solving?.completedTaskIds).toHaveLength(0);
  await expect(page.getByTestId('submit-answer')).toBeVisible();

  // Resume the still-unfinished task instead of starting over or creating an unlock.
  await page.getByTestId('continue-help').click();
  await expect(page.getByTestId('help-task')).toContainText(firstTask.prompt);
  await page.reload();
  await expect(page.getByTestId('help-task')).toContainText(firstTask.prompt);
  step = (await readIndependentLesson(page)).steps[0];
  expect(step.solving?.hintCount).toBe(1);
  expect(step.solving?.helpTaskIndex).toBe(0);
  expect(step.solving?.attemptCount).toBe(1);
  expect(step.solving?.completedTaskIds).toHaveLength(0);
  expect(step.solving?.finalCorrect).toBe(false);

  await page.getByTestId('help-option-correct').click();
  await page.getByTestId('submit-help-task').click();
  step = (await readIndependentLesson(page)).steps[0];
  expect(step.solving?.completedTaskIds).toContain(firstTask.id);
  expect(step.solving?.helpTaskIndex).toBe(1);
  expect(step.solving?.attemptCount).toBe(1);
  expect(step.solving?.finalCorrect).toBe(false);
  expect((await readIndependentGame(page)).learningEvents?.filter(event => event.eventType === 'attempt_submitted')).toHaveLength(1);
  await expect(page.getByTestId('submit-answer')).toBeVisible();
});
