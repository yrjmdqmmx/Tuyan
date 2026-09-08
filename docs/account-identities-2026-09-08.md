# 邮箱、GitHub 与 Google 统一账号

本次保留现有邮箱注册、密码登录、显式邮箱验证、重发验证和找回密码，增加 GitHub / Google 登录及登录方式管理。用户已取消手机号与短信服务，本轮没有短信依赖、配置或调用。基于 main `f565b75` 的独立分支 `codex/account-multi-login-20260908`，不包含另一项近期任务补齐 PR #183 的改动。

## 账号行为

- 邮箱 credential、GitHub 数字用户 ID、Google `sub` 均关联 Better Auth 同一内部 user ID。绑定和解绑不迁移任务、反馈或其他用户数据。
- 首次第三方授权创建账号，再次授权根据 provider + subject 找回同一个账号。没有本地已验证邮箱也能登录。第三方邮箱只作冲突检查，不自动设置本地 `emailVerified`。
- 遇到已存在的邮箱或第三方身份不会合并账号，提示先登录原账号，再到账号设置显式绑定。对于已关联的 provider subject，优先保持原账号身份，不用邮件地址重新匹配。
- 冲突检查双向执行：已验证第三方邮箱以服务端 HMAC 摘要用于检查，未验证的第三方邮箱不占用联系方式；已有第三方账号后再注册同邮箱，返回现有中性注册受理响应，不创建密码或登录态。账号设置也拒绝绑定其他账号使用的已验证第三方邮箱。
- 账号设置分别显示“邮箱已验证/待验证”和第三方“已授权”。尚无邮箱的账号显示昵称及“尚未绑定邮箱”。内部为满足现有 Better Auth 必填 email 及唯一索引使用随机不可投递占位地址，该值不出现在 get-session、Gateway 业务 principal 或站长资料中，也不发送邮件。
- 管理登录方式前，用现有密码或已绑定第三方重新验证。复验绑定当前 user ID、session 和 manage/delete 用途，5 分钟内使用一次；用途不可互换。
- 绑定邮箱需先复验当前账号，再获取 5 分钟有效的 6 位邮件验证码并设置密码。最多 5 次错误尝试；60 秒重发间隔、每邮箱每天 5 次、每 IP 每小时 10 次，均在数据库中计数。验证码以 HMAC 保存，错误尝试不随事务回滚。
- 解绑要显式确认，事务内验证至少留下一种可用登录方式；未验证邮箱、停用的 OAuth 渠道不算可用方式。其他设备的会话失效，当前会话保留。解绑邮箱同时失效旧验证/重置凭据。
- 原重置/修改密码接口在 Gateway 内部转给事务处理器。校验令牌、消费令牌、修改凭据和撤销会话与账号版本写入在同一事务，阻止旧重置令牌恢复已解绑的邮箱密码。重置密码撤销所有会话，修改密码撤销其他会话及短期复验凭证。
- 无密码账号通过已绑定第三方完成 delete 用途复验，再输入“删除账号”才能注销。原邮箱密码注销请求仍兼容。复用现有 Core 生命周期 v3，按内部 ID 清理用户数据，再事务删除 Auth 用户/登录方式/会话/挑战。
- 注销或解绑会记录短期 provider subject 摘要屏障，阻断操作前发起的旧授权；完成注销后，新发起的授权可创建新 ID，旧会话、旧绑定码、旧回调不能登录新账号。

## 服务端与接口

`identity-config.js` 负责配置与返回地址验证，`identity-providers.js` 负责固定供应商端点和协议校验，`identity-store.js` 负责事务、唯一约束、挑战和生命周期，`identity-plugin.js` 接入现有 Better Auth Cookie/session。

