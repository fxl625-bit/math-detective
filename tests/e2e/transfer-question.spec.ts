import { expect, test } from '@playwright/test';
import { questions, getQuestionById } from '../../data/questions';
import { inferAnswerSchema } from '../../lib/answerSchema';
import { selectTransferQuestion } from '../../lib/independentSolving';
import { openIndependentFixture, readIndependentGame, readIndependentLesson, submitFixtureAnswer } from './helpers/independent-lesson';

test('a transfer question has a separate identity and cannot erase the original explanation record', async ({ page }) => {
  const source = questions.find(question => question.gradeBand === 'G1' && selectTransferQuestion(question, questions).kind === 'matched');
  expect(source, 'A reviewed G1 transfer pair must exist').toBeDefined();
  const selection = selectTransferQuestion(source!, questions);
  expect(selection.kind).toBe('matched');
  await openIndependentFixture(page, source!.id);
  await page.getByTestId('reveal-explanation').click();
  await expect(page.getByTestId('full-explanation')).toBeVisible();
  await page.getByTestId('start-transfer').click();
  const step = (await readIndependentLesson(page)).steps[0];
  expect(step.transfer?.questionId).not.toBe(source!.id);
  expect(step.transfer?.parentQuestionInstanceId).toBe(step.questionInstanceId);
  expect(step.transfer?.questionInstanceId).not.toBe(step.questionInstanceId);
  await expect(page.getByTestId('submit-answer')).toBeVisible();
  // Taking a break is an explicit learning outcome, not a guessed correct answer.
  await page.getByTestId('defer-transfer').click();
  const deferred = (await readIndependentLesson(page)).steps[0];
  expect(deferred.transfer?.status).toBe('deferred');
  expect(deferred.solving?.masteryStatus).toBe('needs_reinforcement');
  expect(deferred.solving?.finalCorrect).toBe(false);
  expect((await readIndependentGame(page)).pointsWallet?.ledger.filter(entry => entry.type === 'perfect_lesson')).toHaveLength(0);
  await page.getByRole('button', { name: /完成，进入下一关/ }).click();
  await expect.poll(async () => (await readIndependentLesson(page)).currentStepIndex).toBe(1);
});

