#!/usr/bin/env bash
set -Eeuo pipefail

phase='' run_id='' expected_sha='' provider='' model_id='' lane='' suite_id='' suite_hash=''
judge_epoch='' judge_stack_hash='' signed_authorization_hash='' price_hash='' max_generations=''
run_hash='' run_facts_hash='' candidate_snapshot_hash='' aspect_ratios_hash='' registry_hash='' run_integrity_attestation='' immutable_facts_hash=''
max_judgments='' max_judge_calls='' max_estimated_usd='' generation_usd='' judge_usd='' price_currency=''
price_source='' price_captured_at='' confirm='' apply=false

usage() { echo 'invalid bounded benchmark phase operator arguments' >&2; exit 64; }
while (($#)); do
  case "$1" in
    --phase) phase="${2:-}"; shift 2 ;; --run-id) run_id="${2:-}"; shift 2 ;;
    --expected-sha) expected_sha="${2:-}"; shift 2 ;; --provider) provider="${2:-}"; shift 2 ;;
    --model-id) model_id="${2:-}"; shift 2 ;; --lane) lane="${2:-}"; shift 2 ;;
    --suite-id) suite_id="${2:-}"; shift 2 ;; --suite-hash) suite_hash="${2:-}"; shift 2 ;;
    --judge-epoch) judge_epoch="${2:-}"; shift 2 ;; --judge-stack-hash) judge_stack_hash="${2:-}"; shift 2 ;;
    --signed-authorization-hash) signed_authorization_hash="${2:-}"; shift 2 ;; --price-hash) price_hash="${2:-}"; shift 2 ;;
    --run-hash) run_hash="${2:-}"; shift 2 ;; --run-facts-hash) run_facts_hash="${2:-}"; shift 2 ;;
    --candidate-snapshot-hash) candidate_snapshot_hash="${2:-}"; shift 2 ;; --aspect-ratios-hash) aspect_ratios_hash="${2:-}"; shift 2 ;;
    --registry-hash) registry_hash="${2:-}"; shift 2 ;; --run-integrity-attestation) run_integrity_attestation="${2:-}"; shift 2 ;;
    --immutable-facts-hash) immutable_facts_hash="${2:-}"; shift 2 ;;
    --max-generations) max_generations="${2:-}"; shift 2 ;; --max-judgments) max_judgments="${2:-}"; shift 2 ;; --max-judge-calls) max_judge_calls="${2:-}"; shift 2 ;;
    --max-estimated-usd) max_estimated_usd="${2:-}"; shift 2 ;;
    --estimated-per-generation-usd) generation_usd="${2:-}"; shift 2 ;;
    --estimated-per-judge-call-usd) judge_usd="${2:-}"; shift 2 ;;
    --price-currency) price_currency="${2:-}"; shift 2 ;; --price-source) price_source="${2:-}"; shift 2 ;;
    --price-captured-at) price_captured_at="${2:-}"; shift 2 ;; --confirm) confirm="${2:-}"; shift 2 ;;
    --apply) apply=true; shift ;; *) usage ;;
  esac
done

test_root=''
if [[ -n "${PAPERBANANA_HK_TEST_ROOT:-}" ]]; then
  test_root="$(realpath "$PAPERBANANA_HK_TEST_ROOT")"
  case "$test_root/" in /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;; *) exit 1 ;; esac
  [[ -f "$test_root/.paperbanana-hk-test-root" && "$(cat "$test_root/.paperbanana-hk-test-root")" == paperbanana-hk-test-root-v1 ]] || exit 1
  [[ "$apply" != true ]] || { echo 'test root never permits paid apply' >&2; exit 1; }
else
  [[ "$(id -u)" == 0 ]] || { echo 'operator must run as root' >&2; exit 1; }
fi

