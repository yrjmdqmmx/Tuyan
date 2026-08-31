#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

expected_sha='' expected_core_digest='' expected_worker_digest='' signed_price_snapshot_sha256='' confirm=''
usage() {
  echo 'usage: prepare-scientific-v2-production.sh --expected-sha 40_HEX --expected-core-digest 64_HEX --expected-worker-digest 64_HEX --signed-price-snapshot-sha256 64_HEX --confirm prepare-scientific-v2-production-disabled-worker' >&2
  exit 64
}
while (($#)); do
  case "$1" in
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --expected-core-digest) expected_core_digest="${2:-}"; shift 2 ;;
    --expected-worker-digest) expected_worker_digest="${2:-}"; shift 2 ;;
    --signed-price-snapshot-sha256) signed_price_snapshot_sha256="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ && "$expected_core_digest" =~ ^[a-f0-9]{64}$
  && "$expected_worker_digest" =~ ^[a-f0-9]{64}$ && "$signed_price_snapshot_sha256" =~ ^[a-f0-9]{64}$
  && "$confirm" == prepare-scientific-v2-production-disabled-worker ]] || usage
[[ "$(id -u)" == 0 ]] || { echo 'scientific v2 prepare must run as root' >&2; exit 1; }

repo_root='/opt/paperbanana/repo'
deploy_dir="$repo_root/deploy/hk-single-host"
secret_dir='/opt/paperbanana/secrets'
deploy_env="$deploy_dir/.env"
bench_env="$secret_dir/bench.env"
core_env="$secret_dir/core.env"
gateway_env="$secret_dir/gateway.env"
price_dir='/opt/paperbanana/operator-private/scientific-v2/signed-price-snapshots'
price_path="$price_dir/$signed_price_snapshot_sha256.json"
bundle_dir='/opt/paperbanana/operator-bundles/scientific-v2'
admin_input_dir='/opt/paperbanana/operator-private/scientific-v2/admin-inputs'
source_dir='/opt/paperbanana/operator-private/scientific-v2/prepare-source'
lock_path='/run/lock/paperbanana-hk-production.lock'
install -d -m 0700 "$bundle_dir" "$admin_input_dir" "$source_dir" "$(dirname "$lock_path")"
exec 9>"$lock_path"
flock -x 9

read_env_value() { awk -F= -v key="$2" '$1==key {value=substr($0,index($0,"=")+1);count++} END {if(count==1)print value;else exit 1}' "$1"; }
stat_mode() { stat -c '%u:%a' -- "$1" 2>/dev/null || stat -f '%u:%Lp' -- "$1"; }
for path in "$deploy_env" "$bench_env" "$core_env" "$gateway_env" "$price_path"; do
  [[ -f "$path" && ! -L "$path" && "$(stat_mode "$path")" =~ ^0:0?600$ ]] || {
    echo 'protected scientific v2 prepare input is unavailable' >&2; exit 1;
  }
done
[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled
  && "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha"
  && "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false
  && "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1
  && "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || exit 1
awk -F= '$1=="PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET" {value=substr($0,index($0,"=")+1);count++}
  END {exit !(count==1 && length(value)>=32)}' "$core_env" || {
  echo 'signed price snapshot verifier is unavailable' >&2; exit 1;
}

core_image="$(read_env_value "$deploy_env" PAPERBANANA_CORE_IMAGE)"
worker_image="$(read_env_value "$deploy_env" PAPERBANANA_BENCH_WORKER_IMAGE)"
[[ "${core_image##*@sha256:}" == "$expected_core_digest" && "${worker_image##*@sha256:}" == "$expected_worker_digest" ]] || exit 1
actual_price_hash="$(sha256sum "$price_path" | awk '{print $1}')"
[[ "$actual_price_hash" == "$signed_price_snapshot_sha256" ]] || exit 1

actual_head="$(git -C "$repo_root" rev-parse --verify HEAD)"
[[ "$actual_head" == "$expected_sha" ]] || exit 1
git -C "$repo_root" diff --quiet "$expected_sha" -- \
  .github/workflows/prepare-scientific-v2-production.yml \
  deploy/hk-single-host/scripts/prepare-scientific-v2-production.sh \
  apps/paperbanana-api/src/scientific-v2-production-bridge.ts \
  apps/benchmark-worker/src/scientific-v2-operator-runtime.ts || exit 1

