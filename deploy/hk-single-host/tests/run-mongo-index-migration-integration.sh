#!/usr/bin/env bash
set -Eeuo pipefail

deploy_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mongo_image="${MONGO_INDEX_TEST_IMAGE:-mongo:8.0.16-noble}"
case "$mongo_image" in
  mongo:8.*|*/mongo:8.*) ;;
  *)
    echo "MONGO_INDEX_TEST_IMAGE must reference mongo:8.x" >&2
    exit 2
    ;;
esac

test_id="paperbanana-bench-index-${GITHUB_RUN_ID:-local}-$$-${RANDOM}"
network_name="${test_id}-network"
mongo_container="${test_id}-mongodb"
data_volume="${test_id}-data"
key_volume="${test_id}-key"
secret_dir="$(mktemp -d "${TMPDIR:-/tmp}/paperbanana-mongo-index.XXXXXX")"

root_username="paperbanana_root"
root_password="RootIndexMigrationTestOnly_8"
worker_password="WorkerIndexMigrationTestOnly_8"
api_password="ApiIndexMigrationTestOnly_8"

cleanup() {
  docker rm -f "$mongo_container" >/dev/null 2>&1 || true
  docker volume rm -f "$data_volume" "$key_volume" >/dev/null 2>&1 || true
  docker network rm "$network_name" >/dev/null 2>&1 || true
  rm -rf "$secret_dir"
}
trap cleanup EXIT

for command in docker; do
  command -v "$command" >/dev/null || { echo "missing required command: $command" >&2; exit 2; }
done
docker info >/dev/null

