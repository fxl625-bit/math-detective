/**
 * Phase A1: Real Browser Submit Diagnosis — Production Build
 *
 * Tests on http://localhost:3100 (production build).
 * Only operates real DOM. Never calls internal functions.
 */
import { test, expect } from '@playwright/test';

test.describe('P0-1: Real Browser Submit Diagnosis', () => {

  test('captures build info and lesson structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // A) Verify build info
    const buildInfo = await page.evaluate(() => (window as any).__MD_BUILD_INFO__);
    console.log('\n=== BUILD INFO ===');
    console.log(JSON.stringify(buildInfo, null, 2));
    expect(buildInfo.appVersion).toBeDefined();

    // B) Read localStorage keys
    const storageKeys = await page.evaluate(() => {
      const keys: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        try {
          keys[key] = JSON.parse(localStorage.getItem(key) || '');
        } catch {
          keys[key] = localStorage.getItem(key);
        }
      }
      return keys;
    });
    console.log('\n=== STORAGE KEYS ===');
    for (const [k, v] of Object.entries(storageKeys)) {
      const preview = typeof v === 'object' ? JSON.stringify(v).substring(0, 100) : String(v).substring(0, 100);
      console.log(`  ${k}: ${preview}`);
    }

    // C) Check if old lesson exists
    const hasOldLesson = storageKeys['math-detective-today-lesson'];
    console.log(`\nHas cached lesson: ${!!hasOldLesson}`);

    // D) Navigate to /play
    await page.goto('/play');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // E) Read the rendered lesson state
    const initialState = await page.evaluate(() => {
      const main = document.querySelector('main');
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent?.trim(),
        visible: b.offsetParent !== null,
      }));
      return {
        url: window.location.href,
        mainHTML: main?.innerHTML?.substring(0, 500),
        buttonCount: buttons.length,
        visibleButtons: buttons.filter(b => b.visible).map(b => b.text),
        allButtons: buttons.map(b => b.text),
      };
    });
    console.log('\n=== INITIAL /play STATE ===');
    console.log('URL:', initialState.url);
    console.log('Visible buttons:', initialState.visibleButtons);

    // F) Count phases to reach answer
    let phaseCount = 0;
    let foundAnswer = false;

    for (let i = 0; i < 20 && !foundAnswer; i++) {
      // Check current phase
      const phase = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return { phase: 'unknown', text: '' };
        const headings = main.querySelectorAll('h1, h2, h3');
        const headingTexts = Array.from(headings).map(h => h.textContent?.trim()).filter(Boolean);
        const buttons = Array.from(main.querySelectorAll('button')).map(b => b.textContent?.trim());
        const submitBtn = buttons.find(b => b?.includes('提交答案'));
        const isAnswerPhase = !!submitBtn;
        const inputVisible = main.querySelector('input[type="text"], input[type="number"]') !== null;
        return {
          phase: isAnswerPhase ? 'ANSWER' : (headingTexts[0] || 'unknown'),
          heading: headingTexts.join(' | '),
          buttons: buttons.slice(0, 5),
          isAnswerPhase,
          inputVisible,
          submitButtonText: submitBtn,
        };
      });

      console.log(`\n--- Phase ${i + 1} ---`);
      console.log(JSON.stringify(phase, null, 2));

      if (phase.isAnswerPhase && phase.inputVisible) {
        foundAnswer = true;
        console.log(`\n*** FOUND ANSWER PHASE at click #${i + 1} ***`);

        // Read question info from localStorage
        const questionInfo = await page.evaluate(() => {
          const raw = localStorage.getItem('math-detective-today-lesson');
          if (!raw) return null;
          const lesson = JSON.parse(raw);
          const stepIdx = lesson.currentStepIndex || 0;
          const step = lesson.steps?.[stepIdx];
          return {
            stepIndex: stepIdx,
            questionId: step?.questionId,
            phaseIndex: step?.currentPhaseIndex,
            phases: step?.phases,
          };
        });
        console.log('Question info:', JSON.stringify(questionInfo));

        // G) Fill the answer input
        const inputField = page.locator('input[type="text"], input[type="number"]').first();
        await inputField.waitFor({ state: 'visible', timeout: 2000 });

        // Compute correct answer from page text
        const pageText = await page.textContent('main') || '';
        const eqMatch = pageText.match(/(\d+)\s*[-+]\s*(\d+)\s*=\s*\?/);
        if (!eqMatch) {
          console.log('WARNING: Could not find equation in page text');
          console.log('Page text excerpt:', pageText.substring(0, 300));
          // Try to get answer from numbers
          const numMatch = pageText.match(/(\d+).*?(\d+)/);
          if (numMatch) {
            const [_, a, b] = numMatch.map(Number);
            const answer = pageText.includes('+') || pageText.includes('加') || pageText.includes('一共')
              ? String(a + b) : String(Math.abs(a - b));
            console.log('Guessed answer:', answer, 'from numbers:', a, b);
            await inputField.fill(answer);
          } else {
            await inputField.fill('6'); // fallback
          }
        } else {
          const [_, aStr, bStr] = eqMatch;
          const a = parseInt(aStr), b = parseInt(bStr);
          const answer = pageText.includes('+') || pageText.includes('加') || pageText.includes('一共')
            ? String(a + b) : String(a - b);
          console.log('Equation:', `${a} ${pageText.includes('+') ? '+' : '-'} ${b} = ?  → answer: ${answer}`);
          await inputField.fill(answer);
        }

        await page.waitForTimeout(200);

        // H) BEFORE CLICK
        console.log('\n=== BEFORE CLICK ===');
        const before = await page.evaluate(() => {
          const raw = localStorage.getItem('math-detective-today-lesson');
          const lesson = raw ? JSON.parse(raw) : null;
          const step = lesson?.steps?.[lesson.currentStepIndex || 0];
          return {
            stepIndex: lesson?.currentStepIndex,
            phaseIndex: step?.currentPhaseIndex,
            phaseNames: step?.phases,
            awardedAt: step?.awardedAt,
          };
        });
        console.log(JSON.stringify(before, null, 2));

        await page.screenshot({ path: 'artifacts/v2102/submit-diagnosis/01-before-click.png', fullPage: true });

        // I) CLICK SUBMIT ONCE
        const submitBtn = page.getByRole('button', { name: /提交答案/ });
        await submitBtn.first().click({ force: true });

        // J) AFTER 100ms
        await page.waitForTimeout(100);
        console.log('\n=== AFTER 100ms ===');
        const after100 = await page.evaluate(() => {
          const raw = localStorage.getItem('math-detective-today-lesson');
          const lesson = raw ? JSON.parse(raw) : null;
          const step = lesson?.steps?.[lesson.currentStepIndex || 0];
          const submitBtn = Array.from(document.querySelectorAll('button'))
            .find(b => b.textContent?.includes('提交答案'));
          return {
            stepIndex: lesson?.currentStepIndex,
            phaseIndex: step?.currentPhaseIndex,
            phaseNames: step?.phases,
            awardedAt: step?.awardedAt,
            submitButtonVisible: !!submitBtn,
            submitButtonText: submitBtn?.textContent?.trim(),
          };
        });
        console.log(JSON.stringify(after100, null, 2));
        await page.screenshot({ path: 'artifacts/v2102/submit-diagnosis/02-after-100ms.png', fullPage: true });

        // K) AFTER 1000ms
        await page.waitForTimeout(900);
        console.log('\n=== AFTER 1000ms ===');
        const after1000 = await page.evaluate(() => {
          const raw = localStorage.getItem('math-detective-today-lesson');
          const lesson = raw ? JSON.parse(raw) : null;
          const step = lesson?.steps?.[lesson.currentStepIndex || 0];
          const submitBtn = Array.from(document.querySelectorAll('button'))
            .find(b => b.textContent?.includes('提交答案'));
          const allButtons = Array.from(document.querySelectorAll('button'))
            .map(b => b.textContent?.trim()).filter(Boolean);
          return {
            stepIndex: lesson?.currentStepIndex,
            phaseIndex: step?.currentPhaseIndex,
            currentPhase: step?.phases?.[step?.currentPhaseIndex || 0],
            phaseNames: step?.phases,
            awardedAt: step?.awardedAt,
            submitButtonVisible: !!submitBtn,
            visibleButtons: allButtons.slice(0, 5),
            mainText: document.querySelector('main')?.textContent?.substring(0, 300),
          };
        });
        console.log(JSON.stringify(after1000, null, 2));
        await page.screenshot({ path: 'artifacts/v2102/submit-diagnosis/03-after-1000ms.png', fullPage: true });

        // L) BUG ASSERTION
        const phaseChanged = after1000.phaseIndex !== before.phaseIndex;
        const stepChanged = after1000.stepIndex !== before.stepIndex;
        console.log(`\n=== DIAGNOSIS ===`);
        console.log(`Phase changed: ${phaseChanged} (${before.phaseIndex} → ${after1000.phaseIndex})`);
        console.log(`Step changed: ${stepChanged} (${before.stepIndex} → ${after1000.stepIndex})`);
        console.log(`Submit button visible after 1000ms: ${after1000.submitButtonVisible}`);

        if (after1000.submitButtonVisible) {
          console.log('BUG CONFIRMED: Submit button still visible after 1000ms — phase DID NOT advance');
          console.log('Phase name:', after1000.phaseNames?.[after1000.phaseIndex]);

          // L2) Click SECOND time
          const submitBtn2 = page.getByRole('button', { name: /提交答案/ });
          if (await submitBtn2.count() > 0) {
            await submitBtn2.first().click({ force: true });
            await page.waitForTimeout(1000);

            const afterSecond = await page.evaluate(() => {
              const raw = localStorage.getItem('math-detective-today-lesson');
              const lesson = raw ? JSON.parse(raw) : null;
              const step = lesson?.steps?.[lesson.currentStepIndex || 0];
              const submitBtn = Array.from(document.querySelectorAll('button'))
                .find(b => b.textContent?.includes('提交答案'));
              return {
                stepIndex: lesson?.currentStepIndex,
                phaseIndex: step?.currentPhaseIndex,
                currentPhase: step?.phases?.[step?.currentPhaseIndex || 0],
                submitButtonVisible: !!submitBtn,
              };
            });
            console.log('\n=== AFTER SECOND CLICK ===');
            console.log(JSON.stringify(afterSecond, null, 2));
            await page.screenshot({ path: 'artifacts/v2102/submit-diagnosis/04-after-second-click.png', fullPage: true });
          }
        } else {
          console.log('PASS: Phase advanced on first click');
        }

        break;
      }

      // Click the most prominent "next" button to advance
      const nextBtn = page.getByRole('button').filter({ hasText: /开始|读完了|找到|确认|理解|算式|完成|继续|下一步|关/ }).first();
      const btnCount = await nextBtn.count();
      if (btnCount > 0) {
        await nextBtn.click({ force: true });
        await page.waitForTimeout(400);
      } else {
        console.log('No advance button found, stopping');
        break;
      }
    }

    if (!foundAnswer) {
      console.log('WARNING: Never reached answer phase — lesson may have no answer-needed questions');
      // Take a screenshot of the final state
      await page.screenshot({ path: 'artifacts/v2102/submit-diagnosis/99-final-state.png', fullPage: true });
    }
  });
});