admin_user_id="$(read_env_value "$gateway_env" ADMIN_USER_IDS | awk -F, '{gsub(/^[[:space:]]+|[[:space:]]+$/,"",$1);print $1}')"
[[ "$admin_user_id" =~ ^[A-Za-z0-9._:-]{3,200}$ ]] || exit 1
compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
verify_running_service() {
  local service="$1" expected_image="$2" expected_digest="$3" guard="$4" container_id
  container_id="$(docker ps --filter label=com.docker.compose.project=paperbanana-hk --filter label=com.docker.compose.service="$service" --format '{{.ID}}')"
  [[ "$container_id" =~ ^[a-f0-9]+$ ]] || { echo 'scientific v2 running service identity is unavailable' >&2; exit 1; }
  [[ "$(docker inspect --format '{{.Config.Image}}' "$container_id")" == "$expected_image" ]] || exit 1
  docker inspect --format '{{json .RepoDigests}}' "$container_id" | jq -e --arg digest "sha256:$expected_digest" \
    'any(.[]; endswith("@" + $digest))' >/dev/null || exit 1
  docker exec "$container_id" node -e "$guard" "$expected_sha" >/dev/null
}
core_guard='const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)'
worker_guard='const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1]||process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")process.exit(1)'
verify_running_service paperbanana-api "$core_image" "$expected_core_digest" "$core_guard"
verify_running_service benchmark-worker "$worker_image" "$expected_worker_digest" "$worker_guard"
authority_result="$(mktemp /tmp/paperbanana-scientific-v2-authority.XXXXXXXXXXXX)"
prepare_input="$(mktemp /tmp/paperbanana-scientific-v2-prepare.XXXXXXXXXXXX)"
prepare_snapshot_dir="$(mktemp -d /tmp/paperbanana-scientific-v2-prepare-snapshot.XXXXXXXXXXXX)"
prepare_result="$(mktemp /tmp/paperbanana-scientific-v2-prepare-result.XXXXXXXXXXXX)"
verifier_env="$(mktemp /tmp/paperbanana-scientific-v2-verifier-env.XXXXXXXXXXXX)"
cleanup() {
  rm -f -- "$authority_result" "$prepare_input" "$prepare_result" "$verifier_env" "$prepare_snapshot_dir/bundle.json"
  rmdir -- "$prepare_snapshot_dir" 2>/dev/null || true
}
trap cleanup EXIT
chmod 0600 "$authority_result" "$prepare_input" "$prepare_result" "$verifier_env"
awk '$0 ~ /^PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET=/ {print; count++}
  END {exit count==1 ? 0 : 1}' "$core_env" >"$verifier_env"

node_script='const canonical=v=>Array.isArray(v)?`[${v.map(canonical).join(",")}]`:v&&typeof v==="object"?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`:JSON.stringify(v); const subset=v=>({registryVersion:v.registryVersion,routeContractVersion:v.routeContractVersion,providers:{bailian:v.providers?.bailian,ark:v.providers?.ark,openrouter:v.providers?.openrouter}}); const invoke=async body=>{const r=await fetch("http://127.0.0.1:3000/paperbanana-api",{method:"POST",headers:{"content-type":"application/json","x-paperbanana-gateway-token":process.env.PAPERBANANA_GATEWAY_TOKEN,"x-paperbanana-admin-transport-token":process.env.PAPERBANANA_ADMIN_TRANSPORT_TOKEN,"x-paperbanana-admin-user-id":process.env.PAPERBANANA_OPERATOR_ADMIN_USER_ID},body:JSON.stringify(body)});const j=await r.json();if(!r.ok||j.code!==0)throw new Error("SCIENTIFIC_V2_PREPARE_CORE_REJECTED");return j}; const registry=await invoke({action:"modelRegistry"}); const prepared=await invoke({action:"adminBenchmarkControl",command:"prepareScientificV2Registry",evaluationMode:"codex_scientific_v2"}); if(canonical(subset(registry))!==canonical(prepared.registryAuthority.registry))throw new Error("SCIENTIFIC_V2_REGISTRY_CHANGED_DURING_CAPTURE"); process.stdout.write(JSON.stringify(prepared.registryAuthority));'
"${compose[@]}" exec -T -e PAPERBANANA_OPERATOR_ADMIN_USER_ID="$admin_user_id" \
  paperbanana-api node --input-type=module -e "$node_script" >"$authority_result"
jq -e '.schemaVersion == 1 and (.registryBytesHash | test("^[a-f0-9]{64}$")) and
  (.snapshotHash | test("^[a-f0-9]{64}$")) and (.attestationHash | test("^[a-f0-9]{64}$"))' "$authority_result" >/dev/null

