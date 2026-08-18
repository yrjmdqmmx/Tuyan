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
  echo "install-hk-peer.sh --apply must run as root" >&2
  exit 1
fi

interface_name="pbhk0"
managed_marker="# Managed by PaperBanana Singapore egress"
wg_dir="$(host_path /etc/wireguard)"
wg_config="$wg_dir/${interface_name}.conf"
hk_key_file="$wg_dir/paperbanana-hk-egress.private"
hk_key_marker="$wg_dir/paperbanana-hk-egress.private.owner"
sg_public_key_file="${SG_WG_PUBLIC_KEY_FILE:-$(host_path /root/.config/paperbanana-sg-egress/sg-wg-public.key)}"
sg_endpoint_file="${SG_WG_ENDPOINT_FILE:-$(host_path /root/.config/paperbanana-sg-egress/sg-wg-endpoint)}"

if [[ "$mode" == "--dry-run" ]]; then
  echo "Would validate root-owned Singapore peer files, generate a protected local key if absent, and atomically install only pbhk0 with 10.77.0.1/30 -> 10.77.0.2/32."
  echo "Would not add a default route, forwarding, firewall rules, generic wg0, or application changes."
  exit 0
fi

validate_root_peer_file() {
  local label="$1" path="$2" metadata
  [[ -f "$path" && ! -L "$path" && -r "$path" ]] || { echo "$label must be a root-owned readable regular file" >&2; exit 1; }
  metadata="$(stat -c '%F:%u:%a' -- "$path")" || { echo "cannot inspect $label" >&2; exit 1; }
  [[ "$metadata" == "regular file:0:600" ]] || { echo "$label must be owned by root with mode 0600" >&2; exit 1; }
}
validate_root_peer_file SG_WG_PUBLIC_KEY_FILE "$sg_public_key_file"
validate_root_peer_file SG_WG_ENDPOINT_FILE "$sg_endpoint_file"

