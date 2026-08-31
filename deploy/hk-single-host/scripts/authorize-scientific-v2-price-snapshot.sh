#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

expected_sha='' expected_core_digest='' expected_worker_digest='' authority_sha256='' refresh_sha256='' confirm=''
usage() {
  echo 'usage: authorize-scientific-v2-price-snapshot.sh --expected-sha 40_HEX --expected-core-digest 64_HEX --expected-worker-digest 64_HEX --registry-authority-sha256 64_HEX --refresh-report-sha256 64_HEX --confirm authorize-scientific-v2-price-snapshot' >&2
  exit 64
}
while (($#)); do
  case "$1" in
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --expected-core-digest) expected_core_digest="${2:-}"; shift 2 ;;
    --expected-worker-digest) expected_worker_digest="${2:-}"; shift 2 ;;
    --registry-authority-sha256) authority_sha256="${2:-}"; shift 2 ;;
    --refresh-report-sha256) refresh_sha256="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ && "$expected_core_digest" =~ ^[a-f0-9]{64}$
  && "$expected_worker_digest" =~ ^[a-f0-9]{64}$ && "$authority_sha256" =~ ^[a-f0-9]{64}$
  && "$refresh_sha256" =~ ^[a-f0-9]{64}$ && "$confirm" == authorize-scientific-v2-price-snapshot ]] || usage
[[ "$(id -u)" == 0 ]] || { echo 'scientific v2 price authorization must run as root' >&2; exit 1; }

repo_root='/opt/paperbanana/repo'
deploy_dir="$repo_root/deploy/hk-single-host"
deploy_env="$deploy_dir/.env"
bench_env='/opt/paperbanana/secrets/bench.env'
core_env='/opt/paperbanana/secrets/core.env'
authority_dir='/opt/paperbanana/operator-private/scientific-v2/registry-authorities'
capture_root='/opt/paperbanana/operator-private/scientific-v2/official-price-captures'
report_dir='/opt/paperbanana/operator-private/scientific-v2/price-refresh-reports'
authorization_dir='/opt/paperbanana/operator-private/scientific-v2/operator-price-authorizations'
authority_path="$authority_dir/$authority_sha256.json"
report_path="$report_dir/$refresh_sha256.json"
capture_dir="$capture_root/$refresh_sha256"
lock_path='/run/lock/paperbanana-hk-production.lock'

install -d -o root -g root -m 0700 "$authorization_dir" "$(dirname "$lock_path")"
exec 9>"$lock_path"
flock -x 9
export PAPERBANANA_HK_SHARED_LOCK_FD=9

read_env_value() { awk -F= -v key="$2" '$1==key {value=substr($0,index($0,"=")+1);count++} END {if(count==1)print value;else exit 1}' "$1"; }
sha256_file() { sha256sum "$1" 2>/dev/null | awk '{print $1}' || shasum -a 256 "$1" | awk '{print $1}'; }
[[ "$(git -C "$repo_root" rev-parse --verify HEAD)" == "$expected_sha"
  && "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false
  && "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1
  && -f "$authority_path" && ! -L "$authority_path" && -f "$report_path" && ! -L "$report_path"
  && -d "$capture_dir" && ! -L "$capture_dir" && -f "$core_env" && ! -L "$core_env" ]] || exit 1
[[ "$(sha256_file "$authority_path")" == "$authority_sha256" && "$(sha256_file "$report_path")" == "$refresh_sha256" ]] || exit 1

tracked_price_authorization_paths=(
  .github/workflows/authorize-scientific-v2-price-snapshot.yml
  deploy/hk-single-host/scripts/authorize-scientific-v2-price-snapshot.sh
  deploy/hk-single-host/scripts/create-scientific-v2-price-snapshot.sh
  apps/benchmark-worker/package.json
  apps/benchmark-worker/src/scientific-v2-price-authorization-entry.ts
  apps/benchmark-worker/src/scientific-v2-price-authorization.ts
  apps/benchmark-worker/src/scientific-v2-price-policy.ts
  apps/benchmark-worker/src/scientific-v2-price-attestation.ts
  apps/benchmark-worker/src/scientific-v2-price-refresh.ts
  apps/benchmark-worker/src/scientific-v2-manifest.ts
  packages/benchmark-core/src/scientific-v2-price.ts
  apps/paperbanana-api/src/scientific-v2-repository.ts
  deploy/hk-single-host/scripts/stage-scientific-v2-run-bundle.sh
  deploy/hk-single-host/scripts/run-scientific-v2-operator.sh
)
for tracked_path in "${tracked_price_authorization_paths[@]}"; do
  git -C "$repo_root" ls-files --error-unmatch "$tracked_path" >/dev/null 2>&1 || exit 1
done
git -C "$repo_root" diff --quiet "$expected_sha" -- "${tracked_price_authorization_paths[@]}" || exit 1
[[ -z "$(git -C "$repo_root" status --porcelain --untracked-files=all)" ]] || exit 1

