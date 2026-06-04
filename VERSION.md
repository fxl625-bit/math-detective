# 文字侦探 — 版本信息

| 项目 | 内容 |
|------|------|
| **项目名称** | 文字侦探（Math Detective） |
| **当前版本** | v2.7.1 |
| **版本历史** | v1.0: 04-29 / v2.0: 04-30 / v2.1: 05-08 / v2.2: 05-08 / v2.3: 05-11 / v2.4: 05-29 / v2.5: 05-29 / v2.6: 06-02 / v2.6.3: 06-03 / v2.6.8: 06-03 / v2.6.9: 06-03 / v2.6.10: 06-04 / v2.6.11: 06-04 / v2.6.12: 06-04 / v2.7.1: 06-04 |
| **项目定位** | 小学低年级数学应用题阅读理解小游戏（奥数渐进体系） |
| **技术栈** | Next.js 16 (webpack) + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + localStorage |
| **部署方式** | Vercel（海外架构，大陆建议 VPN） |
| **GitHub** | （本仓库） |
| **Vercel** | https://math-detective.vercel.app |
| **当前状态** | ✅ v2.7.1 封版，P0 主题错配/重复提示/step文案修复 |

---

## v2.6.10 - P0 多答案题校验 + 统一答案检查器 + 等差数列引导 (2026-06-04)

### 核心修复
| 修复 | 文件 | 说明 |
|------|------|------|
| 统一答案检查器 | `lib/answerChecker.ts` | 新增 `checkAnswer()` 统一入口，支持 7 种 answerType |
| 多答案输入组件 | `components/lesson/MultiAnswerInput.tsx` | 动态生成多个输入框，部分正确反馈 |
| 等差数列引导 | `components/lesson/SequencePatternGuide.tsx` | G1/G2 不讲公式用配对法，G3+ 展示公式 |
| AnswerType 扩展 | `lib/types.ts` | 新增 multi_answer/expression/not_enough_information |
| ProblemType 扩展 | `lib/types.ts` | 新增 sequence_arithmetic |
| SubAnswer 接口 | `lib/types.ts` | 多答案题子答案定义 |
| 题目数据修复 | `data/questions/olympiadIntro.ts` | oi_10/oi_12 标注 multi_answer + subAnswers |
| 路由修复 | `app/play/page.tsx` | 数列题路由到 SequencePatternGuide |
| 事务系统修复 | `lib/lessonTransaction.ts` | 使用统一 checkAnswer |

### 版本
- v2.6.9 → v2.6.10

---

## v2.6.9 - P0 渲染前修复管道 + 禁止卡死页面 (2026-06-03)

### 核心修复
| 修复 | 文件 | 说明 |
|------|------|------|
| 渲染前修复管道 | `lib/lessonPlanner.ts` | `safeNormalizeLesson` step #12: 加载时即校验 step-question 兼容性，不再依赖 useEffect 渲染后修复 |
| 安全降级课程 | `lib/lessonPlanner.ts` | `generateSafeFallbackLesson()`: 替换失败时直接生成 basic_arithmetic 保底课程，禁止空转循环 |
| 修复上限 | `lib/lessonTransaction.ts` | MAX_REPAIR_ATTEMPTS 从 2 降为 1，一次失败即重建安全课程 |
| 禁止卡死页面 | `app/play/page.tsx` | 移除 FindNumbers/ActionWords/SpotExtraInfo 三个 Phase 组件的 repair UI，孩子端不再能看到"正在自动修复" |
| 版本迁移 | `app/play/page.tsx` | 自动检测 localStorage 旧状态，触发 versionUpgrade 迁移 |

### 验证增强 (Phase 1)
| 校验 | 文件 | 说明 |
|------|------|------|
| #38-#41 新增检查 | `lib/questionValidation.ts` | 倍词检测、age_problem 限制、find_action_words 关键词要求、step 标题场景匹配 |
| 交叉校验 | `lib/questionValidation.ts` | `validateStepQuestionMatch()`: stepType × questionId 交叉验证 |
| 家长调试面板 | `app/parent-report/page.tsx` | 可折叠 14 列 step/question/theme 匹配表 |

