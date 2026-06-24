# 数学侦探（Math Detective）

小学低年级数学应用题阅读理解小游戏。

**核心目标：** 帮助孩子解决"读不懂数学应用题"的问题，训练找数字、找关键词、删除无关信息、理解题意、判断运算等核心阅读技能。

## 技术栈

- Next.js 16 (App Router) + Webpack（非 Turbopack）
- React 19 + TypeScript
- Tailwind CSS v4
- Framer Motion（动画）
- Lucide React（图标）
- localStorage（数据持久化，LEARNING_STATE_VERSION = 8）

## 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 浏览器打开 http://localhost:3000
```

## 构建

```bash
npm run build          # 生产构建（Webpack）
npm run lint           # ESLint 检查
npx tsc --noEmit       # TypeScript 类型检查
```

## 脚本一览

| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run validate:questions` | 题库完整性自检 |
| `npm run validate:themes` | 主题标签验证 |
| `npm run validate:hints` | 提示系统验证 |
| `npm run validate:lesson-generation` | 课程生成验证 |
| `npm run validate:child-ui` | 儿童 UI 规范验证 |
| `npm run validate:release` | 发布门禁（全量验证） |
| `npm run test:state-machine` | 状态机单元测试 |
| `npm run test:scoring` | 积分/评分逻辑测试 |
| `npm run test:data-export` | 数据导出测试 |
| `npm run test:e2e` | E2E 全量测试 |
| `npm run test:e2e:playthrough` | E2E 完整关卡流程测试 |
| `npm run test:e2e:play` | E2E 单关卡测试 |

## 部署到 Vercel

1. 将项目推送到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 导入该仓库
3. Vercel 会自动识别 Next.js 项目，无需额外配置
4. 点击 Deploy 即可
5. 无需环境变量（纯前端项目，数据存 localStorage）

## GitHub 仓库

https://github.com/fxl625-bit/math-detective

## 线上访问地址

https://math-detective.vercel.app

## 项目结构

