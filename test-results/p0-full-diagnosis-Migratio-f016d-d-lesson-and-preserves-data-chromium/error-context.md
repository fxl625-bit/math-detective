# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: p0-full-diagnosis.spec.ts >> Migration: state-v28 >> auto-invalidates old lesson and preserves data
- Location: tests\e2e\p0-full-diagnosis.spec.ts:15:9

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - img [ref=e4]
  - heading "This page couldn’t load" [level=1] [ref=e6]
  - paragraph [ref=e7]: Reload to try again, or go back.
  - generic [ref=e8]:
    - button "Reload" [ref=e10] [cursor=pointer]
    - button "Back" [ref=e11] [cursor=pointer]
```

# Test source

```ts
  1   | /**
  2   |  * Phase A: Full Browser Diagnosis — State Fixtures + Migration Tests
  3   |  *
  4   |  * Tests 4 scenarios: v2.8, v2.9, v2.10.0, current state
  5   |  * All on production build at http://localhost:3100
  6   |  */
  7   | import { test, expect } from '@playwright/test';
  8   | import fs from 'fs';
  9   | 
  10  | const FIXTURES = ['state-v28', 'state-v29', 'state-v2100', 'state-current'];
  11  | const BASE_URL = 'http://localhost:3100';
  12  | 
  13  | for (const fixture of FIXTURES) {
  14  |   test.describe(`Migration: ${fixture}`, () => {
  15  |     test('auto-invalidates old lesson and preserves data', async ({ page }) => {
  16  |       // Load fixture data
  17  |       const raw = fs.readFileSync(`tests/fixtures/${fixture}.json`, 'utf-8');
  18  |       let fixtureData: any;
  19  | 
  20  |       if (fixture === 'state-current') {
  21  |         fixtureData = JSON.parse(raw);
  22  |       } else {
  23  |         fixtureData = { 'math-detective-state': raw };
  24  |       }
  25  | 
  26  |       // Inject localStorage
  27  |       await page.goto(BASE_URL);
  28  |       await page.evaluate((data: any) => {
  29  |         for (const [key, value] of Object.entries(data.localStorage || data)) {
  30  |           localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  31  |         }
  32  |       }, fixtureData);
  33  | 
  34  |       // Navigate to /play — triggers loadState migration + getTodayLesson
  35  |       await page.goto(`${BASE_URL}/play`);
  36  |       await page.waitForLoadState('networkidle');
  37  |       await page.waitForTimeout(1000);
  38  | 
  39  |       // Read migrated state
  40  |       const state = await page.evaluate(() => {
  41  |         const raw = localStorage.getItem('math-detective-state');
  42  |         if (!raw) return { error: 'no state after migration' };
  43  |         const s = JSON.parse(raw);
  44  |         return {
  45  |           stars: s.stars,
  46  |           streak: s.streak,
  47  |           totalCompleted: s.totalCompleted,
  48  |           usageStage: s.usageStage,
  49  |           curriculumProfile: s.curriculumProfile,
  50  |           hasLearnerProfile: !!s.learnerProfile,
  51  |           learnerDifficulty: s.learnerProfile?.currentDifficultyLevel,
  52  |           learnerTotalCompleted: s.learnerProfile?.totalCompleted,
  53  |           trainingMode: s.trainingMode,
  54  |           schoolHarder: s.schoolHarder,
  55  |         };
  56  |       });
  57  | 
  58  |       console.log(`\n=== ${fixture} MIGRATION RESULT ===`);
  59  |       console.log(JSON.stringify(state, null, 2));
  60  | 
  61  |       // Read lesson state
  62  |       const lessonInfo = await page.evaluate(() => {
  63  |         const raw = localStorage.getItem('math-detective-today-lesson');
  64  |         if (!raw) return { rebuilt: false, reason: 'no lesson' };
  65  |         const lesson = JSON.parse(raw);
  66  |         const steps = lesson.steps || [];
  67  |         return {
  68  |           rebuilt: true,
  69  |           stepCount: steps.length,
  70  |           firstStepId: steps[0]?.id,
  71  |           firstQuestionId: steps[0]?.questionId,
  72  |           hasSafeSteps: steps.some((s: any) => s.id?.includes('_safe_')),
  73  |           version: lesson.generatedByVersion,
  74  |           generatorVersion: lesson.generatorVersion,
  75  |           currentStepIndex: lesson.currentStepIndex,
  76  |         };
  77  |       });
  78  |       console.log('Lesson:', JSON.stringify(lessonInfo, null, 2));
  79  | 
  80  |       // Assertions
  81  |       // 1. Stars preserved (156 from fixture)
  82  |       expect(state.stars).toBe(156);
  83  | 
  84  |       // 2. Migration built learnerProfile
> 85  |       expect(state.hasLearnerProfile).toBe(true);
      |                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  86  | 
  87  |       // 3. Semester progress detected (June → review)
  88  |       const cp = state.curriculumProfile as any;
  89  |       expect(cp?.semesterProgress).toBe('review');
  90  | 
  91  |       // 4. Usage stage properly detected
  92  |       expect(state.usageStage).toBeGreaterThanOrEqual(3);
  93  | 
  94  |       // 5. Learner difficulty calibrated (≥2 from migration)
  95  |       expect(state.learnerDifficulty).toBeGreaterThanOrEqual(2);
  96  | 
  97  |       // 6. Old lesson automatically INVALIDATED (safe_ prefix → rebuild)
  98  |       if (fixture === 'state-current') {
  99  |         // state-current has a safe_ lesson that should be auto-replaced
  100 |         expect(lessonInfo.hasSafeSteps).toBe(false);
  101 |         expect(lessonInfo.generatorVersion).toBeGreaterThanOrEqual(4);
  102 |       }
  103 | 
  104 |       // 7. trainingMode default populated
  105 |       expect(state.trainingMode).toBeDefined();
  106 |     });
  107 |   });
  108 | }
  109 | 
  110 | test.describe('P0-1: Real Browser Submit Click Count', () => {
  111 |   test('submit advances on first click — digit input', async ({ page }) => {
  112 |     // Inject current state with v2.10.0 profile (usageStage 3, difficulty 3)
  113 |     const fixtureRaw = fs.readFileSync('tests/fixtures/state-v2100.json', 'utf-8');
  114 |     await page.goto(BASE_URL);
  115 |     await page.evaluate((raw) => {
  116 |       localStorage.setItem('math-detective-state', raw);
  117 |       localStorage.removeItem('math-detective-today-lesson'); // Force fresh generation
  118 |     }, fixtureRaw);
  119 | 
  120 |     // Go to play — triggers fresh lesson generation
  121 |     await page.goto(`${BASE_URL}/play`);
  122 |     await page.waitForLoadState('networkidle');
  123 |     await page.waitForTimeout(1500);
  124 | 
  125 |     // Now navigate through all steps to reach an answer phase
  126 |     let submitClicks = 0;
  127 |     let phaseAdvanced = false;
  128 | 
  129 |     for (let step = 0; step < 6 && !phaseAdvanced; step++) {
  130 |       // Navigate through phases on this step
  131 |       for (let i = 0; i < 15; i++) {
  132 |         const phaseInfo = await page.evaluate(() => {
  133 |           const main = document.querySelector('main');
  134 |           const buttons = Array.from(document.querySelectorAll('button'))
  135 |             .map(b => b.textContent?.trim()).filter(Boolean);
  136 |           const input = document.querySelector('input[type="text"], input[type="number"]');
  137 |           return { buttons, inputVisible: !!input, pageText: main?.textContent?.substring(0, 200) };
  138 |         });
  139 | 
  140 |         const submitBtn = phaseInfo.buttons.find(b => b?.includes('提交答案'));
  141 |         const isAnswerPhase = !!submitBtn && phaseInfo.inputVisible;
  142 | 
  143 |         if (isAnswerPhase) {
  144 |           submitClicks++;
  145 |           console.log(`ANSWER PHASE FOUND at step ${step}, phase ${i}`);
  146 |           console.log('Buttons:', phaseInfo.buttons.slice(0, 8));
  147 | 
  148 |           // Fill answer
  149 |           const inputField = page.locator('input').first();
  150 |           await inputField.waitFor({ state: 'visible', timeout: 2000 });
  151 | 
  152 |           // Get answer from page
  153 |           const eqText = phaseInfo.pageText || '';
  154 |           const eqMatch = eqText.match(/(\d+)\s*[-+]\s*(\d+)/);
  155 |           let answer = '6';
  156 |           if (eqMatch) {
  157 |             const a = parseInt(eqMatch[1]), b = parseInt(eqMatch[2]);
  158 |             answer = eqText.includes('+') || eqText.includes('加') || eqText.includes('一共')
  159 |               ? String(a + b) : String(a - b);
  160 |           }
  161 |           await inputField.fill(answer);
  162 |           await page.waitForTimeout(100);
  163 | 
  164 |           // Record BEFORE
  165 |           const beforePhase = await page.evaluate(() => {
  166 |             const raw = localStorage.getItem('math-detective-today-lesson');
  167 |             const lesson = raw ? JSON.parse(raw) : null;
  168 |             const step = lesson?.steps?.[lesson.currentStepIndex];
  169 |             return step?.currentPhaseIndex;
  170 |           });
  171 | 
  172 |           // CLICK SUBMIT ONCE
  173 |           const btn = page.getByRole('button', { name: /提交答案/ });
  174 |           await btn.first().click({ force: true });
  175 |           await page.waitForTimeout(1000);
  176 | 
  177 |           // Record AFTER
  178 |           const afterPhase = await page.evaluate(() => {
  179 |             const raw = localStorage.getItem('math-detective-today-lesson');
  180 |             const lesson = raw ? JSON.parse(raw) : null;
  181 |             const step = lesson?.steps?.[lesson.currentStepIndex];
  182 |             const submitBtn = Array.from(document.querySelectorAll('button'))
  183 |               .find(b => b.textContent?.includes('提交答案'));
  184 |             return {
  185 |               phaseIndex: step?.currentPhaseIndex,
```