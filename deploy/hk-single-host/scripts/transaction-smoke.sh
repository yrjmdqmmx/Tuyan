#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd -- "$script_dir/.." && pwd)"
compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_dir/.env" -f "$deploy_dir/compose.yaml")

"${compose[@]}" run --rm --no-deps -T mongo-init sh -c '
  export AUTH_SMOKE_PASSWORD="$(cat /run/secrets/mongo_auth_password)"
  exec mongosh --quiet --host mongodb --username paperbanana_auth \
    --password "$AUTH_SMOKE_PASSWORD" --authenticationDatabase paperbanana_auth \
    --eval '\''
      const target = db.getSiblingDB("paperbanana_auth")
      const marker = `transaction-smoke-${new Date().toISOString()}`
      const session = db.getMongo().startSession()
      const scoped = session.getDatabase("paperbanana_auth")
      try {
        session.startTransaction({writeConcern: {w: "majority"}})
        scoped.getCollection("_migration_transaction_smoke").insertOne({_id: marker})
        session.commitTransaction()
        if (target.getCollection("_migration_transaction_smoke").countDocuments({_id: marker}) !== 1) {
          throw new Error("transaction did not commit")
        }
        target.getCollection("_migration_transaction_smoke").drop()
      } finally {
        session.endSession()
      }
    '\''
'

echo "Auth MongoDB replica-set transaction smoke passed."
