#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  echo "usage: $0 --host hk --wg-interface <Hong-Kong-interface> [--dry-run|--apply]" >&2
  exit 2
}

mode="--dry-run"
host=""
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
[[ "$host" == "hk" && -n "$wg_interface" ]] || usage
[[ "$wg_interface" =~ ^[A-Za-z0-9_.-]{1,15}$ ]] || usage

test_root="${PAPERBANANA_SG_EGRESS_TEST_ROOT:-}"
validate_test_root() {
  [[ -n "$test_root" ]] || return 0
  if (( EUID == 0 )); then echo "PAPERBANANA_SG_EGRESS_TEST_ROOT is forbidden while running as root" >&2; exit 2; fi
  if [[ "$test_root" != /* || "$test_root" == "/" || "$test_root" == *"/../"* || "$test_root" == */.. || "$test_root" == *"/./"* || "$test_root" == */. ]]; then echo "PAPERBANANA_SG_EGRESS_TEST_ROOT must be a canonical absolute test root" >&2; exit 2; fi
  local canonical marker metadata file_type owner mode_bits
  canonical="$(cd -P -- "$test_root" 2>/dev/null && pwd -P)" || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT is not a usable test root" >&2; exit 2; }
  [[ "$canonical" == "$test_root" && ! -L "$test_root" ]] || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT must not contain a symlink or non-canonical path" >&2; exit 2; }
  marker="$test_root/.paperbanana-sg-egress-test-root"
  [[ -f "$marker" && ! -L "$marker" && "$(<"$marker")" == "paperbanana-sg-egress-test-root-v1" ]] || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT lacks the required fixture marker" >&2; exit 2; }
  for path in "$test_root" "$marker"; do metadata="$(stat -c '%F:%u:%a' -- "$path")" || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT metadata is unsafe" >&2; exit 2; }; IFS=: read -r file_type owner mode_bits <<<"$metadata"; [[ "$owner" == "$EUID" && "$mode_bits" =~ ^[0-7]{3,4}$ && $((8#$mode_bits & 0022)) -eq 0 ]] || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT fixture owner or permissions are unsafe" >&2; exit 2; }; done
}
validate_test_root
host_path() { printf '%s%s' "$test_root" "$1"; }
if [[ "$mode" == "--apply" && "$EUID" -ne 0 && -z "$test_root" ]]; then
  echo "install-health-monitor.sh --apply must run as root" >&2
  exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ -n "$test_root" ]]; then
  unit_dir="${PAPERBANANA_SG_EGRESS_TEST_UNIT_DIR:-$(host_path /unit-source)}"
else
  unit_dir="$(cd -- "$script_dir/.." && pwd)/systemd"
fi
runtime_dir="$(host_path /opt/paperbanana-sg-egress)"
runtime_scripts_dir="$runtime_dir/scripts"
if [[ "$mode" == "--dry-run" ]]; then
  echo "Would install the Hong Kong-only egress health timer for $wg_interface."
  exit 0
fi

if ! ip -4 addr show dev "$wg_interface" | awk '$1 == "inet" && $2 == "10.77.0.1/30" { found=1 } END { exit !found }'; then
  echo "--host hk requires $wg_interface to own 10.77.0.1/30; refusing to install this monitor on Singapore" >&2
  exit 1
fi
if [[ -z "$test_root" && "$script_dir" != "$runtime_scripts_dir" ]]; then
  echo "install-health-monitor.sh must run from $runtime_scripts_dir so the root unit executes the reviewed runtime assets" >&2
  exit 1
fi
require_secure_runtime_path() {
  local path="$1"
  local expected_type="$2"
  local metadata file_type owner mode_bits
  if [[ -L "$path" ]] || ! metadata="$(stat -c '%F:%u:%a' "$path")"; then
    echo "required secure runtime path is missing: $path" >&2
    exit 1
  fi
  IFS=: read -r file_type owner mode_bits <<<"$metadata"
  if [[ "$file_type" != "$expected_type" || "$owner" != "0" || ! "$mode_bits" =~ ^[0-7][0145][0145]$ ]]; then
    echo "secure runtime path $path must be a root-owned $expected_type and not group- or world-writable" >&2
    exit 1
  fi
}
require_secure_runtime_path "$(host_path /opt)" directory
require_secure_runtime_path "$runtime_dir" directory
require_secure_runtime_path "$runtime_scripts_dir" directory
for runtime_script in "$runtime_scripts_dir/monitor-health.sh" "$runtime_scripts_dir/smoke.sh"; do
  require_secure_runtime_path "$runtime_script" 'regular file'
  if [[ ! -x "$runtime_script" ]]; then
    echo "secure runtime script must be executable: $runtime_script" >&2
    exit 1
  fi
