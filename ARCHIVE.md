# 文字侦探 v2.1 — 项目归档

## 项目定位

文字侦探（Math Detective）是一款面向小学低年级（G1-G6）的数学应用题阅读理解训练小游戏。核心目标不是刷题，而是训练孩子「读懂数学应用题」的能力。

## 核心用户

- **主要用户**：小学 1-6 年级学生
- **管理用户**：家长（设置年级、管理奖励、查看报告）

## 解决的问题

很多孩子数学应用题做错，不是因为不会算，而是因为读不懂题。本产品把「阅读理解」拆解为 5 个分步技能：找数字 → 找关键词判断运算 → 擦掉废话 → 理解题意 → 列式答题。

## 产品原则（不可违背）

1. 孩子只负责玩，系统负责教学路径
2. 找线索不是终点，完整应用题必须列式和答题
3. 奖励是持续使用的辅助，不是沉迷机制
4. 家长设置必须隐藏在验证之后
5. 题目、单位、图标、动画必须一致
6. remove_noise 题必须有 noisePhrases
7. 每个关卡独立选题，不能共用同一道题

## 关键页面

| 路径 | 页面 | 功能 |
|------|------|------|
| `/` | 首页 Dashboard | 今日任务入口、进度、连续打卡、明日预告 |
| `/play` | 挑战模式 | 今日任务关卡列表 |
| `/play/clues` | 找数字 | 从题目中找到所有数字 |
| `/play/actions` | 找动作词 | 判断关键词是加还是减 |
| `/play/noise` | 擦掉废话 | 删除无关信息后列式答题 |
| `/play/solve` | 完整破案 | 找数字→关键词→题意→列式→答题 |
| `/rewards` | 奖励中心 | 虚拟奖励 + 家长奖励兑换 + 家长管理 |
| `/mistakes` | 错题本 | 回顾错题并重试 |
| `/parent-report` | 家长报告 | 学习数据、年级设置、奥数开关 |

## 数据结构

### localStorage key: `math-detective-state`

核心字段见 `lib/types.ts` 中的 `GameState` 接口。关键在于：
- `version: 3` — 数据版本号
- `parentSettings` — 家长设置（年级、每日目标、奥数开关）
- `parentRewards` — 家长自定义现实奖励
- `rewardRedemptions` — 兑换记录
- `parentGateAttempts` — 家长验证尝试记录
- `skillMistakes` — 按技能分类的错误计数

### TodayLesson (localStorage key: `math-detective-today-lesson`)

每日课程，包含 5 个 LessonStep，每个 step 有独立的 questionId。

## 主要组件

| 组件 | 文件 | 用途 |
|------|------|------|
| BottomNav | components/BottomNav.tsx | 底部导航 |
| DetectiveMascot | components/DetectiveMascot.tsx | 侦探助手角色 |
| AnimatedItems | components/AnimatedItems.tsx | 题目物品动画 |
| Confetti | components/Confetti.tsx | 撒花效果 |
| FeedbackOverlay | components/FeedbackOverlay.tsx | 答题反馈弹窗 |
| TomorrowPreviewCard | components/TomorrowPreviewCard.tsx | 明日预告卡片 |
| ParentRewardForm | components/ParentRewardForm.tsx | 家长奖励表单 |
| RedeemConfirmModal | components/RedeemConfirmModal.tsx | 兑换确认弹窗 |

## 主要工具函数

| 文件 | 核心函数 |
|------|----------|
| `lib/types.ts` | 所有类型定义、DEFAULT_GAME_STATE |
| `lib/storage.ts` | loadState, saveState, completeQuestion, addMistake, checkDailyReset, updateStreak, calculateLevel, checkBadges |
| `lib/lessonPlanner.ts` | getTodayLesson, buildDailyLesson, selectQuestionForStep, advancePhase, getTomorrowLessonPreview, getVirtualRewards |
| `lib/migrations.ts` | migrateGameState (version 3), migrateTodayLesson |
| `lib/validateQuestions.ts` | 题库自检（stepCompatibility, noisePhrases, visual 一致性） |
| `hooks/useGameState.ts` | 全局状态管理（singleton + listener 模式） |

## 重要修复历史

