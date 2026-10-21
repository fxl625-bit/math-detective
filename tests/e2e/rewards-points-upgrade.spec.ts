import { expect, test, type Page } from '@playwright/test';
import { getQuestionById, questions } from '../../data/questions';
import { inferAnswerSchema, parseMoneyToJiao } from '../../lib/answerSchema';
import type { Question, TodayLesson } from '../../lib/types';

function seedLearningState(page: Page, overrides: Record<string, unknown> = {}) {
  return page.addInitScript((extra) => {
    if (sessionStorage.getItem('__rewards_upgrade_fixture_seeded') === '1') return;
    sessionStorage.setItem('__rewards_upgrade_fixture_seeded', '1');
    const today = new Date().toISOString().slice(0, 10);
    const base = {
      version: 9, stars: 17, streak: 0, lastPlayDate: today, lastCheckinDate: '', lastStreakCheckDate: today,
      completedToday: 0, totalCompleted: 0, correctCount: 0, wrongCount: 0, answerAttempts: 0, level: 1,
      badges: [], completedQuestions: [], mistakes: [], parentRewards: [
        { id: 'reward-game', name: '周末游戏时间', description: '一起玩喜欢的游戏', cost: 80, icon: '🎮', enabled: true, createdAt: new Date().toISOString() },
      ], rewardRedemptions: [], parentGateAttempts: [], weeklySnapshots: [], resumeCards: 1,
      parentSettings: { gradeBand: 'G1', dailyGoal: 6, maxDifficulty: 5, semester: 'lower' }, skillMistakes: {}, skillLevel: 1,
      decorations: [], collectibleCards: [], questionReviewDates: {}, questionReviewCounts: {}, attemptRecords: [], learningEvents: [],
      ...extra,
    };
    localStorage.setItem('math-detective-state', JSON.stringify(base));
  }, overrides);
}

async function readLesson(page: Page): Promise<TodayLesson> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-today-lesson') || 'null'));
}

async function fillAnswer(page: Page, q: Question, correct: boolean) {
  const schema = inferAnswerSchema(q);
  if (schema.kind === 'multi_field') {
    for (const [index, field] of schema.fields.entries()) {
      const actual = q.subAnswers?.find(item => item.id === field.id)?.answer;
      expect(actual, `${q.id}:${field.id} fixture answer`).toBeDefined();
      const value = correct || index > 0 ? String(actual) : String(actual) === '0' ? '1' : '0';
      await page.getByTestId(`lesson-answer-input-${field.id}`).fill(value);
    }
  } else if (schema.kind === 'choice') {
    const options = schema.options;
    const option = correct
      ? options.find(item => String(item.value) === String(q.answer) || item.id === String(q.answer))
      : options.find(item => String(item.value) !== String(q.answer) && item.id !== String(q.answer));
    expect(option).toBeDefined();
    await page.getByRole('button', { name: option!.label, exact: true }).click();
  } else if (schema.kind === 'comparison_symbol') {
    const value = correct ? String(q.answer) : schema.options.find(item => item !== String(q.answer))!;
    await page.getByRole('button', { name: value, exact: true }).click();
  } else if (schema.kind === 'money' && schema.inputMode === 'yuan_jiao') {
    const actual = typeof q.answer === 'number' ? Math.round(q.answer * 10) : parseMoneyToJiao(String(q.answer));
    expect(actual).not.toBeNull();
    const units = correct ? actual! : actual! === 0 ? 1 : 0;
    const inputs = page.locator('form input');
    await inputs.nth(0).fill(String(Math.floor(units / 10)));
    await inputs.nth(1).fill(String(units % 10));
  } else {
    const value = correct ? String(q.answer) : `${String(q.answer)}999`;
    await page.getByTestId('lesson-answer-input').fill(value);
  }
}

