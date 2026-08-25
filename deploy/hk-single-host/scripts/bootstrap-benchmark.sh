#!/usr/bin/env bash
set -Eeuo pipefail

mode="${1:-}"
test_mode="${PAPERBANANA_BENCH_BOOTSTRAP_TEST_MODE:-false}"
secret_dir="${PAPERBANANA_SECRET_DIR:-/opt/paperbanana/secrets}"
gateway_env="$secret_dir/gateway.env"
core_env="$secret_dir/core.env"
bench_env="$secret_dir/bench.env"

[[ "$mode" == "--discovery-only" || "$mode" == "--configured-disabled" ]] || {
  echo "usage: $0 --discovery-only|--configured-disabled" >&2
  exit 2
}
if test "$test_mode" = true; then
  case "$secret_dir" in
    /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;;
    *) echo "test secret directory must be temporary" >&2; exit 1 ;;
  esac
else
  test "${EUID}" -eq 0 || { echo "run as root" >&2; exit 1; }
  test "$secret_dir" = /opt/paperbanana/secrets || { echo "production secret directory is fixed" >&2; exit 1; }
fi
test -d "$secret_dir" || { echo "missing production secret directory" >&2; exit 1; }
test -s "$gateway_env" || { echo "missing gateway.env" >&2; exit 1; }
test -s "$core_env" || { echo "missing core.env" >&2; exit 1; }
[[ "${PAPERBANANA_CODE_SHA:-}" =~ ^[0-9a-f]{40}$ ]] || { echo "PAPERBANANA_CODE_SHA must be an immutable commit" >&2; exit 1; }

umask 077

random_secret() {
  openssl rand -hex 32
}

read_env_value() {
  local file="$1" key="$2"
  test -f "$file" || return 0
  awk -F= -v key="$key" '$1 == key {sub(/^[^=]*=/, ""); print; exit}' "$file"
}

