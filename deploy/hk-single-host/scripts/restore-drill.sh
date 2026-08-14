#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd -- "$script_dir/.." && pwd)"
compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_dir/.env" -f "$deploy_dir/compose.yaml")
archive="${1:-}"

test -n "$archive" && test -r "$archive" || {
  echo "usage: $0 /opt/paperbanana/backups/paperbanana-mongo-*.archive.gz" >&2
  exit 2
}

auth_drill="paperbanana_restore_drill_auth"
business_drill="paperbanana_restore_drill_business"

mongo_eval() {
  local javascript="$1"
  "${compose[@]}" exec -T mongodb sh -c \
    'exec mongosh --quiet --host 127.0.0.1 --username "$MONGO_INITDB_ROOT_USERNAME" --password "$(cat /run/secrets/mongo_root_password)" --authenticationDatabase admin --eval "$1"' \
    _ "$javascript"
}

cleanup() {
  mongo_eval "db.getSiblingDB('$auth_drill').dropDatabase(); db.getSiblingDB('$business_drill').dropDatabase()" >/dev/null || true
}
trap cleanup EXIT
cleanup

cat "$archive" | "${compose[@]}" exec -T mongodb sh -c '
  exec mongorestore --host 127.0.0.1 --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$(cat /run/secrets/mongo_root_password)" --authenticationDatabase admin \
    --archive --gzip --stopOnError --nsInclude="paperbanana_auth.*" \
    --nsFrom="paperbanana_auth.*" --nsTo="paperbanana_restore_drill_auth.*"
'
cat "$archive" | "${compose[@]}" exec -T mongodb sh -c '
  exec mongorestore --host 127.0.0.1 --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$(cat /run/secrets/mongo_root_password)" --authenticationDatabase admin \
    --archive --gzip --stopOnError --nsInclude="paperbanana_business.*" \
    --nsFrom="paperbanana_business.*" --nsTo="paperbanana_restore_drill_business.*"
'

mongo_eval '
  function inventory(name) {
    const target = db.getSiblingDB(name)
    return target.getCollectionNames().sort().map((collection) => ({collection, count: target.getCollection(collection).countDocuments({})}))
  }
  const pairs = [
    ["paperbanana_auth", "paperbanana_restore_drill_auth"],
    ["paperbanana_business", "paperbanana_restore_drill_business"],
  ]
  for (const [source, restored] of pairs) {
    const left = EJSON.stringify(inventory(source))
    const right = EJSON.stringify(inventory(restored))
    if (left !== right) throw new Error(`restore inventory mismatch for ${source}`)
  }
'

echo "Restore drill matched collection names and document counts for both databases."