test('a transfer attempt stays separate when the learner first answers wrong and then solves the real variation', async ({ page }) => {
  const source = questions.find(question => question.gradeBand === 'G1' && selectTransferQuestion(question, questions).kind === 'matched');
  expect(source, 'A reviewed G1 transfer pair must exist').toBeDefined();
  const selection = selectTransferQuestion(source!, questions);
  expect(selection.kind).toBe('matched');
  if (selection.kind !== 'matched') throw new Error('Expected the fixed G1 source to have a reviewed transfer variant');
  const transferQuestion = getQuestionById(selection.questionId)!;
  expect(transferQuestion).toBeDefined();
  await openIndependentFixture(page, source!.id);
  await expect(page.getByTestId('lesson-question-prompt')).toHaveText(source!.text);

  // The original is explicitly revealed, then solved as a distinct follow-up.
  await page.getByTestId('reveal-explanation').click();
  await expect(page.getByTestId('full-explanation')).toBeVisible();
  await page.getByTestId('start-transfer').click();
  await expect(page.getByTestId('lesson-question-prompt')).toHaveText(transferQuestion.text);
  expect((await readIndependentLesson(page)).steps[0].solving?.masteryStatus).toBe('needs_reinforcement');

  const beforeGame = await readIndependentGame(page);
  const beforeLesson = await readIndependentLesson(page);
  const originalEvents = (beforeGame.learningEvents || []).filter(event => event.questionId === source!.id);
  const originalAttemptEvents = originalEvents.filter(event => event.eventType === 'attempt_submitted');
  const originalQuestionCompletedEvents = originalEvents.filter(event => event.eventType === 'question_completed');
  const beforePoints = {
    stars: beforeGame.stars,
    ledger: beforeGame.pointsWallet?.ledger.map(entry => ({ ...entry })),
  };
  const beforeOriginalStats = {
    correctCount: beforeGame.correctCount,
    totalCompleted: beforeGame.totalCompleted,
    attempts: originalAttemptEvents.length,
    completions: originalQuestionCompletedEvents.length,
  };

  const wrongAnswer = String(Number(transferQuestion.answer) + 1);
  expect(wrongAnswer).not.toBe(String(transferQuestion.answer));
  await submitFixtureAnswer(page, wrongAnswer);
  let lesson = await readIndependentLesson(page);
  let transfer = lesson.steps[0].transfer!;
  expect(transfer.status).toBe('answering');
  expect(transfer.questionInstanceId).not.toBe(lesson.steps[0].questionInstanceId);
  expect(transfer.solving.attemptCount).toBe(1);
  expect(transfer.solving.firstAttemptCorrect).toBe(false);
  expect(transfer.solving.finalCorrect).toBe(false);
  expect(lesson.steps[0].solving?.masteryStatus).toBe('needs_reinforcement');
  expect(lesson.steps[0].solving?.fullExplanationViewedBeforeSolve).toBe(true);
  let game = await readIndependentGame(page);
  expect({
    stars: game.stars,
    ledger: game.pointsWallet?.ledger.map(entry => ({ ...entry })),
  }).toEqual(beforePoints);
  expect({
    correctCount: game.correctCount,
    totalCompleted: game.totalCompleted,
    attempts: (game.learningEvents || []).filter(event => event.questionId === source!.id && event.eventType === 'attempt_submitted').length,
    completions: (game.learningEvents || []).filter(event => event.questionId === source!.id && event.eventType === 'question_completed').length,
  }).toEqual(beforeOriginalStats);

  // Use the authored question-bank answer, but submit it through the visible answer form.
  await submitFixtureAnswer(page, String(transferQuestion.answer));
  lesson = await readIndependentLesson(page);
  transfer = lesson.steps[0].transfer!;
  expect(transfer.status).toBe('correct');
  expect(transfer.questionId).toBe(transferQuestion.id);
  expect(transfer.solving.attemptCount).toBe(2);
  expect(transfer.solving.firstAttemptCorrect).toBe(false);
  expect(transfer.solving.finalCorrect).toBe(true);
  expect(lesson.steps[0].solving?.masteryStatus).toBe('needs_reinforcement');
  expect(lesson.steps[0].solving?.finalCorrect).toBe(false);
  game = await readIndependentGame(page);
  expect({
    stars: game.stars,
    ledger: game.pointsWallet?.ledger.map(entry => ({ ...entry })),
  }).toEqual(beforePoints);
  expect({
    correctCount: game.correctCount,
    totalCompleted: game.totalCompleted,
    attempts: (game.learningEvents || []).filter(event => event.questionId === source!.id && event.eventType === 'attempt_submitted').length,
    completions: (game.learningEvents || []).filter(event => event.questionId === source!.id && event.eventType === 'question_completed').length,
  }).toEqual(beforeOriginalStats);
});

const gradeTransferSources = [
  { grade: 'G1', questionId: 'g1_01' },
  { grade: 'G2', questionId: 'g2_01' },
  { grade: 'G3', questionId: 'g3_04' },
  { grade: 'G4', questionId: 'g4_19' },
  { grade: 'G5', questionId: 'g5_01' },
  { grade: 'G6', questionId: 'g6_06' },
] as const;

