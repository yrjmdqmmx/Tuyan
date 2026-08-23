#!/usr/bin/env bash
set -Eeuo pipefail

firewall_script="${1:?firewall script path required}"
fixture_root="$(mktemp -d)"
jumps_file="$fixture_root/jumps"
rules_dir="$fixture_root/rules"
operation_log="$fixture_root/operations"
mkdir -p "$rules_dir"
cleanup() { rm -rf -- "$fixture_root"; }
trap cleanup EXIT

# Sourcing exposes the production functions without running main.
source "$firewall_script"

require_root() { :; }
require_commands() { :; }
acquire_update_lock() { :; }
prepare_bridge_filtering() { :; }
persist_rules() { :; }

dns_scenario="valid"
fail_action=""
append_calls=0

getent() {
  [[ "${1:-}" == "ahostsv4" && "${2:-}" == "$directmail_host" ]] || return 2
  case "$dns_scenario" in
    valid)
      printf '47.246.1.1 STREAM %s\n' "$directmail_host"
      ;;
    empty)
      ;;
    private)
      printf '10.0.0.1 STREAM %s\n' "$directmail_host"
      ;;
    partial-error)
      printf '47.246.1.1 STREAM %s\n' "$directmail_host"
      return 42
      ;;
    oversized)
      local suffix
      for suffix in $(seq 1 33); do
        printf '8.8.4.%s STREAM %s\n' "$suffix" "$directmail_host"
      done
      ;;
    *)
      return 2
      ;;
  esac
}

remove_first_line_matching() {
  local value="$1" temporary
  temporary="$(mktemp "$fixture_root/jumps.XXXXXX")"
  awk -v value="$value" 'BEGIN { removed=0 } $0 == value && !removed { removed=1; next } { print }' "$jumps_file" > "$temporary"
  mv "$temporary" "$jumps_file"
}

iptables() {
  local action="${1:?iptables action required}"
  shift
  case "$action" in
    -S)
      local target
      while IFS= read -r target; do
        [[ -n "$target" ]] && printf -- '-A DOCKER-USER -j %s\n' "$target"
      done < "$jumps_file"
      ;;
    -C)
      grep -Fqx -- "${3:?jump target required}" "$jumps_file"
      ;;
    -D)
      local delete_target="${3:?jump target required}"
      printf 'delete %s\n' "$delete_target" >> "$operation_log"
      [[ "$fail_action" != "delete" ]] || return 71
      remove_first_line_matching "$delete_target"
      ;;
    -I)
      local insert_target="${4:?jump target required}" temporary
      printf 'insert %s\n' "$insert_target" >> "$operation_log"
      [[ "$fail_action" != "insert" ]] || return 72
      temporary="$(mktemp "$fixture_root/jumps.XXXXXX")"
      {
        printf '%s\n' "$insert_target"
        cat "$jumps_file"
      } > "$temporary"
      mv "$temporary" "$jumps_file"
      ;;
    -N)
      local new_chain="${1:?chain required}"
      [[ "$fail_action" != "create" ]] || return 76
      [[ ! -e "$rules_dir/$new_chain" ]] || return 1
      : > "$rules_dir/$new_chain"
      ;;
    -F)
      local flush_chain="${1:?chain required}"
      printf 'flush %s\n' "$flush_chain" >> "$operation_log"
      [[ "$fail_action" != "flush" ]] || return 73
      [[ -e "$rules_dir/$flush_chain" ]] || return 77
      : > "$rules_dir/$flush_chain"
      ;;
    -A)
      local append_chain="${1:?chain required}"
      shift
      append_calls=$((append_calls + 1))
      printf 'append %s %s\n' "$append_chain" "$append_calls" >> "$operation_log"
      [[ "$fail_action" != "append-$append_calls" ]] || return 74
      printf '%s\n' "$*" >> "$rules_dir/$append_chain"
      ;;
    *)
      echo "unexpected fake iptables action: $action $*" >&2
      return 75
      ;;
  esac
}

reset_state() {
  rm -rf -- "$rules_dir"
  mkdir -p "$rules_dir"
  printf '%s\n' "$legacy_chain" > "$jumps_file"
  printf '%s\n' {1..7} > "$rules_dir/$legacy_chain"
  : > "$operation_log"
  dns_scenario="valid"
  fail_action=""
  append_calls=0
}

