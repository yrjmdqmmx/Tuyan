#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

usage() {
  echo "usage: $0 --bundle PATH --expected-sha 40_HEX_SHA [--dry-run|--apply]" >&2
  exit 2
}

operation="--dry-run"
bundle=""
expected_sha=""
while (( $# > 0 )); do
  case "$1" in
    --apply|--dry-run)
      operation="$1"
      shift
      ;;
    --bundle)
      [[ $# -ge 2 ]] || usage
      bundle="$2"
      shift 2
      ;;
    --expected-sha)
      [[ $# -ge 2 ]] || usage
      expected_sha="$2"
      shift 2
      ;;
    *) usage ;;
  esac
done

[[ -n "$bundle" && "$expected_sha" =~ ^[0-9a-f]{40}$ ]] || usage

test_root="${PAPERBANANA_HK_TEST_ROOT:-}"
validate_test_root() {
  [[ -n "$test_root" ]] || return 0
  if (( EUID == 0 )); then
    echo "PAPERBANANA_HK_TEST_ROOT is forbidden while running as root" >&2
    exit 2
  fi
  if [[ "$test_root" != /* || "$test_root" == "/" || "$test_root" == *"/../"* || "$test_root" == */.. || "$test_root" == *"/./"* || "$test_root" == */. ]]; then
    echo "PAPERBANANA_HK_TEST_ROOT must be a canonical absolute test root" >&2
    exit 2
  fi
  local canonical marker
  canonical="$(cd -P -- "$test_root" 2>/dev/null && pwd -P)" || {
    echo "PAPERBANANA_HK_TEST_ROOT is not usable" >&2
    exit 2
  }
  [[ "$canonical" == "$test_root" && ! -L "$test_root" ]] || {
    echo "PAPERBANANA_HK_TEST_ROOT must not be a symlink or non-canonical path" >&2
    exit 2
  }
  marker="$test_root/.paperbanana-hk-test-root"
  [[ -f "$marker" && ! -L "$marker" && "$(<"$marker")" == "paperbanana-hk-test-root-v1" ]] || {
    echo "PAPERBANANA_HK_TEST_ROOT lacks the required fixture marker" >&2
    exit 2
  }
}
validate_test_root

if [[ -z "$test_root" && "$EUID" -ne 0 ]]; then
  echo "configure-benchmark-credentials.sh must run as root" >&2
  exit 1
fi

host_path() { printf '%s%s' "$test_root" "$1"; }
secret_dir="$(host_path /opt/paperbanana/secrets)"
deploy_dir="$(host_path /opt/paperbanana/repo/deploy/hk-single-host)"
core_env="$secret_dir/core.env"
bench_env="$secret_dir/bench.env"
deploy_env="$deploy_dir/.env"
lock_path="$(host_path /run/lock/paperbanana-benchmark-credentials.lock)"

if [[ -n "$test_root" ]]; then
  [[ "$bundle" == "$test_root"/tmp/paperbanana-bench-credentials-* ]] || {
    echo "test credential bundle must use the fixture temporary staging directory" >&2
    exit 1
  }
else
  [[ "$bundle" == /tmp/paperbanana-bench-credentials-* ]] || {
    echo "production credential bundle must use the dedicated temporary staging path" >&2
    exit 1
  }
fi

stat_triplet() {
  stat -c '%u:%g:%a' -- "$1" 2>/dev/null || stat -f '%u:%g:%Lp' -- "$1"
}

validate_protected_file() {
  local path="$1" label="$2" metadata owner_id group_id mode_bits expected_owner
  [[ -f "$path" && ! -L "$path" ]] || {
    echo "$label must be an existing regular file and must not be a symlink" >&2
    return 1
  }
  metadata="$(stat_triplet "$path")" || {
    echo "cannot inspect $label ownership and mode" >&2
    return 1
  }
  IFS=: read -r owner_id group_id mode_bits <<<"$metadata"
  [[ "$owner_id" =~ ^[0-9]+$ && "$group_id" =~ ^[0-9]+$ && "$mode_bits" =~ ^[0-7]{3,4}$ ]] || {
    echo "$label ownership or mode is invalid" >&2
    return 1
  }
  expected_owner=0
  [[ -n "$test_root" ]] && expected_owner="$EUID"
  [[ "$owner_id" == "$expected_owner" && $((8#$mode_bits & 0077)) -eq 0 && $((8#$mode_bits & 0400)) -ne 0 ]] || {
    echo "$label must be owner-readable and owner-only" >&2
    return 1
  }
}

validate_env_syntax() {
  local path="$1"
  if LC_ALL=C grep -q $'\r' "$path"; then return 1; fi
  awk '
    /^[[:space:]]*$/ || /^[[:space:]]*#/ { next }
    /^[A-Za-z_][A-Za-z0-9_]*=.*/ {
      key=$0
      sub(/=.*/, "", key)
      seen[key]++
      next
    }
    { invalid=1 }
    END {
      if (invalid) exit 10
      for (key in seen) if (seen[key] != 1) exit 11
    }
  ' "$path"
}

validate_bundle() {
  local path="$1"
  if LC_ALL=C grep -q $'\r' "$path"; then return 1; fi
  awk '
    BEGIN {
      required["PAPERBANANA_BENCH_BAILIAN_API_KEY"]=1
      required["PAPERBANANA_BENCH_OPENROUTER_API_KEY"]=1
      required["PAPERBANANA_BENCH_ARK_API_KEY"]=1
      required["PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID"]=1
      required["PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET"]=1
      required["PAPERBANANA_BENCH_OSS_BUCKET"]=1
      required["PAPERBANANA_BENCH_OSS_REGION"]=1
      required["PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT"]=1
      required["PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT"]=1
    }
    /^[A-Z_][A-Z0-9_]*=.+$/ {
      key=$0
      sub(/=.*/, "", key)
      if (!(key in required)) exit 12
      seen[key]++
      next
    }
    { exit 13 }
    END {
      for (key in required) if (seen[key] != 1) exit 14
    }
  ' "$path"
}

read_env_value() {
  local path="$1" key="$2"
  awk -v key="$key" '$0 ~ ("^" key "=") { print substr($0, index($0, "=") + 1) }' "$path"
}

require_nonempty() {
  local path="$1" key="$2" label="$3" value
  value="$(read_env_value "$path" "$key")"
  [[ -n "$value" ]] || {
    echo "$label is missing a required benchmark foundation field" >&2
    return 1
  }
}

validate_all() {
  local core_sha bench_sha worker_enabled deploy_mode core_token bench_token
  validate_protected_file "$core_env" core.env || return 1
  validate_protected_file "$bench_env" bench.env || return 1
  validate_protected_file "$deploy_env" deployment-mode-metadata || return 1
  validate_protected_file "$bundle" staged-credential-bundle || return 1

  validate_env_syntax "$core_env" || {
    echo "existing core.env is invalid; no changes were made" >&2
    return 1
  }
  validate_env_syntax "$bench_env" || {
    echo "existing bench.env is invalid; no changes were made" >&2
    return 1
  }
  validate_env_syntax "$deploy_env" || {
    echo "existing deployment mode metadata is invalid; no changes were made" >&2
    return 1
  }
  validate_bundle "$bundle" || {
    echo "staged benchmark credential bundle is invalid; values were not printed" >&2
    return 1
  }

  core_sha="$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)"
  bench_sha="$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)"
  [[ "$core_sha" == "$expected_sha" && "$bench_sha" == "$expected_sha" && "$core_sha" == "$bench_sha" ]] || {
    echo "core.env and bench.env must contain the expected identical deployed commit SHA" >&2
    return 1
  }

  for key in \
    PAPERBANANA_ADMIN_TRANSPORT_TOKEN \
    PAPERBANANA_BENCH_DISCOVERY_TOKEN \
    PAPERBANANA_BENCH_API_ENABLED \
    PAPERBANANA_BENCH_MONGODB_URI \
    PAPERBANANA_BENCH_MONGO_DB \
    PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET; do
    require_nonempty "$core_env" "$key" core.env || return 1
  done
  for key in \
    PAPERBANANA_BENCH_ENABLED \
    PAPERBANANA_BENCH_MONGODB_URI \
    PAPERBANANA_BENCH_MONGO_DB \
    PAPERBANANA_BENCH_DISCOVERY_TOKEN; do
    require_nonempty "$bench_env" "$key" bench.env || return 1
  done
  core_token="$(read_env_value "$core_env" PAPERBANANA_BENCH_DISCOVERY_TOKEN)"
  bench_token="$(read_env_value "$bench_env" PAPERBANANA_BENCH_DISCOVERY_TOKEN)"
  [[ "$core_token" == "$bench_token" ]] || {
    echo "benchmark discovery token differs between production services" >&2
    return 1
  }
  worker_enabled="$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)"
  [[ "$worker_enabled" == false ]] || {
    echo "benchmark worker must already be disabled before credential activation" >&2
    return 1
  }
  deploy_mode="$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)"
  [[ "$deploy_mode" == discovery-only || "$deploy_mode" == configured-disabled ]] || {
    echo "benchmark deployment mode metadata must be discovery-only or configured-disabled" >&2
    return 1
  }
}

build_core_candidate() {
  local output="$1"
  awk '
    FNR == NR {
      key=$0
      sub(/=.*/, "", key)
      values[key]=substr($0, index($0, "=") + 1)
      next
    }
    function managed(key) {
      return key == "PAPERBANANA_BENCH_API_ENABLED" ||
        key == "PAPERBANANA_BENCH_BAILIAN_API_KEY" ||
        key == "PAPERBANANA_BENCH_OPENROUTER_API_KEY" ||
        key == "PAPERBANANA_BENCH_ARK_API_KEY" ||
        key == "PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID" ||
        key == "PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET" ||
        key == "PAPERBANANA_BENCH_OSS_BUCKET" ||
        key == "PAPERBANANA_BENCH_OSS_REGION" ||
        key == "PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT" ||
        key == "PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT"
    }
    {
      key=$0
      sub(/=.*/, "", key)
      if (!managed(key)) print
    }
    END {
      print "PAPERBANANA_BENCH_API_ENABLED=true"
      print "PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID=" values["PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID"]
      print "PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET=" values["PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET"]
      print "PAPERBANANA_BENCH_OSS_BUCKET=" values["PAPERBANANA_BENCH_OSS_BUCKET"]
      print "PAPERBANANA_BENCH_OSS_REGION=" values["PAPERBANANA_BENCH_OSS_REGION"]
      print "PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT=" values["PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT"]
      print "PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT=" values["PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT"]
    }
  ' "$bundle" "$core_env" > "$output"
}

build_bench_candidate() {
  local output="$1"
  awk '
    FNR == NR {
      key=$0
      sub(/=.*/, "", key)
      values[key]=substr($0, index($0, "=") + 1)
      next
    }
    function managed(key) {
      return key == "PAPERBANANA_BENCH_ENABLED" ||
        key == "PAPERBANANA_BENCH_CONCURRENCY" ||
        key == "PAPERBANANA_BENCH_BAILIAN_API_KEY" ||
        key == "PAPERBANANA_BENCH_OPENROUTER_API_KEY" ||
        key == "PAPERBANANA_BENCH_ARK_API_KEY" ||
        key == "PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID" ||
        key == "PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET" ||
        key == "PAPERBANANA_BENCH_OSS_BUCKET" ||
        key == "PAPERBANANA_BENCH_OSS_REGION" ||
        key == "PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT" ||
        key == "PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT"
    }
    {
      key=$0
      sub(/=.*/, "", key)
      if (!managed(key)) print
    }
    END {
      print "PAPERBANANA_BENCH_ENABLED=false"
      print "PAPERBANANA_BENCH_CONCURRENCY=1"
      print "PAPERBANANA_BENCH_BAILIAN_API_KEY=" values["PAPERBANANA_BENCH_BAILIAN_API_KEY"]
      print "PAPERBANANA_BENCH_OPENROUTER_API_KEY=" values["PAPERBANANA_BENCH_OPENROUTER_API_KEY"]
      print "PAPERBANANA_BENCH_ARK_API_KEY=" values["PAPERBANANA_BENCH_ARK_API_KEY"]
      print "PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID=" values["PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID"]
      print "PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET=" values["PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET"]
      print "PAPERBANANA_BENCH_OSS_BUCKET=" values["PAPERBANANA_BENCH_OSS_BUCKET"]
      print "PAPERBANANA_BENCH_OSS_REGION=" values["PAPERBANANA_BENCH_OSS_REGION"]
      print "PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT=" values["PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT"]
      print "PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT=" values["PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT"]
    }
  ' "$bundle" "$bench_env" > "$output"
}

build_deploy_candidate() {
  local output="$1"
  awk '
    !/^PAPERBANANA_BENCH_SECRET_MODE=/ { print }
    END { print "PAPERBANANA_BENCH_SECRET_MODE=configured-disabled" }
  ' "$deploy_env" > "$output"
}

action_log="${PAPERBANANA_BENCH_TEST_ACTION_LOG:-}"
record_test_action() {
  local message="$1"
  [[ -n "$test_root" && -n "$action_log" ]] || return 0
  [[ "$action_log" == "$test_root"/* && ! -L "$action_log" ]] || {
    echo "test action log must stay inside the fixture" >&2
    return 1
  }
  printf '%s\n' "$message" >> "$action_log"
}

inject_failure() {
  local step="$1"
  [[ -n "$test_root" && "${PAPERBANANA_BENCH_TEST_FAIL_STEP:-}" == "$step" ]] || return 0
  record_test_action "inject failure $step"
  echo "test-only benchmark activation failure was injected" >&2
  return 1
}

compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
recreate_service() {
  local service="$1"
  if [[ -n "$test_root" ]]; then
    record_test_action "recreate $service"
    inject_failure "$service-recreate"
    return
  fi
  timeout 600 "${compose[@]}" up -d --no-deps --force-recreate --wait --wait-timeout 600 "$service"
}

run_smoke() {
  if [[ -n "$test_root" ]]; then
    record_test_action "smoke configured-disabled"
    inject_failure smoke
    return
  fi
  timeout 600 "$deploy_dir/scripts/smoke.sh"
}

validate_all
if [[ "$operation" == "--dry-run" ]]; then
  echo "Dry-run: would atomically configure dedicated Bench credentials while paid execution remains disabled; values were not printed."
  exit 0
fi

mkdir -p -- "$(dirname -- "$lock_path")"
portable_lock_dir=""
if command -v flock >/dev/null 2>&1; then
  exec 9>"$lock_path"
  flock -x 9
elif [[ -n "$test_root" ]]; then
  portable_lock_dir="${lock_path}.d"
  mkdir -- "$portable_lock_dir" || {
    echo "benchmark credential activation lock is already held" >&2
    exit 1
  }
else
  echo "flock is required for production benchmark credential activation" >&2
  exit 1
fi
if ! validate_all; then
  if [[ -n "$portable_lock_dir" ]]; then rmdir -- "$portable_lock_dir" 2>/dev/null || true; fi
  exit 1
fi

core_candidate=""
bench_candidate=""
deploy_candidate=""
core_backup=""
bench_backup=""
deploy_backup=""
rollback_required=false
completed=false

cleanup_temporary() {
  rm -f -- "${core_candidate:-}" "${bench_candidate:-}" "${deploy_candidate:-}" \
    "${core_backup:-}" "${bench_backup:-}" "${deploy_backup:-}"
  if [[ -n "${portable_lock_dir:-}" ]]; then rmdir -- "$portable_lock_dir" 2>/dev/null || true; fi
}

rollback() {
  local rollback_failed=false
  set +e
  mv -f -- "$core_backup" "$core_env" || rollback_failed=true
  core_backup=""
  mv -f -- "$bench_backup" "$bench_env" || rollback_failed=true
  bench_backup=""
  mv -f -- "$deploy_backup" "$deploy_env" || rollback_failed=true
  deploy_backup=""
  chmod 0600 "$core_env" "$bench_env" "$deploy_env" || rollback_failed=true
  record_test_action "rollback restore deployment files" || rollback_failed=true
  if [[ -n "$test_root" ]]; then
    record_test_action "rollback recreate paperbanana-api" || rollback_failed=true
    record_test_action "rollback recreate benchmark-worker" || rollback_failed=true
  else
    timeout 600 "${compose[@]}" up -d --no-deps --force-recreate --wait --wait-timeout 600 paperbanana-api || rollback_failed=true
    timeout 600 "${compose[@]}" up -d --no-deps --force-recreate --wait --wait-timeout 600 benchmark-worker || rollback_failed=true
  fi
  if [[ "$rollback_failed" == true ]]; then
    echo "benchmark credential activation failed and rollback did not fully converge" >&2
  else
    echo "benchmark credential activation failed; prior disabled configuration was restored" >&2
  fi
  set -e
}

finish() {
  local status=$?
  trap - EXIT
  if [[ "$status" -ne 0 && "$rollback_required" == true && "$completed" != true ]]; then
    rollback
  fi
  cleanup_temporary
  exit "$status"
}
trap finish EXIT

core_candidate="$(mktemp "$secret_dir/.core.env.bench-configured.XXXXXX")"
bench_candidate="$(mktemp "$secret_dir/.bench.env.bench-configured.XXXXXX")"
deploy_candidate="$(mktemp "$deploy_dir/.env.bench-configured.XXXXXX")"
core_backup="$(mktemp "$secret_dir/.core.env.bench-backup.XXXXXX")"
bench_backup="$(mktemp "$secret_dir/.bench.env.bench-backup.XXXXXX")"
deploy_backup="$(mktemp "$deploy_dir/.env.bench-backup.XXXXXX")"

build_core_candidate "$core_candidate"
build_bench_candidate "$bench_candidate"
build_deploy_candidate "$deploy_candidate"
chmod 0600 "$core_candidate" "$bench_candidate" "$deploy_candidate"
if [[ -z "$test_root" ]]; then chown 0:0 "$core_candidate" "$bench_candidate" "$deploy_candidate"; fi
validate_env_syntax "$core_candidate" && validate_env_syntax "$bench_candidate" && validate_env_syntax "$deploy_candidate" || {
  echo "generated benchmark configuration is invalid; originals were preserved" >&2
  exit 1
}
[[ "$(read_env_value "$core_candidate" PAPERBANANA_BENCH_API_ENABLED)" == true ]] || exit 1
[[ "$(read_env_value "$bench_candidate" PAPERBANANA_BENCH_ENABLED)" == false ]] || exit 1
[[ "$(read_env_value "$bench_candidate" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || exit 1
[[ "$(read_env_value "$deploy_candidate" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled ]] || exit 1

if cmp -s -- "$core_candidate" "$core_env" && cmp -s -- "$bench_candidate" "$bench_env" && cmp -s -- "$deploy_candidate" "$deploy_env"; then
  rm -f -- "$bundle"
  completed=true
  echo "Benchmark credentials are already configured with execution disabled; staged bundle removed and services unchanged."
  exit 0
fi

cp -p -- "$core_env" "$core_backup"
cp -p -- "$bench_env" "$bench_backup"
cp -p -- "$deploy_env" "$deploy_backup"
rollback_required=true

mv -f -- "$core_candidate" "$core_env"
core_candidate=""
inject_failure after-core-install
mv -f -- "$bench_candidate" "$bench_env"
bench_candidate=""
inject_failure after-bench-install
mv -f -- "$deploy_candidate" "$deploy_env"
deploy_candidate=""
inject_failure after-mode-install

recreate_service paperbanana-api
recreate_service benchmark-worker
run_smoke

rm -f -- "$bundle"
completed=true
rollback_required=false
cleanup_temporary
trap - EXIT
echo "Dedicated Bench credentials were configured; Core API access is enabled and paid Worker execution remains disabled."
