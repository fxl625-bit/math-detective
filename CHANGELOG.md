# 文字侦探 — 更新日志

## v2.6.1 - P0 修复：版本确认、缓存刷新与多余信息关卡防御 (2026-06-03)

- 增加 APP_VERSION / BUILD_TIME / COMMIT_SHA（lib/appVersion.ts）
- 启动时 console.info 输出版本信息
- localStorage 记录上一次运行版本（math-detective-app-version）
- 版本变化后自动 migration 和修复 todayLesson（lib/versionUpgrade.ts）
- 增加清理 Cache Storage / Service Worker 更新能力
- 家长设置新增「版本与缓存」区域，显示版本号、构建时间、commit、数据版本、今日任务状态
- 家长设置新增按钮：刷新到最新版本、清除页面缓存并刷新、重建今日任务
- 修复旧 localStorage 中 identify_extra_info 无效 step 残留
- SpotExtraInfoPhased 运行时检测 expectedIrrelevantItems，非法题目自动跳过不卡住
- lessonPlanner 再次强制校验 hasExtraInfo / noisePhrases / irrelevantNumbers
- 新增 lib/questionGuards.ts：getExpectedIrrelevantItems / isValidForExtraInfoStep / isValidForRemoveNoiseStep
- 部署后输出版本号、commit、Production URL

## v2.6 - P0/P1 全修复 (2026-06-02)
详见 VERSION.md

## v1.0 已完成功能

### 核心玩法
- 数学读题训练核心玩法（找数字、找关键词、擦废话、理解题意、列式答题）
- 每日任务自动编排（5 关循序渐进）
- 关卡类型：找数字 → 找动作词 → 情景动画 → 擦掉废话 → 完整破案
- 每题找到线索后继续列式和填答案（找线索不是终点）
- 题目物品与图标绑定（visual 系统）
- 答题反馈（答句 + 撒花 + 鼓励语）

### 题库
- 6 个年级（G1-G6）+ 奥数启蒙
- 180 道题（每级 25 题，含 30 道专用 remove_noise 题）
- stepCompatibility 字段标注，支持按关卡类型选题
- 题库自检脚本

### 学习系统
- 星星奖励 + 侦探等级（1-10 级）
- 徽章系统
- 连续打卡（streak）
- 错题记录 + 家长报告
- 每周学习卡片

### 奖励中心
- 虚拟奖励（徽章、宝箱、streak 里程碑）
- 家长自定义奖励（CRUD）
- 孩子兑换 + 家长确认流程
- 兑换记录管理

### 家长模式
- 数学题验证进入（随机生成，防止孩子破解）
- 验证失败记录
- 连续失败 3 次锁定
- 重置工具（重置今日任务 / 清空进度 / 完全重置 / 恢复默认奖励）
- 年级选择、奥数开关、每日目标设置

### 体验优化
- 明日挑战预告（完成页 + 首页）
- localStorage 数据迁移（version 3）
- 旧数据兼容
- hydration warning 处理
- hooks 顺序错误修复

### DevOps
- GitHub 归档
- Vercel 部署准备
