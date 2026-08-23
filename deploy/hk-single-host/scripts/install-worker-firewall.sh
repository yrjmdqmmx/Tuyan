#!/usr/bin/env bash
set -Eeuo pipefail

worker_source="172.29.0.30/32"
gateway_source="172.31.0.10/32"
directmail_host="dm.aliyuncs.com"
legacy_chain="PAPERBANANA-EGRESS"
chain_a="PAPERBANANA-EGRESS-A"
chain_b="PAPERBANANA-EGRESS-B"
lock_file="/run/lock/paperbanana-egress-firewall.lock"

require_root() {
  test "${EUID}" -eq 0 || { echo "run as root" >&2; return 1; }
}

require_commands() {
  local command_name
  for command_name in iptables modprobe getent python3 flock; do
    command -v "$command_name" >/dev/null || {
      echo "$command_name is required" >&2
      return 1
    }
  done
}

acquire_update_lock() {
  exec 9>"$lock_file"
  flock -x 9
}

resolve_directmail_ips() {
  local resolved_output directmail_ip
  # Resolve and validate the complete destination set before touching either
  # active jump. A transient DNS failure preserves the last known-good rules.
  if ! resolved_output="$(
    getent ahostsv4 "$directmail_host" \
      | awk '$2 == "STREAM" { print $1 }' \
      | sort -u
  )"; then
    echo "DirectMail DNS resolution failed" >&2
    return 1
  fi
  directmail_ips=()
  while IFS= read -r directmail_ip; do
    [[ -n "$directmail_ip" ]] && directmail_ips+=("$directmail_ip")
  done <<< "$resolved_output"
  if (( ${#directmail_ips[@]} == 0 || ${#directmail_ips[@]} > 32 )); then
    echo "DirectMail DNS returned an invalid address count" >&2
    return 1
  fi
  python3 - "${directmail_ips[@]}" <<'PY'
import ipaddress
import sys

for value in sys.argv[1:]:
    address = ipaddress.ip_address(value)
    if address.version != 4 or not address.is_global:
        raise SystemExit("DirectMail DNS returned a non-public IPv4 address")
PY
}

prepare_bridge_filtering() {
  # Docker bridge traffic does not traverse DOCKER-USER until br_netfilter is
  # loaded. Persist both prerequisites so the isolation survives host reboots.
  modprobe br_netfilter
  install -m 0644 /dev/stdin /etc/modules-load.d/paperbanana.conf <<'EOF'
br_netfilter
EOF
  install -m 0644 /dev/stdin /etc/sysctl.d/99-paperbanana-bridge.conf <<'EOF'
net.bridge.bridge-nf-call-iptables=1
net.bridge.bridge-nf-call-ip6tables=1
EOF
  sysctl -q -w net.bridge.bridge-nf-call-iptables=1 net.bridge.bridge-nf-call-ip6tables=1
}

first_active_chain() {
  iptables -S DOCKER-USER 2>/dev/null \
    | awk -v a="$chain_a" -v b="$chain_b" -v legacy="$legacy_chain" '
        $1 == "-A" && $2 == "DOCKER-USER" {
          for (field_index = 3; field_index < NF; field_index += 1) {
            if ($field_index == "-j" && ($(field_index + 1) == a || $(field_index + 1) == b || $(field_index + 1) == legacy)) {
              print $(field_index + 1)
              exit
            }
          }
        }
      '
}

remove_jump() {
  local target="$1"
  while iptables -C DOCKER-USER -j "$target" 2>/dev/null; do
    iptables -D DOCKER-USER -j "$target"
  done
}

swap_firewall_rules() {
  local active_chain staging_chain directmail_ip obsolete_chain
  active_chain="$(first_active_chain)"
  if [[ "$active_chain" == "$chain_a" ]]; then
    staging_chain="$chain_b"
  else
    staging_chain="$chain_a"
  fi

  # The staging chain is never referenced while it is rebuilt. Once complete,
  # a single inserted jump makes it authoritative before old jumps are removed.
  # A crash at any point leaves at least one complete restrictive chain.
  remove_jump "$staging_chain"
  iptables -N "$staging_chain" 2>/dev/null || true
  iptables -F "$staging_chain"

  iptables -A "$staging_chain" -s "$worker_source" -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  iptables -A "$staging_chain" -s "$worker_source" -m conntrack --ctstate NEW -j REJECT
  iptables -A "$staging_chain" -s "$worker_source" -j REJECT

  iptables -A "$staging_chain" -s "$gateway_source" -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  for directmail_ip in "${directmail_ips[@]}"; do
    iptables -A "$staging_chain" -s "$gateway_source" -d "$directmail_ip" -p tcp --dport 443 -m conntrack --ctstate NEW -j ACCEPT
  done
  iptables -A "$staging_chain" -s "$gateway_source" -m conntrack --ctstate NEW -j REJECT
  iptables -A "$staging_chain" -s "$gateway_source" -j REJECT

  iptables -I DOCKER-USER 1 -j "$staging_chain"
  for obsolete_chain in "$legacy_chain" "$chain_a" "$chain_b"; do
    if [[ "$obsolete_chain" != "$staging_chain" ]]; then
      remove_jump "$obsolete_chain"
    fi
  done
}

persist_rules() {
  if command -v netfilter-persistent >/dev/null; then
    netfilter-persistent save >/dev/null
  else
    echo "warning: netfilter-persistent is not installed; rules will not survive reboot" >&2
  fi
}

main() {
  local mode="${1:---apply}"
  if [[ "$mode" != "--apply" && "$mode" != "--refresh" ]]; then
    echo "usage: $0 [--apply|--refresh]" >&2
    return 2
  fi
  require_root
  require_commands
  acquire_update_lock
  resolve_directmail_ips
  prepare_bridge_filtering
  swap_firewall_rules
  if [[ "$mode" == "--apply" ]]; then
    persist_rules
  fi

  echo "Worker isolation and DirectMail-only gateway egress rules installed."
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
