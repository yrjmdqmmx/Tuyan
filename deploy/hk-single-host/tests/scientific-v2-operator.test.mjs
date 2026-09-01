import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const operator = fileURLToPath(new URL('../scripts/run-scientific-v2-operator.sh', import.meta.url))
const workflow = fileURLToPath(new URL('../../../.github/workflows/run-scientific-v2-operator.yml', import.meta.url))
const failureInspectionWorkflow = fileURLToPath(new URL('../../../.github/workflows/inspect-scientific-v2-full-failure.yml', import.meta.url))
const codexArtifactStagingWorkflow = fileURLToPath(new URL('../../../.github/workflows/stage-scientific-v2-codex-artifacts.yml', import.meta.url))
const codexImportStagingWorkflow = fileURLToPath(new URL('../../../.github/workflows/stage-scientific-v2-codex-import-bundle.yml', import.meta.url))
const adminInputStagingWorkflow = fileURLToPath(new URL('../../../.github/workflows/stage-scientific-v2-admin-input.yml', import.meta.url))
const reviewPackStagingWorkflow = fileURLToPath(new URL('../../../.github/workflows/stage-scientific-v2-review-pack-bundle.yml', import.meta.url))
const publicRenderStagingWorkflow = fileURLToPath(new URL('../../../.github/workflows/stage-scientific-v2-public-render-bundle.yml', import.meta.url))
const reviewAssignmentExportWorkflow = fileURLToPath(new URL('../../../.github/workflows/export-scientific-v2-review-assignments.yml', import.meta.url))
const reviewValidationStagingWorkflow = fileURLToPath(new URL('../../../.github/workflows/stage-scientific-v2-review-validation-bundle.yml', import.meta.url))
const reviewResultImportStagingWorkflow = fileURLToPath(new URL('../../../.github/workflows/stage-scientific-v2-review-result-import.yml', import.meta.url))
const reviewDisputeExportWorkflow = fileURLToPath(new URL('../../../.github/workflows/export-scientific-v2-review-disputes.yml', import.meta.url))
const arbitrationStagingWorkflow = fileURLToPath(new URL('../../../.github/workflows/stage-scientific-v2-arbitration-bundle.yml', import.meta.url))
const arbitrationImportStagingWorkflow = fileURLToPath(new URL('../../../.github/workflows/stage-scientific-v2-arbitration-result-import.yml', import.meta.url))
const publishInputStagingWorkflow = fileURLToPath(new URL('../../../.github/workflows/stage-scientific-v2-publish-input.yml', import.meta.url))
const publicRenderRunWorkflow = fileURLToPath(new URL('../../../.github/workflows/run-scientific-v2-public-render.yml', import.meta.url))
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const registryHash = 'b'.repeat(64)
const suiteHash = 'c'.repeat(64)
const priceHash = 'd'.repeat(64)
const manifestHash = 'e'.repeat(64)
const modelCount = 4
const lockName = '/run/lock/paperbanana-hk-production.lock'
const confirmations = {
  inspect: 'inspect-scientific-v2-disabled-worker',
  run: 'run-exact-scientific-v2-bundle-disabled-worker',
  reconcile_artifact: 'reconcile-artifact-scientific-v2-disabled-worker',
  import_codex: 'import-codex-scientific-v2-disabled-worker',
  render_public_evidence: 'render-public-evidence-scientific-v2-disabled-worker',
  review_pack: 'review-pack-scientific-v2-disabled-worker',
  review_finalize: 'review-finalize-scientific-v2-disabled-worker',
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort((left, right) => left.localeCompare(right)).map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

function canonicalHash(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex')
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'paperbanana-scientific-v2-operator-'))
  const repoRoot = join(root, 'opt/paperbanana/repo')
  const deployDir = join(repoRoot, 'deploy/hk-single-host')
  const secretDir = join(root, 'opt/paperbanana/secrets')
  const bundleDir = join(root, 'opt/paperbanana/operator-bundles/scientific-v2')
  const artifactSpool = join(root, 'opt/paperbanana/data/scientific-v2-artifact-spool')
  mkdirSync(deployDir, { recursive: true, mode: 0o700 })
  mkdirSync(secretDir, { recursive: true, mode: 0o700 })
  mkdirSync(bundleDir, { recursive: true, mode: 0o700 })
  mkdirSync(artifactSpool, { recursive: true, mode: 0o700 })
  mkdirSync(join(root, 'tmp'), { recursive: true, mode: 0o700 })
  mkdirSync(join(repoRoot, '.github/workflows'), { recursive: true, mode: 0o700 })
  mkdirSync(join(deployDir, 'scripts'), { recursive: true, mode: 0o700 })
  writeFileSync(join(root, '.paperbanana-hk-test-root'), 'paperbanana-hk-test-root-v1\n', { mode: 0o600 })
  const trackedWorkflow = join(repoRoot, '.github/workflows/run-scientific-v2-operator.yml')
  const trackedCompose = join(deployDir, 'compose.yaml')
  const trackedOperator = join(deployDir, 'scripts/run-scientific-v2-operator.sh')
  writeFileSync(trackedWorkflow, 'name: fixture-scientific-v2\n')
  writeFileSync(trackedCompose, 'name: fixture-paperbanana-hk\n')
  writeFileSync(trackedOperator, '#!/usr/bin/env bash\n')
  const git = (...args) => spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'PaperBanana Test',
      GIT_AUTHOR_EMAIL: 'paperbanana-test@example.invalid',
      GIT_COMMITTER_NAME: 'PaperBanana Test',
      GIT_COMMITTER_EMAIL: 'paperbanana-test@example.invalid',
    },
  })
  assert.equal(git('init', '-q').status, 0)
  assert.equal(git('add', '.github/workflows/run-scientific-v2-operator.yml', 'deploy/hk-single-host/compose.yaml', 'deploy/hk-single-host/scripts/run-scientific-v2-operator.sh').status, 0)
  assert.equal(git('commit', '-qm', 'fixture operator baseline').status, 0)
  const sha = git('rev-parse', 'HEAD').stdout.trim()
  assert.match(sha, /^[a-f0-9]{40}$/)
  writeFileSync(join(deployDir, '.env'), [
    `PAPERBANANA_CORE_IMAGE=ghcr.io/example/paperbanana-core-api@sha256:${'1'.repeat(64)}`,
    `PAPERBANANA_BENCH_WORKER_IMAGE=ghcr.io/example/paperbanana-benchmark-worker@sha256:${'2'.repeat(64)}`,
    'PAPERBANANA_BENCH_SECRET_MODE=configured-disabled',
    '',
  ].join('\n'), { mode: 0o600 })
  writeFileSync(join(secretDir, 'core.env'), `PAPERBANANA_CODE_SHA=${sha}\n`, { mode: 0o600 })
  writeFileSync(join(secretDir, 'bench.env'), [
    `PAPERBANANA_CODE_SHA=${sha}`,
    'PAPERBANANA_BENCH_ENABLED=false',
    'PAPERBANANA_BENCH_CONCURRENCY=1',
    'PAPERBANANA_BENCH_MONGODB_URI=mongodb://do-not-print-mongo/benchmark',
    'PAPERBANANA_BENCH_BAILIAN_API_KEY=do-not-print-bailian',
    'PAPERBANANA_BENCH_ARK_API_KEY=do-not-print-ark',
    'PAPERBANANA_BENCH_OPENROUTER_API_KEY=do-not-print-openrouter',
    'PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID=do-not-print-oss-id',
    'PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET=do-not-print-oss-secret',
    'PAPERBANANA_BENCH_OSS_BUCKET=do-not-print-bucket',
    'PAPERBANANA_BENCH_OSS_REGION=do-not-print-region',
    'PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT=do-not-print-internal-endpoint',
    'PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT=do-not-print-public-endpoint',
    '',
  ].join('\n'), { mode: 0o600 })
  const bundle = {
    operation: 'inspect',
    gate: { enabled: false, concurrency: 1, lockName },
    batchInput: {
      canonicalManifest: { registryHash, canonicalModelCount: modelCount },
      registrySnapshot: {},
      suiteHash,
      codeSha: sha,
      priceSnapshot: { snapshotHash: priceHash },
      createdAt: '2026-08-31T00:00:00.000Z',
    },
  }
  const bytes = `${JSON.stringify(bundle)}\n`
  const bundleHash = createHash('sha256').update(bytes).digest('hex')
  const bundlePath = join(bundleDir, `${bundleHash}.json`)
  writeFileSync(bundlePath, bytes, { mode: 0o600 })
  for (const path of [root, dirname(deployDir), deployDir, secretDir, bundleDir, artifactSpool]) chmodSync(path, 0o700)
  return {
    root,
    repoRoot,
    sha,
    benchEnv: join(secretDir, 'bench.env'),
    bundlePath,
    writeBundle(nextBundle) {
      const nextBytes = `${JSON.stringify(nextBundle)}\n`
      const nextHash = createHash('sha256').update(nextBytes).digest('hex')
      writeFileSync(join(bundleDir, `${nextHash}.json`), nextBytes, { mode: 0o600 })
      return nextHash
    },
    trackedCompose,
    bundleHash,
    git,
    run(mode = 'inspect', extra = [], extraEnv = {}) {
      const applyArgs = mode === 'inspect' ? [] : ['--apply']
      return spawnSync(operator, [
        '--mode', mode,
        '--expected-sha', sha,
        '--bundle-sha256', bundleHash,
        '--registry-hash', registryHash,
        '--suite-hash', suiteHash,
        '--price-hash', priceHash,
        '--manifest-hash', manifestHash,
        '--model-count', String(modelCount),
        '--confirm', confirmations[mode],
        ...applyArgs,
        ...extra,
      ], {
        encoding: 'utf8',
        env: {
          ...process.env,
          PAPERBANANA_HK_TEST_ROOT: root,
          PAPERBANANA_SCIENTIFIC_V2_TEST_ALLOW_APPLY_DRY_RUN: 'true',
          ...extraEnv,
        },
      })
    },
    cleanup() { rmSync(root, { recursive: true, force: true }) },
  }
}

