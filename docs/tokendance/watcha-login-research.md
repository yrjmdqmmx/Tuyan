# 观猹身份登录核对（2026-09-09）

结论：观猹已公开宣布 OAuth2.0 统一登录服务开放，但本次没有拿到图研身份登录应用的申请结果、客户端凭据及完整接口规范。没有新增登录按钮或身份提供商配置；保留图研现有邮箱登录。

## 已读范围与访问缺口

- [观猹官方 OAuth 合集](https://watcha.cn/collections/watcha-oauth)：完整读取可见内容，确认面向 AI 产品和工具类产品开放统一登录服务。此页面为服务介绍，不是授权端点和字段规范。
- 合集链接的微信公众号公告 `https://mp.weixin.qq.com/s/KPCgpGplDq_b2j50l9dEuA`：浏览器站点安全策略阻止访问，正文未读；未用其他浏览器、网络工具或替代入口绕过限制。需要官方提供可访问的技术文档或接入资料。
- [他山世界登录页](https://world.tashan.chat/login)：确认“使用观猹登录”入口。读取该站公开前端资源后可观察到 `/api/auth/watcha/start`、`/api/auth/watcha/callback` 和 `/auth/watcha/callback`。前端提交 `redirect_uri / next_path / claim_token`，接收 `authorization_url`，回调处理 `code / state`。这些是他山世界自身的后端契约，不能作为图研调用观猹接口的规范。
- [观猹官网](https://watcha.cn/) 的公开前端资源显示 OAuth 授权路由和 `client_id` 使用迹象，未获得 token/userinfo 接口规范；[docs.watcha.cn](https://docs.watcha.cn/) 可访问入口没有提供足以实施的 OAuth 协议。
- TokenDance 现有官方索引与 API Key OAuth 接入资料（见本目录 integration-audit.md / read-manifest.json）针对模型消费授权，不等于身份登录资格。本轮未将产品方渠道配置或管理凭据复用为身份提供商凭据。

## 具体待确认项

1. 图研是否已获批“观猹统一登录”应用，以及正式、测试环境 client ID 和 secret 的安全配置位置。只需提供资料链接或本地私有配置路径，不应在聊天、报告或仓库粘贴密钥。
2. 官方 authorize/token/userinfo（或 OIDC discovery / JWKS）端点、client authentication 方式、授权范围、S256 PKCE 支持要求、state 有效期及一次性交换规则。
3. 准确的回调登记规则：是否允许本机预览、多环境及多个回调；实际回调 URL 应结合图研 Gateway 的正式域名登记，不能从其他产品路径推断。
4. 不可变用户标识及发行方、字段类型、昵称/头像、邮箱/手机是否可选及验证状态、令牌过期和撤销机制。
5. 用户取消授权、账号封禁、邮箱变更、应用解绑和身份注销如何通知或查询。

## 图研接入边界

现有图研身份由 Auth Gateway / Better Auth 维护不可变账号 ID，TokenDance Key 由 Core 单独加密保存并绑定该 ID。未来身份登录应由 Gateway 完成 code 交换和可信身份读取，采用 `(provider, immutable subject)` 唯一映射；不能按前端传入身份或相同邮箱自动合并账号。

邮箱登录继续保留。已登录用户绑定观猹身份前需重新确认图研身份并完成观猹授权；已有绑定指向另一图研账号时提示冲突，不迁移任务或额度。解除绑定前确认账号仍有可用登录方式。新建账号、显式绑定、冲突和解绑分别覆盖服务端测试，再开放按钮。

以上为待官方契约确认后的设计方向，并非已实现的观猹身份登录。TokenDance 的 `app_url` 与 `X-App-URL` 仍固定为 `https://www.paperbanana.asia/`，不因身份登录研究而改变。
