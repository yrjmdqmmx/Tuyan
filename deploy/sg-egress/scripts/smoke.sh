#!/usr/bin/env bash
# Managed by PaperBanana Singapore egress
set -Eeuo pipefail

proxy_url="${PAPERBANANA_SG_EGRESS_PROXY:-http://10.77.0.2:3128}"
wg_interface="${PAPERBANANA_SG_EGRESS_WG_INTERFACE:-pbhk0}"
while (( $# > 0 )); do
  case "$1" in
    --hk)
      shift
      ;;
    --wg-interface)
      [[ $# -ge 2 ]] || { echo "--wg-interface requires a value" >&2; exit 2; }
      wg_interface="$2"
      shift 2
      ;;
    *)
      echo "usage: $0 [--hk] [--wg-interface pbhk0]" >&2
      exit 2
      ;;
  esac
done
if [[ ! "$wg_interface" =~ ^[A-Za-z0-9_.-]{1,15}$ ]]; then
  echo "WireGuard interface name is invalid" >&2
  exit 2
fi

run_proxy_curl() {
  local url="$1"
  curl --noproxy '' --proxy "$proxy_url" --connect-timeout 10 --max-time 20 \
    --output /dev/null --silent --show-error --write-out '%{http_code}:%{http_connect}' "$url"
}

proxy_result() {
  local url="$1"
  local status
  local curl_status
  if status="$(run_proxy_curl "$url")"; then
    curl_status=0
  else
    curl_status=$?
  fi
  if [[ ! "$status" =~ ^[0-9]{3}:[0-9]{3}$ ]]; then
    status=000:000
  fi
  printf '%s:%s\n' "$curl_status" "$status"
}

expect_status() {
  local label="$1"
  local url="$2"
  local expected="$3"
  local result curl_status actual connect_status
  result="$(proxy_result "$url")"
  curl_status="${result%%:*}"
  actual="${result#*:}"
  connect_status="${actual##*:}"
  actual="${actual%%:*}"
  if [[ "$curl_status" != "0" || "$connect_status" != "200" || "$actual" != "$expected" ]]; then
    echo "$label expected CONNECT 200 then HTTP $expected through the egress proxy, got CONNECT $connect_status / HTTP $actual (curl exit $curl_status)" >&2
    exit 1
  fi
}

expect_proxy_rejection() {
  local label="$1"
  local url="$2"
  local result curl_status actual connect_status
  result="$(proxy_result "$url")"
  curl_status="${result%%:*}"
  actual="${result#*:}"
  connect_status="${actual##*:}"
  if [[ "$connect_status" != "403" ]]; then
    echo "$label expected proxy rejection 403, got CONNECT $connect_status / HTTP ${actual%%:*} (curl exit $curl_status)" >&2
    exit 1
  fi
}

# This script runs on Hong Kong after its pbhk0 peer is up.
# It intentionally never checks a local Squid service; reachability is proven by CONNECT via 10.77.0.2.
wg show "$wg_interface" >/dev/null

# These are unauthenticated metadata/status requests; no API key or billable generation request is used.
expect_status "OpenAI" "https://api.openai.com/v1/models" "401"
expect_status "Gemini" "https://generativelanguage.googleapis.com/v1beta/models" "403"
expect_status "OpenRouter" "https://openrouter.ai/api/v1/models" "200"
expect_proxy_rejection "unapproved hostname" "https://example.com/"
expect_proxy_rejection "IPv4 literal" "https://192.0.2.1/"
expect_proxy_rejection "non-443 port" "https://api.openai.com:444/"

echo "Hong Kong WireGuard egress smoke passed: expected provider statuses and explicit proxy rejects confirmed."
