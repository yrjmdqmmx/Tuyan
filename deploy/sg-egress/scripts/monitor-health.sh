#!/usr/bin/env bash
set -Eeuo pipefail

failures=()
record_failure() { failures+=("$1"); }

if ! wg show wg0 >/dev/null 2>&1; then
  record_failure "wg0 is unavailable"
fi
if ! systemctl is-active --quiet squid; then
  record_failure "squid is inactive"
fi
if ! ss -lntH 'sport = :3128' | awk '$4 == "10.77.0.2:3128" { found=1 } END { exit !found }'; then
  record_failure "Squid is not restricted to 10.77.0.2:3128"
fi

if (( ${#failures[@]} > 0 )); then
  summary="$(IFS='; '; echo "${failures[*]}")"
  logger -t paperbanana-sg-egress-health -- "health check failed: $summary"
  echo "PaperBanana Singapore egress health check failed: $summary" >&2
  exit 1
fi

logger -t paperbanana-sg-egress-health -- "health check passed"
echo "PaperBanana Singapore egress health check passed"
