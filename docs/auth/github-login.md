# GitHub 注册登录与绑定（本地接入，未上线）

2026-10-31；发布工作树 `codex/session-ui-release-20261021`。只修改认证及入口，不迁移、清空或重新归属任务/草稿/模型配置。已有 SMS/微信未发布工作及并行 Plus 工作保留。微信按用户要求暂不启用。

## 当前实现

- 手机号服务可用时仍是默认方式；邮箱密码、观猹保留，GitHub 为辅助入口。未配置 GitHub 时不显示空按钮。
- 授权后的未知 GitHub 身份必须选择“创建新账号”；有原账号的用户选择“使用原账号登录”，再到账户设置绑定 GitHub。
- 绑定只添加 `account` 中的 GitHub 映射，原 user ID、密码和业务数据不变。映射以 GitHub 稳定数字 ID 为准；改 GitHub 昵称、登录名、邮箱不影响回访。邮箱相同也不自动合并，手机号或观猹身份不会被覆盖。
- 仅请求 OAuth `read:user`；不请求 `repo`、组织管理或 `user:email`。只使用 ID 和显示名称；GitHub 私有/未验证邮箱不影响身份登录，也不会用来建立邮箱登录凭据。新账号的唯一内部 `@github.tuyan.invalid` 标识不展示、不发邮件、不能在邮箱注册页使用。
- 新 GitHub 账号可继续绑定手机号；本期没有新增从第三方专属账号“添加邮箱密码”的流程，已有邮箱账号的登录/找回/换邮箱保留。GitHub 专属账号注销需要重新授权并输入删除确认，不引入无需验证的注销路径。
- 用户名、头像、邮箱不会覆盖原账号资料；访问/刷新令牌只用于本次服务端身份查询，不持久保存，不返回浏览器。

## 为什么使用专用身份插件

项目继续使用 Better Auth 会话、Cookie、Mongo 适配及限流。没有直接开启默认 social provider 自动注册流程，而是沿用项目的显式注册、原账号绑定和跨站会话桥接保护；所以回调路径是下述自定义路径，不是文档默认 `/api/auth/callback/github`。

- `POST /api/auth/github/start`：`intent: login|link|delete`，`returnOrigin` 必须匹配请求来源及允许列表。绑定/注销必须现有会话和一致的 `X-Workspace-Account`。
- `GET /api/auth/github/launch?ticket=...`：60 秒单次票据，在主回调域设置 HttpOnly Cookie 后前往固定 GitHub 授权地址；state 和 S256 PKCE 验证器均由服务端生成。
- `GET /api/auth/oauth2/callback/github`：校验域名、state、浏览器 Cookie、有效期及用户生命周期；服务端固定 HTTPS 端点换取令牌并读取 `/user`。超时 10 秒/请求，响应最大 64 KiB，禁止重定向，无自动重试。
- `GET /api/auth/github/status`：仅原浏览器可读取待完成身份。
- `POST /api/auth/github/complete`：原站原浏览器兑换；新注册须 `createAccount:true`。Mongo 事务/唯一索引阻止重复建号或覆盖绑定；回调窗口本身不获得图研会话。
- `POST /api/auth/github/cancel`：只清除当前浏览器的临时授权，不删除任务或账号。
- 授权最长 10 分钟，注销证明 5 分钟且绑定当前会话/账号生命周期、单次消费。生产 Cookie 为 Secure/HttpOnly/Lax 的 `__Host-` Cookie。临时集合有 TTL，并在每次操作时显式检查过期；不能仅依赖 TTL 清理。
- 已有网关数据库限流、维护模式和删除/恢复代际保护继续生效。日志脱敏覆盖 code、state、PKCE verifier、client secret 及令牌。

## 生产启用前需要的配置（本轮未执行）

需创建**图研专用 GitHub OAuth App**，不要使用其他项目或 GitHub 连接器的密钥。应用可归属项目组织或项目维护者账号。参考填写：

| 字段 | 建议值 |
| --- | --- |
| Application name | 图研 Tuyan |
| Homepage URL | `https://tuyansci.cn` |
| Description | 图研科研绘图工作台账号登录与绑定 |
| Authorization callback URL | `https://tuyansci.cn/api/auth/oauth2/callback/github` |

服务端环境变量：

