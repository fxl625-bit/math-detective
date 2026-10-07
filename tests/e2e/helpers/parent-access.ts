import { expect, type Page } from '@playwright/test';

// A test-only credential configured through the real UI in each isolated browser context.
const PARENT_PASSWORD = 'parent-test-7462';

export async function expectParentAccessLocked(page: Page): Promise<void> {
  const setup = page.getByRole('button', { name: '设置密码并继续', exact: true });
  const verify = page.getByRole('button', { name: '验证并继续', exact: true });
  await expect.poll(async () => (await setup.isVisible().catch(() => false)) || (await verify.isVisible().catch(() => false))).toBe(true);
}

export async function authorizeParentAccess(page: Page): Promise<void> {
  const setup = page.getByRole('button', { name: '设置密码并继续', exact: true });
  const verify = page.getByRole('button', { name: '验证并继续', exact: true });
  await expect.poll(async () => (await setup.isVisible().catch(() => false)) || (await verify.isVisible().catch(() => false))).toBe(true);

  if (await setup.isVisible()) {
    await page.getByLabel('新密码', { exact: true }).fill(PARENT_PASSWORD);
    await page.getByLabel('确认密码', { exact: true }).fill(PARENT_PASSWORD);
    await setup.click();
  } else {
    await page.getByLabel('家长密码', { exact: true }).fill(PARENT_PASSWORD);
    await verify.click();
  }

  await expect(setup).toHaveCount(0);
  await expect(verify).toHaveCount(0);
}
