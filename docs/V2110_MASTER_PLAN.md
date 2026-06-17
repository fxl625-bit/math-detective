# Math Detective v2.11.0 — Stability & Curriculum Runtime Rebuild

**Target:** Math Detective (math-detective)  
**From:** v2.10.3 (hotfix/runtime-proof-v2102, commit 5d1acd7)  
**To:** v2.11.0 (refactor/v2110-runtime-curriculum)  
**Date:** 2026-06-17  

---

## 1. Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│  App Layer                                              │
│  ├─ app/play/page.tsx (2348 lines, GOD COMPONENT)       │
│  │   ├─ PlayPageContent (1800+ lines render logic)      │
│  │   ├─ runLessonAction (transaction orchestrator)      │
│  │   ├─ Rule out legacy step renderer (per-step-type)   │
│  │   ├─ FullSolvePhased (phased solver component)       │
│  │   ├─ ThreeQuestionFlow integration                   │
│  │   └─ EquationAnswerPhase (answer input component)    │
│  │                                                      │
│  ├─ app/play/solve/page.tsx (501 lines, DUPLICATE)      │
│  ├─ app/play/clues/page.tsx                             │
│  ├─ app/play/noise/page.tsx                             │
│  └─ app/play/actions/page.tsx                           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Core Library                                           │
│  ├─ lib/lessonTransaction.ts (926 lines)                │
│  │   ├─ commitLessonTransaction (main dispatch)         │
│  │   ├─ handleSubmitAnswer                             │
│  │   ├─ handleCompleteStep                             │
│  │   ├─ handleCompletePhase                            │
│  │   ├─ handleContinueAfterRepair                      │
│  │   ├─ handleGoNext/GoBack/GoPrevLevel                │
│  │   └─ DebugState tracking                             │
│  │                                                      │
│  ├─ lib/lessonPlanner.ts (1784 lines)                   │
│  │   ├─ getTodayLesson (cache + rebuild)                │
│  │   ├─ buildDailyLesson (main generator)               │
│  │   ├─ selectQuestionForStep (picker)                  │
│  │   ├─ safeNormalizeLesson (validation + repair)       │
│  │   ├─ normalizeStep/normalizeLesson                   │
│  │   ├─ advancePhase/completeCurrentStep                │
│  │   ├─ generateSafeFallbackLesson                      │
│  │   └─ getDefaultPhasesForStepType                     │
│  │                                                      │
│  ├─ lib/storage.ts (480 lines)                          │
│  │   ├─ loadState/saveState                             │
│  │   ├─ getAccuracyStats                                │
│  │   └─ Various getters                                 │
│  │                                                      │
│  ├─ lib/migrations.ts                                   │
│  │   └─ migrateGameState (v0→v8)                        │
│  │                                                      │
│  ├─ lib/learnerProfile.ts (296 lines)                   │
│  │   ├─ detectUsageStage                               │
│  │   ├─ buildLearnerProfile                            │
│  │   └─ initCurriculumProfile                          │
│  │                                                      │
│  ├─ lib/adaptiveDifficulty.ts                           │
│  │   ├─ generateDailySlotPlan                           │
│  │   ├─ selectQuestionsForSlot                          │
│  │   └─ pickQuestionFromCandidates                      │
│  │                                                      │
│  └─ lib/curriculum/ (sub-module)                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                             │
│  ├─ data/questions/g1.ts (560 lines, ~20 Qs)            │
│  ├─ data/questions/g1-lower-late.ts (6181 lines, 88 Qs) │
│  ├─ data/questions/g1-thinking.ts (690 lines)           │
│  └─ data/questions/index.ts (aggregator)                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  State Management                                       │
│  ├─ hooks/useGameState.ts (React context)               │
│  ├─ localStorage: math-detective-state                  │
│  ├─ localStorage: math-detective-today-lesson           │
│  └─ lessonRef (React ref shadow of state)               │
└─────────────────────────────────────────────────────────┘
```

## 2. Page Runtime Chain

```
User loads /play
  → PlayPageContent mounts
  → useEffect: getTodayLesson() → safeNormalizeLesson()
  → setLesson(validated)
  → Render current step based on step.type + currentPhase

