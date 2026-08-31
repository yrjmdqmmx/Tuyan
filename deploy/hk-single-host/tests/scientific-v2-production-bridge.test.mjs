import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash, createHmac } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const prepare = fileURLToPath(new URL('../scripts/prepare-scientific-v2-production.sh', import.meta.url))
const admin = fileURLToPath(new URL('../scripts/run-scientific-v2-admin-operator.sh', import.meta.url))
const prepareWorkflow = fileURLToPath(new URL('../../../.github/workflows/prepare-scientific-v2-production.yml', import.meta.url))
const adminWorkflow = fileURLToPath(new URL('../../../.github/workflows/run-scientific-v2-admin-operator.yml', import.meta.url))
const operatorWorkflow = fileURLToPath(new URL('../../../.github/workflows/run-scientific-v2-operator.yml', import.meta.url))
const progressWorkflow = fileURLToPath(new URL('../../../.github/workflows/inspect-scientific-v2-progress.yml', import.meta.url))
const operator = fileURLToPath(new URL('../scripts/run-scientific-v2-operator.sh', import.meta.url))
const priceSigner = fileURLToPath(new URL('../scripts/create-scientific-v2-price-snapshot.sh', import.meta.url))
const priceSignerEntry = fileURLToPath(new URL('../../../apps/benchmark-worker/src/scientific-v2-price-signer-entry.ts', import.meta.url))
const priceRefresh = fileURLToPath(new URL('../scripts/refresh-scientific-v2-price-sources.sh', import.meta.url))
const priceRefreshEntry = fileURLToPath(new URL('../../../apps/benchmark-worker/src/scientific-v2-price-refresh-entry.ts', import.meta.url))
const priceRefreshWorkflow = fileURLToPath(new URL('../../../.github/workflows/refresh-scientific-v2-price-sources.yml', import.meta.url))
const priceAuthorization = fileURLToPath(new URL('../scripts/authorize-scientific-v2-price-snapshot.sh', import.meta.url))
const priceAuthorizationEntry = fileURLToPath(new URL('../../../apps/benchmark-worker/src/scientific-v2-price-authorization-entry.ts', import.meta.url))
const priceAuthorizationWorkflow = fileURLToPath(new URL('../../../.github/workflows/authorize-scientific-v2-price-snapshot.yml', import.meta.url))
const runBundleStager = fileURLToPath(new URL('../scripts/stage-scientific-v2-run-bundle.sh', import.meta.url))
const runBundleStagerWorkflow = fileURLToPath(new URL('../../../.github/workflows/stage-scientific-v2-run-bundle.yml', import.meta.url))
const workerPackage = fileURLToPath(new URL('../../../apps/benchmark-worker/package.json', import.meta.url))