async function playCoreLesson(page: Page, wrongFirstCount: number) {
  await page.goto('/');
  await page.getByTestId('start-lesson').click();
  await expect(page.getByTestId('submit-answer')).toBeVisible();
  const initial = await readLesson(page);
  expect(initial.actualCore).toBe(6);
  for (let index = 0; index < 6; index += 1) {
    const lesson = await readLesson(page);
    expect(lesson.currentStepIndex).toBe(index);
    const q = getQuestionById(lesson.steps[index].questionId)!;
    expect(q).toBeDefined();
    await expect(page.getByTestId('submit-answer')).toBeVisible();
    await expect(page.getByTestId('lesson-question-prompt')).toHaveText(q.text);
    if (index < wrongFirstCount) {
      await fillAnswer(page, q, false);
      await page.getByTestId('submit-answer').click();
      await expect(page.getByTestId('submit-answer')).toBeVisible();
      expect((await readLesson(page)).currentStepIndex).toBe(index);
    }
    await fillAnswer(page, q, true);
    await page.getByTestId('submit-answer').click();
    await expect(page.getByRole('button', { name: /完成，进入下一关/ })).toBeVisible();
    await page.getByRole('button', { name: /完成，进入下一关/ }).click();
    await expect.poll(async () => {
      const current = await readLesson(page);
      return current.completed ? 6 : current.currentStepIndex;
    }).toBe(index + 1);
    const closeFeedback = page.getByRole('button', { name: '关闭反馈', exact: true });
    if (await closeFeedback.isVisible().catch(() => false)) await closeFeedback.click();
  }
  await expect(page.getByRole('heading', { name: '今日任务完成', exact: true })).toBeVisible();
}

async function parentGate(page: Page) {
  await page.getByRole('button', { name: '家长', exact: true }).click();
  const setup = page.getByRole('button', { name: '设置密码并继续', exact: true });
  if (await setup.isVisible()) {
    await page.getByLabel('新密码', { exact: true }).fill('rewards-test-7462');
    await page.getByLabel('确认密码', { exact: true }).fill('rewards-test-7462');
    await setup.click();
  } else {
    await page.getByLabel('家长密码', { exact: true }).fill('rewards-test-7462');
    await page.getByRole('button', { name: '验证并继续', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: '家庭奖励设置', exact: true })).toBeVisible();
}

test('home check-in credits 0.5 points once per local day', async ({ page }) => {
  await seedLearningState(page);
  await page.goto('/');
  await page.getByRole('button', { name: /每日签到/ }).click();
  await expect(page.getByTestId('points-balance')).toContainText('0.5');
  await page.reload();
  const checkinButton = page.getByRole('button', { name: /每日签到/ });
  if (await checkinButton.isEnabled()) {
    await checkinButton.click();
    await expect(page.getByRole('status')).toContainText('已经签到');
  }
  await expect(page.getByTestId('points-balance')).toContainText('0.5');
  const wallet = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').pointsWallet);
  expect(wallet.ledger.filter((entry: any) => entry.type === 'checkin')).toHaveLength(1);
  expect(wallet.ledger[0].unitsDelta).toBe(1);
});

test('legacy stars reset to zero while learning, acquired items and old medals survive', async ({ page }) => {
  await seedLearningState(page, {
    stars: 500, level: 5, totalCompleted: 1, completedQuestions: ['g1_01'],
    badges: ['streak_3'], decorations: ['dec_crown'],
  });
  await page.goto('/rewards');
  await expect(page.getByTestId('points-balance')).toContainText('0');
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}'));
  expect(migrated.stars).toBe(0);
  expect(migrated.pointsWallet.ledger).toHaveLength(0);
  expect(migrated.level).toBe(5);
  expect(migrated.completedQuestions).toContain('g1_01');
  expect(migrated.decorations).toContain('dec_crown');
  expect(migrated.unlockedAvatarItemIds).toContain('sticker_star_corner');
  await page.getByRole('navigation', { name: '奖励中心分区' }).getByRole('button', { name: '荣誉', exact: true }).click();
  await expect(page.getByRole('heading', { name: '历史徽章', exact: true })).toBeVisible();
  await expect(page.getByText('坚持不懈', { exact: true })).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: /每日签到/ }).click();
  await page.reload();
  await expect(page.getByTestId('points-balance')).toContainText('0.5');
});