For each user action:
  → runLessonAction(action, payload, source)
  → commitLessonTransaction({ state, action, payload })
  → saveTodayLesson(result.nextLesson)
  → setLesson(result.nextLesson)

Lesson completion:
  → completeCurrentStep advances stepIndex
  → If stepIndex >= steps.length: lesson.completed = true
  → grantDailyRewardOnce + markDailyRewardShown
  → Show completion screen
```

## 3. Answer State Machine (Current - BROKEN)

```
User clicks "Submit" button
  → Component collects answer (from FormData, ref, or state)
  → Phase in ThreeQuestionFlow: calls onCorrect() → onSubmitAnswer()
  → Phase in EquationAnswerPhase: calls onCorrect() → onSubmitAnswer()
  → onSubmitAnswer = handleSubmitAnswer
  → runLessonAction('submit_answer', {inputAnswer, questionId})
  
  Inside runLessonAction:
    1. Transition lock check (transitioningRef)
    2. Submit count tracking (submitPerQuestion)
    3. Answer validation via checkAnswer()
    4. If WRONG: record stats, RETURN early (no lesson state change)
    5. If CORRECT: mark pendingCorrectStats
    6. commitLessonTransaction('submit_answer')
       → handleSubmitAnswer():
         a. Find question by ID
         b. Check answer
         c. If wrong: return noChange
         d. If correct + more phases remain: advance phase by 1
         e. If correct + last phase: completeCurrentStep()
    7. If answer action didn't advance: log P0 error
    8. saveTodayLesson, setLesson
  
  **BUG: The component THEN separately calls onStepComplete(true)**
  **which triggers another transaction!**
```

## 4. Lesson Data Structure

```typescript
interface TodayLesson {
  date: string;
  steps: LessonStep[];
  currentStepIndex: number;
  completed: boolean;
  caseStoryId?: string;
  // v2.8.0 reward idempotency
  rewardClaimed?: boolean;
  rewardShown?: boolean;
  rewardClaimedAt?: string;
  rewardShownAt?: string;
  completedAt?: string;
  // Legacy fields
  generatedByVersion?: string;
  generatorVersion?: number;
}

interface LessonStep {
  id: string;
  type: LessonStepType;      // find_numbers | find_action_words | ... | full_solve
  title: string;
  description: string;
  questionId: string;
  status: 'locked' | 'current' | 'completed';
  phases: StepPhase[];
  currentPhaseIndex: number;
  requiresAnswer: boolean;
  awardedAt?: string;        // v2.8.4 idempotency
}
```

## 5. Question Selection & Lesson Generation

```
getTodayLesson()
  → Check localStorage cache
    → Version check: generatedByVersion, generatorVersion, semester
    → Safe steps check
    → If stale: rebuild
  → If valid cache: safeNormalizeLesson → return

buildDailyLesson(profile, completedQuestions, mistakes)
  → getUsageContext() → usageStage, semester, grade
  → generateDailySlotPlan() → 6 slots with category, difficulty, tier
  → For each slot:
    → selectQuestionsForSlot()
    → pickQuestionFromCandidates()
    → Build step: type from slot, phases from getDefaultPhasesForStepType
  → Return TodayLesson with 6 steps

safeNormalizeLesson(lesson)
  → Validate date, steps array, completion
  → Normalize all steps
  → Fix currentStepIndex
  → Validate step-question compatibility
  → Check theme matching
  → Return or fallback
```

## 6. localStorage & Migration Structure

```
math-detective-state: GameState (version 8)
  ├─ stars, points, streak
  ├─ completedQuestions[]
  ├─ mistakes[], skillMistakes{}
  ├─ badges[], parentRewards[]
  ├─ totalCompleted (ambiguous: questions? lessons?)
  ├─ completedToday
  ├─ curriculumProfile
  ├─ learnerProfile
  ├─ usageStage
  ├─ decorations[], collectibleCards[]
  ├─ parentSettings{ gradeBand, semester, semesterOverride }
  └─ attemptRecords[]

math-detective-today-lesson: TodayLesson
  ├─ date, steps[], currentStepIndex, completed
  └─ generatedByVersion, generatorVersion, curriculumSnapshot

Migration: migrateGameState() in lib/migrations.ts
  - Handles v0 → v8
  - LEARNING_STATE_VERSION = 8
  - Auto-initializes curriculumProfile, learnerProfile
