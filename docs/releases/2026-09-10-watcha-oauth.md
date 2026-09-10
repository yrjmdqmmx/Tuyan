# 观猹 OAuth 登录生产发布与真实联调

发布时间：2026-09-10。OAuth 后端与首次 Web 发布版本 `3405f8ccbc2fe72f555831f96853c1fb99dfb747`；功能 [PR #193](https://github.com/yrjmdqmmx/Tuyan/pull/193)，生产出口修正 [PR #194](https://github.com/yrjmdqmmx/Tuyan/pull/194)。此前稳定版本为 `487e3e0`。

## 发布结果

- 最终主分支 CI、Gateway / Core / Benchmark companion 镜像、正常 production 审批、[香港部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34466186148)和 [Pages 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34466422367)均成功。
- 五服务健康，Gateway / Core / companion 的实际镜像 revision 与发布 SHA 一致。维护关闭，无新增重启或 OOM；Bench 执行保持关闭。
- Gateway 启用专用观猹客户端，请求 `read email`；密钥仅进入 root-only 生产环境文件。回调为 `https://api.paperbanana.asia/api/auth/oauth2/callback/watcha`。上游邮箱仍不作为身份绑定依据。
- 发布预检发现旧网关仅允许 DirectMail 出口，观猹请求被拒绝。补齐 `watcha.cn` 公共 IPv4 的 TCP 443，沿用原子双链、失败保留旧规则和五分钟刷新。真实部署 smoke 同时验证邮件与观猹 TLS、通用公网拒绝和 worker 隔离。
- 原 Gateway 其他配置、Core / Bench 除发布 SHA 以外的配置、worker 配置及稳定密钥全部保留。私有备份：`/opt/paperbanana/backups/watcha-oauth-20260910T101717Z`。
- 正式站 HTML、11 个 JS/CSS 和 3 个 Watcha 回调文件，共 15 个文件，与 Pages artifact 逐个哈希一致。

## 真实联调

使用已登录的真实图研账号和官方观猹账号，在正式站执行：

1. 账户页发起绑定 → 官方“图研 Tuyan”授权页 → 同意 → 后端换取 token、读取 userinfo → 回到待确认状态 → 明确绑定原账号，成功。
2. 退出图研后使用观猹登录，返回相同用户 ID、相同已验证邮箱。
3. 发起解绑邮箱验证码，真实邮件于 `2026-09-10T10:36:33Z` 到达匹配的 Gmail；SPF / DKIM 均通过。将收到的验证码用于本站确认，解绑接口返回 200。
4. 再次走官方授权并恢复绑定；最终仍为相同图研用户 ID，已登录且已绑定观猹。原工作台三处输入和 TokenDance 渠道连接保持。
5. 桌面 1440px 与手机 390px 正式登录入口完成截图和视觉检查。独立浏览器不带用户会话，截图不包含真实邮箱、余额或凭据。

观猹身份登录与 TokenDance 模型消费授权独立。未创建支付、未调用付费模型，未执行真实账号注销或以第二个观猹身份创建新用户；这些身份生命周期分支见 [本地验收](../tokendance/watcha-login-validation-20260910.md)。小程序平台发布继续暂缓。

## 证据与回退

详见 [结构化证据](2026-09-10-watcha-oauth-evidence.json)。本次没有触发回退。若需关闭身份入口，可在共享生产锁下将 `WATCHA_OAUTH_ENABLED=false` 并重建网关；完整回退需恢复上述备份的环境配置、镜像锁和对应旧代码，通过正常部署验收后解除维护。

本记录不保存客户端密钥、OAuth code/token、验证码、Cookie、真实邮箱或账号 ID。

## 官方登录标识补齐

按官方接入文档使用原版圆角 SVG，替换观猹身份标题、登录按钮和确认绑定按钮中的通用图标。素材同源托管，原始下载地址与哈希记录在 `apps/web/public/brand/README.md`；沿用项目 base path，不依赖登录时加载外部图床。本次为 Web 品牌素材补发，后端 OAuth 版本与真实联调结果不变；补发 Pages SHA 与验收结果记录在对应 PR 发布评论。