sg_public_key="$(tr -d '[:space:]' < "$sg_public_key_file")"
if [[ ${#sg_public_key} -ne 44 || ! "$sg_public_key" =~ ^[A-Za-z0-9+/]{43}=$ ]]; then
  echo "Singapore peer public key must be a 44-character WireGuard base64 key" >&2
  exit 1
fi
zero_public_key="$(printf 'A%.0s' {1..43}; printf '=')"
[[ "$sg_public_key" != "$zero_public_key" ]] || { echo "Singapore peer public key is the invalid all-zero key" >&2; exit 1; }
printf '%s\n' "$sg_public_key" | wg pubkey >/dev/null 2>&1 || { echo "Singapore peer public key is not accepted by wg pubkey" >&2; exit 1; }

sg_endpoint="$(tr -d '\r\n' < "$sg_endpoint_file")"
endpoint_pattern='^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?:51820$'
if [[ ! "$sg_endpoint" =~ $endpoint_pattern ]]; then
  echo "Singapore peer endpoint file must contain exactly host:51820" >&2
  exit 1
fi

install -d -m 0700 "$wg_dir"
wg_was_active=false
if systemctl is-active --quiet "wg-quick@${interface_name}"; then
  wg_was_active=true
else
  status=$?
  case "$status" in 3|4) ;; *) echo "cannot determine whether wg-quick@${interface_name} is active" >&2; exit 2 ;; esac
fi

validate_managed_regular() {
  local path="$1" label="$2" metadata
  [[ -f "$path" && ! -L "$path" ]] || { echo "refusing $label: expected a regular non-symlink file" >&2; exit 1; }
  metadata="$(stat -c '%F:%u:%a' -- "$path")" || { echo "cannot inspect $label ownership" >&2; exit 1; }
  [[ "$metadata" == "regular file:0:600" ]] && grep -Fqx "$managed_marker" "$path" || {
    echo "refusing $label because it is not PaperBanana-managed, root-owned, and mode 0600" >&2
    exit 1
  }
}

if [[ -e "$wg_config" ]]; then validate_managed_regular "$wg_config" "existing pbhk0"; fi
if [[ "$wg_was_active" == true && ! -e "$wg_config" ]]; then
  echo "refusing active pbhk0 without its marked PaperBanana configuration" >&2
  exit 1
fi

if [[ -e "$hk_key_file" || -e "$hk_key_marker" ]]; then
  [[ -f "$hk_key_file" && ! -L "$hk_key_file" && -f "$hk_key_marker" && ! -L "$hk_key_marker" ]] || {
    echo "refusing incomplete or symlinked Hong Kong private-key state" >&2
    exit 1
  }
  validate_managed_regular "$hk_key_marker" "Hong Kong private-key marker"
  key_metadata="$(stat -c '%F:%u:%a' -- "$hk_key_file")" || { echo "cannot inspect Hong Kong private key" >&2; exit 1; }
  [[ "$key_metadata" == "regular file:0:600" ]] || { echo "Hong Kong private key must be root-owned with mode 0600" >&2; exit 1; }
fi

key_created=false
key_candidate=""
cleanup_new_key() {
  local status=$?
  if (( status != 0 )) && [[ "$key_created" == true ]]; then
    rm -f -- "$key_candidate" "$hk_key_file" "$hk_key_marker"
  fi
}
trap cleanup_new_key EXIT

if [[ ! -s "$hk_key_file" ]]; then
  key_created=true
  key_candidate="$(mktemp "$wg_dir/.paperbanana-hk-egress.private.XXXXXX")"
  if ! wg genkey > "$key_candidate"; then
    echo "Hong Kong WireGuard private-key generation failed" >&2
    exit 1
  fi
  hk_private_key="$(tr -d '[:space:]' < "$key_candidate")"
  if [[ ${#hk_private_key} -ne 44 || ! "$hk_private_key" =~ ^[A-Za-z0-9+/]{43}=$ ]] || ! wg pubkey < "$key_candidate" >/dev/null 2>&1; then
    echo "generated Hong Kong WireGuard private key is invalid" >&2
    exit 1
  fi
  chmod 0600 "$key_candidate"
  if [[ -z "$test_root" ]]; then chown root:root "$key_candidate"; fi
  mv -f -- "$key_candidate" "$hk_key_file"
  key_candidate=""
  printf '%s\n' "$managed_marker" > "$hk_key_marker"
  chmod 0600 "$hk_key_marker"
  if [[ -z "$test_root" ]]; then chown root:root "$hk_key_marker"; fi
else
  hk_private_key="$(tr -d '[:space:]' < "$hk_key_file")"
  if [[ ${#hk_private_key} -ne 44 || ! "$hk_private_key" =~ ^[A-Za-z0-9+/]{43}=$ ]] || ! wg pubkey < "$hk_key_file" >/dev/null 2>&1; then
    echo "existing Hong Kong WireGuard private key is invalid" >&2
    exit 1
  fi
fi
chmod 0600 "$hk_key_file"

candidate_dir="$(mktemp -d "$wg_dir/.${interface_name}.candidate.XXXXXX")"
chmod 0700 "$candidate_dir"
candidate="$candidate_dir/${interface_name}.conf"
cat > "$candidate" <<EOF
$managed_marker
[Interface]
Address = 10.77.0.1/30
ListenPort = 51820
PrivateKey = $hk_private_key

[Peer]
PublicKey = $sg_public_key
AllowedIPs = 10.77.0.2/32
Endpoint = $sg_endpoint
PersistentKeepalive = 25
EOF
chmod 0600 "$candidate"
if ! wg-quick strip "$candidate" >/dev/null; then
  rm -f -- "$candidate"
  rmdir -- "$candidate_dir"
  echo "Hong Kong WireGuard candidate validation failed; live configuration was not replaced" >&2
  exit 1
fi

previous=""
if [[ -e "$wg_config" ]]; then
  previous="$(mktemp "$wg_dir/.${interface_name}.previous.XXXXXX")"
  cp -p -- "$wg_config" "$previous"
fi

restore_wireguard() {
  local reason="$1"
  if [[ "$wg_was_active" == true ]]; then
    mv -f -- "$previous" "$wg_config"
    systemctl restart "wg-quick@${interface_name}" || {
      echo "$reason; restored the prior file but could not restore its live configuration" >&2
      return 1
    }
  else
    systemctl disable --now "wg-quick@${interface_name}" || {
      echo "$reason; could not stop the candidate interface" >&2
      return 1
    }
    if ip link show dev "$interface_name" >/dev/null 2>&1; then
      echo "$reason; candidate interface remains after stop" >&2
      return 1
    else
      status=$?
      [[ "$status" == "1" ]] || { echo "$reason; cannot verify candidate teardown" >&2; return 1; }
    fi
    if [[ -n "$previous" ]]; then mv -f -- "$previous" "$wg_config"; else rm -f -- "$wg_config"; fi
  fi
  echo "$reason; restored the prior Hong Kong WireGuard state" >&2
  return 1
}

mv -f -- "$candidate" "$wg_config"
rmdir -- "$candidate_dir"
if [[ "$wg_was_active" == true ]]; then
  systemctl restart "wg-quick@${interface_name}" || restore_wireguard "Hong Kong WireGuard restart failed"
else
  systemctl enable --now "wg-quick@${interface_name}" || restore_wireguard "Hong Kong WireGuard start failed"
fi
systemctl is-active --quiet "wg-quick@${interface_name}" || restore_wireguard "Hong Kong WireGuard is not active after apply"
ip -4 -o addr show dev "$interface_name" | awk '
  NF { total++ }
  $4 == "10.77.0.1/30" { exact++ }
  END { exit !(total == 1 && exact == 1) }
' || restore_wireguard "Hong Kong tunnel address verification failed"
ip -4 route show dev "$interface_name" | awk -v interface_name="$interface_name" '
  NF {
    total++
    has_expected_dev=0
    for (field=2; field<NF; field++) {
      if ($field == "dev" && $(field + 1) == interface_name) has_expected_dev=1
    }
    if (has_expected_dev && $1 == "10.77.0.0/30") connected++
    if (has_expected_dev && ($1 == "10.77.0.2" || $1 == "10.77.0.2/32")) peer++
  }
  END { exit !(connected == 1 && peer <= 1 && total == 1 + peer) }
' || restore_wireguard "Hong Kong route verification failed"
[[ "$(wg show "$interface_name" peers)" == "$sg_public_key" ]] || restore_wireguard "Hong Kong peer verification failed"
wg show "$interface_name" allowed-ips | awk -v key="$sg_public_key" '
  NF { total++; if (NF == 2 && $1 == key && $2 == "10.77.0.2/32") exact++ }
  END { exit !(total == 1 && exact == 1) }
' || restore_wireguard "Hong Kong live AllowedIPs verification failed"
if ! live_endpoint="$(wg show "$interface_name" endpoints | awk -v key="$sg_public_key" '
  NF { total++; if (NF == 2 && $1 == key) { exact++; endpoint=$2 } }
  END { if (total == 1 && exact == 1) print endpoint; else exit 1 }
')"; then
  restore_wireguard "Hong Kong endpoint verification failed"
fi
[[ "$live_endpoint" =~ $endpoint_pattern ]] || restore_wireguard "Hong Kong endpoint verification failed"

rm -f -- "$previous"
key_created=false
echo "Hong Kong pbhk0 peer is active with only the fixed Singapore transit route."
