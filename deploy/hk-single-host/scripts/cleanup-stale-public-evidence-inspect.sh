#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

expected_sha='' release_hash='' confirm=''
usage() {
  echo 'usage: cleanup-stale-public-evidence-inspect.sh --expected-sha 40_HEX --release-hash 64_HEX --confirm PHRASE' >&2
  exit 64
}
while (($#)); do
  case "$1" in
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --release-hash) release_hash="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done

[[ "$expected_sha" =~ ^[a-f0-9]{40}$ && "$release_hash" =~ ^[a-f0-9]{64}$ ]] || usage
[[ "$confirm" == cleanup-stale-public-evidence-inspect ]] || usage
[[ "$(id -u)" == 0 ]] || { echo 'stale inspect cleanup must run as root' >&2; exit 1; }

deploy_env=/opt/paperbanana/repo/deploy/hk-single-host/.env
core_env=/opt/paperbanana/secrets/core.env
bench_env=/opt/paperbanana/secrets/bench.env
for protected_path in "$deploy_env" "$core_env" "$bench_env"; do
  [[ -f "$protected_path" && ! -L "$protected_path" ]] || { echo 'protected runtime configuration is unavailable' >&2; exit 1; }
done
read_env_value() {
  awk -F= -v key="$2" '$1==key {value=substr($0,index($0,"=")+1);count++} END {if(count==1)print value;else exit 1}' "$1"
}
[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || exit 1
[[ "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || exit 1
[[ "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || exit 1

read_argv() {
  local pid="$1" arg
  PROCESS_ARGV=()
  [[ -r "/proc/$pid/cmdline" ]] || return 1
  while IFS= read -r -d '' arg; do PROCESS_ARGV+=("$arg"); done < "/proc/$pid/cmdline" || true
  ((${#PROCESS_ARGV[@]} > 0))
}
has_pair() {
  local flag="$1" value="$2" index
  for ((index=0; index + 1 < ${#PROCESS_ARGV[@]}; index++)); do
    [[ "${PROCESS_ARGV[index]}" == "$flag" && "${PROCESS_ARGV[index + 1]}" == "$value" ]] && return 0
  done
  return 1
}
has_backfill_script() {
  local arg
  for arg in "${PROCESS_ARGV[@]}"; do
    [[ "$arg" == deploy/hk-single-host/scripts/backfill-public-evidence.sh
      || "$arg" == /opt/paperbanana/repo/deploy/hk-single-host/scripts/backfill-public-evidence.sh ]] && return 0
  done
  return 1
}
matches_stale_inspect() {
  local pid="$1"
  read_argv "$pid" || return 1
  has_backfill_script \
    && has_pair --mode inspect \
    && has_pair --expected-sha "$expected_sha" \
    && has_pair --release-hash "$release_hash" \
    && has_pair --confirm inspect-public-evidence-disabled-worker
}

root_pids=()
for proc_path in /proc/[0-9]*; do
  pid="${proc_path##*/}"
  matches_stale_inspect "$pid" && root_pids+=("$pid")
done
((${#root_pids[@]} >= 1 && ${#root_pids[@]} <= 6)) || {
  echo 'exact stale inspect process set was not found' >&2
  exit 1
}

declare -A target_set=()
collect_descendants() {
  local parent="$1" child
  while IFS= read -r child; do
    child="${child//[[:space:]]/}"
    [[ "$child" =~ ^[0-9]+$ ]] || continue
    collect_descendants "$child"
  done < <(ps -eo pid=,ppid= | awk -v parent="$parent" '$2 == parent {print $1}')
  target_set["$parent"]=1
}
for pid in "${root_pids[@]}"; do collect_descendants "$pid"; done
((${#target_set[@]} >= ${#root_pids[@]} && ${#target_set[@]} <= 32)) || {
  echo 'stale inspect process tree exceeded the safety bound' >&2
  exit 1
}
mapfile -t target_pids < <(printf '%s\n' "${!target_set[@]}" | sort -nr)
kill -TERM -- "${target_pids[@]}" 2>/dev/null || true

for _ in $(seq 1 20); do
  alive=0
  for pid in "${target_pids[@]}"; do kill -0 "$pid" 2>/dev/null && alive=1; done
  ((alive == 0)) && break
  sleep 0.5
done
remaining=()
for pid in "${target_pids[@]}"; do kill -0 "$pid" 2>/dev/null && remaining+=("$pid"); done
((${#remaining[@]} == 0)) || { kill -KILL -- "${remaining[@]}" 2>/dev/null || true; sleep 1; }

for proc_path in /proc/[0-9]*; do
  pid="${proc_path##*/}"
  if matches_stale_inspect "$pid"; then
    echo 'exact stale inspect process survived cleanup' >&2
    exit 1
  fi
done
printf '{"schemaVersion":1,"operation":"cleanup-stale-public-evidence-inspect","matchedRootCount":%d,"terminatedProcessCount":%d,"generatedOrJudgeCalls":0}\n' \
  "${#root_pids[@]}" "${#target_pids[@]}"
