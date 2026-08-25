#!/usr/bin/env bash
set -Eeuo pipefail

expected_sha='' not_before='' max_judge_calls='' max_estimated_usd=''
estimated_per_judge_call_usd='' price_source='' price_captured_at='' confirm=''
apply=false

usage() {
  echo 'Usage: recover-benchmark-calibration.sh --expected-sha SHA --not-before ISO --max-judge-calls N --max-estimated-usd USD --estimated-per-judge-call-usd USD --price-source HTTPS_URL --price-captured-at ISO --confirm recover-calibration-disabled-worker [--apply]' >&2
  exit 64
}

while (($#)); do
  case "$1" in
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --not-before) not_before="${2:-}"; shift 2 ;;
    --max-judge-calls) max_judge_calls="${2:-}"; shift 2 ;;
    --max-estimated-usd) max_estimated_usd="${2:-}"; shift 2 ;;
    --estimated-per-judge-call-usd) estimated_per_judge_call_usd="${2:-}"; shift 2 ;;
    --price-source) price_source="${2:-}"; shift 2 ;;
    --price-captured-at) price_captured_at="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    --apply) apply=true; shift ;;
    *) usage ;;
  esac
done

[[ "$expected_sha" =~ ^[a-f0-9]{40}$ && "$max_judge_calls" =~ ^[0-9]+$ ]] || usage
[[ "$max_estimated_usd" =~ ^[0-9]+([.][0-9]+)?$ && "$estimated_per_judge_call_usd" =~ ^[0-9]+([.][0-9]+)?$ ]] || usage
[[ "$confirm" == recover-calibration-disabled-worker ]] || usage
node - "$not_before" "$price_source" "$price_captured_at" "$max_judge_calls" "$max_estimated_usd" "$estimated_per_judge_call_usd" <<'NODE'
const [notBefore, source, capturedAt, maxCalls, maxUsd, perCall] = process.argv.slice(2)
try {
  const url = new URL(source)
  if (url.protocol !== 'https:' || url.username || url.password || url.toString() !== source) process.exit(1)
  if (new Date(notBefore).toISOString() !== notBefore || new Date(capturedAt).toISOString() !== capturedAt) process.exit(1)
  const calls = Number(maxCalls), cap = Number(maxUsd), unit = Number(perCall)
  if (!Number.isInteger(calls) || calls < 12 || calls > 24 || !Number.isFinite(cap) || cap <= 0 || cap > 3 || !Number.isFinite(unit) || unit <= 0 || calls * unit > cap + 1e-9) process.exit(1)
} catch { process.exit(1) }
NODE

test_root=''
if [[ -n "${PAPERBANANA_HK_TEST_ROOT:-}" ]]; then
  test_root="$(realpath "$PAPERBANANA_HK_TEST_ROOT")"
  case "$test_root/" in /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;; *) exit 1 ;; esac
  [[ -f "$test_root/.paperbanana-hk-test-root" && ! -L "$test_root/.paperbanana-hk-test-root" ]] || exit 1
  [[ "$(<"$test_root/.paperbanana-hk-test-root")" == paperbanana-hk-test-root-v1 ]] || exit 1
  [[ "$apply" != true ]] || { echo 'test root never permits recovery apply' >&2; exit 1; }
else
  [[ "$(id -u)" == 0 ]] || { echo 'calibration recovery must run as root' >&2; exit 1; }
fi

if [[ -n "$test_root" ]]; then
  deploy_dir="$test_root/opt/paperbanana/repo/deploy/hk-single-host"
  secret_dir="$test_root/opt/paperbanana/secrets"
  lock_path="$test_root/run/lock/paperbanana-hk-production.lock"
else
  deploy_dir='/opt/paperbanana/repo/deploy/hk-single-host'
  secret_dir='/opt/paperbanana/secrets'
  lock_path='/run/lock/paperbanana-hk-production.lock'
