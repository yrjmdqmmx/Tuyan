import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const script = fileURLToPath(new URL('../scripts/backfill-public-evidence.sh', import.meta.url))
const workflow = fileURLToPath(new URL('../../../.github/workflows/backfill-public-evidence.yml', import.meta.url))
const sha = 'a'.repeat(40)
const releaseHash = 'b'.repeat(64)

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'paperbanana-public-evidence-'))
  const deploy = join(root, 'opt/paperbanana/repo/deploy/hk-single-host')
  const secrets = join(root, 'opt/paperbanana/secrets')
  mkdirSync(deploy, { recursive: true })
  mkdirSync(secrets, { recursive: true })
  writeFileSync(join(root, '.paperbanana-hk-test-root'), 'paperbanana-hk-test-root-v1\n', { mode: 0o600 })
  writeFileSync(join(deploy, '.env'), 'PAPERBANANA_BENCH_SECRET_MODE=configured-disabled\n', { mode: 0o600 })
  writeFileSync(join(secrets, 'core.env'), `PAPERBANANA_CODE_SHA=${sha}\n`, { mode: 0o600 })
  writeFileSync(join(secrets, 'bench.env'), [
    `PAPERBANANA_CODE_SHA=${sha}`,
    'PAPERBANANA_BENCH_ENABLED=false',
    'PAPERBANANA_BENCH_CONCURRENCY=1',
    '',
  ].join('\n'), { mode: 0o600 })
  chmodSync(root, 0o700)
  return {
    root,
    run(extra = []) {
      return spawnSync(script, [
        '--mode', 'inspect', '--expected-sha', sha, '--release-hash', releaseHash,
        '--confirm', 'inspect-public-evidence-disabled-worker', ...extra,
      ], { encoding: 'utf8', env: { ...process.env, PAPERBANANA_HK_TEST_ROOT: root } })
    },
    cleanup() { rmSync(root, { recursive: true, force: true }) },
  }
}

test('public evidence backfill operator is executable, fixed-SHA and zero-generation guarded', () => {
  assert.equal(existsSync(script), true)
  assert.equal(statSync(script).mode & 0o111, 0o111)
  const source = readFileSync(script, 'utf8')
  assert.match(source, /paperbanana-hk-production\.lock/)
  assert.ok(source.indexOf('flock -x 9') < source.indexOf('for path in "$deploy_env"'))
  assert.match(source, /configured-disabled/)
  assert.match(source, /PAPERBANANA_BENCH_ENABLED[\s\S]*false/)
  assert.match(source, /PAPERBANANA_BENCH_CONCURRENCY[\s\S]*1/)
  assert.match(source, /build-provenance\.json/)
  assert.match(source, /benchmark-worker[\s\S]*public-evidence-backfill\.mjs/)
  assert.match(source, /PAPERBANANA_PUBLIC_EVIDENCE_RELEASE_HASH/)
  assert.match(source, /generatedOrJudgeCalls[\s\S]*0/)
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_ENABLED\s*=\s*true|set -x|printenv|phase-operator\.mjs/)
})

test('inspect validates the protected host state without starting Docker in test roots', () => {
  const item = fixture()
  try {
    const result = item.run()
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), {
      schemaVersion: 1, mode: 'inspect', releaseHash, dryRun: true, generatedOrJudgeCalls: 0,
    })
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /docker|access.?key|secret/i)

    const benchEnv = join(item.root, 'opt/paperbanana/secrets/bench.env')
    writeFileSync(benchEnv, readFileSync(benchEnv, 'utf8').replace('PAPERBANANA_BENCH_ENABLED=false', 'PAPERBANANA_BENCH_ENABLED=true'), { mode: 0o600 })
    const enabled = item.run()
    assert.notEqual(enabled.status, 0)
    assert.doesNotMatch(`${enabled.stdout}${enabled.stderr}`, /docker|access.?key|secret/i)

    const apply = spawnSync(script, [
      '--mode', 'apply', '--expected-sha', sha, '--release-hash', releaseHash,
      '--confirm', 'backfill-public-evidence-disabled-worker',
    ], { encoding: 'utf8', env: { ...process.env, PAPERBANANA_HK_TEST_ROOT: item.root } })
    assert.notEqual(apply.status, 0)
    assert.match(apply.stderr, /test root never permits apply/)
  } finally { item.cleanup() }
})

test('manual workflow binds the mode, release and deployed SHA to the production environment', () => {
  assert.equal(existsSync(workflow), true)
  const source = readFileSync(workflow, 'utf8')
  assert.match(source, /workflow_dispatch/)
  assert.match(source, /expected_deployed_sha/)
  assert.match(source, /source_release_hash/)
  assert.match(source, /paperbanana-production/)
  assert.match(source, /paperbanana-hk-production/)
  assert.match(source, /cancel-in-progress:\s*false/)
  assert.match(source, /backfill-public-evidence\.sh/)
  assert.match(source, /inspect-public-evidence-disabled-worker/)
  assert.match(source, /backfill-public-evidence-disabled-worker/)
  assert.doesNotMatch(source, /PAPERBANANA_BENCH_ENABLED\s*=\s*true|generation|judge/i)
})