for (const { grade, questionId } of gradeTransferSources) {
  test(`${grade} matched transfer is independently solved without changing original-question records`, async ({ page }) => {
    const source = questions.find(question => question.id === questionId);
    expect(source, `fixed ${grade} source question ${questionId} exists`).toBeDefined();
    const selection = selectTransferQuestion(source!, questions);
    expect(selection.kind, `${questionId} has a reviewed matched variant`).toBe('matched');
    if (selection.kind !== 'matched') throw new Error(`${questionId} no longer has a matched transfer fixture`);
    const target = getQuestionById(selection.questionId);
    expect(target, `matched transfer ${selection.questionId} exists`).toBeDefined();
    expect(target!.gradeBand).toBe(grade);
    expect(target!.text).not.toBe(source!.text);
    expect(target!.numbers).not.toEqual(source!.numbers);
    expect(String(target!.answer)).not.toBe(String(source!.answer));

    // This is a synthetic lesson fixture for learning-state coverage; grade content is still real.
    await openIndependentFixture(page, questionId);
    await page.getByTestId('reveal-explanation').click();
    await expect(page.getByTestId('full-explanation')).toBeVisible();
    await page.getByTestId('start-transfer').click();
    await expect(page.getByTestId('lesson-question-prompt')).toHaveText(target!.text);
    const beforeLesson = await readIndependentLesson(page);
    const originalStep = beforeLesson.steps[0];
    const transferInstanceId = originalStep.transfer!.questionInstanceId;
    expect(originalStep.transfer?.status).toBe('pending');
    expect(originalStep.transfer?.questionId).toBe(target!.id);
    expect(transferInstanceId).not.toBe(originalStep.questionInstanceId);
    expect(originalStep.transfer?.parentQuestionInstanceId).toBe(originalStep.questionInstanceId);

    const beforeGame = await readIndependentGame(page);
    const sourceEvents = (beforeGame.learningEvents || []).filter(event => event.questionId === questionId);
    const beforeOriginalStats = {
      correctCount: beforeGame.correctCount,
      wrongCount: beforeGame.wrongCount,
      answerAttempts: beforeGame.answerAttempts,
      totalCompleted: beforeGame.totalCompleted,
      attempts: sourceEvents.filter(event => event.eventType === 'attempt_submitted').length,
      completions: sourceEvents.filter(event => event.eventType === 'question_completed').length,
    };
    const beforePoints = {
      stars: beforeGame.stars,
      ledger: beforeGame.pointsWallet?.ledger.map(entry => ({ ...entry })),
    };

    // Percent answers use the router's dedicated field; submit only the value before % through the visible form.
    const targetAnswer = String(target!.answer).replace(/[%％]$/, '');
    if (inferAnswerSchema(target!).kind === 'percent') {
      await page.getByTestId('lesson-answer-input').fill(targetAnswer);
      await page.getByTestId('submit-answer').click();
    } else {
      await submitFixtureAnswer(page, targetAnswer);
    }
    await expect(page.getByTestId('full-explanation')).toBeVisible();
    const afterLesson = await readIndependentLesson(page);
    const afterStep = afterLesson.steps[0];
    expect(afterStep.transfer?.status).toBe('correct');
    expect(afterStep.transfer?.questionId).toBe(target!.id);
    expect(afterStep.transfer?.questionInstanceId).toBe(transferInstanceId);
    expect(afterStep.transfer?.solving).toMatchObject({
      attemptCount: 1,
      firstAttemptCorrect: true,
      finalCorrect: true,
      independentCorrect: true,
      masteryStatus: 'independent',
    });
    expect(afterStep.solving).toMatchObject({
      fullExplanationViewedBeforeSolve: true,
      finalCorrect: false,
      masteryStatus: 'needs_reinforcement',
    });
    expect(afterStep.awardedAt).toBe(originalStep.awardedAt);

    const afterGame = await readIndependentGame(page);
    expect({
      correctCount: afterGame.correctCount,
      wrongCount: afterGame.wrongCount,
      answerAttempts: afterGame.answerAttempts,
      totalCompleted: afterGame.totalCompleted,
      attempts: (afterGame.learningEvents || []).filter(event => event.questionId === questionId && event.eventType === 'attempt_submitted').length,
      completions: (afterGame.learningEvents || []).filter(event => event.questionId === questionId && event.eventType === 'question_completed').length,
    }).toEqual(beforeOriginalStats);
    expect({
      stars: afterGame.stars,
      ledger: afterGame.pointsWallet?.ledger.map(entry => ({ ...entry })),
    }).toEqual(beforePoints);
    expect(afterGame.pointsWallet?.ledger.filter(entry => entry.type === 'perfect_lesson')).toHaveLength(0);
    const completedTransferEvents = (afterGame.learningEvents || []).filter(event =>
      event.eventType === 'transfer_completed' && event.questionId === target!.id
      && event.questionInstanceId === transferInstanceId && event.source === 'transfer'
      && event.parentQuestionInstanceId === originalStep.questionInstanceId);
    expect(completedTransferEvents).toHaveLength(1);
  });
}