### 设计决策
- 修复发生在**加载阶段**而非渲染阶段：`loadState → safeNormalizeLesson → validate → repair/replace/rebuild → save → render`
- 保底课程始终可用：禁止 倍/岁/年龄/比例/逻辑/图形/植树 等复杂关键词
- 零循环：一次修复失败直接生成安全课程，永不空转

---

## v2.6.8 - P0 正确率 BUG 修复 (2026-06-03)

- 修复统计正确率显示 17% 实际接近 100% 的计算错误
- 提示提前泄露答案修复：全局分层提示系统

---

## v2.6.3 - P0修复：版本确认、缓存刷新与多余信息关卡防御 (2026-06-03)

### 新增功能
| 功能 | 文件 | 说明 |
|------|------|------|
| 版本系统 | `lib/appVersion.ts` | APP_VERSION/BUILD_TIME/COMMIT_SHA + logAppVersion() |
| 版本升级 | `lib/versionUpgrade.ts` | 启动时检测版本变化，自动迁移+修复todayLesson |
| 缓存控制 | `lib/appVersion.ts` | clearOldCachesSafely/refreshToLatestVersion/clearPageCacheAndRefresh |
| 家长设置 | `app/rewards/page.tsx` | 版本与缓存区域：版本号/构建信息/本地数据版本/今日任务状态 |
| 运行时防御 | `app/play/page.tsx` | SpotExtraInfoPhased 检测非法题目，自动跳过不卡住 |
| 题库守卫 | `lib/questionGuards.ts` | getExpectedIrrelevantItems/isValidForExtraInfoStep/isValidForRemoveNoiseStep |

### 按钮
- **刷新到最新版本**：清理CacheStorage + SW update + reload
- **清除页面缓存并刷新**：清理缓存 + 带版本参数reload（保留学习数据）
- **重建今日任务**：清除todayLesson重新生成（保留星星/奖励/错题本/装扮）

### 启动流程
1. console.info 输出版本/构建/commit
2. 检测 localStorage 上一次版本
3. 版本不一致时自动 migration + repairInvalidTodayLesson
4. 写入新版本号 + 清理旧缓存

---

## v2.6 P0/P1 修复 (2026-06-02)

### P0 修复 (6/6)
| 任务 | 说明 |
|------|------|
| P0-1 | 类型体系：LessonType(10种) / KeywordType(9种) / NumberRole(3种) |
| P0-2 | 选题逻辑：inferLessonType / inferKeywordType / classifyNumberRole 精确匹配 |
| P0-3 | 校验系统：validateQuestionIntegrity 含12项检查 + 选项一致性 |
| P0-4 | 数字线索：logic_reasoning 与 find_numbers 冲突修复，stepCompatibility 清理 |
| P0-5 | 动作关卡：FORBIDDEN_KEYWORD_TYPES 禁止关键词交叉检查 |
| P0-6 | 组件状态：4个页面 setTimeout→setState 添加 mountedRef 卸载保护 |

### P1 批量修复 (3/3)
| 任务 | 说明 |
|------|------|
| P1-1 | 342题全部补齐 lessonType + keywordType 字段（自动推断 + 手工标注18边缘题） |
| P1-2 | scripts/validate-questions.ts 全题库扫描脚本 |
| P1-3 | 构建验证通过，新增 npm script `validate:questions` |

### 故事扩展
| 年级 | 新增故事 | 主题 |
|------|----------|------|
| G3-G4 | 科学实验室数据疑案 | 科学 |
| G3-G4 | 校园义卖账目谜案 | 校园 |
| G3-G4 | 图书馆借阅谜踪 | 校园 |
| G3-G4 | 运动会计分迷局 | 运动 |
| G5-G6 | 天文台数据疑云 | 科学 |
| G5-G6 | 城市规划比例谜案 | 工程 |
| G5-G6 | 银行利率计算案 | 金融 |
| G5-G6 | 藏宝图比例之谜 | 探险 |

### 题库统计
- 基础题：180（G1-G6 + 乘除法 + 多余/缺失信息）
- 奥数题：136（G1思维30 + G2入门20 + G3基础25 + G4进阶28 + G5冲刺33）
- OlympiadIntro：30
- 总题库：342 题（新增26题：g5-olympiad 5题 + g6 2题 + 各类补充）
- 校验结果：342/342 通过 ✅，0 CRITICAL，0 WARNING

