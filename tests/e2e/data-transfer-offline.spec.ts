import { expect, test, type Browser, type Page } from '@playwright/test';
import { DEFAULT_GAME_STATE } from '../../lib/types';
import { getQuestionById } from '../../data/questions';
import { inferAnswerSchema } from '../../lib/answerSchema';
import { getPointsBalance } from '../../lib/familyPoints';
import { createNetworkFaultProxy } from './helpers/network-fault-proxy';

const OFFLINE_CACHE_NAME = 'math-detective-shell-v1';

async function waitForServiceWorkerControl(page: Page, origin: string) {
  await page.goto(`${origin}/`);
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker unsupported');
    const registration = await navigator.serviceWorker.ready;
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('No controlling service worker')), 20000);
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.clearTimeout(timeout);
          resolve();
        }, { once: true });
        if (registration.active?.state === 'activated' && navigator.serviceWorker.controller) {
          window.clearTimeout(timeout);
          resolve();
        }
      });
    }
    if (!navigator.serviceWorker.controller) throw new Error('Service worker did not control page');
  });
}

async function prepareCoreOfflineCache(page: Page) {
  const prepared = await page.evaluate(async () => {
    const worker = navigator.serviceWorker.controller;
    if (!worker) throw new Error('Cannot prepare offline cache without a controller');
    return await new Promise<string>((resolve) => {
      const timeout = window.setTimeout(() => resolve('TIMEOUT'), 30000);
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'OFFLINE_PREPARE_DONE' || event.data?.type === 'OFFLINE_PREPARE_FAILED') {
          window.clearTimeout(timeout);
          resolve(event.data.type);
        }
      }, { once: true });
      worker.postMessage({ type: 'PREPARE_OFFLINE' });
    });
  });
  expect(prepared).toBe('OFFLINE_PREPARE_DONE');
  const cached = await page.evaluate(async cacheName => {
    const cache = await caches.open(cacheName);
    return {
      controlled: Boolean(navigator.serviceWorker.controller),
      home: Boolean(await cache.match(`${location.origin}/`)),
      play: Boolean(await cache.match(`${location.origin}/play`)),
    };
  }, OFFLINE_CACHE_NAME);
  expect(cached).toEqual({ controlled: true, home: true, play: true });
}

async function createIsolatedProxySession(browser: Browser) {
  const upstreamOrigin = process.env.PLAYWRIGHT_BASE_URL;
  if (!upstreamOrigin) throw new Error('PLAYWRIGHT_BASE_URL must target the production server');
  const proxy = await createNetworkFaultProxy(upstreamOrigin);
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  return { proxy, context, page: await context.newPage() };
}

test('an uncached page explains offline preparation instead of showing a blank page', async ({ browser }, testInfo) => {
  const { proxy, context, page } = await createIsolatedProxySession(browser);
  try {
    await waitForServiceWorkerControl(page, proxy.origin);
    await prepareCoreOfflineCache(page);
    proxy.setDisconnected(true);
    const response = await page.goto(`${proxy.origin}/mental-math`);
    expect(response?.status()).toBe(503);
    expect(response?.fromServiceWorker()).toBe(true);
    await expect(page.getByRole('heading', { name: '当前页面尚未缓存' })).toBeVisible();
    await expect(page.getByText(/准备离线学习/)).toBeVisible();
    await expect.poll(() => proxy.status().droppedRequests.some(path => path.includes(' /mental-math'))).toBe(true);
    await testInfo.attach('offline-proxy-uncached.json', {
      body: Buffer.from(JSON.stringify(proxy.status(), null, 2)),
      contentType: 'application/json',
    });

    proxy.setDisconnected(false);
    await page.reload();
    await expect(page.getByRole('heading', { name: '口算练习器' })).toBeVisible();
  } finally {
    proxy.setDisconnected(false);
    await context.close();
    await proxy.close();
  }
});

function stateWithStars(stars: number) {
  return { ...JSON.parse(JSON.stringify(DEFAULT_GAME_STATE)), stars, parentSettings: { ...DEFAULT_GAME_STATE.parentSettings, gradeBand: 'G3' } };
}

