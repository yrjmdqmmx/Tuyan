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
if systemctl is-active --quiet hbrclient.service || systemctl is-active --quiet hbrclientupdater.service; then
  echo "hbrclient or hbrclientupdater remains active; refusing to continue" >&2
  exit 1
fi
if systemctl list-unit-files --no-legend | awk '{print $1}' | grep -Eq '^(hbrclient|hbrclientupdater)(\.service)?$'; then
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
else
  fallocate -l 1G "$swapfile"
  chmod 0600 "$swapfile"
  mkswap "$swapfile"
fi
grep -Fqx '/swapfile none swap sw 0 0' "$fstab" || echo '/swapfile none swap sw 0 0' >> "$fstab"
if [[ "$swap_active" != true ]]; then
  swapon "$swapfile"
fi

sshd_dir="$(host_path /etc/ssh/sshd_config.d)"
sshd_config="$(host_path /etc/ssh/sshd_config)"
drop_in="$sshd_dir/00-paperbanana-sg-egress.conf"
install -d -m 0755 "$sshd_dir"
id -u ecs-user >/dev/null

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
match_connection='user=ecs-user,host=localhost,addr=127.0.0.1'
if ! effective="$(sshd -T -C "$match_connection" -f "$sshd_config")"; then
  restore_drop_in
  echo "could not read effective sshd policy; restored the previous SSH drop-in" >&2
  exit 1
fi
for expected in \
  'permitrootlogin no' \
  'passwordauthentication no' \
  'pubkeyauthentication yes' \
  'kbdinteractiveauthentication no' \
  'allowtcpforwarding no' \
  'maxauthtries 3' \
  'allowusers ecs-user'
do
  if ! grep -Fqx "$expected" <<<"$effective"; then
    restore_drop_in
    echo "effective sshd policy is unsafe or overridden ($expected); restored the previous SSH drop-in" >&2
    exit 1
  fi
done
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
