import { expect, test, type Page } from '@playwright/test';
import { getQuestionById, transferCatalog } from '../../data/questions';
import { inferAnswerSchema } from '../../lib/answerSchema';
import type { Question } from '../../lib/types';
import { openIndependentFixture, readIndependentGame, readIndependentLesson } from './helpers/independent-lesson';

async function fillTransferAnswer(page: Page, question: Question) {
  const schema = inferAnswerSchema(question);
  if (schema.kind === 'multi_field') {
    for (const field of schema.fields) {
      const answer = question.subAnswers?.find(item => item.id === field.id)?.answer;
      expect(answer, `authored answer exists for ${question.id}/${field.id}`).toBeDefined();
      await page.getByTestId(`lesson-answer-input-${field.id}`).fill(String(answer).replace(/[%％]$/, ''));
    }
  } else if (schema.kind === 'money' && schema.inputMode === 'yuan_jiao') {
    const text = String(question.answer);
    const yuan = Number(text.match(/(\d+)元/)?.[1] || 0);
    const jiao = Number(text.match(/(\d+)角/)?.[1] || 0);
    const inputs = page.locator('form input[type="text"]');
    await inputs.nth(0).fill(String(yuan));
    await inputs.nth(1).fill(String(jiao));
  } else if (schema.kind === 'choice') {
    const option = schema.options.find(item => item.id === String(question.answer) || item.value === String(question.answer));
    expect(option).toBeDefined();
    await page.getByRole('button', { name: option!.label, exact: true }).click();
  } else if (schema.kind === 'comparison_symbol') {
    await page.getByRole('button', { name: String(question.answer), exact: true }).click();
  } else if (schema.kind === 'not_enough_information') {
    await page.getByRole('button', { name: '信息不够，没法算', exact: true }).click();
  } else {
    await page.locator('form input').first().fill(schema.kind === 'percent'
      ? String(question.answer).replace(/[%％]$/, '') : String(question.answer));
  }
  await page.getByTestId('submit-answer').click();
}

for (const grade of ['G1', 'G2', 'G3', 'G4', 'G5', 'G6']) {
  test(`${grade} new transfer survives reload and preserves original accuracy and rewards`, async ({ page }) => {
    const entry = transferCatalog.entries.find(item => item.variant.gradeBand === grade
      && inferAnswerSchema(item.variant).kind === 'integer');
    expect(entry, `${grade} must have new integer content beyond old pairs`).toBeDefined();
    const source = getQuestionById(entry!.sourceId)!;
    await openIndependentFixture(page, source.id);
    await page.getByTestId('reveal-explanation').click();
    await page.getByTestId('start-transfer').click();
    await expect(page.getByTestId('lesson-question-prompt')).toHaveText(entry!.variant.text);
    const beforeGame = await readIndependentGame(page);
    const beforeStep = (await readIndependentLesson(page)).steps[0];
    await page.locator('form input').first().fill(String(Number(entry!.variant.answer) + 1));
    await page.getByTestId('submit-answer').click();
    await expect.poll(async () => (await readIndependentLesson(page)).steps[0].transfer?.solving.attemptCount).toBe(1);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('lesson-question-prompt')).toHaveText(entry!.variant.text);
    expect((await readIndependentLesson(page)).steps[0].transfer?.questionInstanceId).toBe(beforeStep.transfer?.questionInstanceId);
    await fillTransferAnswer(page, entry!.variant);
    await expect.poll(async () => (await readIndependentLesson(page)).steps[0].transfer?.status).toBe('correct');
    const afterStep = (await readIndependentLesson(page)).steps[0];
    expect(afterStep.transfer?.solving).toMatchObject({ attemptCount: 2, firstAttemptCorrect: false, finalCorrect: true });
    expect(afterStep.solving).toMatchObject({ firstAttemptCorrect: null, finalCorrect: false,
      fullExplanationViewedBeforeSolve: true, masteryStatus: 'needs_reinforcement' });
    const afterGame = await readIndependentGame(page);
    for (const key of ['correctCount', 'wrongCount', 'answerAttempts', 'totalCompleted', 'pointsWallet', 'stars'] as const) {
      expect(afterGame[key]).toEqual(beforeGame[key]);
    }
    expect(afterGame.learningEvents?.filter(event => event.questionId === entry!.variant.id && event.eventType === 'transfer_completed')).toHaveLength(1);
  });
}

// Test every schema actually added to the transfer catalog, through its visible form.
const kinds = [...new Set(transferCatalog.entries.map(entry => inferAnswerSchema(entry.variant).kind))].sort();
for (const kind of kinds) {
  test(`expanded transfer ${kind} uses its real answer form`, async ({ page }) => {
    const entry = transferCatalog.entries.find(item => inferAnswerSchema(item.variant).kind === kind)!;
    expect(entry).toBeDefined();
    await openIndependentFixture(page, entry.sourceId);
    await page.getByTestId('reveal-explanation').click();
    await page.getByTestId('start-transfer').click();
    await expect(page.getByTestId('lesson-question-prompt')).toHaveText(entry.variant.text);
    await fillTransferAnswer(page, entry.variant);
    await expect.poll(async () => (await readIndependentLesson(page)).steps[0].transfer?.status).toBe('correct');
    expect((await readIndependentLesson(page)).steps[0].solving?.finalCorrect).toBe(false);
  });
}

test('changing a comparison selection does not submit stale or premature answers', async ({ page }) => {
  const entry = transferCatalog.entries.find(item => inferAnswerSchema(item.variant).kind === 'comparison_symbol')!;
  await openIndependentFixture(page, entry.sourceId);
  await page.getByTestId('reveal-explanation').click();
  await page.getByTestId('start-transfer').click();
  const schema = inferAnswerSchema(entry.variant);
  expect(schema.kind).toBe('comparison_symbol');
  if (schema.kind !== 'comparison_symbol') throw new Error('comparison fixture required');
  const wrong = schema.options.find(symbol => symbol !== String(entry.variant.answer))!;
  await page.clock.install();
  await page.getByRole('button', { name: wrong, exact: true }).click();
  await page.getByRole('button', { name: String(entry.variant.answer), exact: true }).click();
  await page.clock.runFor(500);
  await expect(page.getByRole('button', { name: String(entry.variant.answer), exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('submit-answer')).toBeEnabled();
  expect((await readIndependentLesson(page)).steps[0].transfer?.solving.attemptCount).toBe(0);
  await page.getByTestId('submit-answer').click();
  await expect.poll(async () => (await readIndependentLesson(page)).steps[0].transfer?.status).toBe('correct');
  expect((await readIndependentLesson(page)).steps[0].transfer?.solving).toMatchObject({ attemptCount: 1, firstAttemptCorrect: true });
});