test('backup file round-trips between isolated synthetic browser contexts', async ({ browser }, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const source = await browser.newContext();
  await source.addInitScript((state) => {
    if (sessionStorage.getItem('backup-source-seeded')) return;
    sessionStorage.setItem('backup-source-seeded', '1');
    localStorage.setItem('math-detective-state', JSON.stringify(state));
    localStorage.setItem('math-detective-state-version', '9');
    localStorage.setItem('math-detective-app-version', '2.11.3');
    localStorage.setItem('math-detective-unrelated-test-key', 'keep');
  }, stateWithStars(41));
  const sourcePage = await source.newPage();
  await sourcePage.goto(new URL('/', baseURL).href);
  await sourcePage.getByRole('button', { name: /每日签到/ }).click();
  await expect(sourcePage.getByTestId('points-balance')).toContainText('0.5');
  await sourcePage.goto(new URL('/play', baseURL).href);
  await sourcePage.getByRole('button', { name: /读完了/ }).click();
  await sourcePage.getByTestId('lesson-answer-input').fill('999999');
  await sourcePage.getByTestId('submit-answer').click();
  const sourceLesson = await sourcePage.evaluate(() => JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}'));
  expect(sourceLesson.steps[sourceLesson.currentStepIndex].currentPhaseIndex).toBeGreaterThan(0);
  await sourcePage.goto(new URL('/parent-report', baseURL).href);
  const downloadPromise = sourcePage.waitForEvent('download');
  await sourcePage.getByRole('button', { name: '下载当前数据备份' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = Buffer.concat(chunks);
  const exportedState = JSON.parse(backup.toString('utf8')).data.learningState;
  expect(exportedState.stars).toBe(0);
  expect(getPointsBalance(exportedState)).toBe(0.5);

  const destination = await browser.newContext();
  await destination.addInitScript((state) => {
    if (sessionStorage.getItem('backup-destination-seeded')) return;
    sessionStorage.setItem('backup-destination-seeded', '1');
    localStorage.setItem('math-detective-state', JSON.stringify(state));
    localStorage.setItem('math-detective-unrelated-test-key', 'keep');
  }, stateWithStars(3));
  const destinationPage = await destination.newPage();
  await destinationPage.goto(new URL('/parent-report', baseURL).href);
  await destinationPage.locator('input[type="file"]').setInputFiles({
    name: 'synthetic-backup.json',
    mimeType: 'application/json',
    buffer: backup,
  });
  await expect(destinationPage.getByText(/年级：三年级/)).toBeVisible();
  await expect(destinationPage.getByText(/家庭积分：0.5/)).toBeVisible();
  await destinationPage.getByRole('button', { name: '备份当前数据并恢复' }).click();
  await expect.poll(async () => getPointsBalance(await destinationPage.evaluate(() => JSON.parse(localStorage.getItem('math-detective-state') || '{}')))).toBe(0.5);
  await expect.poll(() => destinationPage.evaluate(() => localStorage.getItem('math-detective-unrelated-test-key'))).toBe('keep');
  await expect.poll(() => destinationPage.evaluate(() => !!localStorage.getItem('math-detective-restore-safety-net-v1'))).toBe(true);
  const restored = await destinationPage.evaluate(() => ({
    state: JSON.parse(localStorage.getItem('math-detective-state') || '{}'),
    lesson: JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}'),
  }));
  expect(restored.lesson.lessonId).toBe(sourceLesson.lessonId);
  expect(restored.lesson.steps).toEqual(sourceLesson.steps);
  expect(restored.state.learningEvents.some((event: { result?: string }) => event.result === 'incorrect')).toBe(true);
  expect(restored.state.pointsWallet).toEqual(exportedState.pointsWallet);
  expect(restored.state.stars).toBe(0);
  expect(restored.state.mistakes).toEqual(exportedState.mistakes);
  await destinationPage.goto(new URL('/play', baseURL).href);
  await expect(destinationPage.getByTestId('lesson-answer-input')).toBeVisible();
  expect(await destinationPage.evaluate(() => JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}').lessonId)).toBe(sourceLesson.lessonId);
  await source.close();
  await destination.close();
});

test('prepared core documents open directly and survive refresh offline', async ({ browser }, testInfo) => {
  test.setTimeout(120000);
  const { proxy, context, page } = await createIsolatedProxySession(browser);
  try {
    await waitForServiceWorkerControl(page, proxy.origin);
    await prepareCoreOfflineCache(page);
    await page.getByRole('button', { name: /每日签到/ }).click();
    await expect(page.getByTestId('points-balance')).toContainText('0.5');
    await page.goto(`${proxy.origin}/play`);
    await expect(page.getByRole('button', { name: /读完了/ })).toBeVisible();
    const before = await page.evaluate(() => {
      const lesson = JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}');
      return { lessonId: lesson.lessonId, stepId: lesson.steps?.[lesson.currentStepIndex]?.id };
    });
    expect(before.lessonId).toBeTruthy();
    expect(before.stepId).toBeTruthy();

    proxy.setDisconnected(true);
    const response = await page.goto(`${proxy.origin}/play`);
    expect(response?.fromServiceWorker()).toBe(true);
    await expect(page.getByRole('button', { name: /读完了/ })).toBeVisible();
    await expect.poll(() => proxy.status().droppedRequests.some(path => path.includes(' /play'))).toBe(true);
    await page.getByRole('button', { name: /读完了/ }).click();
    await expect(page.getByTestId('lesson-question-prompt')).toBeVisible();
    await expect(page.getByTestId('lesson-answer-input').first()).toBeVisible();
    const afterContinue = await page.evaluate(() => {
      const lesson = JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}');
      const step = lesson.steps?.[lesson.currentStepIndex];
      return { lessonId: lesson.lessonId, stepId: step?.id, phaseIndex: step?.currentPhaseIndex };
    });
    expect(afterContinue.lessonId).toBe(before.lessonId);
    expect(afterContinue.stepId).toBe(before.stepId);

    const activeQuestionId = await page.evaluate(() => {
      const lesson = JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}');
      return lesson.steps?.[lesson.currentStepIndex]?.questionId as string;
    });
    const activeQuestion = getQuestionById(activeQuestionId);
    expect(activeQuestion, `question ${activeQuestionId} is registered`).toBeTruthy();
    const schema = inferAnswerSchema(activeQuestion!);
    if (schema.kind === 'multi_field') {
      for (const field of schema.fields) {
        const subAnswer = activeQuestion!.subAnswers?.find(item => item.id === field.id)?.answer;
        expect(subAnswer, `sub-answer ${field.id} exists`).not.toBeUndefined();
        await page.getByTestId(`lesson-answer-input-${field.id}`).fill(String(subAnswer).replace(/%$/, ''));
      }
    } else if (schema.kind === 'choice') {
      const answer = String(activeQuestion!.answer);
      const option = schema.options.find(item => String(item.value) === answer);
      expect(option, 'correct choice option exists').toBeTruthy();
      await page.getByRole('button', { name: option!.label, exact: true }).click();
    } else {
      const answer = String(activeQuestion!.answer);
      await page.getByTestId('lesson-answer-input').fill(schema.kind === 'percent' ? answer.replace(/%$/, '') : answer);
    }
    await page.getByTestId('submit-answer').click();
    await page.getByRole('button', { name: /完成，进入下一关/ }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}').currentStepIndex)).toBe(1);
    const saved = await page.evaluate(() => ({
      lessonId: JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}').lessonId,
      currentStepIndex: JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}').currentStepIndex,
      stars: JSON.parse(localStorage.getItem('math-detective-state') || '{}').stars,
      pointsWallet: JSON.parse(localStorage.getItem('math-detective-state') || '{}').pointsWallet,
      events: JSON.parse(localStorage.getItem('math-detective-state') || '{}').learningEvents,
    }));

    await page.reload();
    await expect(page.getByRole('button', { name: /读完了/ })).toBeVisible();
    expect(await page.evaluate(() => ({
      lessonId: JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}').lessonId,
      currentStepIndex: JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}').currentStepIndex,
      stars: JSON.parse(localStorage.getItem('math-detective-state') || '{}').stars,
      pointsWallet: JSON.parse(localStorage.getItem('math-detective-state') || '{}').pointsWallet,
      events: JSON.parse(localStorage.getItem('math-detective-state') || '{}').learningEvents,
    }))).toEqual(saved);

    await page.close();
    const reopened = await context.newPage();
    await reopened.goto(`${proxy.origin}/play`);
    await expect(reopened.getByRole('button', { name: /读完了/ })).toBeVisible();
    expect(await reopened.evaluate(() => ({
      lessonId: JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}').lessonId,
      currentStepIndex: JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}').currentStepIndex,
      stars: JSON.parse(localStorage.getItem('math-detective-state') || '{}').stars,
      pointsWallet: JSON.parse(localStorage.getItem('math-detective-state') || '{}').pointsWallet,
      events: JSON.parse(localStorage.getItem('math-detective-state') || '{}').learningEvents,
    }))).toEqual(saved);
    proxy.setDisconnected(false);
    await reopened.reload();
    await expect(reopened.getByRole('button', { name: /读完了/ })).toBeVisible();
    expect(await reopened.evaluate(() => ({
      lessonId: JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}').lessonId,
      currentStepIndex: JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}').currentStepIndex,
      stars: JSON.parse(localStorage.getItem('math-detective-state') || '{}').stars,
      pointsWallet: JSON.parse(localStorage.getItem('math-detective-state') || '{}').pointsWallet,
      events: JSON.parse(localStorage.getItem('math-detective-state') || '{}').learningEvents,
    }))).toEqual(saved);
    await testInfo.attach('offline-proxy-cached.json', {
      body: Buffer.from(JSON.stringify(proxy.status(), null, 2)),
      contentType: 'application/json',
    });
  } finally {
    proxy.setDisconnected(false);
    await context.close();
    await proxy.close();
  }
});
