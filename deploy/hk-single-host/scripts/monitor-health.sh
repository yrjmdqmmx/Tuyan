#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
state_dir="/var/lib/paperbanana-monitor"
status_file="$state_dir/status"
offset_file="$state_dir/nginx.offset"
access_log="/var/log/nginx/paperbanana-api.access.log"
cert_file="/etc/letsencrypt/live/api.paperbanana.asia/cert.pem"
backup_dir="/opt/paperbanana/backups"
monitor_env="/opt/paperbanana/secrets/monitor.env"
failures=()

install -d -m 0700 "$state_dir"

if [[ -z "${ALIBABA_CLOUD_ACCESS_KEY_ID:-}" && -r "$monitor_env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$monitor_env"
  set +a
fi

record_failure() {
  failures+=("$1")
}

check_json_endpoint() {
  local label="$1"
  local url="$2"
  local filter="$3"
  local response
  if ! response="$(curl --fail --silent --show-error --max-time 10 "$url" 2>/dev/null)"; then
    record_failure "$label request failed"
  elif ! jq -e "$filter" >/dev/null 2>&1 <<<"$response"; then
    record_failure "$label returned an unhealthy payload"
  fi
}

check_json_endpoint "API health" "https://api.paperbanana.asia/health" \
  '.ok == true and .runtime == "gateway" and .backend.ok == true'
check_json_endpoint "API readiness" "https://api.paperbanana.asia/ready" \
  '.ok == true and .runtime == "gateway" and .backend.ok == true and .backend.data.ready == true'
check_json_endpoint "Legacy compatibility proxy" "https://yifbnnzrwmxn.sealoshzh.site/health" \
  '.ok == true and .runtime == "gateway" and .backend.ok == true'
check_json_endpoint "OpenVac health" "http://127.0.0.1:3010/api/health" \
  '(.ok == true) or (.status == "ok") or (.status == "healthy")'

for container_name in \
  paperbanana-hk-auth-gateway-1 \
  paperbanana-hk-paperbanana-api-1 \
  paperbanana-hk-mongodb-1 \
  paperbanana-hk-plot-worker-1
do
  container_state="$(docker inspect --format '{{.State.Status}}{{if .State.Health}} {{.State.Health.Status}}{{end}}' "$container_name" 2>/dev/null || true)"
  if [[ "$container_state" != "running healthy" ]]; then
    record_failure "$container_name is not healthy"
  fi
done

mongo_query='db.getSiblingDB("paperbanana_business").getCollection("paperbanana_jobs").countDocuments({status:{$in:["queued","running"]},updatedAt:{$lt:new Date(Date.now()-3600000)}})'
if ! stuck_jobs="$(docker exec paperbanana-hk-mongodb-1 sh -c \
  'mongosh --quiet --host 127.0.0.1 --username "$MONGO_INITDB_ROOT_USERNAME" --password "$(cat /run/secrets/mongo_root_password)" --authenticationDatabase admin --eval "$1"' \
  sh "$mongo_query" 2>/dev/null | tail -n 1)"; then
  record_failure "MongoDB connectivity check failed"
elif [[ ! "$stuck_jobs" =~ ^[0-9]+$ ]]; then
  record_failure "MongoDB stuck-job query returned an invalid count"
elif (( stuck_jobs > 0 )); then
  record_failure "MongoDB has $stuck_jobs jobs stuck for over one hour"
fi

if ! systemctl is-active --quiet paperbanana-backup.timer; then
  record_failure "daily backup timer is inactive"
fi
backup_result="$(systemctl show paperbanana-backup.service --property=Result --value 2>/dev/null || true)"
if [[ "$backup_result" != "success" ]]; then
  record_failure "last daily backup did not succeed"
fi
latest_backup="$(find "$backup_dir" -maxdepth 1 -type f -name 'paperbanana-mongo-*.archive.gz' -print 2>/dev/null | sort | tail -n 1)"
if [[ -z "$latest_backup" ]]; then
  record_failure "no local MongoDB backup archive exists"
else
  backup_age="$(( $(date +%s) - $(stat -c %Y "$latest_backup") ))"
  if (( backup_age > 129600 )); then
    record_failure "latest MongoDB backup is older than 36 hours"
  fi
  if [[ ! -s "$latest_backup.sha256" ]]; then
    record_failure "latest MongoDB backup checksum is missing"
  fi
fi

if ! openssl x509 -checkend 1209600 -noout -in "$cert_file" >/dev/null 2>&1; then
  record_failure "API TLS certificate expires within 14 days"
fi

if [[ -f "$access_log" ]]; then
  current_inode="$(stat -c %i "$access_log")"
  current_lines="$(wc -l < "$access_log")"
  start_line="$((current_lines + 1))"
  if [[ -r "$offset_file" ]]; then
    IFS=: read -r previous_inode previous_lines < "$offset_file" || true
    if [[ "$previous_inode" == "$current_inode" && "$previous_lines" =~ ^[0-9]+$ && "$previous_lines" -le "$current_lines" ]]; then
      start_line="$((previous_lines + 1))"
    elif [[ "$previous_inode" != "$current_inode" ]]; then
      start_line=1
    fi
  fi
  new_5xx=0
  if (( start_line <= current_lines )); then
    new_5xx="$(sed -n "${start_line},${current_lines}p" "$access_log" | awk '$9 ~ /^5[0-9][0-9]$/ { count++ } END { print count + 0 }')"
  fi
  printf '%s:%s\n' "$current_inode" "$current_lines" > "$offset_file.tmp"
  mv "$offset_file.tmp" "$offset_file"
  if (( new_5xx >= 5 )); then
    record_failure "Nginx observed $new_5xx new API 5xx responses"
  fi
else
  record_failure "PaperBanana Nginx access log is missing"
fi

now_epoch="$(date +%s)"
previous_status=""
previous_notification=0
if [[ -r "$status_file" ]]; then
  IFS=: read -r previous_status previous_notification < "$status_file" || true
fi

if (( ${#failures[@]} > 0 )); then
  notification_due=false
  if [[ "$previous_status" != "unhealthy" || ! "$previous_notification" =~ ^[0-9]+$ || $((now_epoch - previous_notification)) -ge 3600 ]]; then
    notification_due=true
  fi
  if [[ "$notification_due" == true ]]; then
    summary="$(IFS='; '; echo "${failures[*]}")"
    if "$script_dir/report-cms-event.py" \
      --event-name PaperBananaProductionHealthFailure \
      --content "host=$(hostname); failures=$summary; observed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    then
      previous_notification="$now_epoch"
    fi
  fi
  printf 'unhealthy:%s\n' "$previous_notification" > "$status_file.tmp"
  mv "$status_file.tmp" "$status_file"
  printf 'PaperBanana production health check failed: %s\n' "$(IFS='; '; echo "${failures[*]}")" >&2
  exit 1
fi

printf 'healthy:%s\n' "$now_epoch" > "$status_file.tmp"
mv "$status_file.tmp" "$status_file"
echo "PaperBanana production health check passed"
