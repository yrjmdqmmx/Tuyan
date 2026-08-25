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

shared_lock_path="/run/lock/paperbanana-hk-production.lock"
deploy_guard_test_root="${PAPERBANANA_HK_DEPLOY_TEST_ROOT:-}"
validate_deploy_test_root() {
  [[ -n "$deploy_guard_test_root" ]] || return 0
  if (( EUID == 0 )); then
    echo "PAPERBANANA_HK_DEPLOY_TEST_ROOT is forbidden while running as root" >&2
    return 1
  fi
  case "$deploy_guard_test_root" in
    /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;;
    *) echo "deployment guard test root must be temporary" >&2; return 1 ;;
  esac
  local canonical marker
  canonical="$(cd -P -- "$deploy_guard_test_root" 2>/dev/null && pwd -P)" || return 1
  [[ "$canonical" == "$deploy_guard_test_root" && ! -L "$deploy_guard_test_root" ]] || return 1
  marker="$deploy_guard_test_root/.paperbanana-hk-test-root"
  [[ -f "$marker" && ! -L "$marker" && "$(<"$marker")" == "paperbanana-hk-test-root-v1" ]]
}

validate_shared_lock_guard() {
  local shared_lock_fd expected_lock_path actual_lock_path
  shared_lock_fd="${PAPERBANANA_HK_SHARED_LOCK_FD:-}"
  [[ "$shared_lock_fd" =~ ^[0-9]+$ && "$shared_lock_fd" -ge 3 ]] || {
    echo "direct deploy apply is forbidden; use apply-staged-deployment.sh with the shared host lock" >&2
    return 1
  }
  expected_lock_path="$shared_lock_path"
  if [[ -n "$deploy_guard_test_root" ]]; then
    validate_deploy_test_root || {
      echo "deployment shared-lock test root is invalid" >&2
      return 1
    }
    expected_lock_path="$deploy_guard_test_root$shared_lock_path"
    actual_lock_path="$(lsof -a -p "$$" -d "$shared_lock_fd" -Fn 2>/dev/null | awk '/^n/ { print substr($0, 2); exit }')"
  else
    [[ -e "/proc/$$/fd/$shared_lock_fd" ]] || {
      echo "deployment shared-lock descriptor is not open" >&2
      return 1
    }
    actual_lock_path="$(readlink "/proc/$$/fd/$shared_lock_fd")"
  fi
  [[ "$actual_lock_path" == "$expected_lock_path" ]] || {
    echo "deployment shared-lock descriptor points to the wrong path" >&2
    return 1
  }
  if command -v flock >/dev/null 2>&1; then
    flock -n "$shared_lock_fd" || {
      echo "deployment shared-lock descriptor is not locked by this operation" >&2
      return 1
    }
  elif [[ -n "$deploy_guard_test_root" ]]; then
    [[ -d "${expected_lock_path}.d" ]] || {
      echo "portable deployment test lock is not held" >&2
      return 1
    }
  else
    echo "flock is required to validate the production deployment lock" >&2
    return 1
  fi
}

if [[ "$mode" == "--apply" ]]; then
  validate_shared_lock_guard
fi
if [[ "${PAPERBANANA_HK_DEPLOY_GUARD_TEST_MODE:-false}" == true ]]; then
  [[ "$mode" == "--apply" && -n "$deploy_guard_test_root" ]] || {
    echo "deployment guard test mode requires a temporary apply fixture" >&2
    exit 2
  }
  exit 0
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
  echo "To apply, use apply-staged-deployment.sh with a randomized staged image lock and exact code SHA."
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
