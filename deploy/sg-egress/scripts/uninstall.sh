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

managed_wg=false
managed_squid=false
if [[ ! -e "$wg_config" ]] && systemctl is-active --quiet wg-quick@pbsg0; then
  echo "pbsg0 is active without a PaperBanana-managed configuration; refusing to delete anything" >&2
  exit 1
fi
if [[ -e "$wg_config" ]]; then
  if ! grep -Fqx "$managed_marker" "$wg_config"; then
    echo "refusing to remove pbsg0 because its configuration is not PaperBanana-managed" >&2
    exit 1
  fi
  managed_wg=true
fi
if [[ -e "$squid_config" ]] && grep -Fqx "$managed_marker" "$squid_config"; then
  managed_squid=true
fi

if [[ -e "$health_timer" ]]; then
  systemctl disable --now paperbanana-sg-egress-health.timer
fi
if [[ -e "$health_service" ]]; then
  systemctl stop paperbanana-sg-egress-health.service
fi
if [[ "$managed_wg" == true ]]; then
  systemctl disable --now wg-quick@pbsg0
fi
if [[ "$managed_squid" == true ]]; then
  systemctl disable --now squid
fi

rm -f -- "$health_service"
rm -f -- "$health_timer"
if [[ "$managed_wg" == true ]]; then
  rm -f -- "$wg_config"
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
echo "PaperBanana egress configuration removed. SSH hardening and user data were not changed."
