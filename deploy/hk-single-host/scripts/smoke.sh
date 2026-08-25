#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd -- "$script_dir/.." && pwd)"
compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_dir/.env" -f "$deploy_dir/compose.yaml")
benchmark_enabled=false
if grep -Eq '^COMPOSE_PROFILES=[^#\r\n]*\bbenchmark\b' "$deploy_dir/.env"; then
  benchmark_enabled=true
fi

gateway_ready="$(curl --fail --silent --show-error http://127.0.0.1:13005/ready)"
if ! jq -e '
  .ok == true and
  .backend.ok == true and
  .backend.data.ready == true and
  (.backend.data.dependencies.providerEgress == "ready" or
   .backend.data.dependencies.providerEgress == "degraded")
' >/dev/null <<<"$gateway_ready"; then
  echo "Gateway readiness payload does not contain an authoritative Core readiness state" >&2
  exit 1
fi
curl --fail --silent --show-error http://127.0.0.1:13005/health >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3010/ >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3010/api/health >/dev/null

for service in mongodb paperbanana-api plot-worker; do
  if [[ -n "$("${compose[@]}" port "$service" 2>/dev/null)" ]]; then
    echo "$service unexpectedly publishes a host port" >&2
    exit 1
  fi
done

if [[ "$benchmark_enabled" == true ]]; then
  "${compose[@]}" ps --status running benchmark-worker | grep -q benchmark-worker
  benchmark_mode="$("${compose[@]}" exec -T benchmark-worker printenv PAPERBANANA_BENCH_ENABLED)"
  test "$benchmark_mode" = false || {
    echo "benchmark worker must remain discovery-only during bootstrap" >&2
    exit 1
  }
  "${compose[@]}" exec -T benchmark-worker node -e '
    const forbidden = [
      "PAPERBANANA_BENCH_BAILIAN_API_KEY",
      "PAPERBANANA_BENCH_OPENROUTER_API_KEY",
      "PAPERBANANA_BENCH_ARK_API_KEY",
      "PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID",
      "PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET",
      "PAPERBANANA_BENCH_OSS_BUCKET",
      "PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT",
      "PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT",
      "PAPERBANANA_BENCH_OSS_REGION",
    ]
    for (const name of forbidden) {
      if (process.env[name] !== undefined) process.exit(1)
    }
  ' || {
    echo "benchmark worker discovery container contains paid credential settings" >&2
    exit 1
  }
fi

"${compose[@]}" exec -T auth-gateway node -e '
  fetch("http://paperbanana-api:3000/paperbanana-api")
    .then(async (response) => {
      if (response.status !== 401) throw new Error(`expected core 401, got ${response.status}`)
    })
    .catch((error) => { console.error(error.message); process.exit(1) })
'

"${compose[@]}" exec -T auth-gateway node --input-type=module -e '
  import tls from "node:tls";
  const host = "dm.aliyuncs.com";
  const socket = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: true });
  const timeout = setTimeout(() => { socket.destroy(); process.exit(1); }, 5000);
  socket.once("secureConnect", () => { clearTimeout(timeout); socket.destroy(); process.exit(0); });
  socket.once("error", () => { clearTimeout(timeout); process.exit(1); });
'

if "${compose[@]}" exec -T auth-gateway node --input-type=module -e '
  import net from "node:net";
  const socket = net.connect({ host: "1.1.1.1", port: 443 });
  const timeout = setTimeout(() => { socket.destroy(); process.exit(1); }, 3000);
  socket.once("connect", () => { clearTimeout(timeout); socket.destroy(); process.exit(0); });
  socket.once("error", () => { clearTimeout(timeout); process.exit(1); });
'; then
  echo "auth gateway unexpectedly reached generic public HTTPS" >&2
  exit 1
fi

"${compose[@]}" exec -T paperbanana-api node -e '
  fetch("http://plot-worker:8000/health")
    .then(async (response) => {
      const body = await response.json()
      if (!response.ok || body.runtime !== "plot-worker") throw new Error("worker health failed")
    })
    .catch((error) => { console.error(error.message); process.exit(1) })
'

if "${compose[@]}" exec -T plot-worker python -c \
  'import socket; socket.create_connection(("172.29.0.20",3000),2)' >/dev/null 2>&1; then
  echo "plot worker initiated a forbidden connection to the core" >&2
  exit 1
fi

if "${compose[@]}" exec -T plot-worker python -c \
  'import socket; socket.create_connection(("1.1.1.1",443),2)' >/dev/null 2>&1; then
  echo "plot worker unexpectedly reached the public internet" >&2
  exit 1
fi

"$script_dir/transaction-smoke.sh"

echo "Local health, isolation, unauthorized-core, benchmark and OpenVac smoke checks passed."
