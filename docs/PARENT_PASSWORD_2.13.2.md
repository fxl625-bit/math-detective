# 家长固定密码（v2.13.2）

2026-10-07：将家长模式的加法题门槛替换为固定密码。

## 使用

1. 首次更新后，由家长亲自打开「奖励 → 家长」，设置并确认 6–64 个字符的密码。可以使用数字；没有默认密码。也可从受保护的学习设置入口设置。
2. 之后使用同一个密码进入。请先完成设置再交给孩子使用。
3. 「家长 → 修改家长密码」需要当前密码及两次新密码。修改后重新验证。
4. 连续输错 5 次锁定 60 秒，刷新仍然锁定；锁定结束后若再输错会再次锁定，验证正确后清除失败次数。
5. 退出家长区、离开或隐藏页面、5 分钟会话到期时重新锁定。过期时已打开的奖励编辑窗口会关闭。

家长记分、奖励管理及兑现、学习设置保存和备份恢复均受密码保护。孩子仍可练习、查看报告、申请奖励和试穿装扮。

## 数据与设备

密码以随机盐和 PBKDF2 摘要单独保存在当前浏览器，不明文保存，不放进学习备份；普通学习重置和导入不会改掉密码。每台设备和每个浏览器分别设置，不自动同步。密码无法读取或存储损坏时拒绝解锁，不回退到算题。

这是本地家长控制，不是云端账号验证；直接修改浏览器数据的人仍可能绕过。忘记密码时请联系维护者处理，不要为了重置密码清空全部浏览器数据，以免丢失学习记录。

本次修复的测试命令：

```powershell
node node_modules/tsx/dist/cli.mjs tests/unit/parent-password.test.ts
$env:NEXT_BUILD_DIR='.next-parent-password'
npm run build
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3214
# 另一个终端中设置本地测试地址后执行：
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3214'
node node_modules/@playwright/test/cli.js test -c playwright.parent-password.config.ts parent-password.spec.ts rewards-points-upgrade.spec.ts source-identity.spec.ts --workers=1
```

测试使用独立合成数据，不对正式站点设置密码或改动孩子的积分、学习记录。
