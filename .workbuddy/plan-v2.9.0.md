# Math Detective v2.9.0 开发计划
## 学期课程模型 + 自适应难度引擎

> 状态：规划中 | 版本：v2.9.0 | 日期：2026-06-16

---

## 一、问题根因分析

| # | 问题 | 根因 |
|---|------|------|
| 1 | 孩子用2个月仍刷个位数加减 | `questionsByGrade['G1']` 无学期区分，所有G1题等权混合 |
| 2 | 难度不随正确率提升 | `skillLevel` 每5题+1，与知识点掌握度无关 |
| 3 | "年级设置"只决定题库范围 | `ParentSettings.gradeBand` 只有 G1/G2/...，无学期/教材 |
| 4 | 题目无知识点标签 | `Question` 类型无 `skillIds`/`curriculumSemester` 字段 |
| 5 | 高正确率也不升级 | 升级逻辑只看 `skillLevel`，不分析 per-skill mastery |

---

## 二、架构总览

```
v2.9.0 新增文件：
├── lib/curriculum/
│   ├── types.ts          # SkillId, CurriculumProfile, SkillMastery
│   ├── curriculumMap.ts  # 年级×学期×教材 知识点映射
│   └── semesterDetector.ts # 自动学期判断
├── lib/learnerProfile.ts      # 学习者画像（读/写/迁移）
├── lib/adaptiveDifficulty.ts   # 自适应难度引擎（核心）
├── lib/questionAnnotation.ts   # 题目标注工具函数
├── data/questions/annotations/ # 题目标注补丁（不修改原题文件）
│   └── g1-annotations.ts
├── tests/unit/
│   ├── curriculum.test.ts
│   ├── adaptive-difficulty.test.ts
│   └── question-distribution.test.ts
└── reports/
    └── question-difficulty-audit.json  # 题目标注审计结果

v2.9.0 修改文件：
├── lib/types.ts              # Question 增加 skillIds 等字段；GameState 增加 learnerProfile
├── lib/storage.ts            # 持久化 learnerProfile
├── lib/lessonPlanner.ts    # 使用新课程模型选题
├── data/questions/index.ts  # 导出时合并 annotations
├── app/parent-settings/      # 增加学期/教材版本设置
├── app/parent-report/        # 增加课程进度面板
├── app/parent/test/         # 增加题目分布诊断
├── scripts/validate-release.mjs  # 增加3个新测试门控
└── CHANGELOG.md + package.json
```

---

## 三、分阶段执行计划

### Phase 1A：类型系统 + Curriculum Map（并行）

**Agent 1：`curriculum-types-agent`**
- 创建 `lib/curriculum/types.ts`
- 定义 `SkillId` 枚举（覆盖 G1 上下册所有知识点）
- 定义 `CurriculumProfile`（country, textbookEdition, grade, semester）
- 定义 `SkillMastery`（attempts, correct, masteryScore, status）
- 定义 `LearnerProfile`（包含 `skillMastery: Record<SkillId, SkillMastery>`）
- 更新 `lib/types.ts`：Question 增加 `skillIds`, `curriculumGrade`, `curriculumSemester`, `isReview`, `isStretch`；GameState 增加 `curriculumProfile?, learnerProfile?`

**Agent 2：`curriculum-map-agent`**
- 创建 `lib/curriculum/curriculumMap.ts`
- 实现 `CURRICULUM_MAP: Record<string, CurriculumNode>`
- G1 下册至少包含用户指定的 18 个知识点
- 每个知识点定义：`id`, `name`, `semester`（`"lower"`）, `difficultyRange` [1-5], `prerequisites`
- 实现 `getSkillsForGrade(grade, semester)` → `SkillId[]`
- 实现 `getDifficultyRange(skillId)` → [min, max]

**Agent 3：`semester-detector-agent`**
- 创建 `lib/curriculum/semesterDetector.ts`
- 实现 `detectSemester(date, override?)` → `"upper" | "lower"`
- 规则：1-6月→下册，7-12月→上册
- 实现 `getCurriculumProfile(state, date?)` → `CurriculumProfile`
- 实现 `inferGradeSemesterFromHistory(state)` → 迁移用

---

### Phase 1B：题目标注（最大工作量）