created_at="$(jq -er '.capturedAt | select(type == "string" and test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.]([0-9]{3})Z$"))' "$price_path")"
jq -cn --slurpfile authority "$authority_result" --slurpfile signedPrice "$price_path" \
  --arg sha "$expected_sha" --arg createdAt "$created_at" \
  '{operation:"prepare",gate:{enabled:false,concurrency:1,lockName:"/run/lock/paperbanana-hk-production.lock"},
    input:{registryAuthority:$authority[0],signedPriceSnapshot:$signedPrice[0],codeSha:$sha,createdAt:$createdAt}}' >"$prepare_input"
prepare_hash="$(sha256sum "$prepare_input" | awk '{print $1}')"
install -o root -g 1000 -m 0440 "$prepare_input" "$prepare_snapshot_dir/bundle.json"
chmod 0550 "$prepare_snapshot_dir"
timeout --signal=TERM --kill-after=10s 300s "${compose[@]}" run --rm --no-deps --network none \
  --env-from-file "$verifier_env" \
  --user 1000:1000 -v "$prepare_snapshot_dir/bundle.json:/run/paperbanana-scientific-v2/bundle.json:ro" \
  -e PAPERBANANA_SCIENTIFIC_V2_BUNDLE_PATH=/run/paperbanana-scientific-v2/bundle.json \
  -e PAPERBANANA_SCIENTIFIC_V2_SPOOL_DIR=/run/paperbanana-scientific-v2 \
  -e PAPERBANANA_SCIENTIFIC_V2_EXPECTED_BUNDLE_SHA256="$prepare_hash" \
  benchmark-operator node dist/scientific-v2-operator.mjs >"$prepare_result"

jq -e --arg sha "$expected_sha" '.operation == "prepare" and .providerCalls == 0 and
  .manifest.codeSha == $sha and .manifest.manifestHash == .manifestHash and
  .initialState.manifestHash == .manifestHash and .initialState.stateHash == .stateHash and
  .inspectBundle.batchInput.canonicalManifest.manifestHash == .canonicalManifest.manifestHash and
  .freezeInput.manifest.manifestHash == .manifestHash and .attestInput.manifestHash == .manifestHash' "$prepare_result" >/dev/null

persist_content_addressed() {
  local selector="$1" suffix="$2" target="$3" temporary hash destination
  temporary="$(mktemp /tmp/paperbanana-scientific-v2-content.XXXXXXXXXXXX)"
  jq -c "$selector" "$prepare_result" >"$temporary"
  hash="$(sha256sum "$temporary" | awk '{print $1}')"
  if [[ "$target" == executable ]]; then
    destination="$bundle_dir/$hash.json"
  elif [[ "$target" == admin ]]; then
    destination="$admin_input_dir/$hash.json"
  else
    destination="$bundle_dir/$hash.$suffix.json"
  fi
  if [[ -e "$destination" ]]; then cmp -s "$temporary" "$destination" || exit 1
  else install -o root -g root -m 0600 "$temporary" "$destination"; fi
  rm -f "$temporary"
  printf '%s' "$hash"
}
manifest_bundle_hash="$(persist_content_addressed '.manifest' manifest metadata)"
state_bundle_hash="$(persist_content_addressed '.initialState' state metadata)"
inspect_bundle_hash="$(persist_content_addressed '.inspectBundle' inspect executable)"
freeze_bundle_hash="$(persist_content_addressed '.freezeInput' freeze admin)"
attest_bundle_hash="$(persist_content_addressed '.attestInput' attest admin)"
install -o root -g root -m 0600 "$prepare_input" "$source_dir/$prepare_hash.prepare-input.json"

jq -cn --arg manifestHash "$(jq -r .manifestHash "$prepare_result")" --arg stateHash "$(jq -r .stateHash "$prepare_result")" \
  --arg registryHash "$(jq -r .registryHash "$prepare_result")" --arg priceHash "$(jq -r .priceHash "$prepare_result")" \
  --arg manifestBundleHash "$manifest_bundle_hash" --arg stateBundleHash "$state_bundle_hash" \
  --arg inspectBundleHash "$inspect_bundle_hash" --arg freezeBundleHash "$freeze_bundle_hash" --arg attestBundleHash "$attest_bundle_hash" \
  --argjson modelCount "$(jq -r .modelCount "$prepare_result")" \
  '{operation:"prepare-scientific-v2-production",providerCalls:0,manifestHash:$manifestHash,stateHash:$stateHash,
    registryHash:$registryHash,priceHash:$priceHash,modelCount:$modelCount,
    bundles:{manifest:$manifestBundleHash,state:$stateBundleHash,inspect:$inspectBundleHash,freeze:$freezeBundleHash,attest:$attestBundleHash}}'