```
math-detective/
├── app/
│   ├── layout.tsx              # 根布局（含底部导航）
│   ├── page.tsx                # 首页 Dashboard
│   ├── globals.css             # 全局样式
│   ├── play/
│   │   ├── page.tsx            # 游戏引擎主组件（~2300 行，计划拆分）
│   │   ├── clues/page.tsx      # 找数字
│   │   ├── actions/page.tsx    # 找动作词
│   │   ├── noise/page.tsx      # 擦掉废话
│   │   └── solve/page.tsx      # 完整破案
│   ├── rewards/page.tsx        # 奖励中心（虚拟奖励 + 家长奖励 + 家长模式）
│   ├── mistakes/page.tsx       # 错题本
│   └── parent-report/page.tsx  # 家长报告
├── components/
│   ├── AnimatedItems.tsx       # 题目物品动画
│   ├── BalanceScale.tsx        # 天平组件（比较大小）
│   ├── BottomNav.tsx           # 底部导航栏
│   ├── Confetti.tsx            # 撒花效果
│   ├── CostumeShop.tsx         # 侦探换装商店
│   ├── CountingBlocks.tsx      # 计数积木
│   ├── DetectiveMascot.tsx     # 侦探助手角色
│   ├── FeedbackOverlay.tsx     # 答题反馈弹窗
│   ├── LevelBadge.tsx          # 等级徽章
│   ├── LogicRankingGuide.tsx   # 逻辑排序引导
│   ├── NumberLine.tsx          # 数轴组件
│   ├── ParentRewardForm.tsx    # 家长奖励表单弹窗
│   ├── PolyfillScript.tsx      # 浏览器 Polyfill
│   ├── ProgressBar.tsx         # 进度条
│   ├── RedeemConfirmModal.tsx  # 兑换确认弹窗
│   ├── StarDisplay.tsx         # 星星显示
│   ├── StreakDisplay.tsx       # 持续打卡显示
│   ├── TomorrowPreviewCard.tsx # 明日预告卡片
│   ├── lesson/
│   │   ├── HintSystem.tsx      # 提示系统组件
│   │   ├── MultiAnswerInput.tsx # 多答案输入
│   │   └── SequencePatternGuide.tsx # 序列规律引导
│   ├── layout/
│   │   ├── BottomActionBar.tsx # 底部操作栏
│   │   └── PageContainer.tsx   # 页面容器
│   └── ui/
│       ├── AppButton.tsx       # 通用按钮
│       └── AppCard.tsx         # 通用卡片
├── data/
│   └── questions/              # 题库（按年级分文件，共 342 题）
│       ├── index.ts            # 题库入口
│       ├── g1.ts ~ g6.ts       # G1-G6 各约 25 题
│       └── olympiadIntro.ts    # 奥数启蒙题
├── hooks/
│   └── useGameState.ts         # 全局游戏状态管理
├── lib/
│   ├── types.ts                # TypeScript 类型定义
│   ├── storage.ts              # localStorage 存储逻辑 + 积分 + 等级
│   ├── lessonPlanner.ts        # 每日课程编排 + 选题逻辑
│   ├── lessonTransaction.ts    # 课程状态机（原子事务，已取代 answerSubmission）
│   ├── answerChecker.ts        # 答案校验
│   ├── questionGuards.ts       # 题目筛选守卫
│   ├── questionSafety.ts       # 题目安全检查
│   ├── questionValidation.ts   # 题目校验工具
│   ├── hintSafety.ts           # 提示安全检查（防泄露答案）
│   ├── mistakeReinforce.ts     # 错题强化
│   ├── rewardSystem.ts         # 奖励系统
│   ├── dataExport.ts           # 数据导出备份
│   ├── decorationManager.ts    # 装饰品管理
│   ├── taxonomy.ts             # 题目分类体系
│   ├── storySystem.ts          # 剧情系统
│   ├── migrations.ts           # 数据结构迁移
│   ├── versionUpgrade.ts       # 版本升级逻辑
│   ├── appVersion.ts           # 应用版本号
│   └── validateQuestions.ts    # 题库自检
├── tests/
│   ├── unit/                   # 单元测试（状态机、积分、数据导出）
│   └── e2e/                    # E2E 测试（Playwright）
├── scripts/                    # 构建/验证/迁移脚本（24 个）
├── docs/
│   ├── CURRENT_ISSUES.md       # 已知 Bug 与技术债清单
│   ├── SCORING_RULES.md        # 积分规则文档
│   └── HINT_SYSTEM_RULES.md    # 提示系统规则文档
└── package.json
```

## 如何新增题目

编辑 `data/questions/g<年级>.ts`，按照已有格式添加新题：

```typescript
{
  id: 'g1_26',
  gradeBand: 'G1',
  domain: 'addition_subtraction',
  cognitiveSkills: ['find_numbers', 'choose_operation'],
  text: '完整的题目文本...',
  numbers: [8, 3],
  keywords: [
    { word: '又跑来', type: 'add' },
  ],
  noisePhrases: ['今天天气很好'],
  usefulPhrases: ['草地上有8只小白兔', '又跑来了3只'],
  questionMeaningOptions: ['问总数', '问还剩多少'],
  correctMeaning: '问总数',
  operation: 'addition',
  equation: '8 + 3 = ?',
  answer: 11,
  answerSentence: '一共有11只。',
  explanation: '解释文本...',
  solutionSteps: ['步骤1...', '步骤2...'],
  hints: ['提示1...'],
  difficulty: 1,
  category: 'addition',
  visualKey: 'rabbit',
  requiresAnswer: true,
  stepCompatibility: ['find_numbers', 'find_action_words', 'full_solve'],
},
```

