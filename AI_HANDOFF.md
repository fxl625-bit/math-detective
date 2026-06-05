# 文字侦探 v2.8.0 — AI 接手须知

## 接手前必须阅读（按优先级）

1. **本文档** — 最重要的坑和规则
2. `docs/HINT_SYSTEM_RULES.md` — 提示系统不可绕过契约
3. `README.md` — 项目总览、本地运行
4. `VERSION.md` — 版本信息
5. `lib/types.ts` — 所有类型定义
6. `lib/lessonPlanner.ts` — 核心选题和课程编排逻辑
7. `lib/storySystem.ts` — 主题系统 + 主题兼容性检查
8. `lib/lessonTransaction.ts` — 统一状态机事务
9. `app/play/page.tsx` — 主游戏引擎（~2100行）

---

## 🔴 必须知道的坑

### 1. normalizeLesson 是危险函数

`normalizeLesson()` 创建返回对象时**只保留它认识的字段**。任何新增到 TodayLesson 的字段都必须在这里显式保留，否则页面加载时会丢失。

**已修复的坑**: rewardClaimed/rewardShown 曾被丢弃导致奖励弹窗重复。

**检查清单**: 新增 TodayLesson 字段 → 检查 normalizeLesson。

### 2. /play 不能跳首页

遇到非法 step 时，必须就地重建 safe fallback lesson，**不能** `router.push("/")` 或 `window.location.href = '/'`。

原因: 首页加载的是同一个坏 lesson，再次进入 /play 形成死循环。

### 3. 强主题必须靠 requiredTags

不能靠给每个主题加越来越多的 forbiddenTags。`isQuestionCompatibleWithTheme` 的核心逻辑是 requiredTags 命中。

### 4. 提示系统不能绕过 HintSystem

只有 `components/lesson/HintSystem.tsx` 能显示"小提示"。其他组件禁止硬编码"💡 小提示"。

验证: `npm run validate:hints`

### 5. 孩子端不能出现工程异常文案

禁止: 关卡数据异常、正在自动修复、系统已自动处理、该题目缺少多余信息、今天的任务已整理好

验证: `npm run validate:child-ui`

### 6. 等量代换题不能进 find_action_words

"1个苹果换2个橘子"这类题没有加减动作词。stepCompatibility 只能包含 `['simulation', 'full_solve']`。

### 7. build 必须用 --webpack

`package.json` 的 build 脚本必须保持 `next build --webpack`。Turbopack 生产构建会产生空 chunk。

### 8. PolyfillScript 不能删除

它是 `<body>` 的第一个子元素。删除后 Android 8.0 设备崩溃。

---

## 验证命令

```bash
npm run validate:release    # 发布闸门（必须全部通过）
npm run test:e2e            # Playwright E2E 测试
npm run build               # 构建验证
```

---

## 禁止事项

1. 不要让孩子端自由选择题型
2. 不要让完整题找到线索后直接完成
3. 不要让 remove_noise 使用无 noisePhrases 的题
4. 不要写死图标（用 visualKey）
5. 不要让所有关卡共用同一道题
6. 不要把虚拟奖励混进 parentRewards
7. 不要让家长设置出现在孩子端
8. 不要在条件 return 后写 hooks
9. 不要直接破坏 localStorage 旧数据
10. 不要把奥数题默认推给低年级孩子
11. 不要部署前跳过 npm run build
12. 不要绕过 HintSystem
13. 不要在孩子端显示工程异常页
14. 不要用 router.push("/") 作为修复策略
