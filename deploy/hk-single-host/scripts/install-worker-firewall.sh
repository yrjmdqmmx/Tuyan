#!/usr/bin/env bash
set -Eeuo pipefail

restricted_sources=(
  "172.29.0.30/32"
  "172.31.0.10/32"
)
chain="PAPERBANANA-EGRESS"

test "${EUID}" -eq 0 || { echo "run as root" >&2; exit 1; }
command -v iptables >/dev/null || { echo "iptables is required" >&2; exit 1; }

iptables -N "$chain" 2>/dev/null || true
iptables -F "$chain"
for source in "${restricted_sources[@]}"; do
  iptables -A "$chain" -s "$source" -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  iptables -A "$chain" -s "$source" -m conntrack --ctstate NEW -j REJECT
  iptables -A "$chain" -s "$source" -j REJECT
done

iptables -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -I DOCKER-USER 1 -j "$chain"

if command -v netfilter-persistent >/dev/null; then
  netfilter-persistent save >/dev/null
else
  echo "warning: netfilter-persistent is not installed; rules will not survive reboot" >&2
fi

echo "Worker and gateway egress firewall rules installed."
