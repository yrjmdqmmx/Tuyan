#!/usr/bin/env bash
set -Eeuo pipefail

mode="${1:---dry-run}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd -- "$script_dir/.." && pwd)"

if [[ "$mode" != "--apply" && "$mode" != "--dry-run" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi
test "${EUID}" -eq 0 || { echo "run as root" >&2; exit 1; }

if [[ "$mode" == "--dry-run" ]]; then
  echo "Would install and enable the DirectMail egress DNS refresh timer."
  exit 0
fi

install -m 0644 "$deploy_dir/systemd/paperbanana-directmail-egress.service" /etc/systemd/system/paperbanana-directmail-egress.service
install -m 0644 "$deploy_dir/systemd/paperbanana-directmail-egress.timer" /etc/systemd/system/paperbanana-directmail-egress.timer
systemctl daemon-reload
systemctl enable --now paperbanana-directmail-egress.timer
systemctl start paperbanana-directmail-egress.service

echo "DirectMail egress DNS refresh timer installed."
