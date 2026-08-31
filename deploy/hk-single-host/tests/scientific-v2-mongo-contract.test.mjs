import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const deployRoot = new URL('../', import.meta.url)
const repositoryRoot = new URL('../../../', import.meta.url)
const readDeploy = (path) => readFileSync(new URL(path, deployRoot), 'utf8')
const readRepository = (path) => readFileSync(new URL(path, repositoryRoot), 'utf8')

const collections = {
  batches: 'paperbanana_benchmark_scientific_v2_batches',
  dispatches: 'paperbanana_benchmark_scientific_v2_dispatches',
  reviews: 'paperbanana_benchmark_scientific_v2_review_artifacts',
  publicEvidence: 'paperbanana_benchmark_scientific_v2_public_evidence',
}

function parseSingleLineArray(source, name) {
  const matched = source.match(new RegExp(`const ${name} = (\\[[^\\n]+\\])`))
  assert.ok(matched, `${name} must be an explicit single-line allowlist`)
  return JSON.parse(matched[1])
}

test('Mongo root migration creates every API-declared scientific v2 index before roles and service startup', () => {
  const initMongo = readDeploy('scripts/init-mongo.sh')
  const repository = readRepository('apps/paperbanana-api/src/scientific-v2-repository.ts')
  const compose = readDeploy('compose.yaml')
  const apiOwnedIndexes = [
    'scientific_v2_batch_id',
    'scientific_v2_manifest_hash',
    'scientific_v2_dispatch_identity',
    'scientific_v2_review_identity',
    'scientific_v2_public_evidence_identity',
  ]
  for (const name of apiOwnedIndexes) {
    assert.match(repository, new RegExp(`name: '${name}'`), `${name} must remain API-declared`)
    assert.match(initMongo, new RegExp(`name: "${name}"`), `${name} must be root-migrated`)
  }
  assert.doesNotMatch(repository, /name: 'scientific_v2_release_identity'/)
  assert.match(initMongo, /name: "scientific_v2_release_identity"/)
  assert.match(initMongo, /scientific_v2_batch_id[\s\S]*\{batchId:\s*1\}[\s\S]*unique:\s*true/)
  assert.match(initMongo, /scientific_v2_manifest_hash[\s\S]*\{manifestHash:\s*1\}[\s\S]*unique:\s*true/)
  assert.match(initMongo, /scientific_v2_dispatch_identity[\s\S]*\{manifestHash:\s*1,\s*slotId:\s*1,\s*attemptIndex:\s*1\}[\s\S]*unique:\s*true/)
  assert.match(initMongo, /scientific_v2_review_identity[\s\S]*\{batchManifestHash:\s*1,\s*sourceSetHash:\s*1,\s*role:\s*1\}[\s\S]*unique:\s*true/)
  assert.match(initMongo, /scientific_v2_public_evidence_identity[\s\S]*\{sourceReleaseHash:\s*1,\s*profileId:\s*1,\s*caseId:\s*1\}[\s\S]*unique:\s*true/)
  assert.match(initMongo, /scientific_v2_release_identity[\s\S]*partialFilterExpression:[\s\S]*evaluationMode:\s*"codex_scientific_v2"[\s\S]*profileStatus:\s*"published"/)
  assert.ok(initMongo.indexOf('scientific_v2_batch_id') < initMongo.indexOf('const roleDefinitions'))
  assert.match(compose, /paperbanana-api:[\s\S]*depends_on:[\s\S]*mongo-init:[\s\S]*condition:\s*service_completed_successfully/)
  assert.match(compose, /benchmark-worker:[\s\S]*depends_on:[\s\S]*mongo-init:[\s\S]*condition:\s*service_completed_successfully/)
})

