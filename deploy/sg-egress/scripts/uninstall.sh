#!/usr/bin/env bash
set -Eeuo pipefail

mode="${1:---dry-run}"
if [[ "$mode" != "--apply" && "$mode" != "--dry-run" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi
if [[ "$EUID" -ne 0 ]]; then
  echo "uninstall.sh must run as root" >&2
  exit 1
fi

if [[ "$mode" == "--dry-run" ]]; then
  echo "Would stop only PaperBanana egress services and remove /etc/wireguard/wg0.conf, /etc/wireguard/paperbanana-sg-egress.private, and egress health units."
  echo "Would restore the narrowly saved /etc/squid/squid.conf package backup if present. SSH and user data are untouched."
  exit 0
fi

systemctl disable --now paperbanana-sg-egress-health.timer 2>/dev/null || true
systemctl disable --now wg-quick@wg0 2>/dev/null || true
systemctl disable --now squid 2>/dev/null || true
rm -f -- /etc/systemd/system/paperbanana-sg-egress-health.service
rm -f -- /etc/systemd/system/paperbanana-sg-egress-health.timer
rm -f -- /etc/wireguard/wg0.conf
rm -f -- /etc/wireguard/paperbanana-sg-egress.private
if [[ -e /etc/squid/squid.conf.paperbanana-sg-egress.backup ]]; then
  mv -- /etc/squid/squid.conf.paperbanana-sg-egress.backup /etc/squid/squid.conf
fi
systemctl daemon-reload
echo "PaperBanana egress configuration removed. SSH hardening and user data were not changed."
