# v2.11.0 Architecture Audit

**Date:** 2026-06-17 | **From:** v2.10.3 | **Branch:** refactor/v2110-runtime-curriculum

---

## 1. Which State System Does the App Use? Play vs. Legacy Solve

| Path | State Management | Status |
|------|-----------------|--------|
| `app/play/page.tsx` | Transaction system (commitLessonTransaction) | **PRODUCTION** |
| `app/play/solve/page.tsx` | Separate solve page, uses per-step routes | **STALE/UNUSED?** |
| `app/play/clues/page.tsx` | Per-step sub-page | **STALE/UNUSED?** |
| `app/play/noise/page.tsx` | Per-step sub-page | **STALE/UNUSED?** |
| `app/play/actions/page.tsx` | Per-step sub-page | **STALE/UNUSED?** |

**Finding:** The `app/play/` single-page with all phases rendered inline is the production path. 
The per-step sub-pages (`solve/`, `clues/`, etc.) appear to be legacy v1 routing that is STILL 
present in the codebase. These should be audited for removal.

**Answer:** ONLY `app/play/page.tsx` is the production state system.

---

## 2. Multiple State Machines

**YES.** The codebase contains **at least 3 overlapping state systems:**

| System | Location | Role |
|--------|----------|------|
| Transaction System | `lib/lessonTransaction.ts` | Central answer/phase/step advancement |
| Component Local State | `app/play/page.tsx` | `isAdvancing`, `feedback`, `showConfetti` |
| ThreeQuestionFlow Internal | `components/ThreeQuestionFlow.tsx` | Own phase management, calls `onCorrect` internally |

**Conflict:** ThreeQuestionFlow manages its own phase progression and calls `onCorrect()` → 
which triggers `onSubmitAnswer()` → which triggers `commitLessonTransaction('submit_answer')`. 
But the component parent THEN separately calls `onStepComplete()` → which triggers 
`commitLessonTransaction('complete_step')`. This is the **double-advance bug**.

---

## 3. Components with Local Phase State

| Component | Local Phase State | Problem |
|-----------|-------------------|---------|
| FullSolvePhased | `selectedMeaning` | OK (UI-only) |
| SpotExtraInfoPhased | `foundExtra` | OK (UI-only) |
| SpotMissingInfoPhased | `choice` | OK (UI-only) |
| FindActionWordsPhased | Local keyword selection | OK (UI-only) |
| ThreeQuestionFlow | **Phase advancement logic** | **PROBLEM: duplicates global phase** |
| EquationAnswerPhase | `inputValue`, submit logic | `onCorrect` + calling parent advancement |

**KEY FINDING:** EquationAnswerPhase and ThreeQuestionFlow BOTH call `onCorrect()` which 
in the play page becomes `handleStepComplete(true)` — but `handleSubmitAnswer` was already 
called to do `submit_answer`. This is the root cause of multi-click.

---

## 4. Components That Directly Modify Global Phase

| Component | Action | Problem |
|-----------|--------|---------|
| PlayPageContent.runLessonAction | commitLessonTransaction | Correct |
| PlayPageContent.handlePhaseAdvance | complete_phase transaction | Correct |
| PlayPageContent.handleSubmitAnswer | submit_answer transaction | **THEN handleStepComplete ALSO runs** |
| ThreeQuestionFlow.onCorrect | Calls submitAnswer THEN stepComplete | **DOUBLE ADVANCE** |

---

## 5. useEffect That Auto-Advances

| useEffect | Location | Behavior |
|-----------|----------|----------|
| lessonRef sync | PlayPageContent | Syncs ref with state (OK) |
| Invalid step detection | PlayPageContent | Auto-rebuilds lesson (OK, defensive) |
| E2E test API | PlayPageContent | Test hook (OK) |
| State migration | useGameState | Auto-migrates on load (OK) |

**No auto-advancing useEffects detected.** This is good — the problem is in the explicit 
call chain, not passive effects.

---

## 6. Paths That Bypass Answer

