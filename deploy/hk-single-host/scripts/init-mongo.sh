#!/usr/bin/env bash
set -Eeuo pipefail

read_secret() {
  local path="$1"
  test -r "$path" || { echo "missing required secret file: $path" >&2; exit 1; }
  tr -d '\r\n' < "$path"
}

root_password="$(read_secret "$MONGO_ROOT_PASSWORD_FILE")"
export PAPERBANANA_AUTH_DB_PASSWORD
export PAPERBANANA_BUSINESS_DB_PASSWORD
export PAPERBANANA_BENCH_DB_PASSWORD
export PAPERBANANA_BENCH_API_DB_PASSWORD
PAPERBANANA_AUTH_DB_PASSWORD="$(read_secret "$MONGO_AUTH_PASSWORD_FILE")"
PAPERBANANA_BUSINESS_DB_PASSWORD="$(read_secret "$MONGO_BUSINESS_PASSWORD_FILE")"
PAPERBANANA_BENCH_DB_PASSWORD="$(read_secret "$MONGO_BENCH_PASSWORD_FILE")"
PAPERBANANA_BENCH_API_DB_PASSWORD="$(read_secret "$MONGO_BENCH_API_PASSWORD_FILE")"

mongo_admin=(
  mongosh --quiet --host mongodb
  --username "$MONGO_ROOT_USERNAME"
  --password "$root_password"
  --authenticationDatabase admin
)

"${mongo_admin[@]}" --eval '
  try {
    rs.status()
  } catch (error) {
    if (error.codeName !== "NotYetInitialized") throw error
    rs.initiate({_id: "rs0", members: [{_id: 0, host: "mongodb:27017"}]})
  }
'

for _ in $(seq 1 60); do
  if "${mongo_admin[@]}" --eval 'quit(db.hello().isWritablePrimary ? 0 : 1)' >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
"${mongo_admin[@]}" --eval 'quit(db.hello().isWritablePrimary ? 0 : 2)'

