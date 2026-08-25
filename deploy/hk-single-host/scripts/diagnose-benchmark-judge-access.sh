#!/usr/bin/env bash
set -Eeuo pipefail

expected_sha=''
confirm=''
apply=false
usage() { echo 'invalid Judge access diagnostic arguments' >&2; exit 64; }
while (($#)); do
  case "$1" in
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    --apply) apply=true; shift ;;
    *) usage ;;
  esac
done
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ ]] || usage
[[ "$confirm" == diagnose-judge-provider-access-disabled-worker ]] || usage
[[ "$apply" == true ]] || { echo 'dry-run: would perform authenticated read-only Judge access checks' >&2; exit 0; }
[[ "$(id -u)" == 0 ]] || exit 1

deploy_dir='/opt/paperbanana/repo/deploy/hk-single-host'
secret_dir='/opt/paperbanana/secrets'
deploy_env="$deploy_dir/.env"
core_env="$secret_dir/core.env"
bench_env="$secret_dir/bench.env"
lock_path='/run/lock/paperbanana-hk-production.lock'
read_env_value() { awk -F= -v key="$2" '$1 == key { value=substr($0,index($0,"=")+1); count++ } END { if(count==1) print value; else exit 1 }' "$1"; }

exec 9>"$lock_path"
flock -x 9
for path in "$deploy_env" "$core_env" "$bench_env"; do [[ -f "$path" && ! -L "$path" ]] || exit 1; done
[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || exit 1
[[ "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || exit 1

compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
"${compose[@]}" exec -T benchmark-worker node -e 'if(process.env.PAPERBANANA_CODE_SHA!==process.argv[1]||process.env.PAPERBANANA_BENCH_ENABLED!=="false")process.exit(1)' "$expected_sha" >/dev/null
"${compose[@]}" run --rm --no-deps benchmark-operator node dist/judge-provider-diagnostic.mjs