### 新增/修改文件

| 类型 | 文件 | 说明 |
|------|------|------|
| 新建 | `lib/questionValidation.ts` | 完整校验系统（12项检查） |
| 新建 | `scripts/validate-questions.ts` | 全题库扫描脚本 |
| 新建 | `scripts/add-lesson-keyword-types.ts` | 多行格式批量注入 |
| 新建 | `scripts/inject-compact-lesson-keyword.mjs` | 紧凑格式注入 |
| 新建 | `scripts/fix-edge-lesson-keyword.mjs` | 边缘case修复 |
| 新建 | `scripts/fix-critical-lessontype.mjs` | CRITICAL lessonType修复 |
| 新建 | `scripts/fix-logic-stepcompat-v2.mjs` | 针对性 find_numbers 清理 |
| 新建 | `scripts/fix-logic-stepcompat.js` | 旧版 stepCompatibility修复 |
| 新建 | `scripts/fix-compact.pl` | Perl版紧凑格式修复 |
| 新建 | `scripts/fix-all-logic-stepcompat.mjs` | 全量 find_numbers 清理 |
| 新建 | `scripts/cleanup-null-lesson-keyword.mjs` | null值清理 |
| 新建 | `tsconfig.scripts.json` | 脚本编译配置 |
| 修改 | `lib/types.ts` | 新增 LessonType/KeywordType/NumberRole + 映射表 |
| 修改 | `lib/lessonPlanner.ts` | classifyNumberRole 调用更新 |
| 修改 | `lib/questionValidation.ts` | 导入修复 + 变量修正 |
| 修改 | `app/play/page.tsx` | EquationAnswerPhase 添加 mountedRef |
| 修改 | `app/play/solve/page.tsx` | 添加 mountedRef 保护 |
| 修改 | `app/play/clues/page.tsx` | 添加 mountedRef 保护 |
| 修改 | `app/play/noise/page.tsx` | 添加 mountedRef 保护 |
| 修改 | `data/stories.ts` | +8个G3-G6故事（+196行） |
| 修改 | `data/questions/*.ts` (15个文件) | 全部补齐 lessonType/keywordType + 数据修复 |
| 修改 | `VERSION.md` | 更新至v2.6 |
| 修改 | `package.json` | +`validate:questions` script + tsconfig-paths依赖 |

## v2.5 升级 (2026-05-29)

### 每日激励系统
| 功能 | 文件 | 说明 |
|------|------|------|
| 小狐心情系统 | `app/page.tsx` | 根据打卡状态+时间段自动切换5种表情台词 |
| 7天火苗条 | `app/page.tsx` | 连续打卡可视化，Duolingo风格 |
| 每日签到翻牌 | `app/page.tsx` + `lib/storage.ts` | 随机1-5颗奖励星星 |
| 案件档案风格 | `app/page.tsx` | 未完成关卡显示???+🔒，做完解锁 |

### 奥数渐进体系（G1-G5，+136题）
| 年级 | 文件 | 题数 | 定位 |
|------|------|------|------|
| G1 | `g1-thinking.ts` | 30 | 奥数启蒙（逻辑/规律/间隔/周期/枚举/数字谜） |
| G2 | `g2-olympiad.ts` | 20 | 奥数入门（和差线段图/植树/还原/竖式谜/凑整） |
| G3 | `g3-olympiad.ts` | 25 | 奥数基础（和倍差倍/鸡兔/盈亏/等差数列/容斥/平均数） |
| G4 | `g4-olympiad.ts` | 28 | 奥数进阶（相遇追及/流水行船/三量容斥/加乘原理/定义新运算/高斯求和） |
| G5 | `g5-olympiad.ts` | 33 | 择校冲刺（牛吃草/工程/浓度/经济/分数/比例/数论/立体/环形/方程） |

