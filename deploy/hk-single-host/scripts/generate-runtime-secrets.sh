#!/usr/bin/env bash
set -Eeuo pipefail

secret_dir="/opt/paperbanana/secrets"
source_auth_secret="$secret_dir/source-better-auth-secret"
prod_key_json="$secret_dir/prod-oss-access-key.json"
backup_key_json="$secret_dir/backup-oss-access-key.json"

test "${EUID}" -eq 0 || { echo "run as root" >&2; exit 1; }
umask 077
: "${ADMIN_USER_IDS:?set the immutable Better Auth admin user ID before generating secrets}"
if [[ "$ADMIN_USER_IDS" =~ (^|,)[^A-Za-z0-9._:-] || "$ADMIN_USER_IDS" =~ [^A-Za-z0-9._:,-] ]]; then
  echo "ADMIN_USER_IDS must be comma-separated immutable IDs" >&2
  exit 1
fi
IFS=',' read -r -a admin_ids <<< "$ADMIN_USER_IDS"
for admin_id in "${admin_ids[@]}"; do
  [[ "$admin_id" =~ ^[A-Za-z0-9._:-]{3,200}$ ]] || {
    echo "ADMIN_USER_IDS contains an invalid immutable ID" >&2
    exit 1
  }
done
for path in "$source_auth_secret" "$prod_key_json" "$backup_key_json"; do
  test -s "$path" || { echo "missing required source secret: $path" >&2; exit 1; }
done
for path in gateway.env core.env worker.env mongo-root-password mongo-auth-password mongo-business-password mongo-keyfile; do
  test ! -e "$secret_dir/$path" || { echo "refusing to overwrite existing $secret_dir/$path" >&2; exit 1; }
done

random_hex() { openssl rand -hex "$1"; }
single_line() { tr -d '\r\n' < "$1"; }

mongo_root_password="$(random_hex 32)"
mongo_auth_password="$(random_hex 32)"
mongo_business_password="$(random_hex 32)"
gateway_token="$(random_hex 32)"
guest_secret="$(random_hex 32)"
admin_token="$(random_hex 32)"
plot_token="$(random_hex 32)"
reference_token="$(random_hex 32)"
better_auth_secret="$(single_line "$source_auth_secret")"
prod_access_key_id="$(jq -er '.AccessKey.AccessKeyId' "$prod_key_json")"
prod_access_key_secret="$(jq -er '.AccessKey.AccessKeySecret' "$prod_key_json")"
backup_access_key_id="$(jq -er '.AccessKey.AccessKeyId' "$backup_key_json")"
backup_access_key_secret="$(jq -er '.AccessKey.AccessKeySecret' "$backup_key_json")"

printf '%s\n' "$mongo_root_password" > "$secret_dir/mongo-root-password"
printf '%s\n' "$mongo_auth_password" > "$secret_dir/mongo-auth-password"
printf '%s\n' "$mongo_business_password" > "$secret_dir/mongo-business-password"
openssl rand -base64 756 > "$secret_dir/mongo-keyfile"
chown 0:999 "$secret_dir/mongo-root-password"
chmod 0440 "$secret_dir/mongo-root-password"
chown 999:999 "$secret_dir/mongo-keyfile"
chmod 0400 "$secret_dir/mongo-keyfile"

cat > "$secret_dir/gateway.env" <<EOF
NODE_ENV=production
AUTH_BASE_URL=https://api.paperbanana.asia
FRONTEND_ORIGINS=https://www.paperbanana.asia,https://paperbanana.asia
BETTER_AUTH_SECRET=$better_auth_secret
MONGODB_URI=mongodb://paperbanana_auth:$mongo_auth_password@mongodb:27017/paperbanana_auth?authSource=paperbanana_auth&replicaSet=rs0
MONGODB_DB=paperbanana_auth
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=
PAPERBANANA_BACKEND_TIMEOUT_MS=15000
PAPERBANANA_GATEWAY_TOKEN=$gateway_token
PAPERBANANA_GUEST_COOKIE_SECRET=$guest_secret
PAPERBANANA_GUEST_COOKIE_SECRET_PREVIOUS=
ADMIN_USER_IDS=$ADMIN_USER_IDS
ADMIN_TOKEN=$admin_token
PAPERBANANA_MAINTENANCE_MODE=false
PAPERBANANA_MAINTENANCE_RETRY_AFTER_SECONDS=300
PAPERBANANA_BUCKET=paperbanana-prod-hk-20260814
OSS_PUBLIC_ENDPOINT=https://oss-cn-hongkong.aliyuncs.com
PAPERBANANA_ALLOW_LEGACY_EXTERNAL_REFINE_URL=false
EOF

