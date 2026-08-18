#!/usr/bin/env bash
set -Eeuo pipefail

mode="${1:---dry-run}"
if [[ "$mode" != "--apply" && "$mode" != "--dry-run" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
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

if [[ "$mode" == "--dry-run" ]]; then
  echo "Would stop only PaperBanana egress units and remove the managed /etc/wireguard/pbsg0.conf plus its private key."
  echo "Would restore the narrowly saved Squid package configuration only when the current Squid configuration is PaperBanana-managed. SSH and user data are untouched."
  exit 0
fi

managed_marker="# Managed by PaperBanana Singapore egress"
wg_config="$(host_path /etc/wireguard/pbsg0.conf)"
wg_private_key="$(host_path /etc/wireguard/paperbanana-sg-egress.private)"
squid_config="$(host_path /etc/squid/squid.conf)"
squid_backup="$(host_path /etc/squid/squid.conf.paperbanana-sg-egress.backup)"
health_service="$(host_path /etc/systemd/system/paperbanana-sg-egress-health.service)"
health_timer="$(host_path /etc/systemd/system/paperbanana-sg-egress-health.timer)"

unit_loaded() {
  local unit="$1"
  local state
  if ! state="$(systemctl show --property=LoadState --value "$unit" 2>/dev/null)"; then
    return 1
  fi
  [[ "$state" == "loaded" ]]
}
unit_active() {
  systemctl is-active --quiet "$1"
}
interface_present() {
  ip link show dev pbsg0 >/dev/null 2>&1
}
project_proxy_listener_present() {
  ss -lntH 'sport = :3128' | awk '$4 == "10.77.0.2:3128" { found=1 } END { exit !found }'
}
squid_process_present() {
  pgrep -x squid >/dev/null 2>&1
}
stop_project_unit() {
  local unit="$1"
  if unit_loaded "$unit" || unit_active "$unit"; then
    systemctl disable --now "$unit"
  fi
}
assert_project_unit_inactive() {
  local unit="$1"
  if unit_active "$unit"; then
    echo "project unit $unit remains active after uninstall" >&2
    exit 1
  fi
}

managed_wg=false
managed_squid=false
if [[ -e "$wg_config" ]] && grep -Fqx "$managed_marker" "$wg_config"; then
  managed_wg=true
fi
if [[ -e "$squid_config" ]] && grep -Fqx "$managed_marker" "$squid_config"; then
  managed_squid=true
fi

# Stop state by its project names and live kernel/socket/process evidence even if
# an operator has already lost a marker or unit file. Deletion remains marker-scoped.
stop_project_unit paperbanana-sg-egress-health.timer
stop_project_unit paperbanana-sg-egress-health.service

wg_runtime=false
if unit_loaded wg-quick@pbsg0 || unit_active wg-quick@pbsg0 || interface_present; then
  wg_runtime=true
  systemctl disable --now wg-quick@pbsg0
fi
if interface_present; then
  ip link delete dev pbsg0
fi

squid_runtime=false
if [[ "$managed_squid" == true ]] || unit_loaded squid || unit_active squid || project_proxy_listener_present || squid_process_present; then
  squid_runtime=true
  systemctl disable --now squid
fi

rm -f -- "$health_service"
rm -f -- "$health_timer"
if [[ "$managed_wg" == true ]]; then
  rm -f -- "$wg_config"
fi
if [[ "$managed_wg" == true || "$wg_runtime" == true ]]; then
  rm -f -- "$wg_private_key"
fi
if [[ "$managed_squid" == true ]]; then
  if [[ -e "$squid_backup" ]]; then
    mv -- "$squid_backup" "$squid_config"
  else
    rm -f -- "$squid_config"
  fi
fi
systemctl daemon-reload

assert_project_unit_inactive paperbanana-sg-egress-health.timer
assert_project_unit_inactive paperbanana-sg-egress-health.service
assert_project_unit_inactive wg-quick@pbsg0
if interface_present; then
  echo "pbsg0 interface remains after uninstall" >&2
  exit 1
fi
if project_proxy_listener_present; then
  echo "the PaperBanana Squid listener remains on 10.77.0.2:3128 after uninstall" >&2
  exit 1
fi
if [[ "$squid_runtime" == true ]] && ( unit_active squid || squid_process_present ); then
  echo "Squid remains active after project listener teardown" >&2
  exit 1
fi

echo "PaperBanana egress configuration removed. SSH hardening and user data were not changed."