[[ "$phase" =~ ^(quick|full|standard)$ && "$run_id" =~ ^bench-run-[a-f0-9]{20}$ && "$expected_sha" =~ ^[a-f0-9]{40}$ ]] || usage
[[ "$provider" =~ ^(bailian|openrouter|ark)$ && "$model_id" =~ ^[A-Za-z0-9._:/-]{3,200}$ ]] || usage
[[ "$lane" =~ ^(1K-standard|2K-standard|4K-standard)$ || ( "$phase" == standard && "$lane" == provider-default ) ]] || usage
[[ "$suite_id" =~ ^[A-Za-z0-9._-]{3,100}$ && "$judge_epoch" =~ ^[A-Za-z0-9._:-]{3,100}$ ]] || usage
for value in "$suite_hash" "$judge_stack_hash" "$signed_authorization_hash" "$price_hash" "$run_hash" "$run_facts_hash" "$candidate_snapshot_hash" "$aspect_ratios_hash" "$run_integrity_attestation" "$immutable_facts_hash"; do [[ "$value" =~ ^[a-f0-9]{64}$ ]] || usage; done
[[ "$registry_hash" =~ ^[A-Za-z0-9._:/-]{3,200}$ ]] || usage
[[ "$max_generations" =~ ^[1-9][0-9]*$ && "$max_judgments" =~ ^[0-9]+$ && "$max_judge_calls" =~ ^[0-9]+$ ]] || usage
for value in "$max_estimated_usd" "$generation_usd" "$judge_usd"; do [[ "$value" =~ ^[0-9]+([.][0-9]+)?$ ]] || usage; done
[[ "$price_currency" == USD ]] || usage
if [[ "$phase" == quick ]]; then
  ((max_generations <= 24 && max_judgments <= 48 && max_judge_calls >= max_judgments && max_judge_calls <= max_judgments * 4 && max_judge_calls <= 192)) || usage
  [[ "$confirm" == run-exact-approved-quick-phase-disabled-worker ]] || usage
elif [[ "$phase" == full ]]; then
  ((max_generations <= 144 && max_judgments <= 288 && max_judge_calls >= max_judgments && max_judge_calls <= max_judgments * 4 && max_judge_calls <= 1152)) || usage
  [[ "$confirm" == run-exact-approved-full-phase-disabled-worker ]] || usage
else
  ((max_generations == 4 && max_judgments == 0 && max_judge_calls == 0)) || usage
  [[ "$judge_usd" == 0 || "$judge_usd" == 0.0 || "$judge_usd" == 0.00 ]] || usage
  [[ "$confirm" == run-exact-approved-standard-phase-disabled-worker ]] || usage
fi
[[ "$price_source" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?(/[^[:space:]]*)?$ ]] || usage
[[ "$price_captured_at" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$ ]] || usage
if normalized_timestamp="$(date -u -d "$price_captured_at" '+%Y-%m-%dT%H:%M:%S.%3NZ' 2>/dev/null)"; then
  [[ "$normalized_timestamp" == "$price_captured_at" ]] || usage
