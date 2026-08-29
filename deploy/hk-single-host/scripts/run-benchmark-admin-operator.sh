#!/usr/bin/env bash
set -Eeuo pipefail

operation='' expected_sha='' candidate_id='' run_id='' max_generations='' max_judge_calls=''
max_estimated_usd='' generation_usd='' judge_usd='' price_source='' price_captured_at='' confirm=''

usage() { echo 'Usage: run-benchmark-admin-operator.sh --operation candidates|approve_quick|control_quick|attest --expected-sha SHA [bounded operation fields] --confirm PHRASE' >&2; exit 64; }
while (($#)); do
  case "$1" in
    --operation) operation="${2:-}"; shift 2 ;; --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --candidate-id) candidate_id="${2:-}"; shift 2 ;; --run-id) run_id="${2:-}"; shift 2 ;;
    --max-generations) max_generations="${2:-}"; shift 2 ;; --max-judge-calls) max_judge_calls="${2:-}"; shift 2 ;;
    --max-estimated-usd) max_estimated_usd="${2:-}"; shift 2 ;; --estimated-per-generation-usd) generation_usd="${2:-}"; shift 2 ;;
    --estimated-per-judge-call-usd) judge_usd="${2:-}"; shift 2 ;; --price-source) price_source="${2:-}"; shift 2 ;;
    --price-captured-at) price_captured_at="${2:-}"; shift 2 ;; --confirm) confirm="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done

[[ "$operation" =~ ^(candidates|approve_quick|control_quick|attest)$ && "$expected_sha" =~ ^[a-f0-9]{40}$ ]] || usage
case "$operation" in
  candidates) [[ "$confirm" == list-benchmark-candidates-disabled-worker ]] || usage ;;
  approve_quick)
    [[ "$confirm" == approve-benchmark-quick-disabled-worker && "$candidate_id" =~ ^[A-Za-z0-9._:/-]{3,200}$ ]] || usage
    [[ "$max_generations" =~ ^[1-9][0-9]*$ && "$max_judge_calls" =~ ^[1-9][0-9]*$ ]] || usage
    for amount in "$max_estimated_usd" "$generation_usd" "$judge_usd"; do [[ "$amount" =~ ^[0-9]+([.][0-9]+)?$ ]] || usage; done
    [[ "$price_source" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?(/[^[:space:]]*)?$ ]] || usage
    [[ "$price_captured_at" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$ ]] || usage
    [[ "$(date -u -d "$price_captured_at" '+%Y-%m-%dT%H:%M:%S.%3NZ')" == "$price_captured_at" ]] || usage
    awk -v maxG="$max_generations" -v maxJ="$max_judge_calls" -v maxUsd="$max_estimated_usd" \
      -v genUsd="$generation_usd" -v judgeUsd="$judge_usd" \
      'BEGIN { if (maxG != 24 || maxJ < 48 || maxJ > 192 || maxUsd <= 0 || maxUsd > 12 || genUsd <= 0 || judgeUsd <= 0 || maxG * genUsd + maxJ * judgeUsd > maxUsd + 1e-9) exit 1 }' || usage
    ;;
  control_quick) [[ "$confirm" == control-benchmark-quick-disabled-worker && "$run_id" =~ ^bench-run-[a-f0-9]{20}$ ]] || usage ;;
  attest) [[ "$confirm" == attest-benchmark-run-disabled-worker && "$run_id" =~ ^bench-run-[a-f0-9]{20}$ ]] || usage ;;
esac

