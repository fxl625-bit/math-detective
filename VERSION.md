# 文字侦探 v2.1 — 版本信息

| 项目 | 内容 |
|------|------|
| **项目名称** | 文字侦探（Math Detective） |
| **当前版本** | v2.1 |
| **版本历史** | v1.0: 2026-04-29 / v2.0: 2026-04-30 / v2.1: 2026-05-08 |
| **项目定位** | 小学低年级数学应用题阅读理解小游戏 |
| **技术栈** | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + localStorage |
| **部署方式** | Vercel（海外架构，大陆建议 VPN） |
| **GitHub** | https://github.com/fxl625-bit/math-detective |
| **Vercel** | https://math-detective.vercel.app |
| **当前状态** | ✅ v2.1 封版，Android 8.0+ 兼容 |

## v2.0 升级内容 (2026-04-30)

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1.1 | 案件故事系统 — 12个侦探破案故事 | ✅ |
| Phase 1.2 | 侦探长文字泡对话 — 打字效果、多消息队列 | ✅ |
| Phase 2.1 | 乘除法题库 — 10道乘除题 (G3+) | ✅ |
| Phase 2.2 | 条件多余/信息缺失题型 — 16道专项题 | ✅ |
| Phase 2.3 | 奥数思维题融入年级库 — 移除 olympiadEnabled | ✅ |
| Phase 3.1 | 侦探社晋升体系 — 见习→探员→高级探员→侦探→名侦探 | ✅ |
| Phase 3.3 | 错题同知识点再练 — 3道同类题挑战 | ✅ |
| Phase 4 | 家长报告增强 — 技能雷达图(SVG)、每周趋势表、easyMode | ✅ |
| 数据迁移 | v4 — easyMode/weeklySnapshots/skillLevel/decorations | ✅ |

## v2.1 Android 兼容性修复 (2026-05-08)

| 修复 | 文件 | 说明 |
|------|------|------|
| CSS @layer 剥离 | `scripts/postbuild-css.js` | 低版本 WebView 不兼容 Tailwind v4 @layer |
| Object.hasOwn polyfill | `components/PolyfillScript.tsx` | React 19 依赖 ES2022 特性 |
| globalThis polyfill | `components/PolyfillScript.tsx` | Chrome < 71 不支持 |
| 浏览器兼容目标 | `.browserslistrc` | Chrome 49+ / Android 7+ |
| 缩放限制移除 | `app/layout.tsx` | maximumScale=1 触发 Android 渲染异常 |
| 备用注入 | `middleware.ts` | 预留 HTML 注入方案 |

## 检查命令

| 命令 | 结果 |
|------|------|
| `npm run build` | ✅ 通过（含 postbuild-css.js） |
| `npm run lint` | ⚠️ 警告均为已有代码模式 |
| 生产模式本地测试 | ✅ Android 8.0 模拟器正常 |