### 间隔复习系统
| 功能 | 文件 | 说明 |
|------|------|------|
| 复习追踪 | `lib/types.ts` + `lib/storage.ts` | questionReviewDates/Counts 记录每道题复习历史 |
| 艾宾浩斯算法 | `lib/lessonPlanner.ts` | 1→3→7→14→30天间隔，6次后掌握 |
| 每日混合 | `lib/lessonPlanner.ts` | 每天5关中2道复习+3道新题 |

### 题库统计
- 基础题：180（G1-G6 + 乘除法 + 多余/缺失信息）
- 奥数题：136（G1思维30 + G2入门20 + G3基础25 + G4进阶28 + G5冲刺33）
- 总题库：316 题

---

## v2.4 封版 (2026-05-29)

| 项目 | 内容 |
|------|------|
| **版本** | v2.4 |
| **日期** | 2026-05-29（封版） |
| **状态** | ✅ 已封版，构建通过，已部署 |

## v2.4 升级 (2026-05-28~29)

| 模块 | 说明 |
|------|------|
| 移除 easyMode | 删除降低难度开关，奥数/思维题对所有年级默认开放；数据迁移 v4→v5 |
| G1 思维题库 | 新建 18 道 G1 思维题（逻辑推理、数列规律、等量代换、年龄比较、天平推理等） |
| G1 关卡扩展 | G1/G2 随机引入进阶关卡（find_compare_numbers、spot_extra_info、spot_missing_info） |
| 侦探换装 | 10 件装饰品（帽子/配件/服装/工具），奖励中心新增换装 Tab |
| 数轴组件 | NumberLine（SVG 弧线动画，加法绿色右跳/减法红色左跳），集成到 Simulation + Answer 阶段 |
| 互动教具 | CountingBlocks（拖拽计数积木）+ BalanceScale（SVG 天平倾斜动画），集成到 Simulation + CompareNumbers |
| 角色卡图片化 | DetectiveMascot 改用 next/image 渲染角色图（4 表情 + 8 收集卡），GPT Image 生成，emoji fallback |
| 正确率修复 | 重做已完成题目时不再重复累计 correctCount，修复正确率超过 100% 的 bug |

## v2.4 已知问题与教训

详见 [MISTAKES.md](./MISTAKES.md)

| # | 错误 | 教训 |
|---|------|------|
| 1 | 正确率 155% — `correctCount` 重复累计 | 任何需要计数的函数都要问：如果重复调用会怎样？ |
| 2 | 删除源文件后无法恢复 — 分割完就 rm | 生成/转换类的源文件先 git commit 再清理 |
| 3 | 等分网格切歪 — 假设 GPT 输出列宽均等 | 图片分割必须用边缘检测，不信任 AI 的排版对齐 |
| 4 | Python 中文路径编码崩溃 | Windows + bash + Python 处理中文路径：用 os.listdir 通配匹配 |

## v2.3 修复 (2026-05-11)

| 修复 | 文件 | 说明 |
|------|------|------|
| Debug overlay 默认隐藏 | `components/PolyfillScript.tsx` | 红色错误条和绿色状态指示器仅 `?debug=1` 或 localStorage `mathDetectiveDebug=1` 时显示 |
| 移除 resource 性能检测 | `components/PolyfillScript.tsx` | 删除 `performance.getEntriesByType('resource')` 检查，彻底消除 empty-resource 误报 |
| 简化水合检测 | `components/PolyfillScript.tsx` | MutationObserver 不再检查中文文本内容 |
| polyfill 常驻运行 | `components/PolyfillScript.tsx` | Object.hasOwn + globalThis polyfill 始终执行，不受 debug 开关影响 |

## v2.2 (2026-05-08)
Webpack 生产构建切换 + empty-resource 误报修复。

## v2.1 (2026-05-08)
Android 8.0 兼容性：CSS @layer 剥离、Object.hasOwn/globalThis polyfill、body-first 脚本执行。

## v2.0 (2026-04-30)
功能大升级：故事系统、乘除法、多余/缺失题型、奥数融入、侦探晋升、错题重练、家长报告增强。

## 检查命令

| 命令 | 结果 |
|------|------|
| `npm run build` | ✅ Webpack + postbuild-css 通过 |
| `npm run lint` | ⚠️ 警告均为已有代码模式 |
