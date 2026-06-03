# Math Detective Changelog

## v2.6.7 — P0 修复：提示提前泄露答案

- **修复"📝 一步一步想"默认展示完整推导和答案的严重BUG**
- 新增 `components/lesson/HintSystem.tsx`：统一分层提示组件（light / medium / fullSteps）
- 新增 `lib/hintSafety.ts`：泄题检测工具（`textRevealsAnswer` / `stepsRevealAnswer` / `hintRevealsAnswer` / `renderSafePreAnswerText`）
- `EquationAnswerPhase` 默认不再渲染完整 `solutionSteps`，改用 HintSystem
  - 答题前只展示 light hint
  - medium hint 点击"再给一点提示"后显示
  - fullSteps 点击"看完整推理"（需二次确认）后显示
  - explain 阶段（答对后）正常展示完整推导
- `ClueSummary` hints[0] 增加泄题检测，若泄露答案则不渲染
- `LogicRankingGuide` HintPanel 增加"看完整推理"二次确认
- `FullReasoningPanel` 支持 `revealsAnswer` 标记，显示"（答案）"标签
- `SolutionStepDetailed` 新增 `revealsAnswer?: boolean` 字段
- `ProblemType` 新增 `'pattern'`（规律题）
- **答错后提示分层**：第1次轻提示 → 第2次中等提示 → 第3次建议看完整推理
- `validateQuestionIntegrity` 新增 10 项 pre-answer 泄题检测（#28-#37）
  - light hint / medium hint / hints[0] 不能泄露答案
  - solutionSteps / solutionStepsDetailed 不能默认渲染含答案步骤
  - pattern / ranking / age / planting / ratio 题型专项检查
- 运行时防御：`renderSafePreAnswerText` 在组件渲染前拦截泄题文本
- 更新版本 v2.6.6 → v2.6.7

## v2.6.6 — 逻辑排序题校验增强

- questionValidation 逻辑题校验 6 项升级为 errors + 4 项新增检测
- forbiddenTexts 扩展 + storyTitle 覆盖检测
- structuredHints.fullSteps 安全告警 / full_solve 一致性 / answer 格式告警
- 隐含关键词漏检检测（题目含 ≥2 个排序关键词但 problemType 不对）

## v2.6.5 — P0 修复：逻辑排序题与列式流程错配

- 新增 `ProblemType` 问题类型系统：`logic_ranking`、`logic_truth`、`logic_ordering` 等 10 种
- 新增 `RankingAnswer`、`Statement`、`SolutionStepDetailed` 接口
- 新增 `AnswerType` 类型：`number` | `text` | `ranking` | `equation` | `choice`
- 新增 `StepPhase`：`understand_clues`、`logic_elimination`、`ranking_answer`
- 新增 `components/LogicRankingGuide.tsx`：排除法步骤展示 + 完整排序选择
- 逻辑排序题使用专用阶段流程：read → understand_clues → logic_elimination → ranking_answer → explain
- `getDefaultPhasesForStepType` 支持根据 `question.problemType` 动态返回阶段
- `PhaseAwareStep` 路由逻辑题到 LogicRankingGuide，不再进入方程构建器
- 修复 FullSolve 主题文案错配：`完整破案/算出库存` → `逻辑破案/排出名次`
- `getDynamicStepTitle` / `getDynamicStepDescription`：根据题型动态生成关卡标题和描述
- ranking 答案支持完整排序校验：只输入第一名不视为完整正确
- `ClueSummary` 增强：逻辑排序题显示人物线索和话语线索
- `validateQuestionIntegrity` 新增逻辑排序题元数据检查（18-23项）
- 修复 oi_13 元数据：补全 `problemType`、`people`、`statements`、`correctRanking`、`solutionStepsDetailed`
- 运行时防御：逻辑题误入方程构建器时 `console.error('[P0]')`
- `requiresEquation=false` 的题运行时防御

## v2.6.4 — P0 修复：统一状态机事务与二次点击问题

- 新增 `lib/lessonTransaction.ts`：`commitLessonTransaction` 统一 lesson 状态转换
- 新增 `runLessonAction`：所有用户动作统一提交，单次原子事务
- 修复 **正确答案需要提交两次** 的问题：一次点击 answer → explain
- 修复 **"清除线索后才能进入下一页"** 的问题
- 修复 **"已修复，点击继续"需要点击两次** 的问题：repair flow 接入 `continue_after_repair` action
- answer phase 正确答案一次事务直接进入 explain，不再依赖 `canAdvance`
- 组件不再直接修改 `currentPhaseIndex`，所有推进统一走事务系统
- `transitioningRef` 事务锁防止并发状态修改
- `lessonRef` 解决闭包陈旧问题，永远读取最新 lesson
- 增加 P0 断言：`assertCorrectAnswerAdvanced`、`assertRepairContinued`、`assertNotDuplicateSubmit`
- 增加调试状态 `LessonDebugState` 供家长面板追踪
- 修复 stats 双重记录：移除 transaction 内多余的 `completeQuestion` 调用
- 继续验证每日奖励幂等（`grantDailyRewardOnce` / `markDailyRewardShown`）
- 新增 `information_check` 和 `identify_extra_info` action handler（之前只有类型定义，fallback 到 noChange）
- 新增 `go_back` 和 `go_prev_level` action：hanlePhaseBack / handleBackToPrevLevel 统一走事务
- 调试面板集成 `getDebugState()`：平板可查看 lastAction / phase 变化 / stateVersion
- `runLessonAction` 扩展 stats 记录覆盖 `information_check` / `identify_extra_info`

## v2.6.2

- 基础答题流程、关卡系统、每日奖励、错题本
