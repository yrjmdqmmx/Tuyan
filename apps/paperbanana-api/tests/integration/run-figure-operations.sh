#!/usr/bin/env bash
set -Eeuo pipefail
# Reuse the explicitly named, already running local service. Never start/stop it.
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
port="$(docker port tuyan-tokendance-local 27017/tcp | sed -n 's/^127\.0\.0\.1://p')"
[[ "$port" =~ ^[0-9]+$ ]] || { echo 'Existing loopback tuyan-tokendance-local Mongo port unavailable' >&2; exit 1; }
cd "$repo_dir/apps/paperbanana-api"
FIGURE_INTEGRATION_MONGO_URI="mongodb://127.0.0.1:${port}/?directConnection=true" \
  node --import tsx tests/integration/figure-operations.mjs
