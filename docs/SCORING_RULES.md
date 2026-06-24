# Math Detective — 积分规则规范 (v2.11.4)

> **此文档是积分系统的唯一权威规范。**
> 所有 AI 修改、人工修改、以及自动化脚本均必须以此文档为准，不得在未更新此文档的情况下修改积分逻辑。
> 引用位置：README.md、AI_HANDOFF.md、CLAUDE.md

---

## 一、字段定义（统一口径）

| 字段 | 位置 | 语义 |
|------|------|------|
| `stars` | `GameState.stars` | 孩子可感知的总星星数（主积分）|
| `correctCount` | `GameState.correctCount` | 历史答对题目总数 |
| `wrongCount` | `GameState.wrongCount` | 历史答错题目总数 |
| `answerAttempts` | `GameState.answerAttempts` | 历史提交总次数（含错误） |
| `completedToday` | `GameState.completedToday` | 今日完成题目数（每日重置） |
| `totalCompleted` | `GameState.totalCompleted` | 历史完成题目总数（累计） |
| `attemptRecords` | `GameState.attemptRecords[]` | 每次提交的详细记录，最多 200 条，按题目 ID 去重保留最新 |
| `rewardClaimed` | `TodayLesson.rewardClaimed` | **每日任务奖励是否已发放**（控制星星发放，不控制弹窗） |
| `rewardShown` | `TodayLesson.rewardShown` | **奖励弹窗是否已展示**（只控制弹窗，不控制星星发放） |
| `awardedAt` | `LessonStep.awardedAt` | 单题奖励幂等标记时间戳（已发则不重复加分） |

> ⚠️ **项目中不存在 `points`、`coins`、`exp` 字段。** 积分统一使用 `stars`。
> 若后续需要新增字段，必须先更新此文档，并更新 `lib/types.ts` 的 `GameState` 定义。

---

## 二、积分规则

### 2.1 单题答对

```
stars += getStarReward(state.level)
  level 1-2 → +1 star
  level 3-4 → +2 stars
  level 5+  → +3 stars

correctCount += 1
answerAttempts += 1
completedToday += 1
totalCompleted += 1
```

**幂等控制**：`LessonStep.awardedAt` 不为空时，不重复加分。
**实现位置**：`lib/storage.ts#completeQuestion()` + `app/play/page.tsx#runLessonAction()`

### 2.2 单题答错

```
wrongCount += 1（通过 addMistake 间接增加）
answerAttempts += 1
stars 不变
totalCompleted 不变
```

**错题记录**：写入 `GameState.mistakes[]`（MistakeRecord）。

### 2.3 使用提示（usedHint）

- 使用 light/medium hint：当轮积分不受影响。
- 使用 full hint（完整解题步骤）：当轮答对后积分照常发放，不扣分。
- 不因使用提示而跳过积分发放。

### 2.4 完成每日任务（daily reward）

```
每日奖励星星 = 5（基础 3 + 全关完成额外 2）
stars += 5  （通过 addStars() 写入）
rewardClaimed = true
rewardClaimedAt = now
```

**幂等控制**：`rewardClaimed === true` 时不再发放。
**实现位置**：`lib/rewardSystem.ts#grantDailyRewardOnce()` + `hooks/useGameState.ts#addStars()`

### 2.5 奖励弹窗展示

```
rewardShown = true
rewardShownAt = now
```

**语义**：`rewardShown` 仅控制弹窗是否展示，与星星发放完全独立。
`rewardShown=true` 不影响单题积分发放。
`rewardClaimed=true` 不影响单题积分发放。

---

## 三、幂等规则

| 场景 | 行为 |
|------|------|
| 同一题刷新后重新进入 | `awardedAt` 已存在 → 不重复加分 |
| 返回首页再进入 | 同上 |
| 重复提交同一正确答案 | `awardedAt` 已存在 → 不重复加分 |
| 家长重置今日任务 | 历史 `stars` 不受影响 |
| 重建今日任务 | `GameState.stars` 不重置 |
| 清空学习进度 | 只有用户明确点"清空全部数据"时清零 `stars` |
| 每日奖励 | `rewardClaimed=true` 后不重复发放 |
| 每日奖励弹窗 | `rewardShown=true` 后不重复展示 |

---

## 四、异常状态修复（Migration）

| 异常状态 | 修复动作 |
|----------|----------|
| `completed=true && rewardClaimed=undefined` | 旧数据迁移：直接设 `rewardClaimed=true`（认为已发过） |
| `completed=true && rewardShown=undefined` | 旧数据迁移：设 `rewardShown=true`（不再弹旧任务奖励） |
| `rewardShown=true && rewardClaimed=false` | 异常状态，应在 migration 中修复：设 `rewardClaimed=true` |

**实现位置**：`lib/rewardSystem.ts#migrateRewardFlags()`

---

## 五、数据流链路

```
用户答题
  └─ runLessonAction('submit_answer')
       ├─ checkAnswer(input, question)
       ├─ 正确 → completeQuestion(questionId, true)    ← 写 stars（lib/storage.ts）
       │         └─ getStarReward(level) → stars += N
       ├─ 错误 → completeQuestion(questionId, false)   ← 不加 stars
       └─ lesson 状态推进（commitLessonTransaction）
            └─ step.awardedAt = now（幂等标记）

每日任务完成
  └─ result.nextLesson.completed === true
       └─ grantDailyRewardOnce(state, lesson)
            ├─ 返回 bonusStars
            └─ addStars(bonusStars)                    ← 走 update() 路径写 localStorage
```

---

## 六、禁止事项

1. **禁止**在 `grantDailyRewardOnce` 返回值里直接修改 `state.stars` 而不通过 `addStars()`。
2. **禁止**在 `rewardClaimed=true` 时跳过单题积分。
3. **禁止**在 `rewardShown=true` 时跳过单题积分。
4. **禁止**在 Migration 中重置 `stars`。
5. **禁止**在重建今日任务（`generateSafeFallbackLesson`）时清空 `GameState`。
6. **禁止**新增 `points`、`coins`、`exp` 等平行积分字段，除非先修改此文档并获得明确批准。

---

## 七、测试要求

测试脚本：`npm run test:scoring`（`tests/unit/scoring.test.ts`）

必须覆盖：
1. 答对一题后 `stars` 增加
2. 答错不增加 `stars`
3. 答错后再答对，只增加一次
4. 同一题重复提交正确答案，不重复增加（`awardedAt` 幂等）
5. 完成每日任务后 daily reward 只发一次（`rewardClaimed` 幂等）
6. 返回首页不重复发
7. 刷新页面不重复发
8. 旧 localStorage migration 后积分不丢
9. 重建今日任务不清空历史积分
10. `rewardShown=true` 不影响单题积分

---

*最后更新：v2.11.4 (2026-06-24)*
*作者：Math Detective Team*
