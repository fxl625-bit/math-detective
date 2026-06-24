# 当前已知问题 (Current Issues)

> 最后更新：2026-06-24 | 代码版本：v2.11.4

本文档记录已知但尚未修复的问题，供后续接手者参考。

---

## 一、Bug 清单

### BUG-001: skillLevel 升级偏移（已修复 v2.8.4+1）

**状态**：🔴 已修复  
**文件**：`lib/storage.ts:205`  
**现象**：第一次答对就触发 skillLevel 升级，后续每次偏移一位（第6题升级而非第5题）  
**根因**：`state.correctCount % 5 === 0` 使用了增量前的值  
**修复**：改为 `(state.correctCount + 1) % 5 === 0`  
**影响**：skillLevel 仅影响星星奖励乘数，影响较小

---

### BUG-002: 关键字"给了/送给了"分类错误（已修复 v2.11.4）

**状态**：✅ 已修复
**文件**：`data/keywordRules.ts`
**现象**：`给了`、`送给了` 被归为 `addition_change`，与题库标注（`type: 'subtract'`）矛盾，导致 checkOk 误判
**根因**：v2.11.3 扩充关键字库时未区分"又给了"（收到=加）与"给了/送给了"（给出=减）
**修复**：`给了`、`送给了` → `subtraction_change`；`又给了` 保持 `addition_change`
**遗留**：单字"给了"方向本质依赖语境，静态表无法全覆盖（见 TECH-005）

---

### BUG-003: checkOk 对 mixed 运算题永远判错（已修复 v2.11.4）

**状态**：✅ 已修复
**文件**：`app/play/page.tsx` FindActionWordsPhased
**现象**：含"下了+又上来"等两步加减题进入"判断运算"时，无论选加还是减都显示红色
**根因**：关键字方向混合时回退到 `question.operation='mixed'`，但选项 `m` 数组只含 addition/subtraction，永不匹配（此缺陷在 v2.11.3 旧版即存在）
**修复**：关键字方向混合时两个选项都判正确
**影响题**：g2_03、g2_16 等

---

## 二、产品北星 vs 现实差距

以下差距在 Obsidian 产品定义 v2.11 中已坦诚记录，当前代码 v2.11.4 尚未实现：

| 北星要求 | 当前状态 | 优先级 |
|----------|----------|--------|
| G1-G6 通用产品 | 仅 G1 深度支持，G2+ 课程编排未验证 | P1 |
| 教材版本映射 | 未实现 | P2 |
| 每日6题结构 | 当前 5 题 | P2 |
| 奥数三级分层 | 题按年级分，无启蒙/基础/进阶 | P1 |
| 完整自适应难度 | 仅基于正确率/连续错误 | P1 |
| 学期进度感知 | 未实现（无上/下学期概念） | P2 |
| 线段图建模 | 未实现 | P2 |
| 语音读题 | 未实现 | P3 |
| Supabase 云同步 | 代码有预留接口，实际全量 localStorage | P1 |
| PWA 离线支持 | 未实现 | P3 |
| 折线图趋势 | SVG 雷达图已做，折线图未做 | P2 |

---

## 三、技术债

### TECH-001: `app/play/page.tsx` 单体过大

**描述**：2304 行单体组件，承载游戏引擎全部逻辑  
**建议**：拆分为独立的 hooks（useLessonEngine、usePhaseRenderer）和组件

### TECH-002: 文档漂移

**状态**：✅ 已修复（v2.11.3）  
**修复内容**：VERSION.md、package.json、appVersion.ts、CHANGELOG.md、docs/ — 全部同步至 v2.11.3；README 已更新至当前代码库状态

### TECH-003: ~~`answerSubmission.ts` 与 `lessonTransaction.ts` 功能重叠~~ （✅ 已修复 v2.11.3）

**状态**：✅ 已修复  
**描述**：`answerSubmission.ts` 无任何导入引用，已被 `lessonTransaction.ts` 完全取代  
**修复**：移除死代码 `answerSubmission.ts`

### TECH-004: Middleware 流式读取

**描述**：`middleware.ts` 将整个 HTML body 读入内存以注入 polyfill  
**风险**：大页面时可能增加内存压力（当前页面较小，暂无实际风险）

### TECH-005: 关键字方向依赖语境（静态分类表的固有局限）

**状态**：🟡 已知局限
**描述**：`给了`、`上了` 等关键字方向取决于句子主语（"妈妈给了他"=加，"他给了别人"=减）。当前 `data/keywordRules.ts` 是静态映射表，无法表达语境相关方向。
**当前缓解**：checkOk 在关键字方向混合时放宽为"两个选项都算对"；题库 `keyword.type` 已逐题标注正确方向。
**长期建议**：find_action_words 关卡的方向判断改为优先读题目自带 `keyword.type`，仅在缺失时回退到静态表。

---

## 四、数据完整性

### DATA-001: 版本迁移链完整性

已验证从 v1 到 v8 的迁移链完整，`LEARNING_STATE_VERSION = 8`。

### DATA-002: attemptRecords 200 条限制

`completeQuestion()` 中 attemptRecords 限制为最近 200 条（`.slice(-200)`）。高频使用的孩子可能丢失早期答题记录，但统计口径按最近一条去重，不影响正确率计算。

---

## 五、测试覆盖缺口

| 缺口 | 影响 | 优先级 |
|------|------|--------|
| G2-G6 课程编排 E2E 测试 | G2+ 编排质量无自动化验证 | P1 |
| 奥数三级分层测试 | 无法验证奥数体系正确性 | P2 |
| 跨设备同步测试 (Supabase) | 暂不需要（localStorage only） | P3 |
| Android 旧设备回归测试 | Chrome 81- 设备覆盖率未知 | P2 |

---

## 六、E2E 已知状态

- `npm run test:e2e` 在 Windows 开发机上可能因服务器启动问题失败（`validate:release` 中唯一 FAIL 的门禁）
- CI (GitHub Actions) 上的 E2E 可能正常，本地建议通过 `npm run test:e2e:playthrough` 等单独命令验证

---

## 七、下次更版建议的优先事项

1. **G2+ 课程编排验证**：确保 `getStepTypesForGrade` 对 G2-G6 返回合理的关卡类型
2. **学期感知**：为 `ParentSettings` 添加 `semester` 字段（上/下学期）
3. **奥数分层**：在 `olympiadIntroQuestions` 中明确标记启蒙/基础/进阶
4. **组件拆分**：将 `app/play/page.tsx` 拆分为可维护的子组件（~2300 行）
5. **G2-G6 课程编排 E2E 测试**：确保 G2+ 编排质量有自动化验证

---

*维护责任：每次发现新问题或修复旧问题时，更新本文档。*
