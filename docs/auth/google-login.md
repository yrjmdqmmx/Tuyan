# Google 注册登录与账号绑定（本地接入，未上线）

2026-10-31。使用发布工作树 `codex/session-ui-release-20261021`；保留 SMS、GitHub、暂时关闭的微信以及并行 Plus/Core 改动。没有修改任何已有任务、草稿、模型配置或生产数据，没有提交/推送/部署，没有调用图研真实模型或收费短信。

## 账号行为

- 手机验证码在服务可用时仍默认；邮箱密码保留；观猹、GitHub、Google 三个入口上下等宽排列，使用官方 Logo。Google 标志与 Google Sans 字体文字子集自托管，后者附 SIL OFL 许可证，不产生登录前的第三方图片/字体请求。未启用的提供商隐藏入口。
- 未知 Google 身份先显示明确的新账号确认，以及“使用原账号登录”；原有用户先登录，再到账户设置绑定 Google。只添加 `account.providerId=google` 映射，原账号 ID、原有登录方式和业务数据保持不变；已绑定其他账号时拒绝，不自动合并或覆盖。
- 唯一身份键是 Google `sub`，不使用邮箱或昵称作为关联依据。仅请求 `openid profile`，只使用稳定标识及显示名称；不申请 Gmail、通讯录、日历、网盘或邮箱权限，不要求离线访问，不持久保存任何 Google 身份/访问/刷新令牌及头像，也不覆盖已有账号资料。
- Google 新账号使用隐藏的内部 `@google.tuyan.invalid` 标识和只读 `googleOnly` 字段；内部标识不得用于邮箱注册、不投递验证/找回邮件。Google 专属账号可以绑定手机号；没有额外实现添加邮箱密码的流程，已有邮箱账号功能保留。
- Google 专属账号注销仍须重新验证已绑定的 Google 身份，再输入删除确认；证明 5 分钟、单次使用且绑定当前会话和账号生命周期。

## 服务端协议及保护

沿用 Better Auth 会话、Mongo 适配和数据库限流，使用专用 OAuth 插件匹配现有显式注册和跨站回调桥接；**回调不是 Better Auth 默认 `/api/auth/callback/google`**。

| 路由 | 行为 |
| --- | --- |
| `POST /api/auth/google/start` | `intent: login|link|delete`；来源允许列表与 `returnOrigin` 一致；绑定/注销要求当前会话和 `X-Workspace-Account`。 |
| `GET /api/auth/google/launch` | 60 秒一次性票据；固定 Google 授权端点；服务端 state、S256 PKCE 和独立 OIDC nonce。 |
| `GET /api/auth/oauth2/callback/google` | 回调域、一次性 state、弹窗浏览器 Cookie、有效期和账号生命周期检查；固定 token 端点交换授权码；`jose` 验证 RS256 签名、固定 Google JWKS、issuer、audience、azp、sub、nonce、iat/exp。 |
| `GET /api/auth/google/status` | 仅原浏览器读取可用性、本人绑定和本人待完成授权；不返回身份令牌。 |
| `POST /api/auth/google/complete` | 原站原浏览器兑换；新建必须 `createAccount:true`；Mongo 事务与唯一索引避免重复注册和覆盖绑定。 |
| `POST /api/auth/google/cancel` | 清除本人临时授权，保留全部账号业务数据。 |

授权记录最长 10 分钟；TTL 加每次显式检查，不能依赖异步 TTL 删除作为校验。生产 Cookie 为 Secure/HttpOnly/Lax `__Host-`；原回调弹窗不直接获得另一站点的图研会话。账号删除及恢复的代际保护、原会话撤销、维护模式、数据库限流继续生效。

每次外部请求限时 10 秒、响应上限 64 KiB，ID token 上限 16 KiB；禁止重定向、禁止失败自动重试。公钥缓存 10 分钟、刷新冷却 30 秒，仅允许固定官方 JWKS URL。日志脱敏覆盖 id_token、nonce、code、state、PKCE、client secret 和令牌。直接依赖 `jose@6.2.3`，与现有锁文件的 Better Auth 间接版本一致，没有额外新增版本。

## 当前 Google Cloud 本地测试配置

在现有 `My First Project`（`project-c6772c0d-8573-449b-9a6`）中配置 Google Auth Platform。尝试准备独立测试项目时，界面要求必须关联结算账号；未选择结算账号、未创建该项目，已退出。

用户已明确批准接受政策、创建 Web OAuth 客户端和本地保存密钥。以下配置已在控制台保存：

| 项目 | 本地测试设置 |
| --- | --- |
| 应用名称 | 图研 Tuyan 本地测试 |
| 受众 | 外部，测试模式；不发布生产 |
| 支持/通知邮箱 | 当前已登录 Google 账号邮箱 |
| OAuth 客户端 | Web 应用，图研 Tuyan 本地测试 |
| 唯一本地回调 | `http://127.0.0.1:4316/api/auth/oauth2/callback/google` |
| 必要身份范围 | `openid profile` |
| 凭据落盘位置 | `/Users/a1-6/.codex/private/tuyan-google/credentials.local.env`，目录 700、文件 600，已创建并验证权限 |

