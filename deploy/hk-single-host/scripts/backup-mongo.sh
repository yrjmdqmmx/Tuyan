#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# The installed script lives outside the replaceable application checkout.
deploy_dir="/opt/paperbanana/repo/deploy/hk-single-host"
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
# Health checks must see only completed uploads, never a dump in progress.
pending_archive="$archive.partial"
pending_checksum="$checksum.partial"

"${compose[@]}" exec -T mongodb sh -c '
  exec mongodump --host 127.0.0.1 --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$(cat /run/secrets/mongo_root_password)" --authenticationDatabase admin \
    --archive --gzip --oplog
' > "$pending_archive"

test -s "$pending_archive"
sha256sum "$pending_archive" | sed 's/\.partial$//' > "$pending_checksum"
object_prefix="oss://$PAPERBANANA_BACKUP_BUCKET/backups/mongo/$timestamp"
python3 "$script_dir/with-backup-oss-network.py" "$OSSUTIL_CONFIG_FILE" "$PAPERBANANA_BACKUP_BUCKET" \
  ossutil -c "$OSSUTIL_CONFIG_FILE" cp "$pending_archive" "$object_prefix/$(basename "$archive")" --force
python3 "$script_dir/with-backup-oss-network.py" "$OSSUTIL_CONFIG_FILE" "$PAPERBANANA_BACKUP_BUCKET" \
  ossutil -c "$OSSUTIL_CONFIG_FILE" cp "$pending_checksum" "$object_prefix/$(basename "$checksum")" --force

# Publish the checksum first, then atomically make the completed archive visible.
mv "$pending_checksum" "$checksum"
mv "$pending_archive" "$archive"

find "$backup_dir" -type f -name 'paperbanana-mongo-*.archive.gz*' -mtime +2 -delete
echo "MongoDB backup uploaded to $object_prefix"
