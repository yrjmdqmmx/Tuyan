#!/usr/bin/env bash
set -Eeuo pipefail

proxy_url="${PAPERBANANA_SG_EGRESS_PROXY:-http://10.77.0.2:3128}"

proxy_status() {
  curl --noproxy '' --proxy "$proxy_url" --connect-timeout 10 --max-time 20 \
    --output /dev/null --silent --show-error --write-out '%{http_code}' "$1"
}

expect_status() {
  local label="$1"
  local url="$2"
  local expected="$3"
  local actual
  actual="$(proxy_status "$url")"
  if [[ "$actual" != "$expected" ]]; then
    echo "$label expected HTTP $expected through the egress proxy, got $actual" >&2
    exit 1
  fi
}

expect_rejected() {
  local label="$1"
  local url="$2"
  local actual
  actual="$(proxy_status "$url")"
  if [[ "$actual" == "200" || "$actual" == "000" ]]; then
    echo "$label was not explicitly rejected by the egress proxy (HTTP $actual)" >&2
    exit 1
  fi
}

wg show wg0 >/dev/null
systemctl is-active --quiet squid

# These are unauthenticated metadata/status requests; no API key or billable generation request is used.
expect_status "OpenAI" "https://api.openai.com/v1/models" "401"
expect_status "Gemini" "https://generativelanguage.googleapis.com/v1beta/models" "403"
expect_status "OpenRouter" "https://openrouter.ai/api/v1/models" "200"
expect_rejected "unapproved hostname" "https://example.com/"
expect_rejected "IP literal" "https://1.1.1.1/"
expect_rejected "non-443 port" "https://api.openai.com:444/"

echo "Singapore egress smoke passed: expected provider status codes and deny boundary confirmed."
