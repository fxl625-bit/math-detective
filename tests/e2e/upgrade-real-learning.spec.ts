import { test, expect, type Page } from '@playwright/test';
import { getQuestionById } from '../../data/questions';
import { inferAnswerSchema, parseMoneyToJiao } from '../../lib/answerSchema';
import type { Question, TodayLesson } from '../../lib/types';
import { getPointsBalance } from '../../lib/familyPoints';
import { authorizeParentAccess, expectParentAccessLocked } from './helpers/parent-access';

const cases = [['G1', 'g1-u1'], ['G1', 'g1-u2'], ['G1', 'g1-u5'], ['G2', 'g2-u1'], ['G2', 'g2-u3'], ['G3', 'g3-u3'], ['G3', 'g3-u5'], ['G4', 'g4-u4'], ['G5', 'g5-u3'], ['G6', 'g6-u4']] as const;
const readLesson = (page: Page): Promise<TodayLesson> => page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-today-lesson') || 'null'));

async function fillAnswer(page: Page, q: Question, keyboard = false) {
  const schema = inferAnswerSchema(q);
  if (schema.kind === 'multi_field') {
    for (const field of schema.fields) {
      const answer = q.subAnswers?.find(item => item.id === field.id)?.answer;
      expect(answer, `${q.id}:${field.id} has a reviewed answer`).toBeDefined();
      await page.getByTestId(`lesson-answer-input-${field.id}`).fill(String(answer));
    }
  } else if (schema.kind === 'choice') {
    const option = schema.options.find(item => String(item.value) === String(q.answer) || item.id === String(q.answer));
    expect(option, `choice answer ${q.id}`).toBeDefined();
    await page.getByRole('button', { name: option!.label, exact: true }).click();
  } else if (schema.kind === 'comparison_symbol') {
    await page.getByRole('button', { name: String(q.answer), exact: true }).click();
  } else if (schema.kind === 'money' && schema.inputMode === 'yuan_jiao') {
    const amount = typeof q.answer === 'number' ? Math.round(q.answer * 10) : parseMoneyToJiao(String(q.answer));
    expect(amount).not.toBeNull();
    const inputs = page.locator('form input');
    await inputs.nth(0).fill(String(Math.floor(amount! / 10)));
    await inputs.nth(1).fill(String(amount! % 10));
  } else {
    await page.getByTestId('lesson-answer-input').fill(String(q.answer));
  }
  const submit = page.getByTestId('submit-answer');
  if (await submit.isVisible() && await submit.isEnabled()) {
    if (keyboard) await submit.press('Enter'); else await submit.click();
  }
}

