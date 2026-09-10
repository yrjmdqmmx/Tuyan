# 观猹身份登录：本地验收记录（2026-09-10）

本轮完成 Web / Auth Gateway 接入及独立规范、质量审阅。功能默认关闭，未部署生产，未使用专用客户端进行真实观猹登录，也未发送真实邮件。客户端已签发，私有配置在仓库外（目录 0700，文件 0600），仓库不包含正式 client_id / client_secret。

## 范围与版本

- 基线：`origin/main 8c23a38754f01cf5d43166bfb08cc0f8ab462586`；结束前再次读取远端，未变化。
- Gateway：`0c8c9fd8e819134326978bda6bce16535c7bc259`，并发边界修复 `ac50ecf8b8d2d436fda6dffcd089f8047f2ea2db`。
- Web / 同步文档：与本记录同批提交；原桌面旧分支与已有 5174 服务保留。
- TokenDance 渠道连接、支付和付费生成独立于身份登录。本轮未发起授权 Key 交换、支付或付费模型调用。

## 自动化与审阅

| 检查 | 结果 |
| --- | --- |
| Gateway node:test + 语法检查 | 148 项通过 |
| Watcha 隔离真实 Mongo | 14 组通过；独立质量审阅再次执行通过 |
| 原账号生命周期真实 Mongo | 通过，含新增恢复临时证明清理 |
| Web 全量 node:test | 391 项通过 |
| Web Vite production build | 通过；保留既有大 chunk 提示 |
| diff 空白检查 | 通过 |
| 独立规范复审 / 质量复审 | 均通过，无剩余 P0/P1/P2 |
| 远端 CI | 草稿 PR 单独检查；CI 已纳入 Watcha 隔离 Mongo 回归，最终结果以该提交的检查为准 |
| 正式授权、真实邮件、生产部署 | 未执行，独立门禁 |

规范审阅修复了绑定旧快照跨过注销冻结的竞态：冻结与 Watcha 写事务触碰同一用户文档，确定性交错回归验证重试后拒绝写入。另一会话插入交错覆盖迟到会话补偿、无登录 cookie 及 Better Auth 延后 hook 错误的安全回调收口。

质量审阅修复了授权窗口失去 opener 后 pending 卡忙碌，以及查询失败导致错误/重试入口消失的问题。对应测试覆盖匿名注册、已有账号绑定、首次查询失败、pending 邮箱与验证码保留及成功重试。完整 Web 回归曾暴露原模板集成测试仅等待“请求已发出”就断言模型已渲染的时序问题，已改为等待实际模型文本，最终全量通过。

## 真实浏览器验收

使用真正的 Web、Better Auth、Gateway、一次性 Mongo replica set；仅 Watcha token/userinfo 响应与邮件投递为测试替身。通过浏览器上下文拦截固定官方 authorize 地址，携带原始查询转入仅 loopback 的 fixture。生产 Web 的域名/路径校验未放宽。测试邮箱均为 `.example.test`。

- 桌面 1440×1000：弹窗授权 → 上游无邮箱 → 本地邮箱验证码注册；错误验证码给固定中文提示，可继续输入正确码；登录后原研究输入、选中模型保留。
- 手机 390×844：退出后再次观猹登录同一账号，无需再次补邮箱；原页输入保留；账户页 `scrollWidth == innerWidth == 390`，无横向溢出。
- 修复后的 Gateway 再验首次注册和无密码注销：邮箱验证码目的为注销，必须另输入“删除账号”，成功后真实会话清除、Web 退出。
- 已有密码账号：先建立并验证测试账号，再从观猹待完成页面选择登录已有账号；账户页必须点击明确绑定按钮。绑定前后从真实 session 读取的 user.id 相等。
- 邮箱验证码解绑：确认后 linked=false、hasPassword=true，保留原账号密码登录方法。
- 另由组件回归覆盖弹窗被阻止时无 start 请求、不导航；伪造 postMessage 不改变会话；窗口关联丢失、网络重试、禁用入口和最后登录方式保护。

截图保存在本次任务的本地验收附件目录，包含桌面待注册/明确绑定、手机登录/已绑定/注销。浏览器过程中的预期 400 为错误验证码，503 为 fixture 未启用 TokenDance 消费后端；不是观猹成功流程失败。开发热更新改变 hook 数量时曾产生 Vite 状态错误，完整重新加载后复验正常，最终构建及全量测试通过。

## 后续正式联调

固定回调：`https://api.paperbanana.asia/api/auth/oauth2/callback/watcha`。启用需要 `WATCHA_OAUTH_ENABLED=true`、私有 `WATCHA_CLIENT_ID` / `WATCHA_CLIENT_SECRET` 和可用 DirectMail；scope 默认为 `read email`。

发布前需复核远端 CI、目标部署版本、配置备份与回滚方式。发布后单独验证获批 Domain 接受完整回调、实际授予 scope、真实新/旧用户授权和邮件送达。用户信息未返回邮箱时沿用本地验证，不把上游邮箱视为已验证。小程序平台发布仍暂缓。

本地重跑及 fixture 命令见 [Gateway README](../../apps/auth-gateway/README.md)。fixture 仅用于空白隔离库和测试邮件，禁止替换为生产数据库或真实凭据。
