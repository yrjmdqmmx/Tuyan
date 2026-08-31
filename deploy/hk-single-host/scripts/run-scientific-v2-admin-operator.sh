#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

operation='' expected_sha='' expected_core_digest='' expected_worker_digest='' input_sha256='' confirm=''
usage() {
  echo 'usage: run-scientific-v2-admin-operator.sh --operation freeze|attest|diagnose|import-worker|import-codex|export-review|import-review|import-arbitration|publish --expected-sha 40_HEX --expected-core-digest 64_HEX --expected-worker-digest 64_HEX --input-sha256 64_HEX --confirm PHRASE' >&2
  exit 64
}
while (($#)); do
  case "$1" in
    --operation) operation="${2:-}"; shift 2 ;;
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --expected-core-digest) expected_core_digest="${2:-}"; shift 2 ;;
    --expected-worker-digest) expected_worker_digest="${2:-}"; shift 2 ;;
    --input-sha256) input_sha256="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done
[[ "$operation" =~ ^(freeze|attest|diagnose|import-worker|import-codex|export-review|import-review|import-arbitration|publish)$
  && "$expected_sha" =~ ^[a-f0-9]{40}$ && "$expected_core_digest" =~ ^[a-f0-9]{64}$
  && "$expected_worker_digest" =~ ^[a-f0-9]{64}$ && "$input_sha256" =~ ^[a-f0-9]{64}$
  && "$confirm" == "$operation-scientific-v2-admin-disabled-worker" ]] || usage
[[ "$(id -u)" == 0 ]] || { echo 'scientific v2 admin operator must run as root' >&2; exit 1; }

repo_root='/opt/paperbanana/repo'
deploy_dir="$repo_root/deploy/hk-single-host"
secret_dir='/opt/paperbanana/secrets'
deploy_env="$deploy_dir/.env"
core_env="$secret_dir/core.env"
bench_env="$secret_dir/bench.env"
gateway_env="$secret_dir/gateway.env"
input_dir='/opt/paperbanana/operator-private/scientific-v2/admin-inputs'
input_path="$input_dir/$input_sha256.json"
admin_result_dir='/opt/paperbanana/operator-private/scientific-v2/admin-results'
bundle_dir='/opt/paperbanana/operator-bundles/scientific-v2'
lock_path='/run/lock/paperbanana-hk-production.lock'
install -d -o root -g root -m 0700 "$admin_result_dir" "$bundle_dir" "$(dirname "$lock_path")"
exec 9>"$lock_path"
flock -x 9

read_env_value() { awk -F= -v key="$2" '$1==key {value=substr($0,index($0,"=")+1);count++} END {if(count==1)print value;else exit 1}' "$1"; }
stat_mode() { stat -c '%u:%a' -- "$1" 2>/dev/null || stat -f '%u:%Lp' -- "$1"; }
sha256_file() { sha256sum "$1" 2>/dev/null | awk '{print $1}' || shasum -a 256 "$1" | awk '{print $1}'; }
for path in "$deploy_env" "$core_env" "$bench_env" "$gateway_env" "$input_path"; do
  [[ -f "$path" && ! -L "$path" && "$(stat_mode "$path")" =~ ^0:0?600$ ]] || {
    echo 'protected scientific v2 admin input is unavailable' >&2; exit 1;
  }
