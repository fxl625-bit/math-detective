import { expect, type Page } from '@playwright/test';
import { getQuestionById } from '../../../data/questions';
import type { GameState, TodayLesson } from '../../../lib/types';
import { createSolvingEvidence } from '../../../lib/independentSolving';
import { openPlayE2E, seedG1State } from '../helpers';

export async function readIndependentLesson(page: Page): Promise<TodayLesson> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-today-lesson') || 'null'));
}

export async function readIndependentGame(page: Page): Promise<GameState> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}'));
}

export async function openIndependentFixture(page: Page, firstQuestion = 'g1ll_02') {
  await seedG1State(page);
  await openPlayE2E(page);
  const questionIds = [firstQuestion, 'g1ll_03', 'g1ll_29', 'g1ll_07', 'g1ll_32', 'g1ll_68'];
  await page.evaluate(({ ids, evidence }) => {
    const api = window.MATH_DETECTIVE_TEST!;
    const current = api.getLesson() as TodayLesson;
    api.setLesson({
      ...current, lessonId: `${current.lessonId}:independent-fixture`,
      currentStepIndex: 0, completed: false, rewardClaimed: false, rewardShown: false,
      steps: ids.map((id, index) => ({
        id: `independent-slot-${index}`, questionId: id, type: 'answer_only',
        title: '新的数学案件', description: '先自己想，遇到困难可以求助',
        questionInstanceId: `independent-instance-${index}-${id}`,
        phases: ['answer', 'explain'], currentPhaseIndex: 0,
        status: index === 0 ? 'current' : 'locked', requiresAnswer: true,
        solving: { ...evidence, completedTaskIds: [] },
      })),
    });
  }, { ids: questionIds, evidence: createSolvingEvidence() });
  const question = getQuestionById(firstQuestion)!;
  expect(question).toBeDefined();
  await expect(page.getByTestId('lesson-question-prompt')).toHaveText(question.text);
  await expect(page.getByTestId('submit-answer')).toBeVisible();
  return question;
}

export async function submitFixtureAnswer(page: Page, answer: string, enter = false) {
  const input = page.locator('form input[name="answer"]');
  await expect(input).toBeVisible();
  await input.fill(answer);
  if (enter) await input.press('Enter'); else await page.getByTestId('submit-answer').click();
}
