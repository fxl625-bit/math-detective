# Math Detective Changelog

## v2.6.11 — P0 修复：主题与题目错配

### 根本原因
1. **主题随机选，题目随机选**：lessonPlanner 选 story 和选 question 完全独立，无交叉校验
2. **Questions 缺少 sceneType/themeTags**：266 道题中仅 1 道设置了这两个字段
3. **Step 文案来自 story 模板**：play/page 用 `getStepNarrative(story, stepType)` 显示文案，与实际题目无关
4. **替换题不重建 metadata**：repair 时只换 questionId，step title/description 残留旧文案

### 核心修复

**主题-题目硬匹配** (`lib/storySystem.ts`)
- CaseStory 新增 `allowedSceneTypes` / `themeTags` / `forbiddenTags`
- 新增 `isQuestionCompatibleWithTheme()` 兼容性检查
- 新增 `inferSceneType()` / `inferThemeTags()` 从题目内容推断标签

**20 个 Story 全部标注主题标签** (`data/stories.ts`)
- 超市购物主题：allowedSceneTypes=[shopping, snack, food, stationery]，forbiddenTags=[rabbit, animal, playground, flag, interval, age, geometry, competition, ocean, planting]
- 森林/海洋/校园/零食/玩具/派对/宠物 主题各有独立标签

**lessonPlanner 按主题筛题** (`lib/lessonPlanner.ts`)
- `selectQuestionForStep` 新增 `story` 参数
- 选题时先按 `isQuestionCompatibleWithTheme` 过滤题库
- 降级时仍保留主题过滤，不跨主题凑题
- `safeNormalizeLesson` 修复时也传入 story

**play/page 文案从 question 生成** (`app/play/page.tsx`)
- 不再使用 `getStepNarrative(story, stepType)` 显示 step 描述
- `displayStepDescription` 从 `currentStep.description` 获取（由 `buildStepFromQuestion` 生成）
- 新增 `generateStepInstruction()` 从 question 内容推断 instruction

### 版本
- v2.6.10 → v2.6.11

---

## v2.6.10 — P0 修复：多答案题校验 + 统一答案检查器 + 等差数列引导

### 根本原因
1. **answerType 体系缺失**：266 道题中仅 1 道设置了 answerType，多答案题无法正确校验
2. **答案检查器分散**：各组件自己写答案判断逻辑，不统一
3. **多答案题用单输入框**：oi_10（等差数列）有两个问题但只有一个输入框
4. **等差数列题直接甩公式**：对低年级不友好，缺乏分步引导

### 核心修复

**新增 `lib/answerChecker.ts` — 统一答案检查器**
- `checkAnswer(input, question)`: 统一入口，根据 answerType 路由到对应 checker
- 支持 7 种 answerType: number, text, ranking, multi_answer, choice, expression, not_enough_information
- `checkMultiAnswer()`: 支持多答案逐个校验，返回 partialCorrect 和 fieldResults
- `resolveAnswerType()`: 兼容未标注旧题，自动推断 answerType
- 全角数字转半角、中文标点规范化、表达式安全计算

**新增 `components/lesson/MultiAnswerInput.tsx` — 多答案输入组件**
- 根据 question.subAnswers 动态生成多个输入框
- 部分正确时给出差异化反馈（"第20个数找对了，再想想前20个数的和"）
- 提交前检查是否所有字段都填了

**新增 `components/lesson/SequencePatternGuide.tsx` — 等差数列引导组件**
- 用于 problemType === 'pattern' 或 'sequence_arithmetic'
- G1/G2 版本：不讲公式，用逐步数和配对法
- G3+ 版本：展示公式但先解释来源
- 集成 HintSystem 分层提示

**扩展 `lib/types.ts`**
- AnswerType 新增: 'multi_answer', 'expression', 'not_enough_information'
- ProblemType 新增: 'sequence_arithmetic'
- 新增 SubAnswer 接口（id, label, answer, unit）
- Question 接口新增 subAnswers 字段

**修改 `app/play/page.tsx`**
- PhaseAwareStep 新增 SequencePatternGuide 路由
- EquationAnswerPhase 使用统一 checkAnswer
- runLessonAction 使用统一 checkAnswer