cat > "$secret_dir/core.env" <<EOF
NODE_ENV=production
PAPERBANANA_GATEWAY_TOKEN=$gateway_token
MONGODB_URI=mongodb://paperbanana_business:$mongo_business_password@mongodb:27017/paperbanana_business?authSource=paperbanana_business&replicaSet=rs0
MONGODB_BUSINESS_DB=paperbanana_business
PAPERBANANA_BUCKET=paperbanana-prod-hk-20260814
OSS_REGION=oss-cn-hongkong
OSS_ACCESS_KEY_ID=$prod_access_key_id
OSS_ACCESS_KEY_SECRET=$prod_access_key_secret
OSS_INTERNAL_ENDPOINT=https://oss-cn-hongkong-internal.aliyuncs.com
OSS_PUBLIC_ENDPOINT=https://oss-cn-hongkong.aliyuncs.com
PAPERBANANA_MAX_ACTIVE_JOBS=1
PAPERBANANA_MAX_PENDING_JOBS=2
PAPERBANANA_MAX_JOBS_PER_OWNER=1
PAPERBANANA_MAX_JOBS_PER_IP=1
PAPERBANANA_READINESS_PROBE_TIMEOUT_MS=2000
PAPERBANANA_MAX_PROVIDER_IMAGE_BYTES=20971520
PAPERBANANA_PROVIDER_EGRESS_MODE=disabled
PAPERBANANA_SG_PROXY_URL=http://10.77.0.2:3128
ADMIN_TOKEN=$admin_token
REFERENCE_UPLOAD_TOKEN_SECRET=$reference_token
PLOT_WORKER_TOKEN=$plot_token
PAPERBANANA_MAX_REFERENCE_IMAGES=3
PAPERBANANA_MAX_REFERENCE_BYTES=5242880
PAPERBANANA_REFERENCE_UPLOAD_TTL_SECONDS=900
PAPERBANANA_SVG_REFERENCE_RASTER_WIDTH=1024
OPENROUTER_MODEL_CACHE_TTL_MS=3600000
PAPERBANANA_MAX_CANDIDATES=3
PAPERBANANA_MAX_CRITIC_ROUNDS=2
PAPERBANANA_CANDIDATE_CONCURRENCY=1
BAILIAN_VISION_MODEL=qwen-vl-max
EOF

cat > "$secret_dir/worker.env" <<EOF
PLOT_WORKER_TOKEN=$plot_token
EOF

cat > "$secret_dir/ossutil-backup.conf" <<EOF
[default]
accessKeyID=$backup_access_key_id
accessKeySecret=$backup_access_key_secret
region=cn-hongkong
endpoint=https://oss-cn-hongkong-internal.aliyuncs.com
EOF

cat > "$secret_dir/backup.env" <<EOF
PAPERBANANA_BACKUP_BUCKET=paperbanana-backup-hk-20260814
OSSUTIL_CONFIG_FILE=$secret_dir/ossutil-backup.conf
EOF

chmod 0600 \
  "$secret_dir/gateway.env" "$secret_dir/core.env" "$secret_dir/worker.env" \
  "$secret_dir/backup.env" "$secret_dir/ossutil-backup.conf" \
  "$secret_dir/mongo-auth-password" "$secret_dir/mongo-business-password"

unset mongo_root_password mongo_auth_password mongo_business_password gateway_token guest_secret admin_token plot_token reference_token better_auth_secret prod_access_key_id prod_access_key_secret backup_access_key_id backup_access_key_secret
echo "Runtime secret files created without printing credential values."
