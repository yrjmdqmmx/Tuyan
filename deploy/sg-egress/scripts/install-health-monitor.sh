#!/usr/bin/env bash
set -Eeuo pipefail

mode="${1:---dry-run}"
if [[ "$mode" != "--apply" && "$mode" != "--dry-run" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi
if [[ "$EUID" -ne 0 ]]; then
  echo "install-health-monitor.sh must run as root" >&2
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
install -m 0644 "$unit_dir/paperbanana-sg-egress-health.service" /etc/systemd/system/paperbanana-sg-egress-health.service
install -m 0644 "$unit_dir/paperbanana-sg-egress-health.timer" /etc/systemd/system/paperbanana-sg-egress-health.timer
systemctl daemon-reload
systemctl enable --now paperbanana-sg-egress-health.timer
systemctl is-active --quiet paperbanana-sg-egress-health.timer
