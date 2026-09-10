# Watcha Login Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the Gateway task, then separate spec and quality reviews. Root handles Web integration and acceptance. Track completion below.

**Goal:** Add usable Watcha login, verified signup, explicit account binding and passwordless account management to Tuyan.

**Architecture:** Fixed OAuth endpoints, server-side one-use browser-bound transactions and email verification. Existing Better Auth sessions, account collection and lifecycle retain the immutable Tuyan identity. Web keeps its workspace alive in the original tab.

**Tech Stack:** Node, Better Auth 1.6.11, MongoDB transactions, React, existing DirectMail transport, node:test and browser acceptance.

## Task 1 — Gateway provider and identity lifecycle

- [x] Add protocol/config tests before implementation: form encoding for `+ / =`, S256, Bearer-only userinfo, safe user_id, missing email, upstream business errors and disabled configuration.
- [x] Create `apps/auth-gateway/src/watcha-oauth.js` with private provider/store/plugin helpers sharing the transaction context; integrate config/auth/indexes/app/email only where needed. Use the exact interfaces in the design. No production secrets in code or fixtures.
- [x] Add adversarial state, email-code, binding, session and deletion-confirmation tests under `apps/auth-gateway/tests`; use real Mongo tests under `tests/integration` for uniqueness, races, rollback and library session handling.
- [x] Run `pnpm --filter @paperbanana/auth-gateway test` and the dedicated isolated Mongo integration runner. Fix failures, commit only this task's files, then independent spec review and quality review.

## Task 2 — Web flow and account management

- [x] Create `apps/web/src/lib/watcha.js`, `components/WatchaIdentityPanel.jsx` and `public/account/watcha-callback.html`. Requests use credentials include and the configured Gateway; callback messages contain only completion notification.
- [x] Integrate panel with `AuthPanel.jsx` and `AccountPage.jsx`; signup takes email/code; existing user chooses email login then explicit bind. Preserve current component state while authorization runs in a separate window.
- [x] Extend `AccountSettingsDialog.jsx` and `lib/account.js` with email-code confirmation when the account lacks a password, retaining existing password deletion behavior.
- [x] Add Web tests for configured/disabled state, successful/pending/cancelled authorization, binding and deletion-confirmation requests. Run `pnpm --filter @paperbanana/web test` and `pnpm --filter @paperbanana/web build`.

## Task 3 — Contracts, operational guidance and review

- [x] Add SYNC entry with new endpoints, fields, env names, Web/Gateway completion and Mini Program deferred compatibility. Update prior watcha research with application now issued, no credential values, and real acceptance still pending.
- [x] Add local preview/validation instructions using fake provider and mail capture, empty fresh database and loopback ports. Keep existing 5174 and persistent containers intact.
- [x] Review against the design, then review security/maintainability separately. Exercise actual browser desktop and mobile flows through the real local Gateway. Keep login, runtime tests, production deployment and paid calls as distinct evidence.

Acceptance examples:

```js
assert.equal(new URL(start.url).searchParams.get('code_challenge_method'), 'S256');
assert.equal(status.available, false); // disabled instance exposes no login start
assert.equal(callback.headers.get('location').includes('access_token'), false);
assert.equal((await getSession()).user.id, originalUserId); // linked returning user
assert.equal((await completeEmailSignup()).user.emailVerified, true);
assert.equal(secondUse.status, 400); // one-use state / confirmation token
```

No live supplier calls, automatic production deployment or third-party messages are part of local implementation.

Completed local implementation and two-stage independent review on 2026-09-10. See [validation record](../../tokendance/watcha-login-validation-20260910.md). Real-provider acceptance and deployment remain open.
