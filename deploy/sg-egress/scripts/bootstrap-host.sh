#!/usr/bin/env bash
set -Eeuo pipefail

mode="${1:---dry-run}"
if [[ "$mode" != "--apply" && "$mode" != "--dry-run" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi
if [[ "$EUID" -ne 0 ]]; then
  echo "bootstrap-host.sh must run as root" >&2
  exit 1
fi

source /etc/os-release
if [[ "${ID:-}" != "ubuntu" || "${VERSION_ID:-}" != "24.04" ]]; then
  echo "this asset supports Ubuntu 24.04 only" >&2
  exit 1
fi

if [[ "$mode" == "--dry-run" ]]; then
  echo "Would install wireguard squid chrony unattended-upgrades, create an idempotent 1GiB swapfile, harden SSH, and prepare /opt/paperbanana-sg-egress."
  echo "Would run /opt/alibabacloud/hbrclient/uninstall only if it exists; Alibaba Cloud Aegis is retained."
  exit 0
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends wireguard squid chrony unattended-upgrades

if ! swapon --noheadings --show=NAME | awk '{print $1}' | grep -Fxq /swapfile; then
  if [[ ! -e /swapfile ]]; then
    fallocate -l 1G /swapfile
    chmod 0600 /swapfile
    mkswap /swapfile
  fi
  grep -Fqx '/swapfile none swap sw 0 0' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  swapon /swapfile
fi

install -d -m 0755 /etc/ssh/sshd_config.d
id -u ecs-user >/dev/null
install -m 0644 /dev/stdin /etc/ssh/sshd_config.d/90-paperbanana-sg-egress.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
AllowTcpForwarding no
MaxAuthTries 3
AllowUsers ecs-user
EOF
sshd -t
systemctl reload ssh

# Deliberately do not remove or disable Alibaba Cloud Aegis.
if [[ -x /opt/alibabacloud/hbrclient/uninstall ]]; then
  /opt/alibabacloud/hbrclient/uninstall
  if systemctl list-unit-files --no-legend | awk '{print $1}' | grep -Eqi '(^|[-_])hbr'; then
    echo "HBR unit files remain after uninstall" >&2
    exit 1
  fi
  if systemctl list-units --all --no-legend | awk '{print $1}' | grep -Eqi '(^|[-_])hbr'; then
    echo "HBR units remain active after uninstall" >&2
    exit 1
  fi
fi

install -d -m 0750 -o root -g root /opt/paperbanana-sg-egress
echo "Singapore egress base host is ready. No provider credentials were created."
