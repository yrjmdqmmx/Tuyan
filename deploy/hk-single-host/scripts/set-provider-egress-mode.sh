#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

usage() {
  echo "usage: $0 --mode disabled|sg-required [--dry-run|--apply]" >&2
  exit 2
}

mode="--dry-run"
target_mode=""
while (( $# > 0 )); do
  case "$1" in
    --apply|--dry-run)
      mode="$1"
      shift
      ;;
    --mode)
      [[ $# -ge 2 ]] || usage
      target_mode="$2"
      shift 2
      ;;
    *) usage ;;
  esac
done
[[ "$target_mode" == "disabled" || "$target_mode" == "sg-required" ]] || usage

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

if [[ "$mode" == "--apply" && "$EUID" -ne 0 && -z "$test_root" ]]; then
  echo "set-provider-egress-mode.sh --apply must run as root" >&2
  exit 1
fi

host_path() { printf '%s%s' "$test_root" "$1"; }
core_env="$(host_path /opt/paperbanana/secrets/core.env)"
proxy_url="http://10.77.0.2:3128"

[[ -f "$core_env" && ! -L "$core_env" ]] || {
  echo "core.env must be an existing regular file and must not be a symlink" >&2
  exit 1
}

stat_triplet() {
  stat -c '%u:%g:%a' -- "$1" 2>/dev/null || stat -f '%u:%g:%Lp' -- "$1"
}

metadata="$(stat_triplet "$core_env")" || {
  echo "cannot inspect core.env ownership and mode" >&2
  exit 1
}
IFS=: read -r owner_id group_id mode_bits <<<"$metadata"
[[ "$owner_id" =~ ^[0-9]+$ && "$group_id" =~ ^[0-9]+$ && "$mode_bits" =~ ^[0-7]{3,4}$ ]] || {
  echo "core.env ownership or mode is invalid" >&2
  exit 1
}
if [[ -z "$test_root" ]]; then
  [[ "$owner_id" == "0" && $((8#$mode_bits & 0077)) -eq 0 ]] || {
    echo "core.env must be root-owned and root-only" >&2
    exit 1
  }
else
  [[ "$owner_id" == "$EUID" && $((8#$mode_bits & 0077)) -eq 0 ]] || {
    echo "test core.env must be fixture-owned and root-only" >&2
    exit 1
  }
fi

validate_env_syntax() {
  local path="$1"
  awk '
    /^[[:space:]]*$/ || /^[[:space:]]*#/ { next }
    /^[A-Za-z_][A-Za-z0-9_]*=.*/ {
      key=$0
      sub(/=.*/, "", key)
      seen[key]++
      if (key == "PAPERBANANA_PROVIDER_EGRESS_MODE") mode=$0
      if (key == "PAPERBANANA_SG_PROXY_URL") proxy=$0
      next
    }
    { invalid=1 }
    END {
      if (invalid) exit 10
      for (key in seen) if (seen[key] != 1) exit 11
    }
  ' "$path"
}

if ! validate_env_syntax "$core_env"; then
  echo "existing core.env is invalid; no changes were made" >&2
  exit 1
fi

current_mode="$(awk -F= '$1 == "PAPERBANANA_PROVIDER_EGRESS_MODE" { print substr($0, index($0, "=") + 1) }' "$core_env")"
current_proxy="$(awk -F= '$1 == "PAPERBANANA_SG_PROXY_URL" { print substr($0, index($0, "=") + 1) }' "$core_env")"
if [[ "$current_mode" == "$target_mode" && "$current_proxy" == "$proxy_url" ]]; then
  echo "Provider egress mode is already $target_mode; core.env is unchanged."
  exit 0
fi

if [[ "$mode" == "--dry-run" ]]; then
  echo "Dry-run: would atomically set provider egress mode to $target_mode with the fixed Singapore proxy; no credential values were read or printed."
  exit 0
fi

candidate="$(mktemp "$(dirname -- "$core_env")/.core.env.provider-egress.XXXXXX")"
cleanup() { rm -f -- "$candidate"; }
trap cleanup EXIT

awk -v target_mode="$target_mode" -v proxy_url="$proxy_url" '
  BEGIN { mode_written=0; proxy_written=0 }
  /^PAPERBANANA_PROVIDER_EGRESS_MODE=/ {
    print "PAPERBANANA_PROVIDER_EGRESS_MODE=" target_mode
    mode_written=1
    next
  }
  /^PAPERBANANA_SG_PROXY_URL=/ {
    print "PAPERBANANA_SG_PROXY_URL=" proxy_url
    proxy_written=1
    next
  }
  { print }
  END {
    if (!mode_written) print "PAPERBANANA_PROVIDER_EGRESS_MODE=" target_mode
    if (!proxy_written) print "PAPERBANANA_SG_PROXY_URL=" proxy_url
  }
' "$core_env" > "$candidate"

chmod "$mode_bits" "$candidate"
if (( EUID == 0 )); then chown "$owner_id:$group_id" "$candidate"; fi
if ! validate_env_syntax "$candidate" ||
   ! grep -Fqx "PAPERBANANA_PROVIDER_EGRESS_MODE=$target_mode" "$candidate" ||
   ! grep -Fqx "PAPERBANANA_SG_PROXY_URL=$proxy_url" "$candidate"; then
  echo "generated core.env candidate is invalid; the original was preserved" >&2
  exit 1
fi

mv -f -- "$candidate" "$core_env"
candidate=""
echo "Provider egress mode atomically set to $target_mode; credential values were not printed."