test('two first-answer errors remain mistakes and the report shows 4/6, with no perfect-lesson point', async ({ page }, info) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 390, height: 844 });
  await seedLearningState(page);
  await playCoreLesson(page, 2);
  await expect(page.getByText('本课首答正确率（4/6）', { exact: true })).toBeVisible();
  await expect(page.getByText('67%', { exact: true })).toBeVisible();
  const tomorrow = page.getByRole('list', { name: '明日练习内容' });
  await expect(tomorrow).toBeVisible();
  await expect(tomorrow).toContainText('找比较关系');
  await expect(tomorrow).toContainText('独立解题');
  await expect(tomorrow).not.toContainText(/find_compare_numbers|answer_only|spot_extra_info|spot_missing_info/);
  await expect(page.getByText(/预估.*⭐|预计.*星星/)).toHaveCount(0);
  await tomorrow.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('completed-preview-labels.png') });
  let state = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}'));
  const lesson = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}'));
  expect(lesson.completed).toBe(true);
  expect(state.mistakes).toHaveLength(2);
  const firstAttempts = new Map<string, any>();
  for (const event of state.learningEvents.filter((item: any) => item.eventType === 'attempt_submitted' && item.firstAttemptKnown !== false)) {
    if (!firstAttempts.has(event.questionInstanceId)) firstAttempts.set(event.questionInstanceId, event);
  }
  expect(firstAttempts.size).toBe(6);
  expect([...firstAttempts.values()].filter((event: any) => event.result === 'correct')).toHaveLength(4);
  expect(state.pointsWallet.ledger.filter((entry: any) => entry.type === 'perfect_lesson')).toHaveLength(0);
  await page.goto('/parent-report');
  await expect(page.getByTestId('overall-first-answer-accuracy')).toContainText('67%');
  await page.goto('/mistakes');
  await expect(page.getByRole('article')).toHaveCount(2);
});

test('a six-for-six first-answer lesson grants one point and a refresh does not grant it again', async ({ page }) => {
  test.setTimeout(180000);
  await seedLearningState(page);
  await playCoreLesson(page, 0);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}'));
  expect(before.pointsWallet.ledger.filter((entry: any) => entry.type === 'perfect_lesson')).toHaveLength(1);
  expect(before.pointsWallet.ledger.find((entry: any) => entry.type === 'perfect_lesson').unitsDelta).toBe(2);
  await page.reload();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}'));
  expect(after.pointsWallet.ledger.filter((entry: any) => entry.type === 'perfect_lesson')).toHaveLength(1);
});

test('mistake correction supports Enter and a structured schema, and awards once only after saved correction', async ({ page }) => {
  const question = questions.find((item) => inferAnswerSchema(item).kind === 'multi_field');
  expect(question).toBeTruthy();
  const state = {
    mistakes: [{ questionId: question!.id, questionText: question!.text, myAnswer: 'incorrect', correctAnswer: question!.answer,
      errorType: 'test fixture', date: new Date().toISOString(), retriedCorrect: false }],
  };
  await seedLearningState(page, state);
  await page.goto('/mistakes');
  await page.getByRole('button', { name: /待订正/ }).click();
  const fields = question!.subAnswers || [];
  for (const field of fields) await page.getByTestId(`lesson-answer-input-${field.id}`).fill(String(field.answer));
  await page.getByTestId(`lesson-answer-input-${fields[fields.length - 1].id}`).press('Enter');
  await expect(page.getByRole('status')).toContainText(/订正正确|获得 0.5 积分/);
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}'));
  expect(saved.pointsWallet.ledger.filter((entry: any) => entry.type === 'mistake_review')).toHaveLength(1);
  await page.reload();
  await page.getByRole('button', { name: /已订正/ }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').pointsWallet.ledger.filter((entry: any) => entry.type === 'mistake_review').length)).toBe(1);
});

