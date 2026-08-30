#!/usr/bin/env bash
set -Eeuo pipefail

mode="${1:---dry-run}"
if [[ "$mode" != "--apply" && "$mode" != "--dry-run" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi
test "${EUID}" -eq 0 || { echo "run as root" >&2; exit 1; }

if [[ "$mode" == "--dry-run" ]]; then
  echo "Would install jq/curl/certbot/netfilter persistence and create only /opt/paperbanana paths."
  exit 0
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates curl git gnupg jq openssl certbot python3-certbot-nginx \
  iptables iptables-persistent unzip

ossutil_version="2.3.0"
ossutil_sha256="3ae4d9fc85a7a6e9f5654d1599766f1a3a42a3692870887b5ae9338d582ef65a"
ossutil_name="ossutil-${ossutil_version}-linux-amd64"
ossutil_tmp="$(mktemp -d)"
cleanup() { rm -rf -- "$ossutil_tmp"; }
trap cleanup EXIT
curl --fail --silent --show-error --location \
  "https://gosspublic.alicdn.com/ossutil/v2/${ossutil_version}/${ossutil_name}.zip" \
  --output "$ossutil_tmp/${ossutil_name}.zip"
printf '%s  %s\n' "$ossutil_sha256" "$ossutil_tmp/${ossutil_name}.zip" | sha256sum --check --status
unzip -q "$ossutil_tmp/${ossutil_name}.zip" -d "$ossutil_tmp"
install -m 0755 "$ossutil_tmp/$ossutil_name/ossutil" /usr/local/bin/ossutil
command -v ossutil >/dev/null

install -d -m 0755 /opt/paperbanana
install -d -m 0700 /opt/paperbanana/secrets /opt/paperbanana/backups
install -d -m 0750 /opt/paperbanana/control
install -d -o 0 -g 0 -m 0700 /opt/paperbanana/operator-private /opt/paperbanana/operator-private/scientific-v2
install -d -m 0750 -o 999 -g 999 /opt/paperbanana/data/mongodb
install -d -o 1000 -g 1000 -m 0700 /opt/paperbanana/data/scientific-v2-artifact-spool
scientific_v2_spool_available="$(df -P -B1 /opt/paperbanana/data/scientific-v2-artifact-spool | awk 'NR==2 {print $4}')"
[[ "$scientific_v2_spool_available" =~ ^[0-9]+$ && "$scientific_v2_spool_available" -ge 1073741824 ]] || {
  echo "scientific v2 artifact spool requires at least 1073741824 available bytes" >&2
  exit 1
}
install -d -m 0755 /var/www/letsencrypt

if [[ ! -d /opt/paperbanana/repo/.git ]]; then
  test ! -e /opt/paperbanana/repo || {
    echo "/opt/paperbanana/repo exists but is not a Git checkout" >&2
    exit 1
  }
  git clone https://github.com/yrjmdqmmx/paperbanana-clients.git /opt/paperbanana/repo
fi

echo "Host directories and required packages are ready. No application was restarted."
