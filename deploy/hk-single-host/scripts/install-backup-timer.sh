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
test -r "$script_dir/with-backup-oss-network.py"

# Keep a daily backup independent of subsequent application checkout changes.
# The same lock prevents replacing the helper during an active backup/upload.
exec 9>/run/lock/paperbanana-mongo-backup.lock
flock -n 9 || { echo "backup is active; retry installation after it finishes" >&2; exit 1; }
runtime_dir="/opt/paperbanana/operations/backup"
install -d -m 0700 "$runtime_dir"
install -m 0755 "$script_dir/backup-mongo.sh" "$runtime_dir/backup-mongo.sh.tmp"
install -m 0644 "$script_dir/with-backup-oss-network.py" "$runtime_dir/with-backup-oss-network.py.tmp"
mv "$runtime_dir/with-backup-oss-network.py.tmp" "$runtime_dir/with-backup-oss-network.py"
mv "$runtime_dir/backup-mongo.sh.tmp" "$runtime_dir/backup-mongo.sh"
install -m 0644 "$unit_dir/paperbanana-backup.service" /etc/systemd/system/paperbanana-backup.service
install -m 0644 "$unit_dir/paperbanana-backup.timer" /etc/systemd/system/paperbanana-backup.timer
systemctl daemon-reload
flock -u 9
systemctl enable --now paperbanana-backup.timer
systemctl is-active --quiet paperbanana-backup.timer
systemctl list-timers paperbanana-backup.timer --no-pager