test('parent points reach 15, request then cancel refunds once, and locked try-on does not equip', async ({ page }) => {
  await seedLearningState(page);
  await page.goto('/rewards');
  await parentGate(page);
  await expect(page.getByTestId(/^reward-idea-/)).toHaveCount(8);
  await page.getByTestId('reward-idea-亲子桌游时间').click();
  await expect(page.getByRole('dialog', { name: '新增家庭奖励' }).getByLabel('奖励名称')).toHaveValue('亲子桌游时间');
  await page.getByRole('dialog', { name: '新增家庭奖励' }).getByRole('button', { name: '返回', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').parentRewards.length)).toBe(1);
  await page.getByTestId('reward-idea-一起烘焙').click();
  await page.getByRole('dialog', { name: '新增家庭奖励' }).getByRole('button', { name: '保存', exact: true }).click();
  const configured = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').parentRewards);
  expect(configured).toHaveLength(2);
  expect(configured[1]).toMatchObject({ name: '一起烘焙', cost: 15, enabled: true });
  await page.getByLabel('实际积分').fill('15');
  await page.getByLabel(/类别/).selectOption('homework');
  await page.getByLabel(/备注/).fill('作业 A+');
  await page.getByTestId('grant-parent-points').click();
  await expect(page.getByTestId('points-balance')).toContainText('15');
  await page.getByRole('button', { name: '积分', exact: true }).click();
  const requestButton = page.getByTestId('reward-card-reward-game').getByRole('button', { name: '申请' });
  await requestButton.click();
  const dialog = page.getByRole('dialog');
  const dialogButtons = dialog.getByRole('button');
  await expect(dialogButtons.nth(0)).toBeFocused();
  await dialogButtons.nth(1).focus();
  await page.keyboard.press('Tab');
  await expect(dialogButtons.nth(0)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(requestButton).toBeFocused();
  await requestButton.click();
  await expect(page.getByRole('dialog')).toContainText('申请后余额：0 积分');
  await page.getByRole('button', { name: '确认申请并扣 15 分' }).click();
  await expect(page.getByTestId('points-balance')).toContainText('0');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('presentation')).toHaveCount(0);
  await parentGate(page);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '取消并退款' }).click();
  await expect(page.getByTestId('points-balance')).toContainText('15');
  const redemptions = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').pointsWallet);
  expect(redemptions.ledger.filter((entry: any) => entry.type === 'redemption_refund')).toHaveLength(1);
  expect(redemptions.redemptions[0].status).toBe('cancelled');

  await page.getByTestId('reward-card-reward-game').getByRole('button', { name: '申请', exact: true }).click();
  await page.getByRole('button', { name: '确认申请并扣 15 分', exact: true }).click();
  await page.getByRole('dialog', { name: '家庭奖励申请已提交', exact: true }).getByRole('button', { name: '关闭揭晓', exact: true }).click();
  await page.getByRole('button', { name: '确认已兑现', exact: true }).click();
  await expect(page.getByTestId('points-balance')).toContainText('0');
  const confirmed = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').pointsWallet);
  expect(confirmed.redemptions.map((row: { status: string }) => row.status)).toEqual(['cancelled', 'confirmed']);
  expect(confirmed.ledger.filter((entry: { type: string }) => entry.type === 'redemption_refund')).toHaveLength(1);
  await page.reload();
  await expect(page.getByTestId('points-balance')).toContainText('0');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').pointsWallet)).toEqual(confirmed);

  await page.getByRole('button', { name: '换装', exact: true }).click();
  const locked = page.locator('article').filter({ hasText: '未解锁' }).first();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').decorations);
  await locked.getByRole('button', { name: '试穿' }).click();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').decorations);
  expect(after).toEqual(before);
});

test('HTTP-style missing crypto.randomUUID and storage failure do not show a false success', async ({ page }) => {
  await seedLearningState(page);
  await page.addInitScript(() => { Object.defineProperty(window.crypto, 'randomUUID', { configurable: true, value: undefined }); });
  await page.goto('/rewards');
  await parentGate(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).__restoreSetItem = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) {
      if (key === 'math-detective-state') throw new DOMException('Quota full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByLabel('实际积分').fill('15');
  await page.getByTestId('grant-parent-points').click();
  await expect(page.getByRole('status')).toContainText('保存没有成功');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').pointsWallet.ledger.filter((entry: any) => entry.type === 'parent_grant').length)).toBe(0);
  await page.evaluate(() => (window as any).__restoreSetItem());
  await page.getByTestId('grant-parent-points').click();
  await expect(page.getByTestId('points-balance')).toContainText('15');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}').pointsWallet.ledger.filter((entry: any) => entry.type === 'parent_grant').length)).toBe(1);
});
