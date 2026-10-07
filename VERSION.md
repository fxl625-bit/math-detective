# 当前修复版本：2.13.3

- 日期：2026-10-07
- 修复 v2.13.2 的完整 CI 发布门：类型错误、测试来源端口、生产服务器、家长密码测试适配、旧课程测试与报告留存。
- 修复进阶题题意选项提前显示答案、G1 越级运算及不可见数字线索；保留学习历史和原积分规则。
- 验证口径与复现命令：[CI 修复说明](docs/CI_REPAIR_2.13.3.md)。只有同一提交的两条 GitHub Actions 全部成功才视为完整发布验证通过。

## 历史修复版本：2.13.2

- 日期：2026-10-07
- 家长模式已改为自设固定密码；规则与数据边界见 [家长密码说明](docs/PARENT_PASSWORD_2.13.2.md)。
- v2.13.1 封板记录保留为历史基线，见下文。

---
# 数学侦探当前发布基线

- 当前版本：**2.13.1**
- 封板与上线日期：2026-09-29
- 正式站点：https://math-detective.vercel.app
- 部署 ID：dpl_BKPL9D4Nyhrbo198v1pzVgoMPz8N
- 当前发布记录：[封板与上线验收](reports/2026-09-29-release/RELEASE_2.13.1.md)
- 代码、测试、归档及回退记录以该发布记录为准；下面保留历史版本说明。

---
# Math Detective

## Historical Version: 2.11.0
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
