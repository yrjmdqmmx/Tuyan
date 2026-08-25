#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd -- "$script_dir/.." && pwd)"
control_dir="/opt/paperbanana/control"
maintenance_file="$control_dir/maintenance"
compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_dir/.env" -f "$deploy_dir/compose.yaml")
mode="${1:---dry-run}"

if [[ "$mode" != "--apply" && "$mode" != "--dry-run" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi

required=(
  "$deploy_dir/.env"
  /opt/paperbanana/secrets/gateway.env
  /opt/paperbanana/secrets/core.env
  /opt/paperbanana/secrets/worker.env
  /opt/paperbanana/secrets/mongo-root-password
  /opt/paperbanana/secrets/mongo-auth-password
  /opt/paperbanana/secrets/mongo-business-password
  /opt/paperbanana/secrets/mongo-bench-api-password
  /opt/paperbanana/secrets/mongo-keyfile
)
benchmark_enabled=false
if grep -Eq '^COMPOSE_PROFILES=[^#\r\n]*\bbenchmark\b' "$deploy_dir/.env"; then
  benchmark_enabled=true
  required+=(
    /opt/paperbanana/secrets/bench.env
    /opt/paperbanana/secrets/mongo-bench-password
    /opt/paperbanana/secrets/mongo-bench-api-password
  )
fi
benchmark_secret_mode_count="$(awk -F= '$1 == "PAPERBANANA_BENCH_SECRET_MODE" { count++ } END { print count + 0 }' "$deploy_dir/.env")"
test "$benchmark_secret_mode_count" = 1 || {
  echo "deployment requires exactly one PAPERBANANA_BENCH_SECRET_MODE" >&2
  exit 1
}
benchmark_secret_mode="$(awk -F= '$1 == "PAPERBANANA_BENCH_SECRET_MODE" { print substr($0, index($0, "=") + 1) }' "$deploy_dir/.env")"
[[ "$benchmark_secret_mode" == discovery-only || "$benchmark_secret_mode" == configured-disabled ]] || {
  echo "invalid PAPERBANANA_BENCH_SECRET_MODE; expected discovery-only or configured-disabled" >&2
  exit 1
}
for path in "${required[@]}"; do
  test -r "$path" || { echo "missing required deployment file: $path" >&2; exit 1; }
done

"${compose[@]}" config --quiet

if [[ "$mode" == "--dry-run" ]]; then
  echo "Validated paperbanana-hk Compose configuration."
  "${compose[@]}" config --images
  echo "Run with --apply to enter maintenance mode, pull and recreate this project only."
  exit 0
fi

install -d -m 0750 -o 0 -g 1000 "$control_dir"
install -m 0640 -o 0 -g 1000 /dev/null "$maintenance_file"

deployment_succeeded=false
finish() {
  if [[ "$deployment_succeeded" == true ]]; then
    rm -f "$maintenance_file"
  else
    echo "deployment did not complete; maintenance mode remains enabled: $maintenance_file" >&2
  fi
}
trap finish EXIT

if [[ "${PAPERBANANA_SKIP_PULL:-false}" != true ]]; then
  "${compose[@]}" pull --quiet
fi
"$script_dir/install-worker-firewall.sh"
"$script_dir/install-directmail-egress-timer.sh" --apply
"${compose[@]}" up -d --remove-orphans --wait --wait-timeout 1800
"$script_dir/install-worker-firewall.sh"
"$script_dir/sync-reference-metadata.sh"
"$script_dir/smoke.sh"

deployment_succeeded=true
echo "paperbanana-hk deployment is healthy; maintenance mode will be cleared."
