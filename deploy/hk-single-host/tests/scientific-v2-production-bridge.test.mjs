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
  assert.equal(statSync(runBundleStager).mode & 0o111, 0o111)
  const source = readFileSync(runBundleStager, 'utf8')
  assert.match(source, /id -u[\s\S]*root/)
  assert.match(source, /--execution-phase/)
  assert.match(source, /canary-only\|full/)
  assert.match(source, /paperbanana-hk-production[.]lock/)
  assert.match(source, /operator-bundles\/scientific-v2/)
  assert.match(source, /admin-results/)
  assert.match(source, /PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET/)
  assert.match(source, /O_NOFOLLOW/)
  assert.match(source, /0?600/)
  assert.match(source, /attestationSecret/)
  assert.match(source, /executionPhase/)
  assert.match(source, /runBundleHash/)
  for (const flag of ['--manifest-hash', '--registry-hash', '--suite-hash', '--price-hash']) assert.match(source, new RegExp(flag))
  assert.match(source, /operator-attestation\/v1/)
  assert.match(source, /reportHash/)
  assert.match(source, /attestationHash/)
  assert.match(source, /tracked_run_bundle_paths/)
  assert.match(source, /git -C "\$repo_root" ls-files --error-unmatch/)
  assert.match(source, /git -C "\$repo_root" diff --quiet "\$expected_sha" --/)
  assert.doesNotMatch(source, /set -x|printenv|cat\s+[^\n]*(?:secret|core[.]env|bench[.]env)/)
  assert.doesNotMatch(source, /jq\s+-c?\s*['"]?[.]['"]?\s+[^\n]*bundle/)
})

test('run-bundle stager rejects re-signed gate, schema, HMAC and frozen-hash tampering before secret assembly', () => {
  const source = readFileSync(runBundleStager, 'utf8')
  const embedded = source.match(/python3 - "\$manifest_path"[\s\S]*?<<'PY'\n([\s\S]*?)\nPY/)
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
    const priceBase = { schemaVersion: 2, entries: [] }
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
      providerSpentCny: { bailian: 0, ark: 0, openrouter: 0 }, providerUnreconciledCny: { bailian: 0, ark: 0, openrouter: 0 }, slots: [],
    }
    const state = { ...stateBase, stateHash: canonicalHash(stateBase) }
    const secret = 'scientific-v2-stage-test-secret-32-bytes-minimum'
    const reportBase = {
      schemaVersion: 2, suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2',
      evaluationEpoch: 'codex-scientific-2026-09-v1', reviewProtocol: 'codex-independent-double-review-v2',
      presentationVersion: 'scientific-leaderboard-v2', batchId: 'batch-test', batchManifestHash: manifest.manifestHash,
      stateHash: state.stateHash, daemon: { enabled: false, status: 'configured-disabled' }, concurrency: 1,
      lockName: '/run/lock/paperbanana-hk-production.lock', providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 360 },
      codexToolCallLimit: 36, modelCount: 1, slotCount: 1, revision: 0, issuedAt: '2026-08-31T00:00:00.000Z',
    }
    const sign = (base, key = createHmac('sha256', secret).update('paperbanana/scientific-v2/operator-attestation/v1').digest()) => {
      const reportHash = canonicalHash(base)
      return { ...base, reportHash, attestationHash: createHmac('sha256', key).update(reportHash).digest('hex') }
    }
    const paths = {
      manifest: join(root, 'manifest.json'), state: join(root, 'state.json'), attestation: join(root, 'attestation.json'),
      env: join(root, 'core.env'), output: join(root, 'output.json'),
    }
    writeFileSync(paths.manifest, JSON.stringify(manifest)); writeFileSync(paths.state, JSON.stringify(state))
    writeFileSync(paths.env, `PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET=${secret}\n`)
    for (const path of [paths.manifest, paths.state, paths.env]) chmodSync(path, 0o600)
    const execute = (attestation) => {
      writeFileSync(paths.attestation, JSON.stringify(attestation)); chmodSync(paths.attestation, 0o600)
      writeFileSync(paths.output, '{}'); chmodSync(paths.output, 0o600)
      return spawnSync('python3', ['-c', embedded[1],
        paths.manifest, fileHash(paths.manifest), paths.state, fileHash(paths.state), paths.attestation, fileHash(paths.attestation),
        paths.env, 'canary-only', codeSha, manifest.manifestHash, registryHash, suiteHash, priceSnapshot.snapshotHash, paths.output, String(process.getuid()),
      ], { encoding: 'utf8' })
    }
    assert.equal(execute(sign(reportBase)).status, 0)
    const directMaster = Buffer.from(secret)
    for (const tampered of [
      { ...sign(reportBase), extra: true },
      sign({ ...reportBase, daemon: { enabled: true, status: 'configured-disabled' } }),
      sign({ ...reportBase, concurrency: 2 }),
      sign({ ...reportBase, providerBudgetsCny: { bailian: 179, ark: 180, openrouter: 360 } }),
      sign(reportBase, directMaster),
      { ...sign(reportBase), reportHash: '0'.repeat(64) },
    ]) assert.notEqual(execute(tampered).status, 0)
    const wrongExpectedPrice = spawnSync('python3', ['-c', embedded[1],
      paths.manifest, fileHash(paths.manifest), paths.state, fileHash(paths.state), paths.attestation, fileHash(paths.attestation),
      paths.env, 'canary-only', codeSha, manifest.manifestHash, registryHash, suiteHash, 'f'.repeat(64), paths.output, String(process.getuid()),
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
  assert.match(source, /\$private_response_sha256[.]attest[.]json/)
  assert.match(source, /privateResponseSha256/)
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
  assert.match(source, /stateBundleHash/)
  assert.match(source, /\$state_bundle_hash[.]state[.]json/)
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
