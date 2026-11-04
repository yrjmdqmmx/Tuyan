# Tuyan SMS login / registration

This change extends the phone authentication already present on the production-line baseline; it does not create a second account system. Default: **disabled**. No production configuration, paid SMS, provider credentials, deployment or carrier delivery was exercised in this task.

## Survey and design

- `apps/auth-gateway/src/auth.js` configures Better Auth with the Mongo adapter. Email/password, Watcha, WeChat, GitHub and Google remain intact. Phone authentication is the existing `tuyan-phone` Better Auth plugin in `phone-auth.js` and uses the same `user`, `account`, `session` collections, internal session adapter and `setSessionCookie`. Cookie security/domain/SameSite continue to come from the gateway's existing auth configuration.
- `account.providerId=phone`, `account.accountId=+861…` is the verified phone identity. Partial unique indexes on `(providerId, accountId)` and `(userId, providerId)` apply only to phone accounts. These are the appropriate equivalent of a unique sparse phone index in this provider-account schema; adding a second `user.phone` field would duplicate ownership. Ordinary email/social accounts are unaffected.
- A new phone user gets an immutable Mongo user ID, `phoneOnly=true`, and a unique internal `@phone.tuyan.invalid` email required by Better Auth. Existing guards prevent registering, displaying or delivering mail to that internal address. Returning users get their original user ID and workspace data. An existing email/social user should sign in first and bind the phone to retain their existing account; there is no automatic account merge, phone replacement or unbinding.
- `WorkspaceLogin` mounts `AuthPanel`; `usePhoneAuth` reads the existing `/api/auth/phone/status` capability endpoint. Phone login and `PhoneBindingPanel` are hidden unless `available=true`. No build-time frontend secret or second feature endpoint is added. Mini program is out of scope.
- The existing phone CAPTCHA is reused: five characters, raster PNG, two-minute expiry, browser/session bound and single use (including a wrong answer). There is no new external CAPTCHA service. Better Auth's database rate limiter remains in place; phone-specific HMAC-keyed Mongo buckets add the stricter shared limits below. `auth-http.js` overwrites the client IP header using Express's trusted-proxy result.

## HTTP flow

All paths below are under `/api/auth`. POSTs require an allowed `Origin`, `Content-Type: application/json` and cookies (`credentials: include`). Responses are `Cache-Control: no-store`.

| Endpoint | Request / response |
| --- | --- |
| `GET /phone/status` | Disabled: `{available:false}`. Enabled: `{available:true,linked,maskedPhone}`. Only masked phone is exposed here. |
| `POST /phone/challenge` | `{phone,purpose}` → `{challengeId,image,expiresInSeconds:120}` |
| `POST /phone/send-code` | `{phone,purpose,challengeId,captcha}` → `{ok:true,requestId,retryAfter:60,expiresInSeconds:300}` |
| `POST /phone/verify` | `{phone,purpose,requestId,code}` → `{ok:true}` and the usual Better Auth session cookie for login |

`purpose=login` signs in or registers. Authenticated binding uses the same endpoints with `purpose=link` plus `X-Workspace-Account` equal to the current user ID; another account's phone returns `PHONE_BINDING_CONFLICT` and never merges/overwrites data. Existing `purpose=delete` produces a session-bound confirmation for the separate account-deletion flow; it does not delete an account itself.

Only mainland mobile numbers (`1[3-9]` plus nine digits), optionally prefixed `+86`, are accepted. Spaces/hyphens are normalized. Hong Kong, Macao, Taiwan, landlines and other country codes are rejected.

OTP: cryptographically random six digits, including leading zeroes; five-minute TTL, HMAC-SHA256 with the existing auth secret and request ID, no plaintext stored. Attempts increment atomically before checking; at most five comparisons. The fifth correct attempt may succeed, but a fifth wrong attempt locks the proof. Code consumption, account creation/linking and ownership checks run in one Mongo transaction. Replica-set Mongo is required (as for existing auth workflows). Expiry is enforced in queries even before the TTL sweeper runs. A resend replaces the same browser/session's previous proof. Phone ownership uniqueness prevents concurrent registration from creating duplicate/orphan users.

Mongo TTL indexes cover `phoneCodes`, `phoneChallenges`, `phoneConfirmations`, `phoneRateLimits`. No SMS collections/indexes are created when disabled. Codes and rate-limit keys contain HMACs, while verified phone numbers live only in the existing account identity mapping. Do not log request bodies, SMS codes or raw phone numbers; use `maskPhone` (e.g. `+86138****1234`) when needed. Provider exceptions are replaced with a fixed error, without propagating their potentially sensitive messages.

