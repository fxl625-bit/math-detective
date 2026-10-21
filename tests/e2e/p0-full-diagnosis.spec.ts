/**
 * Phase A: Full Browser Diagnosis — State Fixtures + Migration Tests
 *
 * Tests 4 scenarios: v2.8, v2.9, v2.10.0, current state
 * All on production build at http://localhost:3100
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import { getQuestionById } from '../../data/questions';

const FIXTURES = ['state-v28', 'state-v29', 'state-v2100', 'state-current'];
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

for (const fixture of FIXTURES) {
  test.describe(`Migration: ${fixture}`, () => {
    test('auto-invalidates old lesson and preserves data', async ({ page }) => {
      // Freeze the June fixture date so semester assertions do not depend on CI date.
      await page.clock.setFixedTime(new Date('2026-06-17T04:00:00Z'));
      // Load fixture data
      const raw = fs.readFileSync(`tests/fixtures/${fixture}.json`, 'utf-8');
      let fixtureData: any;

      if (fixture === 'state-current') {
        fixtureData = JSON.parse(raw);
      } else {
        fixtureData = { 'math-detective-state': raw };
      }

      // Inject localStorage
      await page.goto(BASE_URL);
      await page.evaluate((data: any) => {
        for (const [key, value] of Object.entries(data.localStorage || data)) {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        }
      }, fixtureData);

      // Navigate to /play — triggers loadState migration + getTodayLesson
      await page.goto(`${BASE_URL}/play`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Read migrated state
      const state = await page.evaluate(() => {
        const raw = localStorage.getItem('math-detective-state');
        if (!raw) return { error: 'no state after migration' };
        const s = JSON.parse(raw);
        return {
          stars: s.stars,
          streak: s.streak,
          totalCompleted: s.totalCompleted,
          usageStage: s.usageStage,
          curriculumProfile: s.curriculumProfile,
          hasLearnerProfile: !!s.learnerProfile,
          learnerDifficulty: s.learnerProfile?.currentDifficultyLevel,
          learnerTotalCompleted: s.learnerProfile?.totalCompleted,
          learnerRecentAccuracy: s.learnerProfile?.recentAccuracy,
          correctCount: s.correctCount,
          wrongCount: s.wrongCount,
          trainingMode: s.trainingMode,
          schoolHarder: s.schoolHarder,
        };
      });

      console.log(`\n=== ${fixture} MIGRATION RESULT ===`);
      console.log(JSON.stringify(state, null, 2));

      // Read lesson state
      const lessonInfo = await page.evaluate(() => {
        const raw = localStorage.getItem('math-detective-today-lesson');
        if (!raw) return { rebuilt: false, reason: 'no lesson' };
        const lesson = JSON.parse(raw);
        const steps = lesson.steps || [];
        return {
          rebuilt: true,
          stepCount: steps.length,
          firstStepId: steps[0]?.id,
          firstQuestionId: steps[0]?.questionId,
          hasSafeSteps: steps.some((s: any) => s.id?.includes('_safe_')),
          version: lesson.generatedByVersion,
          generatorVersion: lesson.generatorVersion,
          currentStepIndex: lesson.currentStepIndex,
        };
      });
      console.log('Lesson:', JSON.stringify(lessonInfo, null, 2));

      // Assertions
      // 1. Approved migration clears old stars while preserving learning history.
      expect(state.stars).toBe(0);
      expect(state.totalCompleted).toBe(85);

      // 2. Migration built learnerProfile
      expect(state.hasLearnerProfile).toBe(true);

      // 3. Semester progress detected (June → review)
      const cp = state.curriculumProfile as any;
      expect(cp?.semesterProgress).toBe('review');

      // 4. Usage stage properly detected
      expect(state.usageStage).toBeGreaterThanOrEqual(3);

      // 5. v2.8's legacy right/wrong counters lack question-instance evidence.
      // Preserve its history but do not promote difficulty from unverified accuracy.
      if (fixture === 'state-v28') {
        expect(state.correctCount).toBe(72);
        expect(state.wrongCount).toBe(13);
        expect(state.learnerTotalCompleted).toBe(85);
        expect(state.learnerRecentAccuracy).toBe(0);
        expect(state.learnerDifficulty).toBe(1);
      } else {
        // Newer fixtures contain trustworthy learner profile/evidence snapshots.
        expect(state.learnerDifficulty).toBeGreaterThanOrEqual(2);
      }

      // 6. Old lesson automatically INVALIDATED (safe_ prefix → rebuild)
      if (fixture === 'state-current') {
        // state-current has a safe_ lesson that should be auto-replaced
        expect(lessonInfo.hasSafeSteps).toBe(false);
        expect(lessonInfo.generatorVersion).toBeGreaterThanOrEqual(4);
      }

      // 7. trainingMode default populated
      expect(state.trainingMode).toBeDefined();
    });
  });
}

test.describe('P0-1: Real Browser Submit Click Count', () => {
  test('submit advances on first click — digit input', async ({ page }) => {
    // Inject current state with v2.10.0 profile (usageStage 3, difficulty 3)
    const fixtureRaw = fs.readFileSync('tests/fixtures/state-v2100.json', 'utf-8');
    await page.goto(BASE_URL);
    await page.evaluate((raw) => {
      localStorage.setItem('math-detective-state', raw);
      localStorage.removeItem('math-detective-today-lesson'); // Force fresh generation
    }, fixtureRaw);

    // Go to play — triggers fresh lesson generation
    await page.goto(`${BASE_URL}/play`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Now navigate through all steps to reach an answer phase
    let submitClicks = 0;
    let phaseAdvanced = false;

    for (let step = 0; step < 6 && !phaseAdvanced; step++) {
      // Navigate through phases on this step
      for (let i = 0; i < 15; i++) {
        const phaseInfo = await page.evaluate(() => {
          const main = document.querySelector('main');
          const buttons = Array.from(document.querySelectorAll('button'))
            .map(b => b.textContent?.trim()).filter(Boolean);
          const input = document.querySelector('input[type="text"], input[type="number"]');
          return { buttons, inputVisible: !!input, pageText: main?.textContent?.substring(0, 200) };
        });

        const submitBtn = phaseInfo.buttons.find(b => b?.includes('提交答案'));
        const isAnswerPhase = !!submitBtn && phaseInfo.inputVisible;

        if (isAnswerPhase) {
          submitClicks++;
          console.log(`ANSWER PHASE FOUND at step ${step}, phase ${i}`);
          console.log('Buttons:', phaseInfo.buttons.slice(0, 8));

          // Fill answer
          const inputField = page.locator('form input[name="answer"]').first();
          await inputField.waitFor({ state: 'visible', timeout: 2000 });

          const questionId = await page.evaluate(() => {
            const lesson = JSON.parse(localStorage.getItem('math-detective-today-lesson') || '{}');
            return lesson.steps?.[lesson.currentStepIndex]?.questionId as string;
          });
          const question = getQuestionById(questionId);
          expect(question).toBeDefined();
          const answer = String(question!.answer);
          await inputField.fill(answer);
          await page.waitForTimeout(100);

          // Record BEFORE
          const beforePhase = await page.evaluate(() => {
            const raw = localStorage.getItem('math-detective-today-lesson');
            const lesson = raw ? JSON.parse(raw) : null;
            const step = lesson?.steps?.[lesson.currentStepIndex];
            return step?.currentPhaseIndex;
          });

          // CLICK SUBMIT ONCE
          const btn = page.getByRole('button', { name: /提交答案/ });
          await btn.first().click({ force: true });
          await page.waitForTimeout(1000);

          // Record AFTER
          const afterPhase = await page.evaluate(() => {
            const raw = localStorage.getItem('math-detective-today-lesson');
            const lesson = raw ? JSON.parse(raw) : null;
            const step = lesson?.steps?.[lesson.currentStepIndex];
            const submitBtn = Array.from(document.querySelectorAll('button'))
              .find(b => b.textContent?.includes('提交答案'));
            return {
              phaseIndex: step?.currentPhaseIndex,
              stepIndex: lesson?.currentStepIndex,
              submitButtonVisible: !!submitBtn,
              awardedAt: step?.awardedAt,
            };
          });

          console.log(`BEFORE phase: ${beforePhase}, AFTER: ${JSON.stringify(afterPhase)}`);
          console.log(`Submit clicks: ${submitClicks}`);

          // ASSERT: phase advanced on first click
          if (afterPhase.phaseIndex !== beforePhase || afterPhase.stepIndex !== (beforePhase >= 0 ? step : step)) {
            phaseAdvanced = true;
            console.log('PASS: Phase advanced on first click');
          } else if (!afterPhase.submitButtonVisible) {
            phaseAdvanced = true;
            console.log('PASS: Submit button disappeared on first click');
          }

          // Also check if we need to click the explain "完成" button
          const completeBtn = page.getByRole('button', { name: /完成.*进入下一关|案件完美|下一关/ });
          if (await completeBtn.count() > 0) {
            await completeBtn.first().click({ force: true });
            await page.waitForTimeout(500);
          }
          break;
        }

        // Click the most relevant advance button
        const advanceButtons = phaseInfo.buttons.filter(b =>
          !b?.includes('提交答案') && !b?.includes('11') && !b?.includes('20') &&
          (b?.includes('→') || b?.includes('✓') || b?.includes('完成') || b?.includes('继续') || b?.includes('确认'))
        );
        const btnText = advanceButtons[0];
        if (btnText) {
          await page.getByRole('button', { name: btnText }).first().click({ force: true });
          await page.waitForTimeout(300);
        } else {
          // Try clicking number buttons (find_numbers phase)
          const numberBtn = phaseInfo.buttons.find(b => /^\d+$/.test(b || ''));
          if (numberBtn) {
            await page.getByRole('button', { name: numberBtn }).first().click({ force: true });
            await page.waitForTimeout(200);
          } else {
            // Click any visible button as last resort
            await page.locator('button').last().click({ force: true });
            await page.waitForTimeout(300);
          }
        }
      }
    }

    console.log(`\nTotal submit clicks: ${submitClicks}, Phase advanced on first click: ${phaseAdvanced}`);
    expect(submitClicks).toBe(1);
    expect(phaseAdvanced).toBe(true);
  });
});