active_jump() {
  sed -n '1p' "$jumps_file"
}

assert_active_complete() {
  local active count
  active="$(active_jump)"
  [[ -n "$active" && -f "$rules_dir/$active" ]] || {
    echo "no active firewall chain remains" >&2
    return 1
  }
  count="$(wc -l < "$rules_dir/$active" | tr -d ' ')"
  (( count >= 7 )) || {
    echo "active firewall chain is incomplete: $active ($count rules)" >&2
    return 1
  }
}

run_main() {
  (
    set -Eeuo pipefail
    main --refresh >/dev/null
  )
}

expect_failure() {
  local status
  set +e
  run_main >/dev/null 2>&1
  status=$?
  set -e
  (( status != 0 )) || {
    echo "scenario unexpectedly succeeded: dns=$dns_scenario failure=$fail_action" >&2
    return 1
  }
}

for scenario in empty private oversized partial-error; do
  reset_state
  dns_scenario="$scenario"
  expect_failure
  assert_active_complete
  [[ "$(active_jump)" == "$legacy_chain" && ! -s "$operation_log" ]] || {
    echo "invalid DNS mutated the installed firewall: $dns_scenario" >&2
    exit 1
  }
done

for scenario in create flush append-1 append-2 append-3 append-4 append-5 append-6 append-7 insert delete; do
  reset_state
  fail_action="$scenario"
  expect_failure
  assert_active_complete
done

# Repeated successful updates must converge to one complete jump, remove the
# legacy rule, and alternate only between the fully built A/B chains.
reset_state
run_main
[[ "$(cat "$jumps_file")" == "$chain_a" ]] || { echo "first swap did not converge to chain A" >&2; exit 1; }
assert_active_complete
run_main
[[ "$(cat "$jumps_file")" == "$chain_b" ]] || { echo "second swap did not converge to chain B" >&2; exit 1; }
assert_active_complete
printf '%s\n' "$legacy_chain" >> "$jumps_file"
run_main
[[ "$(cat "$jumps_file")" == "$chain_a" ]] || { echo "stale jump cleanup was not idempotent" >&2; exit 1; }
assert_active_complete

run_lock_worker() {
  local label="$1" events_file="$2" shared_lock="$3"
  bash -s -- "$firewall_script" "$label" "$events_file" "$shared_lock" <<'WORKER'
set -Eeuo pipefail
source "$1"
label="$2"
events_file="$3"
lock_file="$4"
require_root() { :; }
require_commands() { :; }
resolve_directmail_ips() { directmail_ips=(47.246.1.1); }
prepare_bridge_filtering() {
  printf 'start:%s\n' "$label" >> "$events_file"
  sleep 0.2
  printf 'end:%s\n' "$label" >> "$events_file"
}
swap_firewall_rules() { :; }
persist_rules() { :; }
main --refresh >/dev/null
WORKER
}

events_file="$fixture_root/lock-events"
shared_lock="$fixture_root/firewall.lock"
if command -v flock >/dev/null; then
  : > "$events_file"
  run_lock_worker first "$events_file" "$shared_lock" &
  first_pid=$!
  run_lock_worker second "$events_file" "$shared_lock" &
  second_pid=$!
  wait "$first_pid" "$second_pid"
  events=()
  while IFS= read -r event; do
    events+=("$event")
  done < "$events_file"
  if (( ${#events[@]} != 4 )); then
    echo "concurrency test produced an unexpected event count" >&2
    exit 1
  fi
  first_label="${events[0]#start:}"
  second_label="${events[2]#start:}"
  [[ "${events[0]}" == "start:$first_label" && "${events[1]}" == "end:$first_label" ]] || {
    echo "firewall refresh calls overlapped before the first lock holder completed" >&2
    exit 1
  }
  [[ "${events[2]}" == "start:$second_label" && "${events[3]}" == "end:$second_label" && "$first_label" != "$second_label" ]] || {
    echo "firewall refresh calls did not serialize through the shared lock" >&2
    exit 1
  }
else
  echo "flock unavailable; concurrency behavior will execute on the Linux CI runner."
fi

echo "Firewall DNS, mutation, cleanup, and concurrency behavior passed."
