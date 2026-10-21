# 当前版本：2.15.0

- 日期：2026-10-21
- 一至六年级逐题审查625道原题，同构变式覆盖由20道扩展至595道，其中578道数字与答案均不同、17道通过独立结构证明。
- 覆盖分布：一年级139、二年级88、三年级101、四年级100、五年级100、六年级67。剩余30道分别为23道固定答案、2道难度无法等价、5道原有隔离题；保留逐题说明。
- 精确有理数、完整枚举与实际判题器共同核验数量关系、难度、现实约束和输入数据；修复19道原题的条件、精度或输入合同问题。
- 变式与正常题池隔离；遵守二年级已学口诀范围；变式不能覆盖原题看过讲解、首次答错和待巩固记录，也不重复发放原题奖励。
- 修复比较符号选择旧值提交、排序输入和旧百分数字段兼容问题；新课首次保存即完成标准化，刷新不再额外改写存档。
- 完整验收包括全部33个单元测试、36单元1008节真实课程组合、全部桌面与手机E2E、同一Git提交两条CI、Vercel候选及正式站点复验。
- 实现及边界：[变式说明](docs/TRANSFER_VARIANTS_2.15.0.md)。本次证据目录：`reports/2026-10-21-transfer-expansion/`。

# 历史版本：2.14.0

- 日期：2026-10-21
- 默认直接作答；求助改为题型相关微任务，完成判断不等于答对原题。
- 完整讲解通过事务结束原题尝试，持久记录待巩固；迁移独立记录，不能洗回原题独立掌握或补满分积分。
- 新增独立掌握、辅助完成、帮助依赖、迁移表现和待复练报告，保留未知旧历史；自适应升级要求独立证据。
- 错题讲解同日不可照抄订正领奖，次日可以继续练习；兼容旧课程复盘与备份数据。
- 验收要求：生产构建、完整桌面/手机 E2E、同一提交两条 CI 通过，发布证据单独留存。

# 历史修复版本：2.13.3

- 日期：2026-10-07
- 修复 v2.13.2 的完整 CI 发布门：类型错误、测试来源端口、生产服务器、家长密码测试适配、旧课程测试与报告留存。
- 修复进阶题题意选项提前显示答案、G1 越级运算及不可见数字线索；保留学习历史和原积分规则。
- 验证口径与复现命令：[CI 修复说明](docs/CI_REPAIR_2.13.3.md)。只有同一提交的两条 GitHub Actions 全部成功才视为完整发布验证通过。

## 历史修复版本：2.13.2

- 日期：2026-10-07
- 家长模式已改为自设固定密码；规则与数据边界见 [家长密码说明](docs/PARENT_PASSWORD_2.13.2.md)。
- v2.13.1 封板记录保留为历史基线，见下文。

---
# 数学侦探历史发布基线（2.13.1）

- 历史版本：**2.13.1**
- 封板与上线日期：2026-09-29
- 正式站点：https://math-detective.vercel.app
- 部署 ID：dpl_BKPL9D4Nyhrbo198v1pzVgoMPz8N
- 历史发布记录：[封板与上线验收](reports/2026-09-29-release/RELEASE_2.13.1.md)
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
