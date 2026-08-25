# Bounded Benchmark Phase Operator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-shot, exact-run quick/full benchmark operator whose immutable authorization and signed run approval match before any paid dispatch, while the resident worker remains disabled.

**Architecture:** A strict phase-authorization parser builds a canonical, secret-free envelope. The worker repository leases only the requested run with a state CAS, and a reusable `processBenchmarkRun` function compares every run identity, approval, price, budget, suite, judge, and code field before loading credentials/runtime. A one-off CLI emits a redacted report; the host wrapper and manual production workflow provide a second independent boundary around disabled-daemon state, image provenance, locking, dry-run, and postconditions.

**Tech Stack:** TypeScript/Node 24, MongoDB, ali-oss, Node test runner, Bash, Docker Compose, GitHub Actions.

---

### Task 1: Strict phase authorization

**Files:**
- Create: `apps/benchmark-worker/src/phase-operator-authorization.ts`
- Modify: `apps/benchmark-worker/src/index.ts`
- Test: `apps/benchmark-worker/tests/worker.test.ts`

- [ ] Add failing tests for exact quick/full fields, format limits, phase generation/Judge caps, total-cost formula, confirm phrase, SHA/suite/judge/price hashes, and canonical authorization hash.
- [ ] Run the focused worker test and verify failures are caused by the missing parser.
- [ ] Implement the parser with quick generation cap 24, full cap 144, quick Judge cap 48, full Judge cap 288, HTTPS price source, canonical timestamps, and disabled/single-concurrency guards.
- [ ] Re-run the focused worker tests.

### Task 2: Exact-run CAS lease and pre-dispatch attestation

**Files:**
- Modify: `apps/benchmark-worker/src/mongo-repository.ts`
- Create: `apps/benchmark-worker/src/process-run.ts`
- Modify: `apps/benchmark-worker/src/main.ts`
- Test: `apps/benchmark-worker/tests/worker.test.ts`

- [ ] Add failing tests proving only the requested run and requested running state can be leased, another running run is untouched, every identity/approval/price/cap mismatch fails before runtime loading, unknown outcomes pause, budget stops pause, and successful quick/full calls exit in review/audit states.
- [ ] Run the focused tests and verify expected failures.
- [ ] Add `acquireRunById(runId, state, workerId, leaseMs)` with `_id + state + expired/missing lease` CAS.
- [ ] Extract the existing paid execution path into dependency-injected `processBenchmarkRun`; compare the operator envelope against the phase-specific signed approval version and immutable run fields before credentials, image runtime, OSS, or Judge setup.
- [ ] Make the daemon call the extracted function after its existing queue acquisition; preserve bounded 429 and unknown-outcome behavior.
- [ ] Re-run worker tests and typecheck.

### Task 3: One-shot CLI and secret-free report

**Files:**
- Create: `apps/benchmark-worker/src/phase-operator.ts`
- Modify: `apps/benchmark-worker/package.json`
- Modify: `apps/benchmark-worker/Dockerfile`
- Test: `apps/benchmark-worker/tests/worker.test.ts`

- [ ] Add failing report/redaction and one-shot lifecycle tests.
- [ ] Implement one Mongo connect, index check, exact lease, one `processBenchmarkRun` invocation, client close, and JSON report containing only run/phase/hash/usage/state/sample/judgment/audit counts.
- [ ] Bundle `dist/phase-operator.mjs` and verify build output.

### Task 4: Host boundary and manual workflow

**Files:**
- Create: `deploy/hk-single-host/scripts/run-benchmark-phase-operator.sh`
- Create: `deploy/hk-single-host/tests/benchmark-phase-operator.test.mjs`
- Create: `.github/workflows/run-benchmark-phase-operator.yml`

- [ ] Add failing static/dry-run tests for exact inputs, configured-disabled, daemon disabled/healthy, shared lock ordering, Core/Worker baked SHA equality, `run --rm --no-deps`, zero-call dry-run, test-root apply rejection, and post-run disabled/state/lease conditions.
- [ ] Implement the root-only wrapper with strict argument validation and secret-free output.
- [ ] Implement the `workflow_dispatch` in `paperbanana-production` with explicit identity/price/budget inputs and production concurrency.
- [ ] Run HK contract tests and shell syntax checks.

### Task 5: Shared approval price source and documentation

**Files:**
- Modify: `apps/paperbanana-api/src/benchmark-repository.ts`
- Modify: `apps/paperbanana-api/tests/benchmark-service.test.ts`
- Modify: `docs/benchmark-v1.md`
- Modify: `SYNC.md`

- [ ] Add failing Core tests requiring an exact public HTTPS price source in the signed approval snapshot.
- [ ] Persist/source-sign the field without exposing signing secrets to Worker.
- [ ] Document that only admin-approved, already-running exact runs may be operated; the operator never approves candidates or expands budgets.
- [ ] Add the cross-client-neutral shared-contract entry to the top of SYNC.

### Task 6: Verification

- [ ] Run benchmark-core test/check.
- [ ] Run benchmark-worker test/check/build.
- [ ] Run paperbanana-api test/check/build.
- [ ] Run HK deployment contract tests including the new operator tests.
- [ ] Run `git diff --check`, inspect status/diff, and report any residual production risks without committing, pushing, deploying, or making paid calls.
