#!/usr/bin/env bash
set -Eeuo pipefail

mode=''
expected_sha=''
provider=''
model_id=''
lane=''
max_generations=''
max_judge_calls=''
max_estimated_usd=''
estimated_per_generation_usd=''
estimated_per_judge_call_usd=''
price_currency=''
price_source=''
price_captured_at=''
confirm=''
apply=false

usage() {
  cat >&2 <<'EOF'
Usage: run-benchmark-paid-operator.sh --mode calibration|canary --expected-sha SHA \
  --provider bailian|openrouter|ark --model-id MODEL --lane 1K-standard|2K-standard|4K-standard \
  --max-generations N --max-judge-calls N --max-estimated-usd USD \
  --estimated-per-generation-usd USD --estimated-per-judge-call-usd USD \
  --price-currency USD --price-source HTTPS_URL --price-captured-at ISO_TIMESTAMP \
  --confirm calibrate-judge-disabled-worker|run-two-image-canary-disabled-worker [--apply]
EOF
  exit 64
}

while (($#)); do
  case "$1" in
    --mode) mode="${2:-}"; shift 2 ;;
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --provider) provider="${2:-}"; shift 2 ;;
    --model-id) model_id="${2:-}"; shift 2 ;;
    --lane) lane="${2:-}"; shift 2 ;;
    --max-generations) max_generations="${2:-}"; shift 2 ;;
    --max-judge-calls) max_judge_calls="${2:-}"; shift 2 ;;
    --max-estimated-usd) max_estimated_usd="${2:-}"; shift 2 ;;
    --estimated-per-generation-usd) estimated_per_generation_usd="${2:-}"; shift 2 ;;
    --estimated-per-judge-call-usd) estimated_per_judge_call_usd="${2:-}"; shift 2 ;;
    --price-currency) price_currency="${2:-}"; shift 2 ;;
    --price-source) price_source="${2:-}"; shift 2 ;;
    --price-captured-at) price_captured_at="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    --apply) apply=true; shift ;;
    *) usage ;;
  esac
done

test_root=''
if [[ -n "${PAPERBANANA_HK_TEST_ROOT:-}" ]]; then
  test_root="$(realpath "$PAPERBANANA_HK_TEST_ROOT")"
  case "$test_root/" in
    /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;;
    *) echo 'test root must be under an approved temporary directory' >&2; exit 1 ;;
  esac
  [[ -f "$test_root/.paperbanana-hk-test-root" && ! -L "$test_root/.paperbanana-hk-test-root" ]] || { echo 'test root marker is missing or unsafe' >&2; exit 1; }
  [[ "$(cat "$test_root/.paperbanana-hk-test-root")" == paperbanana-hk-test-root-v1 ]] || { echo 'test root marker is invalid' >&2; exit 1; }
  [[ "$apply" != true ]] || { echo 'test root never permits paid apply' >&2; exit 1; }
else
  [[ "$(id -u)" == 0 ]] || { echo 'run-benchmark-paid-operator.sh must run as root' >&2; exit 1; }
fi
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ ]] || usage
[[ "$provider" =~ ^(bailian|openrouter|ark)$ ]] || usage
[[ "$model_id" =~ ^[A-Za-z0-9._:/-]{3,200}$ ]] || usage
[[ "$lane" =~ ^(1K-standard|2K-standard|4K-standard)$ ]] || usage
[[ "$max_generations" =~ ^[0-9]+$ && "$max_judge_calls" =~ ^[0-9]+$ ]] || usage
for amount in "$max_estimated_usd" "$estimated_per_generation_usd" "$estimated_per_judge_call_usd"; do
  [[ "$amount" =~ ^[0-9]+([.][0-9]+)?$ ]] || usage
done
[[ "$price_currency" == USD ]] || usage
node - "$price_source" "$price_captured_at" <<'NODE'
const [source, capturedAt] = process.argv.slice(2)
try {
  const url = new URL(source)
  if (url.protocol !== 'https:' || url.username || url.password || url.toString() !== source) process.exit(1)
  if (new Date(capturedAt).toISOString() !== capturedAt) process.exit(1)
} catch { process.exit(1) }
NODE

if [[ "$mode" == calibration ]]; then
  [[ "$confirm" == calibrate-judge-disabled-worker && "$max_generations" == 0 ]] || usage
  ((max_judge_calls >= 12 && max_judge_calls <= 24)) || usage
  [[ "$estimated_per_generation_usd" =~ ^0([.]0+)?$ ]] || usage
elif [[ "$mode" == canary ]]; then
  [[ "$confirm" == run-two-image-canary-disabled-worker ]] || usage
  [[ "$max_generations" == 2 && "$max_judge_calls" == 6 ]] || usage
else
  usage
fi

