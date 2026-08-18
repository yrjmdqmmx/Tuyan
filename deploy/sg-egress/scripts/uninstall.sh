#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  echo "usage: $0 [--host sg|hk] [--wg-interface <Hong-Kong-interface>] [--dry-run|--apply]" >&2
  exit 2
}

mode="--dry-run"
host="sg"
wg_interface=""
while (( $# > 0 )); do
  case "$1" in
    --apply|--dry-run)
      mode="$1"
      shift
      ;;
    --host)
      [[ $# -ge 2 ]] || usage
      host="$2"
      shift 2
      ;;
    --wg-interface)
      [[ $# -ge 2 ]] || usage
      wg_interface="$2"
      shift 2
      ;;
    *) usage ;;
  esac
done
[[ "$host" == "sg" || "$host" == "hk" ]] || usage
if [[ "$host" == "hk" ]]; then
  [[ "$wg_interface" =~ ^[A-Za-z0-9_.-]{1,15}$ ]] || usage
elif [[ -n "$wg_interface" ]]; then
  usage
fi

test_root="${PAPERBANANA_SG_EGRESS_TEST_ROOT:-}"
if [[ -n "$test_root" && ( "$test_root" != /* || "$test_root" == "/" ) ]]; then
  echo "PAPERBANANA_SG_EGRESS_TEST_ROOT must be an absolute non-root test directory" >&2
  exit 2
fi
host_path() { printf '%s%s' "$test_root" "$1"; }
if [[ "$mode" == "--apply" && "$EUID" -ne 0 && -z "$test_root" ]]; then
  echo "uninstall.sh --apply must run as root" >&2
  exit 1
fi

managed_marker="# Managed by PaperBanana Singapore egress"

unit_load_state() {
  local state
  if ! state="$(systemctl show --property=LoadState --value "$1" 2>/dev/null)"; then
    echo "cannot determine LoadState for project unit $1" >&2
    return 2
  fi
  case "$state" in
    loaded|not-found)
      printf '%s\n' "$state"
      ;;
    *)
      echo "unexpected LoadState for project unit $1: ${state:-<empty>}" >&2
      return 2
      ;;
  esac
}
unit_loaded() {
  local state
  if ! state="$(unit_load_state "$1")"; then
    return 2
  fi
  [[ "$state" == "loaded" ]]
}
unit_active() {
  local status
  if systemctl is-active --quiet "$1"; then
    return 0
  else
    status=$?
  fi
  case "$status" in
    3|4) return 1 ;;
    *)
      echo "cannot determine active state for project unit $1" >&2
      return 2
      ;;
  esac
}
stop_project_unit() {
  local unit="$1"
  local status
  if unit_loaded "$unit"; then
    systemctl disable --now "$unit" || return $?
    return 0
  else
    status=$?
  fi
  if (( status != 1 )); then
    return "$status"
  fi
  if unit_active "$unit"; then
    systemctl disable --now "$unit" || return $?
    return 0
  else
    status=$?
  fi
  if (( status != 1 )); then
    return "$status"
  fi
  return 0
}
unit_needs_stop() {
  local unit="$1"
  local status
  if unit_loaded "$unit"; then
    return 0
  else
    status=$?
  fi
  if (( status != 1 )); then
    return "$status"
  fi
  if unit_active "$unit"; then
    return 0
  else
    status=$?
  fi
  if (( status != 1 )); then
    return "$status"
  fi
  return 1
}
assert_project_unit_inactive() {
  local unit="$1"
  local status
  if unit_active "$unit"; then
    echo "project unit $unit remains active after uninstall" >&2
    return 1
  else
    status=$?
  fi
  if (( status != 1 )); then
    return "$status"
  fi
  return 0
}
assert_project_unit_gone() {
  local unit="$1"
  local status
  assert_project_unit_inactive "$unit" || return $?
  if unit_loaded "$unit"; then
    echo "project unit $unit remains loaded after uninstall" >&2
    return 1
  else
    status=$?
  fi
  if (( status != 1 )); then
    return "$status"
  fi
  return 0
}
assert_unit_inactive() {
  local unit="$1"
  assert_project_unit_inactive "$unit"
}
remove_if_marked() {
  local path="$1"
  if [[ -e "$path" ]] && grep -Fqx "$managed_marker" "$path"; then
    rm -f -- "$path" || return $?
  elif [[ -e "$path" ]]; then
    echo "leaving unmarked file outside this project's deletion boundary: $path" >&2
  fi
}

uninstall_hk() {
  local health_prefix="paperbanana-hk-egress-health@${wg_interface}"
  local health_service="${health_prefix}.service"
  local health_timer="${health_prefix}.timer"
  local service_template="$(host_path /etc/systemd/system/paperbanana-hk-egress-health@.service)"
  local timer_template="$(host_path /etc/systemd/system/paperbanana-hk-egress-health@.timer)"
  local runtime_monitor="$(host_path /opt/paperbanana-sg-egress/scripts/monitor-health.sh)"
  local runtime_smoke="$(host_path /opt/paperbanana-sg-egress/scripts/smoke.sh)"

  # Stop by loaded/active state even if template files or an ownership marker
  # have already been lost. Do not touch pbhk0, Hong Kong app services, or SG.
  stop_project_unit "$health_timer" || return $?
  stop_project_unit "$health_service" || return $?
  # Do not remove root-executed assets until both exact instances are known to
  # be stopped. A successful but ineffective systemctl invocation must fail
  # closed with all assets still present for repair.
  assert_project_unit_inactive "$health_timer" || return $?
  assert_project_unit_inactive "$health_service" || return $?

  # The marker prevents a stale copied path from deleting unrelated operator
  # files. All deletion targets are explicit, narrow project paths.
  remove_if_marked "$service_template" || return $?
  remove_if_marked "$timer_template" || return $?
  remove_if_marked "$runtime_monitor" || return $?
  remove_if_marked "$runtime_smoke" || return $?
  systemctl daemon-reload || return $?

  assert_project_unit_gone "$health_timer" || return $?
  assert_project_unit_gone "$health_service" || return $?
  echo "Hong Kong PaperBanana egress monitoring removed; pbhk0 and the primary stack were not changed."
}

interface_present() {
  local status
  if ip link show dev pbsg0 >/dev/null 2>&1; then
    return 0
  else
    status=$?
  fi
  case "$status" in
    1) return 1 ;;
    *)
      echo "cannot determine whether pbsg0 interface is present (ip query exited $status)" >&2
      return 2
      ;;
  esac
}
project_proxy_listener_present() {
  local listeners
  local status
  if listeners="$(ss -lntH 'sport = :3128')"; then
    :
  else
    status=$?
    echo "cannot determine whether the PaperBanana Squid listener is present (ss query exited $status)" >&2
    return 2
  fi
  if awk '$4 == "10.77.0.2:3128" { found=1 } END { exit !found }' <<<"$listeners"; then
    return 0
  else
    status=$?
  fi
  if (( status == 1 )); then
    return 1
  fi
  echo "cannot determine whether the PaperBanana Squid listener is present (listener parse exited $status)" >&2
  return 2
}
squid_process_present() {
  local status
  if pgrep -x squid >/dev/null 2>&1; then
    return 0
  else
    status=$?
  fi
  case "$status" in
    1) return 1 ;;
    *)
      echo "cannot determine whether the Squid process is present (pgrep query exited $status)" >&2
      return 2
      ;;
  esac
}

uninstall_sg() {
  local wg_config="$(host_path /etc/wireguard/pbsg0.conf)"
  local wg_private_key="$(host_path /etc/wireguard/paperbanana-sg-egress.private)"
  local squid_config="$(host_path /etc/squid/squid.conf)"
  local squid_backup="$(host_path /etc/squid/squid.conf.paperbanana-sg-egress.backup)"
  local health_service="$(host_path /etc/systemd/system/paperbanana-sg-egress-health.service)"
  local health_timer="$(host_path /etc/systemd/system/paperbanana-sg-egress-health.timer)"
  local managed_wg=false
  local managed_squid=false
  local wg_runtime=false
  local squid_runtime=false
  local interface_initial=false
  local proxy_listener_initial=false
  local squid_process_initial=false

  if [[ -e "$wg_config" ]] && grep -Fqx "$managed_marker" "$wg_config"; then
    managed_wg=true
  fi
  if [[ -e "$squid_config" ]] && grep -Fqx "$managed_marker" "$squid_config"; then
    managed_squid=true
  fi

  # Query all runtime state before stopping units. A query error must never be
  # treated as absence or allow a partial teardown to start.
  local state_status
  if interface_present; then
    interface_initial=true
  else
    state_status=$?
    if (( state_status != 1 )); then
      return "$state_status"
    fi
  fi
  if project_proxy_listener_present; then
    proxy_listener_initial=true
  else
    state_status=$?
    if (( state_status != 1 )); then
      return "$state_status"
    fi
  fi
  if squid_process_present; then
    squid_process_initial=true
  else
    state_status=$?
    if (( state_status != 1 )); then
      return "$state_status"
    fi
  fi

  # Stop project names and live kernel/socket/process state even if a marker
  # or a unit file has been lost. A failed stop aborts before configuration
  # deletion rather than masking a running exit path.
  stop_project_unit paperbanana-sg-egress-health.timer || return $?
  stop_project_unit paperbanana-sg-egress-health.service || return $?
  assert_project_unit_inactive paperbanana-sg-egress-health.timer || return $?
  assert_project_unit_inactive paperbanana-sg-egress-health.service || return $?

  if unit_needs_stop wg-quick@pbsg0; then
    wg_runtime=true
  else
    state_status=$?
    if (( state_status != 1 )); then
      return "$state_status"
    fi
  fi
  if [[ "$interface_initial" == true ]]; then
    wg_runtime=true
  fi
  if [[ "$wg_runtime" == true ]]; then
    systemctl disable --now wg-quick@pbsg0 || return $?
  fi
  if interface_present; then
    ip link delete dev pbsg0 || return $?
  else
    state_status=$?
    if (( state_status != 1 )); then
      return "$state_status"
    fi
  fi
  assert_unit_inactive wg-quick@pbsg0 || return $?
  if interface_present; then
    echo "pbsg0 interface remains after uninstall" >&2
    exit 1
  else
    state_status=$?
    if (( state_status != 1 )); then
      return "$state_status"
    fi
  fi

  if unit_needs_stop squid; then
    squid_runtime=true
  else
    state_status=$?
    if (( state_status != 1 )); then
      return "$state_status"
    fi
  fi
  if [[ "$managed_squid" == true || "$proxy_listener_initial" == true || "$squid_process_initial" == true ]]; then
    squid_runtime=true
  fi
  if [[ "$squid_runtime" == true ]]; then
    systemctl disable --now squid || return $?
  fi
  assert_unit_inactive squid || return $?
  if project_proxy_listener_present; then
    echo "the PaperBanana Squid listener remains on 10.77.0.2:3128 after uninstall" >&2
    exit 1
  else
    state_status=$?
    if (( state_status != 1 )); then
      return "$state_status"
    fi
  fi
  if [[ "$squid_runtime" == true ]]; then
    if unit_active squid; then
      echo "Squid remains active after project listener teardown" >&2
      exit 1
    else
      state_status=$?
      if (( state_status != 1 )); then
        return "$state_status"
      fi
    fi
    if squid_process_present; then
      echo "Squid remains active after project listener teardown" >&2
      exit 1
    else
      state_status=$?
      if (( state_status != 1 )); then
        return "$state_status"
      fi
    fi
  fi

  rm -f -- "$health_service" || return $?
  rm -f -- "$health_timer" || return $?
  if [[ "$managed_wg" == true ]]; then
    rm -f -- "$wg_config" || return $?
  fi
  if [[ "$managed_wg" == true || "$wg_runtime" == true ]]; then
    rm -f -- "$wg_private_key" || return $?
  fi
  if [[ "$managed_squid" == true ]]; then
    if [[ -e "$squid_backup" ]]; then
      mv -- "$squid_backup" "$squid_config" || return $?
    else
      rm -f -- "$squid_config" || return $?
    fi
  fi
  systemctl daemon-reload || return $?

  assert_project_unit_gone paperbanana-sg-egress-health.timer || return $?
  assert_project_unit_gone paperbanana-sg-egress-health.service || return $?

  echo "Singapore PaperBanana egress configuration removed. SSH hardening and user data were not changed."
}

if [[ "$mode" == "--dry-run" ]]; then
  if [[ "$host" == "hk" ]]; then
    echo "Would stop/disable paperbanana-hk-egress-health@${wg_interface} timer and service, then remove only marked Hong Kong monitor templates and runtime scripts."
    echo "Would not change pbhk0, the Hong Kong primary stack, or Singapore services."
  else
    echo "Would stop only Singapore PaperBanana egress units and remove the managed /etc/wireguard/pbsg0.conf plus its private key."
    echo "Would restore the narrowly saved Squid package configuration only when the current Squid configuration is PaperBanana-managed. SSH and user data are untouched."
  fi
  exit 0
fi

if [[ "$host" == "hk" ]]; then
  uninstall_hk
else
  uninstall_sg
fi
