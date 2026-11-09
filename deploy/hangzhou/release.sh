#!/usr/bin/env bash
set -Eeuo pipefail
# Local operator entry point. Uses the existing SSH identity; never uploads it.
manifest="${1:?usage: release.sh manifest.json [--apply] [--keep-maintenance]}"; shift
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
for arg in "$@"; do case "$arg" in --apply|--keep-maintenance) ;; *) echo 'unsupported argument' >&2; exit 2;; esac; done
remote_dir="$(ssh -o BatchMode=yes -o StrictHostKeyChecking=yes root@116.62.146.226 'umask 077; mktemp -d /opt/paperbanana/operations/hangzhou/release.XXXXXXXX')"
[[ "$remote_dir" =~ ^/opt/paperbanana/operations/hangzhou/release\.[A-Za-z0-9]+$ ]] || exit 2
scp -q -o BatchMode=yes -o StrictHostKeyChecking=yes "$script_dir/release.py" "root@116.62.146.226:$remote_dir/release.py"
scp -q -o BatchMode=yes -o StrictHostKeyChecking=yes "$manifest" "root@116.62.146.226:$remote_dir/manifest.json"
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes root@116.62.146.226 "python3 $remote_dir/release.py $remote_dir/manifest.json $*"