**修改 `lib/lessonTransaction.ts`**
- handleSubmitAnswer 使用统一 checkAnswer 替代手动比较

**修复题目数据**
- oi_10（等差数列）：answerType='multi_answer', subAnswers=[{term20,79},{sum20,820}]
- oi_12（方阵）：answerType='multi_answer', subAnswers=[{outer,44},{total,144}]

### 版本
- v2.6.9 → v2.6.10

---

## v2.6.9 — P0 修复：渲染前修复 + 安全降级课程 + 禁止孩子端卡死

### 根本原因
1. **修复发生在渲染后，不是渲染前**：Phase 组件通过 `useEffect` 触发 repair，此时 UI 已显示"正在自动修复"
2. **修复失败无退路**：当找不到合法替换题时，`repair_step_question` 只跳过 step，不重建课程，导致无限卡死
3. **旧 localStorage 卡死状态未迁移**：已损坏的 todayLesson 每次加载都触发同样的 repair 流程
4. **孩子端看到永久 repair 页面**：`FindActionWordsPhased` / `FindNumbersPhased` 在 `choose_operation` / `find_numbers` phase 渲染完整 repair UI

### 核心修复：渲染前修复管道

**`safeNormalizeLesson` (lessonPlanner.ts) — 加载时自动修复**
- 新增步骤 #12：加载课程后，验证当前 step 的 questionId 与 stepType 兼容性
- 不兼容 → 选合法替换题 → 重建 step metadata → 保存 → 返回
- 找不到替换题 → 生成 `generateSafeFallbackLesson()` → 保存 → 返回
- **关键：修复发生在 React 渲染前，孩子看不到任何 repair 页面**

**`generateSafeFallbackLesson()` (lessonPlanner.ts) — 新增**
- 当 repair 找不到合法题时，生成保证可玩的安全课程
- 安全规则：
  - 仅使用 `basic_arithmetic` 题型
  - `find_action_words` 仅用明确加减动作词（addition_change / subtraction_change）
  - 禁止：倍 / 年龄 / 比例 / 逻辑 / 图形 / 植树 / 至少 / 保证
- 如果安全池不足 4 道题，降级到紧急池（所有有数字的非倍题）

### 孩子端 UI 清理

**移除所有永久 repair 页面：**
- `FindNumbersPhased`：移除 `repairState`、`repairTimerRef`、useEffect repair 触发、repair UI 三态（repairing / timed_out / idle）
- `FindActionWordsPhased`：同上，移除整个 "正在自动修复" 卡死页
- `SpotExtraInfoPhased`：移除 "系统正在自动替换" 页面，改为简单 fallback
- `PhaseAwareStep`：移除 `onContinueRepair` / `onRepairStepQuestion` props
- PlayPage：移除 `handleContinueRepair` / `handleRepairStepQuestion` callbacks

**Safety net：** 如果数据层修复失败（不应发生），Phase 组件显示简单"关卡数据异常，返回首页重新开始"，不卡死。

### 修复循环保护增强

**`handleRepairStepQuestion` (lessonTransaction.ts)**
- `MAX_REPAIR_ATTEMPTS` 从 2 → 1：一次失败直接重建安全课程
- 无替换题 → 生成 `generateSafeFallbackLesson()`（原来只跳过 step）
- 循环检测 → 生成 `generateSafeFallbackLesson()`（原来只跳过 step）

### 新增导出
- `generateSafeFallbackLesson(gradeBand)` 从 `lessonPlanner.ts` 导出
- `lessonTransaction.ts` 引入并使用

### 版本
- v2.6.9（保持不变，功能增强）

## v2.6.9 — P0 修复：validateQuestions 增强 + 家长调试页 step/question/theme 匹配信息 (已合并)

### 根因
1. 题目含"倍/几倍"关键词时 `keywordType` 未强制为 `times_intro`，可能被分配到错误关卡
2. `age_problem` 题型没有与 `find_action_words` / `candy_inventory` / `shop_stock` 场景的互斥检查
3. `find_action_words` 步骤缺少对 `addition_change`/`subtraction_change` 关键词分类的强制要求
4. 步标题含"卖出/进货/库存"时题目场景不匹配无法被检测

