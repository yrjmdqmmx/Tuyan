#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

mode='' expected_sha='' v1_release_hash='' active_v2_release_hash='' archive_manifest_hash='' inventory_hash='' confirm='' output=''
usage() {
  echo 'usage: retire-v1-benchmark.sh --mode inspect|apply --expected-sha 40_HEX --v1-release-hash 64_HEX --active-v2-release-hash 64_HEX --archive-manifest-hash 64_HEX [--inventory-hash 64_HEX] --confirm PHRASE --output /tmp/paperbanana-v1-retirement-RUN.json' >&2
  exit 64
}
while (($#)); do
  case "$1" in
    --mode) mode="${2:-}"; shift 2 ;;
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --v1-release-hash) v1_release_hash="${2:-}"; shift 2 ;;
    --active-v2-release-hash) active_v2_release_hash="${2:-}"; shift 2 ;;
    --archive-manifest-hash) archive_manifest_hash="${2:-}"; shift 2 ;;
    --inventory-hash) inventory_hash="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    --output) output="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done
[[ "$mode" =~ ^(inspect|apply)$ && "$expected_sha" =~ ^[a-f0-9]{40}$ && "$v1_release_hash" =~ ^[a-f0-9]{64}$
  && "$active_v2_release_hash" =~ ^[a-f0-9]{64}$ && "$archive_manifest_hash" =~ ^[a-f0-9]{64}$
  && "$output" =~ ^/tmp/paperbanana-v1-retirement-[0-9]+\.json$ ]] || usage
case "$mode" in
  inspect) [[ "$confirm" == inspect-v1-retirement-disabled-worker && -z "$inventory_hash" ]] || usage ;;
  apply) [[ "$confirm" == delete-v1-release-2688db534f05256b6ce2-disabled-worker && "$inventory_hash" =~ ^[a-f0-9]{64}$ ]] || usage ;;
esac

test_root=''
if [[ -n "${PAPERBANANA_HK_TEST_ROOT:-}" ]]; then
  test_root="$(realpath "$PAPERBANANA_HK_TEST_ROOT")"
  case "$test_root/" in /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;; *) exit 1 ;; esac
  [[ -f "$test_root/.paperbanana-hk-test-root" && "$(<"$test_root/.paperbanana-hk-test-root")" == paperbanana-hk-test-root-v1 ]] || exit 1
  [[ "$mode" == inspect ]] || { echo 'test root never permits apply' >&2; exit 1; }
else
  [[ "$(id -u)" == 0 ]] || { echo 'V1 retirement must run as root' >&2; exit 1; }
  [[ "$v1_release_hash" == 2688db534f05256b6ce25bbd29dc7d445052d347e576898962022e172900cdb2 ]] || exit 1
fi

