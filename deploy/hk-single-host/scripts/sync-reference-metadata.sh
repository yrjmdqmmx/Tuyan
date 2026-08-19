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

core_image="$(awk -F= '$1 == "PAPERBANANA_CORE_IMAGE" { print substr($0, index($0, "=") + 1) }' "$deploy_dir/.env")"
if [[ ! "$core_image" =~ ^(ghcr\.io/[a-z0-9_.-]+/paperbanana-core-api@sha256:[0-9a-f]{64}|paperbanana/core-api:[a-zA-Z0-9_.-]+)$ ]]; then
  echo "PAPERBANANA_CORE_IMAGE is missing or is not an approved PaperBanana Core image reference" >&2
  exit 1
fi
docker image inspect "$core_image" >/dev/null
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  -v "$script_dir/emit-reference-metadata-mongosh.mjs:/tmp/emit-reference-metadata-mongosh.mjs:ro" \
  --entrypoint node "$core_image" /tmp/emit-reference-metadata-mongosh.mjs > "$metadata_script"
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