test('scientific v2 host operator is executable and binds every immutable execution fact', () => {
  assert.equal(existsSync(operator), true)
  assert.equal(statSync(operator).mode & 0o111, 0o111)
  const source = readFileSync(operator, 'utf8')
  assert.match(source, /set -Eeuo pipefail/)
  assert.match(source, /\/run\/lock\/paperbanana-hk-production[.]lock/)
  assert.match(source, /configured-disabled/)
  assert.match(source, /PAPERBANANA_BENCH_ENABLED[\s\S]*false/)
  assert.match(source, /PAPERBANANA_BENCH_CONCURRENCY[\s\S]*1/)
  assert.match(source, /PAPERBANANA_CODE_SHA/)
  assert.match(source, /git[\s\S]*rev-parse[\s\S]*HEAD/)
  assert.match(source, /tracked_operator_paths[\s\S]*run-scientific-v2-operator[.]yml[\s\S]*compose[.]yaml[\s\S]*run-scientific-v2-operator[.]sh/)
  assert.match(source, /git -C "\$repo_root" diff --quiet "\$expected_sha" -- "\$\{tracked_operator_paths\[@\]\}"/)
  assert.match(source, /PAPERBANANA_CORE_IMAGE[\s\S]*@sha256:/)
  assert.match(source, /PAPERBANANA_BENCH_WORKER_IMAGE[\s\S]*@sha256:/)
  assert.match(source, /build-provenance[.]json/)
  assert.match(source, /providerBudgetsCny[\s\S]*bailian[\s\S]*180[\s\S]*ark[\s\S]*180[\s\S]*openrouter[\s\S]*360/)
  assert.match(source, /maxToolCalls[\s\S]*36/)
  assert.match(source, /cases[\s\S]*length[\s\S]*9/)
  assert.match(source, /models[\s\S]*length/)
  assert.match(source, /registryHash/)
  for (const field of ['manifestCodeSha', 'executionCodeSha', 'legacyRecoveryStateHash']) assert.match(source, new RegExp(field))
  assert.match(source, /suiteHash/)
  assert.match(source, /priceHash/)
  assert.match(source, /manifestHash/)
  assert.match(source, /bundle_container='\/run\/paperbanana-scientific-v2\/bundle[.]json'/)
  assert.match(source, /scientific-v2-operator[.]mjs/)
  assert.match(source, /timeout --signal=TERM --kill-after=10s/)
  assert.match(source, /O_NOFOLLOW/)
  assert.match(source, /S_ISREG/)
  assert.match(source, /st_nlink[\s\S]*1/)
  assert.match(source, /st_uid/)
  assert.match(source, /0440/)
  assert.match(source, /O_EXCL/)
  assert.match(source, /st_dev[\s\S]*st_ino/)
  const snapshotIndex = source.indexOf('secure_snapshot')
  assert.ok(snapshotIndex >= 0)
  for (const marker of ['sha256sum', 'shasum -a 256', 'jq -e', 'dist/scientific-v2-operator.mjs']) {
    assert.ok(snapshotIndex < source.indexOf(marker), `${marker} must use the exclusive snapshot`)
  }
  const inspectRunner = source.match(/run_inspect\(\) \{([\s\S]*?)^\}/m)?.[1] || ''
  assert.match(inspectRunner, /docker run[\s\S]*--pull=never[\s\S]*--network none[\s\S]*--read-only[\s\S]*src=\$snapshot_path,dst=\$bundle_container,readonly/)
  assert.match(inspectRunner, /--cap-drop ALL[\s\S]*--security-opt no-new-privileges[\s\S]*--user "\$service_uid:\$service_gid"/)
  assert.match(inspectRunner, /PAPERBANANA_SCIENTIFIC_V2_BUNDLE_PATH[\s\S]*PAPERBANANA_SCIENTIFIC_V2_SPOOL_DIR[\s\S]*PAPERBANANA_SCIENTIFIC_V2_EXPECTED_BUNDLE_SHA256/)
  assert.doesNotMatch(inspectRunner, /benchmark-operator|docker compose|API_KEY|ACCESS_KEY|bench[.]env|PAPERBANANA_CODE_SHA|PAPERBANANA_BENCH_ENABLED|PAPERBANANA_BENCH_CONCURRENCY/)
  const paidRunner = source.match(/run_paid\(\) \{([\s\S]*?)^\}/m)?.[1] || ''
  assert.match(paidRunner, /"\$\{compose\[@\]\}" run --rm --no-deps[\s\S]*--user "\$service_uid:\$service_gid"[\s\S]*benchmark-operator[\s\S]*scientific-v2-operator[.]mjs/)
  assert.match(paidRunner, /-e PAPERBANANA_BENCH_ENABLED=false/)
  assert.match(paidRunner, /-e PAPERBANANA_BENCH_CONCURRENCY=1/)
  assert.match(paidRunner, /-e PAPERBANANA_SCIENTIFIC_V2_RUN_ENABLED=true/)
  assert.match(paidRunner, /-e PAPERBANANA_SCIENTIFIC_V2_HOST_LOCK_PROOF=\/run\/lock\/paperbanana-hk-production[.]lock/)
  assert.match(paidRunner, /-e PAPERBANANA_BENCH_LEASE_MS=120000/)
  assert.match(paidRunner, /-e PAPERBANANA_BENCH_HEARTBEAT_MS=30000/)
  assert.match(paidRunner, /-e PAPERBANANA_BENCH_PROVIDER_TIMEOUT_MS=300000/)
  assert.match(paidRunner, /-v "\$snapshot_path:\$bundle_container:ro"/)
  assert.match(paidRunner, /PAPERBANANA_SCIENTIFIC_V2_EXPECTED_BUNDLE_SHA256="\$bundle_sha256"/)
  assert.doesNotMatch(paidRunner, /\$input_dir:\/run\/paperbanana-scientific-v2(?::|[^-])/)
  assert.match(source, /chmod 0550 "\$input_dir"/)
  assert.match(source, /rm -f -- "\$input_dir\/bundle[.]json"[\s\S]*rmdir -- "\$input_dir"/)
  assert.doesNotMatch(source, /rm\s+-rf|find\s+[^\n]*-delete/)
  assert.doesNotMatch(source, /set -x|printenv|cat\s+[^\n]*(?:core|bench)[.]env|source\s+[^\n]*(?:core|bench)[.]env/)
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_ENABLED\s*=\s*true|retry|while\s+.*SCIENTIFIC_V2/)
  assert.ok(source.indexOf('flock -x 9') < source.indexOf('for path in "$deploy_env"'))
})

