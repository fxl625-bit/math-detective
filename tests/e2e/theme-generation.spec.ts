import { expect, test } from '@playwright/test';
import { openPlayE2E, seedG1State } from './helpers';

test.describe('theme generation smoke', () => {
  const blockedByTheme: Record<string, RegExp> = {
    toy_store_puzzle: /酸奶|冰箱|超市|食品/,
    playground_ball_mystery: /酸奶|点心|购物|找零/,
  };

  test('generated lesson questions do not obviously mismatch active theme', async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await seedG1State(page);
      await openPlayE2E(page);
      const snapshot = await page.evaluate(() => {
        const lesson = window.MATH_DETECTIVE_TEST!.getState().lesson as { steps?: unknown[]; caseStoryId?: string } | null;
        const text = document.body.innerText;
        return { lesson, text };
      });
      expect(snapshot.lesson?.steps?.length ?? 0).toBeGreaterThanOrEqual(6);
      const matcher = snapshot.lesson?.caseStoryId ? blockedByTheme[snapshot.lesson.caseStoryId] : undefined;
      if (matcher) {
        expect(snapshot.text).not.toMatch(matcher);
      }
    }
  });
});