| Limit | Existing default |
| --- | --- |
| Per phone | Rolling 60-second cooldown; 5/hour; 10/UTC day |
| Per IP | 20 send attempts/hour; 100 send reservations/UTC day; 60 verification attempts/15 minutes |
| Per browser | 10 sends/hour; 30/day; 30 CAPTCHA requests/hour |
| CAPTCHA per IP | 60/hour |
| Whole service | 200 send reservations/UTC day; 5,000/UTC calendar month |

Buckets are shared across gateway instances and survive restart. Reservations happen before provider calls; failed/ambiguous calls still consume quota. This conservatively limits attempts, not the final Aliyun bill. API submissions and handset delivery are different evidence states. SendSms has no idempotency guarantee: the client makes one attempt, disables SDK automatic retries and invalidates the proof on an uncertain outcome. Users must explicitly request a new code after cooldown.

Errors: `PHONE_DISABLED` (404); `PHONE_INVALID_NUMBER`, `PHONE_INVALID_CODE`, `PHONE_CODE_EXPIRED` (400); `PHONE_TOO_MANY_ATTEMPTS`, `PHONE_RATE_LIMIT` (429); binding/account conflicts (409); uncertain delivery (503). Rate limits include a server-calculated `Retry-After`. The Web form respects this countdown and clears expired/locked proof instead of repeatedly submitting it. Disabled mutations return 404; only the capability endpoint remains readable.

## Environment

All values are server environment variables; see `apps/auth-gateway/.env.example`. No secrets in Git, frontend variables, CLI arguments or logs.

| Variable | Default / meaning |
| --- | --- |
| `SMS_LOGIN_ENABLED` | `false`; canonical feature switch |
| `AUTH_SMS_DELIVERY_ENABLED` | `false`; retained separate explicit real-delivery gate |
| `ALIYUN_SMS_ACCESS_KEY_ID` | Required for real delivery; dedicated RAM user |
| `ALIYUN_SMS_ACCESS_KEY_SECRET` | Required for real delivery |
| `ALIYUN_SMS_SIGN_NAME` | Required for real delivery; suggested value `宁波义星互联网零售有限公司`, no built-in default |
| `ALIYUN_SMS_TEMPLATE_CODE` | Required for real delivery; this task's example is `SMS_512637812` |
| `AUTH_SMS_GLOBAL_DAILY_MAX` | `200` (1–100,000) |
| `AUTH_SMS_GLOBAL_MONTHLY_MAX` | `5000` (1–3,000,000) |

Compatibility: `AUTH_SMS_ENABLED` and corresponding `ALIBABA_SMS_ACCESS_KEY_ID`, `ALIBABA_SMS_ACCESS_KEY_SECRET`, `ALIBABA_SMS_SIGN_NAME`, `ALIBABA_SMS_TEMPLATE_CODE` remain accepted **only when their canonical variable is absent**. Explicit canonical `false`/empty values never fall back to old values. Avoid defining both sets; configure each key pair together. Legacy `ALIBABA_SMS_CODE_VARIABLE`, if present, must be `code`. Delivery cannot be enabled without login; inconsistent configuration fails startup. Login alone without a sender still reports unavailable, rather than creating a mock route in production.

Aliyun SDK: pinned `@alicloud/dysmsapi20170525` 4.6.0, Dysmsapi **2017-05-25 SendSms**, HTTPS endpoint `dysmsapi.aliyuncs.com`, region `cn-hangzhou`, one mainland number per call, template parameter `{"code":"012345"}`. The approved template must be exactly `您的验证码为${code}，5分钟内有效，请勿泄露给他人。`, sole variable `code`, digits only. This source change does not create/update a cloud template. Historical [phone-login.md](phone-login.md) records a different template (`SMS_512662428`); this task explicitly selects `SMS_512637812`. Verify its exact cloud template before enabling. Do not silently reuse the old private configuration.

## Founder setup (future authorized operation)

