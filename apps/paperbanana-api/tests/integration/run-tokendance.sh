#!/usr/bin/env bash
set -Eeuo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
container="tuyan-tokendance-test-$$-${RANDOM}"
cleanup() { docker rm -f -v "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --detach --name "$container" --publish 127.0.0.1::27017 mongo:8.0.16-noble >/dev/null
for _ in $(seq 1 30); do
  if docker exec "$container" mongosh --quiet --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1; then break; fi
  sleep 1
done
port="$(docker port "$container" 27017/tcp | sed -n 's/^127\.0\.0\.1://p')"
[[ "$port" =~ ^[0-9]+$ ]] || { echo 'Loopback Mongo port unavailable' >&2; exit 1; }
cd "$repo_dir/apps/paperbanana-api"
TOKENDANCE_TEST_MONGO_URI="mongodb://127.0.0.1:${port}/?directConnection=true" node --import tsx tests/integration/tokendance.mjs
