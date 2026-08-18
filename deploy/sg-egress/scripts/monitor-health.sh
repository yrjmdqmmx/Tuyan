#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
failures=()
record_failure() { failures+=("$1"); }

if ! wg show pbsg0 >/dev/null 2>&1; then
  record_failure "pbsg0 is unavailable"
fi
if ! systemctl is-active --quiet squid; then
  record_failure "squid is inactive"
fi
if ! ss -lntH 'sport = :3128' | awk '
  $4 == "10.77.0.2:3128" { expected++; next }
  $4 ~ /:3128$/ { unexpected++ }
  END { exit !(expected == 1 && unexpected == 0) }
'; then
  record_failure "Squid is not restricted to 10.77.0.2:3128"
fi
if ! "$script_dir/smoke.sh" --sg-monitor; then
  record_failure "provider proxy status probe failed"
fi

if (( ${#failures[@]} > 0 )); then
  summary="$(IFS='; '; echo "${failures[*]}")"
  logger -t paperbanana-sg-egress-health -- "health check failed: $summary"
  echo "PaperBanana Singapore egress health check failed: $summary" >&2
  exit 1
fi

logger -t paperbanana-sg-egress-health -- "health check passed"
echo "PaperBanana Singapore egress health check passed"