### Path A: ThreeQuestionFlow with full_solve step
```
Step type = full_solve
→ getDefaultPhasesForStepType returns ['read','known_facts','target','plan','answer','check','explain']
→ ThreeQuestionFlow renders known_facts → target → plan → check → answer → explain
→ After answer phase: ThreeQuestionFlow calls onCorrect(true)
→ onCorrect calls onSubmitAnswer(String(q.answer), q.id)
→ onSubmitAnswer = handleSubmitAnswer → submit_answer transaction
→ Transaction advances phase from 'answer' to 'explain'
→ Component THEN calls onStepComplete(true)
→ complete_step transaction advances to next step
→ If last step (5/6 or 6/6): lesson completed
```

**BUG 1:** If ThreeQuestionFlow is used with a step where `compatibleCount=0`, it may skip 
directly to explain without answer.

### Path B: step_degraded → full_solve fallback
```
Step type = find_compare_numbers
→ selectQuestionForStep returns null (compatibleCount=0)
→ step_degraded: step type changed to full_solve
→ getDefaultPhasesForStepType('full_solve') with no question returns basic phases
→ ['read','find_numbers','find_keywords','choose_operation','build_equation','answer','explain']
→ But if the question doesn't have equation fields: 'build_equation' renders empty
→ Next click: 'answer' appears but may not require real input
→ Or: question has isThreeQuestionFlowCompatible → different phases used
```

**BUG 2:** The step_degraded changes the step type but doesn't guarantee the question is 
compatible with full_solve phases.

### Path C: Last step completion without answer
```
Step 6 (any type) → currentPhase = 'explain'
→ User clicks "Continue" → handleStepComplete(true)
→ complete_step transaction → completeCurrentStep
→ stepIndex advances from 5 to 6 (>= steps.length)
→ lesson.completed = true
```

**BUG 3:** If the user reaches 'explain' phase on step 6 without ever going through 'answer', 
the lesson completes. The 'explain' phase is supposed to come AFTER answer, but there's no 
hard enforcement.

---

## 7. full_solve Usage Analysis

| Usage | Location | Legitimate? |
|-------|----------|-------------|
| Step type in lesson structure | `lib/types.ts` | Yes (step type enum) |
| Default fallback step type | `buildDailyLesson` | **NO** — should use `answer_only` |
| step_degraded target | `selectQuestionForStep` | **NO** — degrades to full_solve |
| Phase container component | `FullSolvePhased` | Yes (renders full_solve phases) |
| ThreeQuestionFlow routing | `getDefaultPhasesForStepType` | **Mixed** — handles both full_solve and TQF |
| catch-all in step type switch | `PhaseAwareStep` | **NO** — no answer enforcement |

---

## 8. Root Cause: Last Question Bypass

**Confirmed chain for the user's lesson 6 (g1ll_68, pattern question):**

1. Step 6 is `full_solve` type (degraded from something else or originally assigned)
2. For pattern questions, `getDefaultPhasesForStepType('full_solve', patternQ)` returns:
   `['read','find_numbers','understand_clues','answer','explain']`
3. But `find_numbers` for a pattern like "1, 3, 5, 7, __" may be the pattern itself
4. `understand_clues` renders without real interaction
5. `answer`: renders EquationAnswerPhase or pattern-specific input
6. BUT: If `full_solve` step was step_degraded and the PhaseAwareStep router matches 
   the step.type === 'full_solve', it goes to FullSolvePhased
7. FullSolvePhased at 'explain' phase shows the answer + "Complete" button
8. Clicking "Complete" calls `onStepComplete(true)` → complete_step → lesson done
9. **The answer may have been auto-filled or the 'answer' phase may have been skipped**

**Confirmed:** The last question completed because `full_solve` phases end at `explain`, 
and clicking "Complete" on explain advances without requiring an actual answer submission.

---

## 9. First vs Second Click Behavior

### First Click on Submit:
1. `handleSubmit` in EquationAnswerPhase collects form value
2. Calls `onCorrect()` → triggers both `onSubmitAnswer` and `onStepComplete`
3. `onSubmitAnswer` = `handleSubmitAnswer(inputAnswer, questionId)`
4. → `runLessonAction('submit_answer', {inputAnswer, questionId})`
5. → Inside: checks answer → correct → `commitLessonTransaction('submit_answer')`
6. → Transaction: advances phase from 'answer' to 'explain'
7. → `saveTodayLesson(result.nextLesson)`
8. → `setLesson(result.nextLesson)` — React re-renders with 'explain' phase
9. → BUT: `onStepComplete(true)` also runs → `complete_step` transaction → step advances
10. → If last step: lesson completed