fi
deploy_env="$deploy_dir/.env" core_env="$secret_dir/core.env" bench_env="$secret_dir/bench.env" gateway_env="$secret_dir/gateway.env"

read_env_value() {
  awk -F= -v key="$2" '$1 == key { value=substr($0,index($0,"=")+1); count += 1 } END { if (count == 1) print value; else exit 1 }' "$1"
}

if [[ "$apply" == true ]]; then exec 9>"$lock_path"; flock -x 9; fi
for path in "$deploy_env" "$core_env" "$bench_env" "$gateway_env"; do [[ -f "$path" && ! -L "$path" ]] || exit 1; done
[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || exit 1
[[ "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || exit 1
echo 'BENCHMARK_CALIBRATION_RECOVERY_STAGE=host-inputs-ok'
if [[ "$apply" != true ]]; then echo 'BENCHMARK_CALIBRATION_RECOVERY_STAGE=dry-run'; exit 0; fi

compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
"${compose[@]}" exec -T paperbanana-api node -e 'const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)' "$expected_sha" >/dev/null
"${compose[@]}" exec -T benchmark-worker node -e 'if(process.env.PAPERBANANA_CODE_SHA!==process.argv[1]||process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")process.exit(1)' "$expected_sha" >/dev/null
report_file="$(mktemp /tmp/paperbanana-calibration-recovery.XXXXXX)"
chmod 0600 "$report_file"
cleanup() { rm -f -- "$report_file"; }
trap cleanup EXIT
"${compose[@]}" run --rm --no-deps \
  -e PAPERBANANA_RECOVERY_CODE_SHA="$expected_sha" \
  -e PAPERBANANA_RECOVERY_NOT_BEFORE="$not_before" \
  -e PAPERBANANA_RECOVERY_MAX_JUDGE_CALLS="$max_judge_calls" \
  -e PAPERBANANA_RECOVERY_MAX_ESTIMATED_USD="$max_estimated_usd" \
  -e PAPERBANANA_RECOVERY_ESTIMATED_PER_JUDGE_CALL_USD="$estimated_per_judge_call_usd" \
  -e PAPERBANANA_RECOVERY_PRICE_SOURCE="$price_source" \
  -e PAPERBANANA_RECOVERY_PRICE_CAPTURED_AT="$price_captured_at" \
  benchmark-operator node dist/calibration-recovery.mjs >"$report_file"
jq -e --arg sha "$expected_sha" '.operatorMode=="calibration" and .codeSha==$sha and .result.passed==true and (.operatorReportHash|test("^[a-f0-9]{64}$")) and .reportObjectKey==("bench/operator-reports/"+.operatorReportHash+".json")' "$report_file" >/dev/null
echo 'BENCHMARK_CALIBRATION_RECOVERY_STAGE=report-recovered'

admin_user_id="$(read_env_value "$gateway_env" ADMIN_USER_IDS | awk -F, '{gsub(/^[[:space:]]+|[[:space:]]+$/, "", $1); print $1}')"
[[ "$admin_user_id" =~ ^[A-Za-z0-9._:-]{3,200}$ ]] || exit 1
for field in fixtureHash correctRedLines totalRedLines agreement; do value="$(jq -r ".result.$field" "$report_file")"; printf -v "report_$field" '%s' "$value"; done
operator_report_hash="$(jq -r .operatorReportHash "$report_file")"
report_object_key="$(jq -r .reportObjectKey "$report_file")"
authorization_hash="$(jq -r .authorizationHash "$report_file")"
price_hash="$(jq -r .priceHash "$report_file")"
price_snapshot="$(jq -c .priceSnapshot "$report_file")"
operator_usage="$(jq -c .usage "$report_file")"
"${compose[@]}" exec -T \
  -e PAPERBANANA_OPERATOR_ADMIN_USER_ID="$admin_user_id" \
  -e PAPERBANANA_OPERATOR_FIXTURE_HASH="$report_fixtureHash" \
  -e PAPERBANANA_OPERATOR_CORRECT_RED_LINES="$report_correctRedLines" \
  -e PAPERBANANA_OPERATOR_TOTAL_RED_LINES="$report_totalRedLines" \
  -e PAPERBANANA_OPERATOR_AGREEMENT="$report_agreement" \
  -e PAPERBANANA_OPERATOR_REPORT_HASH="$operator_report_hash" \
  -e PAPERBANANA_OPERATOR_REPORT_OBJECT_KEY="$report_object_key" \
  -e PAPERBANANA_OPERATOR_AUTHORIZATION_HASH="$authorization_hash" \
  -e PAPERBANANA_OPERATOR_PRICE_HASH="$price_hash" \
  -e PAPERBANANA_OPERATOR_PRICE_SNAPSHOT="$price_snapshot" \
  -e PAPERBANANA_OPERATOR_USAGE="$operator_usage" \
  paperbanana-api node - <<'NODE'
const body = {
  action: 'adminBenchmarkControl', command: 'recordJudgeCalibration', judgeEpoch: 'judge-2026-08-v1',
  fixtureHash: process.env.PAPERBANANA_OPERATOR_FIXTURE_HASH,
  correctRedLines: Number(process.env.PAPERBANANA_OPERATOR_CORRECT_RED_LINES), totalRedLines: Number(process.env.PAPERBANANA_OPERATOR_TOTAL_RED_LINES),
  agreement: Number(process.env.PAPERBANANA_OPERATOR_AGREEMENT), operatorReportHash: process.env.PAPERBANANA_OPERATOR_REPORT_HASH,
  reportObjectKey: process.env.PAPERBANANA_OPERATOR_REPORT_OBJECT_KEY, authorizationHash: process.env.PAPERBANANA_OPERATOR_AUTHORIZATION_HASH,
  priceHash: process.env.PAPERBANANA_OPERATOR_PRICE_HASH, priceSnapshot: JSON.parse(process.env.PAPERBANANA_OPERATOR_PRICE_SNAPSHOT),
  usage: JSON.parse(process.env.PAPERBANANA_OPERATOR_USAGE),
}
const response = await fetch('http://127.0.0.1:3000/paperbanana-api', { method: 'POST', headers: {
  'content-type': 'application/json', 'x-paperbanana-gateway-token': process.env.PAPERBANANA_GATEWAY_TOKEN,
  'x-paperbanana-admin-transport-token': process.env.PAPERBANANA_ADMIN_TRANSPORT_TOKEN,
  'x-paperbanana-admin-user-id': process.env.PAPERBANANA_OPERATOR_ADMIN_USER_ID,
}, body: JSON.stringify(body) })
const result = await response.json().catch(() => ({}))
if (!response.ok || result.code !== 0 || result.run?.passed !== true) {
  process.stderr.write('BENCHMARK_CALIBRATION_RECOVERY_CORE_RECORD_FAILED\n')
  process.exit(1)
}
NODE
echo 'BENCHMARK_CALIBRATION_RECOVERY_STAGE=core-recorded'
printf 'BENCHMARK_CALIBRATION_RECOVERY_REPORT_HASH=%s\n' "$operator_report_hash"
printf 'BENCHMARK_CALIBRATION_RECOVERY_CORRECT_RED_LINES=%s/%s\n' "$report_correctRedLines" "$report_totalRedLines"
printf 'BENCHMARK_CALIBRATION_RECOVERY_AGREEMENT=%s\n' "$report_agreement"
printf 'BENCHMARK_CALIBRATION_RECOVERY_JUDGE_CALLS=%s\n' "$(jq -r .usage.judgments "$report_file")"
printf 'BENCHMARK_CALIBRATION_RECOVERY_ESTIMATED_USD=%s\n' "$(jq -r .usage.estimatedUsd "$report_file")"
printf 'PAPERBANANA_BENCH_ENABLED=false\n'