for (const [grade, unit] of cases) {
  for (const semester of (unit === 'g1-u2' || unit === 'g1-u5' || unit === 'g2-u1' || unit === 'g3-u5' ? ['upper'] : ['upper', 'lower'])) {
    test(`${grade} ${semester} ${unit}: real settings and all six questions, reload and one reward`, async ({ page }, info) => {
      test.setTimeout(120000);
      const errors: string[] = [];
      const keyboard = grade === 'G3' && semester === 'lower' && unit === 'g3-u3';
      const checkExtra = grade === 'G1' && semester === 'upper' && unit === 'g1-u1';
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width: grade === 'G1' || grade === 'G2' ? 390 : 768, height: 844 });
      await page.goto('/');
      await page.getByTestId('learning-settings-toggle').click();
      await expect(page.getByTestId('grade-select')).toHaveCount(0);
      await expectParentAccessLocked(page);
      await authorizeParentAccess(page);
      await expect(page.getByTestId('grade-select')).toBeVisible();
      await page.getByTestId('grade-select').selectOption(grade);
      await page.getByTestId('unit-select').selectOption(unit);
      await page.getByTestId('semester-select').selectOption(semester);
      if (checkExtra) await page.getByLabel('家长每日练习目标').fill('8');
      await page.getByTestId('save-learning-settings').click();
      await expect(page.getByRole('status').filter({ hasText: '设置已保存' })).toBeVisible();
      await page.getByTestId('start-lesson').click();
      await expect(page.getByTestId('submit-answer')).toBeVisible();
      const initial = await readLesson(page);
      expect(initial.actualCore).toBe(6);
      expect(initial.settingSnapshot?.grade).toBe(grade);
      expect(initial.settingSnapshot?.unitId).toBe(unit);
      expect(initial.settingSnapshot?.semester).toBe(semester);

      for (let index = 0; index < 6; index++) {
        let lesson = await readLesson(page);
        expect(lesson.currentStepIndex).toBe(index);
        const q = getQuestionById(lesson.steps[index].questionId)!;
        expect(q).toBeDefined();
        expect(q.gradeBand).toBe(grade);
        await expect(page.getByTestId('submit-answer')).toBeVisible();
        expect((await readLesson(page)).currentStepIndex).toBe(index);
        await expect(page.getByTestId('lesson-question-prompt')).toHaveText(q.text);
        if (index === 0) {
          await page.reload();
          await expect(page.getByTestId('lesson-question-prompt')).toHaveText(q.text);
          expect((await readLesson(page)).lessonId).toBe(initial.lessonId);
          const numeric = page.getByTestId('lesson-answer-input');
          if (await numeric.isVisible().catch(() => false)) {
            await numeric.fill('999999');
            await page.getByTestId('submit-answer').click();
            await expect(page.getByTestId('submit-answer')).toBeVisible();
            expect((await readLesson(page)).currentStepIndex).toBe(0);
          }
          const schema = inferAnswerSchema(q);
          if (schema.kind === 'multi_field') {
            for (const [fieldIndex, field] of schema.fields.entries()) {
              const value = fieldIndex === 0 ? '999999' : String(q.subAnswers!.find(item => item.id === field.id)!.answer);
              await page.getByTestId(`lesson-answer-input-${field.id}`).fill(value);
            }
            await page.getByTestId('submit-answer').click();
            expect((await readLesson(page)).currentStepIndex).toBe(0);
            for (const [fieldIndex, field] of schema.fields.entries()) {
              const value = fieldIndex === 0 ? '999999' : String(q.subAnswers!.find(item => item.id === field.id)!.answer);
              await expect(page.getByTestId(`lesson-answer-input-${field.id}`)).toHaveValue(value);
            }
          }
          await page.screenshot({ path: info.outputPath(`${grade}-${semester}-answer.png`), fullPage: true });
        }
        await fillAnswer(page, q, keyboard);
        await expect(page.getByRole('button', { name: /完成，进入下一关/ })).toBeVisible();
        const complete = page.getByRole('button', { name: /完成，进入下一关/ });
        // The G3 Enter-key coverage belongs to answer submission above; use the visible review control to continue.
        await complete.click();
        await expect.poll(async () => {
          const current = await readLesson(page);
          return current.completed ? 6 : current.currentStepIndex;
        }).toBe(index + 1);
        const feedbackClose = page.getByRole('button', { name: '关闭反馈', exact: true });
        if (await feedbackClose.isVisible()) {
          if (keyboard) await page.keyboard.press('Escape'); else await feedbackClose.click();
        }
        lesson = await readLesson(page);
        if (index < 5) expect(lesson.rewardClaimed).not.toBe(true);
      }
      await expect(page.getByRole('heading', { name: '今日任务完成', exact: true })).toBeVisible();
      const completed = await readLesson(page);
      expect(completed.completed).toBe(true);
      const savedState = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}'));
      expect(savedState.stars).toBe(0);
      const points = getPointsBalance(savedState);
      const firstAttempts = new Map<string, boolean>();
      for (const event of savedState.learningEvents || []) {
        if (event.eventType === 'attempt_submitted' && event.lessonId === completed.lessonId && !firstAttempts.has(event.questionInstanceId)) {
          firstAttempts.set(event.questionInstanceId, event.result === 'correct');
        }
      }
      expect(firstAttempts.size).toBe(6);
      expect(points).toBe([...firstAttempts.values()].every(Boolean) ? 1 : 0);
      expect(savedState.pointsWallet.ledger.filter((entry: { type: string }) => entry.type === 'perfect_lesson')).toHaveLength(points === 1 ? 1 : 0);
      await page.reload();
      await expect(page.getByRole('heading', { name: '今日任务完成', exact: true })).toBeVisible();
      expect(getPointsBalance(await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}')))).toBe(points);
      if (checkExtra) {
        await page.goto('/');
        await page.getByRole('link', { name: '自选加练 2 题' }).click();
        await expect(page.getByRole('button', { name: '2 题', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await page.getByRole('button', { name: '开始练习', exact: true }).click();
        for (let extra = 0; extra < 2; extra++) {
          const prompt = (await page.getByRole('heading', { level: 2 }).textContent())!;
          const numbers = prompt.match(/\d+/g)!.map(Number);
          await page.getByRole('textbox', { name: '我的答案' }).fill(String(numbers.reduce((sum, number) => sum + number, 0)));
          await page.getByRole('textbox', { name: '我的答案' }).press('Enter');
          await page.getByRole('button', { name: extra === 1 ? '查看结果' : '继续下一题', exact: true }).click();
        }
        await expect(page.getByText('首答正确 2/2 题；重试后完成 2/2 题。', { exact: true })).toBeVisible();
        expect((await readLesson(page)).lessonId).toBe(completed.lessonId);
        expect((await readLesson(page)).completed).toBe(true);
        expect(getPointsBalance(await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}')))).toBe(points);
        await page.goto('/rewards');
        await page.getByRole('navigation', { name: '奖励中心分区' }).getByRole('button', { name: '荣誉', exact: true }).click();
        const medal = page.locator('details').filter({ hasText: '线索探索·初探' });
        await medal.locator('summary').click();
        await medal.getByRole('button', { name: '展示勋章', exact: true }).click();
        const reveal = page.getByRole('dialog', { name: '勋章揭晓', exact: true });
        await expect(reveal).toBeVisible();
        await expect(reveal.getByRole('heading', { name: '线索探索·初探', exact: true })).toBeVisible();
        await page.waitForTimeout(1600);
        await page.screenshot({ path: info.outputPath('earned-medal-reveal.png') });
        await expect(reveal).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(reveal).not.toBeVisible();
        await expect(medal.getByRole('button', { name: '展示勋章', exact: true })).toBeFocused();
      }
      expect(errors).toEqual([]);
    });
  }
}