node - "$max_estimated_usd" "$max_generations" "$max_judge_calls" "$estimated_per_generation_usd" "$estimated_per_judge_call_usd" <<'NODE'
const [maxUsd, maxGenerations, maxJudges, generationUsd, judgeUsd] = process.argv.slice(2).map(Number)
if (![maxUsd, maxGenerations, maxJudges, generationUsd, judgeUsd].every(Number.isFinite)) process.exit(1)
if (!(maxUsd > 0 && maxUsd <= 3)) process.exit(1)
if (generationUsd * maxGenerations + judgeUsd * maxJudges > maxUsd) process.exit(1)
NODE

if [[ -n "$test_root" ]]; then
  deploy_dir="$test_root/opt/paperbanana/repo/deploy/hk-single-host"
  secret_dir="$test_root/opt/paperbanana/secrets"
  lock_path="$test_root/run/lock/paperbanana-hk-production.lock"
else
  deploy_dir='/opt/paperbanana/repo/deploy/hk-single-host'
  secret_dir='/opt/paperbanana/secrets'
  lock_path='/run/lock/paperbanana-hk-production.lock'
fi
deploy_env="$deploy_dir/.env"
core_env="$secret_dir/core.env"
bench_env="$secret_dir/bench.env"
gateway_env="$secret_dir/gateway.env"

read_env_value() {
  local path="$1" key="$2"
  awk -F= -v key="$key" '$1 == key { value=substr($0,index($0,"=")+1); count += 1 } END { if (count == 1) print value; else exit 1 }' "$path"
}

if [[ "$apply" == true ]]; then
  exec 9>"$lock_path"
  flock -x 9
fi

for path in "$deploy_env" "$core_env" "$bench_env" "$gateway_env"; do
  [[ -f "$path" && ! -L "$path" ]] || { echo 'protected deployment input is missing or unsafe' >&2; exit 1; }
done
[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled ]] || { echo 'Bench credentials are not configured-disabled' >&2; exit 1; }
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false ]] || { echo 'PAPERBANANA_BENCH_ENABLED must remain false' >&2; exit 1; }
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || { echo 'PAPERBANANA_BENCH_CONCURRENCY must remain 1' >&2; exit 1; }
[[ "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || { echo 'Core PAPERBANANA_CODE_SHA mismatch' >&2; exit 1; }
[[ "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || { echo 'Worker PAPERBANANA_CODE_SHA mismatch' >&2; exit 1; }

if [[ "$apply" != true ]]; then
  echo "dry-run: would run $mode with disabled Worker and explicit paid caps"
  exit 0
fi

compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
"${compose[@]}" exec -T paperbanana-api node -e 'const fs=require("node:fs");const p=JSON.parse(fs.readFileSync("/app/build-provenance.json","utf8"));if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)' "$expected_sha"
"${compose[@]}" run --rm --no-deps benchmark-operator node -e 'const fs=require("node:fs");const p=JSON.parse(fs.readFileSync("/app/build-provenance.json","utf8"));if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)' "$expected_sha"
"${compose[@]}" exec -T benchmark-worker node -e 'if(process.env.PAPERBANANA_CODE_SHA!==process.argv[1]||process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")process.exit(1)' "$expected_sha"

report_file="$(mktemp /tmp/paperbanana-benchmark-operator-report.XXXXXX)"
chmod 0600 "$report_file"
cleanup() { rm -f -- "$report_file"; }
trap cleanup EXIT

"${compose[@]}" run --rm --no-deps \
  -e PAPERBANANA_BENCH_OPERATOR_MODE="$mode" \
  -e PAPERBANANA_BENCH_OPERATOR_CONFIRM="$confirm" \
  -e PAPERBANANA_BENCH_OPERATOR_PROVIDER="$provider" \
  -e PAPERBANANA_BENCH_OPERATOR_MODEL_ID="$model_id" \
  -e PAPERBANANA_BENCH_OPERATOR_LANE="$lane" \
  -e PAPERBANANA_BENCH_MAX_GENERATIONS="$max_generations" \
  -e PAPERBANANA_BENCH_MAX_JUDGE_CALLS="$max_judge_calls" \
  -e PAPERBANANA_BENCH_MAX_ESTIMATED_USD="$max_estimated_usd" \
  -e PAPERBANANA_BENCH_ESTIMATED_PER_GENERATION_USD="$estimated_per_generation_usd" \
  -e PAPERBANANA_BENCH_ESTIMATED_PER_JUDGE_CALL_USD="$estimated_per_judge_call_usd" \
  -e PAPERBANANA_BENCH_PRICE_CURRENCY="$price_currency" \
  -e PAPERBANANA_BENCH_PRICE_SOURCE="$price_source" \
  -e PAPERBANANA_BENCH_PRICE_CAPTURED_AT="$price_captured_at" \
  benchmark-operator node dist/operator.mjs >"$report_file"

jq -e --arg mode "$mode" --arg sha "$expected_sha" '
  .operatorMode == $mode and .codeSha == $sha and
  (.operatorReportHash | test("^[a-f0-9]{64}$")) and
  (.reportObjectKey | startswith("bench/operator-reports/")) and
  .result.passed == true
' "$report_file" >/dev/null
node - "$report_file" <<'NODE'
const { createHash } = await import('node:crypto')
const { readFile } = await import('node:fs/promises')
const report = JSON.parse(await readFile(process.argv[2], 'utf8'))
const expected = report.operatorReportHash
delete report.operatorReportHash
delete report.reportObjectKey
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, normalize(child)]))
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('non-finite report value')
  return value
}
const actual = createHash('sha256').update(JSON.stringify(normalize(report))).digest('hex')
if (actual !== expected) process.exit(1)
NODE

