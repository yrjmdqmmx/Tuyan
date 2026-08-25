import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { createHash } from 'node:crypto'

const script = fileURLToPath(new URL('../scripts/run-benchmark-phase-operator.sh', import.meta.url))
const verifier = fileURLToPath(new URL('../scripts/verify-benchmark-phase-attestation.mjs', import.meta.url))
const workflow = fileURLToPath(new URL('../../../.github/workflows/run-benchmark-phase-operator.yml', import.meta.url))
const sha = 'a'.repeat(40)
const hash = 'b'.repeat(64)
const normalize = (value) => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, normalize(child)])) : value
const canonicalHash = (value) => createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex')

function immutableFixture() {
  const runFacts = { runId: 'bench-run-0123456789abcdef0123', modelCandidateId: 'ark:model', provider: 'ark', modelId: 'doubao-seedream-test', developer: 'Maker', lane: '2K-standard', aspectRatios: ['16:9', '1:1'], suiteId: 'pb-image-diagnostic-v1', suiteHash: hash, judgeEpoch: 'judge-2026-08-v1', reviewerEpoch: 'codex-2026-08-v1', registryHash: 'registry-hash', codeSha: sha, createdAt: '2026-08-25T06:00:00.000Z' }
  const candidateSnapshot = { schemaVersion: 1, candidateId: 'ark:model', provider: 'ark', modelId: 'doubao-seedream-test', developer: 'Maker', lane: '2K-standard', aspectRatios: ['16:9', '1:1'], registryHash: 'registry-hash', displayName: 'Model', providerLabel: 'Ark' }
  const immutableFacts = { runHash: canonicalHash(runFacts), runFacts, candidateSnapshot, runIntegrityAttestation: 'f'.repeat(64) }
  return { immutableFacts, immutableFactsHash: canonicalHash(immutableFacts), runHash: immutableFacts.runHash, runFactsHash: canonicalHash(runFacts), candidateSnapshotHash: canonicalHash(candidateSnapshot), aspectRatiosHash: canonicalHash(runFacts.aspectRatios), registryHash: runFacts.registryHash, runIntegrityAttestation: immutableFacts.runIntegrityAttestation }
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'paperbanana-phase-operator-'))
  const deploy = join(root, 'opt/paperbanana/repo/deploy/hk-single-host')
  const secrets = join(root, 'opt/paperbanana/secrets')
  mkdirSync(deploy, { recursive: true }); mkdirSync(secrets, { recursive: true })
  writeFileSync(join(root, '.paperbanana-hk-test-root'), 'paperbanana-hk-test-root-v1\n', { mode: 0o600 })
  writeFileSync(join(deploy, '.env'), 'PAPERBANANA_BENCH_SECRET_MODE=configured-disabled\n', { mode: 0o600 })
  const gatewayToken = 'g'.repeat(48); const adminTransportToken = 't'.repeat(48)
  writeFileSync(join(secrets, 'core.env'), `PAPERBANANA_CODE_SHA=${sha}\nPAPERBANANA_GATEWAY_TOKEN=${gatewayToken}\nPAPERBANANA_ADMIN_TRANSPORT_TOKEN=${adminTransportToken}\n`, { mode: 0o600 })
  writeFileSync(join(secrets, 'bench.env'), `PAPERBANANA_CODE_SHA=${sha}\nPAPERBANANA_BENCH_ENABLED=false\nPAPERBANANA_BENCH_CONCURRENCY=1\n`, { mode: 0o600 })
  writeFileSync(join(secrets, 'gateway.env'), `ADMIN_USER_IDS=immutable-admin-id\nPAPERBANANA_GATEWAY_TOKEN=${gatewayToken}\nPAPERBANANA_ADMIN_TRANSPORT_TOKEN=${adminTransportToken}\n`, { mode: 0o600 })
  chmodSync(root, 0o700); chmodSync(deploy, 0o700); chmodSync(secrets, 0o700)
  const args = ['--phase', 'quick', '--run-id', 'bench-run-0123456789abcdef0123', '--expected-sha', sha,
    '--provider', 'ark', '--model-id', 'doubao-seedream-test', '--lane', '2K-standard', '--suite-id', 'pb-image-diagnostic-v1',
    '--suite-hash', hash, '--judge-epoch', 'judge-2026-08-v1', '--judge-stack-hash', hash,
    '--signed-authorization-hash', hash, '--price-hash', hash, '--run-hash', hash, '--run-facts-hash', hash,
    '--candidate-snapshot-hash', hash, '--aspect-ratios-hash', hash, '--registry-hash', 'registry-hash', '--run-integrity-attestation', hash, '--immutable-facts-hash', hash,
    '--max-generations', '24', '--max-judgments', '48', '--max-judge-calls', '192',
    '--max-estimated-usd', '12', '--estimated-per-generation-usd', '0.1', '--estimated-per-judge-call-usd', '0.05',
    '--price-currency', 'USD', '--price-source', 'https://example.com/pricing/image-model', '--price-captured-at', '2026-08-25T08:00:00.000Z',
    '--confirm', 'run-exact-approved-quick-phase-disabled-worker']
  return { root, run(extra = []) { return spawnSync(script, [...args, ...extra], { encoding: 'utf8', env: { ...process.env, PAPERBANANA_HK_TEST_ROOT: root } }) }, cleanup() { rmSync(root, { recursive: true, force: true }) } }
}