done
[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled
  && "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha"
  && "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha"
  && "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false
  && "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || exit 1
core_image="$(read_env_value "$deploy_env" PAPERBANANA_CORE_IMAGE)"
worker_image="$(read_env_value "$deploy_env" PAPERBANANA_BENCH_WORKER_IMAGE)"
[[ "${core_image##*@sha256:}" == "$expected_core_digest" && "${worker_image##*@sha256:}" == "$expected_worker_digest" ]] || exit 1
[[ "$(git -C "$repo_root" rev-parse --verify HEAD)" == "$expected_sha" ]] || exit 1
git -C "$repo_root" diff --quiet "$expected_sha" -- \
  .github/workflows/run-scientific-v2-admin-operator.yml \
  deploy/hk-single-host/scripts/run-scientific-v2-admin-operator.sh || exit 1

snapshot="$(mktemp /tmp/paperbanana-scientific-v2-admin-input.XXXXXXXXXXXX)"
result="$(mktemp /tmp/paperbanana-scientific-v2-admin-result.XXXXXXXXXXXX)"
private_result='' private_state=''
cleanup() { rm -f -- "$snapshot" "$result" ${private_result:+"$private_result"} ${private_state:+"$private_state"}; }
trap cleanup EXIT
python3 - "$input_path" "$snapshot" "$input_sha256" <<'PY'
import hashlib
import os
import stat
import sys

source, destination, expected_hash = sys.argv[1:]
source_fd = destination_fd = None
try:
    source_fd = os.open(source, os.O_RDONLY | os.O_NOFOLLOW)
    before = os.fstat(source_fd)
    if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_uid != 0 or stat.S_IMODE(before.st_mode) != 0o600 or before.st_size < 2 or before.st_size > 64 * 1024 * 1024:
        raise RuntimeError('source')
    data = b''
    while len(data) <= 64 * 1024 * 1024:
        chunk = os.read(source_fd, min(1024 * 1024, 64 * 1024 * 1024 + 1 - len(data)))
        if not chunk: break
        data += chunk
    after = os.fstat(source_fd)
    path_stat = os.stat(source, follow_symlinks=False)
    if len(data) != before.st_size or hashlib.sha256(data).hexdigest() != expected_hash or (before.st_dev, before.st_ino, before.st_mtime_ns, before.st_ctime_ns) != (after.st_dev, after.st_ino, after.st_mtime_ns, after.st_ctime_ns) or (before.st_dev, before.st_ino) != (path_stat.st_dev, path_stat.st_ino):
        raise RuntimeError('drift')
    destination_fd = os.open(destination, os.O_WRONLY | os.O_TRUNC | os.O_NOFOLLOW)
    os.fchmod(destination_fd, 0o600)
    os.write(destination_fd, data)
    os.fsync(destination_fd)
except Exception:
    sys.stderr.write('scientific v2 private admin input validation failed\n')
    raise SystemExit(1)
finally:
    if destination_fd is not None: os.close(destination_fd)
    if source_fd is not None: os.close(source_fd)
PY

admin_user_id="$(read_env_value "$gateway_env" ADMIN_USER_IDS | awk -F, '{gsub(/^[[:space:]]+|[[:space:]]+$/,"",$1);print $1}')"
[[ "$admin_user_id" =~ ^[A-Za-z0-9._:-]{3,200}$ ]] || exit 1
compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
verify_running_service() {
  local service="$1" expected_image="$2" expected_digest="$3" guard="$4" container_id image_id
  container_id="$(docker ps --filter label=com.docker.compose.project=paperbanana-hk --filter label=com.docker.compose.service="$service" --format '{{.ID}}')"
  [[ "$container_id" =~ ^[a-f0-9]+$ ]] || { echo 'scientific v2 running service identity is unavailable' >&2; exit 1; }
  [[ "$(docker inspect --format '{{.Config.Image}}' "$container_id")" == "$expected_image" ]] || exit 1
  image_id="$(docker inspect --format '{{.Image}}' "$container_id")"
  [[ "$image_id" =~ ^sha256:[a-f0-9]{64}$ ]] || exit 1
  docker image inspect --format '{{json .RepoDigests}}' "$image_id" | jq -e --arg digest "sha256:$expected_digest" \
    'any(.[]; endswith("@" + $digest))' >/dev/null || exit 1
  docker exec "$container_id" node -e "$guard" "$expected_sha" >/dev/null
}
core_guard='const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)'
worker_guard='const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1]||process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")process.exit(1)'
verify_running_service paperbanana-api "$core_image" "$expected_core_digest" "$core_guard"
verify_running_service benchmark-worker "$worker_image" "$expected_worker_digest" "$worker_guard"
node_script='
import fs from "node:fs";
const input=JSON.parse(fs.readFileSync(0,"utf8"));
const operation=process.env.PAPERBANANA_SCIENTIFIC_V2_ADMIN_OPERATION;
const exact=(value,keys)=>{if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).sort().join("\0")!==[...keys].sort().join("\0"))throw new Error("SCIENTIFIC_V2_ADMIN_INPUT_SCHEMA_INVALID")};
let body;
if(operation==="freeze"){exact(input,["batchId","registryAuthority","registrySnapshot","canonicalManifest","manifest","initialState"]);body={action:"adminBenchmarkControl",evaluationMode:"codex_scientific_v2",command:"freezeBatch",...input}}
else if(operation==="attest"){exact(input,["batchId","manifestHash"]);body={action:"adminBenchmarkControl",evaluationMode:"codex_scientific_v2",command:"operatorAttestation",...input}}
else if(operation==="diagnose"){exact(input,["batchId","manifestHash"]);body={action:"adminBenchmarkControl",evaluationMode:"codex_scientific_v2",command:"operatorDiagnostic",...input}}
else if(operation==="import-worker"||operation==="import-codex"){exact(input,["report","reportHash","attestationHash"]);body={action:"adminBenchmarkControl",evaluationMode:"codex_scientific_v2",command:operation==="import-worker"?"importWorkerState":"importCodexState",...input}}
else if(operation==="export-review"){exact(input,["batchId","assignment","objectBindings"]);body={action:"adminBenchmarkReviewExport",evaluationMode:"codex_scientific_v2",...input}}
else if(operation==="import-review"){exact(input,["batchId","result"]);body={action:"adminBenchmarkReviewImport",evaluationMode:"codex_scientific_v2",...input}}
else if(operation==="import-arbitration"){exact(input,["batchId","arbitration","arbitrationHash","attestationHash"]);body={action:"adminBenchmarkReviewImport",evaluationMode:"codex_scientific_v2",...input}}
else{exact(input,["batchId","objectBindings","evidence"]);body={action:"adminBenchmarkPublish",evaluationMode:"codex_scientific_v2",...input}}
const response=await fetch("http://127.0.0.1:3000/paperbanana-api",{method:"POST",headers:{"content-type":"application/json","x-paperbanana-gateway-token":process.env.PAPERBANANA_GATEWAY_TOKEN,"x-paperbanana-admin-transport-token":process.env.PAPERBANANA_ADMIN_TRANSPORT_TOKEN,"x-paperbanana-admin-user-id":process.env.PAPERBANANA_OPERATOR_ADMIN_USER_ID,...(operation==="freeze"?{"x-paperbanana-scientific-v2-admin-operation":"freeze"}:{})},body:JSON.stringify(body)});
const result=await response.json();
if(!response.ok||result.code!==0)throw new Error("SCIENTIFIC_V2_ADMIN_CORE_REJECTED");
const data=result.run??result.packet??result.result??result.release??result;
const allowedKeys={freeze:["batchId","manifestHash","stateHash","replayed"],attest:["batchId","batchManifestHash","stateHash","manifestCodeSha","executionCodeSha","legacyRecoveryStateHash","modelCount","slotCount","revision","issuedAt","reportHash","attestationHash"],diagnose:["batchId","manifestHash","stateHash","status","pauseReason","blockReason","providerSpentCny","providerUnreconciledCny","revision","providerCanaries","diagnosticHash","attestationHash"],"import-worker":["stateHash","reviewReady","replayed"],"import-codex":["stateHash","reviewReady","replayed"],"export-review":["role","packages","mappingHash","assignmentSet","assignmentAttestationHash"],"import-review":["disputeCount","resultCount","finalHash"],"import-arbitration":["resultCount","finalHash"],publish:["releaseId","releaseHash","profileStatus","replayed"]}[operation];
const responseRequiredKeys={freeze:["batchId","manifestHash","stateHash","replayed"],attest:["batchId","batchManifestHash","stateHash","manifestCodeSha","executionCodeSha","legacyRecoveryStateHash","modelCount","slotCount","revision","issuedAt","reportHash","attestationHash"],diagnose:["batchId","manifestHash","stateHash","status","pauseReason","blockReason","providerSpentCny","providerUnreconciledCny","revision","providerCanaries","diagnosticHash","attestationHash"],"import-worker":["stateHash","reviewReady","replayed"],"import-codex":["stateHash","reviewReady","replayed"],"export-review":["role","packages","mappingHash","assignmentSet","assignmentAttestationHash"],"import-review":["status"],"import-arbitration":["status","results","automaticJudgeCalls","finalHash"],publish:["releaseId","releaseHash","profileStatus","replayed"]}[operation];
if(!data||typeof data!=="object"||Array.isArray(data)||!responseRequiredKeys.every(key=>Object.hasOwn(data,key)))throw new Error("SCIENTIFIC_V2_ADMIN_RESPONSE_SCHEMA_INVALID");
if(operation==="attest"){
  exact(data.stateSnapshot,["schemaVersion","manifestHash","status","pauseReason","blockReason","createdAt","updatedAt","providerSpentCny","providerUnreconciledCny","slots","stateHash"]);
  if(data.stateSnapshot.stateHash!==data.stateHash||typeof data.stateHash!=="string"||!/^[a-f0-9]{64}$/.test(data.stateHash))throw new Error("SCIENTIFIC_V2_ADMIN_RESPONSE_SCHEMA_INVALID");
}
if(operation==="diagnose"){
  exact(data,responseRequiredKeys);
  const hash=value=>typeof value==="string"&&/^[a-f0-9]{64}$/.test(value),cny=value=>Number.isFinite(value)&&value>=0,ledger=value=>value&&typeof value==="object"&&!Array.isArray(value)&&["ark","bailian","openrouter"].every(key=>Object.hasOwn(value,key))&&Object.keys(value).length===3&&Object.values(value).every(cny);
  const canary=value=>value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).sort().join("\\0")===["provider","canonicalModelId","caseId","slotId","status","attemptCount","responseClasses","estimatedCny","actualCny"].sort().join("\\0")&&["bailian","ark","openrouter"].includes(value.provider)&&[value.canonicalModelId,value.caseId,value.slotId,value.status].every(field=>typeof field==="string"&&field.length>0&&field.length<=200)&&Number.isInteger(value.attemptCount)&&value.attemptCount>=0&&value.attemptCount<=4&&Array.isArray(value.responseClasses)&&value.responseClasses.length===value.attemptCount&&value.responseClasses.every(field=>typeof field==="string"&&field.length>0&&field.length<=128)&&[value.estimatedCny,value.actualCny].every(field=>field===null||cny(field));
  if(typeof data.batchId!=="string"||!data.batchId||!hash(data.manifestHash)||!hash(data.stateHash)||typeof data.status!=="string"||data.status.length>64||![data.pauseReason,data.blockReason].every(value=>value===null||(typeof value==="string"&&value.length<=128))||!ledger(data.providerSpentCny)||!ledger(data.providerUnreconciledCny)||!Number.isInteger(data.revision)||data.revision<0||!Array.isArray(data.providerCanaries)||data.providerCanaries.length>3||!data.providerCanaries.every(canary)||!hash(data.diagnosticHash)||!hash(data.attestationHash))throw new Error("SCIENTIFIC_V2_ADMIN_RESPONSE_SCHEMA_INVALID");
}
if(operation==="attest"&&(!(typeof data.manifestCodeSha==="string"&&/^[a-f0-9]{40}$/.test(data.manifestCodeSha))||!(typeof data.executionCodeSha==="string"&&/^[a-f0-9]{40}$/.test(data.executionCodeSha))||!(data.legacyRecoveryStateHash===null||(typeof data.legacyRecoveryStateHash==="string"&&/^[a-f0-9]{64}$/.test(data.legacyRecoveryStateHash)))))throw new Error("SCIENTIFIC_V2_ADMIN_RESPONSE_SCHEMA_INVALID");
if(operation==="import-review"&&(!["awaiting_peer","published","dispute","finalized"].includes(data.status)||(["awaiting_peer","published"].includes(data.status)&&!["A","B"].includes(data.role))||(["dispute","finalized"].includes(data.status)&&(!Array.isArray(data.disputes)||!Array.isArray(data.results)||data.automaticJudgeCalls!==0||typeof data.finalHash!=="string"||!/^[a-f0-9]{64}$/.test(data.finalHash)))))throw new Error("SCIENTIFIC_V2_ADMIN_RESPONSE_SCHEMA_INVALID");
if(operation==="import-arbitration"&&(data.status!=="finalized"||!Array.isArray(data.results)||data.automaticJudgeCalls!==0||typeof data.finalHash!=="string"||!/^[a-f0-9]{64}$/.test(data.finalHash)))throw new Error("SCIENTIFIC_V2_ADMIN_RESPONSE_SCHEMA_INVALID");
const safe={};for(const key of allowedKeys)if(Object.hasOwn(data,key))safe[key]=data[key];
if(operation==="import-review"){safe.disputeCount=Array.isArray(data.disputes)?data.disputes.length:0;safe.resultCount=Array.isArray(data.results)?data.results.length:0;if(Object.hasOwn(data,"finalHash")&&(typeof data.finalHash!=="string"||!/^[a-f0-9]{64}$/.test(data.finalHash)))throw new Error("SCIENTIFIC_V2_ADMIN_RESPONSE_SCHEMA_INVALID")}
if(operation==="import-arbitration")safe.resultCount=Array.isArray(data.results)?data.results.length:0;
const requiredKeys=operation==="import-review"?["disputeCount","resultCount"]:operation==="import-arbitration"?["resultCount","finalHash"]:responseRequiredKeys;
const privateData=operation==="attest"?Object.fromEntries(Object.entries(data).filter(([key])=>key!=="stateSnapshot")):operation==="import-review"||operation==="import-arbitration"?data:undefined;
const privateState=operation==="attest"?data.stateSnapshot:undefined;
process.stdout.write(JSON.stringify({schemaVersion:1,operation,data:safe,allowedKeys,requiredKeys,...(privateData?{privateData}:{}),...(privateState?{privateState}:{})}));
'
"${compose[@]}" exec -T \
  -e PAPERBANANA_OPERATOR_ADMIN_USER_ID="$admin_user_id" \
  -e PAPERBANANA_SCIENTIFIC_V2_ADMIN_OPERATION="$operation" \
  paperbanana-api node --input-type=module -e "$node_script" <"$snapshot" >"$result"