**Agent 4：`question-annotator-agent`**
- 读取所有 370 道题目
- 为每道题标注：
  - `skillIds: SkillId[]`（最核心，决定题目属于哪个知识点）
  - `curriculumGrade: number`
  - `curriculumSemester: "upper" | "lower" | "both"`
  - `isReview: boolean`
  - `isStretch: boolean`
- 生成 `reports/question-difficulty-audit.json`
- 输出统计：每道题的标注结果 + 分布统计
- **关键约束**：G1 个位数加减题 `isReview=true, curriculumSemester="both", skillIds=["single_digit_addition"]`
- 创建 `data/questions/annotations/` 下的标注补丁文件（不修改原题），通过 `data/questions/index.ts` 合并

---

### Phase 2：自适应难度引擎

**Agent 5：`adaptive-engine-agent`**
- 创建 `lib/learnerProfile.ts`
  - `loadLearnerProfile(): LearnerProfile`
  - `saveLearnerProfile(profile): void`
  - `updateSkillMastery(profile, skillId, isCorrect, isFirstTry, usedFullHint): LearnerProfile`
  - `migrateFromLegacyState(state): LearnerProfile` ← 从 `attemptRecords` 重建
  - `computeCurrentDifficulty(profile, skillId): number`
- 创建 `lib/adaptiveDifficulty.ts`
  - `selectQuestionsForLesson(profile, curriculum, completedIds, mistakes): Question[]`
  - 实现 6 关难度分布：第1关 L2，第2关 L2-3，第3关 L3，第4关 L3，第5关 L3-4，第6关 L4（偶尔L5）
  - 实现题目类型分布：5% review + 65% currentCore + 20% application + 10% stretch
  - 实现 mastered skill 降权逻辑
  - 实现连续错误降级逻辑（只降该知识点）
- 修改 `lib/lessonPlanner.ts`
  - `getLearningProfile()` 改为返回完整 `LearnerProfile`
  - `buildDailyLesson()` 使用 `selectQuestionsForLesson()`
  - 删除旧的 `getEffectiveMaxDifficulty()` 逻辑

---

### Phase 3：设置页 + 家长报告 UI

**Agent 6：`settings-ui-agent`**
- 修改 `app/parent-settings/` 页面
- 增加：「教材版本」选择（PEP/BNUP/XISHi/generic_cn）
- 增加：「当前学期」选择（自动/上册/下册，允许手动覆盖）
- 增加：「难度偏好」滑块（保守/标准/激进，影响升级速度）
- 更新 `ParentSettings` 类型（向后兼容）

**Agent 7：`report-ui-agent`**
- 修改 `app/parent-report/page.tsx`
- 新增：「课程进度」面板
  - 当前课程：一年级下册
  - 当前主要训练： [知识点列表]
  - 已掌握： [知识点]
  - 正在练习： [知识点]
  - 准备解锁： [知识点]
- 新增：「题目分布诊断」面板（parent test page）
  - 最近30题难度分布柱状图
  - 最近30题技能分布
  - 警告：如果个位数加减 > 20%，显示 ❌

---

### Phase 4：测试 + 验证

**Agent 8：`test-agent`**
- 创建 `tests/unit/curriculum.test.ts`（test:curriculum）
  - 一年级且1-6月 → lower
  - 一年级且7-12月 → upper
  - semesterOverride 优先
  - 一年级下册题库包含正确技能
  - 个位数加减不为主
- 创建 `tests/unit/adaptive-difficulty.test.ts`（test:adaptive-difficulty）
  - 连续高正确率后升级
  - mastered skill 权重下降
  - 单个skill错误只降该skill
  - 使用超过30天不会停在初始难度
  - stretch题占比受控
- 创建 `tests/unit/question-distribution.test.ts`（test:question-distribution）
  - 生成1000套任务，验证分布
  - review 5-10%，currentCore ≥ 60%，stretch 5-15%
  - 个位数加减 ≤ 10%
  - 每套至少3种技能
- 更新 `scripts/validate-release.mjs` 加入3个新测试
- 更新 `package.json` 加入 `test:curriculum` 等脚本

---

### Phase 5：数据迁移 + 导出

**Agent 9：`migration-agent`**
- 修改 `lib/storage.ts` 或创建 `lib/migrations.v290.ts`
- 实现 `migrateTo290(state: GameState): GameState`
  - 从 `attemptRecords` 重建 `LearnerProfile`
  - 推断 `CurriculumProfile`（基于 `startedAt` 和当前日期）
  - 不清除：积分、错题、打卡、奖励、角色、学习记录