| 路径（前缀 `/api/auth/identity/`） | 行为 |
| --- | --- |
| GET `capabilities` | 返回 version=1、github/google 是否启用、emailBinding 是否可用，不返回配置值 |
| GET `methods` | 当前用户的登录方式、各自验证/可用状态、复验到期时间 |
| POST `oauth/start` | `{provider:'github'|'google',intent:'login'|'bind'|'reauth',purpose?:'manage'|'delete'}`；返回供应商授权 URL |
| GET `oauth/callback/:provider` | 一次性验证后仅重定向固定前端地址，`auth_result` 为非敏感结果码 |
| POST `reauth/password` | `{password,purpose}`；创建当前会话的短期操作凭证 |
| POST `unlink` | `{provider:'email'|'github'|'google'}`；消费 manage 凭证并事务检查最后方式 |
| POST `email/request` | `{email}`；消费 manage 凭证，返回 challenge/expiresIn/retryAfterSeconds |
| POST `email/verify` | `{challenge,code,password}`；验证、消费并添加邮箱密码方式 |
| POST `email/reset` | `{token,newPassword}`；旧 `/api/auth/reset-password` 在服务端别名转发至此，客户端无需改路径 |
| POST `email/change-password` | `{currentPassword,newPassword,revokeOtherSessions?}`；旧 `/api/auth/change-password` 兼容转发，始终撤销其他会话 |

原 `/api/account/delete` 新增可选 `{verification:'identity'}`；只有当前会话完成 delete 用途复验才接受。原 `{email,password}` 继续使用原有逻辑。

第三方令牌只在 Gateway 本次代码交换与取身份期间存在于内存，不存 account 表、不写 Cookie、不回传 Web。OAuth state 在数据库单次消费并与 HttpOnly/SameSite=Lax cookie 绑定；PKCE S256，两端回调固定；Google 额外验证 JWT 签名、issuer、audience、nonce、azp、expiry 与签发时间。取消/错误回调不创建会话。数据库写入账号版本使不同会话的并发解绑和注销发生事务冲突后重新校验。

禁用 Better Auth 的直接 link-social/unlink-account/change-email/set-password/delete-user 路由，避免绕过登录方式管理与业务注销。现有邮箱验证 GET/HEAD 仍只进入确认页，不执行验证；邮箱登录的验证门禁不影响第三方登录。

## 配置清单

只在 Gateway 的受保护运行环境配置；不要放入 `VITE_*`、仓库、浏览器 localStorage 或交接文件。默认两个 OAuth 渠道关闭；启用却缺少凭据时启动失败，避免上线一个伪装可用的入口。

| 环境变量 | 配置 |
| --- | --- |
| `AUTH_GITHUB_ENABLED` | 默认 false，GitHub 应用就绪后 true |
| `AUTH_GITHUB_CLIENT_ID` / `AUTH_GITHUB_CLIENT_SECRET` | GitHub OAuth App 凭据 |
| `AUTH_GOOGLE_ENABLED` | 默认 false，Google 应用就绪后 true |
| `AUTH_GOOGLE_CLIENT_ID` / `AUTH_GOOGLE_CLIENT_SECRET` | Google Web application OAuth 客户端凭据 |
| `AUTH_IDENTITY_RETURN_URL` | `https://www.paperbanana.asia/`；必须属于 FRONTEND_ORIGINS，无片段或用户信息 |
| 既有 DirectMail 配置 | 绑定邮箱验证码复用 AUTH_EMAIL_DELIVERY_ENABLED 和 ALIBABA_DIRECTMAIL_*；未启用时邮箱绑定显示暂不可用 |

GitHub：创建 OAuth App，Homepage URL 填 `https://www.paperbanana.asia/`；Authorization callback URL 精确填 `https://api.paperbanana.asia/api/auth/identity/oauth/callback/github`。仅申请 read:user 与 user:email，不申请仓库权限。开发和生产使用不同应用及凭据。参考 [GitHub 官方授权文档](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)。