1. In Alibaba Cloud RAM, inspect whether a dedicated SMS user already exists; avoid creating duplicate credentials. Otherwise create a RAM sub-user for the application, with console login disabled. Create a custom permission policy from [aliyun-sms-send-only-policy.json](aliyun-sms-send-only-policy.json), then attach it only to that user. It allows only HTTPS `dysms:SendSms` on `Resource:"*"`. SendSms does not support resource-level restriction to a particular signature/template. If a custom policy cannot be used, `AliyunDysmsFullAccess` is a broader fallback, to be replaced by SendSms-only permission as soon as possible.
2. Create a dedicated AccessKey for that RAM user. Save the secret once into the server's protected configuration using the established secrets procedure, never chat/Git. Do not reuse DirectMail, root-account or administrator keys. Existing key preparation recorded in the historical document is not proof that a server has been configured.
3. In the SMS console, confirm the signature and template approval, variable constraints and carrier registration. **Signature carrier registration is pending according to this task's setup status; some numbers may not receive SMS yet.** This task did not refresh the console status. Do not interpret a successful SendSms API response as confirmed handset delivery. Keep cloud-side spending/anti-abuse limits enabled.
4. On Hangzhou, the base Compose directory is `/opt/paperbanana/repo/deploy/hk-single-host`. Its `compose.yaml` explicitly loads **`/opt/paperbanana/secrets/gateway.env`** for service **`auth-gateway`**. The Compose directory's `.env` supplies image/interpolation values; it is not the auth service credential file. `env_file` passes all SMS variables through already, so no redundant Compose environment entries are needed. Maintain restricted file permissions under the existing deployment secret-owner convention.
5. Also inspect the domestic gateway's actual protected Compose configuration before a future rollout. The checked-in `deploy/hangzhou/release.py` records project `tuyan-cn-gateway`, Compose directory `/opt/paperbanana/ops-releases/icp-domains-20261015`, and overlay `/opt/paperbanana/secrets/tuyan-cn-watcha.env`. Confirm whether that overlay overrides the shared SMS flags; both public entry points must agree. Do not print a full `docker compose config` containing secrets. The release helper's identity-manifest allowlist deliberately permits only disabled SMS flags; this change does not weaken that gate.
6. Only after the image/config rollout is separately authorized, configure the four Aliyun values and both switches. A plain `docker compose restart` does **not** reload changed environment files. Recreate the existing auth service, preserving other services and the pinned image. Base command (documentation only; not executed here):

   ```sh
   cd /opt/paperbanana/repo/deploy/hk-single-host
   docker compose --project-name paperbanana-hk \
     --project-directory /opt/paperbanana/repo/deploy/hk-single-host \
     --env-file /opt/paperbanana/repo/deploy/hk-single-host/.env \
     -f /opt/paperbanana/repo/deploy/hk-single-host/compose.yaml \
     up -d --no-deps --force-recreate auth-gateway
   ```

   Recreate the domestic gateway's same service separately using its verified project/Compose path if that entry point is in the authorized rollout. No new monitoring, server or scheduled task is required.
7. Safe verification first: inspect `/ready`, GET `/api/auth/phone/status` on each entry point, and confirm hidden phone UI with switches off. Run the local mock integration suite below. Capability reads do not send SMS. For a later paid test, explicitly authorize one owned test number and a bounded send count, complete CAPTCHA in the UI, and verify actual receipt, session, original account ID and binding conflict. Never use a real send-code endpoint as a health probe. Disable with `SMS_LOGIN_ENABLED=false` **and** `AUTH_SMS_DELIVERY_ENABLED=false`, then recreate the gateways; existing email/social login remains available.

