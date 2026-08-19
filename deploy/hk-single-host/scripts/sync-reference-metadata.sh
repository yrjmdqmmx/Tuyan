#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd -- "$script_dir/.." && pwd)"
repo_dir="$(cd -- "$deploy_dir/../.." && pwd)"
compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_dir/.env" -f "$deploy_dir/compose.yaml")

mode="sync"
if [[ $# -eq 2 && "$1" == "--rollback" && "$2" == "--legacy-core-active" ]]; then
  mode="rollback"
elif [[ "${1:-}" == "--rollback" ]]; then
  echo "Refusing metadata rollback: the legacy Core image must be active before metadata rollback. Re-run with --rollback --legacy-core-active after that cutover." >&2
  exit 2
elif [[ $# -ne 0 ]]; then
  echo "Usage: $0 [--rollback --legacy-core-active]" >&2
  exit 2
fi
emitter_name="emit-reference-metadata-mongosh.mjs"
if [[ "$mode" == "rollback" ]]; then
  emitter_name="emit-reference-metadata-rollback-mongosh.mjs"
fi

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
  -v "$script_dir/emit-reference-metadata-mongosh.mjs:/paperbanana/deploy/hk-single-host/scripts/emit-reference-metadata-mongosh.mjs:ro" \
  -v "$script_dir/emit-reference-metadata-rollback-mongosh.mjs:/paperbanana/deploy/hk-single-host/scripts/emit-reference-metadata-rollback-mongosh.mjs:ro" \
  -v "$repo_dir/apps/web/src/data/reference-metadata.zh-CN.v1.js:/paperbanana/apps/web/src/data/reference-metadata.zh-CN.v1.js:ro" \
  -v "$repo_dir/apps/web/src/data/reference-metadata.zh-CN.v2.js:/paperbanana/apps/web/src/data/reference-metadata.zh-CN.v2.js:ro" \
  --entrypoint node "$core_image" "/paperbanana/deploy/hk-single-host/scripts/$emitter_name" > "$metadata_script"
chmod 0444 "$metadata_script"

"${compose[@]}" run --rm --no-deps -T \
  -v "$metadata_script:/tmp/paperbanana-reference-metadata.js:ro" \
  mongo-init sh -c '
    export PAPERBANANA_REFERENCE_SYNC_PASSWORD="$(cat /run/secrets/mongo_business_password)"
    exec mongosh --quiet --host mongodb --username paperbanana_business \
      --password "$PAPERBANANA_REFERENCE_SYNC_PASSWORD" --authenticationDatabase paperbanana_business \
      paperbanana_business /tmp/paperbanana-reference-metadata.js
  '

echo "PaperBanana reference localization metadata mode '$mode' completed."
