# 文字侦探 — 错误记录与教训

> 每个错误只犯一次。记录根因和防止方法，AI 接手时优先阅读。

---

## #1 正确率显示 155%（超过 100%）

**日期**：2026-05-29  
**现象**：家长报告中总体正确率显示 155%  
**影响文件**：`lib/storage.ts` → `completeQuestion()`

### 根因

```typescript
// 旧代码：alreadyDone 时只阻止了 totalCompleted 递增，
// 但 correctCount 仍然递增
completedToday: alreadyDone ? state.completedToday : state.completedToday + 1,
totalCompleted: alreadyDone ? state.totalCompleted : state.totalCompleted + 1,
correctCount: correct ? state.correctCount + 1 : state.correctCount, // ← BUG
```

孩子在错题本重做已完成题目 → `correctCount` +1 → `correctCount` 可以超过 `totalCompleted` → 正确率 = `correctCount / totalCompleted` > 100%。

### 修复

`alreadyDone` 时直接返回原 state，不更新任何统计数据。

### 防止规则

**写任何累加统计函数时，必须先问：这个操作会不会被重复触发？如果会，重复时应该怎么处理？**

- 用 `alreadyDone` 做 early return 而不是逐字段判断
- 区分"唯一事件"（新题目完成）和"可重复事件"（重做练习）
- 全局统计字段（correctCount、totalCompleted）只记录唯一事件

---

## #2 删除源文件后无法恢复

**日期**：2026-05-29  
**现象**：Python 分割完角色卡图片后 `rm` 了原始拼合图，后续需要重新分割时源文件丢失  
**影响文件**：`public/characters/4张表情.png`、`8张皮肤.png`

### 根因

生成/转换流程中的中间产物未纳入版本控制。以为"分割完就不需要了"，但分割逻辑有 bug 需要重做。

### 修复

用户重新提供源文件，重新分割。

### 防止规则

**任何生成或转换操作的输入文件，必须先 git commit 再清理。**

操作顺序：
1. 拿到源文件 → `git add` + `git commit`
2. 执行转换/分割/处理
3. 验证输出正确
4. 可选清理源文件（但已提交在 git 里，随时可恢复）

---

## #3 等分网格分割图片歪斜

**日期**：2026-05-29  
**现象**：用 `w/cols` 等分切割 GPT 生成的角色卡拼合图，皮肤卡列宽不均、文字标签被切进卡片  
**影响文件**：`public/characters/card-*.png`

### 根因

假设 AI 生成的图片中每张卡尺寸严格一致、网格完美对齐。实际上：
- GPT 每列宽度可能差 10%（329~366px）
- 卡片之间混入了文字标签行（90-140px 高）

### 修复

改用边缘检测：
1. 逐列/逐行采样像素，计算颜色方差
2. 低方差位置 = 背景/间隙
3. 从间隙位置反推每张卡的实际边界
4. 过滤高度 <200px 的行（文字行）

### 防止规则

**处理 AI 生成的多图拼合时，永远不要假设网格对齐。必须用边缘检测找到每张卡的真实像素边界。**

关键参数：
- 方差阈值 30-35（区分"有内容"和"纯背景"）
- 间隙合并距离 15px（同一间隙内的多个像素合并为一个间隙中心）
- 内容行最小高度 200px（排除文字标签）

---

## #4 Python 中文路径编码崩溃

**日期**：2026-05-29  
**现象**：Windows bash 环境下 Python 脚本处理中文文件名时报 `UnicodeEncodeError`  
**影响**：分割脚本的输出打印和文件读写

### 根因

Windows bash 的 stdout 默认编码是 GBK，Python 3 的 UTF-8 字符（如 ✓、中文文件名）在 print 时编码失败。

### 修复

```python
import os
# 不用中文路径字面量，用 os.listdir + 通配匹配
files = [f for f in os.listdir(base) if f.startswith('ChatGPT Image')]
```

### 防止规则

**在 Windows bash + Python 环境下处理文件时：**

1. 不用中文路径字面量 → 用 `os.listdir()` + 字符串匹配
2. print 前确认 stdout 编码：`sys.stdout.reconfigure(encoding='utf-8')`
3. 文件名用 ASCII 前缀（如 `card-`、`detective-`），中文名仅作为备注

---

## 检查清单（每次改动后自查）

- [ ] 累加统计字段是否考虑了重复操作？
- [ ] 转换类操作的源文件是否已 git commit？
- [ ] 图片分割是否用了边缘检测而非等分？
- [ ] Windows 下 Python 脚本是否避开了中文路径字面量？
- [ ] `npx tsc --noEmit` 零错误
- [ ] `npx next build` 构建成功
- [ ] `git status` 确认所有文件已提交
