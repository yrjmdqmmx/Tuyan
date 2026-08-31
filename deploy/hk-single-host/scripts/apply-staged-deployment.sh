#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

usage() {
  echo "usage: $0 --staged-image-lock PATH --code-sha 40_HEX_SHA [--dry-run|--apply]" >&2
  exit 2
}

operation="--dry-run"
staged_image_lock=""
code_sha=""
while (( $# > 0 )); do
  case "$1" in
    --apply|--dry-run)
      operation="$1"
      shift
      ;;
    --staged-image-lock)
      [[ $# -ge 2 ]] || usage
      staged_image_lock="$2"
      shift 2
      ;;
    --code-sha)
      [[ $# -ge 2 ]] || usage
      code_sha="$2"
      shift 2
      ;;
    *) usage ;;
  esac
done
[[ -n "$staged_image_lock" && "$code_sha" =~ ^[0-9a-f]{40}$ ]] || usage

test_root="${PAPERBANANA_HK_DEPLOY_TEST_ROOT:-}"
validate_test_root() {
  [[ -n "$test_root" ]] || return 0
  if (( EUID == 0 )); then
    echo "PAPERBANANA_HK_DEPLOY_TEST_ROOT is forbidden while running as root" >&2
    exit 2
  fi
  case "$test_root" in
    /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;;
    *) echo "deployment test root must be temporary" >&2; exit 2 ;;
  esac
  if [[ "$test_root" != /* || "$test_root" == "/" || "$test_root" == *"/../"* || "$test_root" == */.. || "$test_root" == *"/./"* || "$test_root" == */. ]]; then
    echo "deployment test root must be canonical and absolute" >&2
    exit 2
  fi
  local canonical marker
  canonical="$(cd -P -- "$test_root" 2>/dev/null && pwd -P)" || {
    echo "deployment test root is not usable" >&2
    exit 2
  }
  [[ "$canonical" == "$test_root" && ! -L "$test_root" ]] || {
    echo "deployment test root must not be a symlink or non-canonical path" >&2
    exit 2
  }
  marker="$test_root/.paperbanana-hk-test-root"
  [[ -f "$marker" && ! -L "$marker" && "$(<"$marker")" == "paperbanana-hk-test-root-v1" ]] || {
    echo "deployment test root lacks the required fixture marker" >&2
    exit 2
  }
}
validate_test_root

if [[ -z "$test_root" && "$EUID" -ne 0 ]]; then
  echo "apply-staged-deployment.sh must run as root" >&2
  exit 1
fi

host_path() { printf '%s%s' "$test_root" "$1"; }
repo_root="$(host_path /opt/paperbanana/repo)"
deploy_dir="$repo_root/deploy/hk-single-host"
source_script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_env="$deploy_dir/.env"
shared_lock_path="/run/lock/paperbanana-hk-production.lock"
lock_path="$(host_path "$shared_lock_path")"
artifact_spool_parent="$(host_path /opt/paperbanana/data)"
artifact_spool="$(host_path /opt/paperbanana/data/scientific-v2-artifact-spool)"

if [[ -n "$test_root" ]]; then
  [[ "$staged_image_lock" =~ ^${test_root}/tmp/paperbanana-image-lock\.[A-Za-z0-9]{6,}$ ]] || {
    echo "test image lock must use the randomized fixture staging path" >&2
    exit 1
  }
else
  [[ "$staged_image_lock" =~ ^/tmp/paperbanana-image-lock\.[A-Za-z0-9]{6,}$ ]] || {
    echo "production image lock must use the randomized host staging path" >&2
    exit 1
  }
fi

stat_triplet() {
  stat -c '%u:%g:%a' -- "$1" 2>/dev/null || stat -f '%u:%g:%Lp' -- "$1"
}

validate_staged_path() {
  local metadata owner_id group_id mode_bits expected_owner
  [[ -f "$staged_image_lock" && ! -L "$staged_image_lock" ]] || {
    echo "staged image lock must be a regular file and must not be a symlink" >&2
    return 1
  }
  metadata="$(stat_triplet "$staged_image_lock")" || return 1
  IFS=: read -r owner_id group_id mode_bits <<<"$metadata"
  expected_owner=0
  [[ -n "$test_root" ]] && expected_owner="$EUID"
  [[ "$owner_id" == "$expected_owner" && "$mode_bits" =~ ^0?600$ ]] || {
    echo "staged image lock must be owner-owned mode 0600" >&2
    return 1
  }
}

validate_staged_file() {
  validate_staged_path || return 1
  if LC_ALL=C grep -q $'\r' "$staged_image_lock"; then return 1; fi
  awk '
    BEGIN {
      required["PAPERBANANA_GATEWAY_IMAGE"]=1
      required["PAPERBANANA_CORE_IMAGE"]=1
      required["PAPERBANANA_PLOT_WORKER_IMAGE"]=1
      required["PAPERBANANA_MONGODB_IMAGE"]=1
      required["PAPERBANANA_BENCH_WORKER_IMAGE"]=1
      required["PAPERBANANA_BENCH_SECRET_MODE"]=1
      required["COMPOSE_PROFILES"]=1
    }
    /^[A-Z_][A-Z0-9_]*=.+$/ {
      key=$0
      sub(/=.*/, "", key)
      if (!(key in required)) exit 10
      seen[key]++
      values[key]=substr($0, index($0, "=") + 1)
      next
    }
    { exit 11 }
    END {
      for (key in required) if (seen[key] != 1) exit 12
      if (values["PAPERBANANA_BENCH_SECRET_MODE"] != "discovery-only" && values["PAPERBANANA_BENCH_SECRET_MODE"] != "configured-disabled") exit 13
      if (values["COMPOSE_PROFILES"] != "benchmark") exit 14
    }
  ' "$staged_image_lock" || {
    echo "staged image lock is malformed or incomplete" >&2
    return 1
  }
}

