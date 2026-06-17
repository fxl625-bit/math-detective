# Math Detective

## Current Version: 2.11.0
## Release Type: Stability & Curriculum Runtime Rebuild
## Release Date: 2026-06-17
## Branch: refactor/v2110-runtime-curriculum

### Key Changes
- **P0 Fix:** Single-click atomic answer submission (multi-click bug eliminated)
- **P0 Fix:** Last-answer gate (course cannot complete without submitting final answer)
- **P0 Fix:** Curriculum planner for G1 lower review (no more single-digit for experienced users)
- **P0 Fix:** Version unification (all subsystems report v2.11.0)
- **Refactor:** Removed full_solve as child-facing step type
- **Refactor:** New LessonRuntimeState for single-source-of-truth state management
- **Feat:** Expanded G1 question pool for review and G2 preview
- **Feat:** Split statistics (totalQuestionsCompleted, totalLessonsCompleted, activeDays)
- **Migration:** v2.11 data migration preserves all user data

### Previous Versions
- v2.10.3: Hotfix for submit contract + review semantics
- v2.10.2: P0 fixes for step mismatch + review slots
- v2.10.1: P0 residual 2-click submit fix
- v2.10.0: Major curriculum refactor + three-question flow

### Architecture
- Next.js 15 (App Router)
- TypeScript strict mode
- Playwright E2E testing
- localStorage-based state persistence
