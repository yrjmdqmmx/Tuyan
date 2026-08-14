#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd -- "$script_dir/.." && pwd)"
backup_dir="/opt/paperbanana/backups"
backup_env="/opt/paperbanana/secrets/backup.env"
compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_dir/.env" -f "$deploy_dir/compose.yaml")

test -r "$backup_env" || { echo "missing $backup_env" >&2; exit 1; }
set -a
# shellcheck disable=SC1090
source "$backup_env"
set +a
: "${PAPERBANANA_BACKUP_BUCKET:?missing PAPERBANANA_BACKUP_BUCKET}"
: "${OSSUTIL_CONFIG_FILE:?missing OSSUTIL_CONFIG_FILE}"

install -d -m 0700 "$backup_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$backup_dir/paperbanana-mongo-$timestamp.archive.gz"
checksum="$archive.sha256"

"${compose[@]}" exec -T mongodb sh -c '
  exec mongodump --host 127.0.0.1 --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$(cat /run/secrets/mongo_root_password)" --authenticationDatabase admin \
    --archive --gzip --oplog
' > "$archive"

test -s "$archive"
sha256sum "$archive" > "$checksum"
object_prefix="oss://$PAPERBANANA_BACKUP_BUCKET/backups/mongo/$timestamp"
ossutil -c "$OSSUTIL_CONFIG_FILE" cp "$archive" "$object_prefix/$(basename "$archive")" --force
ossutil -c "$OSSUTIL_CONFIG_FILE" cp "$checksum" "$object_prefix/$(basename "$checksum")" --force

find "$backup_dir" -type f -name 'paperbanana-mongo-*.archive.gz*' -mtime +2 -delete
echo "MongoDB backup uploaded to $object_prefix"