actual_generations="$(jq -r '.usage.generations' "$report_file")"
actual_judgments="$(jq -r '.usage.judgments' "$report_file")"
actual_usd="$(jq -r '.usage.estimatedUsd' "$report_file")"
node - "$actual_generations" "$actual_judgments" "$actual_usd" "$max_generations" "$max_judge_calls" "$max_estimated_usd" <<'NODE'
const [g, j, usd, maxG, maxJ, maxUsd] = process.argv.slice(2).map(Number)
if (![g,j,usd,maxG,maxJ,maxUsd].every(Number.isFinite) || g > maxG || j > maxJ || usd > maxUsd) process.exit(1)
NODE

if [[ "$mode" == calibration ]]; then
  admin_user_id="$(read_env_value "$gateway_env" ADMIN_USER_IDS | awk -F, '{gsub(/^[[:space:]]+|[[:space:]]+$/, "", $1); print $1}')"
  [[ "$admin_user_id" =~ ^[A-Za-z0-9._:-]{3,200}$ ]] || { echo 'immutable admin identity is unavailable' >&2; exit 1; }
  fixture_hash="$(jq -r '.result.fixtureHash' "$report_file")"
  correct_red_lines="$(jq -r '.result.correctRedLines' "$report_file")"
  total_red_lines="$(jq -r '.result.totalRedLines' "$report_file")"
  agreement="$(jq -r '.result.agreement' "$report_file")"
  operator_report_hash="$(jq -r '.operatorReportHash' "$report_file")"
  report_object_key="$(jq -r '.reportObjectKey' "$report_file")"
  authorization_hash="$(jq -r '.authorizationHash' "$report_file")"
  price_hash="$(jq -r '.priceHash' "$report_file")"
  price_snapshot="$(jq -c '.priceSnapshot' "$report_file")"
  operator_usage="$(jq -c '.usage' "$report_file")"
  "${compose[@]}" exec -T \
    -e PAPERBANANA_OPERATOR_ADMIN_USER_ID="$admin_user_id" \
    -e PAPERBANANA_OPERATOR_FIXTURE_HASH="$fixture_hash" \
    -e PAPERBANANA_OPERATOR_CORRECT_RED_LINES="$correct_red_lines" \
    -e PAPERBANANA_OPERATOR_TOTAL_RED_LINES="$total_red_lines" \
    -e PAPERBANANA_OPERATOR_AGREEMENT="$agreement" \
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
  correctRedLines: Number(process.env.PAPERBANANA_OPERATOR_CORRECT_RED_LINES),
  totalRedLines: Number(process.env.PAPERBANANA_OPERATOR_TOTAL_RED_LINES),
  agreement: Number(process.env.PAPERBANANA_OPERATOR_AGREEMENT),
  operatorReportHash: process.env.PAPERBANANA_OPERATOR_REPORT_HASH,
  reportObjectKey: process.env.PAPERBANANA_OPERATOR_REPORT_OBJECT_KEY,
  authorizationHash: process.env.PAPERBANANA_OPERATOR_AUTHORIZATION_HASH,
  priceHash: process.env.PAPERBANANA_OPERATOR_PRICE_HASH,
  priceSnapshot: JSON.parse(process.env.PAPERBANANA_OPERATOR_PRICE_SNAPSHOT),
  usage: JSON.parse(process.env.PAPERBANANA_OPERATOR_USAGE),
}
const response = await fetch('http://127.0.0.1:3000/paperbanana-api', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-paperbanana-gateway-token': process.env.PAPERBANANA_GATEWAY_TOKEN,
    'x-paperbanana-admin-transport-token': process.env.PAPERBANANA_ADMIN_TRANSPORT_TOKEN,
    'x-paperbanana-admin-user-id': process.env.PAPERBANANA_OPERATOR_ADMIN_USER_ID,
  },
  body: JSON.stringify(body),
})
const result = await response.json()
if (!response.ok || result.code !== 0 || result.run?.passed !== true) process.exit(1)
NODE
fi

operator_report_hash="$(jq -r '.operatorReportHash' "$report_file")"
printf 'BENCHMARK_OPERATOR_MODE=%s\n' "$mode"
printf 'BENCHMARK_OPERATOR_REPORT_HASH=%s\n' "$operator_report_hash"
printf 'BENCHMARK_OPERATOR_GENERATIONS=%s\n' "$actual_generations"
printf 'BENCHMARK_OPERATOR_JUDGE_CALLS=%s\n' "$actual_judgments"
printf 'BENCHMARK_OPERATOR_ESTIMATED_USD=%s\n' "$actual_usd"
printf 'PAPERBANANA_BENCH_ENABLED=false\n'