host_path() { printf '%s%s' "$test_root" "$1"; }
deploy_dir="$(host_path /opt/paperbanana/repo/deploy/hk-single-host)"
secret_dir="$(host_path /opt/paperbanana/secrets)"
deploy_env="$deploy_dir/.env"; core_env="$secret_dir/core.env"; bench_env="$secret_dir/bench.env"
lock_path="$(host_path /run/lock/paperbanana-hk-production.lock)"
mkdir -p -- "$(dirname -- "$lock_path")"
exec 9>"$lock_path"
portable_lock_dir=''
if command -v flock >/dev/null 2>&1; then flock -x 9
elif [[ -n "$test_root" ]]; then portable_lock_dir="${lock_path}.d"; mkdir -- "$portable_lock_dir"
else echo 'flock is required' >&2; exit 1; fi
cleanup_lock() { [[ -z "$portable_lock_dir" ]] || rmdir -- "$portable_lock_dir" 2>/dev/null || true; }
trap cleanup_lock EXIT
for path in "$deploy_env" "$core_env" "$bench_env"; do [[ -f "$path" && ! -L "$path" ]] || exit 1; done
read_env_value() { awk -F= -v key="$2" '$1==key {value=substr($0,index($0,"=")+1);count++} END {if(count==1)print value;else exit 1}' "$1"; }
[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled ]]
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false ]]
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]]
[[ "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]]
[[ "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]]
if [[ -n "$test_root" ]]; then
  printf '{"schemaVersion":1,"mode":"inspect","releaseHash":"%s","activeV2ReleaseHash":"%s","dryRun":true,"generatedOrJudgeCalls":0}\n' "$v1_release_hash" "$active_v2_release_hash"
  exit 0
fi

[[ ! -e "$output" && ! -L "$output" ]]
retirement_mongodb_uri="$(read_env_value "$core_env" PAPERBANANA_BENCH_MONGODB_URI)"
[[ "$retirement_mongodb_uri" == mongodb://paperbanana_benchmark_api:*@mongodb:27017/paperbanana_benchmark\?* ]] || exit 1
export PAPERBANANA_BENCH_MONGODB_URI="$retirement_mongodb_uri"
compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
"${compose[@]}" ps --status running benchmark-worker | grep -q benchmark-worker
worker_guard='const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1]||process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")process.exit(1)'
"${compose[@]}" exec -T benchmark-worker node -e "$worker_guard" "$expected_sha" >/dev/null

result_path="$(mktemp /tmp/paperbanana-v1-retirement-result.XXXXXXXXXXXX)"
db_result_path="$(mktemp /tmp/paperbanana-v1-retirement-db.XXXXXXXXXXXX)"
combined_path="$(mktemp /tmp/paperbanana-v1-retirement-combined.XXXXXXXXXXXX)"
cleanup() { unset PAPERBANANA_BENCH_MONGODB_URI retirement_mongodb_uri; rm -f -- "$result_path" "$db_result_path" "$combined_path"; cleanup_lock; }
trap cleanup EXIT
entry_mode=inspect
[[ "$mode" == apply ]] && entry_mode=delete-objects
timeout --signal=TERM --kill-after=10s 3600s "${compose[@]}" exec -T \
  -e PAPERBANANA_BENCH_MONGODB_URI \
  -e "PAPERBANANA_V1_RETIREMENT_MODE=$entry_mode" \
  -e "PAPERBANANA_V1_RETIREMENT_RELEASE_HASH=$v1_release_hash" \
  -e "PAPERBANANA_V1_RETIREMENT_ACTIVE_V2_RELEASE_HASH=$active_v2_release_hash" \
  -e "PAPERBANANA_V1_RETIREMENT_INVENTORY_HASH=$inventory_hash" \
  -e "PAPERBANANA_V1_RETIREMENT_CONFIRM=$confirm" \
  benchmark-worker node dist/v1-retirement.mjs >"$result_path"

"${compose[@]}" exec -T paperbanana-api node -e '
const fs=require("node:fs");const value=JSON.parse(fs.readFileSync(0,"utf8"));
if(value?.schemaVersion!==1||value.generatedOrJudgeCalls!==0||!value.inventory||value.releaseHash!==process.argv[1]
||value.activeV2ReleaseHash!==process.argv[2]||!Array.isArray(value.inventory.objects)||!value.inventory.objects.length
||!Array.isArray(value.inventory.exclusiveObjects)||!Array.isArray(value.inventory.sharedObjects)
||!/^[a-f0-9]{64}$/.test(value.inventory.inventoryHash||""))process.exit(1)
' "$v1_release_hash" "$active_v2_release_hash" <"$result_path"

if [[ "$mode" == apply ]]; then
  "${compose[@]}" cp "$deploy_dir/scripts/retire-v1-benchmark.mongo.js" mongo:/tmp/retire-v1-benchmark.mongo.js
  "${compose[@]}" exec -T -e PAPERBANANA_V1_REPORT_PATH=/tmp/paperbanana-v1-retirement-report.json \
    -e "PAPERBANANA_V1_ARCHIVE_MANIFEST_HASH=$archive_manifest_hash" mongo sh -c '
      umask 077
      cat > /tmp/paperbanana-v1-retirement-report.json
      mongosh --quiet --host 127.0.0.1 --username "$MONGO_INITDB_ROOT_USERNAME" --password "$(cat /run/secrets/mongo_root_password)" --authenticationDatabase admin paperbanana_benchmark /tmp/retire-v1-benchmark.mongo.js
    ' <"$result_path" >"$db_result_path"
  "${compose[@]}" exec -T --user root mongo rm -f /tmp/paperbanana-v1-retirement-report.json /tmp/retire-v1-benchmark.mongo.js
  { cat "$result_path"; cat "$db_result_path"; } | "${compose[@]}" exec -T paperbanana-api node -e '
    const fs=require("node:fs");const lines=fs.readFileSync(0,"utf8").trim().split(/\n+/u);
    if(lines.length!==2)process.exit(1);const worker=JSON.parse(lines[0]);const db=JSON.parse(lines[1]);
    if(db.status!=="retired"||db.inventoryHash!==worker.inventory.inventoryHash||db.generatedOrJudgeCalls!==0)process.exit(1)
    process.stdout.write(`${JSON.stringify({schemaVersion:1,mode:"apply",worker,db})}\n`)
  ' >"$combined_path"
  install -m 0600 -o "${SUDO_USER:?missing sudo user}" "$combined_path" "$output"
else
  install -m 0600 -o "${SUDO_USER:?missing sudo user}" "$result_path" "$output"
fi
"${compose[@]}" exec -T benchmark-worker node -e "$worker_guard" "$expected_sha" >/dev/null
"${compose[@]}" exec -T paperbanana-api node -e '
const fs=require("node:fs");const value=JSON.parse(fs.readFileSync(0,"utf8"));const inventory=value.inventory||value.worker?.inventory;
const db=value.db||null;process.stdout.write(`${JSON.stringify({schemaVersion:1,mode:process.argv[1],releaseHash:inventory.releaseHash,
inventoryHash:inventory.inventoryHash,exclusiveObjectCount:inventory.exclusiveObjects.length,sharedObjectCount:inventory.sharedObjects.length,
exclusiveBytes:inventory.exclusiveBytes,sharedBytes:inventory.sharedBytes,dbCounts:inventory.dbCounts,status:db?.status||"inspected",generatedOrJudgeCalls:0})}\n`)
' -- "$mode" <"$output"