else
  price_captured_seconds="${price_captured_at%.*}Z"
  [[ "$(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$price_captured_seconds" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null)" == "$price_captured_seconds" ]] || usage
fi
awk -v maxUsd="$max_estimated_usd" -v maxG="$max_generations" -v maxJ="$max_judge_calls" \
  -v genUsd="$generation_usd" -v judgeUsd="$judge_usd" \
  'BEGIN { if (maxUsd <= 0 || genUsd <= 0 || judgeUsd < 0 || maxG * genUsd + maxJ * judgeUsd > maxUsd + 1e-9) exit 1 }' || usage
if [[ "$phase" != standard ]]; then awk -v value="$judge_usd" 'BEGIN { if (value <= 0) exit 1 }' || usage; fi

if [[ -n "$test_root" ]]; then
  deploy_dir="$test_root/opt/paperbanana/repo/deploy/hk-single-host"; secret_dir="$test_root/opt/paperbanana/secrets"; lock_path="$test_root/run/lock/paperbanana-hk-production.lock"
else
  deploy_dir='/opt/paperbanana/repo/deploy/hk-single-host'; secret_dir='/opt/paperbanana/secrets'; lock_path='/run/lock/paperbanana-hk-production.lock'
fi
deploy_env="$deploy_dir/.env"; core_env="$secret_dir/core.env"; bench_env="$secret_dir/bench.env"; gateway_env="$secret_dir/gateway.env"
read_env_value() { awk -F= -v key="$2" '$1 == key { value=substr($0,index($0,"=")+1); count++ } END { if(count==1) print value; else exit 1 }' "$1"; }
file_mode() { stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1"; }

if [[ "$apply" == true ]]; then
  if [[ "${PAPERBANANA_BENCH_BATCH_LOCK_HELD:-}" == 1 ]]; then flock -n 9 || exit 1
  else exec 9>"$lock_path"; flock -x 9
  fi
fi
for path in "$deploy_env" "$core_env" "$bench_env" "$gateway_env"; do [[ -f "$path" && ! -L "$path" ]] || exit 1; done
[[ "$(file_mode "$gateway_env")" =~ ^(400|600)$ ]] || { echo 'gateway.env must be a protected regular file' >&2; exit 1; }
[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled ]] || { echo 'Bench is not configured-disabled' >&2; exit 1; }
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false ]] || { echo 'PAPERBANANA_BENCH_ENABLED must remain false' >&2; exit 1; }
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || exit 1
[[ "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" && "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || exit 1
gateway_token="$(read_env_value "$gateway_env" PAPERBANANA_GATEWAY_TOKEN)"
core_gateway_token="$(read_env_value "$core_env" PAPERBANANA_GATEWAY_TOKEN)"
admin_transport_token="$(read_env_value "$gateway_env" PAPERBANANA_ADMIN_TRANSPORT_TOKEN)"
core_admin_transport_token="$(read_env_value "$core_env" PAPERBANANA_ADMIN_TRANSPORT_TOKEN)"
[[ "$gateway_token" =~ ^[A-Za-z0-9_-]{32,200}$ && "$core_gateway_token" == "$gateway_token" ]] || { echo 'protected Gateway token mismatch' >&2; exit 1; }
[[ "$admin_transport_token" =~ ^[A-Za-z0-9_-]{32,200}$ && "$core_admin_transport_token" == "$admin_transport_token" ]] || { echo 'protected admin transport token mismatch' >&2; exit 1; }
admin_user_id="$(read_env_value "$gateway_env" ADMIN_USER_IDS | awk -F, '{gsub(/^[[:space:]]+|[[:space:]]+$/, "", $1); print $1}')"
[[ "$admin_user_id" =~ ^[A-Za-z0-9._:-]{3,200}$ ]] || { echo 'immutable admin identity is unavailable' >&2; exit 1; }
if [[ "$apply" != true ]]; then echo 'dry-run: exact approved bounded phase preflight passed'; exit 0; fi

compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
"${compose[@]}" exec -T paperbanana-api node -e 'const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)' "$expected_sha"
"${compose[@]}" exec -T benchmark-worker node -e 'const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)' "$expected_sha"
daemon_check='const fs=require("node:fs");const h=JSON.parse(fs.readFileSync("/tmp/benchmark-worker-health.json","utf8"));if(process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1"||!h.ok||Date.now()-Date.parse(h.updatedAt)>90000)process.exit(1)'
"${compose[@]}" exec -T benchmark-worker node -e "$daemon_check"

attestation_file="$(mktemp /tmp/paperbanana-benchmark-phase-attestation.XXXXXX)"
report_file=''
cleanup() { rm -f -- "$attestation_file" "$report_file"; }
trap cleanup EXIT
report_file="$(mktemp /tmp/paperbanana-benchmark-phase-report.XXXXXX)"
chmod 0600 "$attestation_file" "$report_file"

"${compose[@]}" exec -T \
  -e PAPERBANANA_OPERATOR_ADMIN_USER_ID="$admin_user_id" \
  -e PAPERBANANA_OPERATOR_ATTESTATION_RUN_ID="$run_id" \
  paperbanana-api node - >"$attestation_file" <<'NODE'
;(async () => {
  const response = await fetch('http://127.0.0.1:3000/paperbanana-api', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-paperbanana-gateway-token': process.env.PAPERBANANA_GATEWAY_TOKEN,
      'x-paperbanana-admin-transport-token': process.env.PAPERBANANA_ADMIN_TRANSPORT_TOKEN,
      'x-paperbanana-admin-user-id': process.env.PAPERBANANA_OPERATOR_ADMIN_USER_ID,
    },
    body: JSON.stringify({
      action: 'adminBenchmarkControl',
      command: 'phaseOperatorAttestation',
      runId: process.env.PAPERBANANA_OPERATOR_ATTESTATION_RUN_ID,
    }),
  })
  const result = await response.json()
  if (!response.ok || result.code !== 0 || !result.run) process.exit(1)
  process.stdout.write(JSON.stringify(result.run))
})().catch(() => process.exit(1))
NODE

