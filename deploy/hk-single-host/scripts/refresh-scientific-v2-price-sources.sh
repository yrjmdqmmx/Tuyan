#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

expected_sha='' expected_core_digest='' expected_worker_digest='' confirm=''
usage() {
  echo 'usage: refresh-scientific-v2-price-sources.sh --expected-sha 40_HEX --expected-core-digest 64_HEX --expected-worker-digest 64_HEX --confirm refresh-scientific-v2-price-sources' >&2
  exit 64
}
while (($#)); do
  case "$1" in
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --expected-core-digest) expected_core_digest="${2:-}"; shift 2 ;;
    --expected-worker-digest) expected_worker_digest="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ && "$expected_core_digest" =~ ^[a-f0-9]{64}$
  && "$expected_worker_digest" =~ ^[a-f0-9]{64}$ && "$confirm" == refresh-scientific-v2-price-sources ]] || usage
[[ "$(id -u)" == 0 ]] || { echo 'scientific v2 price refresh must run as root' >&2; exit 1; }

repo_root='/opt/paperbanana/repo'
deploy_dir="$repo_root/deploy/hk-single-host"
deploy_env="$deploy_dir/.env"
gateway_env='/opt/paperbanana/secrets/gateway.env'
bench_env='/opt/paperbanana/secrets/bench.env'
authority_dir='/opt/paperbanana/operator-private/scientific-v2/registry-authorities'
capture_root='/opt/paperbanana/operator-private/scientific-v2/official-price-captures'
report_root='/opt/paperbanana/operator-private/scientific-v2/price-refresh-reports'
lock_path='/run/lock/paperbanana-hk-production.lock'
install -d -o root -g root -m 0700 "$authority_dir" "$capture_root" "$report_root" "$(dirname "$lock_path")"
exec 9>"$lock_path"
flock -x 9