test('bounded phase host operator is executable, lock-scoped and one-shot', () => {
  assert.equal(existsSync(script), true)
  assert.equal(statSync(script).mode & 0o111, 0o111)
  const source = readFileSync(script, 'utf8')
  assert.match(source, /paperbanana-hk-production\.lock/)
  assert.ok(source.indexOf('flock -x 9') < source.indexOf('for path in "$deploy_env"'))
  assert.match(source, /configured-disabled/)
  assert.match(source, /PAPERBANANA_BENCH_ENABLED[\s\S]*false/)
  assert.match(source, /PAPERBANANA_BENCH_CONCURRENCY[\s\S]*1/)
  assert.match(source, /build-provenance\.json/)
  assert.match(source, /run[\s\S]*--rm[\s\S]*--no-deps[\s\S]*phase-operator\.mjs/)
  assert.match(source, /gateway_env=.*gateway\.env/)
  assert.match(source, /for path in "\$deploy_env" "\$core_env" "\$bench_env" "\$gateway_env"/)
  assert.match(source, /phaseOperatorAttestation/)
  assert.match(source, /PAPERBANANA_GATEWAY_TOKEN/)
  assert.match(source, /PAPERBANANA_ADMIN_TRANSPORT_TOKEN/)
  assert.match(source, /core_gateway_token.*gateway_token/)
  assert.match(source, /core_admin_transport_token.*admin_transport_token/)
  assert.match(source, /verify-benchmark-phase-attestation\.mjs/)
  assert.match(source, /chmod 0600[^\n]*attestation_file/)
  assert.ok(source.indexOf('phaseOperatorAttestation') < source.indexOf('node dist/phase-operator.mjs'))
  assert.ok(source.indexOf('verify-benchmark-phase-attestation.mjs') < source.indexOf('node dist/phase-operator.mjs'))
  assert.match(source, /BENCHMARK_PHASE_OPERATOR_POSTCONDITION/)
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_ENABLED\s*=\s*true|set -x|printenv/)
})