- 修改 `lib/dataExport.ts`
  - 导出时包含 `curriculumProfile` 和 `learnerProfile`
- 在应用启动时检测版本并执行迁移

---

## 四、验收标准（用户指定）

1. ✅ 当前教材版本：显示「人教版一年级下册」（或实际选择版本）
2. ✅ 当前自动识别学期：根据日期自动显示「下册」（1-6月）
3. ✅ 一年级下册知识点列表：显示18个核心知识点
4. ✅ 旧题库370题标注结果：`reports/question-difficulty-audit.json`
5. ✅ 模拟档案生成100套任务分布：见测试输出
6. ✅ 个位数加减实际比例：≤ 10%
7. ✅ Level 1-5实际比例：L1≤25%, L2-3≥60%, L4-5≥15%
8. ✅ test:curriculum：PASS
9. ✅ test:adaptive-difficulty：PASS
10. ✅ test:question-distribution：PASS
11. ✅ validate:release：PASS
12. ✅ commit hash：（完成后提供）
13. ✅ 是否push：**否**（用户确认后才能上传部署）
14. ✅ Vercel版本：**不上线**（本地验证通过再部署）
15. ✅ 旧学习数据：完整保留

---

## 五、并行执行策略

```
                    ┌─ Phase 1A (并行) ─┐
                    │  Agent1: types          │
                    │  Agent2: curriculum-map  │
                    │  Agent3: semester-detector│
                    └──────────┬──────────────┘
                               │ 完成后
                    ┌──────────▼──────────────┐
                    │  Phase 1B: 题目标注    │
                    │  Agent4: annotator     │
                    │  (最耗时，可先标注G1) │
                    └──────────┬──────────────┘
                               │ 完成后
                    ┌──────────▼──────────────┐
                    │  Phase 2+3 (并行)      │
                    │  Agent5: adaptive-engine │
                    │  Agent6: settings-ui    │
                    │  Agent7: report-ui      │
                    └──────────┬──────────────┘
                               │ 完成后
                    ┌──────────▼──────────────┐
                    │  Phase 4+5 (并行)      │
                    │  Agent8: test           │
                    │  Agent9: migration      │
                    └──────────┬──────────────┘
                               │ 全部完成后
                    ┌──────────▼──────────────┐
                    │  本地验证 + 用户确认     │
                    │  npm run build          │
                    │  npm run validate:release│
                    │  本地 Next.js 启动验证   │
                    │  (不push，等用户确认)   │
                    └─────────────────────────┘
```

---

## 六、worktree 使用策略

每个 Agent 使用独立的 worktree，避免冲突：

```bash
# Phase 1A (3个 agent 并行)
git worktree add ../math-detective-feat-curriculum-types   -b feat/v290-curriculum-types
git worktree add ../math-detective-feat-curriculum-map     -b feat/v290-curriculum-map
git worktree add ../math-detective-feat-semester-detector  -b feat/v290-semester-detector

# Phase 1B (题目标注，单独一个agent，最大工作量)
git worktree add ../math-detective-feat-annotation  -b feat/v290-question-annotation

# Phase 2+3 (engine + UI, 并行)
git worktree add ../math-detective-feat-adaptive-engine  -b feat/v290-adaptive-engine
git worktree add ../math-detective-feat-settings-ui     -b feat/v290-settings-ui
git worktree add ../math-detective-feat-report-ui      -b feat/v290-report-ui

# Phase 4+5 (test + migration, 并行)
git worktree add ../math-detective-feat-test       -b feat/v290-test
git worktree add ../math-detective-feat-migration  -b feat/v290-migration
```

每个 agent 完成后：
1. 运行 `npm run validate:release` 确保无回归
2. `git add -A && git commit -m "feat(v290): ..."`
3. 通知主 agent（我）进行 code review
4. review 通过后合并到 `feat/v290-integration` 分支
5. 回收 worktree：`git worktree remove <path>`

---

## 七、关键设计决策

### 7.1 题目标注方案：补丁文件，不修改原题

**决策**：创建 `data/questions/annotations/*.ts` 补丁文件，在 `data/questions/index.ts` 中合并。