test('post-preflight service-uid replacement cannot swap the root-owned read-only bundle before execution', () => {
  const item = fixture()
  try {
    const result = item.run('inspect', [], { PAPERBANANA_SCIENTIFIC_V2_TEST_REPLACE_AFTER_PREFLIGHT: 'true' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /service replacement denied|immutable input/i)
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /provider dispatch|do-not-print/i)
  } finally { item.cleanup() }
})

test('inspect is the default zero-call mode and does not read bench.env or credentials', () => {
  const item = fixture()
  try {
    unlinkSync(item.benchEnv)
    const result = item.run()
    assert.equal(result.status, 0, JSON.stringify({ stdout: result.stdout, stderr: result.stderr, signal: result.signal, error: result.error?.message }))
    const parsed = JSON.parse(result.stdout)
    assert.deepEqual(parsed, {
      schemaVersion: 2,
      operation: 'inspect',
      dryRun: true,
      providerCalls: 0,
      codeSha: item.sha,
      bundleHash: item.bundleHash,
      registryHash,
      suiteHash,
      priceHash,
      manifestHash,
      modelCount,
      caseCount: 9,
      providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 360 },
      codexMaxToolCalls: 36,
      concurrency: 1,
      lockName,
    })
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /do-not-print|api.?key|access.?key|secret|bench[.]env/i)
  } finally { item.cleanup() }
})

test('operator rejects a mismatched HEAD and tracked operator drift before bundle inspection', () => {
  const head = fixture()
  try {
    writeFileSync(join(head.repoRoot, 'unrelated.txt'), 'next commit\n')
    assert.equal(head.git('add', 'unrelated.txt').status, 0)
    assert.equal(head.git('commit', '-qm', 'advance fixture head').status, 0)
    const result = head.run()
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /HEAD|source|SHA/i)
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /docker|do-not-print/i)
  } finally { head.cleanup() }

  const dirty = fixture()
  try {
    writeFileSync(dirty.trackedCompose, 'name: drifted-compose\n')
    const result = dirty.run()
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /dirty|drift|source/i)
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /docker|do-not-print/i)
  } finally { dirty.cleanup() }
})

test('operator rejects hardlinked input and bundle path replacement during its exclusive snapshot', () => {
  const linked = fixture()
  try {
    linkSync(linked.bundlePath, `${linked.bundlePath}.alias`)
    const result = linked.run()
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /bundle|snapshot|protected/i)
  } finally { linked.cleanup() }

  const drift = fixture()
  try {
    writeFileSync(`${drift.bundlePath}.replacement`, '{"operation":"replaced"}\n', { mode: 0o600 })
    const result = drift.run('inspect', [], { PAPERBANANA_SCIENTIFIC_V2_TEST_REPLACE_DURING_SNAPSHOT: 'true' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /drift|replace|snapshot/i)
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /docker|provider/i)
  } finally { drift.cleanup() }
})

test('run accepts only the exact confirmation and remains non-executing without apply', () => {
  const item = fixture()
  try {
    const dry = item.run('run')
    assert.notEqual(dry.status, 0, 'inspect bundle must not be accepted as a run bundle')
    assert.doesNotMatch(`${dry.stdout}${dry.stderr}`, /docker|provider dispatch|do-not-print/i)

    const wrongConfirm = item.run('inspect', ['--confirm', 'run-exact-scientific-v2-bundle-disabled-worker'])
    assert.notEqual(wrongConfirm.status, 0)

    const applyInspect = item.run('inspect', ['--apply'])
    assert.notEqual(applyInspect.status, 0)
    assert.match(applyInspect.stderr, /inspect.*apply|apply.*inspect/i)
  } finally { item.cleanup() }
})

