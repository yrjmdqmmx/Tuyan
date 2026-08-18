#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  echo "usage: $0 disabled degraded | sg-required degraded-or-ready" >&2
  exit 2
}

[[ $# -eq 2 ]] || usage
expected_mode="$1"
expected_provider_state="$2"
case "$expected_mode:$expected_provider_state" in
  disabled:degraded|sg-required:degraded-or-ready) ;;
  *) usage ;;
esac

if (( EUID != 0 )); then
  echo "Core delivery-state verification must run as root" >&2
  exit 1
fi

compose=(
  docker compose
  --project-name paperbanana-hk
  --project-directory /opt/paperbanana/repo/deploy/hk-single-host
  --env-file /opt/paperbanana/repo/deploy/hk-single-host/.env
  -f /opt/paperbanana/repo/deploy/hk-single-host/compose.yaml
)

core_id=""
core_health=""
ready_payload=""
verified=false
for attempt in $(seq 1 60); do
  if core_id="$("${compose[@]}" ps --status running -q paperbanana-api)" && [[ "$core_id" =~ ^[0-9a-f]{12,64}$ ]]; then
    if core_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$core_id")" && [[ "$core_health" == "healthy" ]]; then
      if ready_payload="$("${compose[@]}" exec -T paperbanana-api node -e '
        fetch("http://127.0.0.1:3000/ready")
          .then(async (response) => {
            if (response.status !== 200) process.exit(1)
            process.stdout.write(await response.text())
          })
          .catch(() => process.exit(1))
      ')" && jq -e '.ready == true' >/dev/null <<<"$ready_payload"; then
        verified=true
        break
      fi
    fi
  fi
  core_id=""
  core_health=""
  ready_payload=""
  sleep 2
done
if [[ "$verified" != true ]]; then
  echo "Core did not become running, Docker-healthy, and HTTP-ready within the bounded wait" >&2
  exit 1
fi

container_mode="$("${compose[@]}" exec -T paperbanana-api printenv PAPERBANANA_PROVIDER_EGRESS_MODE)" || {
  echo "could not read the running Core delivery mode" >&2
  exit 1
}
if [[ "$container_mode" != "$expected_mode" ]]; then
  echo "running Core delivery mode does not match the expected state" >&2
  exit 1
fi

health_payload="$("${compose[@]}" exec -T paperbanana-api node -e '
  fetch("http://127.0.0.1:3000/health")
    .then(async (response) => {
      if (response.status !== 200) process.exit(1)
      process.stdout.write(await response.text())
    })
    .catch(() => process.exit(1))
')" || {
  echo "could not read Core health after the bounded wait" >&2
  exit 1
}

case "$expected_mode:$expected_provider_state" in
  disabled:degraded)
    jq -e '.ready == true and .dependencies.providerEgress == "degraded"' >/dev/null <<<"$health_payload" || {
      echo "disabled Core health does not report providerEgress degraded" >&2
      exit 1
    }
    ;;
  sg-required:degraded-or-ready)
    jq -e '.ready == true and (.dependencies.providerEgress == "degraded" or .dependencies.providerEgress == "ready")' >/dev/null <<<"$health_payload" || {
      echo "sg-required Core health does not report an accepted providerEgress state" >&2
      exit 1
    }
    ;;
esac

echo "Core delivery state verified."
