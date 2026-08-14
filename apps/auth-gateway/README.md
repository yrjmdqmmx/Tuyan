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
- The JSON request ceiling is 1 MiB. Oversized bodies return
  `413 {"code":413,"error":"Request body too large"}`.

## Identity and ownership

Logged-in writes use the Better Auth account id/email. Anonymous
`createJob`, `refineImage`, and `prepareReferenceUpload` calls use a signed
30-day guest identity stored in a host-only HttpOnly cookie. Production uses
`__Host-paperbanana_guest` with `Secure; Path=/; SameSite=Lax` and no Domain.
The Mongo owner is an irreversible `guest:<sha256>` value; the random cookie
secret is never written to Mongo or forwarded publicly. A previous signing key
can verify and rotate cookies without changing the owner.

`getJob` fails closed unless its stored owner matches the current account id,
historical account email, valid guest owner, or an authenticated admin email.
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
- `submitFeedback`
- `importReferences`
- `evaluateJob`
- `initDatabase`
- `POST /api/account/delete`

Authentication, `/health`, `/ready`, `getJob`, `myJobs`, `modelCapability`,
`referenceLibrary`, `adminJobs`, `adminFeedback`, `adminUsers`, and
`pingPlotWorker` remain available. `/health` is cached liveness and never waits
for dependencies. `/ready` probes MongoDB and the selected backend and returns
503 unless both are ready. Health responses keep the top-level
`runtime:"gateway"`; `laf` is a one-release alias of `backend`.

Account deletion purges business data first. Auth cookies/users are removed
only after an HTTP 2xx cleanup response with semantic `{code:0,ok:true}`.
Business failures and HTTP/timeout failures leave auth intact.

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