core_image="$(read_env_value "$deploy_env" PAPERBANANA_CORE_IMAGE)"
worker_image="$(read_env_value "$deploy_env" PAPERBANANA_BENCH_WORKER_IMAGE)"
[[ "${core_image##*@sha256:}" == "$expected_core_digest" && "${worker_image##*@sha256:}" == "$expected_worker_digest" ]] || exit 1
verify_running_image() {
  local service="$1" expected_image="$2" expected_digest="$3" guard="$4" container_id image_id
  container_id="$(docker ps --filter label=com.docker.compose.project=paperbanana-hk --filter label=com.docker.compose.service="$service" --format '{{.ID}}')"
  [[ "$container_id" =~ ^[a-f0-9]+$ && "$(docker inspect --format '{{.Config.Image}}' "$container_id")" == "$expected_image" ]] || exit 1
  image_id="$(docker inspect --format '{{.Image}}' "$container_id")"
  [[ "$image_id" =~ ^sha256:[a-f0-9]{64}$ ]] || exit 1
  docker image inspect --format '{{json .RepoDigests}}' "$image_id" | jq -e --arg digest "sha256:$expected_digest" \
    'any(.[]; endswith("@" + $digest))' >/dev/null || exit 1
  docker exec "$container_id" node -e "$guard" "$expected_sha" >/dev/null
  printf '%s' "$image_id"
}
core_guard='const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)'
worker_guard='const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1]||process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")process.exit(1)'
verify_running_image paperbanana-api "$core_image" "$expected_core_digest" "$core_guard" >/dev/null
worker_image_id="$(verify_running_image benchmark-worker "$worker_image" "$expected_worker_digest" "$worker_guard")"

verifier_env="$(mktemp /tmp/paperbanana-scientific-v2-price-authorization.XXXXXXXXXXXX)"
authorization_result="$(mktemp /tmp/paperbanana-scientific-v2-price-authorization-result.XXXXXXXXXXXX)"
signer_result="$(mktemp /tmp/paperbanana-scientific-v2-price-signer-result.XXXXXXXXXXXX)"
cleanup() { rm -f -- "$verifier_env" "$authorization_result" "$signer_result"; }
trap cleanup EXIT
chmod 0600 "$verifier_env" "$authorization_result" "$signer_result"
awk '$0 ~ /^PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET=/ {print; count++} END {exit count==1 ? 0 : 1}' "$core_env" >"$verifier_env"

docker run --rm --pull=never --network none --read-only --cap-drop ALL --security-opt no-new-privileges --user 0:0 \
  --env-file "$verifier_env" \
  -e PAPERBANANA_CODE_SHA="$expected_sha" \
  -e PAPERBANANA_SCIENTIFIC_V2_PRICE_AUTHORIZATION_CONFIRMATION=authorize-scientific-v2-conservative-upper-bound \
  -e PAPERBANANA_SCIENTIFIC_V2_REGISTRY_AUTHORITY_PATH=/run/paperbanana-scientific-v2/registry-authority.json \
  -e PAPERBANANA_SCIENTIFIC_V2_PRICE_REFRESH_REPORT_PATH=/run/paperbanana-scientific-v2/price-refresh-report.json \
  -e PAPERBANANA_SCIENTIFIC_V2_PRICE_CAPTURE_DIR=/run/paperbanana-scientific-v2/captures \
  -e PAPERBANANA_SCIENTIFIC_V2_OPERATOR_PRICE_AUTHORIZATION_OUTPUT_DIR=/run/paperbanana-scientific-v2/output \
  -v "$authority_path:/run/paperbanana-scientific-v2/registry-authority.json:ro" \
  -v "$report_path:/run/paperbanana-scientific-v2/price-refresh-report.json:ro" \
  -v "$capture_dir:/run/paperbanana-scientific-v2/captures:ro" \
  -v "$authorization_dir:/run/paperbanana-scientific-v2/output" \
  "$worker_image_id" node dist/scientific-v2-price-authorization.mjs >"$authorization_result"

jq -e '
  (.fileSha256 | test("^[a-f0-9]{64}$")) and (.authorizationHash | test("^[a-f0-9]{64}$")) and
  (.unresolvedCount | type) == "number" and .unresolvedCount > 0 and
  (.providerTotals | length) == 3 and
  all(.providerTotals[]; (.baselineCny | type) == "number" and (.worstCaseCny | type) == "number" and
    .baselineCny >= 0 and .worstCaseCny >= .baselineCny and .baselineCny <= .capCny) and
  ([.providerTotals[] | {provider,capCny}] | sort_by(.provider)) ==
    ([{provider:"bailian",capCny:180},{provider:"ark",capCny:180},{provider:"openrouter",capCny:360}] | sort_by(.provider))
' "$authorization_result" >/dev/null
authorization_sha256="$(jq -r .fileSha256 "$authorization_result")"

PAPERBANANA_HK_SHARED_LOCK_FD=9 "$repo_root/deploy/hk-single-host/scripts/create-scientific-v2-price-snapshot.sh" \
  --expected-sha "$expected_sha" --expected-worker-digest "$expected_worker_digest" \
  --registry-authority-sha256 "$authority_sha256" --refresh-report-sha256 "$refresh_sha256" \
  --operator-authorization-sha256 "$authorization_sha256" --confirm create-scientific-v2-price-snapshot >"$signer_result"
jq -e '(.fileSha256 | test("^[a-f0-9]{64}$")) and (.snapshotHash | test("^[a-f0-9]{64}$")) and
  (.capturedAt | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T"))' "$signer_result" >/dev/null

jq -cn --slurpfile authorization "$authorization_result" --slurpfile signed "$signer_result" \
  '{operation:"authorize-scientific-v2-price-snapshot",providerCalls:0,
    authorizationSha256:$authorization[0].fileSha256,authorizationHash:$authorization[0].authorizationHash,
    signedSnapshotSha256:$signed[0].fileSha256,priceSnapshotHash:$signed[0].snapshotHash,
    capturedAt:$signed[0].capturedAt,unresolvedCount:$authorization[0].unresolvedCount,
    providerTotals:$authorization[0].providerTotals,concurrency:1,
    providerCapsCny:{bailian:180,ark:180,openrouter:360},unknownProviderOutcome:"pause_no_retry",
    worker:{enabled:false,concurrency:1},lockName:"/run/lock/paperbanana-hk-production.lock"}'
