#!/usr/bin/env bash
set -Eeuo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# Never create a test container on an SSH/TCP production Docker context.
endpoint="$(docker context inspect "$(docker context show)" --format '{{.Endpoints.docker.Host}}')"
[[ "$endpoint" == unix://* && -z "${DOCKER_HOST:-}" && -z "${DOCKER_CONTEXT:-}" ]] || { echo 'A local Unix Docker context is required' >&2; exit 1; }
docker image inspect mongo:8.0.16-noble >/dev/null
container="tuyan-stage01-test-$$-${RANDOM}"
cleanup() { docker rm -f -v "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --detach --name "$container" --memory 512m --cpus 1 --publish 127.0.0.1::27017 mongo:8.0.16-noble mongod --replSet rs0 --bind_ip_all >/dev/null
for _ in $(seq 1 30); do
  if docker exec "$container" mongosh --quiet --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})' >/dev/null
for _ in $(seq 1 30); do
  if docker exec "$container" mongosh --quiet --eval 'quit(db.hello().isWritablePrimary ? 0 : 1)' >/dev/null 2>&1; then break; fi
  sleep 1
done
port="$(docker port "$container" 27017/tcp | sed -n 's/^127\.0\.0\.1://p')"
[[ "$port" =~ ^[0-9]+$ ]] || { echo 'Loopback Mongo port unavailable' >&2; exit 1; }
cd "$repo_dir/apps/paperbanana-api"
# An allowlist environment contains no real model, database, object-store or proxy credentials.
env -i PATH="$PATH" TMPDIR="${TMPDIR:-/tmp}" LANG=C.UTF-8 \
  PAPERBANANA_CANDIDATE_CONCURRENCY=1 \
  CONCURRENCY_TEST_MONGO_URI="mongodb://127.0.0.1:${port}/?directConnection=true" \
  CONCURRENCY_TEST_REPORT="${CONCURRENCY_TEST_REPORT:-}" \
  node --import tsx tests/integration/concurrent-tasks.mjs
