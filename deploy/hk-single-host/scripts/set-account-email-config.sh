#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

usage() {
  echo "usage: $0 --credentials PATH --delivery enabled|disabled --verification optional|required [--dry-run|--apply]" >&2
  exit 2
}

mode="--dry-run"
credentials=""
delivery=""
verification=""
while (( $# > 0 )); do
  case "$1" in
    --apply|--dry-run)
      mode="$1"
      shift
      ;;
    --credentials)
      [[ $# -ge 2 ]] || usage
      credentials="$2"
      shift 2
      ;;
    --delivery)
      [[ $# -ge 2 ]] || usage
      delivery="$2"
      shift 2
      ;;
    --verification)
      [[ $# -ge 2 ]] || usage
      verification="$2"
      shift 2
      ;;
    *) usage ;;
  esac
done

[[ "$delivery" == "enabled" || "$delivery" == "disabled" ]] || usage
[[ "$verification" == "optional" || "$verification" == "required" ]] || usage
if [[ "$delivery" == "disabled" && "$verification" == "required" ]]; then
  echo "required verification cannot be enabled while email delivery is disabled" >&2
  exit 2
fi
[[ -n "$credentials" ]] || usage

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
  echo "set-account-email-config.sh --apply must run as root" >&2
  exit 1
fi

host_path() { printf '%s%s' "$test_root" "$1"; }
gateway_env="$(host_path /opt/paperbanana/secrets/gateway.env)"

for path in "$gateway_env" "$credentials"; do
  [[ -f "$path" && ! -L "$path" ]] || {
    echo "required input must be an existing regular file and must not be a symlink" >&2
    exit 1
  }
done

stat_triplet() {
  stat -c '%u:%g:%a' -- "$1" 2>/dev/null || stat -f '%u:%g:%Lp' -- "$1"
}
gateway_metadata="$(stat_triplet "$gateway_env")" || {
  echo "cannot inspect gateway.env ownership and mode" >&2
  exit 1
}
IFS=: read -r gateway_owner_id gateway_group_id gateway_mode_bits <<<"$gateway_metadata"
for path in "$gateway_env" "$credentials"; do
  metadata="$(stat_triplet "$path")" || {
    echo "cannot inspect protected input ownership and mode" >&2
    exit 1
  }
  IFS=: read -r owner_id group_id mode_bits <<<"$metadata"
  [[ "$owner_id" =~ ^[0-9]+$ && "$group_id" =~ ^[0-9]+$ && "$mode_bits" =~ ^[0-7]{3,4}$ ]] || {
    echo "protected input ownership or mode is invalid" >&2
    exit 1
  }
  expected_owner="0"
  [[ -n "$test_root" ]] && expected_owner="$EUID"
  [[ "$owner_id" == "$expected_owner" && $((8#$mode_bits & 0077)) -eq 0 ]] || {
    echo "protected inputs must be owner-only" >&2
    exit 1
  }
done

validate_env_syntax() {
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
  ' "$1"
}
if ! validate_env_syntax "$gateway_env"; then
  echo "existing gateway.env is invalid; no changes were made" >&2
  exit 1
fi

access_key_id="$(jq -er '.AccessKey.AccessKeyId | select(type == "string" and length > 0)' "$credentials")" || {
  echo "DirectMail credential file is invalid" >&2
  exit 1
}
access_key_secret="$(jq -er '.AccessKey.AccessKeySecret | select(type == "string" and length > 0)' "$credentials")" || {
  echo "DirectMail credential file is invalid" >&2
  exit 1
}
[[ "$access_key_id" != *$'\n'* && "$access_key_id" != *$'\r'* && "$access_key_secret" != *$'\n'* && "$access_key_secret" != *$'\r'* ]] || {
  echo "DirectMail credentials must be single-line values" >&2
  exit 1
}

delivery_value=false
verification_value=false
[[ "$delivery" == "enabled" ]] && delivery_value=true
[[ "$verification" == "required" ]] && verification_value=true

managed_keys='^(AUTH_EMAIL_DELIVERY_ENABLED|AUTH_REQUIRE_EMAIL_VERIFICATION|AUTH_VERIFICATION_CALLBACK_URL|AUTH_PASSWORD_RESET_URL|AUTH_EMAIL_WINDOW_SECONDS|AUTH_EMAIL_WINDOW_MAX|AUTH_EMAIL_DAILY_MAX|ALIBABA_DIRECTMAIL_REGION_ID|ALIBABA_DIRECTMAIL_ENDPOINT|ALIBABA_DIRECTMAIL_ACCOUNT_NAME|ALIBABA_DIRECTMAIL_FROM_ALIAS|ALIBABA_DIRECTMAIL_ACCESS_KEY_ID|ALIBABA_DIRECTMAIL_ACCESS_KEY_SECRET)='
candidate="$(mktemp "$(dirname -- "$gateway_env")/.gateway.env.account-email.XXXXXX")"
cleanup() {
  rm -f -- "${candidate:-}"
  unset access_key_id access_key_secret
}
trap cleanup EXIT

awk -v managed="$managed_keys" '$0 !~ managed { print }' "$gateway_env" > "$candidate"
cat >> "$candidate" <<EOF
AUTH_EMAIL_DELIVERY_ENABLED=$delivery_value
AUTH_REQUIRE_EMAIL_VERIFICATION=$verification_value
AUTH_VERIFICATION_CALLBACK_URL=https://www.paperbanana.asia/account/email-verified.html
AUTH_PASSWORD_RESET_URL=https://www.paperbanana.asia/account/reset-password.html
AUTH_EMAIL_WINDOW_SECONDS=900
AUTH_EMAIL_WINDOW_MAX=3
AUTH_EMAIL_DAILY_MAX=10
ALIBABA_DIRECTMAIL_REGION_ID=cn-hangzhou
ALIBABA_DIRECTMAIL_ENDPOINT=dm.aliyuncs.com
ALIBABA_DIRECTMAIL_ACCOUNT_NAME=account@mail.paperbanana.asia
ALIBABA_DIRECTMAIL_FROM_ALIAS=图研 Tuyan
ALIBABA_DIRECTMAIL_ACCESS_KEY_ID=$access_key_id
ALIBABA_DIRECTMAIL_ACCESS_KEY_SECRET=$access_key_secret
EOF

chmod "$gateway_mode_bits" "$candidate"
if (( EUID == 0 )); then chown "$gateway_owner_id:$gateway_group_id" "$candidate"; fi
if ! validate_env_syntax "$candidate"; then
  echo "generated gateway.env candidate is invalid; the original was preserved" >&2
  exit 1
fi

if cmp -s -- "$candidate" "$gateway_env"; then
  echo "Account email configuration is already current; gateway.env is unchanged."
  exit 0
fi
if [[ "$mode" == "--dry-run" ]]; then
  echo "Dry-run: would atomically update the account email configuration; credential values were not printed."
  exit 0
fi

mv -f -- "$candidate" "$gateway_env"
candidate=""
echo "Account email configuration was atomically updated; credential values were not printed."