test('production argument gate makes all six mutating modes fail closed without apply before Docker', () => {
  const root = mkdtempSync(join(tmpdir(), 'paperbanana-scientific-v2-no-apply-'))
  const bin = join(root, 'bin')
  const calls = join(root, 'docker-calls')
  mkdirSync(bin, { mode: 0o700 })
  writeFileSync(join(bin, 'docker'), `#!/bin/sh\nprintf '%s\\n' "$*" >> ${JSON.stringify(calls)}\nexit 99\n`, { mode: 0o700 })
  try {
    for (const mode of Object.keys(confirmations)) {
      const result = spawnSync(operator, [
        '--mode', mode,
        '--expected-sha', 'a'.repeat(40),
        '--bundle-sha256', 'b'.repeat(64),
        '--registry-hash', registryHash,
        '--suite-hash', suiteHash,
        '--price-hash', priceHash,
        '--manifest-hash', manifestHash,
        '--model-count', String(modelCount),
        '--confirm', confirmations[mode],
      ], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } })
      if (mode === 'inspect') {
        assert.doesNotMatch(result.stderr, /requires --apply/, 'inspect must remain the sole no-apply execution mode')
      } else {
        assert.notEqual(result.status, 0, `${mode} unexpectedly succeeded without apply`)
        assert.match(result.stderr, /requires --apply/, `${mode} did not fail at the apply gate`)
      }
    }
    assert.equal(existsSync(calls), false, 'a no-apply request reached Docker')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('run accepts the exact Worker bundle without env, rejects env and never prints the report secret', () => {
  const item = fixture()
  const attestationSecret = 'do-not-print-scientific-v2-report-secret'
  const manifest = {
    codeSha: item.sha,
    registryHash,
    suiteHash,
    priceHash,
    manifestHash,
    models: Array.from({ length: modelCount }, (_, index) => ({ id: `model-${index + 1}` })),
    cases: Array.from({ length: 9 }, (_, index) => ({ id: `case-${index + 1}` })),
    providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 360 },
    codexLimits: { modelId: 'codex:gpt-image-2', successfulSlots: 9, maxAttemptsPerSlot: 4, maxToolCalls: 36 },
    concurrency: 1,
    lockName,
  }
  const runBundle = {
    operation: 'run',
    gate: { enabled: false, concurrency: 1, lockName },
    executionPhase: 'full', manifestCodeSha: item.sha, executionCodeSha: item.sha, legacyRecoveryStateHash: null,
    manifest,
    state: { manifestHash, status: 'canary_complete' },
    report: { batchId: 'scientific-v2-production-run', revision: 1, createdAt: '2026-08-31T06:00:00.000Z', attestationSecret },
  }
  try {
    const bundleHash = item.writeBundle(runBundle)
    const valid = item.run('run', ['--bundle-sha256', bundleHash])
    assert.equal(valid.status, 0, valid.stderr)
    assert.equal(JSON.parse(valid.stdout).dryRun, true)
    assert.doesNotMatch(`${valid.stdout}${valid.stderr}`, new RegExp(attestationSecret))

    const legacyCodeSha = 'f'.repeat(40)
    const legacyStateHash = 'a'.repeat(64)
    const recoveryHash = item.writeBundle({
      ...runBundle,
      executionPhase: 'canary-only', manifestCodeSha: legacyCodeSha, executionCodeSha: item.sha,
      legacyRecoveryStateHash: legacyStateHash, manifest: { ...manifest, codeSha: legacyCodeSha },
      state: { manifestHash, status: 'blocked', blockReason: 'provider_canary_failed', pauseReason: null, stateHash: legacyStateHash },
    })
    const recovery = item.run('run', ['--bundle-sha256', recoveryHash])
    assert.equal(recovery.status, 0, recovery.stderr)

    const invalidRecoveryHash = item.writeBundle({
      ...runBundle, manifestCodeSha: legacyCodeSha, manifest: { ...manifest, codeSha: legacyCodeSha },
    })
    const invalidRecovery = item.run('run', ['--bundle-sha256', invalidRecoveryHash])
    assert.notEqual(invalidRecovery.status, 0)

    const withEnvHash = item.writeBundle({
      ...runBundle,
      env: {
        PAPERBANANA_BENCH_ENABLED: 'false',
        PAPERBANANA_BENCH_CONCURRENCY: '1',
        PAPERBANANA_SCIENTIFIC_V2_RUN_ENABLED: 'true',
        PAPERBANANA_SCIENTIFIC_V2_HOST_LOCK_PROOF: lockName,
      },
    })
    const withEnv = item.run('run', ['--bundle-sha256', withEnvHash])
    assert.notEqual(withEnv.status, 0)
    assert.doesNotMatch(`${withEnv.stdout}${withEnv.stderr}`, new RegExp(attestationSecret))

    const missingSecretHash = item.writeBundle({ ...runBundle, report: { ...runBundle.report, attestationSecret: '' } })
    const missingSecret = item.run('run', ['--bundle-sha256', missingSecretHash])
    assert.notEqual(missingSecret.status, 0)
    assert.doesNotMatch(`${missingSecret.stdout}${missingSecret.stderr}`, /do-not-print/i)
  } finally { item.cleanup() }
})

test('run rejects malformed report metadata before any run and emits no partial stdout', () => {
  const item = fixture()
  const manifest = {
    codeSha: item.sha, registryHash, suiteHash, priceHash, manifestHash,
    models: Array.from({ length: modelCount }, (_, index) => ({ id: `model-${index + 1}` })),
    cases: Array.from({ length: 9 }, (_, index) => ({ id: `case-${index + 1}` })),
    providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 360 },
    codexLimits: { modelId: 'codex:gpt-image-2', successfulSlots: 9, maxAttemptsPerSlot: 4, maxToolCalls: 36 },
    concurrency: 1, lockName,
  }
  const base = {
    operation: 'run', gate: { enabled: false, concurrency: 1, lockName }, manifest,
    executionPhase: 'full', manifestCodeSha: item.sha, executionCodeSha: item.sha, legacyRecoveryStateHash: null,
    state: { manifestHash, status: 'canary_complete' },
    report: { batchId: 'scientific-v2-production-run', revision: 1, createdAt: '2026-08-31T06:00:00.000Z', attestationSecret: 'x'.repeat(32) },
  }
  try {
    for (const [name, report] of [
      ['short-secret', { ...base.report, attestationSecret: 'x'.repeat(31) }],
      ['long-secret', { ...base.report, attestationSecret: 'x'.repeat(4097) }],
      ['multibyte-short-secret', { ...base.report, attestationSecret: '界'.repeat(10) }],
      ['trimmed-secret', { ...base.report, attestationSecret: ` ${'x'.repeat(32)}` }],
      ['invalid-date', { ...base.report, createdAt: '2026-02-30T06:00:00.000Z' }],
      ['invalid-batch', { ...base.report, batchId: 'bad batch' }],
      ['short-batch', { ...base.report, batchId: 'ab' }],
      ['zero-revision', { ...base.report, revision: 0 }],
      ['fractional-revision', { ...base.report, revision: 1.5 }],
    ]) {
      const bundleHash = item.writeBundle({ ...base, report })
      const result = item.run('run', ['--bundle-sha256', bundleHash])
      assert.notEqual(result.status, 0, name)
      assert.equal(result.stdout, '', name)
      assert.doesNotMatch(result.stderr, /x{16}|界|bad batch/i, name)
    }
  } finally { item.cleanup() }
})