PAPERBANANA_EXPECTED_RUN_ID="$run_id" \
PAPERBANANA_EXPECTED_PHASE="$phase" \
PAPERBANANA_EXPECTED_CODE_SHA="$expected_sha" \
PAPERBANANA_EXPECTED_PROVIDER="$provider" \
PAPERBANANA_EXPECTED_MODEL_ID="$model_id" \
PAPERBANANA_EXPECTED_LANE="$lane" \
PAPERBANANA_EXPECTED_SUITE_ID="$suite_id" \
PAPERBANANA_EXPECTED_SUITE_HASH="$suite_hash" \
PAPERBANANA_EXPECTED_JUDGE_EPOCH="$judge_epoch" \
PAPERBANANA_EXPECTED_JUDGE_STACK_HASH="$judge_stack_hash" \
PAPERBANANA_EXPECTED_SIGNED_AUTHORIZATION_HASH="$signed_authorization_hash" \
PAPERBANANA_EXPECTED_PRICE_HASH="$price_hash" \
PAPERBANANA_EXPECTED_RUN_HASH="$run_hash" \
PAPERBANANA_EXPECTED_RUN_FACTS_HASH="$run_facts_hash" \
PAPERBANANA_EXPECTED_CANDIDATE_SNAPSHOT_HASH="$candidate_snapshot_hash" \
PAPERBANANA_EXPECTED_ASPECT_RATIOS_HASH="$aspect_ratios_hash" \
PAPERBANANA_EXPECTED_REGISTRY_HASH="$registry_hash" \
PAPERBANANA_EXPECTED_RUN_INTEGRITY_ATTESTATION="$run_integrity_attestation" \
PAPERBANANA_EXPECTED_IMMUTABLE_FACTS_HASH="$immutable_facts_hash" \
PAPERBANANA_EXPECTED_MAX_GENERATIONS="$max_generations" \
PAPERBANANA_EXPECTED_MAX_JUDGMENTS="$max_judgments" \
PAPERBANANA_EXPECTED_MAX_JUDGE_CALLS="$max_judge_calls" \
PAPERBANANA_EXPECTED_MAX_ESTIMATED_USD="$max_estimated_usd" \
PAPERBANANA_EXPECTED_GENERATION_USD="$generation_usd" \
PAPERBANANA_EXPECTED_JUDGE_USD="$judge_usd" \
PAPERBANANA_EXPECTED_PRICE_CURRENCY="$price_currency" \
PAPERBANANA_EXPECTED_PRICE_SOURCE="$price_source" \
PAPERBANANA_EXPECTED_PRICE_CAPTURED_AT="$price_captured_at" \
node "$deploy_dir/scripts/verify-benchmark-phase-attestation.mjs" "$attestation_file"