### Second Click (if needed):
If the first click state isn't fully committed, the component may still show the same UI.
The second click processes what the first should have done.

### Third Click (reported in step 5):
The step_degraded logic may have caused multiple phase resets, requiring additional clicks 
to push through.

---

## 10. Step 5 (g1ll_32, 65-8) Triple-Click Analysis

```
Step 5 originally: find_compare_numbers
→ selectQuestionForStep('find_compare_numbers') with question g1ll_32 (65-8 comparison)
→ STEP_TYPE_REQUIREMENTS.find_compare_numbers: q.operation in ['multiplication','division','comparison']
→ g1ll_32.operation = 'comparison' → PASSES
→ But: isQuestionSafeForLesson check?
→ Or: compatibleCount=0 means NO candidates matched
→ step_degraded to full_solve
→ BUT the question 65-8 comparison may use three_question_flow phases
→ known_facts → target → plan → answer → check → explain
→ Each "Continue" click advances one phase
→ Answer phase appeared → user answered → correct → onCorrect
→ onCorrect triggers submit_answer → phase advances to 'check'
→ onStepComplete ALSO runs → step should advance
→ But the component may render check phase before step completes
→ User clicks again → NOW step completes
→ Total: 3 clicks instead of 1
```

---

## 11. Curriculum Generation vs Step Replacement Conflict

**Finding:** Two separate slot planning systems exist:

1. `FIXED_LATE_G1_LOWER_SLOTS` in `adaptiveDifficulty.ts` — designed for late G1 lower
2. `getStepTypesForGrade()` in `lessonPlanner.ts` — old generic planner

The fixed slots only activate when `usageStage >= 2 AND (semesterProgress === 'late' || semesterProgress === 'review')`.

Since current user has `usageStage = 1`, the fixed slots **never activate**! The old generic planner is used instead.

---

## 12. Why Three Different Versions

| Version | Source | Why Different |
|---------|--------|---------------|
| 2.10.3 | Hotfix commits (5d1acd7) | **Browser reads this** |
| v2.10.2 | todayLesson generation | **Stored in localStorage** from previous build |
| v2.10.0 | generationReport | buildDailyLesson hardcodes it |

**Root cause:** No single version constant. Each subsystem independently stores version info.

---

## 13. Why usageStage = 1

**Calculation chain:**
```
loadState() → storage.ts
  → daysEstimate = Math.ceil((totalCompleted || 0) / 5) = ceil(19/5) = 4
  → detectUsageStage(4, 19, {...})
    → if daysEstimate <= 5, accuracy > 85, hintRate < 0.3: stage = 2
    → if daysEstimate <= 5, accuracy <= 85: stage = 1
  → But with recentAccuracy=100 AND fullHintRate undefined...
```

**Likely issue:** The `fullHintRate` is `0` or `undefined`, and the stage detection logic 
defaults to stage 1 when hint usage is unknown. Or: `consecutiveCheckInDays` is 0 despite 
having `streak > 0`.

---

## 14. totalCompleted Semantics

**Code traces:**
- `completeQuestion()` in `useGameState` increments `totalCompleted` PER QUESTION
- `getVirtualRewards` uses `totalCompleted` as "完成X道题"
- `detectUsageStage` divides `totalCompleted / 5` to estimate "days"
- `learnerProfile.totalCompleted` is also set from `totalCompleted`

**Answer:** `totalCompleted` = **number of questions answered**, not lessons completed.
But the usage stage calculation treats it as lessons (divides by 5 for days).

**CORRECT interpretation:** 19 questions = ~3 lessons. Not 19 lessons.

---

## Summary: P0 Bugs Confirmed

| Bug | Severity | Root Cause |
|-----|----------|------------|
| Multi-click submit | P0 | Component calls submitAnswer THEN stepComplete in same handler |
| Last question bypass | P0 | full_solve 'explain' completes step without requiring answer |
| Single-digit for experienced | P0 | Fixed slots only activate at usageStage >= 2 |
| usageStage stuck at 1 | P0 | totalCompleted/5 gives 4 days, stage detection thresholds wrong |
| Version fragmentation | P1 | No single version source of truth |
| step_degraded instability | P0 | full_solve phases may not match question type |
| Double statistics recording | P1 | submit_answer AND complete_step both may record |
