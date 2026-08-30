#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

mode='' expected_sha='' release_hash='' confirm=''
usage() {
  echo 'usage: backfill-public-evidence.sh --mode inspect|apply --expected-sha 40_HEX --release-hash 64_HEX --confirm PHRASE' >&2
  exit 64
}
while (($#)); do
  case "$1" in
    --mode) mode="${2:-}"; shift 2 ;;
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --release-hash) release_hash="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done

[[ "$mode" =~ ^(inspect|apply)$ && "$expected_sha" =~ ^[a-f0-9]{40}$ && "$release_hash" =~ ^[a-f0-9]{64}$ ]] || usage
case "$mode" in
  inspect) [[ "$confirm" == inspect-public-evidence-disabled-worker ]] || usage ;;
  apply) [[ "$confirm" == backfill-public-evidence-disabled-worker ]] || usage ;;
esac

test_root=''
if [[ -n "${PAPERBANANA_HK_TEST_ROOT:-}" ]]; then
  test_root="$(realpath "$PAPERBANANA_HK_TEST_ROOT")"
  case "$test_root/" in /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;; *) exit 1 ;; esac
  [[ -f "$test_root/.paperbanana-hk-test-root" && "$(<"$test_root/.paperbanana-hk-test-root")" == paperbanana-hk-test-root-v1 ]] || exit 1
  [[ "$mode" == inspect ]] || { echo 'test root never permits apply' >&2; exit 1; }
else
  [[ "$(id -u)" == 0 ]] || { echo 'public evidence backfill must run as root' >&2; exit 1; }
fi

host_path() { printf '%s%s' "$test_root" "$1"; }
deploy_dir="$(host_path /opt/paperbanana/repo/deploy/hk-single-host)"
secret_dir="$(host_path /opt/paperbanana/secrets)"
deploy_env="$deploy_dir/.env"
core_env="$secret_dir/core.env"
bench_env="$secret_dir/bench.env"
lock_path="$(host_path /run/lock/paperbanana-hk-production.lock)"

mkdir -p -- "$(dirname -- "$lock_path")"
exec 9>"$lock_path"
portable_lock_dir=''
if command -v flock >/dev/null 2>&1; then
  flock -x 9
elif [[ -n "$test_root" ]]; then
  portable_lock_dir="${lock_path}.d"
  mkdir -- "$portable_lock_dir"
else
  echo 'flock is required for production evidence backfill' >&2
  exit 1
fi
cleanup_lock() { [[ -z "$portable_lock_dir" ]] || rmdir -- "$portable_lock_dir" 2>/dev/null || true; }
trap cleanup_lock EXIT

for path in "$deploy_env" "$core_env" "$bench_env"; do
  [[ -f "$path" && ! -L "$path" ]] || { echo 'protected runtime configuration is unavailable' >&2; exit 1; }
done
read_env_value() {
  awk -F= -v key="$2" '$1==key {value=substr($0,index($0,"=")+1);count++} END {if(count==1)print value;else exit 1}' "$1"
}

[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled ]] || {
  echo 'benchmark credentials must be configured-disabled' >&2; exit 1;
}
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false ]] || {
  echo 'benchmark worker must remain disabled' >&2; exit 1;
}
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || {
  echo 'benchmark concurrency must remain one' >&2; exit 1;
}
[[ "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || {
  echo 'Core runtime SHA mismatch' >&2; exit 1;
}
[[ "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || {
  echo 'Benchmark runtime SHA mismatch' >&2; exit 1;
}

if [[ -n "$test_root" ]]; then
  printf '{"schemaVersion":1,"mode":"inspect","releaseHash":"%s","dryRun":true,"generatedOrJudgeCalls":0}\n' "$release_hash"
  exit 0
fi

compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
"${compose[@]}" ps --status running benchmark-worker | grep -q benchmark-worker
"${compose[@]}" exec -T paperbanana-api node -e '
  const p=require("/app/build-provenance.json")
  if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1]) process.exit(1)
' "$expected_sha" >/dev/null
worker_guard='const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1]||process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")process.exit(1)'
"${compose[@]}" exec -T benchmark-worker node -e "$worker_guard" "$expected_sha" >/dev/null

result_path="$(mktemp /tmp/paperbanana-public-evidence-result.XXXXXXXXXXXX)"
cleanup() { rm -f -- "$result_path"; cleanup_lock; }
trap cleanup EXIT
entry_confirm='inspect-public-evidence-disabled-worker'
[[ "$mode" == apply ]] && entry_confirm='backfill-public-evidence-disabled-worker'
"${compose[@]}" exec -T \
  -e "PAPERBANANA_PUBLIC_EVIDENCE_BACKFILL_MODE=$mode" \
  -e "PAPERBANANA_PUBLIC_EVIDENCE_RELEASE_HASH=$release_hash" \
  -e "PAPERBANANA_PUBLIC_EVIDENCE_BACKFILL_CONFIRM=$entry_confirm" \
  benchmark-worker node dist/public-evidence-backfill.mjs >"$result_path"

"${compose[@]}" exec -T paperbanana-api node -e '
const fs = require("node:fs")
const [expectedMode, expectedReleaseHash] = process.argv.slice(1)
let value
try { value = JSON.parse(fs.readFileSync(0, "utf8")) } catch { process.exit(1) }
if (value?.schemaVersion !== 1 || value.mode !== expectedMode || value.releaseHash !== expectedReleaseHash
  || value.generatedOrJudgeCalls !== 0 || !Number.isInteger(value.eligibleModelCount)
  || !Number.isInteger(value.sourceCount) || !Number.isInteger(value.publishedCount)
  || value.eligibleModelCount < 1 || value.sourceCount < value.eligibleModelCount * 3
  || (expectedMode === "inspect" && value.publishedCount !== 0)
  || (expectedMode === "apply" && value.publishedCount !== value.sourceCount)) process.exit(1)
process.stdout.write(`${JSON.stringify({
  schemaVersion: 1, mode: value.mode, releaseHash: value.releaseHash,
  eligibleModelCount: value.eligibleModelCount, sourceCount: value.sourceCount,
  publishedCount: value.publishedCount, generatedOrJudgeCalls: 0,
})}\n`)
' "$mode" "$release_hash" <"$result_path"

"${compose[@]}" exec -T benchmark-worker node -e "$worker_guard" "$expected_sha" >/dev/null