1. **按钮重叠** — 布局调整
2. **孩子端自由选择挑战导致跳关** — 改为每日任务强制顺序
3. **题目物品和图标不一致** — 引入 visualKey/visualItems 绑定
4. **找到线索后直接完成，没有列式答题** — 增加 answer phase
5. **今日任务 5 关共用同一道题** — 引入 selectQuestionForStep + usedQuestionIds
6. **remove_noise 关抽到无 noisePhrases 的题** — 选题逻辑中 remove_noise 绝不回退
7. **hydration warning** — 使用 mounted 模式
8. **step.phases undefined 崩溃** — normalizeStep 总是补全 phases
9. **rewards page hooks 顺序错误** — 所有 hooks 移到条件 return 之前
10. **家长奖励表单残留上一次编辑内容** — 使用 key prop 强制 remount
11. **家长验证码太简单** — 升级为随机乘法/除法题
12. **家长验证失败没记录** — 引入 parentGateAttempts
13. **缺少重置工具** — 家长模式增加 4 种重置
14. **自定义奖励替代虚拟奖励** — 两者分开显示、互不覆盖
15. **localStorage 旧数据崩溃** — version 3 migration 补全所有字段

## 后续升级方向

见 `TODO_NEXT.md`。

## GitHub 仓库

https://github.com/fxl625-bit/math-detective

## Vercel 部署地址

https://math-detective.vercel.app

## v2.0 升级 (2026-04-30)

### 新增文件
| 文件 | 用途 |
|------|------|
| lib/storySystem.ts | 案件故事系统 |
| data/stories.ts | 12个侦探破案故事 |
| data/questions/g3-multiplication.ts | 乘除法题库 |
| data/questions/extra-info.ts | 条件多余信息题型 |
| data/questions/missing-info.ts | 信息缺失题型 |
| lib/mistakeReinforce.ts | 错题同知识点再练 |

### 类型变更 (v4 migration)
- `operation` 增加 `'ratio'`
- `cognitiveSkills` 增加 `find_compare_numbers`, `spot_extra_info`, `spot_missing_info`
- `lessonStepType` 增加 `find_compare_numbers`, `spot_extra_info`, `spot_missing_info`
- `stepPhase` 增加对应三种新 phase
- `Question` 增加 `isExtendedThinking`, `extraNumbers`, `isInsufficient`
- `TodayLesson` 增加 `caseStoryId`
- `ParentSettings` 替换 `olympiadEnabled` → `easyMode`
- `GameState` 增加 `weeklySnapshots`, `skillLevel`, `decorations`
- 数据版本升至 4

### 产品原则调整
- 奥数题不再作为独立开关控制，按难度融入各年级题库
- 家长设置改为"降低难度"模式（easyMode）
- 中国大陆网络访问：Vercel + Supabase 海外架构，建议 VPN；暂不迁移国内

## v2.1 Android 兼容性修复 (2026-05-08)

### 新增文件
| 文件 | 用途 |
|------|------|
| components/PolyfillScript.tsx | body-first polyfill（Object.hasOwn + globalThis + 错误捕获 + 状态指示） |
| scripts/postbuild-css.js | 构建后剥离 @layer 包裹 |
| .browserslistrc | Chrome 49+ / Android 7+ 编译目标 |
| middleware.ts | 备用 HTML polyfill 注入方案 |

### 修复的 5 个问题
1. **CSS @layer 不兼容低版 WebView** → postbuild 剥离
2. **Object.hasOwn (ES2022) 不支持** → body-first polyfill
3. **globalThis (ES2020) 不支持** → body-first polyfill
4. **async 脚本先于 polyfill 执行** → body 内联同步 `<script>` 
5. **maximumScale=1 触发渲染异常** → 删除

### 核心踩坑
- `next dev` 不遵循 `.browserslistrc`，测试兼容性必须 `next build && next start`
- Next.js `<head>` 中的脚本无法排在 async bundle 之前
- `Script strategy="beforeInteractive"` 仍然依赖 Next.js Runtime 解析，形成循环依赖

## v2.2 Webpack 构建切换 (2026-05-08)

### 问题
Turbopack 生产构建在 Vercel 上生成含 `turbopack` 命名的空 JS chunk，`performance.getEntriesByType('resource')` 检测到 transferSize=0 的资源，触发红色错误条误报。

### 修复（2 文件）
| 文件 | 变更 |
|------|------|
| `package.json` build | `next build` → `next build --webpack` |
| `components/PolyfillScript.tsx` | 资源检测过滤：排除非 script initiator、source map、turbopack 条目 |

### 关键教训
- Turbopack 在生产模式下仍会生成 preload hint 和空引用 chunk
- `performance.getEntriesByType('resource')` 包含所有资源类型，不筛选类型会导致大量误报
- Webpack 构建比 Turbopack 慢约 2 倍（15s vs 8s），但 chunk 命名和行为更可预测

## AI 开发注意事项

见 `AI_HANDOFF.md`。
