# 提示系统规则 (Hint System Rules)

> 本文档是提示系统的**不可绕过契约**。任何 Guide、题型、组件改动都必须遵守。

---

## 一、唯一渲染入口

**`components/lesson/HintSystem.tsx` 是唯一能显示以下内容的组件：**

- 💡 小提示
- 再给一点提示
- 看完整推理
- 一步一步想
- 完整解析

**禁止：**

- ClueSummary 直接渲染"小提示"
- Guide 组件自己写"小提示"
- FullSolve 直接渲染 solutionStepsDetailed
- AnswerPhase 直接渲染 hints
- 任何组件硬编码"💡 小提示"

---

## 二、分层提示结构

### 答题前（pre-answer）

| 层级 | 显示条件 | 内容 |
|------|----------|------|
| light | 默认显示 | 轻量引导，不泄露答案 |
| medium | 点击"再给一点提示" | 更具体的思路，不泄露答案 |
| fullSteps | 点击"看完整推理" | 完整推导过程（可含答案） |

### 答题后（explain 阶段）

| 内容 | 说明 |
|------|------|
| 完整推导 | 一步一步想 |
| 答案解析 | 最终答案和原因 |

---

## 三、数据结构

```typescript
// 每道题的提示必须使用此结构
interface QuestionHints {
  light: string;           // 轻提示（必须）
  medium?: string;         // 中等提示（可选）
  fullSteps?: SolutionStepDetailed[];  // 完整推导（可选）
}
```

**禁止使用以下散落字段直接渲染：**

- `tip`
- `hint`
- `smallHint`
- `solutionSteps`（必须转换为 fullSteps）
- `gradeFriendlySolution.steps`
- `stepByStep`
- `一步一步想`

---

## 四、G1/G2 语言禁用词

**G1/G2 的 light/medium hint 禁止出现：**

- 方程
- 等量关系
- 设x
- 未知数
- 代数
- 公式
- 比例式
- 函数
- 方程两边
- 关系式

**违规示例：**

```
❌ 用方程：两边都是路程，列出等量关系！
✅ 先想一想：两个人走的路加起来，是不是正好走完整段路？
```

---

## 五、安全检查

### 泄题检查

- light hint 不能包含最终答案
- medium hint 不能包含最终答案
- fullSteps 可以包含答案（但只能在点击后显示）

### 重复检查

- 同一 phase 只能渲染一个 HintSystem
- 同一页面不能出现两个"小提示"

### 组件检查

- ClueSummary 不得渲染 HintSystem
- Guide 不得自己写"小提示"标题

---

## 六、validate:hints 检查项

运行 `npm run validate:hints` 会扫描：

1. 源码中非 HintSystem 文件是否硬编码"小提示"
2. 题库中 light hint 是否泄题
3. G1/G2 题是否使用高阶术语
4. 是否有题缺少 light hint
5. fullSteps 是否为空

---

## 七、修改检查清单

修改任何 Guide 或题型后，必须确认：

- [ ] 小提示只通过 HintSystem 渲染
- [ ] 答题前不显示完整推导
- [ ] G1/G2 不使用成人术语
- [ ] light hint 不泄题
- [ ] explain 阶段有完整推导
- [ ] `npm run validate:hints` 通过