test('validated run stdout is the complete signed report accepted by the API normalizer', () => {
  const item = fixture()
  const secret = 'wrapper-api-import-contract-secret-32-bytes'
  const slots = Array.from({ length: modelCount * 9 }, (_, index) => ({
    slotId: `slot-${index + 1}`, provider: index < 9 ? 'codex' : 'bailian', attempts: index < 9 ? [] : [{}],
  }))
  const stateBase = { manifestHash, status: 'awaiting_artifacts', slots }
  const state = { ...stateBase, stateHash: canonicalHash(stateBase) }
  const reportBase = {
    schemaVersion: 2,
    identity: {
      suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2',
      evaluationEpoch: 'codex-scientific-2026-09-v1', reviewProtocol: 'codex-independent-double-review-v2',
      presentationVersion: 'scientific-leaderboard-v2',
    },
    kind: 'worker', batchId: 'scientific-v2-production-run', batchManifestHash: manifestHash, revision: 1,
    previousStateHash: 'f'.repeat(64), stateHash: state.stateHash, state,
    manifestCodeSha: item.sha, executionCodeSha: item.sha, legacyRecoveryStateHash: null,
    providerCanaryAttestation: { providers: ['bailian'], passed: true, attemptSetHash: 'a'.repeat(64) },
    executionOrderAttestation: { slotIds: slots.map((slot) => slot.slotId), passed: true },
    codexProvenance: null, disclosure: null, createdAt: '2026-08-31T06:00:00.000Z',
  }
  const report = { ...reportBase, reportHash: canonicalHash(reportBase) }
  const signed = {
    report, reportHash: report.reportHash,
    attestationHash: createHmac('sha256', secret).update(report.reportHash).digest('hex'),
  }
  const manifest = {
    codeSha: item.sha, registryHash, suiteHash, priceHash, manifestHash,
    models: Array.from({ length: modelCount }, (_, index) => ({ id: `model-${index + 1}` })),
    cases: Array.from({ length: 9 }, (_, index) => ({ id: `case-${index + 1}` })),
    providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 360 },
    codexLimits: { modelId: 'codex:gpt-image-2', successfulSlots: 9, maxAttemptsPerSlot: 4, maxToolCalls: 36 },
    concurrency: 1, lockName,
  }
  try {
    const bundleHash = item.writeBundle({
      operation: 'run', gate: { enabled: false, concurrency: 1, lockName }, manifest,
      executionPhase: 'full', manifestCodeSha: item.sha, executionCodeSha: item.sha, legacyRecoveryStateHash: null,
      state: { manifestHash, status: 'canary_complete' }, report: { batchId: report.batchId, revision: report.revision, createdAt: report.createdAt, attestationSecret: secret },
    })
    const resultPath = join(item.root, 'tmp/signed-result.json')
    writeFileSync(resultPath, `${JSON.stringify(signed)}\n`, { mode: 0o600 })
    const result = item.run('run', ['--bundle-sha256', bundleHash], { PAPERBANANA_SCIENTIFIC_V2_TEST_SIGNED_RESULT: resultPath })
    assert.equal(result.status, 0, JSON.stringify({ stdout: result.stdout, stderr: result.stderr, signal: result.signal, error: result.error?.message }))
    assert.deepEqual(JSON.parse(result.stdout), signed)
    assert.doesNotMatch(result.stderr, new RegExp(secret))
    assert.match(result.stderr, /providerCalls[\s\S]*stateHash[\s\S]*reportHash/)

    const api = spawnSync('pnpm', [
      '--filter', '@paperbanana/paperbanana-api', 'exec', 'tsx', '--eval',
      'import {readFileSync} from "node:fs"; import {normalizeScientificV2SignedStateOperationReport as normalize} from "./src/scientific-v2-repository.ts"; const value=JSON.parse(readFileSync(0,"utf8")); process.stdout.write(JSON.stringify(normalize(value,process.argv[1])))',
      secret,
    ], { cwd: repositoryRoot, input: result.stdout, encoding: 'utf8' })
    assert.equal(api.status, 0, api.stderr)
    assert.deepEqual(JSON.parse(api.stdout), signed)

    const invalidPath = join(item.root, 'tmp/invalid-result.json')
    writeFileSync(invalidPath, `${JSON.stringify({ ...signed, extra: true })}\n`, { mode: 0o600 })
    const invalid = item.run('run', ['--bundle-sha256', bundleHash], { PAPERBANANA_SCIENTIFIC_V2_TEST_SIGNED_RESULT: invalidPath })
    assert.notEqual(invalid.status, 0)
    assert.equal(invalid.stdout, '')
  } finally { item.cleanup() }
})

test('run output validation accepts only the signed Worker report and derives a bounded safe summary', () => {
  const source = readFileSync(operator, 'utf8')
  assert.match(source, /\["attestationHash","report","reportHash"\]/)
  assert.match(source, /\["batchId","batchManifestHash","codexProvenance","createdAt","disclosure","executionCodeSha","executionOrderAttestation","identity","kind","legacyRecoveryStateHash","manifestCodeSha","previousStateHash","providerCanaryAttestation","reportHash","revision","schemaVersion","state","stateHash"\]/)
  assert.match(source, /\.report[.]kind == "worker"/)
  assert.match(source, /\.report[.]codexProvenance == null and \.report[.]disclosure == null/)
  assert.match(source, /\.reportHash == \.report[.]reportHash/)
  assert.match(source, /\.report[.]stateHash == \.report[.]state[.]stateHash/)
  assert.match(source, /select\([.]provider != null and [.]provider != "codex"\)/)
  assert.match(source, /providerCalls[\s\S]*providerSlots[\s\S]*\* 4/)
  assert.ok(source.indexOf('as $providerCalls |') < source.indexOf('((keys | sort) == ["attestationHash","report","reportHash"])'))
  assert.match(source, /scientific-v2-audit-summary[\s\S]*stateHash[\s\S]*reportHash/)
  const finalSummary = source.slice(source.lastIndexOf('docker exec "$worker_id" node -e'))
  const inspectSummary = finalSummary.match(/if \[\[ "\$mode" == inspect \]\]; then([\s\S]*?)^(?:elif|else)/m)?.[1] || ''
  assert.match(inspectSummary, /jq -cn/)
  assert.doesNotMatch(inspectSummary, /reportHash/)
  assert.match(source, /jq -c [.] "\$result_path"/)
  assert.doesNotMatch(source, /jq -r [.]report(?:\s|$)|jq -r [.]attestationHash(?:\s|$)/m)
})