test('Core attestation verifier compares the complete envelope and blocks the one-off on mismatch', () => {
  assert.equal(existsSync(verifier), true)
  const root = mkdtempSync(join(tmpdir(), 'paperbanana-phase-attestation-'))
  const attestationPath = join(root, 'attestation.json')
  const markerPath = join(root, 'one-off-started')
  const attestation = {
    schemaVersion: 2, runId: 'bench-run-0123456789abcdef0123', phase: 'quick', state: 'quick_running', codeSha: sha,
    provider: 'ark', modelId: 'doubao-seedream-test', lane: '2K-standard', suiteId: 'pb-image-diagnostic-v1', suiteHash: hash,
    judgeEpoch: 'judge-2026-08-v1', judgeStackHash: hash, signedAuthorizationHash: hash, priceHash: hash,
    ...immutableFixture(),
    maxGenerations: 24, maxJudgments: 48, maxJudgeCalls: 192, maxEstimatedUsd: 12,
    priceSnapshot: { currency: 'USD', source: 'https://example.com/pricing/image-model', capturedAt: '2026-08-25T08:00:00.000Z', estimatedPerGeneration: 0.1, estimatedPerJudgeCall: 0.05 },
  }
  const env = {
    ...process.env, PAPERBANANA_EXPECTED_RUN_ID: attestation.runId, PAPERBANANA_EXPECTED_PHASE: attestation.phase,
    PAPERBANANA_EXPECTED_CODE_SHA: attestation.codeSha, PAPERBANANA_EXPECTED_PROVIDER: attestation.provider,
    PAPERBANANA_EXPECTED_MODEL_ID: attestation.modelId, PAPERBANANA_EXPECTED_LANE: attestation.lane,
    PAPERBANANA_EXPECTED_SUITE_ID: attestation.suiteId, PAPERBANANA_EXPECTED_SUITE_HASH: attestation.suiteHash,
    PAPERBANANA_EXPECTED_JUDGE_EPOCH: attestation.judgeEpoch, PAPERBANANA_EXPECTED_JUDGE_STACK_HASH: attestation.judgeStackHash,
    PAPERBANANA_EXPECTED_SIGNED_AUTHORIZATION_HASH: attestation.signedAuthorizationHash, PAPERBANANA_EXPECTED_PRICE_HASH: attestation.priceHash,
    PAPERBANANA_EXPECTED_RUN_HASH: attestation.runHash, PAPERBANANA_EXPECTED_RUN_FACTS_HASH: attestation.runFactsHash,
    PAPERBANANA_EXPECTED_CANDIDATE_SNAPSHOT_HASH: attestation.candidateSnapshotHash, PAPERBANANA_EXPECTED_ASPECT_RATIOS_HASH: attestation.aspectRatiosHash,
    PAPERBANANA_EXPECTED_REGISTRY_HASH: attestation.registryHash, PAPERBANANA_EXPECTED_RUN_INTEGRITY_ATTESTATION: attestation.runIntegrityAttestation,
    PAPERBANANA_EXPECTED_IMMUTABLE_FACTS_HASH: attestation.immutableFactsHash,
    PAPERBANANA_EXPECTED_MAX_GENERATIONS: '24', PAPERBANANA_EXPECTED_MAX_JUDGMENTS: '48', PAPERBANANA_EXPECTED_MAX_JUDGE_CALLS: '192', PAPERBANANA_EXPECTED_MAX_ESTIMATED_USD: '12',
    PAPERBANANA_EXPECTED_GENERATION_USD: '0.1', PAPERBANANA_EXPECTED_JUDGE_USD: '0.05', PAPERBANANA_EXPECTED_PRICE_CURRENCY: 'USD',
    PAPERBANANA_EXPECTED_PRICE_SOURCE: attestation.priceSnapshot.source, PAPERBANANA_EXPECTED_PRICE_CAPTURED_AT: attestation.priceSnapshot.capturedAt,
  }
  try {
    writeFileSync(attestationPath, JSON.stringify(attestation), { mode: 0o600 })
    const accepted = spawnSync(process.execPath, [verifier, attestationPath], { encoding: 'utf8', env })
    assert.equal(accepted.status, 0, accepted.stderr)
    const mutations = [
      ['runId', (value) => ({ ...value, runId: 'bench-run-ffffffffffffffffffff' })],
      ['phase', (value) => ({ ...value, phase: 'full' })],
      ['state', (value) => ({ ...value, state: 'full_running' })],
      ['codeSha', (value) => ({ ...value, codeSha: 'f'.repeat(40) })],
      ['provider', (value) => ({ ...value, provider: 'bailian' })],
      ['modelId', (value) => ({ ...value, modelId: 'wrong-model' })],
      ['lane', (value) => ({ ...value, lane: '4K-standard' })],
      ['suiteId', (value) => ({ ...value, suiteId: 'wrong-suite' })],
      ['suiteHash', (value) => ({ ...value, suiteHash: 'f'.repeat(64) })],
      ['judgeEpoch', (value) => ({ ...value, judgeEpoch: 'wrong-epoch' })],
      ['judgeStackHash', (value) => ({ ...value, judgeStackHash: 'f'.repeat(64) })],
      ['signedAuthorizationHash', (value) => ({ ...value, signedAuthorizationHash: 'f'.repeat(64) })],
      ['priceHash', (value) => ({ ...value, priceHash: 'f'.repeat(64) })],
      ['runHash', (value) => ({ ...value, runHash: 'e'.repeat(64) })],
      ['runFacts', (value) => ({ ...value, immutableFacts: { ...value.immutableFacts, runFacts: { ...value.immutableFacts.runFacts, aspectRatios: ['16:9'] } } })],
      ['candidateSnapshot', (value) => ({ ...value, immutableFacts: { ...value.immutableFacts, candidateSnapshot: { ...value.immutableFacts.candidateSnapshot, displayName: 'Mutated' } } })],
      ['registryHash', (value) => ({ ...value, immutableFacts: { ...value.immutableFacts, runFacts: { ...value.immutableFacts.runFacts, registryHash: 'other-registry' } } })],
      ['runIntegrityAttestation', (value) => ({ ...value, immutableFacts: { ...value.immutableFacts, runIntegrityAttestation: 'e'.repeat(64) } })],
      ['maxGenerations', (value) => ({ ...value, maxGenerations: 23 })],
      ['maxJudgments', (value) => ({ ...value, maxJudgments: 47 })],
      ['maxJudgeCalls', (value) => ({ ...value, maxJudgeCalls: 191 })],
      ['maxEstimatedUsd', (value) => ({ ...value, maxEstimatedUsd: 11.9 })],
      ['currency', (value) => ({ ...value, priceSnapshot: { ...value.priceSnapshot, currency: 'CNY' } })],
      ['source', (value) => ({ ...value, priceSnapshot: { ...value.priceSnapshot, source: 'https://example.com/other' } })],
      ['capturedAt', (value) => ({ ...value, priceSnapshot: { ...value.priceSnapshot, capturedAt: '2026-08-25T08:01:00.000Z' } })],
      ['estimatedPerGeneration', (value) => ({ ...value, priceSnapshot: { ...value.priceSnapshot, estimatedPerGeneration: 0.09 } })],
      ['estimatedPerJudgeCall', (value) => ({ ...value, priceSnapshot: { ...value.priceSnapshot, estimatedPerJudgeCall: 0.04 } })],
    ]
    for (const [name, mutate] of mutations) {
      writeFileSync(attestationPath, JSON.stringify(mutate(attestation)), { mode: 0o600 })
      const mismatch = spawnSync(process.execPath, [verifier, attestationPath], { encoding: 'utf8', env })
      assert.notEqual(mismatch.status, 0, name)
      assert.match(mismatch.stderr, /BENCHMARK_PHASE_OPERATOR_ATTESTATION_MISMATCH/, name)
    }
    writeFileSync(attestationPath, JSON.stringify({ ...attestation, modelId: 'wrong-model' }), { mode: 0o600 })
    const command = `node "$1" "$2" && touch "$3"`
    const rejected = spawnSync('sh', ['-c', command, 'sh', verifier, attestationPath, markerPath], { encoding: 'utf8', env })
    assert.notEqual(rejected.status, 0)
    assert.equal(existsSync(markerPath), false)
    assert.match(rejected.stderr, /BENCHMARK_PHASE_OPERATOR_ATTESTATION_MISMATCH/)
    assert.doesNotMatch(`${rejected.stdout}${rejected.stderr}`, /wrong-model|immutable-admin|https:\/\//)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('bounded phase dry-run validates files and performs zero docker/provider calls', () => {
  const item = fixture()
  try {
    const result = item.run()
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /dry-run/)
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /docker|provider|judge|api.?key/i)
    const gatewayEnv = join(item.root, 'opt/paperbanana/secrets/gateway.env')
    writeFileSync(gatewayEnv, 'ADMIN_USER_IDS=immutable-admin-id\nPAPERBANANA_GATEWAY_TOKEN=wrong-token\nPAPERBANANA_ADMIN_TRANSPORT_TOKEN=wrong-token\n', { mode: 0o600 })
    const mismatch = item.run()
    assert.notEqual(mismatch.status, 0)
    assert.doesNotMatch(`${mismatch.stdout}${mismatch.stderr}`, /docker|phaseOperatorAttestation|wrong-token/)
    const apply = item.run(['--apply'])
    assert.notEqual(apply.status, 0)
    assert.match(apply.stderr, /test root never permits paid apply/)
  } finally { item.cleanup() }
})

test('manual bounded phase workflow requires every identity, price and budget input', () => {
  assert.equal(existsSync(workflow), true)
  const source = readFileSync(workflow, 'utf8')
  assert.match(source, /workflow_dispatch:/)
  assert.match(source, /environment:\s*paperbanana-production/)
  assert.match(source, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/)
  for (const input of ['phase', 'run_id', 'expected_deployed_sha', 'provider', 'model_id', 'lane', 'suite_id', 'suite_hash', 'judge_epoch', 'judge_stack_hash', 'signed_authorization_hash', 'price_hash', 'run_hash', 'run_facts_hash', 'candidate_snapshot_hash', 'aspect_ratios_hash', 'registry_hash', 'run_integrity_attestation', 'immutable_facts_hash', 'max_generations', 'max_judgments', 'max_judge_calls', 'max_estimated_usd', 'estimated_per_generation_usd', 'estimated_per_judge_call_usd', 'price_currency', 'price_source', 'price_captured_at', 'confirm']) {
    assert.match(source, new RegExp(`${input}:[\\s\\S]*required:\\s*true`), input)
  }
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_(?:BAILIAN|OPENROUTER|ARK)_API_KEY|OSS_ACCESS_KEY_SECRET/)
})
