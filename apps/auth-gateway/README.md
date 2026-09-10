# PaperBanana Auth Gateway

The public Node 24 gateway for Better Auth and the stable `/paperbanana-api`
contract. In the Hong Kong deployment it talks to the internal Node core; Laf
is retained only as an explicit rollback target.

## Trust boundaries

- Set `PAPERBANANA_API_URL` for normal operation. `LAF_API_URL` is used only
  when the Node URL is absent. Configuring both always selects Node; there is
  no request-time fallback.
- `PAPERBANANA_GATEWAY_TOKEN` is required. Node receives it only in
  `x-paperbanana-gateway-token`; caller-supplied gateway/admin tokens are
  removed. Laf rollback receives an overwritten body token and a server-side
  admin token only for authenticated admin actions.
- The container accepts one trusted proxy hop. Production Compose must publish
  it as `127.0.0.1:3020:3005`, and Nginx must overwrite (not append) the incoming
  forwarding headers. The gateway derives `req.ip` and sends only
  `x-paperbanana-client-ip` to the core. The core removes all raw forwarding
  and internal-auth headers before invoking the shared Laf handler.
- Every JSON/auth request, including chunked `/api/auth/*` bodies, has a measured
  1 MiB ceiling. Oversized bodies return
  `413 {"code":413,"error":"Request body too large"}`.
- Admin actions require a logged-in Better Auth user id listed in
  `ADMIN_USER_IDS`. Email addresses, request body `adminToken`, and
  `X-Admin-Token` are never authorization inputs. `ADMIN_TOKEN` remains
  server-only and is injected into a Laf rollback request only after the id
  check succeeds.

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
URL is accepted in Node mode only when it is a V4-signed virtual-hosted URL for
the configured private OSS bucket; it is then converted back to the owned
object key. Arbitrary URLs are rejected. The external-URL compatibility switch
exists only for a deliberate Laf rollback.

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
503 unless both are ready. Node mode probes the core's authenticated
`GET /ready` and requires both HTTP success and `ready:true`; Laf rollback uses
its legacy `health` action. Ordinary business responses never change this
probe-derived readiness cache. Health responses keep top-level
`runtime:"gateway"` and `auth:"better-auth"`; dependency detail lives under
`dependencies`, while `laf` is a one-release alias of `backend`.

Account deletion verifies the current session password without signing in or
creating another session. Before any destructive backend action, the gateway
calls the read-only `accountDeletionCapability` action and requires
`deletionContractVersion:2`; rollback runtimes that cannot prove this contract
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