validate_env_syntax() {
  local path="$1"
  test -f "$path" && test ! -L "$path" || return 1
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

require_env_value() {
  local path="$1" key="$2" value
  value="$(read_env_value "$path" "$key")"
  test -n "$value" || {
    echo "configured-disabled benchmark environment is incomplete" >&2
    return 1
  }
}

validate_configured_disabled() {
  local current_core_sha current_bench_sha core_discovery_token bench_discovery_token key core_value bench_value
  validate_env_syntax "$core_env" && validate_env_syntax "$bench_env" || {
    echo "configured-disabled benchmark env files must be regular, unique, and well formed" >&2
    return 1
  }
  current_core_sha="$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)"
  current_bench_sha="$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)"
  [[ "$current_core_sha" =~ ^[0-9a-f]{40}$ && "$current_core_sha" == "$current_bench_sha" ]] || {
    echo "configured-disabled benchmark env files must start from one deployed commit" >&2
    return 1
  }
  for key in \
    PAPERBANANA_ADMIN_TRANSPORT_TOKEN \
    PAPERBANANA_BENCH_DISCOVERY_TOKEN \
    PAPERBANANA_BENCH_MONGODB_URI \
    PAPERBANANA_BENCH_MONGO_DB \
    PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET \
    PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID \
    PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET \
    PAPERBANANA_BENCH_OSS_BUCKET \
    PAPERBANANA_BENCH_OSS_REGION \
    PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT \
    PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT; do
    require_env_value "$core_env" "$key" || return 1
  done
  for key in \
    PAPERBANANA_BENCH_ENABLED \
    PAPERBANANA_BENCH_MONGODB_URI \
    PAPERBANANA_BENCH_MONGO_DB \
    PAPERBANANA_BENCH_DISCOVERY_TOKEN \
    PAPERBANANA_BENCH_BAILIAN_API_KEY \
    PAPERBANANA_BENCH_OPENROUTER_API_KEY \
    PAPERBANANA_BENCH_ARK_API_KEY \
    PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID \
    PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET \
    PAPERBANANA_BENCH_OSS_BUCKET \
    PAPERBANANA_BENCH_OSS_REGION \
    PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT \
    PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT; do
    require_env_value "$bench_env" "$key" || return 1
  done
  test "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" = false || {
    echo "configured-disabled deployment refuses an enabled benchmark worker" >&2
    return 1
  }
  core_discovery_token="$(read_env_value "$core_env" PAPERBANANA_BENCH_DISCOVERY_TOKEN)"
  bench_discovery_token="$(read_env_value "$bench_env" PAPERBANANA_BENCH_DISCOVERY_TOKEN)"
  test "$core_discovery_token" = "$bench_discovery_token" || {
    echo "benchmark discovery token differs between production services" >&2
    return 1
  }
  for key in \
    PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID \
    PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET \
    PAPERBANANA_BENCH_OSS_BUCKET \
    PAPERBANANA_BENCH_OSS_REGION \
    PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT \
    PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT; do
    core_value="$(read_env_value "$core_env" "$key")"
    bench_value="$(read_env_value "$bench_env" "$key")"
    test "$core_value" = "$bench_value" || {
      echo "configured-disabled Bench OSS settings differ between services" >&2
      return 1
    }
  done
  if grep -Eq '^PAPERBANANA_BENCH_(BAILIAN|OPENROUTER|ARK)_API_KEY=' "$core_env"; then
    echo "configured-disabled Provider credentials belong only in bench.env" >&2
    return 1
  fi
}

set_env_value() {
  local file="$1" key="$2" value="$3" temporary
  temporary="$(mktemp "$secret_dir/.${key}.XXXXXX")"
  awk -F= -v key="$key" '$1 != key' "$file" > "$temporary"
  printf '%s=%s\n' "$key" "$value" >> "$temporary"
  if test "$test_mode" = true; then
    install -m 0600 "$temporary" "$file"
  else
    install -m 0600 -o 0 -g 0 "$temporary" "$file"
  fi
  rm -f "$temporary"
}

ensure_secret_file() {
  local path="$1"
  if test ! -s "$path"; then
    random_secret > "$path"
  fi
  if test "$test_mode" != true; then chown 0:0 "$path"; fi
  chmod 0600 "$path"
}

shared_secret() {
  local key="$1" first="$2" second="$3" first_value second_value value
  first_value="$(read_env_value "$first" "$key")"
  second_value="$(read_env_value "$second" "$key")"
  if test -n "$first_value" && test -n "$second_value" && test "$first_value" != "$second_value"; then
    echo "$key differs between production services" >&2
    exit 1
  fi
  value="${first_value:-$second_value}"
  test -n "$value" || value="$(random_secret)"
  set_env_value "$first" "$key" "$value"
  set_env_value "$second" "$key" "$value"
}

paid_prefix="PAPERBANANA_BENCH_"
if test "$mode" = "--configured-disabled"; then
  validate_configured_disabled
  set_env_value "$core_env" PAPERBANANA_BENCH_API_ENABLED true
  set_env_value "$core_env" PAPERBANANA_CODE_SHA "$PAPERBANANA_CODE_SHA"
  set_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED false
  set_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY 1
  set_env_value "$bench_env" PAPERBANANA_CODE_SHA "$PAPERBANANA_CODE_SHA"
  chmod 0600 "$core_env" "$bench_env"
  unset current_core_sha current_bench_sha core_discovery_token bench_discovery_token core_value bench_value
  echo "Benchmark configured-disabled secrets were validated without exposing credential values; paid execution remains disabled."
  exit 0
fi

if { test -f "$bench_env" && grep -Eq "^${paid_prefix}(BAILIAN|OPENROUTER|ARK)_API_KEY=|^${paid_prefix}OSS_[A-Z0-9_]+=" "$bench_env"; } ||
   grep -Eq "^${paid_prefix}(BAILIAN|OPENROUTER|ARK)_API_KEY=|^${paid_prefix}OSS_[A-Z0-9_]+=" "$core_env"; then
  echo "discovery-only benchmark config must not contain provider or object-storage credentials" >&2
  exit 1
fi

core_discovery_token="$(read_env_value "$core_env" PAPERBANANA_BENCH_DISCOVERY_TOKEN)"
bench_discovery_token="$(read_env_value "$bench_env" PAPERBANANA_BENCH_DISCOVERY_TOKEN)"
if test -n "$core_discovery_token" && test -n "$bench_discovery_token" && test "$core_discovery_token" != "$bench_discovery_token"; then
  echo "benchmark discovery token differs between production services" >&2
  exit 1
fi
discovery_token="${core_discovery_token:-$bench_discovery_token}"
test -n "$discovery_token" || discovery_token="$(random_secret)"

ensure_secret_file "$secret_dir/mongo-bench-password"
ensure_secret_file "$secret_dir/mongo-bench-api-password"
mongo_bench_password="$(tr -d '\r\n' < "$secret_dir/mongo-bench-password")"
mongo_bench_api_password="$(tr -d '\r\n' < "$secret_dir/mongo-bench-api-password")"

shared_secret PAPERBANANA_ADMIN_TRANSPORT_TOKEN "$gateway_env" "$core_env"

review_signing_secret="$(read_env_value "$core_env" PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET)"
test -n "$review_signing_secret" || review_signing_secret="$(random_secret)"

set_env_value "$core_env" PAPERBANANA_BENCH_DISCOVERY_TOKEN "$discovery_token"
set_env_value "$core_env" PAPERBANANA_BENCH_API_ENABLED false
set_env_value "$core_env" PAPERBANANA_BENCH_MONGODB_URI "mongodb://paperbanana_benchmark_api:$mongo_bench_api_password@mongodb:27017/paperbanana_benchmark?authSource=paperbanana_benchmark&replicaSet=rs0"
set_env_value "$core_env" PAPERBANANA_BENCH_MONGO_DB paperbanana_benchmark
set_env_value "$core_env" PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET "$review_signing_secret"
set_env_value "$core_env" PAPERBANANA_CODE_SHA "$PAPERBANANA_CODE_SHA"

if test ! -e "$bench_env"; then
  if test "$test_mode" = true; then
    install -m 0600 /dev/null "$bench_env"
  else
    install -m 0600 -o 0 -g 0 /dev/null "$bench_env"
  fi
fi
set_env_value "$bench_env" NODE_ENV production
set_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED false
set_env_value "$bench_env" PAPERBANANA_BENCH_MONGODB_URI "mongodb://paperbanana_benchmark:$mongo_bench_password@mongodb:27017/paperbanana_benchmark?authSource=paperbanana_benchmark&replicaSet=rs0"
set_env_value "$bench_env" PAPERBANANA_BENCH_MONGO_DB paperbanana_benchmark
set_env_value "$bench_env" PAPERBANANA_BENCH_DISCOVERY_TOKEN "$discovery_token"
set_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY 1
set_env_value "$bench_env" PAPERBANANA_BENCH_DETECTION_INTERVAL_MS 21600000
set_env_value "$bench_env" PAPERBANANA_CODE_SHA "$PAPERBANANA_CODE_SHA"

chmod 0600 "$gateway_env" "$core_env" "$bench_env"
unset mongo_bench_password mongo_bench_api_password discovery_token core_discovery_token bench_discovery_token review_signing_secret
echo "Benchmark discovery-only secrets are ready without exposing credential values."