read_env_value() {
  local key="$1"
  awk -v key="$key" '$0 ~ ("^" key "=") { print substr($0, index($0, "=") + 1) }' "$staged_image_lock"
}

staged_owned=false
portable_lock_dir=""
action_log="${PAPERBANANA_HK_DEPLOY_TEST_ACTION_LOG:-}"
record_action() {
  local message="$1"
  [[ -n "$test_root" && -n "$action_log" ]] || return 0
  [[ "$action_log" == "$test_root"/* && ! -L "$action_log" ]] || return 1
  printf '%s\n' "$message" >> "$action_log"
}
cleanup() {
  local status=$?
  trap - EXIT
  if [[ "$staged_owned" == true ]]; then
    rm -f -- "$staged_image_lock"
    staged_owned=false
    record_action "cleanup staged image lock" || true
  fi
  if [[ -n "$portable_lock_dir" ]]; then rmdir -- "$portable_lock_dir" 2>/dev/null || true; fi
  exit "$status"
}
if [[ "$operation" == "--apply" ]]; then
  validate_staged_path
  staged_owned=true
  trap cleanup EXIT
fi

validate_staged_file
benchmark_secret_mode="$(read_env_value PAPERBANANA_BENCH_SECRET_MODE)"
if [[ "$operation" == "--dry-run" ]]; then
  echo "Dry-run: staged deployment lock is valid; no host state was changed."
  exit 0
fi

mkdir -p -- "$(dirname -- "$lock_path")"
if command -v flock >/dev/null 2>&1; then
  if [[ -n "$test_root" ]]; then
    shared_lock_fd=9
    exec 9>"$lock_path"
  else
    exec {shared_lock_fd}>"$shared_lock_path"
  fi
  flock -x "$shared_lock_fd"
elif [[ -n "$test_root" ]]; then
  shared_lock_fd=9
  exec 9>"$lock_path"
  portable_lock_dir="${lock_path}.d"
  mkdir -- "$portable_lock_dir"
else
  echo "flock is required for production deployment" >&2
  exit 1
fi
export PAPERBANANA_HK_SHARED_LOCK_FD="$shared_lock_fd"
record_action "lock acquired $shared_lock_path"

artifact_spool_parent_canonical="$(cd -P -- "$artifact_spool_parent" 2>/dev/null && pwd -P)" || {
  echo "scientific v2 artifact spool parent must be a non-symlink directory" >&2
  exit 1
}
[[ -d "$artifact_spool_parent" && ! -L "$artifact_spool_parent" && "$artifact_spool_parent_canonical" == "$artifact_spool_parent" ]] || {
  echo "scientific v2 artifact spool parent must be a non-symlink directory" >&2
  exit 1
}

if [[ -L "$artifact_spool" || ( -e "$artifact_spool" && ! -d "$artifact_spool" ) ]]; then
  echo "scientific v2 artifact spool must be a non-symlink directory" >&2
  exit 1
fi
if [[ ! -d "$artifact_spool" ]]; then
  if [[ -n "$test_root" ]]; then
    install -d -m 0700 "$artifact_spool"
  else
    install -d -o 1000 -g 1000 -m 0700 "$artifact_spool"
  fi
fi
[[ -d "$artifact_spool" && ! -L "$artifact_spool" ]] || {
  echo "scientific v2 artifact spool must be a non-symlink directory" >&2
  exit 1
}
if [[ -n "$test_root" ]]; then
  chmod 0700 "$artifact_spool"
else
  chown 1000:1000 "$artifact_spool"
  chmod 0700 "$artifact_spool"
fi
record_action "provision scientific v2 artifact spool"

if [[ -n "$test_root" ]]; then
  install -m 0600 "$staged_image_lock" "$deploy_env"
else
  install -m 0600 -o 0 -g 0 "$staged_image_lock" "$deploy_env"
fi
record_action "install staged image lock"

if [[ -n "$test_root" ]]; then
  record_action "bootstrap benchmark $benchmark_secret_mode"
else
  PAPERBANANA_CODE_SHA="$code_sha" "$deploy_dir/scripts/bootstrap-benchmark.sh" "--$benchmark_secret_mode"
fi
if [[ -n "$test_root" && "${PAPERBANANA_HK_DEPLOY_TEST_FAIL_STEP:-}" == after-bootstrap ]]; then
  echo "test-only staged deployment failure was injected" >&2
  exit 1
fi

if [[ -n "$test_root" ]]; then
  PAPERBANANA_HK_DEPLOY_GUARD_TEST_MODE=true \
    PAPERBANANA_HK_DEPLOY_TEST_ROOT="$test_root" \
    "$source_script_dir/deploy.sh" --apply
  record_action "deploy apply"
else
  "$deploy_dir/scripts/deploy.sh" --apply
fi

echo "Staged paperbanana-hk deployment completed under the shared production lock."