Google：配置 OAuth consent（图研名称、支持联系信息、主页、隐私政策与授权域名），创建 Web application OAuth client；Authorized redirect URI 精确填 `https://api.paperbanana.asia/api/auth/identity/oauth/callback/google`。范围为 openid/email/profile。Testing 模式先添加测试用户，正式可用性依赖应用发布状态和 Google 当前审核要求。参考 [Google 官方 OpenID Connect 文档](https://developers.google.com/identity/openid-connect/openid-connect)。

配置后需从香港 Gateway 验证它到 GitHub token/user/emails、Google token/JWKS 的 HTTPS 连通性。新功能使用 Gateway 的标准 HTTPS 出站，不能仅以 Core 的新加坡模型出口可用推断这里可用。无需修改供应商模型 Key 或启用付费推理。

## 发布与回滚边界

新 Auth 集合为 authIdentityChallenges、authIdentityRateLimits、authIdentityFences，均有 TTL；account 表增加 github/google provider+subject 唯一索引。现有 Auth DB 账号需有这些集合及 createIndex 权限。没有旧用户 ID 重写、业务数据迁移或一次性回填。若旧库已经有冲突的第三方 account 数据，唯一索引失败应先检查冲突，不自动合并或删除。

先 Gateway 后 Web；新 Web 对旧 Gateway 的能力接口失败会保留邮箱登录和原邮箱密码注销。新增渠道默认关闭。启用之前完成真实授权、回调、绑定/解绑、取消、跨设备注销等验收。代码测试、真实供应商配置、CI、固定镜像发布及生产浏览器验收各自独立。

一旦已存在第三方独占账号，不应直接退回仅邮箱版本，否则这些用户会失去登录入口。优先保持本版本并修复配置；回滚前确保这些用户已有可用邮箱方式或兼容版本，保留用户/身份表，不回滚数据库或批量删除数据。

## 验证记录

本地验证码由内存测试邮件服务捕获；OAuth 由本地 HTTP 授权/令牌/资料服务模拟，Google 使用真实 RSA 签名与 jose 验签、真实 PKCE 校验；Cookie、Better Auth、Mongo 事务和 Core 注销源码实际运行。测试未向 GitHub、Google、邮件供应商或短信供应商发送真实请求。

| 验证 | 结果 |
| --- | --- |
| Auth Gateway 单元/接口回归 | 147 / 147 通过 |
| Web 单元/渲染回归 | 364 / 364 通过；包含旧网关降级及原邮箱注册观察流程 |
| 共享 API / 小程序 | 51 / 51 测试项通过，小程序 `tsc --noEmit` 通过 |
| 新账号真实运行时集成 | 20 组通过：首次/再次授权、绑定/解绑、不同会话并发、反枚举、身份冲突、错误签名声明、取消、防重放、邮件异常/过期、注销/重新注册、密码重置/修改、旧凭据失效、限流 |
| 既有邮箱生命周期集成 | 5 组通过：并发注册/验证、原身份恢复、数据库与对象清理失败、事务/丢失回执恢复、同邮箱重新注册及旧凭据隔离 |
| Chrome 浏览器 | 11 组通过，1440px 桌面及 390px 手机；首次 GitHub/Google、绑定邮箱、错误验证码/倒计时、解绑、取消、冲突、原邮箱注册/显式验证/登录/重置密码、无密码注销后重新注册；零脚本异常，无手机横向溢出 |
| 构建 | Web Vite 构建通过；保留既有主包大于 500 kB 的提示 |

中英文隐私说明同步增加第三方身份资料、临时授权 Cookie、绑定邮件及无密码注销的数据处理说明。

按钮按本次反馈调整为 GitHub 深色实底、Google 浅色描边与彩色图标；账号管理采用一致的边框、圆角、悬停/键盘焦点和禁用样式，手机点击区域至少 44px。截图由最新浏览器验收生成于本机 `/Users/a1-6/.codex/visualizations/2026/09/08/01a08083-6f9d-7102-8629-452bfd992594/account-identities/`，完整场景见 `acceptance.json`。

复现主要检查：

```sh
pnpm --filter @paperbanana/auth-gateway test
bash apps/auth-gateway/tests/integration/run-identities.sh
bash apps/auth-gateway/tests/integration/run-account-lifecycle.sh
pnpm --filter @paperbanana/web test
pnpm --filter @paperbanana/web build
node --test apps/miniprogram/tests/*.test.cjs packages/api/src/*.test.js
pnpm --filter @paperbanana/miniprogram check
# 需要本机 Docker、Chrome 及 Playwright；模块不在默认依赖路径时设置 PLAYWRIGHT_MODULE_PATH。
node apps/web/tests/browser/identities.mjs
```

新增认证集成已加入 CI，使用一次性 Mongo 副本集并在退出时删除测试容器与数据。浏览器脚本阻断外部供应商请求，仅把既有邮箱静态页的验证/重置请求定向到本机测试 Gateway。

仍待真实环境验证：GitHub/Google 应用 ID 和 secret、回调白名单与 consent/测试用户、生产 Gateway 到供应商 HTTPS 出站、真实邮箱送达、真实授权和跨设备操作。本轮没有配置生产、合并或发布；真实供应商验收不由本地测试替代。小程序第三方界面及上传/发布继续暂缓。
