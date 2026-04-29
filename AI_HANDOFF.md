# 文字侦探 v1.0 — AI 接手须知

## 接手前必须阅读（按优先级）

1. README.md — 项目总览、本地运行
2. VERSION.md — 版本信息、检查命令结果
3. ARCHIVE.md — 项目归档（架构、页面、组件、修复历史）
4. CHANGELOG.md — v1.0 已完成功能清单
5. TODO_NEXT.md — 后续升级方向
6. Obsidian 中 `项目归档/文字侦探/v1.0/` 所有文件
7. lib/types.ts — 所有类型定义
8. lib/lessonPlanner.ts — 核心选题和课程编排逻辑
9. hooks/useGameState.ts — 全局状态管理
10. AGENTS.md — Next.js 16 特殊规则

## 禁止事项

### 不要让孩子端自由选择题型
当前设计是每日任务固定 5 关顺序执行。自由选择会导致跳关和技能训练不完整。

### 不要让完整题找到线索后直接完成
每个 step 有 phases 数组，必须走完所有 phase（包括 answer/build_equation）才能标记完成。`completeCurrentStep()` 不会跳过 phases。

### 不要让 remove_noise 使用无 noisePhrases 的题
`selectQuestionForStep()` 中 remove_noise 类型找不到合适题时返回 null，由 `buildDailyLesson()` 替换关卡类型为 `find_action_words`。绝不能回退到没有 noisePhrases 的题。

### 不要写死图标
题目通过 `visualKey` 关联 `data/visualItems.ts` 中的物品。新增题目必须确保 visualKey 与题文中物品一致。

### 不要让所有关卡共用同一道题
`buildDailyLesson()` 为每个 step 独立调用 `selectQuestionForStep()`，通过 `usedQuestionIds` 去重。每个关卡必须有独立的 questionId。

### 不要把虚拟奖励混进 parentRewards
`getVirtualRewards()` 从 GameState 派生虚拟奖励（徽章、宝箱、streak）。`parentRewards` 只放家长自定义的现实奖励。两者在 rewards 页面分 tab 显示。

### 不要让家长设置出现在孩子端
rewards 页面的家长 tab 必须通过数学题验证后才能进入。`ParentGateModal` 随机生成乘法/除法题，连续 3 次失败锁定。

### 不要用固定验证码
`generateParentGateQuestion()` 每次随机生成不同的数学题，防止孩子记住答案。

### 不要在条件 return 后写 hooks
React hooks 必须在组件函数体最顶部无条件调用。特别是 `app/rewards/page.tsx` 中 hooks 数量多（useGameState + 11 useState + 1 useEffect + 12 useCallback），必须全部在 `if (!mounted) return` 之前。

### 不要直接破坏 localStorage 旧数据
`lib/migrations.ts` 的 `migrateGameState()` 负责将旧版本数据升级到 v3。所有字段缺失时用 DEFAULT_GAME_STATE 值补全。

### 不要让重置工具出现在孩子模式
重置今日任务、清空进度、完全重置、恢复默认奖励 — 这 4 个操作都在 rewards 页面的家长 tab 中，需先通过验证。

### 不要把奥数题默认推给低年级孩子
奥数题（OlympiadIntro）在 `parentSettings.olympiadEnabled` 为 false 时不进入每日课程。

### 不要部署前跳过 npm run build
每次修改后必须先 `npm run build` 确认零错误。

## 关键业务逻辑

### 每日任务编排 (`lib/lessonPlanner.ts`)
```
getTodayLesson()
  → 检查 localStorage 是否有今日课程
  → 有则 normalize 后返回
  → 无则 buildDailyLesson()
    → 5 个 stepType 依次 selectQuestionForStep()
    → remove_noise 无匹配则替换为 find_action_words
    → 其他类型无匹配则用 full_solve 兜底
    → 每个 step 独立 questionId，通过 usedQuestionIds 去重
  → saveTodayLesson() 存到 localStorage
```

### 题目筛选 (`selectQuestionForStep()`)
```
1. 按年级池筛选 (questionsByGrade[grade])
2. 优先 stepCompatibility 精确匹配
3. 再按字段规则补充匹配
4. 无结果 → 降低难度重试
5. 无结果 → 扩大年级范围重试
6. remove_noise 绝不回退到无 noisePhrases 的题
7. 最终兜底：任意题（remove_noise 除外）
```

### 题库 visual 绑定规则
- Question.visualKey → data/visualItems.ts 中查找对应物品
- 题目写「蜡笔」→ visualKey 必须是蜡笔 → 动画显示蜡笔
- 题目写「小鸟」→ visualKey 必须是小鸟 → 动画显示小鸟
- 验证脚本：`lib/validateQuestions.ts`

### remove_noise 题要求
- `noisePhrases` 长度 ≥ 1
- `usefulPhrases` 长度 ≥ 2
- `stepCompatibility` 包含 `'remove_noise'`
- 题目原文中必须能匹配到 noisePhrases 和 usefulPhrases 的内容

### simulation 题要求
- `operation` 必须是 `'addition'` 或 `'subtraction'`
- 必须有 `visualKey`
- 物品有增减变化，适合做动画

### 奖励中心三 tab
1. **虚拟奖励** — `getVirtualRewards(state)` 派生，9 种（徽章 + streak + 宝箱）
2. **兑换奖励** — `state.parentRewards` 中 enabled 的奖励，孩子用星星兑换
3. **家长模式** — 数学题验证 → CRUD 奖励 + 兑换管理 + 重置工具 + 验证日志

### localStorage 结构升级
- 当前版本: 3
- `migrateGameState()` 确保所有数组字段存在
- `migrateTodayLesson()` 确保所有 step 有 questionId 且 phases 有效

## Vercel 部署注意事项

- Next.js 16 项目，Vercel 会自动识别框架
- 无需额外配置 Build Command / Output Directory
- 无需环境变量（纯前端项目，数据在 localStorage）