test('scientific v2 API and Worker collection allowlists are exact and least privileged', () => {
  const initMongo = readDeploy('scripts/init-mongo.sh')
  const scientificRepository = readRepository('apps/paperbanana-api/src/scientific-v2-repository.ts')
  assert.deepEqual(parseSingleLineArray(initMongo, 'scientificV2ApiWritableCollections'), Object.values(collections))
  assert.deepEqual(parseSingleLineArray(initMongo, 'scientificV2WorkerWritableCollections'), [collections.batches, collections.dispatches])

  const workerRoleStart = initMongo.indexOf('role: "paperbanana_benchmark_worker_role"')
  const apiRoleStart = initMongo.indexOf('role: "paperbanana_benchmark_api_role"')
  const roleDefinitionsEnd = initMongo.indexOf('  for (const definition of roleDefinitions)', apiRoleStart)
  assert.ok(workerRoleStart >= 0 && apiRoleStart > workerRoleStart && roleDefinitionsEnd > apiRoleStart)
  const workerRole = initMongo.slice(workerRoleStart, apiRoleStart)
  const apiRole = initMongo.slice(apiRoleStart, roleDefinitionsEnd)
  assert.match(workerRole, /scientificV2WorkerWritableCollections\.map\(collection => \(\{resource: \{db: "paperbanana_benchmark", collection}, actions: \["find", "insert", "update"\]\}\)\)/)
  assert.doesNotMatch(workerRole, /scientificV2ApiWritableCollections/)
  assert.doesNotMatch(workerRole, /paperbanana_benchmark_scientific_v2_(?:review_artifacts|public_evidence)/)
  assert.match(workerRole, /collection: "paperbanana_benchmark_releases"[\s\S]*actions: \["find"\]/)

  assert.match(apiRole, /scientificV2ApiWritableCollections\.map\(collection => \(\{resource: \{db: "paperbanana_benchmark", collection}, actions: \["find", "insert", "update", "createIndex", "listIndexes"\]\}\)\)/)
  assert.match(apiRole, /collection: "paperbanana_benchmark_releases"[\s\S]*actions: \["find", "insert"\]/)
  assert.equal(apiRole.match(/collection: "paperbanana_benchmark_releases"/g)?.length, 1)
  const releasePrivilege = apiRole.match(/\{resource: \{db: "paperbanana_benchmark", collection: "paperbanana_benchmark_releases"\}, actions: \[[^\]]+\]\}/)?.[0] || ''
  assert.doesNotMatch(releasePrivilege, /createIndex|listIndexes|delete|remove|drop/)
  assert.match(scientificRepository, /releases\.findOne\(/)
  assert.match(scientificRepository, /releases\.insertOne\(/)
  assert.doesNotMatch(scientificRepository, /releases\.(?:update|updateOne|findOneAndUpdate|replaceOne|deleteOne|remove|bulkWrite)\(/)
  const roleDefinitions = initMongo.slice(initMongo.indexOf('const roleDefinitions'), initMongo.indexOf('const users'))
  assert.doesNotMatch(roleDefinitions, /"delete"|"remove"|"dropCollection"|"dropIndex"|"anyAction"/)
  assert.doesNotMatch(roleDefinitions, /resource:\s*\{db:\s*"(?:paperbanana_benchmark)?",\s*collection:\s*""\}/)
})

test('resident Worker cannot migrate scientific v2 and run gates remain one-off only', () => {
  const compose = readDeploy('compose.yaml')
  const operator = readDeploy('scripts/run-scientific-v2-operator.sh')
  const worker = compose.match(/\n  benchmark-worker:\n([\s\S]*?)\n  benchmark-operator:/)?.[1] || ''
  const oneOff = compose.match(/\n  benchmark-operator:\n([\s\S]*?)\n  auth-gateway:/)?.[1] || ''
  assert.doesNotMatch(worker, /PAPERBANANA_SCIENTIFIC_V2_RUN_ENABLED|PAPERBANANA_SCIENTIFIC_V2_HOST_LOCK_PROOF|createIndex|listIndexes/)
  assert.match(worker, /depends_on:[\s\S]*mongo-init:[\s\S]*condition:\s*service_completed_successfully/)
  assert.doesNotMatch(oneOff, /PAPERBANANA_SCIENTIFIC_V2_RUN_ENABLED|PAPERBANANA_SCIENTIFIC_V2_HOST_LOCK_PROOF/)
  assert.match(operator, /\(\(keys \| sort\) == \["gate","manifest","operation","report","state"\] and \(\.executionPhase == null\)\)/)
  assert.match(operator, /\(\(keys \| sort\) == \["executionPhase","gate","manifest","operation","report","state"\] and \(\.executionPhase == "canary-only" or \.executionPhase == "full"\)\)/)
  assert.doesNotMatch(operator, /\.env == \{/)
  const paidRunner = operator.match(/run_paid\(\) \{([\s\S]*?)^\}/m)?.[1] || ''
  assert.match(paidRunner, /-e PAPERBANANA_BENCH_ENABLED=false[\s\S]*-e PAPERBANANA_BENCH_CONCURRENCY=1/)
  assert.match(paidRunner, /-e PAPERBANANA_SCIENTIFIC_V2_RUN_ENABLED=true[\s\S]*-e PAPERBANANA_SCIENTIFIC_V2_HOST_LOCK_PROOF=\/run\/lock\/paperbanana-hk-production\.lock/)
})

test('Mongo integration harness proves scientific v2 API access and Worker denials', () => {
  const harness = readDeploy('tests/run-mongo-index-migration-integration.sh')
  for (const name of [
    'scientific_v2_batch_id', 'scientific_v2_manifest_hash', 'scientific_v2_dispatch_identity',
    'scientific_v2_review_identity', 'scientific_v2_release_identity', 'scientific_v2_public_evidence_identity',
  ]) assert.match(harness, new RegExp(name))
  assert.match(harness, /Scientific V2 API createIndex\/listIndexes must succeed/)
  assert.match(harness, /Scientific V2 API release createIndex must be rejected as Unauthorized/)
  assert.match(harness, /Scientific V2 API release listIndexes must be rejected as Unauthorized/)
  assert.match(harness, /Scientific V2 API release update must be rejected as Unauthorized/)
  assert.match(harness, /Scientific V2 Worker \$\{label\} write must be rejected as Unauthorized/)
  assert.match(harness, /rejectWrite\([^\n]+, "review"\)/)
  assert.match(harness, /rejectWrite\([^\n]+, "public evidence"\)/)
  assert.match(harness, /rejectWrite\([^\n]+, "release"\)/)
  assert.match(harness, /Scientific V2 Worker delete must be rejected as Unauthorized/)
})