printf '%s\n' "$root_password" > "$secret_dir/mongo_root_password"
printf '%s\n' "AuthIndexMigrationTestOnly_8" > "$secret_dir/mongo_auth_password"
printf '%s\n' "BusinessIndexMigrationTestOnly_8" > "$secret_dir/mongo_business_password"
printf '%s\n' "$worker_password" > "$secret_dir/mongo_bench_password"
printf '%s\n' "$api_password" > "$secret_dir/mongo_bench_api_password"
chmod 0600 "$secret_dir"/*

docker network create "$network_name" >/dev/null
docker volume create "$data_volume" >/dev/null
docker volume create "$key_volume" >/dev/null
docker run --rm --volume "$key_volume:/paperbanana-key" "$mongo_image" bash -ceu '
  umask 077
  head -c 756 /dev/urandom | base64 > /paperbanana-key/keyfile
  chown 999:999 /paperbanana-key/keyfile
  chmod 0400 /paperbanana-key/keyfile
'

start_mongo() {
  local authentication="$1"
  if [[ "$authentication" == "enabled" ]]; then
    set -- --auth --keyFile /paperbanana-key/keyfile
  else
    set --
  fi
  docker run --detach \
    --name "$mongo_container" \
    --network "$network_name" \
    --network-alias mongodb \
    --volume "$data_volume:/data/db" \
    --volume "$key_volume:/paperbanana-key:ro" \
    "$mongo_image" \
    mongod --bind_ip_all --replSet rs0 "$@" >/dev/null
}

wait_for_mongo_without_auth() {
  for _ in $(seq 1 60); do
    if docker exec "$mongo_container" mongosh --quiet --eval 'quit(db.adminCommand({ping: 1}).ok ? 0 : 1)' >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done
  docker logs "$mongo_container" >&2
  echo "temporary MongoDB did not become reachable" >&2
  exit 1
}

wait_for_primary_without_auth() {
  for _ in $(seq 1 60); do
    if docker exec "$mongo_container" mongosh --quiet --eval 'quit(db.hello().isWritablePrimary ? 0 : 1)' >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done
  docker logs "$mongo_container" >&2
  echo "temporary MongoDB replica set did not elect a primary" >&2
  exit 1
}

wait_for_primary_with_auth() {
  for _ in $(seq 1 60); do
    if docker exec "$mongo_container" mongosh --quiet \
      --username "$root_username" \
      --password "$root_password" \
      --authenticationDatabase admin \
      --eval 'quit(db.hello().isWritablePrimary ? 0 : 1)' >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done
  docker logs "$mongo_container" >&2
  echo "authenticated temporary MongoDB replica set did not become writable" >&2
  exit 1
}

start_mongo disabled
wait_for_mongo_without_auth
docker exec "$mongo_container" mongosh --quiet --eval '
  rs.initiate({_id: "rs0", members: [{_id: 0, host: "mongodb:27017"}]})
'
wait_for_primary_without_auth
docker exec "$mongo_container" mongosh --quiet --eval "
  db.getSiblingDB('admin').createUser({
    user: '$root_username',
    pwd: '$root_password',
    roles: [{role: 'root', db: 'admin'}],
  })
"
docker rm -f "$mongo_container" >/dev/null

start_mongo enabled
wait_for_primary_with_auth

mongo_root=(
  docker exec "$mongo_container" mongosh --quiet
  --username "$root_username"
  --password "$root_password"
  --authenticationDatabase admin
)

"${mongo_root[@]}" --eval '
  const benchmark = db.getSiblingDB("paperbanana_benchmark")
  benchmark.getCollection("paperbanana_benchmark_samples").createIndex(
    {runId: 1, caseId: 1, repetition: 1},
    {unique: true, name: "runId_1_caseId_1_repetition_1"},
  )
  benchmark.getCollection("paperbanana_benchmark_judgments").createIndex(
    {runId: 1, sampleId: 1, provider: 1, judgeEpoch: 1},
    {unique: true, name: "runId_1_sampleId_1_provider_1_judgeEpoch_1"},
  )
'

run_migration() {
  docker run --rm \
    --network "$network_name" \
    --env MONGO_ROOT_USERNAME="$root_username" \
    --env MONGO_ROOT_PASSWORD_FILE=/paperbanana-secrets/mongo_root_password \
    --env MONGO_AUTH_PASSWORD_FILE=/paperbanana-secrets/mongo_auth_password \
    --env MONGO_BUSINESS_PASSWORD_FILE=/paperbanana-secrets/mongo_business_password \
    --env MONGO_BENCH_PASSWORD_FILE=/paperbanana-secrets/mongo_bench_password \
    --env MONGO_BENCH_API_PASSWORD_FILE=/paperbanana-secrets/mongo_bench_api_password \
    --volume "$deploy_dir/scripts/init-mongo.sh:/usr/local/bin/init-paperbanana-mongo:ro" \
    --volume "$secret_dir:/paperbanana-secrets:ro" \
    "$mongo_image" \
    bash /usr/local/bin/init-paperbanana-mongo
}

run_migration
run_migration

"${mongo_root[@]}" --eval '
  const benchmark = db.getSiblingDB("paperbanana_benchmark")
  const sampleIndexes = benchmark.getCollection("paperbanana_benchmark_samples").getIndexes()
  const sample = sampleIndexes.find(index => index.name === "phase_sample_unique")
  if (!sample) throw new Error("phase_sample_unique is missing")
  if (JSON.stringify(sample.key) !== JSON.stringify({runId: 1, phase: 1, caseId: 1, repetition: 1})) throw new Error("phase_sample_unique keys differ")
  if (sample.unique !== true) throw new Error("phase_sample_unique is not unique")
  if (sample.partialFilterExpression !== undefined) throw new Error("phase_sample_unique has an unexpected partialFilterExpression")
  if (sampleIndexes.some(index => index.name === "runId_1_caseId_1_repetition_1")) throw new Error("legacy sample index remains")

  const judgmentIndexes = benchmark.getCollection("paperbanana_benchmark_judgments").getIndexes()
  const judgment = judgmentIndexes.find(index => index.name === "automatic_judgment_unique")
  if (!judgment) throw new Error("automatic_judgment_unique is missing")
  if (JSON.stringify(judgment.key) !== JSON.stringify({runId: 1, sampleId: 1, provider: 1, judgeEpoch: 1})) throw new Error("automatic_judgment_unique keys differ")
  if (judgment.unique !== true) throw new Error("automatic_judgment_unique is not unique")
  if (JSON.stringify(judgment.partialFilterExpression) !== JSON.stringify({status: "completed"})) throw new Error("automatic_judgment_unique partialFilterExpression differs")
  if (judgmentIndexes.some(index => index.name === "runId_1_sampleId_1_provider_1_judgeEpoch_1")) throw new Error("legacy judgment index remains")

  const dispatchIndexes = benchmark.getCollection("paperbanana_benchmark_dispatches").getIndexes()
  const dispatch = dispatchIndexes.find(index => index.name === "phase_dispatch_unique")
  if (!dispatch) throw new Error("phase_dispatch_unique is missing")
  if (JSON.stringify(dispatch.key) !== JSON.stringify({runId: 1, phase: 1, sampleId: 1, logicalProvider: 1, dispatchIndex: 1, judgeEpoch: 1})) throw new Error("phase_dispatch_unique keys differ")
  if (dispatch.unique !== true) throw new Error("phase_dispatch_unique is not unique")

  const scientificIndexes = [
    ["paperbanana_benchmark_scientific_v2_batches", "scientific_v2_batch_id", {batchId: 1}, undefined],
    ["paperbanana_benchmark_scientific_v2_batches", "scientific_v2_manifest_hash", {manifestHash: 1}, undefined],
    ["paperbanana_benchmark_scientific_v2_dispatches", "scientific_v2_dispatch_identity", {manifestHash: 1, slotId: 1, attemptIndex: 1}, undefined],
    ["paperbanana_benchmark_scientific_v2_review_artifacts", "scientific_v2_review_identity", {batchManifestHash: 1, sourceSetHash: 1, role: 1}, undefined],
    ["paperbanana_benchmark_releases", "scientific_v2_release_identity", {suiteId: 1, evaluationMode: 1, evaluationEpoch: 1}, {evaluationMode: "codex_scientific_v2", profileStatus: "published"}],
    ["paperbanana_benchmark_scientific_v2_public_evidence", "scientific_v2_public_evidence_identity", {sourceReleaseHash: 1, profileId: 1, caseId: 1}, undefined],
  ]
  for (const [collection, name, keys, partial] of scientificIndexes) {
    const actual = benchmark.getCollection(collection).getIndexes().find(index => index.name === name)
    if (!actual || actual.unique !== true || JSON.stringify(actual.key) !== JSON.stringify(keys)
      || JSON.stringify(actual.partialFilterExpression) !== JSON.stringify(partial)) throw new Error(`${name} differs`)
  }
'

docker exec "$mongo_container" mongosh --quiet \
  --username paperbanana_benchmark_api \
  --password "$api_password" \
  --authenticationDatabase paperbanana_benchmark \
  --eval '
    const benchmark = db.getSiblingDB("paperbanana_benchmark")
    const batches = benchmark.getCollection("paperbanana_benchmark_scientific_v2_batches")
    const dispatches = benchmark.getCollection("paperbanana_benchmark_scientific_v2_dispatches")
    const reviews = benchmark.getCollection("paperbanana_benchmark_scientific_v2_review_artifacts")
    const publicEvidence = benchmark.getCollection("paperbanana_benchmark_scientific_v2_public_evidence")
    const releases = benchmark.getCollection("paperbanana_benchmark_releases")
    const releaseHeads = benchmark.getCollection("paperbanana_benchmark_release_heads")
    const releaseLifecycle = benchmark.getCollection("paperbanana_benchmark_release_lifecycle")
    if (batches.createIndex({batchId: 1}, {unique: true, name: "scientific_v2_batch_id"}) !== "scientific_v2_batch_id"
      || !batches.getIndexes().some(index => index.name === "scientific_v2_manifest_hash")) {
      throw new Error("Scientific V2 API createIndex/listIndexes must succeed")
    }
    batches.insertOne({_id: "scientific-v2-api-batch", batchId: "api-batch", manifestHash: "a".repeat(64)})
    batches.updateOne({_id: "scientific-v2-api-batch"}, {$set: {status: "frozen"}})
    if (batches.findOne({_id: "scientific-v2-api-batch"})?.status !== "frozen") throw new Error("Scientific V2 API batch CRUD failed")
    dispatches.insertOne({_id: "scientific-v2-api-dispatch", manifestHash: "a".repeat(64), slotId: "slot-api", attemptIndex: 1})
    dispatches.updateOne({_id: "scientific-v2-api-dispatch"}, {$set: {status: "started"}})
    reviews.insertOne({_id: "scientific-v2-api-review", batchManifestHash: "a".repeat(64), sourceSetHash: "b".repeat(64), role: "A"})
    reviews.updateOne({_id: "scientific-v2-api-review"}, {$set: {status: "ready"}})
    publicEvidence.insertOne({_id: "scientific-v2-api-evidence", sourceReleaseHash: "c".repeat(64), profileId: "profile-api", caseId: "case-api"})
    publicEvidence.updateOne({_id: "scientific-v2-api-evidence"}, {$set: {published: true}})
    releases.insertOne({_id: "scientific-v2-api-release", releaseHash: "d".repeat(64)})
    if (!releases.findOne({_id: "scientific-v2-api-release"})) throw new Error("Scientific V2 API release access failed")
    releaseHeads.insertOne({_id: "scientific-v2-api-release-head", releaseId: "scientific-v2-api-release", releaseHash: "d".repeat(64)})
    releaseHeads.updateOne({_id: "scientific-v2-api-release-head"}, {$set: {updated: true}})
    if (releaseHeads.findOne({_id: "scientific-v2-api-release-head"})?.updated !== true) throw new Error("Scientific V2 API release head CRUD failed")
    releaseLifecycle.insertOne({_id: "scientific-v2-api-release-lifecycle", releaseId: "scientific-v2-api-release", releaseHash: "d".repeat(64), status: "active"})
    releaseLifecycle.updateOne({_id: "scientific-v2-api-release-lifecycle"}, {$set: {updated: true}})
    if (releaseLifecycle.findOne({_id: "scientific-v2-api-release-lifecycle"})?.updated !== true) throw new Error("Scientific V2 API release lifecycle CRUD failed")
    let releaseUpdateRejected = false
    try { releases.updateOne({_id: "scientific-v2-api-release"}, {$set: {profileStatus: "draft"}}) }
    catch (error) { if (error.code === 13 || error.codeName === "Unauthorized") releaseUpdateRejected = true; else throw error }
    if (!releaseUpdateRejected) throw new Error("Scientific V2 API release update must be rejected as Unauthorized")
    let releaseCreateIndexRejected = false
    try { releases.createIndex({profileStatus: 1}, {name: "api_must_not_create_release_index"}) }
    catch (error) { if (error.code === 13 || error.codeName === "Unauthorized") releaseCreateIndexRejected = true; else throw error }
    if (!releaseCreateIndexRejected) throw new Error("Scientific V2 API release createIndex must be rejected as Unauthorized")
    let releaseListIndexesRejected = false
    try { releases.getIndexes() }
    catch (error) { if (error.code === 13 || error.codeName === "Unauthorized") releaseListIndexesRejected = true; else throw error }
    if (!releaseListIndexesRejected) throw new Error("Scientific V2 API release listIndexes must be rejected as Unauthorized")
    let deleteRejected = false
    try { batches.deleteOne({_id: "scientific-v2-api-batch"}) }
    catch (error) { if (error.code === 13 || error.codeName === "Unauthorized") deleteRejected = true; else throw error }
    if (!deleteRejected) throw new Error("Scientific V2 API delete must be rejected as Unauthorized")
  '

docker exec "$mongo_container" mongosh --quiet \
  --username paperbanana_benchmark \
  --password "$worker_password" \
  --authenticationDatabase paperbanana_benchmark \
  --eval '
    const samples = db.getSiblingDB("paperbanana_benchmark").getCollection("paperbanana_benchmark_samples")
    let rejected = false
    try {
      samples.dropIndex("phase_sample_unique")
    } catch (error) {
      if (error.code === 13 || error.codeName === "Unauthorized") rejected = true
      else throw error
    }
    if (!rejected) throw new Error("Worker dropIndex must be rejected as Unauthorized")
    if (!samples.getIndexes().some(index => index.name === "phase_sample_unique")) throw new Error("unauthorized attempt removed the index")

    const dispatches = db.getSiblingDB("paperbanana_benchmark").getCollection("paperbanana_benchmark_dispatches")
    dispatches.insertOne({_id: "dispatch:openrouter:permission-sample:0", runId: "permission-run", phase: "full", sampleId: "permission-sample", logicalProvider: "openrouter", dispatchIndex: 0, judgeEpoch: "permission-epoch"})
    let updateRejected = false
    try { dispatches.updateOne({_id: "dispatch:openrouter:permission-sample:0"}, {$set: {phase: "quick"}}) }
    catch (error) { if (error.code === 13 || error.codeName === "Unauthorized") updateRejected = true; else throw error }
    if (!updateRejected) throw new Error("Worker dispatch update must be rejected as Unauthorized")
    let deleteRejected = false
    try { dispatches.deleteOne({_id: "dispatch:openrouter:permission-sample:0"}) }
    catch (error) { if (error.code === 13 || error.codeName === "Unauthorized") deleteRejected = true; else throw error }
    if (!deleteRejected) throw new Error("Worker dispatch delete must be rejected as Unauthorized")
    const durable = dispatches.findOne({_id: "dispatch:openrouter:permission-sample:0"})
    if (!durable || durable.phase !== "full") throw new Error("append-only dispatch marker was mutated")

    const scientificBatches = db.getSiblingDB("paperbanana_benchmark").getCollection("paperbanana_benchmark_scientific_v2_batches")
    const scientificDispatches = db.getSiblingDB("paperbanana_benchmark").getCollection("paperbanana_benchmark_scientific_v2_dispatches")
    scientificBatches.insertOne({_id: "scientific-v2-worker-batch", batchId: "worker-batch", manifestHash: "e".repeat(64)})
    scientificBatches.updateOne({_id: "scientific-v2-worker-batch"}, {$set: {status: "running"}})
    if (scientificBatches.findOne({_id: "scientific-v2-worker-batch"})?.status !== "running") throw new Error("Scientific V2 Worker batch access failed")
    scientificDispatches.insertOne({_id: "scientific-v2-worker-dispatch", manifestHash: "e".repeat(64), slotId: "slot-worker", attemptIndex: 1})
    scientificDispatches.updateOne({_id: "scientific-v2-worker-dispatch"}, {$set: {status: "started"}})
    if (scientificDispatches.findOne({_id: "scientific-v2-worker-dispatch"})?.status !== "started") throw new Error("Scientific V2 Worker dispatch access failed")
    const rejectWrite = (collection, label) => {
      let denied = false
      try { collection.insertOne({_id: `forbidden-${label}`}) }
      catch (error) { if (error.code === 13 || error.codeName === "Unauthorized") denied = true; else throw error }
      if (!denied) throw new Error(`Scientific V2 Worker ${label} write must be rejected as Unauthorized`)
    }
    rejectWrite(db.getSiblingDB("paperbanana_benchmark").getCollection("paperbanana_benchmark_scientific_v2_review_artifacts"), "review")
    rejectWrite(db.getSiblingDB("paperbanana_benchmark").getCollection("paperbanana_benchmark_scientific_v2_public_evidence"), "public evidence")
    rejectWrite(db.getSiblingDB("paperbanana_benchmark").getCollection("paperbanana_benchmark_releases"), "release")
    rejectWrite(db.getSiblingDB("paperbanana_benchmark").getCollection("paperbanana_benchmark_release_heads"), "release head")
    rejectWrite(db.getSiblingDB("paperbanana_benchmark").getCollection("paperbanana_benchmark_release_lifecycle"), "release lifecycle")
    let scientificDeleteRejected = false
    try { scientificBatches.deleteOne({_id: "scientific-v2-worker-batch"}) }
    catch (error) { if (error.code === 13 || error.codeName === "Unauthorized") scientificDeleteRejected = true; else throw error }
    if (!scientificDeleteRejected) throw new Error("Scientific V2 Worker delete must be rejected as Unauthorized")
    let scientificIndexRejected = false
    try { scientificBatches.createIndex({status: 1}, {name: "worker_must_not_create_index"}) }
    catch (error) { if (error.code === 13 || error.codeName === "Unauthorized") scientificIndexRejected = true; else throw error }
    if (!scientificIndexRejected) throw new Error("Scientific V2 Worker createIndex must be rejected as Unauthorized")
  '

echo "MongoDB 8 benchmark index migration integration test passed."
