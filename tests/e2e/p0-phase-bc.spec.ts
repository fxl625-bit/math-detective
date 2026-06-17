/**
 * Phase B+C: Submit Fix + No Single-Digit Questions Test
 * Uses state fixture and real browser.
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'http://localhost:3100';

test.describe('Phase B: One-Click Submit (Full 6 Levels)', () => {
  test('all 6 levels advance on first correct submit click', async ({ page }) => {
    await page.goto(BASE_URL);

    // Inject v2.10.0 state with usageStage 3, totalCompleted 85
    const stateJson = fs.readFileSync('tests/fixtures/state-v2100.json', 'utf-8');
    await page.evaluate((raw) => {
      localStorage.setItem('math-detective-state', raw);
      localStorage.removeItem('math-detective-today-lesson');
    }, stateJson);

    // Navigate to /play
    await page.goto(`${BASE_URL}/play`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    let totalSubmitClicks = 0;
    let multiClickLevels = 0;

    // Navigate through all 6 steps
    for (let level = 1; level <= 6; level++) {
      let foundAnswer = false;
      let thisLevelClicks = 0;

      // Click through phases until answer or timeout
      for (let phase = 0; phase < 20; phase++) {
        const phaseInfo = await page.evaluate(() => {
          const main = document.querySelector('main');
          const buttons = Array.from(document.querySelectorAll('button'))
            .filter(b => b.offsetParent !== null)
            .map(b => b.textContent?.trim()).filter(Boolean);
          const input = document.querySelector('input:not([type="hidden"])');
          const mainText = main?.textContent?.substring(0, 500) || '';
          return { buttons, inputVisible: !!input, mainText, url: window.location.href };
        });

        const submitBtn = phaseInfo.buttons.find(b => b?.includes('提交答案'));
        const isAnswerPhase = !!submitBtn;

        if (isAnswerPhase) {
          foundAnswer = true;
          totalSubmitClicks++;
          thisLevelClicks++;

          console.log(`Level ${level}: ANSWER PHASE. Buttons: ${phaseInfo.buttons.slice(0,6).join(', ')}`);

          // Get answer from equation in page text
          const eqMatch = phaseInfo.mainText.match(/(\d+)\s*[-+]\s*(\d+)\s*=\s*\?/);
          let answer = '6';
          if (eqMatch) {
            const a = parseInt(eqMatch[1]), b = parseInt(eqMatch[2]);
            if (phaseInfo.mainText.includes('+') || phaseInfo.mainText.includes('加') || phaseInfo.mainText.includes('一共'))
              answer = String(a + b);
            else answer = String(a - b);
          }
          console.log(`  Answer: ${answer}`);

          // Fill input and click submit ONCE
          const input = page.locator('input:not([type="hidden"])').first();
          await input.fill(answer);
          await page.waitForTimeout(100);

          // Record BEFORE state
          const before_phase = await page.evaluate(() => {
            const raw = localStorage.getItem('math-detective-today-lesson');
            if (!raw) return null;
            const l = JSON.parse(raw);
            const s = l.steps?.[l.currentStepIndex];
            return s?.currentPhaseIndex;
          });

          // CLICK SUBMIT ONCE
          await page.getByRole('button', { name: /提交答案/ }).first().click({ force: true });
          await page.waitForTimeout(1000);

          // Record AFTER state
          const after = await page.evaluate(() => {
            const raw = localStorage.getItem('math-detective-today-lesson');
            if (!raw) return { error: 'no_lesson' };
            const l = JSON.parse(raw);
            const s = l.steps?.[l.currentStepIndex];
            const submitBtn = Array.from(document.querySelectorAll('button'))
              .find(b => b.textContent?.includes('提交答案'));
            return {
              phaseIndex: s?.currentPhaseIndex,
              stepIndex: l.currentStepIndex,
              submitVisible: !!submitBtn,
              awardedAt: !!s?.awardedAt,
            };
          });

          console.log(`  Before phase: ${before_phase}, After: ${JSON.stringify(after)}`);

          // Verify advancement
          if (after.phaseIndex !== before_phase) {
            console.log(`  ✅ Level ${level}: phase advanced on first click`);
          } else if (!after.submitVisible) {
            console.log(`  ✅ Level ${level}: submit button gone after first click`);
          } else {
            multiClickLevels++;
            console.log(`  ❌ Level ${level}: submit button still visible — needs 2nd click`);

            // Click again (for diagnosis only)
            await page.getByRole('button', { name: /提交答案/ }).first().click({ force: true });
            await page.waitForTimeout(500);
            totalSubmitClicks++;
          }

          // Click "完成" / "下一步" if present
          for (const btnText of ['完成，进入下一关', '完成', '进入下一关', '案件完美侦破', '下一步', '确认']) {
            const completeBtn = page.getByRole('button', { name: new RegExp(btnText) });
            if (await completeBtn.count() > 0) {
              await completeBtn.first().click({ force: true });
              await page.waitForTimeout(500);
              break;
            }
          }
          break;
        }

        // Click advance button
        const advanceText = phaseInfo.buttons.find(b =>
          b?.includes('→') || b?.includes('✓') || b?.includes('找到') ||
          b?.includes('确认') || b?.includes('理解') || b?.includes('算式') ||
          b?.includes('读完了') || b?.includes('完成') || b?.includes('开始')
        );
        if (advanceText) {
          try {
            await page.getByRole('button', { name: advanceText }).first().click({ force: true });
          } catch {
            await page.locator('button').filter({ hasText: advanceText }).first().click({ force: true });
          }
          await page.waitForTimeout(300);
        } else {
          // Try number buttons for find_numbers phase
          const numBtn = phaseInfo.buttons.find(b => /^\d+$/.test(b || ''));
          if (numBtn) {
            await page.getByRole('button', { name: numBtn }).first().click({ force: true });
            await page.waitForTimeout(200);
          }
        }
      }

      if (!foundAnswer) {
        console.log(`⚠️ Level ${level}: no answer phase found (may have no submit-needed step)`);
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total answers: ${totalSubmitClicks}`);
    console.log(`Multi-click levels: ${multiClickLevels}`);

    // Check for single-digit questions
    const lessonQuestions = await page.evaluate(() => {
      const raw = localStorage.getItem('math-detective-today-lesson');
      if (!raw) return [];
      const l = JSON.parse(raw);
      return l.steps?.map((s: any) => s.questionId) || [];
    });
    console.log(`\nQuestions: ${JSON.stringify(lessonQuestions)}`);

    // All questions must advance on first click
    expect(multiClickLevels).toBe(0);
  });
});

test.describe('Phase C: No Single-Digit Questions', () => {
  test('no single-digit questions for experienced user', async ({ page }) => {
    await page.goto(BASE_URL);
    const stateJson = fs.readFileSync('tests/fixtures/state-v2100.json', 'utf-8');
    await page.evaluate((raw) => {
      localStorage.setItem('math-detective-state', raw);
      localStorage.removeItem('math-detective-today-lesson');
    }, stateJson);

    await page.goto(`${BASE_URL}/play`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Read generated questions
    const questions = await page.evaluate(() => {
      const raw = localStorage.getItem('math-detective-today-lesson');
      if (!raw) return [];
      return JSON.parse(raw).steps?.map((s: any) => s.questionId) || [];
    });

    // Also read the debug report
    const report = await page.evaluate(() => {
      const raw = localStorage.getItem('math-detective-today-lesson');
      if (!raw) return null;
      const l = JSON.parse(raw);
      const questions = (window as any).__MD_DEBUG__?.lastLessonGenerationReport?.selectedQuestions || [];
      return {
        questionIds: questions.map((q: any) => q.id),
        difficulties: questions.map((q: any) => q.difficulty),
        tiers: questions.map((q: any) => q.assessmentTier),
        hasSingleDigit: questions.some((q: any) =>
          q.difficulty === 1 ||
          (q.curriculumSkills && (q.curriculumSkills.includes('single_digit') || q.curriculumSkills.includes('addition_within_10')))
        ),
      };
    });

    console.log('Questions:', questions);
    console.log('Report:', JSON.stringify(report, null, 2));

    // Verify NO single-digit
    expect(report?.hasSingleDigit).toBe(false);
  });
});