已按用户授权接受《Google API 服务：用户数据政策》，创建专用 Web 客户端，保存密钥后立即关闭一次性展示，没有输出或截图密钥。仅当前 Google 账号被添加为测试用户；控制台数据访问仅声明 `openid` 和 `https://www.googleapis.com/auth/userinfo.profile`，没有邮箱、敏感或受限范围。

已用真实 Google 账号在两个相互独立、仅监听回环地址的临时 Mongo 数据库中验收；Google 的授权码交换及公钥验证是真实请求，图研账号、任务、草稿、配置和邮件均为本地测试数据，不访问生产。新账号注册、退出后再次登录、已有账号绑定、绑定后用 Google 回访登录均已通过。新用户两次登录同一 ID；已有账号绑定与回访始终保持原 ID，且任务/草稿/配置摘要全部一致；两个独立测试库各只有一条 Google 映射。实测 4 次授权码交换、2 次 JWKS 读取，网络失败 0；不保存令牌。

服务端环境变量（默认关闭）：

```dotenv
GOOGLE_OAUTH_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

密钥不放前端、不进 Git/日志/截图/聊天。正式上线另需生产专用客户端、正确 HTTPS 回调、品牌/域名及隐私政策准备，并验证实际网关至 `oauth2.googleapis.com`、`www.googleapis.com` 的网络路径（沿用受限出站策略时需单独配置）；本轮不修改服务器或放宽网络限制。用户浏览器必须能访问 Google 授权网站，手机号入口继续作为默认。

`AUTH_BASE_URL` 的 origin 决定主回调域；两个站点仍通过同一认证数据库和一次性桥接兑换原站会话，双方必须列入 `FRONTEND_ORIGINS`。正式启用与双站真实浏览器验收需另行授权，不可把本地模拟测试当作线上可用证明。

## 已完成的验证

- 网关单元/路由/生命周期：`pnpm --dir apps/auth-gateway test`，246 通过，1 项既有环境用例跳过。
- Google 独立临时 Mongo + 本地 RSA 签名模拟 Google：`bash apps/auth-gateway/tests/integration/run-google.sh`，5 组通过。覆盖一次性票据、PKCE、nonce、异浏览器、显式注册、并发兑换、改名回访同 ID、绑定保留任务/草稿/配置、同邮箱不合并、冲突、过期、撤销会话及注销证明。
- JWT 测试覆盖错误签名、签名算法、issuer、audience、azp、nonce、过期/未来签发、缺失声明、无效 sub、响应过大、提供商报错、无自动重试和日志脱敏。
- GitHub 模拟事务 5 组、手机号模拟事务 10 组通过。手机号旧测试依赖当前分钟，可能跨越服务端固定小时窗口而偶发失败；仅将测试钟对齐同一未来窗口，不修改产品限流逻辑、不发送短信。
- Web Google/GitHub/手机号/微信/观猹/账号生命周期/资料/存储/双域相关回归 70 项通过；微信旧测试的观猹标签断言更新为现有“观猹登录”，不改变界面或启用微信。
- Web 生产构建通过，保留既有大 chunk 警告。
- Chrome 真实 Google 授权：在独立本地库完成注册、回访、原账号绑定及绑定后登录，原账号与数据摘要保持一致。证据 `real-registration.png`、`real-binding.png`、`real-bound-login.png` 和 `real-oauth-result.json` 位于下述截图目录。
- 临时回环代理允许名单仅在测试 fixture 中增加显式指定的回环回调地址，保留 Host 校验；修改后 Google 模拟集成 5 组复验通过。
- Chrome 真实组件、模拟请求界面验证：默认桌面、390×844 手机；手机号默认、邮箱切换、三方入口、Google 新注册确认/返回原账号和绑定反馈通过；无控制台错误或页面溢出。截图 `/Users/a1-6/.codex/visualizations/2026/10/31/tuyan-google-login/`，测试日志 `/tmp/tuyan-google-*.log`。

临时验收页面、4184/4316 本地服务及专属 Mongo 容器已经关闭和清理；仅保留代码、验收证据与获准保存的本机私有凭据。Google Cloud 本地测试客户端保留，生产开关仍关闭。

## 官方依据

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [当前 Google OIDC 端点、公钥和算法元数据](https://accounts.google.com/.well-known/openid-configuration)
- [Web 服务端 OAuth 配置](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google 登录品牌规范](https://developers.google.com/identity/branding-guidelines)
- [Google API 服务：用户数据政策](https://developers.google.com/terms/api-services-user-data-policy?hl=zh_CN)
