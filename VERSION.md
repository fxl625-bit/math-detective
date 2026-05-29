# 文字侦探 — 版本信息

| 项目 | 内容 |
|------|------|
| **项目名称** | 文字侦探（Math Detective） |
| **当前版本** | v2.5 |
| **版本历史** | v1.0: 04-29 / v2.0: 04-30 / v2.1: 05-08 / v2.2: 05-08 / v2.3: 05-11 / v2.4: 05-29 / v2.5: 05-29 |
| **项目定位** | 小学低年级数学应用题阅读理解小游戏（奥数渐进体系） |
| **技术栈** | Next.js 16 (webpack) + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + localStorage |
| **部署方式** | Vercel（海外架构，大陆建议 VPN） |
| **GitHub** | （本仓库） |
| **Vercel** | https://math-detective.vercel.app |
| **当前状态** | ✅ v2.5 封版，奥数渐进体系（G1-G5）+ 每日激励系统 + 间隔复习 |

---

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
