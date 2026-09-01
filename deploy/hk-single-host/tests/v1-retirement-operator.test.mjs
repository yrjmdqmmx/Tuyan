import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const hostScript = fileURLToPath(new URL('../scripts/retire-v1-benchmark.sh', import.meta.url))
const entry = fileURLToPath(new URL('../../../apps/benchmark-worker/src/v1-retirement-entry.ts', import.meta.url))
const mongoScript = fileURLToPath(new URL('../scripts/retire-v1-benchmark.mongo.js', import.meta.url))
const workflow = fileURLToPath(new URL('../../../.github/workflows/retire-v1-benchmark.yml', import.meta.url))
const packageJson = fileURLToPath(new URL('../../../apps/benchmark-worker/package.json', import.meta.url))
const sha = 'a'.repeat(40)
const v1 = 'b'.repeat(64)
const v2 = 'c'.repeat(64)
const archive = 'd'.repeat(64)

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'paperbanana-v1-retirement-'))
  const deploy = join(root, 'opt/paperbanana/repo/deploy/hk-single-host')
  const secrets = join(root, 'opt/paperbanana/secrets')
  mkdirSync(deploy, { recursive: true })
  mkdirSync(secrets, { recursive: true })
  writeFileSync(join(root, '.paperbanana-hk-test-root'), 'paperbanana-hk-test-root-v1\n', { mode: 0o600 })
  writeFileSync(join(deploy, '.env'), 'PAPERBANANA_BENCH_SECRET_MODE=configured-disabled\n', { mode: 0o600 })
  writeFileSync(join(secrets, 'core.env'), `PAPERBANANA_CODE_SHA=${sha}\n`, { mode: 0o600 })
  writeFileSync(join(secrets, 'bench.env'), `PAPERBANANA_CODE_SHA=${sha}\nPAPERBANANA_BENCH_ENABLED=false\nPAPERBANANA_BENCH_CONCURRENCY=1\n`, { mode: 0o600 })
  chmodSync(root, 0o700)
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

test('V1 retirement production operator is exact-release, archive-bound, disabled-worker and zero-provider guarded', () => {
  for (const path of [hostScript, entry, mongoScript, workflow]) assert.equal(existsSync(path), true, path)
  assert.equal(statSync(hostScript).mode & 0o111, 0o111)
  const host = readFileSync(hostScript, 'utf8')
  assert.match(host, /paperbanana-hk-production\.lock/u)
  assert.match(host, /configured-disabled/u)
  assert.match(host, /PAPERBANANA_BENCH_ENABLED[\s\S]*false/u)
  assert.match(host, /PAPERBANANA_BENCH_CONCURRENCY[\s\S]*1/u)
  assert.match(host, /inspect-v1-retirement-disabled-worker/u)
  assert.match(host, /delete-v1-release-2688db534f05256b6ce2-disabled-worker/u)
  assert.match(host, /archive-manifest-hash/u)
  assert.match(host, /inventory-hash/u)
  assert.match(host, /v1-retirement\.mjs/u)
  assert.match(host, /retire-v1-benchmark\.mongo\.js/u)
  assert.match(host, /read_env_value "\$core_env" PAPERBANANA_BENCH_MONGODB_URI/u)
  assert.match(host, /PAPERBANANA_BENCH_MONGODB_URI="\$retirement_mongodb_uri"/u)
  assert.match(host, /-e PAPERBANANA_BENCH_MONGODB_URI/u)
  assert.doesNotMatch(host, /PAPERBANANA_BENCH_ENABLED\s*=\s*true|phase-operator|scientific-v2-operator|set -x/u)

  const worker = readFileSync(entry, 'utf8')
  assert.match(worker, /generatedOrJudgeCalls:\s*0/u)
  assert.match(worker, /deleteExclusiveV1Objects/u)
  assert.match(worker, /PAPERBANANA_V1_RETIREMENT_ACTIVE_V2_RELEASE_HASH/u)
  assert.doesNotMatch(worker, /generate\(|judge\(|PAPERBANANA_BENCH_ENABLED\s*=\s*['"]true/u)

  const mongo = readFileSync(mongoScript, 'utf8')
  for (const collection of ['paperbanana_benchmark_releases', 'paperbanana_benchmark_runs', 'paperbanana_benchmark_samples', 'paperbanana_benchmark_judgments', 'paperbanana_benchmark_dispatches', 'paperbanana_benchmark_public_evidence', 'paperbanana_benchmark_release_tombstones']) {
    assert.match(mongo, new RegExp(collection, 'u'))
  }
  assert.match(mongo, /deleteMany/u)
  assert.doesNotMatch(mongo, /dropDatabase|drop\(|deleteMany\(\{\}\)|bench\/\*|deleteMulti/u)

  const pkg = JSON.parse(readFileSync(packageJson, 'utf8'))
  assert.match(pkg.scripts.build, /v1-retirement-entry\.ts[\s\S]*dist\/v1-retirement\.mjs/u)
})

test('test roots permit only read-only inspection and reject apply before Docker or deletion', () => {
  const item = fixture()
  try {
    const inspect = spawnSync(hostScript, [
      '--mode', 'inspect', '--expected-sha', sha, '--v1-release-hash', v1, '--active-v2-release-hash', v2,
      '--archive-manifest-hash', archive, '--confirm', 'inspect-v1-retirement-disabled-worker', '--output', '/tmp/paperbanana-v1-retirement-123.json',
    ], { encoding: 'utf8', env: { ...process.env, PAPERBANANA_HK_TEST_ROOT: item.root } })
    assert.equal(inspect.status, 0, inspect.stderr)
    assert.deepEqual(JSON.parse(inspect.stdout), { schemaVersion: 1, mode: 'inspect', releaseHash: v1, activeV2ReleaseHash: v2, dryRun: true, generatedOrJudgeCalls: 0 })

    const apply = spawnSync(hostScript, [
      '--mode', 'apply', '--expected-sha', sha, '--v1-release-hash', v1, '--active-v2-release-hash', v2,
      '--archive-manifest-hash', archive, '--inventory-hash', 'e'.repeat(64), '--confirm', 'delete-v1-release-2688db534f05256b6ce2-disabled-worker', '--output', '/tmp/paperbanana-v1-retirement-123.json',
    ], { encoding: 'utf8', env: { ...process.env, PAPERBANANA_HK_TEST_ROOT: item.root } })
    assert.notEqual(apply.status, 0)
    assert.match(apply.stderr, /test root never permits apply/u)
    assert.doesNotMatch(`${inspect.stdout}${inspect.stderr}${apply.stdout}${apply.stderr}`, /docker|access.?key|secret|provider/i)
  } finally { item.cleanup() }
})

test('manual workflow keeps inspection and deletion in the protected production environment and returns a private artifact', () => {
  const source = readFileSync(workflow, 'utf8')
  assert.match(source, /workflow_dispatch/u)
  assert.match(source, /paperbanana-production/u)
  assert.match(source, /paperbanana-hk-production/u)
  assert.match(source, /expected_deployed_sha/u)
  assert.match(source, /v1_release_hash/u)
  assert.match(source, /active_v2_release_hash/u)
  assert.match(source, /archive_manifest_hash/u)
  assert.match(source, /inventory_hash/u)
  assert.match(source, /actions\/upload-artifact@v4/u)
  assert.match(source, /retire-v1-benchmark\.sh/u)
  assert.doesNotMatch(source, /generation|judge|PAPERBANANA_BENCH_ENABLED\s*=\s*true/iu)
})