```dotenv
GITHUB_OAUTH_ENABLED=false
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

`AUTH_BASE_URL` 的 origin 决定主回调地址；两个站点应使用同一主回调和同一应用/认证数据库，且双方域名均在 `FRONTEND_ORIGINS`。另一已批准站点的原站 Cookie 经单次桥接兑换，不要求主域 Cookie 跨站共享。正式启用前必须验证实际部署网关的 origin 转发、Cookie 和两个站点；本轮不修改现网配置。现有 Compose 使用服务端 env_file，密钥只写服务器受限环境文件，不写前端或 Git。

测试应用与正式应用建议分开，开发用固定 loopback 回调匹配本地 `AUTH_BASE_URL`。不关闭 GitHub 令牌过期策略：本服务读取身份后丢弃令牌，不依赖长期令牌或刷新续期。不得用 PAT 代替 OAuth Client Secret。

已按用户授权创建独立的 [图研 Tuyan 本地测试 OAuth App](https://github.com/settings/applications/3980116)，归属 `yrjmdqmmx`，唯一回调 `http://127.0.0.1:4315/api/auth/oauth2/callback/github`。通配符及 Device Flow 关闭，保留令牌过期设置。专用密钥只保存在 `/Users/a1-6/.codex/private/tuyan-github/credentials.local.env`（目录 700、文件 600）；开关默认仍 false，仅隔离测试进程显式启用。用户截图曾包含第一把密钥，经用户另行确认后已撤销，页面核实仅保留安全落盘的新密钥；不在仓库记录密钥内容。

在 loopback 独立临时 Mongo 中，真实 GitHub 授权回调、新用户确认注册、刷新保留会话、退出后再次 GitHub 登录均通过。回访账号 ID 相同，仅 1 个用户、1 个 GitHub 映射；4 次真实身份接口调用，未持久保存访问/刷新令牌。测试网关、Web 与专属容器已结束；从未连接生产任务数据。绑定、冲突、任务/草稿/配置保留由前述模拟数据库回归覆盖，未绑定或修改线上原账号。生产 OAuth App、服务器配置、两站真实验收仍待后续上线授权。

## 本地验证

- 网关单元/路由/生命周期回归：`pnpm --dir apps/auth-gateway test`；214 通过，1 项既有环境依赖用例跳过（最终复跑一致）。
- GitHub 独立 Mongo 副本集 + 模拟 GitHub：`bash apps/auth-gateway/tests/integration/run-github.sh`；5 组通过，覆盖单次 launch/state、PKCE、错误浏览器、明确注册、并发兑换、原账号 ID/任务/草稿/配置保留、同邮箱不合并、改名、冲突、过期、撤销会话、受限邮箱和注销证明。
- 短信集成 10 组通过；观猹网页与原生 21 组、微信模拟 5 组回归全部通过；测试使用专属临时容器与合成数据，结束仅清理自身测试容器/数据库。
- Web 相关回归覆盖手机号默认、邮箱和观猹保留、注册确认、绑定、弹窗受阻、来源校验、刷新恢复、账号切换、注销凭据以及既有账户/工作区存储。最终 56 项通过；生产构建通过。
- Chrome 本地界面验收：`http://127.0.0.1:4184/github-qa`，默认桌面视口与 390×844；手机号/邮箱切换、GitHub 新注册确认与返回原账号、账户绑定状态通过，未见溢出、框架错误或控制台错误。UI 使用模拟控制器，OAuth HTTP/事务由独立集成测试覆盖，该轮只验布局和交互；随后真实 GitHub 本地验收单独记录如上，仍不能视为两站生产验收。
- 构建保留项目既有大 chunk 警告；无新增依赖。并行 Plus 面板在原生 Node 测试下读取未定义 `import.meta.env` 导致存储页回归失败，已只补可选访问 `?.`，不修改该功能行为。
- 截图保存在 `/Users/a1-6/.codex/visualizations/2026/10/31/tuyan-github-login/`，测试日志 `/tmp/tuyan-github-*.log`。未调用真实模型或收费短信；真实 GitHub 身份接口仅在上述本地验收使用。未连生产数据库、提交/推送或部署。

## 官方协议依据

- [GitHub OAuth 网页授权、state 与 PKCE](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub OAuth 权限范围](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [注册 OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Better Auth GitHub 接入](https://better-auth.com/docs/authentication/github)（其默认路径及邮箱依赖不等同于本项目的专用插件；令牌过期行为以 GitHub 官方最新文档为准。）
