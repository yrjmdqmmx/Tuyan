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
  const apiWritableCollections = ["paperbanana_benchmark_suites", "paperbanana_benchmark_models", "paperbanana_benchmark_runs", "paperbanana_benchmark_samples", "paperbanana_benchmark_judgments"]
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

  const roleDefinitions = [
    {
      role: "paperbanana_benchmark_worker_role",
      privileges: [
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_models"}, actions: ["find", "insert", "update", "createIndex", "listIndexes"]},
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_runs"}, actions: ["find", "update", "createIndex", "listIndexes"]},
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_samples"}, actions: ["find", "insert", "update", "createIndex", "listIndexes"]},
        {resource: {db: "paperbanana_benchmark", collection: "paperbanana_benchmark_judgments"}, actions: ["find", "insert", "update", "remove", "createIndex", "listIndexes"]},
      ],
    },
    {
      role: "paperbanana_benchmark_api_role",
      privileges: [
        ...apiWritableCollections.map(collection => ({resource: {db: "paperbanana_benchmark", collection}, actions: ["find", "insert", "update", "createIndex", "listIndexes"]})),
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