[[ "$(id -u)" == 0 ]] || { echo 'benchmark admin operator must run as root' >&2; exit 1; }
deploy_dir='/opt/paperbanana/repo/deploy/hk-single-host'; secret_dir='/opt/paperbanana/secrets'; lock_path='/run/lock/paperbanana-hk-production.lock'
deploy_env="$deploy_dir/.env" core_env="$secret_dir/core.env" bench_env="$secret_dir/bench.env" gateway_env="$secret_dir/gateway.env"
read_env_value() { awk -F= -v key="$2" '$1==key {value=substr($0,index($0,"=")+1);count++} END {if(count==1)print value;else exit 1}' "$1"; }
exec 9>"$lock_path"; flock -x 9
for path in "$deploy_env" "$core_env" "$bench_env" "$gateway_env"; do [[ -f "$path" && ! -L "$path" ]] || exit 1; done
[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || exit 1
[[ "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" && "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || exit 1
admin_user_id="$(read_env_value "$gateway_env" ADMIN_USER_IDS | awk -F, '{gsub(/^[[:space:]]+|[[:space:]]+$/,"",$1);print $1}')"
[[ "$admin_user_id" =~ ^[A-Za-z0-9._:-]{3,200}$ ]] || exit 1
compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
"${compose[@]}" exec -T paperbanana-api node -e 'const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)' "$expected_sha" >/dev/null
"${compose[@]}" exec -T benchmark-worker node -e 'if(process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")process.exit(1)' >/dev/null
node_script="$(cat <<'NODE'
const operation=process.env.PAPERBANANA_OPERATOR_OPERATION
let body
if(operation==='candidates') body={action:'adminBenchmarkCandidates'}
else if(operation==='approve_quick') body={
  action:'adminBenchmarkApprove', candidateId:process.env.PAPERBANANA_OPERATOR_CANDIDATE_ID, entitlementConfirmed:true,
  maxGenerations:Number(process.env.PAPERBANANA_OPERATOR_MAX_GENERATIONS), maxJudgments:Number(process.env.PAPERBANANA_OPERATOR_MAX_GENERATIONS)*2,
  maxJudgeCalls:Number(process.env.PAPERBANANA_OPERATOR_MAX_JUDGE_CALLS), maxEstimatedUsd:Number(process.env.PAPERBANANA_OPERATOR_MAX_ESTIMATED_USD),
  priceSnapshot:{currency:'USD',source:process.env.PAPERBANANA_OPERATOR_PRICE_SOURCE,estimatedPerGeneration:Number(process.env.PAPERBANANA_OPERATOR_GENERATION_USD),estimatedPerJudgeCall:Number(process.env.PAPERBANANA_OPERATOR_JUDGE_USD),capturedAt:process.env.PAPERBANANA_OPERATOR_PRICE_CAPTURED_AT},
}
else if(operation==='control_quick') body={action:'adminBenchmarkControl',command:'transition',runId:process.env.PAPERBANANA_OPERATOR_RUN_ID,targetState:'quick_running',reason:'approved bounded quick operator'}
else body={action:'adminBenchmarkControl',command:'phaseOperatorAttestation',runId:process.env.PAPERBANANA_OPERATOR_RUN_ID}
let response
try { response=await fetch('http://127.0.0.1:3000/paperbanana-api',{method:'POST',headers:{'content-type':'application/json','x-paperbanana-gateway-token':process.env.PAPERBANANA_GATEWAY_TOKEN,'x-paperbanana-admin-transport-token':process.env.PAPERBANANA_ADMIN_TRANSPORT_TOKEN,'x-paperbanana-admin-user-id':process.env.PAPERBANANA_OPERATOR_ADMIN_USER_ID},body:JSON.stringify(body)}) }
catch { console.error('BENCHMARK_ADMIN_CORE_UNREACHABLE'); process.exit(70) }
let result
try { result=await response.json() }
catch { console.error('BENCHMARK_ADMIN_CORE_INVALID_JSON'); process.exit(71) }
if(!response.ok||result.code!==0){console.error('BENCHMARK_ADMIN_CORE_ACTION_REJECTED');process.exit(72)}
const text=(value,max=500)=>String(value??'').slice(0,max)
const priceSnapshot=value=>value&&typeof value==='object'?{
  currency:text(value.currency,8),source:text(value.source),
  estimatedPerGeneration:Number(value.estimatedPerGeneration),estimatedPerJudgeCall:Number(value.estimatedPerJudgeCall),
  capturedAt:text(value.capturedAt,40),
}:undefined
const candidate=value=>({
  candidateId:text(value?.candidateId,200),provider:text(value?.provider,80),modelId:text(value?.modelId,200),
  developer:text(value?.developer,160),lane:value?.lane??null,state:text(value?.state,40),
  registryHash:text(value?.registryHash,64),detectedAt:value?.detectedAt??null,
  ...(value?.runId?{runId:text(value.runId,80)}:{}),
  ...(value?.reapproved===true?{reapproved:true}:{}),
  ...(value?.approval?{approval:{
    entitlementConfirmed:value.approval.entitlementConfirmed===true,
    priceSnapshot:priceSnapshot(value.approval.priceSnapshot),maxGenerations:Number(value.approval.maxGenerations),
    maxJudgments:Number(value.approval.maxJudgments),maxJudgeCalls:Number(value.approval.maxJudgeCalls),
    maxEstimatedUsd:Number(value.approval.maxEstimatedUsd),approvedAt:value.approval.approvedAt??null,
  }}:{}),
})
const attestationKeys=['schemaVersion','runId','phase','state','codeSha','provider','modelId','lane','suiteId','suiteHash','judgeEpoch','judgeStackHash','signedAuthorizationHash','priceHash','immutableFactsHash','runHash','runFactsHash','candidateSnapshotHash','aspectRatiosHash','registryHash','runIntegrityAttestation','maxGenerations','maxJudgments','maxJudgeCalls','maxEstimatedUsd']
let data
if(operation==='candidates')data={candidates:Array.isArray(result.candidates)?result.candidates.map(candidate):[]}
else if(operation==='approve_quick')data={approval:candidate(result.approval)}
else if(operation==='control_quick')data={run:{runId:text(result.run?.runId,80),state:text(result.run?.state,40)}}
else {
  const run={}; for(const key of attestationKeys)run[key]=result.run?.[key]
  run.priceSnapshot=priceSnapshot(result.run?.priceSnapshot)
  data={run}
}
let payload
try { payload=Buffer.from(`${JSON.stringify({schemaVersion:1,operation,workerEnabled:false,data})}\n`) }
catch { console.error('BENCHMARK_ADMIN_RESULT_BUILD_FAILED'); process.exit(73) }
if(payload.length<2||payload.length>1024*1024){console.error('BENCHMARK_ADMIN_RESULT_BUILD_FAILED');process.exit(73)}
process.stdout.write(payload)
NODE
)"

"${compose[@]}" exec -T \
  -e PAPERBANANA_OPERATOR_ADMIN_USER_ID="$admin_user_id" -e PAPERBANANA_OPERATOR_OPERATION="$operation" \
  -e PAPERBANANA_OPERATOR_CANDIDATE_ID="$candidate_id" -e PAPERBANANA_OPERATOR_RUN_ID="$run_id" \
  -e PAPERBANANA_OPERATOR_MAX_GENERATIONS="$max_generations" -e PAPERBANANA_OPERATOR_MAX_JUDGE_CALLS="$max_judge_calls" \
  -e PAPERBANANA_OPERATOR_MAX_ESTIMATED_USD="$max_estimated_usd" -e PAPERBANANA_OPERATOR_GENERATION_USD="$generation_usd" \
  -e PAPERBANANA_OPERATOR_JUDGE_USD="$judge_usd" -e PAPERBANANA_OPERATOR_PRICE_SOURCE="$price_source" \
  -e PAPERBANANA_OPERATOR_PRICE_CAPTURED_AT="$price_captured_at" \
  paperbanana-api node --input-type=module -e "$node_script"