**理由**：
- 不修改现有的 15 个题目文件（减少冲突）
- 标注可以作为补丁独立 review
- 如果标注错误，只需修改补丁文件

**实现**：
```typescript
// data/questions/annotations/g1-annotations.ts
export const g1Annotations: Partial<Question>[] = [
  { id: 'g1_01', skillIds: ['single_digit_addition'], curriculumSemester: 'both', isReview: true },
  { id: 'g1_02', skillIds: ['single_digit_addition'], curriculumSemester: 'both', isReview: true },
  // ...
];

// data/questions/index.ts 中合并
function applyAnnotations(questions: Question[]): Question[] {
  const annotations = loadAllAnnotations();
  return questions.map(q => {
    const ann = annotations.find(a => a.id === q.id);
    return ann ? { ...q, ...ann } : q;
  });
}
```

### 7.2 SkillId 命名规范

采用 `domain:specific_skill` 格式：

```
G1 上册（review）:
- addition_subtraction:single_digit_addition
- addition_subtraction:single_digit_subtraction
- addition_subtraction:addition_within_10
- addition_subtraction:subtraction_within_10

G1 下册（currentCore）:
- addition_subtraction:subtraction_within_20_borrowing
- number:number_counting_within_100
- number:number_composition_within_100
- number:number_order_within_100
- number:number_comparison_within_100
- addition_subtraction:two_digit_plus_one_digit
- addition_subtraction:two_digit_minus_one_digit
- addition_subtraction:two_digit_plus_tens
- addition_subtraction:two_digit_minus_tens
- addition_subtraction:addition_within_100
- addition_subtraction:subtraction_within_100
- comparison:difference_comparison
- unknown:unknown_addend
- unknown:unknown_subtrahend
- money:rmb_recognition
- money:simple_shopping
- geometry:plane_shapes
- classification:classify_objects
- pattern:simple_patterns

G1 下册（application）:
- word_problem:two_step_word_problem
- information:identify_extra_information
- information:insufficient_information
- reasoning:reverse_unknown
- money:shopping_and_change
- multi_step:multi_condition_reading

G1 下册（stretch）:
- multiplication:equal_groups_intro
- multiplication:repeated_addition
- comparison:multiplicative_comparison_intro
- logic:simple_ordering
- pattern:advanced_patterns
- reasoning:missing_number
- information:information_sufficiency
```

### 7.3 自适应升级规则（详细）

```
升级条件（满足 ALL）：
- 最近20题正确率 ≥ 85%
- 最近20题首次正确率 ≥ 75%
- 完整提示使用率 ≤ 25%
→ difficultyLevel +1

降级条件（满足 ANY）：
- 最近10题正确率 < 55%
- 连续错误 ≥ 3
→ 该 skill 的 difficultyLevel -1（不影响其他 skill）

知识点掌握条件：
- 至少完成8题
- 正确率 ≥ 85%
- 连续正确 ≥ 4
→ 标记为 mastered

掌握后：
- 出现频率降至 5%（只用于复习）
- 可以与其他知识组合出现在综合题
```

---

## 八、风险 + 缓解

| 风险 | 缓解措施 |
|------|---------|
| 题目标注工作量巨大（370题） | 先标注G1题目（55题），其他年级后续迭代 |
| Agent 间依赖导致阻塞 | Phase 1A 先定义好 types，其他 Agent 先用 mock 数据 |
| worktree 合并冲突 | 每个 Agent 负责不重叠的文件范围 |
| 迁移旧数据失败 | 保留 `migrateFromLegacyState` 回退逻辑，失败时使用默认profile |
| 自适应算法导致题目太难/太易 | 增加 `difficultyBias` 设置，家长可以调整 |

---

## 九、完成标准

- [ ] `npm run build` 成功
- [ ] `npm run validate:release` 全部 PASS
- [ ] 本地 `next dev` 启动，功能验证通过
- [ ] 题目分布统计符合用户要求（个位数加减 ≤ 10%）
- [ ] 家长报告显示正确的课程进度
- [ ] 旧数据完整保留（积分、错题、打卡等）
- [ ] **不 push**，等待用户确认后再部署

---

_计划版本：v1.0 | 创建时间：2026-06-16 | 预计完成时间：见各 Agent 进度_
