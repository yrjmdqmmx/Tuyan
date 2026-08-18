#!/usr/bin/env bash
set -Eeuo pipefail

mode="${1:---dry-run}"
if [[ "$mode" != "--apply" && "$mode" != "--dry-run" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi

test_root="${PAPERBANANA_SG_EGRESS_TEST_ROOT:-}"
validate_test_root() {
  [[ -n "$test_root" ]] || return 0
  if (( EUID == 0 )); then
    echo "PAPERBANANA_SG_EGRESS_TEST_ROOT is forbidden while running as root" >&2
    exit 2
  fi
  if [[ "$test_root" != /* || "$test_root" == "/" || "$test_root" == *"/../"* || "$test_root" == */.. || "$test_root" == *"/./"* || "$test_root" == */. ]]; then
    echo "PAPERBANANA_SG_EGRESS_TEST_ROOT must be a canonical absolute test root" >&2
    exit 2
  fi
  local canonical marker metadata file_type owner mode_bits
  canonical="$(cd -P -- "$test_root" 2>/dev/null && pwd -P)" || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT is not a usable test root" >&2; exit 2; }
  if [[ "$canonical" != "$test_root" || -L "$test_root" ]]; then
    echo "PAPERBANANA_SG_EGRESS_TEST_ROOT must not contain a symlink or non-canonical path" >&2
    exit 2
  fi
  marker="$test_root/.paperbanana-sg-egress-test-root"
  [[ -f "$marker" && ! -L "$marker" && "$(<"$marker")" == "paperbanana-sg-egress-test-root-v1" ]] || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT lacks the required fixture marker" >&2; exit 2; }
  for path in "$test_root" "$marker"; do
    metadata="$(stat -c '%F:%u:%a' -- "$path")" || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT metadata is unsafe" >&2; exit 2; }
    IFS=: read -r file_type owner mode_bits <<<"$metadata"
    [[ "$owner" == "$EUID" && "$mode_bits" =~ ^[0-7]{3,4}$ && $((8#$mode_bits & 0022)) -eq 0 ]] || { echo "PAPERBANANA_SG_EGRESS_TEST_ROOT fixture owner or permissions are unsafe" >&2; exit 2; }
  done
}
validate_test_root
host_path() { printf '%s%s' "$test_root" "$1"; }

if [[ "$mode" == "--apply" && "$EUID" -ne 0 && -z "$test_root" ]]; then
  echo "bootstrap-host.sh --apply must run as root" >&2
  exit 1
fi

source "$(host_path /etc/os-release)"
if [[ "${ID:-}" != "ubuntu" || "${VERSION_ID:-}" != "24.04" ]]; then
  echo "this asset supports Ubuntu 24.04 only" >&2
  exit 1
fi

if [[ "$mode" == "--dry-run" ]]; then
  echo "Would install WireGuard, Squid, Chrony and unattended upgrades; validate or create a 1GiB swapfile; and atomically harden SSH."
  echo "Would run the narrowly named HBR uninstaller only when present, then require hbrclient and hbrclientupdater to be inactive. Alibaba Cloud Aegis is retained."
  exit 0
fi

hbr_uninstaller="$(host_path /opt/alibabacloud/hbrclient/uninstall)"
if [[ -x "$hbr_uninstaller" ]]; then
  "$hbr_uninstaller"
fi
hbr_service_inactive_or_absent() {
  local unit="$1" status
  if systemctl is-active --quiet "$unit"; then
    return 1
  else
    status=$?
  fi
  case "$status" in
    3|4) return 0 ;;
    *)
      echo "cannot determine HBR state for $unit (systemctl query exited $status)" >&2
      return 2
      ;;
  esac
}
if hbr_service_inactive_or_absent hbrclient.service; then
  :
else
  status=$?
  if (( status == 1 )); then
    echo "hbrclient or hbrclientupdater remains active; refusing to continue" >&2
  fi
  exit "$status"
fi
if hbr_service_inactive_or_absent hbrclientupdater.service; then
  :
else
  status=$?
  if (( status == 1 )); then
    echo "hbrclient or hbrclientupdater remains active; refusing to continue" >&2
  fi
  exit "$status"
fi
if ! hbr_units="$(systemctl list-unit-files --no-legend)"; then
  echo "cannot determine whether HBR units are installed (systemctl query failed)" >&2
  exit 2
fi
if grep -Eq '^(hbrclient|hbrclientupdater)(\.service)?[[:space:]]' <<<"$hbr_units"; then
  echo "hbrclient or hbrclientupdater remains installed; refusing to continue" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends wireguard squid chrony unattended-upgrades

swapfile="$(host_path /swapfile)"
fstab="$(host_path /etc/fstab)"
swap_active=false
if swapon --noheadings --show=NAME | awk '{print $1}' | grep -Fxq "$swapfile"; then
  swap_active=true
fi
if [[ -e "$swapfile" ]]; then
  swap_size="$(stat -c %s "$swapfile")"
  swap_mode="$(stat -c %a "$swapfile")"
  swap_type="$(stat -c %F "$swapfile")"
  swap_owner="$(stat -c %u "$swapfile")"
  if [[ "$swap_size" != "1073741824" || "$swap_mode" != "600" || "$swap_type" != "regular file" || "$swap_owner" != "0" ]]; then
    echo "existing swapfile must be an exactly 1GiB, root-owned regular file with mode 0600; refusing to modify it" >&2
    exit 1
  fi
  if swap_signature="$(blkid -o value -s TYPE -- "$swapfile" 2>/dev/null)"; then :; else swap_signature=""; fi
  if [[ "$swap_signature" != "swap" ]]; then
    echo "existing swapfile is not formatted as swap; refusing to reuse it" >&2
    exit 1
  fi
else
  swap_candidate="$(mktemp "$(dirname -- "$swapfile")/.swapfile.paperbanana.XXXXXX")"
  cleanup_swap_candidate() { rm -f -- "$swap_candidate"; }
  trap cleanup_swap_candidate EXIT
  fallocate -l 1G "$swap_candidate"
  chmod 0600 "$swap_candidate"
  mkswap "$swap_candidate"
  mv -f -- "$swap_candidate" "$swapfile"
  trap - EXIT
fi
grep -Fqx '/swapfile none swap sw 0 0' "$fstab" || echo '/swapfile none swap sw 0 0' >> "$fstab"
if [[ "$swap_active" != true ]]; then
  swapon "$swapfile"
fi

sshd_dir="$(host_path /etc/ssh/sshd_config.d)"
sshd_config="$(host_path /etc/ssh/sshd_config)"
drop_in="$sshd_dir/00-paperbanana-sg-egress.conf"

fail_ecs_user_key_preflight() {
  echo "ecs-user authorized_keys preflight failed: $1" >&2
  exit 1
}

check_ecs_user_key_path() {
  local path="$1"
  local expected_type="$2"
  local allowed_owners="$3"
  local require_0600_or_stricter="$4"
  local metadata
  local file_type
  local owner
  local mode
  local extra
  local mode_value

  [[ ! -L "$path" ]] || fail_ecs_user_key_preflight "key path must not be a symlink"
  if ! metadata="$(stat -c '%F:%u:%a' -- "$path")"; then
    fail_ecs_user_key_preflight "could not inspect key path"
  fi
  IFS=: read -r file_type owner mode extra <<<"$metadata"
  if [[ -n "$extra" || "$file_type" != "$expected_type" || ! "$owner" =~ ^[0-9]+$ || ! "$mode" =~ ^[0-7]{3,4}$ ]]; then
    fail_ecs_user_key_preflight "key path metadata is unsafe"
  fi
  if [[ ":$allowed_owners:" != *":$owner:"* ]]; then
    fail_ecs_user_key_preflight "key path ownership is unsafe"
  fi
  mode_value=$((8#$mode))
  if (( mode_value & 0022 )); then
    fail_ecs_user_key_preflight "key path is group or world writable"
  fi
  if [[ "$require_0600_or_stricter" == true ]] && (( mode_value & ~0600 || !(mode_value & 0400) )); then
    fail_ecs_user_key_preflight "authorized_keys permissions must be 0600 or stricter"
  fi
}

ecs_user_record="$(getent passwd ecs-user)" || fail_ecs_user_key_preflight "could not query ecs-user"
IFS=: read -r ecs_user_name _ecs_user_password ecs_user_uid _ecs_user_gid _ecs_user_gecos ecs_user_home _ecs_user_shell ecs_user_extra <<<"$ecs_user_record"
if [[ "$ecs_user_name" != "ecs-user" || ! "$ecs_user_uid" =~ ^[0-9]+$ || -n "$ecs_user_extra" || "$ecs_user_home" != /* || "$ecs_user_home" == "/" || "$ecs_user_home" == *$'\n'* ]]; then
  fail_ecs_user_key_preflight "ecs-user account record is invalid"
fi
actual_ecs_user_uid="$(id -u ecs-user)" || fail_ecs_user_key_preflight "could not query ecs-user uid"
if [[ "$actual_ecs_user_uid" != "$ecs_user_uid" ]]; then
  fail_ecs_user_key_preflight "ecs-user uid lookup is inconsistent"
fi

ecs_user_ssh_dir="$ecs_user_home/.ssh"
ecs_user_authorized_keys="$ecs_user_ssh_dir/authorized_keys"
[[ -d "$ecs_user_home" ]] || fail_ecs_user_key_preflight "ecs-user home is not a directory"
[[ -d "$ecs_user_ssh_dir" ]] || fail_ecs_user_key_preflight "ecs-user .ssh is not a directory"
[[ -f "$ecs_user_authorized_keys" ]] || fail_ecs_user_key_preflight "ecs-user authorized_keys is not a regular file"
check_ecs_user_key_path "$ecs_user_home" directory "0:$ecs_user_uid" false
check_ecs_user_key_path "$ecs_user_ssh_dir" directory "0:$ecs_user_uid" false
check_ecs_user_key_path "$ecs_user_authorized_keys" "regular file" "0:$ecs_user_uid" true
if ! ssh-keygen -l -f "$ecs_user_authorized_keys" >/dev/null 2>&1; then
  fail_ecs_user_key_preflight "ecs-user authorized_keys has no valid public key"
fi

install -d -m 0755 "$sshd_dir"

backup="$sshd_dir/.00-paperbanana-sg-egress.backup.$$"
candidate="$(mktemp "$sshd_dir/.00-paperbanana-sg-egress.tmp.XXXXXX")"
had_previous=false
if [[ -e "$drop_in" ]]; then
  cp -p "$drop_in" "$backup"
  had_previous=true
fi
restore_drop_in() {
  if [[ "$had_previous" == true ]]; then
    mv -f -- "$backup" "$drop_in"
  else
    rm -f -- "$drop_in"
  fi
}
cat > "$candidate" <<'EOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
KbdInteractiveAuthentication no
AllowTcpForwarding no
MaxAuthTries 3
AllowUsers ecs-user
EOF
chmod 0644 "$candidate"
mv -f -- "$candidate" "$drop_in"

if ! sshd -t -f "$sshd_config"; then
  restore_drop_in
  echo "sshd syntax validation failed; restored the previous SSH drop-in" >&2
  exit 1
fi

# This dedicated host has one management identity and does not permit conditional
# SSH policy. A later Match can override a value from the early 00 drop-in.
ssh_policy_files=("$sshd_config")
for ssh_policy_file in "$sshd_dir"/*.conf; do
  [[ -e "$ssh_policy_file" ]] || continue
  ssh_policy_files+=("$ssh_policy_file")
done
if unsafe_directive="$(awk -v main_config="$sshd_config" '
  /^[[:space:]]*#/ || /^[[:space:]]*$/ { next }
  {
    key = tolower($1)
    if (key == "match") {
      print FILENAME ":" FNR ": Match"
      found = 1
      exit
    }
    if (key == "include" && (FILENAME != main_config || $2 != "/etc/ssh/sshd_config.d/*.conf" || NF != 2)) {
      print FILENAME ":" FNR ": Include"
      found = 1
      exit
    }
  }
  END { exit(found ? 0 : 1) }
' "${ssh_policy_files[@]}")"; then
  restore_drop_in
  echo "conditional Match or nonstandard Include directive ($unsafe_directive) can override SSH security; restored the previous SSH drop-in" >&2
  exit 1
fi

management_source=""
if [[ -n "${SSH_CONNECTION:-}" ]]; then
  read -r management_source _management_source_port _management_local_address _management_local_port _ <<<"$SSH_CONNECTION"
fi
management_source="${management_source:-${PAPERBANANA_SG_EGRESS_MANAGEMENT_SOURCE_IP:-}}"
if [[ -z "$management_source" || ! "$management_source" =~ ^[0-9A-Fa-f:.]+$ ]]; then
  restore_drop_in
  echo "could not determine the actual SSH management source IP; set PAPERBANANA_SG_EGRESS_MANAGEMENT_SOURCE_IP only from a verified console session" >&2
  exit 1
fi
actual_hostname="$(hostname -f 2>/dev/null || hostname)"
if [[ -z "$actual_hostname" || ! "$actual_hostname" =~ ^[A-Za-z0-9._-]+$ ]]; then
  restore_drop_in
  echo "could not determine a safe actual hostname for SSH policy validation" >&2
  exit 1
fi

protected_expectations=(
  'permitrootlogin no' \
  'passwordauthentication no' \
  'kbdinteractiveauthentication no' \
  'allowtcpforwarding no' \
  'maxauthtries 3' \
  'allowusers ecs-user'
)
validate_connection() {
  local user="$1"
  local address="$2"
  local match_connection="user=${user},host=${actual_hostname},addr=${address}"
  local effective
  local expected
  if ! effective="$(sshd -T -C "$match_connection" -f "$sshd_config")"; then
    restore_drop_in
    echo "could not read effective sshd policy for $match_connection; restored the previous SSH drop-in" >&2
    exit 1
  fi
  for expected in "${protected_expectations[@]}"; do
    if ! grep -Fqx "$expected" <<<"$effective"; then
      restore_drop_in
      echo "effective sshd policy is unsafe or overridden for $match_connection ($expected); restored the previous SSH drop-in" >&2
      exit 1
    fi
  done
  if [[ "$user" == "ecs-user" ]] && ! grep -Fqx 'pubkeyauthentication yes' <<<"$effective"; then
    restore_drop_in
    echo "effective sshd policy disables ecs-user public-key access for $match_connection; restored the previous SSH drop-in" >&2
    exit 1
  fi
  if [[ "$user" == "ecs-user" ]] && ! awk -v expected="$ecs_user_authorized_keys" -v home="$ecs_user_home" '
    $1 == "authorizedkeysfile" {
      found = 1
      if (NF != 2 || $2 == "none") { invalid = 1; next }
      if ($2 == ".ssh/authorized_keys") resolved = home "/.ssh/authorized_keys"
      else if ($2 == "%h/.ssh/authorized_keys") resolved = home "/.ssh/authorized_keys"
      else if (substr($2, 1, 1) == "/") resolved = $2
      else { invalid = 1; next }
      if (resolved != expected) invalid = 1
    }
    END { exit !(found && !invalid) }
  ' <<<"$effective"; then
    restore_drop_in
    echo "effective sshd policy has no usable AuthorizedKeysFile for ecs-user; restored the previous SSH drop-in" >&2
    exit 1
  fi
  if auth_methods="$(awk '$1 == "authenticationmethods" { print $2 }' <<<"$effective")"; then :; fi
  if [[ -n "$auth_methods" && "$auth_methods" != "any" && "$auth_methods" != "publickey" ]]; then
    restore_drop_in
    echo "effective sshd AuthenticationMethods is incompatible with publickey-only ecs-user access; restored the previous SSH drop-in" >&2
    exit 1
  fi
}

validate_connection ecs-user "$management_source"
validate_connection root "$management_source"
validate_connection ecs-user 127.0.0.1
validate_connection root 127.0.0.1
if ! systemctl reload ssh; then
  restore_drop_in
  if ! sshd -t -f "$sshd_config"; then
    echo "reload ssh failed and the restored SSH drop-in is syntactically invalid" >&2
    exit 1
  fi
  if ! systemctl reload ssh; then
    echo "reload ssh failed and the restored SSH drop-in could not be reloaded" >&2
    exit 1
  fi
  echo "reload ssh failed; restored and reloaded the previous SSH drop-in" >&2
  exit 1
fi
rm -f -- "$backup"

install -d -m 0750 "$(host_path /opt/paperbanana-sg-egress)"
echo "Singapore egress base host is ready. No provider credentials were created."