done
require_secure_runtime_path "$unit_dir" directory
for unit_template in "$unit_dir/paperbanana-hk-egress-health@.service" "$unit_dir/paperbanana-hk-egress-health@.timer"; do
  require_secure_runtime_path "$unit_template" 'regular file'
done
systemd_dir="$(host_path /etc/systemd/system)"
service_target="$systemd_dir/paperbanana-hk-egress-health@.service"
timer_target="$systemd_dir/paperbanana-hk-egress-health@.timer"
timer_unit="paperbanana-hk-egress-health@${wg_interface}.timer"
timer_was_enabled=false
timer_was_active=false
if timer_enabled_state="$(systemctl is-enabled "$timer_unit" 2>/dev/null)"; then
  :
else
  timer_enabled_status=$?
  if [[ -z "$timer_enabled_state" ]]; then
    echo "cannot determine whether $timer_unit is enabled (systemctl query exited $timer_enabled_status)" >&2
    exit 2
  fi
fi
case "$timer_enabled_state" in
  enabled|enabled-runtime) timer_was_enabled=true ;;
  disabled|static|indirect|masked|not-found) ;;
  *) echo "unexpected enablement state for $timer_unit: $timer_enabled_state" >&2; exit 2 ;;
esac
if systemctl is-active --quiet "$timer_unit"; then
  timer_was_active=true
else
  timer_active_status=$?
  case "$timer_active_status" in 3|4) ;; *) echo "cannot determine whether $timer_unit is active" >&2; exit 2 ;; esac
fi
install -d -m 0755 "$systemd_dir"
service_previous=""
timer_previous=""
if [[ -e "$service_target" ]]; then service_previous="$(mktemp "$systemd_dir/.paperbanana-hk-service.previous.XXXXXX")"; cp -p -- "$service_target" "$service_previous"; fi
if [[ -e "$timer_target" ]]; then timer_previous="$(mktemp "$systemd_dir/.paperbanana-hk-timer.previous.XXXXXX")"; cp -p -- "$timer_target" "$timer_previous"; fi
rollback_monitor_install() {
  local reason="$1"
  if systemctl disable --now "$timer_unit" >/dev/null 2>&1; then :; fi
  if [[ -n "$service_previous" ]]; then mv -f -- "$service_previous" "$service_target"; else rm -f -- "$service_target"; fi
  if [[ -n "$timer_previous" ]]; then mv -f -- "$timer_previous" "$timer_target"; else rm -f -- "$timer_target"; fi
  systemctl daemon-reload || { echo "$reason; failed to restore systemd unit state" >&2; return 1; }
  if [[ "$timer_was_enabled" == true ]]; then
    if [[ "$timer_was_active" == true ]]; then
      systemctl enable --now "$timer_unit" || { echo "$reason; failed to restore active Hong Kong health timer" >&2; return 1; }
    else
      systemctl enable "$timer_unit" || { echo "$reason; failed to restore enabled Hong Kong health timer" >&2; return 1; }
    fi
  elif [[ "$timer_was_active" == true ]]; then
    systemctl start "$timer_unit" || { echo "$reason; failed to restore active Hong Kong health timer" >&2; return 1; }
  fi
  echo "$reason; rolled back copied Hong Kong health-monitor units" >&2
  return 1
}
install -m 0644 "$unit_dir/paperbanana-hk-egress-health@.service" "$service_target"
install -m 0644 "$unit_dir/paperbanana-hk-egress-health@.timer" "$timer_target"
systemctl daemon-reload || rollback_monitor_install "systemd daemon-reload failed"
if command -v systemd-analyze >/dev/null 2>&1; then
  systemd-analyze verify "$service_target" "$timer_target" || rollback_monitor_install "systemd unit verification failed"
fi
systemctl start "paperbanana-hk-egress-health@${wg_interface}.service" || rollback_monitor_install "Hong Kong health service start failed"
service_result="$(systemctl show --property=Result --value "paperbanana-hk-egress-health@${wg_interface}.service")" || rollback_monitor_install "cannot determine Hong Kong health service result"
service_status="$(systemctl show --property=ExecMainStatus --value "paperbanana-hk-egress-health@${wg_interface}.service")" || rollback_monitor_install "cannot determine Hong Kong health service exit status"
if [[ "$service_result" != "success" || "$service_status" != "0" ]]; then
  rollback_monitor_install "Hong Kong health service did not complete successfully"
fi
systemctl enable --now "$timer_unit" || rollback_monitor_install "Hong Kong health timer enable/start failed"
systemctl is-active --quiet "$timer_unit" || rollback_monitor_install "Hong Kong health timer did not become active"
rm -f -- "$service_previous" "$timer_previous"
