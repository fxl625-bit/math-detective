import { expect, test } from '@playwright/test';
import { getQuestionById } from '../../data/questions';
import { authorizeParentAccess, expectParentAccessLocked } from './helpers/parent-access';

test('a begun grade-one course keeps its identity across grade changes and midnight', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-28T10:00:00+08:00'));
  await page.goto('/play');
  await expect(page.getByTestId('submit-answer')).toBeVisible();
  await page.getByTestId('lesson-answer-input').fill('999999');
  await page.getByTestId('submit-answer').click();
  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}'));
  await page.goto('/');
  await page.getByTestId('learning-settings-toggle').click();
  await expect(page.getByTestId('grade-select')).toHaveCount(0);
  await expectParentAccessLocked(page);
  await authorizeParentAccess(page);
  await expect(page.getByTestId('grade-select')).toBeVisible();
  await page.getByTestId('grade-select').selectOption('G6');
  await page.getByTestId('unit-select').selectOption('g6-u3');
  await page.getByTestId('semester-select').selectOption('lower');
  await page.getByTestId('save-learning-settings').click();
  await expect(page.getByRole('status').filter({ hasText: '设置已保存' })).toBeVisible();
  await page.getByTestId('start-lesson').click();
  await expect(page.getByTestId('lesson-answer-input')).toBeVisible();
  for (let index = 0; index < 5; index++) {
    if (index === 2) await page.clock.setFixedTime(new Date('2026-09-29T10:00:00+08:00'));
    await page.reload();
    await expect(page.getByTestId('lesson-answer-input')).toBeVisible();
    const current = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}'));
    expect(current.lessonId).toBe(initial.lessonId);
    expect(current.settingSnapshot.grade).toBe('G1');
    expect(current.steps.map((step: any) => step.questionId)).toEqual(initial.steps.map((step: any) => step.questionId));
  }
});

test('full hints do not submit an answer and remain assisted after refresh', async ({ page }) => {
  // The old full-hint confirmation is replaced by the terminal explanation transaction.
  await page.goto('/play');
  await expect(page.getByTestId('submit-answer')).toBeVisible();
  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}'));
  const question = getQuestionById(initial.steps[0].questionId)!;
  await page.getByTestId('reveal-explanation').click();
  await expect(page.getByTestId('full-explanation')).toContainText(String(question.answer));
  const hinted = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}'));
  expect((hinted.learningEvents || []).filter((event: any) => event.eventType === 'attempt_submitted')).toHaveLength(0);
  const explanationEvent = hinted.learningEvents.find((event: any) => event.eventType === 'explanation_viewed' && event.questionId === question.id);
  expect(explanationEvent).toBeTruthy();
  expect(explanationEvent.solvingEvidence).toMatchObject({
    phase: 'explanation',
    fullExplanationViewedBeforeSolve: true,
    finalCorrect: false,
    masteryStatus: 'needs_reinforcement',
  });
  expect(hinted.learningEvents.some((event: any) => event.eventType === 'question_completed' && event.questionId === question.id)).toBe(false);
  const explanationStep = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}').steps[0]);
  expect(explanationStep.solving).toMatchObject({ phase: 'explanation', fullExplanationViewedBeforeSolve: true, finalCorrect: false, masteryStatus: 'needs_reinforcement' });
  expect(hinted.needsReinforcementQueue?.some((item: any) => item.questionId === question.id)).toBe(true);
  await page.reload();
  await expect(page.getByTestId('full-explanation')).toContainText(String(question.answer));
  await expect(page.getByTestId('submit-answer')).toHaveCount(0);
  await page.getByTestId('start-transfer').click();
  const deferTransfer = page.getByTestId('defer-transfer');
  if (await deferTransfer.isVisible().catch(() => false)) await deferTransfer.click();
  await expect(page.getByRole('button', { name: '完成，进入下一关 →' })).toBeVisible();
  await page.getByRole('button', { name: '完成，进入下一关 →' }).click();
  const completed = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}'));
  expect(completed.learningEvents.some((row: any) => row.eventType === 'question_completed' && row.questionId === question.id)).toBe(false);
  expect(completed.learningEvents.filter((row: any) => row.eventType === 'attempt_submitted')).toHaveLength(0);
  expect(completed.needsReinforcementQueue?.some((item: any) => item.questionId === question.id)).toBe(true);
});