关键规则：
- `visualKey` 必须与题目物品一致（写蜡笔 → visualKey: 'crayon'）
- `stepCompatibility` 标注该题适合哪些关卡类型
- remove_noise 题必须有 `noisePhrases`（至少 1 条）
- simulation 题必须 `operation` 为 addition/subtraction 且有 `visualKey`
- 新增题后运行 `npm run validate:questions` 自检

## 如何修改家长奖励

家长奖励是 localStorage 中的数据，由家长在奖励中心的家长模式中管理：
1. 进入奖励中心 → 家长模式
2. 通过数学题验证
3. 在「管理奖励」中添加/编辑/删除奖励
4. 可设启用/停用状态

## 如何重置测试数据

在奖励中心 → 家长模式 → 重置工具中提供 4 种重置：
- **重置今日任务** — 清空今日进度，可重新开始
- **清空学习进度** — 保留家长设置和奖励，只清空学习数据
- **恢复默认奖励** — 恢复 3 个默认家长奖励
- **完全重置** — 恢复所有数据到初始状态

或手动清除：浏览器 DevTools → Application → Local Storage → 删除 `math-detective-state` 和 `math-detective-today-lesson`

## 常见问题

**Q: 页面崩溃显示 "phases undefined"？**
A: 旧版本 localStorage 数据不兼容。清除 `math-detective-state` 和 `math-detective-today-lesson` 后刷新。

**Q: 所有关卡显示同一道题？**
A: 已修复。每个关卡通过 `selectQuestionForStep()` 独立选题。

**Q: 擦掉废话关卡的题没有废话？**
A: 已修复。remove_noise 关卡绝不回退到无 noisePhrases 的题。

**Q: Hydration warning？**
A: 这是 React 18+ 的已知问题，不影响功能。所有页面已使用 mounted guard 处理。

**Q: Vercel 构建失败？**
A: 确保本地 `npm run build` 通过后再推送。本项目使用 Webpack 构建（`next build --webpack`），非 Turbopack。

**Q: E2E 测试在 Windows 上失败？**
A: `test:e2e` 在 Windows 开发机上可能因服务器启动问题失败。本地建议通过 `npm run test:e2e:playthrough` 等单独命令验证。CI (GitHub Actions) 上的 E2E 可能正常。

## 设计理念

- **不是刷题工具**：核心是训练阅读理解能力，而非单纯计算
- **正向激励**：答对有撒花和鼓励语，答错只有温和提示
- **无惩罚设计**：没有大红叉、没有扣分、没有倒计时压力
- **游戏化学习**：侦探主题、星星奖励、等级系统、徽章收集
- **家长友好**：内置报告页面，了解孩子学习情况

## 适配说明

- 针对平板和手机触摸操作优化
- 大按钮、圆角、间距适合儿童手指
- 支持 iOS Safari 和 Android Chrome
- 底部安全区域适配

## 项目文档

- [已知问题与技术债](docs/CURRENT_ISSUES.md)
- [积分规则](docs/SCORING_RULES.md)
- [提示系统规则](docs/HINT_SYSTEM_RULES.md)
- [产品定义（Obsidian）](F:/obsidian/wiki/raw/AI-projects/math-detective/v2.11/00-PRODUCT_DEFINITION.md)

## 后续接入 Supabase

项目已为接入 Supabase 做好准备：

1. **安装 Supabase 客户端**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **创建 Supabase 客户端** (`lib/supabase.ts`)
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   )
   ```

3. **替换 `lib/storage.ts` 中的 localStorage 调用**
   - 将 `loadState()` 改为从 Supabase 读取
   - 将 `saveState()` 改为写入 Supabase
   - 添加用户认证后，按 `user_id` 存储数据

4. **数据库表结构建议**
   - `profiles` — 用户基本信息和游戏状态
   - `completed_questions` — 已完成题目记录
   - `mistakes` — 错题记录
   - `badges` — 获得的徽章
   - `rewards` — 兑换记录

5. **环境变量** (`.env.local`)
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
