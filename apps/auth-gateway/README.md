# PaperBanana Auth Gateway

The public Node 24 gateway for Better Auth and the stable `/paperbanana-api`
contract. It talks exclusively to the internal Node core on the Hong Kong Compose network.

## Trust boundaries

- `PAPERBANANA_API_URL` is mandatory and targets the internal Node Core. There is no alternate backend or runtime fallback.
- `PAPERBANANA_GATEWAY_TOKEN` is required. Node receives it only in
  `x-paperbanana-gateway-token`; caller-supplied gateway/admin tokens are
  removed. Admin calls additionally require the dedicated `PAPERBANANA_ADMIN_TRANSPORT_TOKEN` and an authenticated immutable admin ID.
- The container accepts one trusted proxy hop. Production Compose must publish
  it as `127.0.0.1:13005:3005`, and Nginx must overwrite (not append) the incoming
  forwarding headers. The gateway derives `req.ip` and sends only
  `x-paperbanana-client-ip` to the core. The core removes all raw forwarding
  and internal-auth headers before invoking the Core business handler.
- Every JSON/auth request, including chunked `/api/auth/*` bodies, has a measured
  1 MiB ceiling. Oversized bodies return
  `413 {"code":413,"error":"Request body too large"}`.
- Admin actions require a logged-in Better Auth user id listed in
  `ADMIN_USER_IDS`. Email addresses, request body `adminToken`, and
  `X-Admin-Token` are never authorization inputs. The gateway has no business-handler admin token; Core owns its internal `ADMIN_TOKEN`.

## Identity and ownership

Logged-in writes use the Better Auth account id/email. Anonymous
`createJob`, `refineImage`, `prepareReferenceUpload`,
`finalizeReferenceUpload`, and `abortReferenceUpload` calls use a signed
30-day guest identity stored in a host-only HttpOnly cookie. Production uses
`__Host-paperbanana_guest` with `Secure; Path=/; SameSite=Lax` and no Domain.
The Mongo owner is an irreversible `guest:<sha256>` value; the random cookie
secret is never written to Mongo or forwarded publicly. A previous signing key
can verify and rotate cookies without changing the owner.

`getJob` fails closed unless its stored owner matches the current account id,
historical account email, valid guest owner, or an authenticated immutable
admin user id.
Guest identity never grants `myJobs`, account deletion, or admin/list access.

Before `refineImage`, result object keys are mapped to their first path segment
(the source job id), fetched through `getJob`, and ownership checked. A source
URL is accepted only when it is a V4-signed virtual-hosted URL for
the configured private OSS bucket; it is then converted back to the owned
object key. Arbitrary URLs are rejected; there is no switch to bypass ownership.

## Maintenance and health

Maintenance mode is evaluated on every request from either
`PAPERBANANA_MAINTENANCE_MODE` or the marker file. It returns 503 plus
`Retry-After` for exactly:

- `createJob`
- `refineImage`
- `prepareReferenceUpload`
- `finalizeReferenceUpload`
- `abortReferenceUpload`
- `submitFeedback`
- `importReferences`
- `evaluateJob`
- `initDatabase`
- `POST /api/account/delete`

Authentication, `/health`, `/ready`, `getJob`, `myJobs`, `modelRegistry`,
`modelCapability`, `referenceLibrary`, `adminJobs`, `adminFeedback`, `adminUsers`, and
`pingPlotWorker` remain available. `/health` is cached liveness and never waits
for dependencies. `/ready` probes MongoDB and the selected backend and returns
503 unless both are ready. It probes the core's authenticated
`GET /ready` and requires both HTTP success and `ready:true`. Ordinary business responses never change this
probe-derived readiness cache. Health responses keep top-level
`runtime:"gateway"` and `auth:"better-auth"`; dependency detail lives under
`backend` and `dependencies`.

Account deletion verifies the current session password without signing in or
creating another session. Before any destructive backend action, the gateway
calls the read-only `accountDeletionCapability` action and requires
`deletionContractVersion:2`; Core versions that cannot prove this contract
leave both business data and Auth untouched. Concurrent deletion requests for
one account share a single in-flight cleanup. Only after an HTTP 2xx cleanup
response with semantic `{code:0,ok:true,deletionContractVersion:2}` does it atomically remove the
session/account/user rows in one Mongo transaction. Cookie clearing happens
after commit and is best-effort. Business failures, HTTP/timeout failures, and
transaction failures leave auth rows intact. This requires the deployment's
MongoDB to run as the documented single-member replica set.

Unexpected internal errors always return a generic 500 envelope; redacted
detail is retained only in server logs. Typed backend 502/504 envelopes remain
public so clients can distinguish unavailable and timed-out dependencies.

## Development

```bash
pnpm install
cp apps/auth-gateway/.env.example apps/auth-gateway/.env
pnpm --filter @paperbanana/auth-gateway test
pnpm --filter @paperbanana/auth-gateway check
pnpm --filter @paperbanana/auth-gateway dev
```

Build the non-root Node 24 image from the repository root:

```bash
docker build -f apps/auth-gateway/Dockerfile -t paperbanana-auth-gateway .
```

Never commit real MongoDB, Better Auth, gateway, guest-cookie, admin, or model
provider secrets.

### 观猹身份登录（默认关闭）

