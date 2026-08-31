import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const prepare = fileURLToPath(new URL('../scripts/prepare-scientific-v2-production.sh', import.meta.url))
const admin = fileURLToPath(new URL('../scripts/run-scientific-v2-admin-operator.sh', import.meta.url))
const prepareWorkflow = fileURLToPath(new URL('../../../.github/workflows/prepare-scientific-v2-production.yml', import.meta.url))
const adminWorkflow = fileURLToPath(new URL('../../../.github/workflows/run-scientific-v2-admin-operator.yml', import.meta.url))
const operatorWorkflow = fileURLToPath(new URL('../../../.github/workflows/run-scientific-v2-operator.yml', import.meta.url))
const operator = fileURLToPath(new URL('../scripts/run-scientific-v2-operator.sh', import.meta.url))

test('root-only prepare bridge creates server-attested content-addressed private bundles without exporting secrets', () => {
  for (const path of [prepare, prepareWorkflow]) assert.equal(existsSync(path), true, path)
  assert.equal(statSync(prepare).mode & 0o111, 0o111)
  const source = readFileSync(prepare, 'utf8')
  assert.match(source, /id -u[\s\S]*root/)
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /127[.]0[.]0[.]1:3000\/paperbanana-api/)
  assert.match(source, /modelRegistry/)
  assert.match(source, /prepareScientificV2Registry/)
  assert.match(source, /signed-price-snapshot/)
  assert.match(source, /signedPriceSnapshot/)
  assert.match(source, /attestationHash/)
  assert.match(source, /install -d[\s\S]*0700/)
  assert.match(source, /0600/)
  assert.match(source, /sha256sum|shasum -a 256/)
  assert.match(source, /persist_content_addressed '\.inspectBundle' inspect/)
  assert.match(source, /created_at=.*jq[^\n]*capturedAt/)
  assert.doesNotMatch(source, /created_at=.*date -u/)
  for (const marker of ['Config.Image', 'RepoDigests', 'build-provenance.json', 'PAPERBANANA_BENCH_ENABLED', 'PAPERBANANA_BENCH_CONCURRENCY']) assert.match(source, new RegExp(marker.replace('.', '[.]')))
  assert.doesNotMatch(source, /set -x|printenv|cat\s+[^\n]*(?:secret|core[.]env|bench[.]env)/)
  assert.match(source, /--env-from-file "\$verifier_env"/)
  assert.doesNotMatch(source, /-e PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET=/)
  assert.doesNotMatch(source, /price_attestation_secret=/)

  const workflow = readFileSync(prepareWorkflow, 'utf8')
  assert.match(workflow, /environment:\s*paperbanana-production/)
  assert.match(workflow, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/)
  assert.match(workflow, /signed_price_snapshot_sha256:[\s\S]*required:\s*true/)
  assert.doesNotMatch(workflow, /ATTESTATION_SECRET|REVIEW_SIGNING_SECRET/)
})

test('V2 admin bridge reuses localhost admin transport, exact schemas, shared lock and private inputs', () => {
  for (const path of [admin, adminWorkflow]) assert.equal(existsSync(path), true, path)
  const source = readFileSync(admin, 'utf8')
  for (const operation of ['freeze', 'attest', 'import-worker', 'import-codex', 'export-review', 'import-review', 'import-arbitration', 'publish']) {
    assert.match(source, new RegExp(operation.replace('-', '[-_]')))
  }
  for (const action of ['adminBenchmarkControl', 'adminBenchmarkReviewExport', 'adminBenchmarkReviewImport', 'adminBenchmarkPublish']) {
    assert.match(source, new RegExp(action))
  }
  assert.match(source, /127[.]0[.]0[.]1:3000\/paperbanana-api/)
  assert.match(source, /x-paperbanana-admin-transport-token/)
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /0?600/)
  assert.match(source, /O_NOFOLLOW/)
  assert.match(source, /allowlist|allowedKeys/)
  assert.match(source, /requiredKeys/)
  assert.match(source, /admin-results/)
  assert.match(source, /"import-review":\["disputeCount","resultCount","finalHash"\]/)
  assert.match(source, /"import-arbitration":\["resultCount","finalHash"\]/)
  assert.match(source, /private_response_sha256="\$\(sha256_file "\$private_result"\)"/)
  assert.match(source, /\$input_sha256\.\$operation\.\$private_response_sha256\.json/)
  assert.doesNotMatch(source, /\$input_sha256\.\$operation\.json/)
  const embedded = source.match(/node_script='\n([\s\S]*?)\n'\n"\$\{compose\[@\]\}" exec/)
  assert.ok(embedded, 'embedded admin response validator must remain extractable for hermetic testing')
  const emptySuccess = spawnSync(process.execPath, ['--input-type=module', '-e',
    `globalThis.fetch=async()=>({ok:true,json:async()=>({code:0,result:{}})});\n${embedded[1]}`,
  ], {
    encoding: 'utf8',
    input: JSON.stringify({ batchId: 'batch', registryAuthority: {}, registrySnapshot: {}, canonicalManifest: {}, manifest: {}, initialState: {} }),
    env: { ...process.env, PAPERBANANA_SCIENTIFIC_V2_ADMIN_OPERATION: 'freeze' },
  })
  assert.notEqual(emptySuccess.status, 0)
  assert.match(emptySuccess.stderr, /SCIENTIFIC_V2_ADMIN_RESPONSE_SCHEMA_INVALID/)
  for (const marker of ['Config.Image', 'RepoDigests', 'build-provenance.json', 'PAPERBANANA_BENCH_ENABLED', 'PAPERBANANA_BENCH_CONCURRENCY']) assert.match(source, new RegExp(marker.replace('.', '[.]')))
  assert.doesNotMatch(source, /mongosh|mongo\s|releases[.](?:insert|update)|insertOne|updateOne/)

  const workflow = readFileSync(adminWorkflow, 'utf8')
  assert.match(workflow, /environment:\s*paperbanana-production/)
  assert.match(workflow, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/)
  assert.match(workflow, /actions\/checkout@[a-f0-9]{40}/)
})

