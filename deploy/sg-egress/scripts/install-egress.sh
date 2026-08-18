#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

mode="${1:---dry-run}"
if [[ "$mode" != "--apply" && "$mode" != "--dry-run" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi

test_root="${PAPERBANANA_SG_EGRESS_TEST_ROOT:-}"
validate_test_root() {
  [[ -n "$test_root" ]] || return 0
  if (( EUID == 0 )); then echo "PAPERBANANA_SG_EGRESS_TEST_ROOT is forbidden while running as root" >&2; exit 2; fi
  if [[ "$test_root" != /* || "$test_root" == "/" || "$test_root" == *"/../"* || "$test_root" == */.. || "$test_root" == *"/./"* || "$test_root" == */. ]]; then echo "PAPERBANANA_SG_EGRESS_TEST_ROOT must be a canonical absolute test root" >&2; exit 2; fi
  local canonical marker metadata file_type owner mode_bits
  canonical="$(cd -P -- "$test_root" 2>/dev/null && pwd -P)" || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT is not a usable test root" >&2; exit 2; }
  [[ "$canonical" == "$test_root" && ! -L "$test_root" ]] || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT must not contain a symlink or non-canonical path" >&2; exit 2; }
  marker="$test_root/.paperbanana-sg-egress-test-root"
  [[ -f "$marker" && ! -L "$marker" && "$(<"$marker")" == "paperbanana-sg-egress-test-root-v1" ]] || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT lacks the required fixture marker" >&2; exit 2; }
  for path in "$test_root" "$marker"; do metadata="$(stat -c '%F:%u:%a' -- "$path")" || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT metadata is unsafe" >&2; exit 2; }; IFS=: read -r file_type owner mode_bits <<<"$metadata"; [[ "$owner" == "$EUID" && "$mode_bits" =~ ^[0-7]{3,4}$ && $((8#$mode_bits & 0022)) -eq 0 ]] || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT fixture owner or permissions are unsafe" >&2; exit 2; }; done
}
validate_test_root
host_path() { printf '%s%s' "$test_root" "$1"; }

if [[ "$mode" == "--apply" && "$EUID" -ne 0 && -z "$test_root" ]]; then
  echo "install-egress.sh --apply must run as root" >&2
  exit 1
fi

interface_name="pbsg0"
# Fixed WireGuard transit network: 10.77.0.0/30 (Hong Kong .1, Singapore .2).
runtime_dir="$(host_path /opt/paperbanana-sg-egress)"
key_file="${HK_WG_PUBLIC_KEY_FILE:-$(host_path /root/.config/paperbanana-sg-egress/hk-wg-public.key)}"
endpoint_file="${HK_WG_ENDPOINT_FILE:-}"
endpoint="${HK_WG_ENDPOINT:-}"

if [[ "$mode" == "--dry-run" ]]; then
  echo "Would generate a restricted Singapore WireGuard private key and write the project-owned ${interface_name} and Squid configuration."
  echo "Would bind Squid only to 10.77.0.2:3128 and permit only Hong Kong 10.77.0.1 to the three approved HTTPS hosts."
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
if [[ -n "$endpoint_file" ]]; then
  if [[ ! -f "$endpoint_file" || -L "$endpoint_file" || "$(stat -c '%F:%u:%a' -- "$endpoint_file")" != "regular file:0:600" ]]; then
    echo "HK_WG_ENDPOINT_FILE must point to a root-owned regular file with mode 0600" >&2
    exit 1
  fi
  endpoint="$(tr -d '\r\n' < "$endpoint_file")"
fi
endpoint_pattern='^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?:51820$'
if [[ -z "$endpoint" || ! "$endpoint" =~ $endpoint_pattern ]]; then
  echo "HK_WG_ENDPOINT must contain exactly host:51820" >&2
  exit 1
fi

HK_WG_PUBLIC_KEY="$(tr -d '[:space:]' < "$key_file")"
if [[ ${#HK_WG_PUBLIC_KEY} -ne 44 || ! "$HK_WG_PUBLIC_KEY" =~ ^[A-Za-z0-9+/]{43}=$ ]]; then
  echo "HK peer public key must be a 44-character WireGuard base64 key" >&2
  exit 1
fi
zero_public_key="$(printf 'A%.0s' {1..43}; printf '=')"
if [[ "$HK_WG_PUBLIC_KEY" == "$zero_public_key" ]]; then
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
sg_key_marker="$wg_dir/paperbanana-sg-egress.private.owner"
squid_dir="$(host_path /etc/squid)"
squid_config="$squid_dir/squid.conf"
squid_backup="$squid_dir/squid.conf.paperbanana-sg-egress.backup"
squid_dropin_dir="$(host_path /etc/systemd/system/squid.service.d)"
squid_dropin="$squid_dropin_dir/10-paperbanana-sg-egress.conf"

install -d -m 0700 "$wg_dir"
wg_was_active=false
if systemctl is-active --quiet "wg-quick@${interface_name}"; then
  wg_was_active=true
else
  wg_status=$?
  case "$wg_status" in 3|4) ;; *) echo "cannot determine whether wg-quick@${interface_name} is active" >&2; exit 2 ;; esac
fi
if [[ "$wg_was_active" == true ]]; then
  if [[ ! -f "$wg_config" || -L "$wg_config" || ! -r "$wg_config" ]]; then
    echo "refusing to replace active pbsg0 without a readable canonical PaperBanana configuration" >&2
    exit 1
  fi
  wg_config_metadata="$(stat -c '%F:%u:%a' -- "$wg_config")" || { echo "cannot inspect active pbsg0 configuration ownership" >&2; exit 2; }
  IFS=: read -r wg_config_type wg_config_owner wg_config_mode <<<"$wg_config_metadata"
  if [[ "$wg_config_type" != "regular file" || "$wg_config_owner" != "0" || "$wg_config_mode" != "600" ]] || ! grep -Fqx "$managed_marker" "$wg_config"; then
    echo "refusing to replace active pbsg0 without a root-owned 0600 marked PaperBanana configuration" >&2
    exit 1
  fi
fi
if [[ -e "$wg_config" ]] && ! grep -Fqx "$managed_marker" "$wg_config"; then
  echo "refusing to overwrite pbsg0: its configuration is not PaperBanana-managed" >&2
  exit 1
fi
sg_key_created=false
sg_key_candidate=""
cleanup_new_wg_key() {
  local status=$?
  if (( status != 0 )) && [[ "$sg_key_created" == true ]]; then
    rm -f -- "$sg_key_candidate" "$sg_key_file" "$sg_key_marker"
  fi
}
trap cleanup_new_wg_key EXIT
if [[ ! -s "$sg_key_file" ]]; then
  sg_key_created=true
  sg_key_candidate="$(mktemp "$wg_dir/.paperbanana-sg-egress.private.XXXXXX")"
  if ! wg genkey > "$sg_key_candidate"; then
    echo "WireGuard private-key generation failed" >&2
    exit 1
  fi
  sg_private_key="$(tr -d '[:space:]' < "$sg_key_candidate")"
  if [[ ${#sg_private_key} -ne 44 || ! "$sg_private_key" =~ ^[A-Za-z0-9+/]{43}=$ ]]; then
    echo "generated WireGuard private key is malformed" >&2
    exit 1
  fi
  if ! wg pubkey < "$sg_key_candidate" >/dev/null 2>&1; then
    echo "generated WireGuard private key is not accepted by wg pubkey" >&2
    exit 1
  fi
  chown root:root "$sg_key_candidate"
  chmod 0600 "$sg_key_candidate"
  mv -f -- "$sg_key_candidate" "$sg_key_file"
  sg_key_candidate=""
  printf '%s\n' "$managed_marker" > "$sg_key_marker"
  chown root:root "$sg_key_marker"
  chmod 0600 "$sg_key_marker"
else
  sg_private_key="$(<"$sg_key_file")"
fi
chmod 0600 "$sg_key_file"

wg_candidate_dir="$(mktemp -d "$wg_dir/.${interface_name}.candidate.XXXXXX")"
chmod 0700 "$wg_candidate_dir"
wg_candidate="$wg_candidate_dir/${interface_name}.conf"
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
if ! wg-quick strip "$wg_candidate" >/dev/null; then
  rm -f -- "$wg_candidate"
  rmdir -- "$wg_candidate_dir"
  echo "WireGuard candidate validation failed; live configuration was not replaced" >&2
  exit 1
fi
wg_previous=""
if [[ -e "$wg_config" ]]; then
  wg_previous="$(mktemp "$wg_dir/.${interface_name}.previous.XXXXXX")"
  cp -p -- "$wg_config" "$wg_previous"
fi
restore_wireguard() {
  local reason="$1"
  if [[ "$wg_was_active" == true ]]; then
    mv -f -- "$wg_previous" "$wg_config"
    systemctl reload "wg-quick@${interface_name}" || { echo "$reason; restored prior WireGuard file but could not restore its live configuration" >&2; return 1; }
  else
    systemctl disable --now "wg-quick@${interface_name}" || { echo "$reason; restored prior WireGuard file but could not stop candidate service" >&2; return 1; }
    if ip link show dev "$interface_name" >/dev/null 2>&1; then
      echo "$reason; candidate WireGuard interface remains after stop" >&2
      return 1
    else
      wg_interface_status=$?
      if (( wg_interface_status != 1 )); then
        echo "$reason; cannot verify candidate WireGuard interface teardown" >&2
        return 1
      fi
    fi
    if [[ -n "$wg_previous" ]]; then
      mv -f -- "$wg_previous" "$wg_config"
    else
      rm -f -- "$wg_config"
    fi
  fi
  echo "$reason; restored the prior WireGuard configuration" >&2
  return 1
}
mv -f -- "$wg_candidate" "$wg_config"
rmdir -- "$wg_candidate_dir"
if [[ "$wg_was_active" == true ]]; then
  systemctl reload "wg-quick@${interface_name}" || restore_wireguard "WireGuard reload failed"
else
  systemctl enable --now "wg-quick@${interface_name}" || restore_wireguard "WireGuard start failed"
fi
if ! systemctl is-active --quiet "wg-quick@${interface_name}"; then restore_wireguard "WireGuard is not active after applying the candidate"; fi
if ! ip -4 -o addr show dev "$interface_name" | awk '$4 == "10.77.0.2/30" { found=1 } END { exit !found }'; then restore_wireguard "WireGuard tunnel address verification failed"; fi
if [[ "$(wg show "$interface_name" peers)" != "$HK_WG_PUBLIC_KEY" ]]; then restore_wireguard "WireGuard peer verification failed"; fi
if ! live_endpoint="$(wg show "$interface_name" endpoints | awk -v key="$HK_WG_PUBLIC_KEY" '
  NF { total++; if (NF == 2 && $1 == key) { exact++; endpoint=$2 } }
  END { if (total == 1 && exact == 1) print endpoint; else exit 1 }
')"; then restore_wireguard "WireGuard endpoint verification failed"; fi
if [[ ! "$live_endpoint" =~ $endpoint_pattern ]]; then restore_wireguard "WireGuard endpoint verification failed"; fi
rm -f -- "$wg_previous"

install -d -m 0755 "$squid_dir"
squid_candidate="$(mktemp "$squid_dir/.paperbanana-sg-egress.tmp.XXXXXX")"
cat > "$squid_candidate" <<'EOF'
# Managed by PaperBanana Singapore egress
# CONNECT only; no TLS interception. Squid listens solely on the WireGuard address.
http_port 10.77.0.2:3128
visible_hostname paperbanana-sg-egress
host_verify_strict on

acl hk src 10.77.0.1/32
acl CONNECT method CONNECT
acl SSL_ports port 443
# -n prevents reverse-DNS/PTR lookups from turning an IP literal into an approved name.
acl approved dstdomain -n api.openai.com generativelanguage.googleapis.com openrouter.ai
acl literal_ipv4 url_regex -i ^[0-9]{1,3}(\.[0-9]{1,3}){3}:[0-9]+$
acl literal_ipv6 url_regex -i ^\[[0-9a-f:.]+\]:[0-9]+$
acl literal_ipv4_url url_regex -i ^https?://[0-9]{1,3}(\.[0-9]{1,3}){3}[:/]
acl literal_ipv6_url url_regex -i ^https?://\[[0-9a-f:.]+\][:/]
acl private_dst dst 0.0.0.0/8
acl private_dst dst 10.0.0.0/8
acl private_dst dst 100.64.0.0/10
acl private_dst dst 127.0.0.0/8
acl private_dst dst 169.254.0.0/16
acl private_dst dst 172.16.0.0/12
acl private_dst dst 192.168.0.0/16
acl private_dst dst ::/128
acl private_dst dst ::1/128
acl private_dst dst fc00::/7
acl private_dst dst fe80::/10
# Squid represents ordinary IPv4 addresses as IPv4-mapped internally. Do not
# use ::ffff:0:0/96 here: it would match and block every normal IPv4 A record.
# Raw mapped literals are denied above; mapped private/loopback values are
# normalized to IPv4 and matched by the CIDRs above.

http_access deny literal_ipv4
http_access deny literal_ipv6
http_access deny literal_ipv4_url
http_access deny literal_ipv6_url
http_access deny private_dst
http_access allow hk CONNECT SSL_ports approved
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
if [[ -e "$squid_config" ]] && ! grep -Fqx "$managed_marker" "$squid_config"; then
  if [[ -e "$squid_backup" ]] && ! cmp -s -- "$squid_config" "$squid_backup"; then
    rm -f -- "$squid_candidate"
    echo "refusing to overwrite a changed package Squid configuration after its backup was recorded" >&2
    exit 1
  fi
  [[ -e "$squid_backup" ]] || cp -p -- "$squid_config" "$squid_backup"
fi
install -d -m 0755 "$squid_dropin_dir"
if [[ -e "$squid_dropin" ]] && ! grep -Fqx "$managed_marker" "$squid_dropin"; then
  rm -f -- "$squid_candidate"
  echo "refusing to overwrite an unowned Squid systemd drop-in" >&2
  exit 1
fi
squid_dropin_previous=""
if [[ -e "$squid_dropin" ]]; then
  squid_dropin_previous="$(mktemp "$squid_dropin_dir/.10-paperbanana-sg-egress.previous.XXXXXX")"
  cp -p -- "$squid_dropin" "$squid_dropin_previous"
fi
squid_dropin_candidate="$(mktemp "$squid_dropin_dir/.10-paperbanana-sg-egress.tmp.XXXXXX")"
cat > "$squid_dropin_candidate" <<EOF
$managed_marker
[Unit]
Requires=wg-quick@${interface_name}.service
After=wg-quick@${interface_name}.service

[Service]
# Squid 6 no longer honors dns_v4_first. Limit this process to IPv4 sockets;
# DNS may still return AAAA records, but outbound provider connections cannot use them.
RestrictAddressFamilies=AF_UNIX AF_INET
EOF
chmod 0644 "$squid_dropin_candidate"
squid_was_active=false
if systemctl is-active --quiet squid; then
  squid_was_active=true
else
  squid_status=$?
  case "$squid_status" in 3|4) ;; *) rm -f -- "$squid_candidate"; echo "cannot determine whether Squid is active" >&2; exit 2 ;; esac
fi
squid_previous="$(mktemp "$squid_dir/.paperbanana-sg-egress.previous.XXXXXX")"
cp -p -- "$squid_config" "$squid_previous"
restore_squid() {
  local reason="$1"
  mv -f -- "$squid_previous" "$squid_config"
  if [[ -n "$squid_dropin_previous" ]]; then mv -f -- "$squid_dropin_previous" "$squid_dropin"; else rm -f -- "$squid_dropin"; fi
  systemctl daemon-reload || { echo "$reason; restored files but could not reload systemd" >&2; return 1; }
  if [[ "$squid_was_active" == true ]]; then
    systemctl restart squid || { echo "$reason; restored prior Squid file but could not restart last-good Squid" >&2; return 1; }
  else
    systemctl disable --now squid || { echo "$reason; restored prior Squid file but could not stop candidate Squid" >&2; return 1; }
  fi
  echo "$reason; restored the prior Squid configuration" >&2
  return 1
}
mv -f -- "$squid_candidate" "$squid_config"
mv -f -- "$squid_dropin_candidate" "$squid_dropin"
systemctl daemon-reload || restore_squid "systemd reload failed after Squid candidate install"
if ! systemctl enable --now squid; then restore_squid "Squid enable/start failed"; fi
if ! systemctl restart squid; then restore_squid "Squid restart failed"; fi
if ! systemctl is-active --quiet squid; then restore_squid "Squid is not active after applying the candidate"; fi
rm -f -- "$squid_previous"
rm -f -- "$squid_dropin_previous"
sg_key_created=false
install -d -m 0750 "$runtime_dir"
echo "Singapore egress services are active."
