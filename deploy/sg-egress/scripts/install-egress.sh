#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

mode="${1:---dry-run}"
if [[ "$mode" != "--apply" && "$mode" != "--dry-run" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi
if [[ "$EUID" -ne 0 ]]; then
  echo "install-egress.sh must run as root" >&2
  exit 1
fi

runtime_dir="/opt/paperbanana-sg-egress"
# Fixed WireGuard transit network: 10.77.0.0/30 (Hong Kong .1, Singapore .2).
key_file="${HK_WG_PUBLIC_KEY_FILE:-/root/.config/paperbanana-sg-egress/hk-wg-public.key}"
endpoint="${HK_WG_ENDPOINT:-}"

if [[ ! -r "$key_file" ]]; then
  echo "HK_WG_PUBLIC_KEY_FILE must point to a pre-provisioned root-readable Hong Kong peer public key" >&2
  exit 1
fi
if [[ "$(stat -c '%a:%u' "$key_file")" != "600:0" ]]; then
  echo "HK_WG_PUBLIC_KEY_FILE must be owned by root with mode 0600" >&2
  exit 1
fi
if [[ -z "$endpoint" || "$endpoint" != *:51820 ]]; then
  echo "HK_WG_ENDPOINT must be a Hong Kong endpoint ending in :51820" >&2
  exit 1
fi

HK_WG_PUBLIC_KEY="$(tr -d '[:space:]' < "$key_file")"
if [[ ! "$HK_WG_PUBLIC_KEY" =~ ^[A-Za-z0-9+/]{42,43}=$ ]]; then
  echo "HK peer public key has an unexpected WireGuard format" >&2
  exit 1
fi

if [[ "$mode" == "--dry-run" ]]; then
  echo "Would generate a restricted Singapore WireGuard private key and write wg0/Squid configuration under /etc."
  echo "Would bind Squid only to 10.77.0.2:3128 and enable wg-quick@wg0 plus squid."
  exit 0
fi

install -d -m 0700 /etc/wireguard
sg_key_file="/etc/wireguard/paperbanana-sg-egress.private"
if [[ ! -s "$sg_key_file" ]]; then
  wg genkey > "$sg_key_file"
  chmod 0600 "$sg_key_file"
fi
sg_private_key="$(<"$sg_key_file")"

install -m 0600 /dev/stdin /etc/wireguard/wg0.conf <<EOF
[Interface]
Address = 10.77.0.2/30
ListenPort = 51820
PrivateKey = $sg_private_key

[Peer]
PublicKey = $HK_WG_PUBLIC_KEY
AllowedIPs = 10.77.0.1/32
Endpoint = $endpoint
PersistentKeepalive = 25
EOF
chmod 0600 /etc/wireguard/wg0.conf "$sg_key_file"

if [[ ! -e /etc/squid/squid.conf.paperbanana-sg-egress.backup ]]; then
  cp -a /etc/squid/squid.conf /etc/squid/squid.conf.paperbanana-sg-egress.backup
fi
install -m 0644 /dev/stdin /etc/squid/squid.conf <<'EOF'
# Managed by PaperBanana Singapore egress. CONNECT only; no TLS interception.
http_port 10.77.0.2:3128
visible_hostname paperbanana-sg-egress

acl hk src 10.77.0.1/32
acl CONNECT method CONNECT
acl SSL_ports port 443
acl approved dstdomain api.openai.com generativelanguage.googleapis.com openrouter.ai
acl literal_ip url_regex -i ^https?://[0-9a-f:.]+
acl literal_ip url_regex -i ^[0-9a-f:.]+:
acl private_dst dst 10.0.0.0/8
acl private_dst dst 172.16.0.0/12
acl private_dst dst 192.168.0.0/16
acl private_dst dst 127.0.0.0/8
acl private_dst dst 169.254.0.0/16

http_access deny literal_ip
http_access deny private_dst
http_access allow hk CONNECT SSL_ports approved
http_access deny all

cache deny all
cache_mem 0 MB
maximum_object_size 0 KB
logformat paperbanana_egress %tg %>a %>Hs %tr %<st %{Host}>h
access_log stdio:/var/log/squid/paperbanana-egress.log paperbanana_egress
EOF
squid -k parse
systemctl enable --now wg-quick@wg0
systemctl enable --now squid
systemctl restart squid
systemctl is-active --quiet wg-quick@wg0
systemctl is-active --quiet squid
echo "Singapore egress services are active."
