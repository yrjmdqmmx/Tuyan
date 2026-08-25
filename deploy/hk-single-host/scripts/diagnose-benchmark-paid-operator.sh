#!/usr/bin/env bash
set -Eeuo pipefail

expected_sha=''
confirm=''
apply=false

usage() {
  echo 'Usage: diagnose-benchmark-paid-operator.sh --expected-sha SHA --confirm diagnose-paid-operator-disabled-worker [--apply]' >&2
  exit 64
}

while (($#)); do
  case "$1" in
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    --apply) apply=true; shift ;;
    *) usage ;;
  esac
done

[[ "$expected_sha" =~ ^[a-f0-9]{40}$ ]] || usage
[[ "$confirm" == diagnose-paid-operator-disabled-worker ]] || usage

test_root=''
if [[ -n "${PAPERBANANA_HK_TEST_ROOT:-}" ]]; then
  test_root="$(realpath "$PAPERBANANA_HK_TEST_ROOT")"
  case "$test_root/" in
    /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;;
    *) exit 1 ;;
  esac
  [[ -f "$test_root/.paperbanana-hk-test-root" && ! -L "$test_root/.paperbanana-hk-test-root" ]] || exit 1
  [[ "$(<"$test_root/.paperbanana-hk-test-root")" == paperbanana-hk-test-root-v1 ]] || exit 1
  [[ "$apply" != true ]] || { echo 'test root never permits diagnostic apply' >&2; exit 1; }
else
  [[ "$(id -u)" == 0 ]] || { echo 'diagnostic must run as root' >&2; exit 1; }
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
deploy_env="$deploy_dir/.env"
core_env="$secret_dir/core.env"
bench_env="$secret_dir/bench.env"

read_env_value() {
  awk -F= -v key="$2" '$1 == key { value=substr($0,index($0,"=")+1); count += 1 } END { if (count == 1) print value; else exit 1 }' "$1"
}

if [[ "$apply" == true ]]; then
  exec 9>"$lock_path"
  flock -x 9
fi

for path in "$deploy_env" "$core_env" "$bench_env"; do
  [[ -f "$path" && ! -L "$path" ]] || exit 1
done
[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || exit 1
[[ "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || exit 1
echo 'PAID_DIAG_STAGE=host-inputs-ok'

if [[ "$apply" != true ]]; then
  echo 'PAID_DIAG_STAGE=diagnostic-complete'
  exit 0
fi

compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")

"${compose[@]}" exec -T paperbanana-api node -e '
  const fs=require("node:fs");
  const p=JSON.parse(fs.readFileSync("/app/build-provenance.json","utf8"));
  if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)
' "$expected_sha" >/dev/null
echo 'PAID_DIAG_STAGE=core-provenance-ok'

"${compose[@]}" exec -T benchmark-worker node -e '
  if(process.env.PAPERBANANA_CODE_SHA!==process.argv[1]||process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")process.exit(1)
' "$expected_sha" >/dev/null
echo 'PAID_DIAG_STAGE=resident-worker-disabled'

"${compose[@]}" run --rm --no-deps benchmark-worker node -e '
  const fs=require("node:fs");
  const p=JSON.parse(fs.readFileSync("/app/build-provenance.json","utf8"));
  if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)
' "$expected_sha" >/dev/null
echo 'PAID_DIAG_STAGE=oneoff-worker-provenance-ok'

"${compose[@]}" run --rm --no-deps benchmark-worker node -e '
  const fs=require("node:fs");
  const required=[
    "PAPERBANANA_BENCH_BAILIAN_API_KEY","PAPERBANANA_BENCH_OPENROUTER_API_KEY",
    "PAPERBANANA_BENCH_OSS_REGION","PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID",
    "PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET","PAPERBANANA_BENCH_OSS_BUCKET",
    "PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT"
  ];
  if(required.some((name)=>!String(process.env[name]||"").trim()))process.exit(1);
  if(process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")process.exit(1);
  if(!fs.existsSync("/app/dist/operator.mjs")||!fs.existsSync("/app/dist/calibration-snapshot.mjs"))process.exit(1)
' >/dev/null
echo 'PAID_DIAG_STAGE=dedicated-config-present'

"${compose[@]}" run --rm --no-deps benchmark-worker node dist/calibration-snapshot.mjs >/dev/null
echo 'PAID_DIAG_STAGE=local-calibration-render-ok'
echo 'PAID_DIAG_STAGE=diagnostic-complete'
