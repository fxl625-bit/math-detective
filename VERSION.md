# 文字侦探 v2.0 — 版本信息

| 项目 | 内容 |
|------|------|
| **项目名称** | 文字侦探（Math Detective） |
| **当前版本** | v2.0 |
| **升级日期** | 2026-04-30 |
| **项目定位** | 小学低年级数学应用题阅读理解小游戏 |
| **技术栈** | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + localStorage |
| **部署方式** | Vercel + Supabase（海外架构，大陆建议VPN） |
| **GitHub 仓库** | https://github.com/fxl625-bit/math-detective |
| **Vercel 部署地址** | https://math-detective.vercel.app |
| **当前状态** | ✅ 文字侦探 v2.0 可用，已部署 Vercel |

## v2.0 升级内容

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1.1 | 案件故事系统 — 12个侦探破案故事 (data/stories.ts)，G1-G2沉浸式教学 | ✅ |
| Phase 1.2 | 侦探长文字泡对话 — 打字效果、多消息队列 (DetectiveMascot升级) | ✅ |
| Phase 2.1 | 乘除法题库 — 10道乘除题 (data/questions/g3-multiplication.ts) | ✅ |
| Phase 2.2 | 条件多余/信息缺失题型 — 16道专项题 (extra-info.ts, missing-info.ts) | ✅ |
| Phase 2.3 | 奥数思维题融入年级库 — 移除 olympiadEnabled 开关，新增 isExtendedThinking | ✅ |
| Phase 3.1 | 侦探社晋升体系 — 见习→探员→高级探员→侦探→名侦探→传奇侦探 | ✅ |
| Phase 3.3 | 错题同知识点再练 — 3道同类题挑战 (lib/mistakeReinforce.ts) | ✅ |
| Phase 4 | 家长报告增强 — 技能雷达图(SVG)、每周趋势表、easyMode | ✅ |
| 数据迁移 | v4 migration — olympiadEnabled→easyMode, 新增 weeklySnapshots/skillLevel/decorations | ✅ |

## 检查命令结果摘要

| 命令 | 结果 |
|------|------|
| `npm install` | ✅ 通过 |
| `npm run dev` | ✅ 可启动 (Turbopack) |
| `npm run build` | ✅ 通过 (Turbopack + TypeScript) |
| `npm run lint` | ⚠️ 有 ESLint 警告（set-state-in-effect、purity 等），均为已有代码模式 |