### 修复 (questionValidation.ts)
- 新增检查 #38：含"倍"关键字的题目 `keywordType` 强制为 `times_intro`
- 新增检查 #39：`age_problem` 题目不允许出现商店/库存关键词、不兼容 `candy_inventory`/`shop_stock` sceneType/themeTags
- 新增检查 #40：适合 `find_action_words` 的题目必须有 `addition_change`/`subtraction_change` 关键词分类
- 新增检查 #41：`storyTitle` 含"卖出/进货/库存"时题目场景必须匹配
- 新增 `validateStepQuestionMatch()` 函数：跨引用校验（stepType + stepTitle + themeId vs question 兼容性）
  - `age_problem` 不兼容 `find_action_words` stepType
  - `age_problem` 不兼容 `candy_inventory`/`shop_stock` theme
  - `find_action_words` 步必须有 `addition_change`/`subtraction_change` 关键词分类
  - 步标题含商店关键词时 question.sceneType 必须匹配

### 修复 (lessonTransaction.ts)
- 新增 `repairRecordsByStepId` 追踪每次修复的原因和替换题目 ID
- 导出 `getRepairAttemptsSnapshot()` 和 `getRepairRecordsSnapshot()` 供调试页使用
- 修复 `getDateStr` 未导出导致的 TypeScript 编译错误

### 新增 (parent-report page)
- 新增"调试面板"折叠区块，展开后显示完整 step/question/theme 匹配表格
- 每列显示：step.id, step.type, step.title, step.description, questionId, questionText, problemType, sceneType, keywordCategories, isValidForStep, matchErrors/Warnings, repairAttempts, lastRepairReason, replacementQuestionId
- 无效匹配行红色背景高亮，`age_problem` 红色加粗标注
- 版本 v2.6.8 → v2.6.9

## v2.6.8 — P0 修复：统计正确率 BUG（显示 17% 实际接近 100%）

### 根因
1. **`clearLearningProgress` 遗漏重置 `answerAttempts`**：清空进度时 `correctCount` 归零但 `answerAttempts` 保留旧值，导致分母膨胀（如 30次旧提交 + 6次新正确 → 6/36 ≈ 17%）
2. **7日正确率 = 总体正确率（完全相同公式）**：`recentAccuracyRate` 和 `correctRate` 都使用 `correctCount / attempts * 100`，7日正确率从未按时间过滤
3. **无按时间戳的答题记录**：`correctCount` 只是累加计数器，无法按日期/7天窗口统计

### 修复
- `hooks/useGameState.ts`: `clearLearningProgress` 增加 `answerAttempts: 0` + `attemptRecords: []` 重置
- `lib/types.ts`: 新增 `AttemptRecord` 接口和 `AccuracyStats` 接口，`GameState` 新增 `attemptRecords` 字段
- `lib/storage.ts`:
  - `completeQuestion()` 每次提交记录 `AttemptRecord`（按题目去重只保留最新，最多 200 条）
  - 新增 `getAccuracyStats()` 统一统计函数：
    - 总体正确率 = 每道题最新提交的正确数 / 总提交题数（未作答不计入分母）
    - 7日正确率 = 最近7天内提交的正确数 / 7天内提交题数
    - 今日完成 = 今日首次答对的题目数
- `app/parent-report/page.tsx`: 使用 `getAccuracyStats()` 替代手动计算
- `app/play/page.tsx`: 完成页面使用 `getAccuracyStats().overallAccuracy`
- `lib/lessonPlanner.ts`: `getLearningProfile()` 使用 `getAccuracyStats()`
- 更新版本 v2.6.7 → v2.6.8

### 测试验证
| 场景 | 预期结果 |
|------|---------|
| 总题库30题，今日完成5题全对 | 今日完成=5, 总体=100%, 7日=100% |
| 总题库30题，今日完成5题4对1错 | 正确率=80% |
| 30题只做5题，未做25题 | 不影响正确率分母 |
| 7日前错题 | 不影响7日正确率 |
| 总体 != 7日 | 两个指标独立计算 |

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