"${mongo_admin[@]}" --eval '
  const benchmark = db.getSiblingDB("paperbanana_benchmark")
  const apiWritableCollections = ["paperbanana_benchmark_suites", "paperbanana_benchmark_models", "paperbanana_benchmark_runs", "paperbanana_benchmark_samples", "paperbanana_benchmark_judgments", "paperbanana_benchmark_public_evidence", "paperbanana_benchmark_prompt_submissions", "paperbanana_benchmark_prompt_digests"]
  const scientificV2ApiWritableCollections = ["paperbanana_benchmark_scientific_v2_batches", "paperbanana_benchmark_scientific_v2_dispatches", "paperbanana_benchmark_scientific_v2_review_artifacts", "paperbanana_benchmark_scientific_v2_public_evidence"]
  const scientificV2ApiReleaseStateCollections = ["paperbanana_benchmark_release_heads", "paperbanana_benchmark_release_lifecycle"]
  const scientificV2TransactionalCollections = ["paperbanana_benchmark_release_heads", "paperbanana_benchmark_release_lifecycle"]
  const scientificV2WorkerWritableCollections = ["paperbanana_benchmark_scientific_v2_batches", "paperbanana_benchmark_scientific_v2_dispatches"]
  const existingBenchmarkCollections = new Set(benchmark.getCollectionNames())
  for (const collection of scientificV2TransactionalCollections) {
    if (!existingBenchmarkCollections.has(collection)) benchmark.createCollection(collection)
  }
  const sampleCollection = benchmark.getCollection("paperbanana_benchmark_samples")
  sampleCollection.createIndex(
    {runId: 1, phase: 1, caseId: 1, repetition: 1},
    {unique: true, name: "phase_sample_unique"},
  )
  const phaseIndex = sampleCollection.getIndexes().find(index => index.name === "phase_sample_unique")
  if (!phaseIndex || phaseIndex.unique !== true || JSON.stringify(phaseIndex.key) !== JSON.stringify({runId: 1, phase: 1, caseId: 1, repetition: 1})) {
    throw new Error("phase_sample_unique verification failed")
  }
  const legacySampleIndex = sampleCollection.getIndexes().find(index => index.name === "runId_1_caseId_1_repetition_1")
  if (legacySampleIndex) sampleCollection.dropIndex(legacySampleIndex.name)

  const judgmentCollection = benchmark.getCollection("paperbanana_benchmark_judgments")
  judgmentCollection.createIndex(
    {runId: 1, sampleId: 1, provider: 1, judgeEpoch: 1},
    {unique: true, name: "automatic_judgment_unique", partialFilterExpression: {status: "completed"}},
  )
  const automaticIndex = judgmentCollection.getIndexes().find(index => index.name === "automatic_judgment_unique")
  if (!automaticIndex || automaticIndex.unique !== true) throw new Error("automatic_judgment_unique verification failed")
  const legacyJudgmentIndex = judgmentCollection.getIndexes().find(index => index.name === "runId_1_sampleId_1_provider_1_judgeEpoch_1")
  if (legacyJudgmentIndex) judgmentCollection.dropIndex(legacyJudgmentIndex.name)

  const dispatchCollection = benchmark.getCollection("paperbanana_benchmark_dispatches")
  dispatchCollection.createIndex(
    {runId: 1, phase: 1, sampleId: 1, logicalProvider: 1, dispatchIndex: 1, judgeEpoch: 1},
    {unique: true, name: "phase_dispatch_unique"},
  )
  const dispatchIndex = dispatchCollection.getIndexes().find(index => index.name === "phase_dispatch_unique")
  if (!dispatchIndex || dispatchIndex.unique !== true || JSON.stringify(dispatchIndex.key) !== JSON.stringify({runId: 1, phase: 1, sampleId: 1, logicalProvider: 1, dispatchIndex: 1, judgeEpoch: 1})) {
    throw new Error("phase_dispatch_unique verification failed")
  }

  const scientificV2IndexContracts = [
    {name: "scientific_v2_batch_id", collection: "paperbanana_benchmark_scientific_v2_batches", keys: {batchId: 1}, options: {unique: true}},
    {name: "scientific_v2_manifest_hash", collection: "paperbanana_benchmark_scientific_v2_batches", keys: {manifestHash: 1}, options: {unique: true}},
    {name: "scientific_v2_dispatch_identity", collection: "paperbanana_benchmark_scientific_v2_dispatches", keys: {manifestHash: 1, slotId: 1, attemptIndex: 1}, options: {unique: true}},
    {name: "scientific_v2_review_identity", collection: "paperbanana_benchmark_scientific_v2_review_artifacts", keys: {batchManifestHash: 1, sourceSetHash: 1, role: 1}, options: {unique: true}},
    {name: "scientific_v2_public_evidence_identity", collection: "paperbanana_benchmark_scientific_v2_public_evidence", keys: {sourceReleaseHash: 1, profileId: 1, caseId: 1}, options: {unique: true}},
  ]
  for (const contract of scientificV2IndexContracts) {
    const collection = benchmark.getCollection(contract.collection)
    collection.createIndex(contract.keys, {...contract.options, name: contract.name})
    const actual = collection.getIndexes().find(index => index.name === contract.name)
    if (!actual || JSON.stringify(actual.key) !== JSON.stringify(contract.keys)
      || actual.unique !== true
      || JSON.stringify(actual.partialFilterExpression) !== JSON.stringify(contract.options.partialFilterExpression)) {
      throw new Error(`${contract.name} verification failed`)
    }
  }

  const scientificReleaseCollection = benchmark.getCollection("paperbanana_benchmark_releases")
  const scientificReleaseLookupKeys = {suiteId: 1, evaluationMode: 1, evaluationEpoch: 1, profileStatus: 1, publishedAt: -1}
  scientificReleaseCollection.createIndex(scientificReleaseLookupKeys, {name: "scientific_v2_release_identity_lookup"})
  const scientificReleaseLookup = scientificReleaseCollection.getIndexes().find(index => index.name === "scientific_v2_release_identity_lookup")
  if (!scientificReleaseLookup || JSON.stringify(scientificReleaseLookup.key) !== JSON.stringify(scientificReleaseLookupKeys)
    || scientificReleaseLookup.unique === true || scientificReleaseLookup.partialFilterExpression !== undefined) {
    throw new Error("scientific_v2_release_identity_lookup verification failed")
  }
  const legacyScientificReleaseIndex = scientificReleaseCollection.getIndexes().find(index => index.name === "scientific_v2_release_identity")
  if (legacyScientificReleaseIndex) scientificReleaseCollection.dropIndex(legacyScientificReleaseIndex.name)

  const roleDefinitions = [
    {
      role: "paperbanana_benchmark_worker_role",
      privileges: [
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_models"}, actions: ["find", "insert", "update", "createIndex", "listIndexes"]},
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_runs"}, actions: ["find", "update", "createIndex", "listIndexes"]},
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_samples"}, actions: ["find", "insert", "update", "createIndex", "listIndexes"]},
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_judgments"}, actions: ["find", "insert", "update", "createIndex", "listIndexes"]},
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_dispatches"}, actions: ["find", "insert"]},
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_public_evidence"}, actions: ["find", "insert", "update"]},
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_releases"}, actions: ["find"]},
        ...scientificV2WorkerWritableCollections.map(collection => ({resource: {db: "paperbanana_benchmark", collection}, actions: ["find", "insert", "update"]})),
      ],
    },
    {
      role: "paperbanana_benchmark_api_role",
      privileges: [
        ...apiWritableCollections.map(collection => ({resource: {db: "paperbanana_benchmark", collection}, actions: ["find", "insert", "update", "createIndex", "listIndexes"]})),
        ...scientificV2ApiWritableCollections.map(collection => ({resource: {db: "paperbanana_benchmark", collection}, actions: ["find", "insert", "update", "createIndex", "listIndexes"]})),
        ...scientificV2ApiReleaseStateCollections.map(collection => ({resource: {db: "paperbanana_benchmark", collection}, actions: ["find", "insert", "update"]})),
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_dispatches"}, actions: ["find"]},
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_releases"}, actions: ["find", "insert"]},
      ],
    },
  ]
  for (const definition of roleDefinitions) {
    if (benchmark.getRole(definition.role)) benchmark.updateRole(definition.role, {privileges: definition.privileges, roles: []})
    else benchmark.createRole({role: definition.role, privileges: definition.privileges, roles: []})
  }
  const users = [
    {database: "paperbanana_auth", username: "paperbanana_auth", password: process.env.PAPERBANANA_AUTH_DB_PASSWORD},
    {database: "paperbanana_business", username: "paperbanana_business", password: process.env.PAPERBANANA_BUSINESS_DB_PASSWORD},
    {database: "paperbanana_benchmark", username: "paperbanana_benchmark", password: process.env.PAPERBANANA_BENCH_DB_PASSWORD, roles: [{role: "paperbanana_benchmark_worker_role", db: "paperbanana_benchmark"}]},
    {database: "paperbanana_benchmark", username: "paperbanana_benchmark_api", password: process.env.PAPERBANANA_BENCH_API_DB_PASSWORD, roles: [{role: "paperbanana_benchmark_api_role", db: "paperbanana_benchmark"}]},
  ]
  for (const user of users) {
    const target = db.getSiblingDB(user.database)
    const roles = user.roles || [{role: "readWrite", db: user.database}]
    if (target.getUser(user.username)) target.updateUser(user.username, {pwd: user.password, roles})
    else target.createUser({user: user.username, pwd: user.password, roles})
  }
'

unset PAPERBANANA_AUTH_DB_PASSWORD PAPERBANANA_BUSINESS_DB_PASSWORD PAPERBANANA_BENCH_DB_PASSWORD PAPERBANANA_BENCH_API_DB_PASSWORD root_password
echo "MongoDB replica set and application users are ready."