test('manual workflow defaults to inspect and cannot widen deployment or leak credentials', () => {
  assert.equal(existsSync(workflow), true)
  const source = readFileSync(workflow, 'utf8')
  assert.match(source, /workflow_dispatch:/)
  assert.match(source, /GITHUB_SHA[\s\S]*EXPECTED_SHA/)
  assert.match(source, /ssh[\s\S]*git rev-parse[\s\S]*git diff --quiet[\s\S]*run-scientific-v2-operator[.]yml[\s\S]*compose[.]yaml[\s\S]*run-scientific-v2-operator[.]sh[\s\S]*ssh/)
  assert.match(source, /mode:[\s\S]*default:\s*inspect[\s\S]*options:[\s\S]*inspect[\s\S]*run/)
  for (const input of ['expected_deployed_sha', 'bundle_sha256', 'registry_hash', 'suite_hash', 'price_hash', 'manifest_hash', 'model_count', 'confirm']) {
    assert.match(source, new RegExp(`${input}:[\\s\\S]*required:\\s*true`))
  }
  assert.match(source, /environment:\s*paperbanana-production/)
  assert.match(source, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/)
  assert.match(source, /run-scientific-v2-operator[.]sh/)
  assert.match(source, /run-exact-scientific-v2-bundle-disabled-worker/)
  assert.match(source, /inspect-scientific-v2-disabled-worker/)
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|OSS_ACCESS_KEY_SECRET|docker\s+(?:build|pull)|compose[^\n]*(?:up|pull)|build-images/)
})

test('long-running scientific v2 SSH sessions send keepalives so results survive idle network timeouts', () => {
  for (const workflowPath of [workflow, failureInspectionWorkflow]) {
    const source = readFileSync(workflowPath, 'utf8')
    assert.match(source, /ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=120 /)
  }
})

