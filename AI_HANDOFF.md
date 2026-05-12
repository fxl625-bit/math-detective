# 文字侦探 v2.2 — AI 接手须知

## 接手前必须阅读（按优先级）

1. README.md — 项目总览、本地运行
2. VERSION.md — 版本信息、检查命令结果
3. ARCHIVE.md — 项目归档（架构、页面、组件、修复历史）
4. TODO_NEXT.md — 后续升级方向
5. Obsidian 归档中的所有相关文档（如果有归档）
6. lib/types.ts — 所有类型定义
7. lib/lessonPlanner.ts — 核心选题和课程编排逻辑
8. hooks/useGameState.ts — 全局状态管理
9. AGENTS.md — Next.js 16 特殊规则

## v2.1 新增文件

| 文件 | 用途 |
|------|------|
| `components/PolyfillScript.tsx` | **关键**：body-first polyfill 脚本（Object.hasOwn + globalThis），在 async bundle 前执行 |
| `scripts/postbuild-css.js` | **关键**：构建后剥离 @layer 包裹 |
| `.browserslistrc` | 编译目标 Chrome 49+ / Android 7+ |
| `middleware.ts` | 备用 HTML 注入方案 |
| `lib/storySystem.ts` | 案件故事系统 |
| `data/stories.ts` | 12 个侦探破案故事 |
| `lib/mistakeReinforce.ts` | 错题同知识点再练 |
| `data/questions/g3-multiplication.ts` | 乘除法题库 |
| `data/questions/extra-info.ts` | 多余信息题型 |
| `data/questions/missing-info.ts` | 信息缺失题型 |

## v2.1 新增禁止事项

### 不要把脚本放在 `<head>` 里做 polyfill
Next.js App Router 把自己的 `<script async>` 插在 `<head>` 最前面，自定义脚本被挤到后面。localhost 上 async 脚本近乎即时下载，polyfill 还没执行 React 就崩了。**唯一可靠方案**：polyfill 放在 `<body>` 第一个子元素，作为同步 `<script>` 阻塞执行。

### 不要用 `next dev` 测低版本兼容性
Turbopack dev server **不遵循** `.browserslistrc`，生成的 JS 含 `globalThis`、`??` 等现代语法。必须用 `npm run build && npx next start`。

### 不要在生产 CSS 中保留 @layer
Tailwind v4 把工具类包在 `@layer utilities { ... }` 中。低版本 Android WebView（Chrome < 99）不认此 at-rule，整个块被跳过导致全部样式丢失。`npm run build` 会自动运行 `postbuild-css.js` 剥离 @layer。不要删除这个后处理步骤。

### 不要删除 PolyfillScript 组件
它是 `app/layout.tsx` 中 `<body>` 的第一个子元素。如果删除，Android 8.0 设备上 React 19 的 `Object.hasOwn` 调用会崩溃。Polyfill 本身始终运行（不受 debug 开关影响）。

### 如何开启 Debug Overlay
生产环境中红色错误条和绿色状态指示器默认隐藏。开发和排障时：
- URL 加 `?debug=1` 参数
- 或在 Console 执行 `localStorage.setItem('mathDetectiveDebug', '1')` 然后刷新

### 不要改回 Turbopack 生产构建
`package.json` 的 build 脚本必须保持 `next build --webpack`。Turbopack 生产构建会产生空 chunk 和 `empty-resource` 误报。Webpack 虽然慢（~15s vs ~8s），但输出稳定可预测。

### 不要删除 --webpack 标志
即使未来 Turbopack 稳定版发布，也应在充分验证后再考虑切回。当前 v2.2 验证通过的是 Webpack 构建管线。

---

## v1.0 原有禁止事项（仍然有效）

### 不要让孩子端自由选择题型
每日任务固定顺序执行。自由选择会导致跳关和技能训练不完整。

### 不要让完整题找到线索后直接完成
每个 step 有 phases 数组，必须走完所有 phase 才能标记完成。

### 不要让 remove_noise 使用无 noisePhrases 的题
`selectQuestionForStep()` 中 remove_noise 类型找不到合适题时返回 null，由 `buildDailyLesson()` 替换关卡类型。

### 不要写死图标
题目通过 `visualKey` 关联 `data/visualItems.ts` 中的物品。

### 不要让所有关卡共用同一道题
`buildDailyLesson()` 为每个 step 独立调用 `selectQuestionForStep()`，通过 `usedQuestionIds` 去重。

### 不要把虚拟奖励混进 parentRewards
`getVirtualRewards()` 从 GameState 派生虚拟奖励。`parentRewards` 只放家长自定义的现实奖励。

### 不要让家长设置出现在孩子端
rewards 页面的家长 tab 必须通过数学题验证。

### 不要在条件 return 后写 hooks
React hooks 必须在组件函数体最顶部无条件调用。

### 不要直接破坏 localStorage 旧数据
`lib/migrations.ts` 的 `migrateGameState()` 负责将旧版本数据升级（当前 v4）。

### 不要把奥数题默认推给低年级孩子
奥数题（isExtendedThinking: true）在 easyMode 开启时屏蔽，正常情况下按隐式 skillLevel 少量穿插。

### 不要部署前跳过 npm run build
每次修改后必须先 `npm run build` 确认零错误。
