import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'parent-test-7462';
const NEW_PASSWORD = 'parent-test-9518';
const KEY = 'math-detective-parent-password-v1';

async function openParent(page: Page) {
  await page.getByRole('button', { name: '家长', exact: true }).click();
}

async function setup(page: Page) {
  await page.goto('/rewards');
  await openParent(page);
  await page.getByLabel('新密码', { exact: true }).fill(PASSWORD);
  await page.getByLabel('确认密码', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: '设置密码并继续', exact: true }).click();
  await expect(page.getByRole('heading', { name: '家庭奖励设置', exact: true })).toBeVisible();
}

async function verify(page: Page, password = PASSWORD) {
  await page.getByLabel('家长密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '验证并继续', exact: true }).click();
}

test('fixed password survives reload, rejects wrong answers, and change requires current password', async ({ page }) => {
  await setup(page);
  const record = await page.evaluate(key => localStorage.getItem(key), KEY);
  expect(record).not.toContain(PASSWORD);
  await page.getByRole('button', { name: '退出家长区', exact: true }).click();
  await openParent(page);
  await expect(page.getByText(/请计算/)).toHaveCount(0);
  await expect(page.getByLabel('家长密码', { exact: true })).toHaveAttribute('type', 'password');
  await verify(page, '000000');
  await expect(page.getByText('密码不正确。', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '家庭奖励设置', exact: true })).toHaveCount(0);
  await page.reload();
  await openParent(page);
  await expect(page.getByRole('button', { name: '设置密码并继续', exact: true })).toHaveCount(0);
  await verify(page);
  await expect(page.getByRole('heading', { name: '家庭奖励设置', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '修改家长密码', exact: true }).click();
  await page.getByLabel('当前密码', { exact: true }).fill('000000');
  await page.getByLabel('新密码', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('确认新密码', { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole('button', { name: '保存新密码', exact: true }).click();
  await expect(page.getByText('密码不正确。', { exact: true })).toBeVisible();
  await page.getByLabel('当前密码', { exact: true }).fill(PASSWORD);
  await page.getByLabel('新密码', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('确认新密码', { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole('button', { name: '保存新密码', exact: true }).click();
  await expect(page.getByRole('heading', { name: '家庭奖励设置', exact: true })).toHaveCount(0);
  await openParent(page);
  await verify(page);
  await expect(page.getByText('密码不正确。', { exact: true })).toBeVisible();
  await verify(page, NEW_PASSWORD);
  await expect(page.getByRole('heading', { name: '家庭奖励设置', exact: true })).toBeVisible();
});

test('five failures stay locked after reload and expire after 60 seconds', async ({ page }) => {
  await page.clock.install();
  await setup(page);
  await page.getByRole('button', { name: '退出家长区', exact: true }).click();
  await openParent(page);
  for (let i = 0; i < 5; i++) {
    await verify(page, '000000');
    if (i < 4) await expect(page.getByText('密码不正确。', { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: '验证并继续', exact: true })).toBeDisabled();
  await page.reload();
  await openParent(page);
  await expect(page.getByRole('button', { name: '验证并继续', exact: true })).toBeDisabled();
  await page.clock.fastForward(61_000);
  await expect(page.getByRole('button', { name: '验证并继续', exact: true })).toBeEnabled();
  await verify(page);
  await expect(page.getByRole('heading', { name: '家庭奖励设置', exact: true })).toBeVisible();
});

test('settings and import are locked while learning and report remain available', async ({ page }) => {
  await setup(page);
  await page.goto('/');
  await expect(page.getByTestId('start-lesson')).toBeVisible();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByLabel('家长密码', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '保存学习设置', exact: true })).toHaveCount(0);
  await verify(page);
  await expect(page.getByRole('combobox', { name: '年级', exact: true })).toBeVisible();
  await page.goto('/parent-report');
  await expect(page.getByLabel('家长密码', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '确认恢复', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('overall-first-answer-accuracy')).toBeVisible();
});

test('expired sessions close reward editors and tab hiding revokes access', async ({ page }, info) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.getByRole('button', { name: '新增奖励', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '新增家庭奖励', exact: true })).toBeVisible();
  await page.clock.fastForward(301_000);
  await expect(page.getByRole('dialog', { name: '新增家庭奖励', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('家长密码', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('parent-password-mobile.png') });
  await verify(page);
  await expect(page.getByRole('heading', { name: '家庭奖励设置', exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect(page.getByRole('heading', { name: '家庭奖励设置', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('家长密码', { exact: true })).toBeVisible();
});