jq -e --arg operation "$operation" '.schemaVersion == 1 and .operation == $operation and
  (.allowedKeys | type) == "array" and (.data | type) == "object" and
  (.requiredKeys | type) == "array" and ([.requiredKeys[]] - [.data | keys[]] | length) == 0 and
  ([.data | keys[]] - .allowedKeys | length) == 0 and
  ([.data | .. | objects | keys[]] | index("privateMappings")) == null and
  ([.data | .. | objects | keys[]] | index("privateEnvelope")) == null and
  ([.data | .. | objects | keys[]] | index("reviewerIdentity")) == null' "$result" >/dev/null || exit 1
if [[ "$operation" == attest || "$operation" == import-review || "$operation" == import-arbitration ]]; then
  private_result="$(mktemp /tmp/paperbanana-scientific-v2-admin-private.XXXXXXXXXXXX)"
  jq -c '.privateData' "$result" >"$private_result"
  chmod 0600 "$private_result"
  private_response_sha256="$(sha256_file "$private_result")"
  [[ "$private_response_sha256" =~ ^[a-f0-9]{64}$ ]] || exit 1
  if [[ "$operation" == attest ]]; then private_destination="$admin_result_dir/$private_response_sha256.attest.json"
  else private_destination="$admin_result_dir/$input_sha256.$operation.$private_response_sha256.json"; fi
  if [[ -e "$private_destination" ]]; then
    [[ -f "$private_destination" && ! -L "$private_destination" && "$(stat_mode "$private_destination")" =~ ^0:0?600$ ]] || exit 1
    cmp -s "$private_result" "$private_destination" || exit 1
  else
    install -o root -g root -m 0600 "$private_result" "$private_destination"
  fi
  rm -f "$private_result"
  private_result=''
