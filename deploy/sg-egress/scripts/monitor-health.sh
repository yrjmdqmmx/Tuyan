#!/usr/bin/env bash
# Managed by PaperBanana Singapore egress
set -Eeuo pipefail

usage() {
  echo "usage: $0 --host hk --wg-interface <Hong-Kong-interface>" >&2
  exit 2
}

host=""
wg_interface=""
while (( $# > 0 )); do
  case "$1" in
    --host)
      [[ $# -ge 2 ]] || usage
      host="$2"
      shift 2
      ;;
    --wg-interface)
      [[ $# -ge 2 ]] || usage
      wg_interface="$2"
      shift 2
      ;;
    *) usage ;;
  esac
done
[[ "$host" == "hk" && -n "$wg_interface" ]] || usage
[[ "$wg_interface" =~ ^[A-Za-z0-9_.-]{1,15}$ ]] || usage
if ! ip -4 addr show dev "$wg_interface" | awk '$1 == "inet" && $2 == "10.77.0.1/30" { found=1 } END { exit !found }'; then
  echo "Hong Kong monitor requires $wg_interface to own 10.77.0.1/30; refusing to run on Singapore" >&2
  exit 1
fi

max_handshake_age="${PAPERBANANA_SG_EGRESS_MAX_HANDSHAKE_AGE:-600}"
if [[ ! "$max_handshake_age" =~ ^[1-9][0-9]{0,3}$ ]]; then
  echo "PAPERBANANA_SG_EGRESS_MAX_HANDSHAKE_AGE must be a positive number of seconds" >&2
  exit 2
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
failures=()
record_failure() { failures+=("$1"); }

if ! handshake_output="$(wg show "$wg_interface" latest-handshakes)"; then
  record_failure "WireGuard interface $wg_interface is unavailable"
else
  handshake_count=0
  handshake_line=""
  while IFS= read -r line; do
    [[ -z "${line//[[:space:]]/}" ]] && continue
    handshake_count=$((handshake_count + 1))
    handshake_line="$line"
  done <<< "$handshake_output"
  if (( handshake_count != 1 )); then
    record_failure "WireGuard interface $wg_interface must have exactly one peer handshake record"
  else
    read -r peer_key handshake_at extra <<<"$handshake_line"
    if [[ -z "${peer_key:-}" || -n "${extra:-}" || ! "${handshake_at:-}" =~ ^[0-9]+$ || "$handshake_at" == "0" ]]; then
      record_failure "WireGuard handshake record is missing or malformed"
    else
      now="$(date +%s)"
      if (( handshake_at > now )); then
        record_failure "WireGuard handshake timestamp is in the future"
      elif (( now - handshake_at > max_handshake_age )); then
        record_failure "WireGuard handshake is stale (${now} - ${handshake_at} > ${max_handshake_age}s)"
      fi
    fi
  fi
fi

if ! "$script_dir/smoke.sh" --hk --wg-interface "$wg_interface"; then
  record_failure "Hong Kong provider proxy status probe failed"
fi

if (( ${#failures[@]} > 0 )); then
  summary="$(IFS='; '; echo "${failures[*]}")"
  logger -t paperbanana-sg-egress-health -- "health check failed: $summary"
  echo "PaperBanana Hong Kong egress health check failed: $summary" >&2
  exit 1
fi

logger -t paperbanana-sg-egress-health -- "Hong Kong health check passed"
echo "PaperBanana Hong Kong egress health check passed"
