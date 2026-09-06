import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

const source = (name) => readFileSync(fileURLToPath(new URL(`../scripts/${name}`, import.meta.url)), 'utf8')

test('expansion descriptor validator rejects widened schemas and Codex execution', () => {
  const helper = source('scientific-v2-expansion-input.sh')
  const filter = helper.match(/jq -ce '\n([\s\S]*?)\n  ' "\$path"/)?.[1]
  assert.ok(filter)
  const valid = { schemaVersion: 1, kind: 'single_model_expansion', baseline: { releaseId: 'baseline-release', releaseHash: 'a'.repeat(64), batchId: 'baseline-batch', manifestHash: 'b'.repeat(64) }, targetModelId: 'microsoft/mai-image-2.6' }
  const run = (input) => spawnSync('jq', ['-ce', filter], { input: JSON.stringify(input), encoding: 'utf8' })
  assert.equal(run(valid).status, 0)
  for (const invalid of [
    { ...valid, secret: 'forbidden' }, { ...valid, schemaVersion: 2 }, { ...valid, kind: 'remediation' },
    { ...valid, targetModelId: 'codex:gpt-image-2' },
    { ...valid, baseline: { ...valid.baseline, releaseHash: 'wrong' } },
    { ...valid, baseline: { ...valid.baseline, extra: 'forbidden' } },
  ]) assert.notEqual(run(invalid).status, 0)
  assert.match(helper, /0:0:0\?600:1/)
  assert.match(helper, /sha256sum/)
})

test('read-only preflight requires an active head, matching lifecycle, release and published batch', () => {
  const script = source('inspect-scientific-v2-expansion-preflight.sh')
  const query = script.match(/<<'JS'\n([\s\S]*?)\nJS/)?.[1]
  assert.ok(query)
  const hash = 'a'.repeat(64)
  const documents = {
    paperbanana_benchmark_release_heads: { releaseId: 'release-one', releaseHash: hash },
    paperbanana_benchmark_release_lifecycle: { releaseId: 'release-one', releaseHash: hash, status: 'active' },
    paperbanana_benchmark_releases: { _id: 'release-one', releaseHash: hash, profileStatus: 'published', suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2', evaluationEpoch: 'codex-scientific-2026-09-v1', batchId: 'batch-one', batchManifestHash: 'b'.repeat(64), models: Array.from({ length: 40 }, () => ({})) },
    paperbanana_benchmark_scientific_v2_batches: { batchId: 'batch-one', manifestHash: 'b'.repeat(64), status: 'published', stateHash: 'c'.repeat(64), manifest: { codeSha: 'd'.repeat(40) } },
  }
  const run = (docs) => {
    const lines = []
    runInNewContext(query, { process: { env: { SCIENTIFIC_V2_ACTIVE_RELEASE_HASH: hash } }, print: (line) => lines.push(JSON.parse(line)), db: { getCollection: (name) => ({ findOne: (filter) => {
      const doc = docs[name]
      return doc && Object.entries(filter).every(([key, value]) => doc[key] === value) ? doc : null
    } }) } })
    return lines
  }
  assert.equal(run(documents)[0].modelCount, 40)
  assert.deepEqual(run(documents)[0].baseline, { releaseId: 'release-one', releaseHash: hash, batchId: 'batch-one', manifestHash: 'b'.repeat(64) })
  for (const name of Object.keys(documents)) assert.throws(() => run({ ...documents, [name]: null }), /SCIENTIFIC_V2_ACTIVE_BASELINE_INVALID/)
  assert.throws(() => run({ ...documents, paperbanana_benchmark_release_lifecycle: { ...documents.paperbanana_benchmark_release_lifecycle, status: 'superseded' } }), /SCIENTIFIC_V2_ACTIVE_BASELINE_INVALID/)
  assert.doesNotMatch(script, /\.insertOne\(|\.updateOne\(|\.delete|POST|dist\/scientific-v2-operator/)
  assert.match(script, /flock -s 9/)
})

test('preflight exports exactly five validated immutable deployment inputs', () => {
  const script = source('inspect-scientific-v2-expansion-preflight.sh')
  const validator = script.match(/validate_scientific_v2_image_lock\(\) \{[\s\S]*?\n\}/)?.[0]
  assert.ok(validator)
  const digest = 'a'.repeat(64)
  const variables = {
    gateway_image: `ghcr.io/example/paperbanana-auth-gateway@sha256:${digest}`,
    core_image: `ghcr.io/example/paperbanana-core-api@sha256:${digest}`,
    plot_image: `ghcr.io/example/paperbanana-plot-worker@sha256:${digest}`,
    mongodb_image: `mongo:8.0.17-noble@sha256:${digest}`,
    worker_image: `ghcr.io/example/paperbanana-benchmark-worker@sha256:${digest}`,
  }
  const execute = (values) => spawnSync('bash', ['-c', `${validator}\nvalidate_scientific_v2_image_lock`], {
    encoding: 'utf8', env: { ...process.env, ...values },
  })
  const valid = execute(variables)
  assert.equal(valid.status, 0, valid.stderr)
  assert.deepEqual(JSON.parse(valid.stdout), {
    gateway_image: variables.gateway_image, core_image: variables.core_image, worker_image: variables.plot_image,
    mongodb_image: variables.mongodb_image, benchmark_image: variables.worker_image,
  })
  for (const key of Object.keys(variables)) {
    for (const invalid of ['latest', variables[key].replace('@sha256:', ':tag@sha256:'), `${variables[key]}\nSECRET=forbidden`]) {
      const rejected = execute({ ...variables, [key]: invalid })
      assert.notEqual(rejected.status, 0)
      assert.equal(rejected.stdout, '')
    }
  }
  assert.match(script, /for service in paperbanana-api benchmark-worker auth-gateway plot-worker mongodb/)
  assert.match(script, /sameSha:\(\$deployedSha == \$coreCodeSha and \$deployedSha == \$workerCodeSha\)/)
})

test('read-only preflight verifies historical Core provenance against its own env SHA', () => {
  const script = source('inspect-scientific-v2-expansion-preflight.sh')
  const guard = script.match(/docker exec "\$container_id" node -e '([^']+)' "\$service_code_sha" "\$service"/)?.[1]
  assert.ok(guard)
  const oldCoreSha = 'a'.repeat(40)
  const newestRepoSha = 'b'.repeat(40)
  const run = (sha, provenance) => runInNewContext(guard, {
    require: () => ({ codeSha: provenance }),
    process: { argv: ['node', sha, 'paperbanana-api'], env: { PAPERBANANA_CODE_SHA: oldCoreSha }, exit: () => { throw new Error('PROVENANCE_MISMATCH') } },
  })
  assert.doesNotThrow(() => run(oldCoreSha, oldCoreSha))
  assert.throws(() => run(newestRepoSha, oldCoreSha), /PROVENANCE_MISMATCH/)
  assert.throws(() => run(oldCoreSha, newestRepoSha), /PROVENANCE_MISMATCH/)
  assert.match(script, /paperbanana-api\) expected_image="\$core_image"; service_code_sha="\$core_code_sha"/)
  assert.match(script, /benchmark-worker\) expected_image="\$worker_image"; service_code_sha="\$worker_code_sha"/)
})