const canonicalJson = (value) => Array.isArray(value)
  ? `[${value.map(canonicalJson).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
    : JSON.stringify(value)
const canonicalHash = (value) => createHash('sha256').update(canonicalJson(value)).digest('hex')
const fileHash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

test('root-only prepare bridge creates server-attested content-addressed private bundles without exporting secrets', () => {
  for (const path of [prepare, prepareWorkflow]) assert.equal(existsSync(path), true, path)
  assert.equal(statSync(prepare).mode & 0o111, 0o111)
  const source = readFileSync(prepare, 'utf8')
  assert.match(source, /id -u[\s\S]*root/)
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /127[.]0[.]0[.]1:3000\/paperbanana-api/)
  assert.match(source, /modelRegistry/)
  assert.match(source, /registry-authorities/)
  assert.match(source, /registryAuthorityHash/)
  assert.match(source, /unavailableProviders/)
  assert.match(source, /stat_nlink[\s\S]*== 1/)
  assert.match(source, /sha256sum "\$candidate"[\s\S]*candidate_file_sha/)
  assert.doesNotMatch(source, /prepareScientificV2Registry/)
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
  assert.match(source, /--env-file "\$verifier_env"/)
  assert.match(source, /docker run[\s\S]*--network none[\s\S]*--env-file "\$verifier_env"/)
  assert.doesNotMatch(source, /compose\[@\][^\n]*run[^\n]*--network/)
  assert.doesNotMatch(source, /-e PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET=/)
  assert.doesNotMatch(source, /price_attestation_secret=/)

  const workflow = readFileSync(prepareWorkflow, 'utf8')
  assert.match(workflow, /environment:\s*paperbanana-production/)
  assert.match(workflow, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/)
  assert.match(workflow, /signed_price_snapshot_sha256:[\s\S]*required:\s*true/)
  assert.doesNotMatch(workflow, /ATTESTATION_SECRET|REVIEW_SIGNING_SECRET/)
})

test('root price signer uses fixed protected inputs and a built image entry without secret argv or stdout', () => {
  for (const path of [priceSigner, priceSignerEntry, workerPackage]) assert.equal(existsSync(path), true, path)
  assert.equal(statSync(priceSigner).mode & 0o111, 0o111)
  const wrapper = readFileSync(priceSigner, 'utf8')
  assert.match(wrapper, /id -u[\s\S]*root/)
  assert.match(wrapper, /--expected-worker-digest/)
  assert.match(wrapper, /PAPERBANANA_BENCH_WORKER_IMAGE/)
  assert.match(wrapper, /docker ps[\s\S]*benchmark-worker/)
  assert.match(wrapper, /Config[.]Image/)
  assert.match(wrapper, /RepoDigests/)
  assert.match(wrapper, /build-provenance[.]json/)
  assert.match(wrapper, /PAPERBANANA_CODE_SHA/)
  assert.match(wrapper, /PAPERBANANA_BENCH_ENABLED[^\n]*false/)
  assert.match(wrapper, /PAPERBANANA_BENCH_CONCURRENCY[^\n]*1/)
  assert.match(wrapper, /tracked_price_signer_paths/)
  assert.match(wrapper, /git -C "\$repo_root" ls-files --error-unmatch/)
  assert.match(wrapper, /git -C "\$repo_root" diff --quiet "\$expected_sha" --/)
  assert.match(wrapper, /paperbanana-hk-production[.]lock/)
  assert.match(wrapper, /registry-authorities/)
  assert.match(wrapper, /operator-price-authorizations/)
  assert.match(wrapper, /git -C "\$repo_root" status --porcelain --untracked-files=all/)
  assert.match(wrapper, /official-price-captures/)
  assert.match(wrapper, /signed-price-snapshots/)
  assert.match(wrapper, /--user\s+0:0/)
  assert.match(wrapper, /--network\s+none/)
  assert.match(wrapper, /--env-file "\$verifier_env"/)
  assert.match(wrapper, /dist\/scientific-v2-price-signer[.]mjs/)
  assert.doesNotMatch(wrapper, /-e PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET=|set -x|printenv|cat\s+[^\n]*core[.]env/)
  const entry = readFileSync(priceSignerEntry, 'utf8')
  assert.match(entry, /process[.]argv[.]length\s*!==\s*2/)
  assert.match(entry, /O_NOFOLLOW/)
  assert.match(entry, /assertScientificV2RootSnapshotFileFacts/)
  assert.match(entry, /PAPERBANANA_SCIENTIFIC_V2_REGISTRY_AUTHORITY_PATH/)
  assert.match(entry, /PAPERBANANA_SCIENTIFIC_V2_PRICE_REFRESH_REPORT_PATH/)
  assert.match(entry, /PAPERBANANA_SCIENTIFIC_V2_PRICE_CAPTURE_DIR/)
  assert.match(entry, /PAPERBANANA_SCIENTIFIC_V2_OPERATOR_PRICE_AUTHORIZATION_PATH/)
  assert.doesNotMatch(entry, /console[.]log|process[.]stdout[.]write\([^)]*secret/i)
  const packageJson = JSON.parse(readFileSync(workerPackage, 'utf8'))
  assert.match(`${packageJson.scripts.build} ${packageJson.scripts.postbuild}`, /scientific-v2-price-signer-entry[.]ts[\s\S]*dist\/scientific-v2-price-signer[.]mjs/)
})

test('root refresh workflow obtains server authority and bounded official bytes into protected content-addressed inputs', () => {
  for (const path of [priceRefresh, priceRefreshEntry, priceRefreshWorkflow]) assert.equal(existsSync(path), true, path)
  assert.equal(statSync(priceRefresh).mode & 0o111, 0o111)
  const wrapper = readFileSync(priceRefresh, 'utf8')
  assert.match(wrapper, /id -u[\s\S]*root/)
  assert.match(wrapper, /paperbanana-hk-production[.]lock/)
  assert.match(wrapper, /127[.]0[.]0[.]1:3000\/paperbanana-api/)
  assert.match(wrapper, /modelRegistry/)
  assert.match(wrapper, /prepareScientificV2Registry/)
  assert.match(wrapper, /registry-authorities/)
  assert.match(wrapper, /official-price-captures/)
  assert.match(wrapper, /price-refresh-reports/)
  assert.match(wrapper, /tracked_price_refresh_paths/)
  assert.match(wrapper, /git -C "\$repo_root" ls-files --error-unmatch/)
  assert.match(wrapper, /Config[.]Image/)
  assert.match(wrapper, /RepoDigests/)
  assert.match(wrapper, /build-provenance[.]json/)
  assert.match(wrapper, /paperbanana-api/)
  assert.match(wrapper, /--user\s+0:0/)
  assert.match(wrapper, /dist\/scientific-v2-price-refresh[.]mjs/)
  for (const key of ['PAPERBANANA_BENCH_BAILIAN_API_KEY', 'PAPERBANANA_BENCH_ARK_API_KEY', 'PAPERBANANA_BENCH_OPENROUTER_API_KEY', 'PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET', 'PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET']) {
    assert.match(wrapper, new RegExp(`-e ${key}=`))
  }
  assert.doesNotMatch(wrapper, /set -x|printenv|cat\s+[^\n]*(?:secret|core[.]env|bench[.]env)/)
  const entry = readFileSync(priceRefreshEntry, 'utf8')
  assert.match(entry, /process[.]argv[.]length\s*!==\s*2/)
  assert.match(entry, /process[.]getuid[?]?[.]?\(\)\s*!==\s*0/)
  assert.match(entry, /O_NOFOLLOW/)
  assert.match(entry, /refreshScientificV2OfficialPriceSources/)
  assert.match(entry, /4096\s*\*\s*1024|4\s*\*\s*1024\s*\*\s*1024/)
  assert.match(entry, /0o600/)
  assert.doesNotMatch(entry, /https?:\/\//)
  const workflow = readFileSync(priceRefreshWorkflow, 'utf8')
  assert.match(workflow, /environment:\s*paperbanana-production/)
  assert.match(workflow, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/)
  assert.doesNotMatch(workflow, /ATTESTATION_SECRET|REVIEW_SIGNING_SECRET/)
})

test('root authorization workflow derives the fixed unresolved set and signs it under one protected host lock', () => {
  for (const path of [priceAuthorization, priceAuthorizationEntry, priceAuthorizationWorkflow]) assert.equal(existsSync(path), true, path)
  assert.equal(statSync(priceAuthorization).mode & 0o111, 0o111)
  const wrapper = readFileSync(priceAuthorization, 'utf8')
  assert.match(wrapper, /id -u[\s\S]*root/)
  assert.match(wrapper, /--expected-core-digest/)
  assert.match(wrapper, /--expected-worker-digest/)
  assert.match(wrapper, /--registry-authority-sha256/)
  assert.match(wrapper, /--refresh-report-sha256/)
  assert.match(wrapper, /authorize-scientific-v2-conservative-upper-bound/)
  assert.match(wrapper, /paperbanana-hk-production[.]lock/)
  assert.match(wrapper, /PAPERBANANA_HK_SHARED_LOCK_FD/)
  assert.match(wrapper, /dist\/scientific-v2-price-authorization[.]mjs/)
  assert.match(wrapper, /create-scientific-v2-price-snapshot[.]sh/)
  assert.match(wrapper, /operator-price-authorizations/)
  assert.match(wrapper, /git -C "\$repo_root" status --porcelain --untracked-files=all/)
  assert.match(wrapper, /providerTotals/)
  assert.match(wrapper, /authorizationSha256/)
  assert.match(wrapper, /signedSnapshotSha256/)
  assert.doesNotMatch(wrapper, /-e PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET=|set -x|printenv|cat\s+[^\n]*core[.]env/)
  const entry = readFileSync(priceAuthorizationEntry, 'utf8')
  assert.match(entry, /process[.]argv[.]length\s*!==\s*2/)
  assert.match(entry, /process[.]getuid[?]?[.]?\(\)\s*!==\s*0/)
  assert.match(entry, /O_NOFOLLOW/)
  assert.match(entry, /verifyScientificV2RegistryAuthority/)
  assert.match(entry, /persistScientificV2OperatorPriceAuthorization/)
  assert.doesNotMatch(entry, /console[.]log|process[.]stdout[.]write\([^)]*secret/i)
  const workflow = readFileSync(priceAuthorizationWorkflow, 'utf8')
  assert.match(workflow, /environment:\s*paperbanana-production/)
  assert.match(workflow, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/)
  for (const input of ['expected_deployed_sha', 'expected_core_digest', 'expected_worker_digest', 'registry_authority_sha256', 'refresh_report_sha256']) {
    assert.match(workflow, new RegExp(`${input}:[\\s\\S]*required:\\s*true`))
  }
  assert.doesNotMatch(workflow, /ATTESTATION_SECRET|REVIEW_SIGNING_SECRET/)
})

test('root run-bundle stager protects attestation secret and binds canary or full phase to prepared state', () => {
  assert.equal(existsSync(runBundleStager), true, runBundleStager)
  assert.equal(existsSync(runBundleStagerWorkflow), true, runBundleStagerWorkflow)
  assert.equal(statSync(runBundleStager).mode & 0o111, 0o111)
  const source = readFileSync(runBundleStager, 'utf8')
  assert.match(source, /id -u[\s\S]*root/)
  assert.match(source, /--execution-phase/)
  assert.match(source, /--expected-worker-digest/)
  assert.match(source, /canary-only\|full/)
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /operator-bundles\/scientific-v2/)
  assert.match(source, /admin-results/)
  assert.match(source, /PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET/)
  assert.match(source, /O_NOFOLLOW/)
  assert.match(source, /0?600/)
  assert.match(source, /attestationSecret/)
  assert.match(source, /executionPhase/)
  for (const field of ['manifestCodeSha', 'executionCodeSha', 'legacyRecoveryStateHash']) assert.match(source, new RegExp(field))
  assert.match(source, /runBundleHash/)
  assert.match(source, /node_hash_script/)
  assert.match(source, /build-provenance[.]json/)
  const workerDigestGate = source.match(/^\[\[ "\$\{worker_image##\*@sha256:\}" == "\$expected_worker_digest" \]\] \|\| exit 1$/m)
  assert.ok(workerDigestGate, 'worker image digest must gate staging before the Node container starts')
  const runWorkerDigestGate = (workerImage, expectedDigest) => spawnSync('bash', ['-ceu',
    `worker_image="$1"; expected_worker_digest="$2"; ${workerDigestGate[0]}`,
    'worker-digest-gate', workerImage, expectedDigest,
  ], { encoding: 'utf8' })
  const workerDigest = 'a'.repeat(64)
  assert.equal(runWorkerDigestGate(`ghcr.io/paperbanana/paperbanana-benchmark-worker@sha256:${workerDigest}`, workerDigest).status, 0)
  assert.notEqual(runWorkerDigestGate(`ghcr.io/paperbanana/paperbanana-benchmark-worker@sha256:${workerDigest}`, 'b'.repeat(64)).status, 0)
  assert.match(source, /--network none/)
  assert.match(source, /--read-only/)
  assert.match(source, /timeout --signal=TERM --kill-after=10s 300s\s+docker run/)
  for (const flag of ['--pids-limit 64', '--memory 1g', '--memory-swap 1g']) assert.match(source, new RegExp(flag.replace(/ /g, '\\s+')))
  assert.match(source, /node_cidfile="\$node_input_dir\/node-container[.]cid"/)
  assert.match(source, /docker run[\s\S]*--cidfile "\$node_cidfile"/)
  const cleanup = source.match(/cleanup\(\) \{\n([\s\S]*?)\n\}/)
  assert.ok(cleanup, 'stager cleanup must remain statically reviewable')
  assert.match(cleanup[1], /-f "\$node_cidfile"[\s\S]*! -L "\$node_cidfile"/)
  assert.match(cleanup[1], /stat[\s\S]*0:0[?]600[$]/)
  assert.match(cleanup[1], /read -r node_container_id < "\$node_cidfile"/)
  assert.match(cleanup[1], /\[\[ "\$node_container_id" =~ \^\[a-f0-9\]\{64\}\$ \]\] && docker rm -f "\$node_container_id" >\/dev\/null 2>&1 \|\| true/)
  assert.ok(cleanup[1].indexOf('docker rm -f "$node_container_id"') < cleanup[1].indexOf('rm -f -- "$temporary"'), 'container removal must happen before temp-file deletion')
  for (const flag of ['--manifest-hash', '--registry-hash', '--suite-hash', '--price-hash']) assert.match(source, new RegExp(flag))
  assert.match(source, /operator-attestation\/v1/)
  assert.match(source, /reportHash/)
  assert.match(source, /attestationHash/)
  assert.match(source, /tracked_run_bundle_paths/)
  assert.match(source, /git -C "\$repo_root" ls-files --error-unmatch/)
  assert.match(source, /git -C "\$repo_root" diff --quiet "\$expected_sha" --/)
  assert.doesNotMatch(source, /set -x|printenv|cat\s+[^\n]*(?:secret|core[.]env|bench[.]env)/)
  assert.doesNotMatch(source, /jq\s+-c?\s*['"]?[.]['"]?\s+[^\n]*bundle/)

  const workflow = readFileSync(runBundleStagerWorkflow, 'utf8')
  assert.match(workflow, /environment:\s*paperbanana-production/)
  assert.match(workflow, /concurrency:[\s\S]*paperbanana-hk-production[\s\S]*cancel-in-progress:\s*false/)
  assert.match(workflow, /actions\/checkout@[a-f0-9]{40}/)
  for (const input of ['expected_deployed_sha', 'expected_worker_digest', 'manifest_sha256', 'state_sha256', 'attestation_result_sha256', 'manifest_hash', 'registry_hash', 'suite_hash', 'price_hash', 'execution_phase']) {
    assert.match(workflow, new RegExp(`${input}:[\\s\\S]*required:\\s*true`))
  }
  assert.equal([...workflow.matchAll(/WORKER_DIGEST:\s*\$\{\{ inputs[.]expected_worker_digest \}\}/g)].length, 2)
  assert.match(workflow, /for hash in[\s\S]*\"\$WORKER_DIGEST\"[\s\S]*\[\[ \"\$hash\" =~ \^\[a-f0-9\]\{64\}/)
  assert.match(workflow, /--expected-sha %q --expected-worker-digest %q[\s\S]*\"\$EXPECTED_SHA\" \"\$WORKER_DIGEST\"/)
  assert.match(workflow, /stage-scientific-v2-run-bundle[.]sh/)
  assert.doesNotMatch(workflow, /REVIEW_SIGNING_SECRET|ATTESTATION_SECRET|PROVIDER.*KEY/)
})

test('isolated Node canonical preflight exactly matches benchmark canonical hashes', () => {
  const source = readFileSync(runBundleStager, 'utf8')
  const embedded = source.match(/node_hash_script='\n([\s\S]*?)\n'\n(?:timeout[^\n]*\s+)?docker run/)
  assert.ok(embedded, 'Node canonical preflight must remain hermetically testable')
  const root = mkdtempSync(join(tmpdir(), 'scientific-v2-node-canonical-'))
  try {
    const codeSha = 'a'.repeat(40)
    const manifest = {
      manifestHash: 'ignored', canonicalManifest: { manifestHash: 'ignored', z: 1e-8, a: 0.00009999 },
      registrySnapshot: { snapshotHash: 'ignored', registry: { routePriority: ['bailian', 'ark'], provider_2: 3.05246208 } },
      priceSnapshot: { snapshotHash: 'ignored', entries: [{ unitCnyAtoms: '9999', unitCny: 0.00009999 }] },
    }
    const state = { stateHash: 'ignored', status: 'canary_complete', providerSpentCny: { bailian: 0.00009999 } }
    const inputPath = join(root, 'input.json')
    const provenancePath = join(root, 'provenance.json')
    writeFileSync(inputPath, JSON.stringify({
      schemaVersion: 1, expectedSha: codeSha,
      manifestBase64: Buffer.from(JSON.stringify(manifest)).toString('base64'),
      stateBase64: Buffer.from(JSON.stringify(state)).toString('base64'),
    }))
    writeFileSync(provenancePath, JSON.stringify({ codeSha }))
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', embedded[1]], {
      encoding: 'utf8', env: {
        ...process.env,
        PAPERBANANA_SCIENTIFIC_V2_CANONICAL_INPUT_PATH: inputPath,
        PAPERBANANA_SCIENTIFIC_V2_CANONICAL_PROVENANCE_PATH: provenancePath,
      },
    })
    assert.equal(result.status, 0, result.stderr)
    writeFileSync(provenancePath, JSON.stringify({ codeSha: 'b'.repeat(40) }))
    const wrongProvenance = spawnSync(process.execPath, ['--input-type=module', '-e', embedded[1]], {
      encoding: 'utf8', env: {
        ...process.env,
        PAPERBANANA_SCIENTIFIC_V2_CANONICAL_INPUT_PATH: inputPath,
        PAPERBANANA_SCIENTIFIC_V2_CANONICAL_PROVENANCE_PATH: provenancePath,
      },
    })
    assert.notEqual(wrongProvenance.status, 0)
    assert.match(wrongProvenance.stderr, /SCIENTIFIC_V2_CANONICAL_INPUT_INVALID/)
    assert.deepEqual(JSON.parse(result.stdout), {
      manifestHash: canonicalHash(Object.fromEntries(Object.entries(manifest).filter(([key]) => key !== 'manifestHash'))),
      stateHash: canonicalHash(Object.fromEntries(Object.entries(state).filter(([key]) => key !== 'stateHash'))),
      canonicalManifestHash: canonicalHash({ z: 1e-8, a: 0.00009999 }),
      registrySnapshotHash: canonicalHash({ registry: manifest.registrySnapshot.registry }),
      registryHash: canonicalHash(manifest.registrySnapshot.registry),
      priceSnapshotHash: canonicalHash({ entries: manifest.priceSnapshot.entries }),
    })
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('run-bundle stager rejects re-signed gate, schema, HMAC and frozen-hash tampering before secret assembly', () => {
  const source = readFileSync(runBundleStager, 'utf8')
  const embedded = [...source.matchAll(/python3 - "\$manifest_path"[\s\S]*?<<'PY'\n([\s\S]*?)\nPY/g)]
    .find((candidate) => candidate[1].includes('ATTESTATION_KEYS'))
  assert.ok(embedded, 'protected stager validator must remain hermetically testable')
  const root = mkdtempSync(join(tmpdir(), 'scientific-v2-stager-'))
  try {
    const codeSha = 'a'.repeat(40)
    const registry = { registryVersion: 'registry-v1', providers: {} }
    const registryHash = canonicalHash(registry)
    const registrySnapshotBase = { registryVersion: 'registry-v1', registryHash, registry }
    const registrySnapshot = { ...registrySnapshotBase, snapshotHash: canonicalHash(registrySnapshotBase) }
    const canonicalManifestBase = { registryVersion: 'registry-v1', registryHash, models: [{ canonicalModelId: 'model' }] }
    const canonicalManifest = { ...canonicalManifestBase, manifestHash: canonicalHash(canonicalManifestBase) }
    // Scientific V2 prices are fixed to 1e-8 CNY atoms. JSON.stringify emits
    // this boundary as `1e-8`, while Python's default JSON encoder emits
    // `1e-08`; the protected host verifier must follow the Node contract.
    const priceBase = { schemaVersion: 2, entries: [
      { unitCny: 0, unitCnyAtoms: '0' },
      { unitCny: 1e-8, unitCnyAtoms: '1' },
      { unitCny: 9e-8, unitCnyAtoms: '9' },
      { unitCny: 1e-7, unitCnyAtoms: '10' },
      { unitCny: 9.9e-7, unitCnyAtoms: '99' },
      { unitCny: 0.000001, unitCnyAtoms: '100' },
      { unitCny: 0.00009999, unitCnyAtoms: '9999' },
      { unitCny: 0.0001, unitCnyAtoms: '10000' },
      { unitCny: 0.12, unitCnyAtoms: '12000000' },
      { unitCny: 3.05246208, unitCnyAtoms: '305246208' },
    ] }
    const priceSnapshot = { ...priceBase, snapshotHash: canonicalHash(priceBase) }
    const suiteHash = 'b'.repeat(64)
    const manifestBase = {
      schemaVersion: 2, suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2',
      evaluationEpoch: 'codex-scientific-2026-09-v1', reviewProtocol: 'codex-independent-double-review-v2',
      presentationVersion: 'scientific-leaderboard-v2', codeSha, registryVersion: 'registry-v1', registryHash,
      registrySnapshotHash: registrySnapshot.snapshotHash, registrySnapshot, canonicalManifestHash: canonicalManifest.manifestHash,
      suiteHash, priceHash: priceSnapshot.snapshotHash, priceOperatorAuthorizationHash: null, canonicalManifest,
      models: [{ canonicalModelId: 'model' }], cases: [{}], executionOrder: [{}], providerOrder: ['bailian', 'ark', 'openrouter'],
      providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 360 },
      codexLimits: { modelId: 'codex:gpt-image-2', successfulSlots: 9, maxAttemptsPerSlot: 4, maxToolCalls: 36 },
      concurrency: 1, lockName: '/run/lock/paperbanana-hk-production.lock', priceSnapshot,
      createdAt: '2026-08-31T00:00:00.000Z',
    }
    const manifest = { ...manifestBase, manifestHash: canonicalHash(manifestBase) }
    const stateBase = {
      schemaVersion: 2, manifestHash: manifest.manifestHash, status: 'ready', pauseReason: null, blockReason: null,
      createdAt: '2026-08-31T00:00:00.000Z', updatedAt: '2026-08-31T00:00:00.000Z',
      providerSpentCny: { bailian: 0, ark: 0, openrouter: 0 },
      providerUnreconciledCny: { bailian: 0, ark: 0, openrouter: 0 }, slots: [],
    }
    const state = { ...stateBase, stateHash: canonicalHash(stateBase) }
    const blockedStateBase = {
      ...stateBase, status: 'blocked', blockReason: 'provider_canary_failed',
      providerSpentCny: { bailian: 0.8, ark: 0, openrouter: 0 },
      slots: [{
        isProviderCanary: true, provider: 'bailian', status: 'failed', costCny: 0.8,
        attempts: Array.from({ length: 4 }, () => ({ responseClass: 'confirmed_technical_failure' })),
      }],
    }
    const blockedState = { ...blockedStateBase, stateHash: canonicalHash(blockedStateBase) }
    const legacyCodeSha = 'f'.repeat(40)
    const legacyManifestBase = { ...manifestBase, codeSha: legacyCodeSha }
    const legacyManifest = { ...legacyManifestBase, manifestHash: canonicalHash(legacyManifestBase) }
    const legacyBlockedStateBase = { ...blockedStateBase, manifestHash: legacyManifest.manifestHash }
    const legacyBlockedState = { ...legacyBlockedStateBase, stateHash: canonicalHash(legacyBlockedStateBase) }
    const fullStateBase = {
      ...stateBase, status: 'canary_complete',
      providerSpentCny: { bailian: 0.00009999, ark: 0.12, openrouter: 3.05246208 },
      providerUnreconciledCny: { bailian: 1e-8, ark: 9.9e-7, openrouter: 0 },
      slots: [{ costCny: 0.00009999, attempts: [{ estimatedCny: 0.12, actualCny: 3.05246208 }] }],
    }
    const fullState = { ...fullStateBase, stateHash: canonicalHash(fullStateBase) }
    const legacyFullStateBase = { ...fullStateBase, manifestHash: legacyManifest.manifestHash }
    const legacyFullState = { ...legacyFullStateBase, stateHash: canonicalHash(legacyFullStateBase) }
    const secret = 'scientific-v2-stage-test-secret-32-bytes-minimum'
    const reportBase = {
      schemaVersion: 2, suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2',
      evaluationEpoch: 'codex-scientific-2026-09-v1', reviewProtocol: 'codex-independent-double-review-v2',
      presentationVersion: 'scientific-leaderboard-v2', batchId: 'batch-test', batchManifestHash: manifest.manifestHash,
      stateHash: state.stateHash, daemon: { enabled: false, status: 'configured-disabled' }, concurrency: 1,
      lockName: '/run/lock/paperbanana-hk-production.lock', providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 360 },
      manifestCodeSha: codeSha, executionCodeSha: codeSha, legacyRecoveryStateHash: null,
      codexToolCallLimit: 36, modelCount: 1, slotCount: 1, revision: 0, issuedAt: '2026-08-31T00:00:00.000Z',
    }
    const sign = (base, key = createHmac('sha256', secret).update('paperbanana/scientific-v2/operator-attestation/v1').digest()) => {
      const reportHash = canonicalHash(base)
      return { ...base, reportHash, attestationHash: createHmac('sha256', key).update(reportHash).digest('hex') }
    }
    const paths = {
      manifest: join(root, 'manifest.json'), state: join(root, 'state.json'), attestation: join(root, 'attestation.json'),
      env: join(root, 'core.env'), nodeHashes: join(root, 'node-hashes.json'), output: join(root, 'output.json'),
    }
    writeFileSync(paths.manifest, JSON.stringify(manifest)); writeFileSync(paths.state, JSON.stringify(state))
    writeFileSync(paths.env, `PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET=${secret}\n`)
    for (const path of [paths.manifest, paths.state, paths.env]) chmodSync(path, 0o600)
    const execute = (attestation, { phase = 'canary-only', manifestValue = manifest, stateValue = state, expectedManifestHash = manifest.manifestHash } = {}) => {
      writeFileSync(paths.manifest, JSON.stringify(manifestValue)); chmodSync(paths.manifest, 0o600)
      writeFileSync(paths.state, JSON.stringify(stateValue)); chmodSync(paths.state, 0o600)
      const without = (value, key) => Object.fromEntries(Object.entries(value).filter(([name]) => name !== key))
      writeFileSync(paths.nodeHashes, JSON.stringify({
        manifestHash: canonicalHash(without(manifestValue, 'manifestHash')),
        stateHash: canonicalHash(without(stateValue, 'stateHash')),
        canonicalManifestHash: canonicalHash(without(manifestValue.canonicalManifest, 'manifestHash')),
        registrySnapshotHash: canonicalHash(without(manifestValue.registrySnapshot, 'snapshotHash')),
        registryHash: canonicalHash(manifestValue.registrySnapshot.registry),
        priceSnapshotHash: canonicalHash(without(manifestValue.priceSnapshot, 'snapshotHash')),
      })); chmodSync(paths.nodeHashes, 0o600)
      writeFileSync(paths.attestation, JSON.stringify(attestation)); chmodSync(paths.attestation, 0o600)
      writeFileSync(paths.output, '{}'); chmodSync(paths.output, 0o600)
      return spawnSync('python3', ['-c', embedded[1],
        paths.manifest, fileHash(paths.manifest), paths.state, fileHash(paths.state), paths.attestation, fileHash(paths.attestation),
        paths.env, paths.nodeHashes, phase, codeSha, expectedManifestHash, registryHash, suiteHash, priceSnapshot.snapshotHash, paths.output, String(process.getuid()),
      ], { encoding: 'utf8' })
    }
    const canarySuccess = execute(sign(reportBase))
    assert.equal(canarySuccess.status, 0, canarySuccess.stderr)
    const legacyBlockedReport = {
      ...reportBase, batchManifestHash: legacyManifest.manifestHash, stateHash: legacyBlockedState.stateHash,
      manifestCodeSha: legacyCodeSha, executionCodeSha: codeSha, legacyRecoveryStateHash: legacyBlockedState.stateHash,
    }
    const blockedCanaryResume = execute(sign(legacyBlockedReport), { manifestValue: legacyManifest, stateValue: legacyBlockedState, expectedManifestHash: legacyManifest.manifestHash })
    assert.equal(blockedCanaryResume.status, 0, blockedCanaryResume.stderr)
    assert.deepEqual(JSON.parse(readFileSync(paths.output, 'utf8')).legacyRecoveryStateHash, legacyBlockedState.stateHash)
    const malformedBlockedBase = structuredClone(legacyBlockedStateBase)
    malformedBlockedBase.slots[0].attempts.pop()
    const malformedBlocked = { ...malformedBlockedBase, stateHash: canonicalHash(malformedBlockedBase) }
    const malformedBlockedResult = execute(sign({ ...legacyBlockedReport, stateHash: malformedBlocked.stateHash, legacyRecoveryStateHash: malformedBlocked.stateHash }), { manifestValue: legacyManifest, stateValue: malformedBlocked, expectedManifestHash: legacyManifest.manifestHash })
    assert.notEqual(malformedBlockedResult.status, 0)
    assert.match(malformedBlockedResult.stderr, /assembly failed \[phase\]/)
    const fullSuccess = execute(sign({ ...reportBase, stateHash: fullState.stateHash }), { phase: 'full', stateValue: fullState })
    assert.equal(fullSuccess.status, 0, fullSuccess.stderr)
    const legacyFull = execute(sign({ ...legacyBlockedReport, stateHash: legacyFullState.stateHash }), { phase: 'full', manifestValue: legacyManifest, stateValue: legacyFullState, expectedManifestHash: legacyManifest.manifestHash })
    assert.equal(legacyFull.status, 0, legacyFull.stderr)
    const executionMismatch = execute(sign({ ...reportBase, executionCodeSha: legacyCodeSha }))
    assert.notEqual(executionMismatch.status, 0)
    const mismatchedAtoms = structuredClone(manifest)
    mismatchedAtoms.priceSnapshot.entries[1].unitCny = 9e-8
    const mismatchedAtomsResult = execute(sign(reportBase), { manifestValue: mismatchedAtoms })
    assert.notEqual(mismatchedAtomsResult.status, 0)
    assert.match(mismatchedAtomsResult.stderr, /assembly failed \[manifest-hash\]/)
    const overBudgetAtoms = structuredClone(manifest)
    overBudgetAtoms.priceSnapshot.entries[1] = { unitCny: 361, unitCnyAtoms: '36100000000' }
    const overBudgetAtomsResult = execute(sign(reportBase), { manifestValue: overBudgetAtoms })
    assert.notEqual(overBudgetAtomsResult.status, 0)
    assert.match(overBudgetAtomsResult.stderr, /assembly failed \[manifest-hash\]/)
    const directMaster = Buffer.from(secret)
    const extraField = execute({ ...sign(reportBase), extra: true })
    assert.notEqual(extraField.status, 0)
    assert.match(extraField.stderr, /scientific v2 protected run-bundle assembly failed \[schema\]/)
    assert.doesNotMatch(extraField.stderr, new RegExp(secret))
    for (const tampered of [
      sign({ ...reportBase, daemon: { enabled: true, status: 'configured-disabled' } }),
      sign({ ...reportBase, concurrency: 2 }),
      sign({ ...reportBase, providerBudgetsCny: { bailian: 179, ark: 180, openrouter: 360 } }),
      sign(reportBase, directMaster),
      { ...sign(reportBase), reportHash: '0'.repeat(64) },
    ]) assert.notEqual(execute(tampered).status, 0)
    const wrongExpectedPrice = spawnSync('python3', ['-c', embedded[1],
      paths.manifest, fileHash(paths.manifest), paths.state, fileHash(paths.state), paths.attestation, fileHash(paths.attestation),
      paths.env, paths.nodeHashes, 'canary-only', codeSha, manifest.manifestHash, registryHash, suiteHash, 'f'.repeat(64), paths.output, String(process.getuid()),
    ], { encoding: 'utf8' })
    assert.notEqual(wrongExpectedPrice.status, 0)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('exact tracked source gates reject dirty and untracked replacements of every wrapper-owned path set', () => {
  const sources = [
    [readFileSync(priceSigner, 'utf8'), 'tracked_price_signer_paths'],
    [readFileSync(priceRefresh, 'utf8'), 'tracked_price_refresh_paths'],
    [readFileSync(priceAuthorization, 'utf8'), 'tracked_price_authorization_paths'],
    [readFileSync(runBundleStager, 'utf8'), 'tracked_run_bundle_paths'],
  ]
  for (const [source, variable] of sources) {
    const match = source.match(new RegExp(`${variable}=\\(\\n([\\s\\S]*?)\\n\\)`))
    assert.ok(match, variable)
    const paths = match[1].split('\n').map((line) => line.trim().replace(/\\$/, '').trim()).filter(Boolean)
    assert.ok(paths.length >= 4, variable)
    const root = mkdtempSync(join(tmpdir(), `${variable}-`))
    try {
      for (const path of paths) {
        mkdirSync(join(root, path, '..'), { recursive: true })
        writeFileSync(join(root, path), `${path}\n`)
      }
      for (const args of [['init', '-q'], ['config', 'user.email', 'test@example.invalid'], ['config', 'user.name', 'test'], ['add', '--', ...paths], ['commit', '-qm', 'baseline']]) {
        assert.equal(spawnSync('git', args, { cwd: root }).status, 0, `${variable}: git ${args[0]}`)
      }
      const expectedSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim()
      const gate = () => paths.every((path) => spawnSync('git', ['ls-files', '--error-unmatch', path], { cwd: root }).status === 0)
        && spawnSync('git', ['diff', '--quiet', expectedSha, '--', ...paths], { cwd: root }).status === 0
      assert.equal(gate(), true, `${variable}: clean`)
      writeFileSync(join(root, paths[0]), 'dirty tracked replacement\n')
      assert.equal(gate(), false, `${variable}: dirty tracked`)
      assert.equal(spawnSync('git', ['restore', '--source', expectedSha, '--', paths[0]], { cwd: root }).status, 0)
      assert.equal(spawnSync('git', ['rm', '--cached', '-q', '--', paths[0]], { cwd: root }).status, 0)
      writeFileSync(join(root, paths[0]), 'untracked expected-path replacement\n')
      assert.equal(gate(), false, `${variable}: untracked replacement`)
    } finally { rmSync(root, { recursive: true, force: true }) }
  }
})

test('V2 admin bridge reuses localhost admin transport, exact schemas, shared lock and private inputs', () => {
  for (const path of [admin, adminWorkflow]) assert.equal(existsSync(path), true, path)
  const source = readFileSync(admin, 'utf8')
  for (const operation of ['freeze', 'attest', 'diagnose', 'import-worker', 'import-codex', 'export-review', 'import-review', 'import-arbitration', 'publish']) {
    assert.match(source, new RegExp(operation.replace('-', '[-_]')))
  }
  for (const action of ['adminBenchmarkControl', 'adminBenchmarkReviewExport', 'adminBenchmarkReviewImport', 'adminBenchmarkPublish']) {
    assert.match(source, new RegExp(action))
  }
  assert.match(source, /127[.]0[.]0[.]1:3000\/paperbanana-api/)
  assert.match(source, /x-paperbanana-admin-transport-token/)
  assert.match(source, /x-paperbanana-scientific-v2-admin-operation/)
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /0?600/)
  assert.match(source, /O_NOFOLLOW/)
  assert.match(source, /allowlist|allowedKeys/)
  assert.match(source, /requiredKeys/)
  assert.match(source, /admin-results/)
  assert.match(source, /"import-review":\["disputeCount","resultCount","finalHash"\]/)
  assert.match(source, /"import-arbitration":\["resultCount","finalHash"\]/)
  assert.match(source, /private_response_sha256="\$\(sha256_file "\$private_result"\)"/)
  assert.match(source, /\$private_response_sha256[.]attest[.]json/)
  assert.match(source, /privateResponseSha256/)
  for (const field of ['manifestCodeSha', 'executionCodeSha', 'legacyRecoveryStateHash']) assert.match(source, new RegExp(field))
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
  const fullAttestation = {
    schemaVersion: 2, suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2',
    evaluationEpoch: 'codex-scientific-2026-09-v1', reviewProtocol: 'codex-independent-double-review-v2',
    presentationVersion: 'scientific-leaderboard-v2', batchId: 'scientific-v2-test',
    batchManifestHash: 'a'.repeat(64), stateHash: 'b'.repeat(64),
    manifestCodeSha: 'e'.repeat(40), executionCodeSha: 'e'.repeat(40), legacyRecoveryStateHash: null,
    daemon: { enabled: false, status: 'configured-disabled' }, concurrency: 1,
    lockName: '/run/lock/paperbanana-hk-production.lock',
    providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 360 }, codexToolCallLimit: 36,
    modelCount: 40, slotCount: 360, revision: 0, issuedAt: '2026-08-31T00:00:00.000Z',
    reportHash: 'c'.repeat(64), attestationHash: 'd'.repeat(64),
    stateSnapshot: {
      schemaVersion: 2, manifestHash: 'a'.repeat(64), status: 'blocked', pauseReason: null,
      blockReason: 'provider_canary_failed', createdAt: '2026-08-31T00:00:00.000Z', updatedAt: '2026-08-31T01:00:00.000Z',
      providerSpentCny: { bailian: 0.8, ark: 0, openrouter: 0 },
      providerUnreconciledCny: { bailian: 0, ark: 0, openrouter: 0 }, slots: [], stateHash: 'b'.repeat(64),
    },
  }
  const attestationSuccess = spawnSync(process.execPath, ['--input-type=module', '-e',
    `const testResponse=JSON.parse(process.env.SCIENTIFIC_V2_TEST_RESPONSE);globalThis.fetch=async()=>({ok:true,json:async()=>testResponse});\n${embedded[1]}`,
  ], {
    encoding: 'utf8', input: JSON.stringify({ batchId: 'scientific-v2-test', manifestHash: 'a'.repeat(64) }),
    env: { ...process.env, PAPERBANANA_SCIENTIFIC_V2_ADMIN_OPERATION: 'attest', SCIENTIFIC_V2_TEST_RESPONSE: JSON.stringify({ code: 0, run: fullAttestation }) },
  })
  assert.equal(attestationSuccess.status, 0, attestationSuccess.stderr)
  const attestationEnvelope = JSON.parse(attestationSuccess.stdout)
  assert.deepEqual(attestationEnvelope.privateData, Object.fromEntries(Object.entries(fullAttestation).filter(([key]) => key !== 'stateSnapshot')))
  assert.deepEqual(attestationEnvelope.privateState, fullAttestation.stateSnapshot)
  assert.deepEqual(Object.keys(attestationEnvelope.data).sort(), [
    'attestationHash', 'batchId', 'batchManifestHash', 'executionCodeSha', 'issuedAt', 'legacyRecoveryStateHash', 'manifestCodeSha', 'modelCount', 'reportHash', 'revision', 'slotCount', 'stateHash',
  ])
  const fullDiagnostic = {
    batchId: 'scientific-v2-test', manifestHash: 'a'.repeat(64), stateHash: 'b'.repeat(64),
    status: 'blocked', pauseReason: null, blockReason: 'provider_canary_failed',
    providerSpentCny: { bailian: 4, ark: 0, openrouter: 0 },
    providerUnreconciledCny: { bailian: 0, ark: 0, openrouter: 0 }, revision: 1,
    providerCanaries: [{
      provider: 'bailian', canonicalModelId: 'bailian:qwen-image-3.0-pro', caseId: 'sci-figure-01', slotId: 'bailian:qwen-image-3.0-pro:sci-figure-01',
      status: 'failed', attemptCount: 4,
      responseClasses: ['confirmed_provider_failure', 'confirmed_provider_failure', 'confirmed_provider_failure', 'confirmed_provider_failure'],
      estimatedCny: 4, actualCny: null,
    }],
    diagnosticHash: 'c'.repeat(64), attestationHash: 'd'.repeat(64),
  }
  const diagnosticSuccess = spawnSync(process.execPath, ['--input-type=module', '-e',
    `const testResponse=JSON.parse(process.env.SCIENTIFIC_V2_TEST_RESPONSE);globalThis.fetch=async()=>({ok:true,json:async()=>testResponse});\n${embedded[1]}`,
  ], {
    encoding: 'utf8', input: JSON.stringify({ batchId: 'scientific-v2-test', manifestHash: 'a'.repeat(64) }),
    env: { ...process.env, PAPERBANANA_SCIENTIFIC_V2_ADMIN_OPERATION: 'diagnose', SCIENTIFIC_V2_TEST_RESPONSE: JSON.stringify({ code: 0, run: fullDiagnostic }) },
  })
  assert.equal(diagnosticSuccess.status, 0, diagnosticSuccess.stderr)
  const diagnosticEnvelope = JSON.parse(diagnosticSuccess.stdout)
  assert.deepEqual(diagnosticEnvelope.data, fullDiagnostic)
  assert.equal(Object.hasOwn(diagnosticEnvelope, 'privateData'), false)
  assert.match(source, /jq -c '[.]privateData' "\$result"/)
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
  for (const input of ['expected_control_sha', 'expected_deployed_sha', 'expected_core_digest', 'expected_worker_digest']) {
    assert.match(workflow, new RegExp(`${input}:[\\s\\S]*required:\\s*true`))
  }
  assert.match(workflow, /GITHUB_SHA[" ]+==[" ]+\$CONTROL_SHA|\$GITHUB_SHA[" ]+==[" ]+"\$CONTROL_SHA"/)
  assert.doesNotMatch(workflow, /GITHUB_SHA[" ]+==[" ]+\$EXPECTED_SHA|\$GITHUB_SHA[" ]+==[" ]+"\$EXPECTED_SHA"/)
  const source = readFileSync(operator, 'utf8')
  assert.match(source, /--expected-core-digest/)
  assert.match(source, /--expected-worker-digest/)
  assert.match(source, /PAPERBANANA_CORE_IMAGE/)
  assert.match(source, /PAPERBANANA_BENCH_WORKER_IMAGE/)
  assert.match(source, /docker inspect/)
  assert.match(source, /RepoDigests/)
  assert.match(source, /stateBundleHash/)
  assert.match(source, /\$state_bundle_hash[.]state[.]json/)
})

test('scientific v2 admin control plane binds its own checkout separately from the frozen deployed SHA', () => {
  const workflow = readFileSync(adminWorkflow, 'utf8')
  for (const input of ['expected_control_sha', 'expected_deployed_sha']) {
    assert.match(workflow, new RegExp(`${input}:[\\s\\S]*required:\\s*true`))
  }
  assert.match(workflow, /GITHUB_SHA[" ]+==[" ]+\$CONTROL_SHA|\$GITHUB_SHA[" ]+==[" ]+"\$CONTROL_SHA"/)
  assert.doesNotMatch(workflow, /GITHUB_SHA[" ]+==[" ]+\$EXPECTED_SHA|\$GITHUB_SHA[" ]+==[" ]+"\$EXPECTED_SHA"/)
  assert.match(workflow, /ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=120 /)
})

test('scientific v2 progress inspection is read-only, non-blocking and reports persisted artifact dimensions', () => {
  assert.equal(existsSync(progressWorkflow), true)
  const workflow = readFileSync(progressWorkflow, 'utf8')
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /environment:\s*paperbanana-production/)
  assert.match(workflow, /paperbanana-scientific-v2-progress/)
  assert.match(workflow, /cancel-in-progress:\s*true/)
  assert.match(workflow, /ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=120 /)
  for (const field of ['manifestHash', 'stateHash', 'statusCounts', 'successfulArtifactCount', 'recentSuccessfulArtifacts', 'width', 'height', 'format', 'rawImageHash', 'firstOpen']) {
    assert.match(workflow, new RegExp(field))
  }
  assert.doesNotMatch(workflow, /flock|insertOne|updateOne|findOneAndUpdate|deleteOne|API_KEY|ACCESS_KEY|provider dispatch/i)
})

test('running service digest gates inspect the immutable image object rather than the container object', () => {
  for (const path of [prepare, admin, operator, priceSigner, priceRefresh]) {
    const source = readFileSync(path, 'utf8')
    assert.doesNotMatch(source, /docker inspect --format '\{\{json \.RepoDigests\}\}' "\$[A-Za-z0-9_]*container_id"/)
    assert.match(source, /docker image inspect --format '\{\{json \.RepoDigests\}\}' "\$[A-Za-z0-9_]*image_id"/)
  }
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
  assert.match(readFileSync(priceAuthorizationWorkflow, 'utf8'), /actions\/checkout@[a-f0-9]{40}/)
  const root = mkdtempSync(join(tmpdir(), 'scientific-v2-mode-'))
  try {
    chmodSync(root, 0o550)
    const result = spawnSync('sh', ['-c', 'stat -c "%u:%g:%a" -- "$1" 2>/dev/null || stat -f "%u:%g:%Lp" -- "$1"', 'sh', root], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout.trim(), new RegExp(`^${process.getuid()}:${process.getgid()}:0?550$`))
  } finally { chmodSync(root, 0o700); rmSync(root, { recursive: true, force: true }) }
})