test('scientific operator binds expected Core and Worker digests through workflow, env and running containers', () => {
  const workflow = readFileSync(operatorWorkflow, 'utf8')
  assert.match(workflow, /actions\/checkout@[a-f0-9]{40}/)
  for (const input of ['expected_core_digest', 'expected_worker_digest']) {
    assert.match(workflow, new RegExp(`${input}:[\\s\\S]*required:\\s*true`))
  }
  const source = readFileSync(operator, 'utf8')
  assert.match(source, /--expected-core-digest/)
  assert.match(source, /--expected-worker-digest/)
  assert.match(source, /PAPERBANANA_CORE_IMAGE/)
  assert.match(source, /PAPERBANANA_BENCH_WORKER_IMAGE/)
  assert.match(source, /docker inspect/)
  assert.match(source, /RepoDigests/)
})

test('protected review validate and arbitrate phases and hash-reference Codex import are explicit', () => {
  const source = readFileSync(operator, 'utf8')
  for (const mode of ['review_validate', 'review_arbitrate', 'review_finalize']) assert.match(source, new RegExp(mode))
  assert.match(source, /review-private[.]json/)
  assert.match(source, /reviewer identity|reviewerIdentity/)
  assert.match(source, /PAPERBANANA_SCIENTIFIC_V2_CODEX_ARTIFACT_DIR/)
  const workerBridge = readFileSync(new URL('../../../apps/benchmark-worker/src/scientific-v2-production-bridge.ts', import.meta.url), 'utf8')
  assert.match(workerBridge, /25 \* 1024 \* 1024|26214400/)
  assert.match(workerBridge, /sha256|HASH_MISMATCH/)
  assert.match(workerBridge, /O_NOFOLLOW/)
  assert.doesNotMatch(source, /bytesBase64/)
  const workerOperator = readFileSync(new URL('../../../apps/benchmark-worker/src/scientific-v2-operator.ts', import.meta.url), 'utf8')
  assert.match(workerOperator, /review_finalize[\s\S]*PRIVATE_OUTPUT/)
  assert.doesNotMatch(workerOperator, /operation:\s*'review_finalize'[\s\S]{0,200}\.\.\.result/)
})

test('phase permission tuple includes uid gid mode and all production workflows pin checkout', () => {
  const source = readFileSync(operator, 'utf8')
  assert.match(source, /stat -c '%u:%g:%a'/)
  assert.match(source, /stat -f '%u:%g:%Lp'/)
  assert.ok(source.includes('^${expected_owner}:${service_gid}:0?550$'))
  const prepareSource = readFileSync(prepareWorkflow, 'utf8')
  assert.match(prepareSource, /actions\/checkout@[a-f0-9]{40}/)
  const root = mkdtempSync(join(tmpdir(), 'scientific-v2-mode-'))
  try {
    chmodSync(root, 0o550)
    const result = spawnSync('sh', ['-c', 'stat -c "%u:%g:%a" -- "$1" 2>/dev/null || stat -f "%u:%g:%Lp" -- "$1"', 'sh', root], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout.trim(), new RegExp(`^${process.getuid()}:${process.getgid()}:0?550$`))
  } finally { chmodSync(root, 0o700); rmSync(root, { recursive: true, force: true }) }
})
