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
if [[ -n "$test_root" && ( "$test_root" != /* || "$test_root" == "/" ) ]]; then
  echo "PAPERBANANA_SG_EGRESS_TEST_ROOT must be an absolute non-root test directory" >&2
  exit 2
fi
host_path() { printf '%s%s' "$test_root" "$1"; }
if [[ "$mode" == "--apply" && "$EUID" -ne 0 && -z "$test_root" ]]; then
  echo "install-health-monitor.sh --apply must run as root" >&2
  exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
unit_dir="$(cd -- "$script_dir/.." && pwd)/systemd"
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
  if ! metadata="$(stat -c '%F:%u:%a' "$path")"; then
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
test -r "$unit_dir/paperbanana-hk-egress-health@.service"
test -r "$unit_dir/paperbanana-hk-egress-health@.timer"
install -d -m 0755 "$(host_path /etc/systemd/system)"
install -m 0644 "$unit_dir/paperbanana-hk-egress-health@.service" "$(host_path /etc/systemd/system/paperbanana-hk-egress-health@.service)"
install -m 0644 "$unit_dir/paperbanana-hk-egress-health@.timer" "$(host_path /etc/systemd/system/paperbanana-hk-egress-health@.timer)"
systemctl daemon-reload
systemctl enable --now "paperbanana-hk-egress-health@${wg_interface}.timer"
systemctl is-active --quiet "paperbanana-hk-egress-health@${wg_interface}.timer"