test('unknown-outcome inspection uses the persisted attempt window after the started dispatch marker is finalized', () => {
  const source = readFileSync(failureInspectionWorkflow, 'utf8')
  assert.match(source, /slot[.]status==="unknown"/)
  assert.match(source, /attempt[.]responseClass!=="unknown_provider_outcome"/)
  assert.match(source, /new Date\(attempt[.]startedAt\)[.]getTime\(\)/)
  assert.match(source, /dispatchMarkerPresent/)
  assert.doesNotMatch(source, /if\(!batch\|\|!marker\)throw new Error\("SCIENTIFIC_V2_UNRESOLVED_MARKER_NOT_FOUND"\)/)
  assert.match(source, /artifact_diagnostic="\$\(docker exec/)
  assert.match(source, /marker_started_at="\$\(jq -er '[^']*[.]startedAt/)
  assert.match(source, /marker_completed_at="\$\(jq -er '[^']*[.]completedAt/)
  assert.doesNotMatch(source, /marker_started_at=.*mongosh/)
})

test('Codex artifacts stage only from an exact private draft asset into a root protected manifest directory', () => {
  const source = readFileSync(codexArtifactStagingWorkflow, 'utf8')
  assert.match(source, /permissions:\s*\n\s+#[^\n]*\n\s+#[^\n]*\n\s+contents: write/)
  assert.match(source, /[.]draft == true/)
  assert.match(source, /releases\/assets\/\$ASSET_ID/)
  assert.match(source, /sha256sum "\$archive"/)
  assert.match(source, /PAPERBANANA_BENCH_ENABLED!=="false"/)
  assert.match(source, /install -d -o 0 -g 1000 -m 0550/)
  assert.match(source, /install -o 0 -g 1000 -m 0440/)
  assert.match(source, /metadata[.]json/)
  assert.match(source, /METADATA_SHA/)
  assert.match(source, /install -d -o 0 -g 0 -m 0700 "\$destination_root"/)
  assert.match(source, /validate_destination/)
  assert.match(source, /replayed/)
  assert.match(source, /providerCalls\":0/)
  assert.doesNotMatch(source, /gh release|gh api --method (?:POST|PATCH|DELETE)|PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|set -x|printenv|rm -rf/)
})

test('Codex import bundle is derived under the production lock from exact attested state and staged metadata without provider credentials', () => {
  const source = readFileSync(codexImportStagingWorkflow, 'utf8')
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /PAPERBANANA_BENCH_ENABLED!===?"false"/)
  assert.match(source, /manifest_sha256/)
  assert.match(source, /state_sha256/)
  assert.match(source, /attestation_result_sha256/)
  assert.match(source, /metadata_sha256/)
  assert.match(source, /metadata[.]json/)
  assert.match(source, /paperbanana\/scientific-v2\/operator-attestation\/v1/)
  assert.match(source, /['"]operation['"]:\s*['"]import_codex['"]/)
  assert.match(source, /providerCalls\":0/)
  assert.match(source, /install -o 0 -g 0 -m 0600/)
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|set -x|printenv|rm -rf/)
})

test('scientific v2 admin input accepts only an exact draft JSON asset and a closed mutation schema set', () => {
  const source = readFileSync(adminInputStagingWorkflow, 'utf8')
  assert.match(source, /permissions:\s*\n\s+#[^\n]*\n\s+contents: write/)
  assert.match(source, /[.]draft == true/)
  assert.match(source, /releases\/assets\/\$ASSET_ID/)
  assert.match(source, /import-worker\|import-codex\|export-review\|import-review\|import-arbitration\|publish/)
  assert.match(source, /\["attestationHash","report","reportHash"\]/)
  assert.match(source, /\["assignment","batchId","objectBindings"\]/)
  assert.match(source, /\["batchId","result"\]/)
  assert.match(source, /\["arbitration","arbitrationHash","attestationHash","batchId"\]/)
  assert.match(source, /\["batchId","evidence","objectBindings"\]/)
  assert.match(source, /destination_root=\/opt\/paperbanana\/operator-private\/scientific-v2\/admin-inputs/)
  assert.match(source, /destination="\$destination_root\/\$ASSET_SHA[.]json"/)
  assert.match(source, /install -o 0 -g 0 -m 0600/)
  assert.match(source, /providerCalls\":0/)
  assert.doesNotMatch(source, /gh release|gh api --method (?:POST|PATCH|DELETE)|PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|set -x|printenv|rm -rf/)
})

test('review pack bundle is derived offline from one exact completed state with automatic judges fixed to zero', () => {
  const source = readFileSync(reviewPackStagingWorkflow, 'utf8')
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /--network none/)
  assert.match(source, /scientific-v2-review-pack-stager[.]ts/)
  assert.match(source, /--bundle --platform=node --target=node24 --format=esm/)
  assert.match(source, /--external:sharp/)
  assert.match(source, /STAGER_SHA/)
  assert.match(source, /scientific-v2-review-pack-stager[.]mjs:ro/)
  assert.match(source, /[.]operation\s*==\s*["']review_pack["']/)
  assert.match(source, /automaticJudgeCalls\":0/)
  assert.match(source, /providerCalls\":0/)
  assert.match(source, /install -o 0 -g 0 -m 0600/)
  assert.doesNotMatch(source, /import \{ canonicalHash, createScientificReviewPacket \} from "@paperbanana\/benchmark-core"/)
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|set -x|printenv|rm -rf/)
})

test('public rendition bundle binds the same completed state and cannot publish or call a provider', () => {
  const source = readFileSync(publicRenderStagingWorkflow, 'utf8')
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /state[.]get\(['"]status['"]\)\s*!=\s*['"]completed['"]/)
  assert.match(source, /paperbanana\/scientific-v2\/operator-attestation\/v1/)
  assert.match(source, /['"]operation['"]:\s*['"]render_public_evidence['"]/)
  assert.match(source, /providerCalls\":0/)
  assert.match(source, /install -o 0 -g 0 -m 0600/)
  assert.doesNotMatch(source, /adminBenchmarkPublish|operation['"]:\s*['"]publish['"]|PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|set -x|printenv|rm -rf/)
})

test('blind assignment export keeps mappings on-host and uploads only short-lived public A/B packages', () => {
  const source = readFileSync(reviewAssignmentExportWorkflow, 'utf8')
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /review-private[.]json/)
  assert.match(source, /privateBundleHash/)
  assert.match(source, /admin-inputs/)
  assert.match(source, /public-reviewer-[AB][.]json/)
  assert.match(source, /retention-days:\s*1/)
  assert.match(source, /providerCalls['"]?:\s*0/)
  assert.match(source, /--mode review_pack/)
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|set -x|printenv|rm -rf/)
})

test('review validation bundle accepts one exact blind submission and restores private mapping only on-host', () => {
  const source = readFileSync(reviewValidationStagingWorkflow, 'utf8')
  assert.match(source, /permissions:\s*\n\s+#[^\n]*\n\s+contents: write/)
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /review-private[.]json/)
  assert.match(source, /review_validate/)
  assert.match(source, /privateAssignment/)
  assert.match(source, /publicAssignment/)
  assert.match(source, /install -o 0 -g 0 -m 0600/)
  assert.match(source, /providerCalls['"]?:\s*0/)
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|set -x|printenv|rm -rf/)
})

test('validated review result becomes a root-only admin import without leaving the host', () => {
  const source = readFileSync(reviewResultImportStagingWorkflow, 'utf8')
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /review-validated[.]json/)
  assert.match(source, /admin-inputs/)
  assert.match(source, /resultAttestationHash/)
  assert.match(source, /install -o 0 -g 0 -m 0600/)
  assert.match(source, /providerCalls['"]?:\s*0/)
  assert.doesNotMatch(source, /scp|gh api|PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|set -x|printenv|rm -rf/)
})

test('review dispute export derives only blind xhigh work and never exports mappings or secrets', () => {
  const source = readFileSync(reviewDisputeExportWorkflow, 'utf8')
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /review-validated[.]json/)
  assert.match(source, /finalizeScientificDoubleReview/)
  assert.match(source, /public-arbitration[.]json/)
  assert.match(source, /automaticJudgeCalls/)
  assert.match(source, /retention-days:\s*1/)
  assert.match(source, /--network none/)
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|set -x|printenv|rm -rf/)
})

test('xhigh arbitration bundle binds exact disputes and both signed reviewer results with zero providers', () => {
  const source = readFileSync(arbitrationStagingWorkflow, 'utf8')
  assert.match(source, /permissions:\s*\n\s+#[^\n]*\n\s+contents: write/)
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /review-validated[.]json/)
  assert.match(source, /reasoningEffort.*xhigh/)
  assert.match(source, /review_arbitrate/)
  assert.match(source, /automaticJudges.*\[\]/)
  assert.match(source, /install -o 0 -g 0 -m 0600/)
  assert.match(source, /providerCalls['"]?:\s*0/)
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|set -x|printenv|rm -rf/)
})

test('validated arbitration is re-attested for the API only inside the root admin handoff', () => {
  const source = readFileSync(arbitrationImportStagingWorkflow, 'utf8')
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /review-arbitrated[.]json/)
  assert.match(source, /arbitrationHash/)
  assert.match(source, /attestationHash/)
  assert.match(source, /admin-inputs/)
  assert.match(source, /install -o 0 -g 0 -m 0600/)
  assert.match(source, /providerCalls['"]?:\s*0/)
  assert.doesNotMatch(source, /scp|gh api|PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|set -x|printenv|rm -rf/)
})

test('rendered public evidence publish input stays root-only until atomic API publish', () => {
  const source = readFileSync(publishInputStagingWorkflow, 'utf8')
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /publish-input[.]json/)
  assert.match(source, /publishInputHash/)
  assert.match(source, /admin-inputs/)
  assert.match(source, /install -o 0 -g 0 -m 0600/)
  assert.match(source, /providerCalls['"]?:\s*0/)
  assert.doesNotMatch(source, /scp|gh api|PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY|set -x|printenv|rm -rf/)
})

test('current frozen batch has a dedicated zero-provider public render runner with the correct runtime schema', () => {
  const source = readFileSync(publicRenderRunWorkflow, 'utf8')
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /render_public_evidence/)
  assert.match(source, /publishInput[.]batchId/)
  assert.match(source, /publishInputHash/)
  assert.match(source, /publish-input[.]json/)
  assert.match(source, /install -d -o 0 -g 0 -m 0700 "\$private_root"/)
  assert.match(source, /scientific-v2-public-renderer[.]mjs/)
  assert.match(source, /SCRIPT_SHA/)
  assert.match(source, /CONTROL_SHA/)
  assert.match(source, /-v "\$input_dir\/renderer[.]mjs:\/app\/scientific-v2-public-renderer[.]mjs:ro"/)
  assert.match(source, /benchmark-operator node \/app\/scientific-v2-public-renderer[.]mjs/)
  assert.doesNotMatch(source, /node --input-type=module < "\$root_script"/)
  assert.match(source, /render_output="\$\(/)
  assert.match(source, /printf '%s\\n' "\$render_output" >"\$result"/)
  assert.match(source, /render_public_evidence_access/)
  assert.match(source, /samePrincipal/)
  assert.match(source, /sameBucket/)
  assert.match(source, /client[.]head/)
  assert.match(source, /client[.]getStream/)
  assert.match(source, /client[.]getACL/)
  assert.match(source, /PAPERBANANA_BENCH_(?:BAILIAN|ARK|OPENROUTER)_API_KEY=/)
  assert.match(source, /providerCalls['"]?:\s*0/)
  assert.doesNotMatch(source, /set -x|printenv|rm -rf/)
})

test('manual workflow exposes the complete protected scientific v2 phase set with exact per-phase confirmation', () => {
  const source = readFileSync(workflow, 'utf8')
  const confirmations = {
    inspect: 'inspect-scientific-v2-disabled-worker',
    run: 'run-exact-scientific-v2-bundle-disabled-worker',
    reconcile_artifact: 'reconcile-artifact-scientific-v2-disabled-worker',
    import_codex: 'import-codex-scientific-v2-disabled-worker',
    render_public_evidence: 'render-public-evidence-scientific-v2-disabled-worker',
    review_pack: 'review-pack-scientific-v2-disabled-worker',
    review_finalize: 'review-finalize-scientific-v2-disabled-worker',
  }
  for (const [mode, confirmation] of Object.entries(confirmations)) {
    assert.match(source, new RegExp(`\\n\\s+- ${mode}(?:\\n|$)`), `${mode} must be selectable`)
    assert.match(source, new RegExp(confirmation), `${mode} needs an exact confirmation`)
  }
  assert.doesNotMatch(source, /(?:publish_scientific_v2|mongo(?:sh)?[^\n]*(?:insert|update)|releases\.(?:insert|update))/i)
})

test('host operator classifies zero-provider phases and mounts the persistent artifact spool only for run and reconcile', () => {
  const source = readFileSync(operator, 'utf8')
  assert.match(source, /zero_provider_modes=.*inspect.*reconcile_artifact.*import_codex.*render_public_evidence.*review_pack.*review_finalize/)
  assert.match(source, /PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR/)
  assert.match(source, /\/opt\/paperbanana\/data\/scientific-v2-artifact-spool/)
  assert.match(source, /\/var\/lib\/paperbanana\/scientific-v2-artifact-spool/)
  assert.match(source, /spool_rw_modes=.*run.*reconcile_artifact/)
  assert.match(source, /providerCalls[^\n]*0/)
  assert.doesNotMatch(source, /(?:^|\s)-v\s+\/(?:opt|var|run|home)(?::|\/)(?!paperbanana\/data\/scientific-v2-artifact-spool)/m)
})

test('compose and bootstrap provision one exact service-owned 0700 artifact spool with at least 25 MiB free', () => {
  const compose = readFileSync(new URL('../compose.yaml', import.meta.url), 'utf8')
  const bootstrap = readFileSync(new URL('../scripts/bootstrap-host.sh', import.meta.url), 'utf8')
  const operatorBlock = compose.match(/\n  benchmark-operator:\n([\s\S]*?)\n  auth-gateway:/)?.[1] || ''
  assert.ok(operatorBlock)
  assert.doesNotMatch(operatorBlock, /scientific-v2-artifact-spool/)
  assert.match(bootstrap, /install -d -o 1000 -g 1000 -m 0700 \/opt\/paperbanana\/data\/scientific-v2-artifact-spool/)
  assert.match(bootstrap, /1073741824/)
  assert.match(operatorBlock, /user:\s*["']?1000:1000["']?/)
})

test('review packing uses an exclusive 0600 private sink and zero-provider stages do not expose secrets on stdout', () => {
  const source = readFileSync(operator, 'utf8')
  assert.match(source, /PAPERBANANA_SCIENTIFIC_V2_PRIVATE_OUTPUT_PATH/)
  assert.match(source, /review-private/)
  assert.match(source, /stat_triplet[\s\S]*0?600/)
  assert.match(source, /privateOutputWritten/)
  const offline = source.match(/run_offline_review\(\) \{([\s\S]*?)^\}/m)?.[1] || ''
  assert.match(offline, /docker run[\s\S]*--network none[\s\S]*--read-only/)
  assert.match(offline, /--user "\$service_uid:\$service_gid"/)
  assert.doesNotMatch(offline, /docker compose|bench[.]env|backend|egress|API_KEY|ACCESS_KEY/)
  assert.doesNotMatch(source, /cat\s+[^\n]*(?:private|bundle|bench[.]env)|set -x|printenv/)
})

test('render keeps API publish input off stdout and persists it only in the protected 0600 handoff', () => {
  const source = readFileSync(operator, 'utf8')
  assert.match(source, /publish-input[.]json/)
  assert.match(source, /render_public_evidence[\s\S]*publishInputHash[\s\S]*privateOutputWritten/)
  assert.doesNotMatch(source, /[.]publishInput[.]batchId\s*==\s*[.]batchId/)
  const finalRender = source.slice(source.lastIndexOf('elif [[ "$mode" == render_public_evidence ]]')).match(/then([\s\S]*?)^else/m)?.[1] || ''
  assert.match(finalRender, /providerCalls:0/)
  assert.match(finalRender, /batch_id=.*[.]publishInput[.]batchId/)
  assert.doesNotMatch(finalRender, /jq -c [.] "\$result_path"|publishInput:/)
})

test('every protected zero-provider phase binds the same manifest and rejects cross-manifest replay before execution', () => {
  const item = fixture()
  const manifest = {
    codeSha: item.sha, registryHash, suiteHash, priceHash, manifestHash,
    models: Array.from({ length: modelCount }, (_, index) => ({ id: `model-${index}` })),
  }
  const state = { manifestHash, stateHash: 'f'.repeat(64) }
  const gate = { enabled: false, concurrency: 1, lockName }
  const reviewer = (role) => ({ role, batchManifestHash: manifestHash, sourceSetHash: '9'.repeat(64), assignmentSet: { batchManifestHash: manifestHash } })
  const bundles = {
    reconcile_artifact: { operation: 'reconcile_artifact', gate, manifest, state, input: { batchId: 'batch-a', slotId: 'slot-a', attemptIndex: 1, imageHash: '8'.repeat(64) } },
    import_codex: { operation: 'import_codex', gate, input: { manifestHash, stateHash: state.stateHash, manifest, state } },
    render_public_evidence: { operation: 'render_public_evidence', gate, manifest, state, input: { batchId: 'batch-a' } },
    review_pack: { operation: 'review_pack', gate, input: { batchManifestHash: manifestHash, manifest, state } },
    review_finalize: { operation: 'review_finalize', gate, input: { reviewerA: reviewer('A'), reviewerB: reviewer('B'), automaticJudges: [] } },
  }
  try {
    for (const [mode, bundle] of Object.entries(bundles)) {
      const hash = item.writeBundle(bundle)
      const accepted = item.run(mode, ['--bundle-sha256', hash])
      assert.equal(accepted.status, 0, `${mode}: ${accepted.stderr}`)
      assert.notEqual(accepted.stdout, '', `${mode} emitted no dry-run proof: ${JSON.stringify(accepted)}`)
      assert.equal(JSON.parse(accepted.stdout).providerCalls, 0)

      const crossed = structuredClone(bundle)
      if (mode === 'review_finalize') crossed.input.reviewerB.batchManifestHash = '7'.repeat(64)
      else if (mode === 'import_codex') crossed.input.state.manifestHash = '7'.repeat(64)
      else if (mode === 'review_pack') crossed.input.state.manifestHash = '7'.repeat(64)
      else crossed.state.manifestHash = '7'.repeat(64)
      const crossedHash = item.writeBundle(crossed)
      const rejected = item.run(mode, ['--bundle-sha256', crossedHash])
      assert.notEqual(rejected.status, 0, `${mode} accepted a cross-manifest bundle`)
      assert.equal(rejected.stdout, '')
    }
  } finally { item.cleanup() }
})
