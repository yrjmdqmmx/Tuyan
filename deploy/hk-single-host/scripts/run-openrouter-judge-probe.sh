#!/usr/bin/env bash
set -Eeuo pipefail

kind=''
expected_sha=''
max_judge_calls=''
max_estimated_usd=''
estimated_per_judge_call_usd=''
price_source=''
price_captured_at=''
confirm=''
apply=false

usage() {
  echo 'Usage: run-openrouter-judge-probe.sh --kind text_only|minimal_image|benchmark_fixture --expected-sha SHA --max-judge-calls 1 --max-estimated-usd 0.10 --estimated-per-judge-call-usd 0.10 --price-source HTTPS_URL --price-captured-at ISO_TIMESTAMP --confirm probe-one-openrouter-judge-disabled-worker [--apply]' >&2
  exit 64
}

while (($#)); do
  case "$1" in
    --kind) kind="${2:-}"; shift 2 ;;
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
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

test_root=''
if [[ -n "${PAPERBANANA_HK_TEST_ROOT:-}" ]]; then
  test_root="$(realpath "$PAPERBANANA_HK_TEST_ROOT")"
  case "$test_root/" in
    /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;;
    *) echo 'test root must be under an approved temporary directory' >&2; exit 1 ;;
  esac
  [[ -f "$test_root/.paperbanana-hk-test-root" && ! -L "$test_root/.paperbanana-hk-test-root" ]] || { echo 'test root marker is missing or unsafe' >&2; exit 1; }
  [[ "$(<"$test_root/.paperbanana-hk-test-root")" == paperbanana-hk-test-root-v1 ]] || { echo 'test root marker is invalid' >&2; exit 1; }
  [[ "$apply" != true ]] || { echo 'test root never permits paid apply' >&2; exit 1; }
else
  [[ "$(id -u)" == 0 ]] || { echo 'run-openrouter-judge-probe.sh must run as root' >&2; exit 1; }
fi

[[ "$kind" =~ ^(text_only|minimal_image|benchmark_fixture)$ ]] || usage
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ ]] || usage
[[ "$max_judge_calls" == 1 ]] || usage
[[ "$max_estimated_usd" == 0.10 && "$estimated_per_judge_call_usd" == 0.10 ]] || usage
[[ "$confirm" == probe-one-openrouter-judge-disabled-worker ]] || usage
node - "$price_source" "$price_captured_at" <<'NODE'
const [source, capturedAt] = process.argv.slice(2)
try {
  const url = new URL(source)
  if (url.protocol !== 'https:' || url.username || url.password || url.toString() !== source) process.exit(1)
  if (new Date(capturedAt).toISOString() !== capturedAt) process.exit(1)
} catch { process.exit(1) }
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

read_env_value() {
  local path="$1" key="$2"
  awk -F= -v key="$key" '$1 == key { value=substr($0,index($0,"=")+1); count += 1 } END { if (count == 1) print value; else exit 1 }' "$path"
}

if [[ "$apply" == true ]]; then
  exec 9>"$lock_path"
  flock -x 9
fi
for path in "$deploy_env" "$core_env" "$bench_env"; do
  [[ -f "$path" && ! -L "$path" ]] || { echo 'protected deployment input is missing or unsafe' >&2; exit 1; }
done
[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled ]] || { echo 'Bench credentials are not configured-disabled' >&2; exit 1; }
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false ]] || { echo 'PAPERBANANA_BENCH_ENABLED must remain false' >&2; exit 1; }
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || { echo 'PAPERBANANA_BENCH_CONCURRENCY must remain 1' >&2; exit 1; }
[[ "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || { echo 'Core PAPERBANANA_CODE_SHA mismatch' >&2; exit 1; }
[[ "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || { echo 'Worker PAPERBANANA_CODE_SHA mismatch' >&2; exit 1; }
echo 'OPENROUTER_JUDGE_PROBE_STAGE=host-inputs-ok'

if [[ "$apply" != true ]]; then
  echo "dry-run: would run one $kind OpenRouter Judge probe with disabled Worker and US\$0.10 cap"
  exit 0
fi

compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
"${compose[@]}" exec -T paperbanana-api node -e 'const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)' "$expected_sha"
echo 'OPENROUTER_JUDGE_PROBE_STAGE=core-provenance-ok'
"${compose[@]}" run --rm --no-deps benchmark-operator node -e 'const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)' "$expected_sha"
echo 'OPENROUTER_JUDGE_PROBE_STAGE=oneoff-worker-provenance-ok'
"${compose[@]}" exec -T benchmark-worker node -e 'if(process.env.PAPERBANANA_CODE_SHA!==process.argv[1]||process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")process.exit(1)' "$expected_sha"
echo 'OPENROUTER_JUDGE_PROBE_STAGE=resident-worker-disabled'

result_file="$(mktemp /tmp/paperbanana-openrouter-judge-probe.XXXXXX)"
chmod 0600 "$result_file"
cleanup() { rm -f -- "$result_file"; }
trap cleanup EXIT

echo 'OPENROUTER_JUDGE_PROBE_STAGE=paid-dispatch-start'
"${compose[@]}" run --rm --no-deps \
  -e PAPERBANANA_OPENROUTER_PROBE_KIND="$kind" \
  -e PAPERBANANA_OPENROUTER_PROBE_CONFIRM="$confirm" \
  -e PAPERBANANA_BENCH_MAX_JUDGE_CALLS="$max_judge_calls" \
  -e PAPERBANANA_BENCH_MAX_ESTIMATED_USD="$max_estimated_usd" \
  -e PAPERBANANA_BENCH_ESTIMATED_PER_JUDGE_CALL_USD="$estimated_per_judge_call_usd" \
  benchmark-operator node dist/openrouter-judge-probe.mjs >"$result_file"

[[ "$(wc -l <"$result_file" | tr -d ' ')" == 1 ]] || { echo 'OPENROUTER_JUDGE_PROBE_RESULT_INVALID' >&2; exit 1; }
result="$(awk -F= '$1 == "OPENROUTER_JUDGE_PROBE_RESULT" { print $2 }' "$result_file")"
[[ "$result" =~ ^OPENROUTER_JUDGE_PROBE_(OK|FORBIDDEN_(EDGE|UPSTREAM|GUARDRAIL|BUDGET|ACCESS_POLICY|OPAQUE)|UNKNOWN_AFTER_DISPATCH|HTTP_[0-9]{3})$ ]] || { echo 'OPENROUTER_JUDGE_PROBE_RESULT_INVALID' >&2; exit 1; }
printf 'OPENROUTER_JUDGE_PROBE_KIND=%s\n' "$kind"
printf 'OPENROUTER_JUDGE_PROBE_RESULT=%s\n' "$result"
printf 'OPENROUTER_JUDGE_PROBE_JUDGE_CALLS=1\n'
printf 'OPENROUTER_JUDGE_PROBE_ESTIMATED_USD=0.10\n'
printf 'PAPERBANANA_BENCH_ENABLED=false\n'
