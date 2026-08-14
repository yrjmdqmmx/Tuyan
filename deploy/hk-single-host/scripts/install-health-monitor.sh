#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd -- "$script_dir/.." && pwd)"
unit_dir="$deploy_dir/systemd"
monitor_env="/opt/paperbanana/secrets/monitor.env"

if [[ "${1:-}" != "--apply" ]]; then
  echo "Dry run: would install and enable the PaperBanana production health monitor."
  echo "Re-run with --apply after staging $monitor_env with mode 0600."
  exit 0
fi

if [[ "$EUID" -ne 0 ]]; then
  echo "install-health-monitor.sh --apply must run as root" >&2
  exit 1
fi

test -r "$monitor_env"
test -x "$script_dir/monitor-health.sh"
test -x "$script_dir/report-cms-event.py"
test -r "$unit_dir/paperbanana-health-monitor.service"
test -r "$unit_dir/paperbanana-health-monitor.timer"
install -d -m 0700 /var/lib/paperbanana-monitor
install -m 0644 "$unit_dir/paperbanana-health-monitor.service" /etc/systemd/system/paperbanana-health-monitor.service
install -m 0644 "$unit_dir/paperbanana-health-monitor.timer" /etc/systemd/system/paperbanana-health-monitor.timer
systemctl daemon-reload
systemctl enable --now paperbanana-health-monitor.timer
systemctl is-active --quiet paperbanana-health-monitor.timer
systemctl list-timers paperbanana-health-monitor.timer --no-pager