test('price and prepare wrappers pass the same protected expansion descriptor to immutable worker execution', () => {
  for (const name of ['refresh-scientific-v2-price-sources.sh', 'authorize-scientific-v2-price-snapshot.sh', 'create-scientific-v2-price-snapshot.sh', 'prepare-scientific-v2-production.sh']) {
    const script = source(name)
    assert.equal(spawnSync('bash', ['-n'], { input: script }).status, 0)
    assert.match(script, /--expansion-sha256/)
    assert.match(script, /ls-files --error-unmatch deploy\/hk-single-host\/scripts\/scientific-v2-expansion-input.sh/)
    assert.match(script, /load_scientific_v2_expansion/)
    if (name !== 'prepare-scientific-v2-production.sh') assert.match(script, /"\$\{expansion_docker_args\[@\]\}"/)
    else assert.match(script, /--argjson expansion "\$expansion_json"/)
  }
  const admin = source('run-scientific-v2-admin-operator.sh')
  assert.match(admin, /operation==="expansion-freeze"[\s\S]*?command:"freezeExpansionBatch"/)
  const workflow = readFileSync(fileURLToPath(new URL('../../../.github/workflows/inspect-scientific-v2-expansion-preflight.yml', import.meta.url)), 'utf8')
  assert.match(workflow, /environment: paperbanana-production/)
  assert.match(workflow, /"\$GITHUB_SHA" == "\$CONTROL_SHA"/)
  assert.match(workflow, /actions\/checkout@[a-f0-9]{40}/)
})

test('expansion freeze uses its distinct protected API command and rejects a missing descriptor', () => {
  const embedded = source('run-scientific-v2-admin-operator.sh').match(/node_script='\n([\s\S]*?)\n'\n"\$\{compose\[@\]\}" exec/)?.[1]
  assert.ok(embedded)
  const input = { batchId: 'expansion-batch', registryAuthority: {}, registrySnapshot: {}, canonicalManifest: {}, manifest: { expansion: { schemaVersion: 1 } }, initialState: {} }
  const run = (value) => spawnSync(process.execPath, ['--input-type=module', '-e', `
    globalThis.fetch=async(url,request)=>{
      const body=JSON.parse(request.body);
      if(body.command!=="freezeExpansionBatch"||request.headers["x-paperbanana-scientific-v2-admin-operation"]!=="expansion-freeze")throw new Error("WRONG_EXPANSION_OPERATION");
      return {ok:true,json:async()=>({code:0,run:{batchId:body.batchId,manifestHash:"a".repeat(64),stateHash:"b".repeat(64),replayed:false}})};
    };
    ${embedded}
  `], { input: JSON.stringify(value), encoding: 'utf8', env: { ...process.env, PAPERBANANA_SCIENTIFIC_V2_ADMIN_OPERATION: 'expansion-freeze' } })
  const accepted = run(input)
  assert.equal(accepted.status, 0, accepted.stderr)
  assert.equal(JSON.parse(accepted.stdout).operation, 'expansion-freeze')
  const rejected = run({ ...input, manifest: {} })
  assert.notEqual(rejected.status, 0)
  assert.match(rejected.stderr, /SCIENTIFIC_V2_ADMIN_INPUT_SCHEMA_INVALID/)
})