Official references checked for this implementation: [SendSms API and authorization](https://help.aliyun.com/zh/sms/developer-reference/api-dysmsapi-2017-05-25-sendsms), [custom RAM policy examples](https://help.aliyun.com/zh/sms/custom-permission-policy-reference).

## Local testing and mock sender

`createAuthRuntime` accepts an explicit injected `smsTransport` only outside production. `tests/integration/phone-fixture.mjs` provides the existing development sender with an in-memory outbox and CAPTCHA answers, bound to loopback and a disposable database. There is no environment switch for a fixed bypass code or a production outbox. Never mount the fixture routes in production. Unit adapter tests inject a fake SDK client; Mongo tests inject the sender, mail and OAuth providers. They never call real Aliyun or a paid API.

```sh
pnpm --filter @paperbanana/auth-gateway check
pnpm --filter @paperbanana/auth-gateway test
bash apps/auth-gateway/tests/integration/run-phone.sh
pnpm --filter @paperbanana/web test
pnpm --filter @paperbanana/web build
```

`run-phone.sh` creates and removes only its own loopback Mongo 8 replica-set container; it runs both the historical end-to-end scenarios and `sms-login.mongo.mjs`. Alternatively set `PHONE_TEST_MONGO_URI=mongodb://127.0.0.1:<port>/?directConnection=true` for a disposable local replica set and run both Node files directly. Missing/remote URIs fail rather than silently skip. The fixture creates a random database and drops only that database on completion. Dev preview: `PHONE_FIXTURE_BROWSER=1 PHONE_FIXTURE_WEB_ORIGIN=http://127.0.0.1:<web-port> bash apps/auth-gateway/tests/integration/run-phone.sh`.

Gateway/Web are JavaScript packages without configured lint or static typecheck scripts; gateway `check` is Node syntax checking and Web's production build compiles JSX. Report these accurately rather than calling them TypeScript checks. Gateway has no compiled build script; its deployment build is the existing Dockerfile.

### 2026-11-04 verification on `codex/sms-login-20261104`

Installed only the affected dependency trees with `pnpm --filter @paperbanana/auth-gateway... --filter @paperbanana/web... install --frozen-lockfile`; lockfile unchanged. Local runtime: Node v26.5.0, pnpm 10.28.2, MongoDB 8.0.16 native arm64. CI/deployment use Node 24; that environment was not run here.

| Exact command | Observed result |
| --- | --- |
| `pnpm --filter @paperbanana/auth-gateway test` | 273 tests: **272 passed, 1 existing opt-in Mongo test skipped**, 0 failed |
| `node --test apps/auth-gateway/tests/phone-sms.test.js` | **7/7 passed** (included in gateway total) |
| `pnpm --filter @paperbanana/auth-gateway check` | Passed; additionally syntax-checked all 97 source/unit-test JS files individually with the loop below |
| `pnpm --filter @paperbanana/web test` | **1324/1324 passed**, 0 skipped |
| `pnpm --filter @paperbanana/web exec node --import tsx --import ./tests/dom-setup.mjs --test tests/phone-auth.test.mjs` | **10/10 passed** (included in Web total) |
| `pnpm --filter @paperbanana/web build` | Passed; existing >500 kB chunk warning |
| `PHONE_TEST_MONGO_URI='mongodb://127.0.0.1:27364/?directConnection=true' node --test apps/auth-gateway/tests/integration/sms-login.mongo.mjs` | **11/11 passed**, including concurrent lockout; real isolated replica-set Mongo, injected SMS |
| `PHONE_TEST_MONGO_URI='mongodb://127.0.0.1:27364/?directConnection=true' node apps/auth-gateway/tests/integration/phone-auth.mjs` | **10/10 scenario groups passed**, including original-account login/binding and deletion guards |
| `WATCHA_TEST_MONGO_URI='mongodb://127.0.0.1:27364/?directConnection=true' node apps/auth-gateway/tests/integration/watcha-oauth.mjs` | **14/14 scenario groups passed**; existing social authentication regression |
| `bash -n apps/auth-gateway/tests/integration/run-phone.sh` and `git diff --check` | Passed |
| `docker build -f apps/auth-gateway/Dockerfile -t tuyan-sms-login:local-20261104 .` | **Blocked**: local Docker daemon unavailable; installed application could not start (`kLSNoExecutableErr`). No image-build success claimed |

```sh
for file in apps/auth-gateway/src/*.js apps/auth-gateway/tests/*.test.js; do
  node --check "$file" || exit
done
```

New configuration/UI/Mongo tests were first run against the baseline and failed on the intended missing behavior, then passed after implementation. The Mongo wrapper's Docker lifecycle could not be exercised locally; its two underlying suites ran against the disposable native Mongo replica set instead. No production database was contacted.

Render QA limitation: the connected Chrome tool was denied by the current approval policy. An isolated local headless Chrome attempt also exited with SIGABRT before rendering, so the initial Codex run had no browser screenshot/layout acceptance. The temporary preview page was removed. UI assertions above are DOM tests, not browser screenshots. Paid delivery, actual handset autofill, carrier registration, production startup and image build remain unverified.

Follow-up 2026-11-04: Playwright screenshots (desktop 1440x900, mobile 390x844) were captured locally against the mock sender and an isolated Mongo container: phone tab visible, code sent with 60s countdown, wrong-code error, and phone login hidden when `SMS_LOGIN_ENABLED=false`. The auth-gateway Docker image was built locally with `docker build -f apps/auth-gateway/Dockerfile .` (452 MB, not pushed).
