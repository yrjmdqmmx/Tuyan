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
  echo "install-health-monitor.sh --apply must run as root" >&2
  exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
unit_dir="$(cd -- "$script_dir/.." && pwd)/systemd"
if [[ "$mode" == "--dry-run" ]]; then
  echo "Would install and enable the PaperBanana Singapore egress health timer."
  exit 0
fi

test -x "$script_dir/monitor-health.sh"
test -r "$unit_dir/paperbanana-sg-egress-health.service"
test -r "$unit_dir/paperbanana-sg-egress-health.timer"
install -d -m 0755 "$(host_path /etc/systemd/system)"
install -m 0644 "$unit_dir/paperbanana-sg-egress-health.service" "$(host_path /etc/systemd/system/paperbanana-sg-egress-health.service)"
install -m 0644 "$unit_dir/paperbanana-sg-egress-health.timer" "$(host_path /etc/systemd/system/paperbanana-sg-egress-health.timer)"
systemctl daemon-reload
systemctl enable --now paperbanana-sg-egress-health.timer
systemctl is-active --quiet paperbanana-sg-egress-health.timer
