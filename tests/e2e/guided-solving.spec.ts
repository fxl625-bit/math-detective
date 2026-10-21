import { expect, test } from '@playwright/test';
import { buildReasoningTasks } from '../../lib/independentSolving';
import { getQuestionById } from '../../data/questions';
import { openPlayE2E, seedG1State } from './helpers';
import { submitCurrentAnswerThroughUi } from './helpers/legacy-lesson';
import { openIndependentFixture, readIndependentGame, readIndependentLesson, submitFixtureAnswer } from './helpers/independent-lesson';

test('completing reasoning tasks still requires answering the original question', async ({ page }) => {
  const question = await openIndependentFixture(page);
  const tasks = buildReasoningTasks(question);
  expect(tasks.length).toBeGreaterThan(0);
  await page.getByTestId('request-help').click();
  for (const task of tasks) {
    if (task !== tasks[0]) await page.getByTestId('request-help').click();
    await expect(page.getByTestId('help-task')).toContainText(task.prompt);
    await page.getByTestId(`help-option-${task.correctOptionId}`).click();
    await page.getByTestId('submit-help-task').click();
  }
  const lesson = await readIndependentLesson(page);
  expect(lesson.currentStepIndex).toBe(0);
  expect(lesson.steps[0].solving?.finalCorrect).toBe(false);
  expect(lesson.steps[0].awardedAt).toBeUndefined();
  expect((await readIndependentGame(page)).learningEvents?.filter(event => event.eventType === 'attempt_submitted')).toHaveLength(0);
  await expect(page.getByTestId('full-explanation')).toHaveCount(0);
  await submitFixtureAnswer(page, '6');
  await expect(page.getByTestId('question-review')).toBeVisible();
  const solved = (await readIndependentLesson(page)).steps[0].solving!;
  expect(solved.masteryStatus).toBe('assisted');
  expect(solved.independentCorrect).toBe(false);
});

test('help followed by six genuine first correct submissions still earns exactly one perfect-lesson point', async ({ page }) => {
  await seedG1State(page);
  await openPlayE2E(page);
  const initial = await readIndependentLesson(page);
  expect(initial.steps).toHaveLength(6);
  expect(new Set(initial.steps.map(step => step.role)).size).toBe(6);
  for (let index = 0; index < 6; index += 1) {
    const step = (await readIndependentLesson(page)).steps[index];
    const question = getQuestionById(step.questionId)!;
    const task = buildReasoningTasks(question)[0];
    await page.getByTestId('request-help').click();
    await page.getByTestId(`help-option-${task.correctOptionId}`).click();
    await page.getByTestId('submit-help-task').click();
    await submitCurrentAnswerThroughUi(page, 'click', String(question.answer));
    await expect(page.getByTestId('question-review')).toBeVisible();
    const solved = (await readIndependentLesson(page)).steps[index].solving!;
    expect(solved.firstAttemptCorrect).toBe(true);
    expect(solved.independentCorrect).toBe(false);
    expect(solved.masteryStatus).toBe('assisted');
    await page.getByTestId('continue-feedback').click();
    await expect.poll(async () => {
      const lesson = await readIndependentLesson(page);
      return lesson.completed ? 6 : lesson.currentStepIndex;
    }).toBe(index + 1);
    const feedback = page.getByRole('button', { name: '关闭反馈', exact: true });
    if (await feedback.isVisible()) await feedback.click();
  }
  await expect(page.getByRole('heading', { name: '今日任务完成', exact: true })).toBeVisible();
  const state = await readIndependentGame(page);
  expect(state.learningEvents?.filter(event => event.eventType === 'attempt_submitted' && event.source !== 'transfer')).toHaveLength(6);
  expect(state.pointsWallet?.ledger.filter(entry => entry.type === 'perfect_lesson')).toHaveLength(1);
  expect(state.pointsWallet?.ledger.find(entry => entry.type === 'perfect_lesson')?.unitsDelta).toBe(2);
  await page.reload();
  expect((await readIndependentGame(page)).pointsWallet?.ledger).toEqual(state.pointsWallet?.ledger);
});
