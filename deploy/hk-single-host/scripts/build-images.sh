#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd -- "$script_dir/.." && pwd)"
repo_dir="$(git -C "$deploy_dir" rev-parse --show-toplevel)"
commit="$(git -C "$repo_dir" rev-parse --verify HEAD)"
short_commit="${commit:0:12}"
image_lock="$deploy_dir/.env"

test -z "$(git -C "$repo_dir" status --porcelain --untracked-files=no)" || {
  echo "tracked worktree changes must be committed before building production images" >&2
  exit 1
}

gateway_image="paperbanana/auth-gateway:$short_commit"
core_image="paperbanana/core-api:$short_commit"
worker_image="paperbanana/plot-worker:$short_commit"

docker build --pull -f "$repo_dir/apps/auth-gateway/Dockerfile" -t "$gateway_image" "$repo_dir"
docker build --pull --build-arg "PAPERBANANA_CODE_SHA=$commit" -f "$repo_dir/apps/paperbanana-api/Dockerfile" -t "$core_image" "$repo_dir"
docker build --pull -f "$repo_dir/apps/plot-worker/Dockerfile" -t "$worker_image" "$repo_dir/apps/plot-worker"
docker pull mongo:8.0.16-noble
mongo_digest="$(docker image inspect mongo:8.0.16-noble --format '{{range .RepoDigests}}{{println .}}{{end}}' | sed -n '/^mongo@sha256:/p' | head -1)"
test -n "$mongo_digest" || { echo "could not resolve the MongoDB repository digest" >&2; exit 1; }

umask 077
{
  printf 'PAPERBANANA_GATEWAY_IMAGE=%s\n' "$gateway_image"
  printf 'PAPERBANANA_CORE_IMAGE=%s\n' "$core_image"
  printf 'PAPERBANANA_PLOT_WORKER_IMAGE=%s\n' "$worker_image"
  printf 'PAPERBANANA_MONGODB_IMAGE=mongo:8.0.16-noble@%s\n' "${mongo_digest#mongo@}"
} > "$image_lock"

echo "Built commit-tagged production images and wrote the root-only image lock: $image_lock"
