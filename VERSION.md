# 文字侦探 v2.3 — 版本信息

| 项目 | 内容 |
|------|------|
| **项目名称** | 文字侦探（Math Detective） |
| **当前版本** | v2.3 |
| **版本历史** | v1.0: 04-29 / v2.0: 04-30 / v2.1: 05-08 / v2.2: 05-08 / v2.3: 05-11 |
| **项目定位** | 小学低年级数学应用题阅读理解小游戏 |
| **技术栈** | Next.js 16 (webpack) + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + localStorage |
| **部署方式** | Vercel（海外架构，大陆建议 VPN） |
| **GitHub** | （本仓库） |
| **Vercel** | https://math-detective.vercel.app |
| **当前状态** | ✅ v2.3 封版，Debug overlay 默认隐藏，Android 8.0+ 兼容 |

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