set +e
"${compose[@]}" run --rm --no-deps \
  -e PAPERBANANA_BENCH_PHASE_OPERATOR_PHASE="$phase" -e PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_ID="$run_id" \
  -e PAPERBANANA_BENCH_PHASE_OPERATOR_PROVIDER="$provider" -e PAPERBANANA_BENCH_PHASE_OPERATOR_MODEL_ID="$model_id" \
  -e PAPERBANANA_BENCH_PHASE_OPERATOR_LANE="$lane" -e PAPERBANANA_BENCH_PHASE_OPERATOR_SUITE_ID="$suite_id" \
  -e PAPERBANANA_BENCH_PHASE_OPERATOR_SUITE_HASH="$suite_hash" -e PAPERBANANA_BENCH_PHASE_OPERATOR_JUDGE_EPOCH="$judge_epoch" \
  -e PAPERBANANA_BENCH_PHASE_OPERATOR_JUDGE_STACK_HASH="$judge_stack_hash" -e PAPERBANANA_BENCH_PHASE_OPERATOR_SIGNED_AUTHORIZATION_HASH="$signed_authorization_hash" \
  -e PAPERBANANA_BENCH_PHASE_OPERATOR_PRICE_HASH="$price_hash" -e PAPERBANANA_BENCH_MAX_GENERATIONS="$max_generations" \
  -e PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_HASH="$run_hash" -e PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_FACTS_HASH="$run_facts_hash" \
  -e PAPERBANANA_BENCH_PHASE_OPERATOR_CANDIDATE_SNAPSHOT_HASH="$candidate_snapshot_hash" -e PAPERBANANA_BENCH_PHASE_OPERATOR_ASPECT_RATIOS_HASH="$aspect_ratios_hash" \
  -e PAPERBANANA_BENCH_PHASE_OPERATOR_REGISTRY_HASH="$registry_hash" -e PAPERBANANA_BENCH_PHASE_OPERATOR_RUN_INTEGRITY_ATTESTATION="$run_integrity_attestation" \
  -e PAPERBANANA_BENCH_PHASE_OPERATOR_IMMUTABLE_FACTS_HASH="$immutable_facts_hash" \
  -e PAPERBANANA_BENCH_MAX_JUDGMENTS="$max_judgments" -e PAPERBANANA_BENCH_MAX_JUDGE_CALLS="$max_judge_calls" -e PAPERBANANA_BENCH_MAX_ESTIMATED_USD="$max_estimated_usd" \
  -e PAPERBANANA_BENCH_ESTIMATED_PER_GENERATION_USD="$generation_usd" -e PAPERBANANA_BENCH_ESTIMATED_PER_JUDGE_CALL_USD="$judge_usd" \
  -e PAPERBANANA_BENCH_PRICE_CURRENCY="$price_currency" -e PAPERBANANA_BENCH_PRICE_SOURCE="$price_source" \
  -e PAPERBANANA_BENCH_PRICE_CAPTURED_AT="$price_captured_at" -e PAPERBANANA_BENCH_PHASE_OPERATOR_CONFIRM="$confirm" \
  benchmark-operator node dist/phase-operator.mjs >"$report_file"
operator_status=$?
set -e

"${compose[@]}" exec -T benchmark-worker node -e "$daemon_check"
"${compose[@]}" exec -T -e BENCHMARK_PHASE_OPERATOR_POSTCONDITION_RUN_ID="$run_id" -e BENCHMARK_PHASE_OPERATOR_POSTCONDITION_PHASE="$phase" -e BENCHMARK_PHASE_OPERATOR_POSTCONDITION_STATUS="$operator_status" benchmark-worker node - <<'NODE'
const { MongoClient } = require('mongodb')
;(async () => {
  const c = new MongoClient(process.env.PAPERBANANA_BENCH_MONGODB_URI)
  try {
    await c.connect()
    const r = await c.db(process.env.PAPERBANANA_BENCH_MONGO_DB || 'paperbanana_benchmark').collection('paperbanana_benchmark_runs').findOne({_id:process.env.BENCHMARK_PHASE_OPERATOR_POSTCONDITION_RUN_ID})
    const expected=process.env.BENCHMARK_PHASE_OPERATOR_POSTCONDITION_PHASE==='quick'?'quick_review':process.env.BENCHMARK_PHASE_OPERATOR_POSTCONDITION_PHASE==='standard'?'codex_review':'codex_audit'
    if(!r||String(r.state).endsWith('_running')||r.leaseOwner||r.leaseToken||r.leaseUntil||(process.env.BENCHMARK_PHASE_OPERATOR_POSTCONDITION_STATUS==='0'&&r.state!==expected))process.exit(1)
  } finally { await c.close() }
})().catch(() => process.exit(1))
NODE
((operator_status == 0)) || exit "$operator_status"
jq -e --arg run "$run_id" --arg phase "$phase" '.runId==$run and .phase==$phase and (.authorizationHash|test("^[a-f0-9]{64}$")) and (.state=="quick_review" or .state=="codex_audit" or .state=="codex_review")' "$report_file" >/dev/null
jq -c . "$report_file"