`WATCHA_OAUTH_ENABLED=true` 需要专属 `WATCHA_CLIENT_ID` / `WATCHA_CLIENT_SECRET`、`AUTH_EMAIL_DELIVERY_ENABLED=true` 及完整 DirectMail 配置。`WATCHA_OAUTH_SCOPES` 默认 `read email`，仅允许 `read` 和可选 `email`；令牌实际授权必须含 `read`。授权、token、userinfo 地址固定为 `watcha.cn`，回调固定为 `AUTH_BASE_URL` origin 下的 `/api/auth/oauth2/callback/watcha`。返回地址只接受发起请求的可信 Web origin，固定回到 `/account/watcha-callback.html`。

相对 `/api/auth` 的接口：`GET /watcha/status`；`POST /watcha/start`（intent、returnOrigin）；`POST /watcha/email-code`（purpose=signup/unlink/delete，signup 提供 email）；`POST /watcha/complete`（email、code）；`POST /watcha/link`；`POST /watcha/unlink`（code）；`POST /watcha/delete-confirmation`（code）。既有 `/api/account/delete` 接受 email + password 或 email + confirmationToken。验证码5分钟、至多5次尝试；授权与待注册身份10分钟，均有 TTL 索引并在请求时检查过期。发送通过原有邮件地址/IP limiter，验证码只存 HMAC。token 与用户信息仅在内存完成交换，不保存身份 OAuth 长期令牌。

已有观猹绑定登录原图研 ID；首次登录必须明确绑定已登录且本地邮箱已验证的原账号，或用邮件验证码创建无密码新账号。上游邮箱不用于合并。已有邮箱返回 `WATCHA_EXISTING_ACCOUNT` 并保留待绑定身份。解绑前必须另有密码 credential，密码可通过既有找回密码流程设置。Better Auth 的通用 `/unlink-account` 被禁用，观猹解绑只能走上述确认接口；隐式账号关联也禁用。账号删除事务清理绑定、会话及该用户的 Watcha 临时记录。旧待绑定请求在账号生命周期改变后失效。注销冻结与 Watcha 绑定/解绑/确认在同一用户文档上形成事务冲突：旧快照不能跨过已持久化的冻结继续写凭据。真实 Mongo 回归用确定性暂停验证该边界，以及冻结后会话插入的补偿清理与回调错误重定向。

本地隔离回归：`apps/auth-gateway/tests/integration/run-watcha.sh` 自动创建随机名字、随机 loopback 端口的 Mongo 8.0.16 replica set，结束即销毁。所有上游 OAuth 和邮件由 fixture 接管，零真实发送。浏览器验收可运行 `WATCHA_FIXTURE_BROWSER=1 WATCHA_FIXTURE_WEB_ORIGIN=http://127.0.0.1:5186 apps/auth-gateway/tests/integration/run-watcha.sh`，它打印随机 Gateway origin 与仅本地的 `/fixture/mail`。浏览器测试应拦截官方 authorize URL 并重定向到该 Gateway 的 `/fixture/authorize`，保留查询参数；生产接口始终返回固定官方 URL。通过 SIGINT 关闭 fixture 会删除测试数据库和容器，不影响既有服务。

### 微信小程序观猹身份接续

3.3.0 增加 `watcha/mini-status`、`mini-start`、`mini-launch`、`mini-exchange`、`mini-cancel`。沿用已登记观猹回调与现有服务端凭据，使用发起 Cookie 和浏览器一次性接续码共同兑换。既有 Web 登录兼容；`mini-status.miniProgramSupported` 控制小程序启用。详见 [`docs/miniprogram-watcha-2026-09-10.md`](../../docs/miniprogram-watcha-2026-09-10.md)。部署本 Gateway 补充之前，小程序继续提供邮箱登录。

## 手机号验证码登录

本地新增阿里云 SMS 适配，默认关闭。配置、费用、数据兼容和离线验收见 [手机号登录接入说明](../../docs/auth/phone-login.md)。

## WeChat website sign-in (disabled by default)

Web QR login and explicit account linking use the WeChat Open Platform **Website App**. Configure `WECHAT_OAUTH_ENABLED`, `WECHAT_WEB_APP_ID`, and server-only `WECHAT_WEB_APP_SECRET` only after approval. The callback domain must match `AUTH_BASE_URL`. Never substitute Mini Program credentials or infer identity from nickname/UnionID. Existing account ownership and stored tasks/drafts remain unchanged.

See [application, endpoints and mock verification](../../docs/auth/wechat-login.md). This integration is local and unpublished; real provider/browser verification remains outstanding.

### GitHub 登录（默认关闭）

网页 GitHub 注册、登录、原账号绑定使用独立 OAuth 身份插件；原有邮箱/观猹/手机号继续使用。`GITHUB_OAUTH_ENABLED=false` 时入口隐藏。启用与准确回调、最小权限和本地模拟测试见 [GitHub 接入说明](../../docs/auth/github-login.md)。没有仓库集成或自动账号合并。

### Google 登录（默认关闭）

Google OIDC 服务端校验与原账号绑定使用独立插件；手机号/邮箱/观猹/GitHub 保留。仅 `openid profile`，固定 `sub` 关联，不按邮箱合并。配置、准确回调和模拟验证见 [Google 接入说明](../../docs/auth/google-login.md)。生产默认关闭；云侧本地测试客户端已创建并完成真实注册/登录/原账号绑定验收，不是线上可用声明。