```

## 7. Duplicate State Fields (THE PROBLEM)

```
| Concept           | Fields tracking it                              |
|-------------------|-------------------------------------------------|
| Current phase     | lesson.steps[i].currentPhaseIndex                |
|                   | + Component local phase variable                 |
|                   | + ThreeQuestionFlow internal phase               |
| Answer correctness| lessonTransaction result.advanced                |
|                   | + Component local isCorrect state                |
|                   | + step.awardedAt (idempotency)                   |
| Step completion   | step.status === 'completed'                      |
|                   | + Component useEffect auto-advance               |
|                   | + complete_step transaction                      |
| Lesson completion | lesson.completed                                 |
|                   | + No step left condition in component            |
|                   | + completeCurrentStep auto-set                   |
| Statistics        | state.totalCompleted (unclear semantics)         |
|                   | state.completedQuestions (array, questions)      |
|                   | learnerProfile.totalCompleted (unclear)          |
| Version           | appVersion: 2.10.3                               |
|                   | todayLessonVersion: v2.10.2                      |
|                   | generationReport.appVersion: v2.10.0             |
|                   | lessonPlanner.plannerVersion: 4                  |
```

## 8. Failing Tests & Broken Behaviors

### Multi-click bug root cause:
1. Component's EquationAnswerPhase has local `handleSubmit`
2. It calls `onCorrect()` which triggers `onSubmitAnswer(inputAnswer, questionId)`
3. `submit_answer` advances phase → next phase is `explain`
4. Component THEN calls `onStepComplete(true)` which triggers `complete_step`
5. `complete_step` advances step → two transactions, but user sees one click
6. OR: component state is stale (ref not updated yet), user must click again

### Last question bypass root cause:
1. step_degraded → full_solve
2. full_solve in ThreeQuestionFlow: after plan phase, `onCorrect` can be called
3. ThreeQuestionFlow marks complete without going through `answer` phase
4. OR: when stepDegraded, compatibleCount=0, question gets full_solve steps
5. full_solve's last phase is `explain`, which auto-completes step
6. Step completion auto-advances, lesson completes if last step

### UsageStage=1 root cause:
- `detectUsageStage(daysEstimate, totalCompleted)` 
- daysEstimate = Math.ceil(totalCompleted / 5) = ceil(19/5) = 4
- With 4 days estimated, usageStage stays at 1 (early)
- totalCompleted counts QUESTIONS not LESSONS
- After 2 months, user completed 19 questions (~3 lessons at 6q each)
- So actual active days could be ~19, but the code divides by 5

### Version fragmentation:
- appVersion: 2.10.3 (hardcoded in component?)
- todayLessonVersion: v2.10.2 (from generateLesson)
- generationReport.appVersion: v2.10.0 (from buildDailyLesson)
- plannerVersion: 4 (internal counter)
- No single source of truth for version

## 9. Modules to Rewrite

| Module                      | Action   | Reason                                    |
|-----------------------------|----------|-------------------------------------------|
| app/play/page.tsx           | REWRITE  | 2348-line god component, 3 state systems  |
| lib/lessonTransaction.ts    | REFACTOR | Multiple legacy action handlers           |
| lib/lessonPlanner.ts        | REFACTOR | Review semantics, new slot planner        |
| lib/learnerProfile.ts       | FIX      | usageStage calculation, totalCompleted    |
| lib/migrations.ts           | EXTEND   | Add v2.11 migration                       |
| lib/types.ts                | EXTEND   | New runtime types, deprecate old          |
| lib/adaptiveDifficulty.ts   | REWRITE  | New 6-slot curriculum planner             |
| data/questions/g1-lower-late.ts | EXTEND | Add missing question types             |
| data/questions/* (new)      | CREATE   | New question pools                        |
| hooks/useGameState.ts       | AUDIT    | Check state sync                          |
| lib/storage.ts              | EXTEND   | New stat fields, migration support        |
| VERSION.md                  | UPDATE   | v2.11.0 unified                           |
| components/ThreeQuestionFlow | FIX     | Don't auto-complete, don't bypass answer  |

## 10. Modules to Preserve

| Module                          | Action  |
|---------------------------------|---------|
| components/ui/*                 | KEEP    |
| components/layout/*             | KEEP    |
| components/DetectiveMascot      | KEEP    |
| components/Confetti             | KEEP    |
| Components/HintSystem           | KEEP    |
| lib/answerChecker.ts            | KEEP    |
| lib/hintSafety.ts               | KEEP    |
| lib/rewardSystem.ts             | KEEP    |
| lib/storySystem.ts              | KEEP    |
| lib/questionValidation.ts       | KEEP    |
| lib/questionSafety.ts           | KEEP    |
| data/questions/g2*.ts           | KEEP    |
| data/questions/g3*.ts+          | KEEP    |

## 11. Risk Points

1. **Data loss risk:** Migration v2.11 must preserve all user data
2. **Regression risk:** Rewriting play page could break existing features
3. **Question pool risk:** New questions need curriculum alignment
4. **Build risk:** TypeScript strict mode changes could cascade
5. **Test risk:** Playwright tests depend on DOM structure

## 12. Data Protection Plan

1. Backup state before migration: artifacts/v2110/state-before.json
2. Preserve all reading from localStorage
3. Migration adds fields, never removes
4. Old todayLesson auto-invalidated (rebuilds fresh)
5. Historical lessons in completedQuestions preserved
6. No stat resets, no reward clears

## 13. Phase Implementation Order

### Phase 0: Prep (immediate)
- Create branch refactor/v2110-runtime-curriculum
- Backup state
- Create docs structure

### Phase 1: Architecture Audit
- Document all state paths
- Map all answer flows
- Find all full_solve entry points
- Output: docs/V2110_ARCHITECTURE_AUDIT.md

### Phase 2: Runtime Rebuild
- New LessonRuntimeState type
- New unified answer action
- Fix one-click behavior
- Fix last-answer gate
- Remove full_solve from child steps
- Output: Working play page with new runtime

### Phase 3: Curriculum Planner Rebuild
- New 6-slot planner
- Review semantics
- Grade 1 late-stage curriculum
- Output: Correct curriculum generation

### Phase 4: Question Pool Expansion
- 100以内 numbers & place value: 12 Qs
- 100以内 variants: 15 Qs
- 人民币: 10 Qs
- 图形 & 分类: 10 Qs
- 两步应用题: 15 Qs
- 信息筛选/不足: 10 Qs
- 重复加法/几个几: 12 Qs
- 厘米与米: 8 Qs
- 复杂规律: 8 Qs
- Total: ~100 new questions

### Phase 5: Statistics Fix
- Split totalCompleted into separate fields
- Fix usageStage
- Fix learnerProfile

### Phase 6: Data Migration
- v2.11 migration
- Rebuild todayLesson safely
- Map old phase to new runtime

### Phase 7: Version Unification
- Single version source
- Commit hash injection
- All subsystems report same version

### Phase 8: Testing & Release Gates
- Playwright E2E tests
- Curriculum validation
- Migration tests
- Full run tests

## 14. Per-Phase Acceptance Gates

### Phase 2 Gate:
- [ ] All buttons respond on first click
- [ ] Answer submission is atomic (1 transaction)
- [ ] Last question requires answer before completion
- [ ] No full_solve child steps
- [ ] No duplicate advancement

### Phase 3 Gate:
- [ ] 10 courses generated, all validate
- [ ] 0 single-digit arithmetic questions
- [ ] ≥2 100以内 questions per course
- [ ] ≥1 non-computation per course
- [ ] ≥1 G2 preview per course
- [ ] 0 fallbackUsed
- [ ] 0 safe_fallback steps

### Phase 8 Gate:
- [ ] 18 questions, one click each
- [ ] Last answer gate passes
- [ ] 10 courses curriculum pass
- [ ] Migration preserves data
- [ ] Full run completes
- [ ] npm run build passes
- [ ] All Playwright tests green

## 15. Final E2E Test Matrix

| Test                          | Desktop | Mobile | Status |
|-------------------------------|---------|--------|--------|
| One-click (18 questions)      | ⬜       | ⬜       |        |
| Last answer gate              | ⬜       | ⬜       |        |
| Curriculum (10 courses)       | ⬜       | ⬜       |        |
| Migration (5 states)          | ⬜       | ⬜       |        |
| Full run (1 complete lesson)   | ⬜       | ⬜       |        |
