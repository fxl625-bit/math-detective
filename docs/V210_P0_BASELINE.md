# v2.10.0 P0 Baseline

> Generated before any Sub-project fixes.

## 1. Current Branch

```
feat/v290
```

## 2. Current Commit

```
2e4c287 fix(v2.9.0): activate adaptive curriculum engine + stale lesson detection
```

## 3. Current Version

`2.9.1` (uncommitted v2.9.1 changes in working tree)

## 4. Three P0 Reproduction

### P0-1: Submit 5 Times

**Reproduction**: Enter correct answer in EquationAnswerPhase, click "提交答案". Page appears to do nothing. Click 3-5 more times. Eventually phase advances.

**Root cause hypothesis**: Phase names in `STEP_DEFAULT_PHASES` (lib/types.ts) don't match the render branches in Phased components (app/play/page.tsx). Components handle old names (`find_numbers`, `find_keywords`, `choose_operation`, `build_equation`) but phases now contain new names (`identify_known_facts`, `check_answer`). Unhandled phases cause `return null` (line 2049), making it look like the submit didn't work. User clicks again → phase advances to next unhandled phase → still null → repeat.

### P0-2: Three-question Blank Page

**Reproduction**: Lesson step with `full_solve` type. Phase advances from `read` to `identify_known_facts` → FullSolvePhased has no handler for this → returns null → blank content.

**Root cause hypothesis**: Same phase mismatch as P0-1. Line 2049 `return null;` causes blank page when phase is unrecognized.

### P0-3: Simple Arithmetic Questions

**Reproduction**: Real `/play` generates mostly 8+3, 6+4 type single-digit problems.

**Root cause hypothesis**: Lesson planner falls back to safe questions when curriculum-aware selection produces no compatible candidates (due to phase/step/theme/RF mismatches). `fallbackUsed=true` silences the gap.

## 5. Reproduction Steps

1. Open http://localhost:3000 (child mode)
2. Play through daily lesson
3. Observe single-digit problems (P0-3)
4. Submit answer — observe need for multiple clicks (P0-1)
5. Observe blank page on "三问法破案" step (P0-2)

## 6. Current localStorage Key Structure

```
math-detective-save          → GameState JSON
math-detective-today-lesson  → TodayLesson JSON
math-detective-app-version   → version string
math-detective-story-history → recent story IDs
```

## 7. Current lesson/step/phase Structure

```typescript
// v2.9.1 STEP_DEFAULT_PHASES (lib/types.ts):
full_solve: ['read', 'identify_known_facts', 'identify_target', 'plan_solution', 'answer', 'check_answer', 'explain']
find_numbers: ['read', 'identify_known_facts', 'identify_target', 'answer', 'check_answer']
find_action_words: ['read', 'identify_known_facts', 'identify_target', 'plan_solution', 'answer', 'check_answer']
simulation: ['read', 'identify_known_facts', 'identify_target', 'plan_solution', 'answer', 'check_answer']
remove_noise: ['read', 'identify_known_facts', 'identify_target', 'plan_solution', 'answer', 'check_answer']
find_compare_numbers: ['read', 'identify_known_facts', 'identify_target', 'plan_solution', 'answer', 'check_answer']
spot_extra_info: ['read', 'identify_known_facts', 'identify_target', 'plan_solution', 'answer', 'check_answer']
spot_missing_info: ['read', 'identify_known_facts', 'identify_target', 'answer', 'check_answer']
```

## 8. Current Task Generation Function Call Chain

```
/play
  → getTodayLesson()
    → loadState()
      → getTodayLesson() in lessonPlanner
        → checks localStorage 'math-detective-today-lesson'
        → if valid & fresh → reuse
        → if stale/missing → buildDailyLesson()
          → getUsageContext() (grade, semester, usageStage)
          → generateDailySlotPlan() (6 slots)
          → For each slot:
            → selectCurriculumAwareQuestion()
              → selectQuestionsForSlot() (curriculum filter)
              → apply story/step/theme/RF filters
              → if no candidates → tryCurriculumSelection fallback
              → if still nothing → legacy selectQuestionForStep()
          → saveTodayLesson()
```

## 9. P0 Test Files

Not yet created:
- `tests/unit/submit-transaction.test.ts`
- `tests/component/three-question-flow.test.tsx`
- `tests/integration/real-curriculum-generation.test.ts`
- `tests/e2e/submit-once.spec.ts`
- `tests/e2e/three-question-no-blank.spec.ts`
- `tests/e2e/real-difficulty.spec.ts`

## 10. Scope Prohibited in This Round

- ❌ New question types
- ❌ New animations/transitions
- ❌ New reward mechanics
- ❌ New theme/story content
- ❌ New UI components (beyond bugfix)
- ❌ Curriculum map / question pool expansion
- ❌ Parent settings UI changes
- ❌ Any code outside these files:
  - `lib/lessonTransaction.ts`
  - `lib/types.ts` (only phase/action types)
  - `app/play/page.tsx` (only Phased components and submit flow)
  - `lib/lessonPlanner.ts` (only fallback rules)
  - `lib/adaptiveDifficulty.ts` (only candidate pool diagnostics)
  - `tests/` (new test files)