fi
if [[ "$operation" == attest ]]; then
  private_state="$(mktemp /tmp/paperbanana-scientific-v2-attested-state.XXXXXXXXXXXX)"
  jq -c '.privateState' "$result" >"$private_state"
  chmod 0600 "$private_state"
  jq -e --arg stateHash "$(jq -r '.data.stateHash' "$result")" '.stateHash == $stateHash' "$private_state" >/dev/null || exit 1
  state_bundle_sha256="$(sha256_file "$private_state")"
  [[ "$state_bundle_sha256" =~ ^[a-f0-9]{64}$ ]] || exit 1
  state_destination="$bundle_dir/$state_bundle_sha256.state.json"
  if [[ -e "$state_destination" ]]; then
    [[ -f "$state_destination" && ! -L "$state_destination" && "$(stat_mode "$state_destination")" =~ ^0:0?600$ ]] || exit 1
    cmp -s "$private_state" "$state_destination" || exit 1
  else
    install -o root -g root -m 0600 "$private_state" "$state_destination"
  fi
  rm -f "$private_state"
  private_state=''
  jq -c --arg privateResponseSha256 "$private_response_sha256" --arg stateBundleSha256 "$state_bundle_sha256" \
    '{schemaVersion,operation,data,privateResponseSha256:$privateResponseSha256,stateBundleSha256:$stateBundleSha256}' "$result"
else jq -c '{schemaVersion,operation,data}' "$result"; fi
