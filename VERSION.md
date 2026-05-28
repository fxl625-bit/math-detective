# 文字侦探 v2.4 — 版本信息

| 项目 | 内容 |
|------|------|
| **项目名称** | 文字侦探（Math Detective） |
| **当前版本** | v2.4 |
| **版本历史** | v1.0: 04-29 / v2.0: 04-30 / v2.1: 05-08 / v2.2: 05-08 / v2.3: 05-11 / v2.4: 05-28 |
| **项目定位** | 小学低年级数学应用题阅读理解小游戏 |
| **技术栈** | Next.js 16 (webpack) + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + localStorage |
| **部署方式** | Vercel（海外架构，大陆建议 VPN） |
| **GitHub** | （本仓库） |
| **Vercel** | https://math-detective.vercel.app |
| **当前状态** | ✅ v2.4 封版，奥数默认开启 + G1思维题库 + 侦探换装 + 数轴/教具组件 |

## v2.4 升级 (2026-05-28)

| 模块 | 说明 |
|------|------|
| 移除 easyMode | 删除降低难度开关，奥数/思维题对所有年级默认开放；数据迁移 v4→v5 |
| G1 思维题库 | 新建 18 道 G1 思维题（逻辑推理、数列规律、等量代换、年龄比较、天平推理等） |
| G1 关卡扩展 | G1/G2 随机引入进阶关卡（find_compare_numbers、spot_extra_info、spot_missing_info） |
| 侦探换装 | 10 件装饰品（帽子/配件/服装/工具），奖励中心新增换装 Tab，DetectiveMascot 支持装饰叠加渲染 |
| 数轴组件 | 新建 NumberLine（SVG 弧线动画，加法绿色右跳/减法红色左跳） |
| 互动教具 | 新建 CountingBlocks（拖拽计数积木）+ BalanceScale（SVG 天平倾斜动画） |

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
