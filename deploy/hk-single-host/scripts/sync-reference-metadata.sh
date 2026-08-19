#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd -- "$script_dir/.." && pwd)"
compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_dir/.env" -f "$deploy_dir/compose.yaml")

metadata_script="$(mktemp)"
cleanup() {
  rm -f -- "$metadata_script"
}
trap cleanup EXIT

node "$script_dir/emit-reference-metadata-mongosh.mjs" > "$metadata_script"
chmod 0444 "$metadata_script"

"${compose[@]}" run --rm --no-deps -T \
  -v "$metadata_script:/tmp/paperbanana-reference-metadata.js:ro" \
  mongo-init sh -c '
    export PAPERBANANA_REFERENCE_SYNC_PASSWORD="$(cat /run/secrets/mongo_business_password)"
    exec mongosh --quiet --host mongodb --username paperbanana_business \
      --password "$PAPERBANANA_REFERENCE_SYNC_PASSWORD" --authenticationDatabase paperbanana_business \
      paperbanana_business /tmp/paperbanana-reference-metadata.js
  '

echo "PaperBanana reference localization metadata is synchronized."
