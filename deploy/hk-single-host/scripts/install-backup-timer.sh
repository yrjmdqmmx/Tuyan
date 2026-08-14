#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd -- "$script_dir/.." && pwd)"
unit_dir="$deploy_dir/systemd"

if [[ "${1:-}" != "--apply" ]]; then
  echo "Dry run: would install and enable the PaperBanana daily backup timer."
  echo "Re-run with --apply after checking the two units in $unit_dir."
  exit 0
fi

if [[ "$EUID" -ne 0 ]]; then
  echo "install-backup-timer.sh --apply must run as root" >&2
  exit 1
fi

test -r "$unit_dir/paperbanana-backup.service"
test -r "$unit_dir/paperbanana-backup.timer"
test -x "$script_dir/backup-mongo.sh"

install -m 0644 "$unit_dir/paperbanana-backup.service" /etc/systemd/system/paperbanana-backup.service
install -m 0644 "$unit_dir/paperbanana-backup.timer" /etc/systemd/system/paperbanana-backup.timer
systemctl daemon-reload
systemctl enable --now paperbanana-backup.timer
systemctl is-active --quiet paperbanana-backup.timer
systemctl list-timers paperbanana-backup.timer --no-pager

