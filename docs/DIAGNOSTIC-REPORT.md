# v2.10.1 诊断报告 — 真实调用链 & 提交事务追踪

> 生成时间: 2026-06-17 15:21  
> 运行方法: Node.js 直接调用生产函数 (不经过浏览器)  
> Git commit: `9a32e15` fix(v2.10.1)  
> Dev server: http://localhost:3000 (HTTP 200, 运行中)

---

## 任务二：真实6题生成报告

### 用户档案
| 字段 | 值 |
|------|-----|
| grade | G1 |
| semester | lower |
| semesterProgress | review (六月) |
| usageStage | 3 (experienced) |
| totalCompleted | 85 |
| difficulty | 3 |

### 生成的 6 题

| # | ID | 题目 | 难度 | Tier | 数字 |
|---|-----|------|------|------|------|
| 1 | g1ll_03 | 小红有15颗糖果，送给小明8颗，小红还剩几颗？ | 2 | practice | 15, 8 |
| 2 | g1ll_14 | 比59大1的数是几？比59小1的数是几？ | 2 | practice | 59 |
| 3 | g1ll_32 | 小明今年8岁，爷爷今年65岁。爷爷比小明大多少岁？ | 3 | test | 65, 8 |
| 4 | g1ll_07 | 公园里有17只鸽子，飞走了9只，还剩几只？(无关节景) | 3 | test | 17, 9 |
| 5 | g1ll_34 | 果园里有56棵桃树，梨树比桃树少20棵。梨树有多少棵？ | 3 | test | 56, 20 |
| 6 | g1t_19 | 一条小路长10米，每隔2米种一朵花（起点也种）。共几朵？ | 4 | challenge | 10, 2 |

### 答案

| 检查 | 结果 |
|------|------|
| 个位数题 | **0/6** ✅ |
| 100以内知识 | 3/6 (g1ll_14, g1ll_32, g1ll_34) |
| Test/Challenge | 4/6 ✅ |
| G2 预习 | 1/6 (g1t_19) |
| 题目来自新版题库？ | 5/6 来自 g1-lower-late.ts ✅ |

### 题库统计

| Tier | 数量 |
|------|------|
| textbook | 18 |
| practice | 60 |
| test | 37 |
| challenge | 14 |

| 难度 | 数量 |
|------|------|
| L1 | 15 |
| L2 | **70 (54%!)** |
| L3 | 34 |
| L4 | 10 |

### 发现: G1题库难度偏斜

**129道G1题中，70道是难度2 (54%)。** 这解释了为什么用户可能看到大量"中低难度"题——即使课程选择正确，题库基数决定了大部分候选项都在L2。

用户看到的可能是**旧课程（v2.9.0生成、存于localStorage）而非新课程**。建议用户清除localStorage中的`math-detective-today-lesson`后重新生成。

---

## 任务三：提交事务追踪

### 测试场景: 单步 `find_numbers` 阶段为 `read` (phase 0)

| 点击 | 操作 | from | to | advanced |
|------|------|------|-----|----------|
| 1 | submit_answer | read(0) | find_numbers(1) | YES ✅ |
| 2 | submit_answer (同lesson) | read(0) | find_numbers(1) | YES |

> 注意: 在组件逻辑中，`read` 阶段不会出现"提交答案"按钮；它出现在 `answer` 阶段。事务层工作正常。

### 事务原子性验证

```
点击 → 答案正确 → commitLessonTransaction → advanced: true
      → changed: true → fromPhaseIndex: 0 → toPhaseIndex: 1
```

**一次点击确实推进了 phase。事务本身正确。**

---

## 需要进一步诊断的间隙

1. **localStorage 旧课程**: 用户可能仍有 v2.9.0 生成的旧课程。建议清空后重试。
2. **Dev server 热更新**: 修改的代码可能未被 HMR 更新。建议重启dev server。
3. **`generateTodayLesson` vs `buildDailyLesson`**: 真实 `/play` 走的是 `getTodayLesson()` 包装路径，可能有额外的复用/校验逻辑。
4. **组件层 vs 事务层**: 事务层工作正常，但组件层的状态传播（React setState、ref、useEffect）可能引入延迟。

---

## 建议的下一步（需用户确认）

1. 在浏览器 Console 执行: `localStorage.removeItem('math-detective-today-lesson')` 后刷新 `/play`
2. 打开 Console 查看 `window.__MD_DEBUG__.lastLessonGenerationReport`
3. 用真实的"提交答案"按钮测试并记录 Console 输出
