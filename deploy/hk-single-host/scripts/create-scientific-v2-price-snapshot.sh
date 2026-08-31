#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

expected_sha='' expected_worker_digest='' authority_sha256='' refresh_sha256='' authorization_sha256='' confirm=''
usage() {
  echo 'usage: create-scientific-v2-price-snapshot.sh --expected-sha 40_HEX --expected-worker-digest 64_HEX --registry-authority-sha256 64_HEX --refresh-report-sha256 64_HEX --operator-authorization-sha256 64_HEX --confirm create-scientific-v2-price-snapshot' >&2
  exit 64
}
while (($#)); do
  case "$1" in
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --expected-worker-digest) expected_worker_digest="${2:-}"; shift 2 ;;
    --registry-authority-sha256) authority_sha256="${2:-}"; shift 2 ;;
    --refresh-report-sha256) refresh_sha256="${2:-}"; shift 2 ;;
    --operator-authorization-sha256) authorization_sha256="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ && "$expected_worker_digest" =~ ^[a-f0-9]{64}$ && "$authority_sha256" =~ ^[a-f0-9]{64}$
  && "$refresh_sha256" =~ ^[a-f0-9]{64}$ && "$authorization_sha256" =~ ^[a-f0-9]{64}$
  && "$confirm" == create-scientific-v2-price-snapshot ]] || usage
[[ "$(id -u)" == 0 ]] || { echo 'scientific v2 price signer must run as root' >&2; exit 1; }

repo_root='/opt/paperbanana/repo'
deploy_dir="$repo_root/deploy/hk-single-host"
deploy_env="$deploy_dir/.env"
core_env='/opt/paperbanana/secrets/core.env'
authority_dir='/opt/paperbanana/operator-private/scientific-v2/registry-authorities'
capture_root='/opt/paperbanana/operator-private/scientific-v2/official-price-captures'
report_dir='/opt/paperbanana/operator-private/scientific-v2/price-refresh-reports'
authorization_dir='/opt/paperbanana/operator-private/scientific-v2/operator-price-authorizations'
output_dir='/opt/paperbanana/operator-private/scientific-v2/signed-price-snapshots'
authority_path="$authority_dir/$authority_sha256.json"
report_path="$report_dir/$refresh_sha256.json"
authorization_path="$authorization_dir/$authorization_sha256.json"
capture_dir="$capture_root/$refresh_sha256"
lock_path='/run/lock/paperbanana-hk-production.lock'

[[ "$(git -C "$repo_root" rev-parse --verify HEAD)" == "$expected_sha" ]] || exit 1
tracked_price_signer_paths=(
  deploy/hk-single-host/scripts/create-scientific-v2-price-snapshot.sh
  apps/benchmark-worker/package.json
  apps/benchmark-worker/src/scientific-v2-price-signer-entry.ts
  apps/benchmark-worker/src/scientific-v2-price-attestation.ts
  apps/benchmark-worker/src/scientific-v2-price-refresh.ts
  packages/benchmark-core/src/scientific-v2-price.ts
)
for tracked_path in "${tracked_price_signer_paths[@]}"; do
  git -C "$repo_root" ls-files --error-unmatch "$tracked_path" >/dev/null 2>&1 || exit 1
done
git -C "$repo_root" diff --quiet "$expected_sha" -- "${tracked_price_signer_paths[@]}" || exit 1
[[ -f "$deploy_env" && ! -L "$deploy_env" && -f "$core_env" && ! -L "$core_env" && -f "$authority_path" && ! -L "$authority_path"
  && -f "$report_path" && ! -L "$report_path" && -f "$authorization_path" && ! -L "$authorization_path"
  && -d "$capture_dir" && ! -L "$capture_dir" ]] || exit 1
install -d -o root -g root -m 0700 "$output_dir" "$(dirname "$lock_path")"
exec 9>"$lock_path"
flock -x 9

sha256_file() { sha256sum "$1" 2>/dev/null | awk '{print $1}' || shasum -a 256 "$1" | awk '{print $1}'; }
read_env_value() { awk -F= -v key="$2" '$1==key {value=substr($0,index($0,"=")+1);count++} END {if(count==1)print value;else exit 1}' "$1"; }
worker_image="$(read_env_value "$deploy_env" PAPERBANANA_BENCH_WORKER_IMAGE)"
[[ "${worker_image##*@sha256:}" == "$expected_worker_digest" ]] || exit 1
worker_container_id="$(docker ps --filter label=com.docker.compose.project=paperbanana-hk --filter label=com.docker.compose.service=benchmark-worker --format '{{.ID}}')"
[[ "$worker_container_id" =~ ^[a-f0-9]+$ && "$(docker inspect --format '{{.Config.Image}}' "$worker_container_id")" == "$worker_image" ]] || exit 1
worker_image_id="$(docker inspect --format '{{.Image}}' "$worker_container_id")"
[[ "$worker_image_id" =~ ^sha256:[a-f0-9]{64}$ ]] || exit 1
docker image inspect --format '{{json .RepoDigests}}' "$worker_image_id" | jq -e --arg digest "sha256:$expected_worker_digest" \
  'any(.[]; endswith("@" + $digest))' >/dev/null || exit 1
worker_guard='const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)'
docker exec "$worker_container_id" node -e "$worker_guard" "$expected_sha" >/dev/null
[[ "$(sha256_file "$authority_path")" == "$authority_sha256" && "$(sha256_file "$report_path")" == "$refresh_sha256"
  && "$(sha256_file "$authorization_path")" == "$authorization_sha256" ]] || exit 1
verifier_env="$(mktemp /tmp/paperbanana-scientific-v2-price-signer.XXXXXXXXXXXX)"
cleanup() { rm -f -- "$verifier_env"; }
trap cleanup EXIT
chmod 0600 "$verifier_env"
awk '$0 ~ /^PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET=/ {print; count++} END {exit count==1 ? 0 : 1}' "$core_env" >"$verifier_env"

docker run --rm --pull=never --network none --read-only --cap-drop ALL --security-opt no-new-privileges --user 0:0 \
  --env-file "$verifier_env" \
  -e PAPERBANANA_CODE_SHA="$expected_sha" \
  -e PAPERBANANA_SCIENTIFIC_V2_REGISTRY_AUTHORITY_PATH=/run/paperbanana-scientific-v2/registry-authority.json \
  -e PAPERBANANA_SCIENTIFIC_V2_PRICE_REFRESH_REPORT_PATH=/run/paperbanana-scientific-v2/price-refresh-report.json \
  -e PAPERBANANA_SCIENTIFIC_V2_PRICE_CAPTURE_DIR=/run/paperbanana-scientific-v2/captures \
  -e PAPERBANANA_SCIENTIFIC_V2_OPERATOR_PRICE_AUTHORIZATION_PATH=/run/paperbanana-scientific-v2/operator-price-authorization.json \
  -e PAPERBANANA_SCIENTIFIC_V2_PRICE_OUTPUT_DIR=/run/paperbanana-scientific-v2/output \
  -v "$authority_path:/run/paperbanana-scientific-v2/registry-authority.json:ro" \
  -v "$report_path:/run/paperbanana-scientific-v2/price-refresh-report.json:ro" \
  -v "$capture_dir:/run/paperbanana-scientific-v2/captures:ro" \
  -v "$authorization_path:/run/paperbanana-scientific-v2/operator-price-authorization.json:ro" \
  -v "$output_dir:/run/paperbanana-scientific-v2/output" \
  "$worker_image_id" node dist/scientific-v2-price-signer.mjs
