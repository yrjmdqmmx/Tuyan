import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const workflow = readFileSync(new URL('../../../.github/workflows/reconcile-and-continue-scientific-v2-unknown.yml', import.meta.url), 'utf8')
const entry = readFileSync(new URL('../../../apps/benchmark-worker/src/scientific-v2-unknown-reconciliation-entry.ts', import.meta.url), 'utf8')
const reconciler = readFileSync(new URL('../../../apps/benchmark-worker/src/scientific-v2-unknown-reconciliation.ts', import.meta.url), 'utf8')

test('unknown continuation is exact, serial, disabled-gated and tied to the zero-provider reconciliation run', () => {
  assert.match(workflow, /group: paperbanana-hk-production/)
  assert.match(workflow, /PAPERBANANA_BENCH_ENABLED.*false/)
  assert.match(workflow, /PAPERBANANA_BENCH_CONCURRENCY.*1/)
  assert.match(workflow, /reconcile-one-unknown-and-continue-scientific-v2/)
  assert.match(workflow, /PAPERBANANA_SCIENTIFIC_V2_RECONCILIATION_RUN_ID/)
  assert.match(workflow, /com\.docker\.compose\.service=paperbanana-api/)
  assert.doesNotMatch(workflow, /com\.docker\.compose\.service=benchmark-worker --format/)
  assert.match(workflow, /--mode run/)
  assert.match(workflow, /--model-count 40/)
  assert.match(workflow, /--external:mongodb --external:sharp --external:ali-oss/)
  assert.doesNotMatch(workflow, /PAPERBANANA_BENCH_(BAILIAN|ARK|OPENROUTER)_API_KEY=/)
})

test('unknown reconciliation preserves the original attempt and refuses automatic replay evidence', () => {
  assert.match(reconciler, /originalAttempt/)
  assert.match(reconciler, /candidateCount !== 0/)
  assert.match(reconciler, /spoolCandidateCount !== 0/)
  assert.match(reconciler, /credentialStatus !== 200/)
  assert.match(reconciler, /attemptBase\.responseClass = 'confirmed_technical_failure'/)
  assert.match(reconciler, /slot\.status = 'retrying'/)
  assert.match(entry, /status: 'started'/)
  assert.match(entry, /claimLeaseExpiresAt > new Date\(\)/)
  assert.match(entry, /withTransaction/)
  assert.match(entry, /stateTransitionFromHash: expectedStateHash/)
  assert.match(entry, /scientific-v2-unknown-reconciliation:/)
  assert.doesNotMatch(entry, /PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET/)
  assert.match(workflow, /PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET=/)
  assert.match(workflow, /attestationSecret/)
})
