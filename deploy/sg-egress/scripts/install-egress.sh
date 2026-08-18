#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

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
  echo "install-egress.sh --apply must run as root" >&2
  exit 1
fi

interface_name="pbsg0"
# Fixed WireGuard transit network: 10.77.0.0/30 (Hong Kong .1, Singapore .2).
runtime_dir="$(host_path /opt/paperbanana-sg-egress)"
key_file="${HK_WG_PUBLIC_KEY_FILE:-$(host_path /root/.config/paperbanana-sg-egress/hk-wg-public.key)}"
endpoint="${HK_WG_ENDPOINT:-}"

if [[ "$mode" == "--dry-run" ]]; then
  echo "Would generate a restricted Singapore WireGuard private key and write the project-owned ${interface_name} and Squid configuration."
  echo "Would bind Squid only to 10.77.0.2:3128, permit only HK plus local health traffic to the three approved HTTPS hosts, and enable ${interface_name}."
  exit 0
fi

if [[ ! -r "$key_file" ]]; then
  echo "HK_WG_PUBLIC_KEY_FILE must point to a pre-provisioned root-readable Hong Kong peer public key" >&2
  exit 1
fi
if [[ "$(stat -c '%a:%u' "$key_file")" != "600:0" ]]; then
  echo "HK_WG_PUBLIC_KEY_FILE must be owned by root with mode 0600" >&2
  exit 1
fi
if [[ -z "$endpoint" || ! "$endpoint" =~ ^[A-Za-z0-9._:-]+:51820$ ]]; then
  echo "HK_WG_ENDPOINT must be a Hong Kong endpoint ending in :51820" >&2
  exit 1
fi

HK_WG_PUBLIC_KEY="$(tr -d '[:space:]' < "$key_file")"
if [[ ${#HK_WG_PUBLIC_KEY} -ne 44 || ! "$HK_WG_PUBLIC_KEY" =~ ^[A-Za-z0-9+/]{43}=$ ]]; then
  echo "HK peer public key must be a 44-character WireGuard base64 key" >&2
  exit 1
fi
if [[ "$HK_WG_PUBLIC_KEY" == 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' ]]; then
  echo "HK peer public key is the invalid all-zero WireGuard public key" >&2
  exit 1
fi
if ! printf '%s\n' "$HK_WG_PUBLIC_KEY" | wg pubkey >/dev/null 2>&1; then
  echo "HK peer public key is not accepted by wg pubkey" >&2
  exit 1
fi

managed_marker="# Managed by PaperBanana Singapore egress"
wg_dir="$(host_path /etc/wireguard)"
wg_config="$wg_dir/${interface_name}.conf"
sg_key_file="$wg_dir/paperbanana-sg-egress.private"
squid_dir="$(host_path /etc/squid)"
squid_config="$squid_dir/squid.conf"
squid_backup="$squid_dir/squid.conf.paperbanana-sg-egress.backup"

install -d -m 0700 "$wg_dir"
if [[ -e "$wg_config" ]] && ! grep -Fqx "$managed_marker" "$wg_config"; then
  echo "refusing to overwrite pbsg0: its configuration is not PaperBanana-managed" >&2
  exit 1
fi
if [[ ! -s "$sg_key_file" ]]; then
  wg genkey > "$sg_key_file"
fi
chmod 0600 "$sg_key_file"
sg_private_key="$(<"$sg_key_file")"

wg_candidate="$(mktemp "$wg_dir/.${interface_name}.tmp.XXXXXX")"
cat > "$wg_candidate" <<EOF
$managed_marker
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
chmod 0600 "$wg_candidate"
mv -f -- "$wg_candidate" "$wg_config"

install -d -m 0755 "$squid_dir"
if [[ -e "$squid_config" ]] && ! grep -Fqx "$managed_marker" "$squid_config"; then
  if [[ -e "$squid_backup" ]]; then
    echo "refusing to overwrite a non-PaperBanana Squid configuration after its package backup was recorded" >&2
    exit 1
  fi
  cp -p "$squid_config" "$squid_backup"
fi
squid_candidate="$(mktemp "$squid_dir/.paperbanana-sg-egress.tmp.XXXXXX")"
cat > "$squid_candidate" <<'EOF'
# Managed by PaperBanana Singapore egress
# CONNECT only; no TLS interception. Squid listens solely on the WireGuard address.
http_port 10.77.0.2:3128
visible_hostname paperbanana-sg-egress
host_verify_strict on

acl hk src 10.77.0.1/32
# This permits the local five-minute health probe through the same tunnel-bound listener.
acl sg_health src 10.77.0.2/32
acl CONNECT method CONNECT
acl SSL_ports port 443
# -n prevents reverse-DNS/PTR lookups from turning an IP literal into an approved name.
acl approved dstdomain -n api.openai.com generativelanguage.googleapis.com openrouter.ai
acl literal_ipv4 url_regex -i ^[0-9]{1,3}(\.[0-9]{1,3}){3}:[0-9]+$
acl literal_ipv6 url_regex -i ^\[[0-9a-f:.]+\]:[0-9]+$
acl literal_ipv4_url url_regex -i ^https?://[0-9]{1,3}(\.[0-9]{1,3}){3}[:/]
acl literal_ipv6_url url_regex -i ^https?://\[[0-9a-f:.]+\][:/]
acl private_dst dst 10.0.0.0/8
acl private_dst dst 100.64.0.0/10
acl private_dst dst 127.0.0.0/8
acl private_dst dst 169.254.0.0/16
acl private_dst dst 172.16.0.0/12
acl private_dst dst 192.168.0.0/16
acl private_dst dst ::1/128
acl private_dst dst fc00::/7
acl private_dst dst fe80::/10

http_access deny literal_ipv4
http_access deny literal_ipv6
http_access deny literal_ipv4_url
http_access deny literal_ipv6_url
http_access deny private_dst
http_access allow hk CONNECT SSL_ports approved
http_access allow sg_health CONNECT SSL_ports approved
http_access deny all

cache deny all
cache_mem 0 MB
maximum_object_size 0 KB
# Only CONNECT is allowed, so %>rd:%>rP is the parsed CONNECT host:port, not a request header or URL query.
logformat paperbanana_egress %tg %>a %>Hs %tr %<st %>rd:%>rP
access_log stdio:/var/log/squid/paperbanana-egress.log paperbanana_egress
EOF
chmod 0644 "$squid_candidate"
if ! squid -f "$squid_candidate" -k parse; then
  rm -f -- "$squid_candidate"
  echo "Squid candidate parse failed; live configuration was not replaced" >&2
  exit 1
fi
mv -f -- "$squid_candidate" "$squid_config"

systemctl enable --now "wg-quick@${interface_name}"
systemctl enable --now squid
systemctl restart squid
systemctl is-active --quiet "wg-quick@${interface_name}"
systemctl is-active --quiet squid
install -d -m 0750 "$runtime_dir"
echo "Singapore egress services are active."
