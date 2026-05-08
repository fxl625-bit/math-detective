# 文字侦探 v2.2 — 版本信息

| 项目 | 内容 |
|------|------|
| **项目名称** | 文字侦探（Math Detective） |
| **当前版本** | v2.2 |
| **版本历史** | v1.0: 2026-04-29 / v2.0: 2026-04-30 / v2.1: 2026-05-08 / v2.2: 2026-05-08 |
| **项目定位** | 小学低年级数学应用题阅读理解小游戏 |
| **技术栈** | Next.js 16 (webpack) + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + localStorage |
| **部署方式** | Vercel（海外架构，大陆建议 VPN） |
| **GitHub** | https://github.com/fxl625-bit/math-detective |
| **Vercel** | https://math-detective.vercel.app |
| **当前状态** | ✅ v2.2 封版，Webpack 生产构建，Android 8.0+ 兼容 |

## v2.2 修复 (2026-05-08)

| 修复 | 文件 | 说明 |
|------|------|------|
| Turbopack → Webpack | `package.json` | 生产构建强制 webpack（`next build --webpack`），解决 Vercel 上 empty-resource 误报 |
| 资源检测优化 | `components/PolyfillScript.tsx` | 排除 preload link/source map/turbopack 条目，只检测真实 script 标签失败 |

**背景**：v2.1 部署 Vercel 后，`performance.getEntriesByType('resource')` 检测到大量 transferSize=0 的 turbopack 命名 JS chunk，触发红色错误条。根因是 Turbopack 生产构建生成了 preload hint 和空 chunk，误报为资源加载失败。切换 Webpack 后 chunk 命名和加载行为回归正常。

## v2.1 Android 兼容性修复 (2026-05-08)

| 修复 | 文件 | 说明 |
|------|------|------|
| CSS @layer 剥离 | `scripts/postbuild-css.js` | 低版本 WebView 不兼容 Tailwind v4 @layer |
| Object.hasOwn polyfill | `components/PolyfillScript.tsx` | React 19 依赖 ES2022 特性 |
| globalThis polyfill | `components/PolyfillScript.tsx` | Chrome < 71 不支持 |
| 浏览器兼容目标 | `.browserslistrc` | Chrome 49+ / Android 7+ |
| 缩放限制移除 | `app/layout.tsx` | maximumScale=1 触发 Android 渲染异常 |
| 备用注入 | `middleware.ts` | 预留 HTML 注入方案 |

## v2.0 功能升级 (2026-04-30)

| 阶段 | 内容 |
|------|------|
| Phase 1 | 12 个侦探破案故事 + 侦探长文字泡对话 |
| Phase 2 | 乘除法题库 + 多余/缺失题型 + 奥数融入年级库 |
| Phase 3 | 侦探社晋升体系 + 错题同知识点再练 |
| Phase 4 | 家长报告增强（雷达图+周趋势）+ easyMode |
| 数据 | v4 migration |

## 检查命令

| 命令 | 结果 |
|------|------|
| `npm run build` | ✅ Webpack + postbuild-css 通过 |
| `npm run lint` | ⚠️ 警告均为已有代码模式 |