read_env_value() { awk -F= -v key="$2" '$1==key {value=substr($0,index($0,"=")+1);count++} END {if(count==1)print value;else exit 1}' "$1"; }
sha256_file() { sha256sum "$1" 2>/dev/null | awk '{print $1}' || shasum -a 256 "$1" | awk '{print $1}'; }
[[ "$(git -C "$repo_root" rev-parse --verify HEAD)" == "$expected_sha"
  && "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false
  && "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || exit 1
core_image="$(read_env_value "$deploy_env" PAPERBANANA_CORE_IMAGE)"
worker_image="$(read_env_value "$deploy_env" PAPERBANANA_BENCH_WORKER_IMAGE)"
[[ "${core_image##*@sha256:}" == "$expected_core_digest" && "${worker_image##*@sha256:}" == "$expected_worker_digest" ]] || exit 1
tracked_price_refresh_paths=(
  .github/workflows/refresh-scientific-v2-price-sources.yml \
  deploy/hk-single-host/scripts/refresh-scientific-v2-price-sources.sh \
  apps/benchmark-worker/src/scientific-v2-price-refresh.ts \
  apps/benchmark-worker/src/scientific-v2-price-refresh-entry.ts
  apps/paperbanana-api/src/scientific-v2-production-bridge.ts
)
for tracked_path in "${tracked_price_refresh_paths[@]}"; do
  git -C "$repo_root" ls-files --error-unmatch "$tracked_path" >/dev/null 2>&1 || exit 1
done
git -C "$repo_root" diff --quiet "$expected_sha" -- "${tracked_price_refresh_paths[@]}" || exit 1

compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
core_container_id="$(docker ps --filter label=com.docker.compose.project=paperbanana-hk --filter label=com.docker.compose.service=paperbanana-api --format '{{.ID}}')"
[[ "$core_container_id" =~ ^[a-f0-9]+$ && "$(docker inspect --format '{{.Config.Image}}' "$core_container_id")" == "$core_image" ]] || exit 1
docker inspect --format '{{json .RepoDigests}}' "$core_container_id" | jq -e --arg digest "sha256:$expected_core_digest" \
  'any(.[]; endswith("@" + $digest))' >/dev/null || exit 1
core_guard='const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)'
docker exec "$core_container_id" node -e "$core_guard" "$expected_sha" >/dev/null
admin_user_id="$(read_env_value "$gateway_env" ADMIN_USER_IDS | awk -F, '{gsub(/^[[:space:]]+|[[:space:]]+$/,"",$1);print $1}')"
authority_tmp="$(mktemp /tmp/paperbanana-scientific-v2-registry-authority.XXXXXXXXXXXX)"
refresh_result="$(mktemp /tmp/paperbanana-scientific-v2-price-refresh.XXXXXXXXXXXX)"
cleanup() { rm -f -- "$authority_tmp" "$refresh_result"; }
trap cleanup EXIT
chmod 0600 "$authority_tmp" "$refresh_result"
node_script='const canonical=v=>Array.isArray(v)?`[${v.map(canonical).join(",")}]`:v&&typeof v==="object"?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`:JSON.stringify(v);const subset=v=>({registryVersion:v.registryVersion,routeContractVersion:v.routeContractVersion,providers:{bailian:v.providers?.bailian,ark:v.providers?.ark,openrouter:v.providers?.openrouter}});const invoke=async body=>{const r=await fetch("http://127.0.0.1:3000/paperbanana-api",{method:"POST",headers:{"content-type":"application/json","x-paperbanana-gateway-token":process.env.PAPERBANANA_GATEWAY_TOKEN,"x-paperbanana-admin-transport-token":process.env.PAPERBANANA_ADMIN_TRANSPORT_TOKEN,"x-paperbanana-admin-user-id":process.env.PAPERBANANA_OPERATOR_ADMIN_USER_ID},body:JSON.stringify(body)});const j=await r.json();if(!r.ok||j.code!==0)throw new Error("SCIENTIFIC_V2_PRICE_REFRESH_CORE_REJECTED");return j};const registry=await invoke({action:"modelRegistry"});const prepared=await invoke({action:"adminBenchmarkControl",command:"prepareScientificV2Registry",evaluationMode:"codex_scientific_v2"});if(canonical(subset(registry))!==canonical(prepared.registryAuthority.registry))throw new Error("SCIENTIFIC_V2_REGISTRY_CHANGED_DURING_CAPTURE");process.stdout.write(JSON.stringify(prepared.registryAuthority));'
"${compose[@]}" exec -T -e PAPERBANANA_OPERATOR_ADMIN_USER_ID="$admin_user_id" \
  paperbanana-api node --input-type=module -e "$node_script" >"$authority_tmp"
jq -e --arg sha "$expected_sha" '.schemaVersion == 1 and .codeSha == $sha and (.snapshotHash|test("^[a-f0-9]{64}$")) and (.attestationHash|test("^[a-f0-9]{64}$"))' "$authority_tmp" >/dev/null
authority_sha256="$(sha256_file "$authority_tmp")"
authority_path="$authority_dir/$authority_sha256.json"
if [[ -e "$authority_path" ]]; then cmp -s "$authority_tmp" "$authority_path" || exit 1
else install -o root -g root -m 0600 "$authority_tmp" "$authority_path"; fi

"${compose[@]}" run --rm --no-deps --user 0:0 \
  -e PAPERBANANA_BENCH_BAILIAN_API_KEY= \
  -e PAPERBANANA_BENCH_ARK_API_KEY= \
  -e PAPERBANANA_BENCH_OPENROUTER_API_KEY= \
  -e PAPERBANANA_BENCH_OSS_ACCESS_KEY= \
  -e PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET= \
  -e PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET= \
  -e PAPERBANANA_BENCH_DISCOVERY_TOKEN= \
  -e PAPERBANANA_CODE_SHA="$expected_sha" \
  -e PAPERBANANA_SCIENTIFIC_V2_REGISTRY_AUTHORITY_PATH=/run/paperbanana-scientific-v2/registry-authority.json \
  -e PAPERBANANA_SCIENTIFIC_V2_PRICE_CAPTURE_ROOT=/run/paperbanana-scientific-v2/captures \
  -e PAPERBANANA_SCIENTIFIC_V2_PRICE_REFRESH_REPORT_ROOT=/run/paperbanana-scientific-v2/reports \
  -v "$authority_path:/run/paperbanana-scientific-v2/registry-authority.json:ro" \
  -v "$capture_root:/run/paperbanana-scientific-v2/captures" \
  -v "$report_root:/run/paperbanana-scientific-v2/reports" \
  benchmark-operator node dist/scientific-v2-price-refresh.mjs >"$refresh_result"
jq -e --arg authority "$authority_sha256" '.authorityFileSha256 == $authority and (.refreshReportFileSha256|test("^[a-f0-9]{64}$")) and (.captureCount|type)=="number" and .captureCount > 0' "$refresh_result" >/dev/null
jq -cn --arg registryAuthoritySha256 "$authority_sha256" --slurpfile refresh "$refresh_result" \
  '{operation:"refresh-scientific-v2-price-sources",providerCalls:0,registryAuthoritySha256:$registryAuthoritySha256,refresh:$refresh[0]}'
