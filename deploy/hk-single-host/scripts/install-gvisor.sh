#!/usr/bin/env bash
set -Eeuo pipefail

mode="${1:---dry-run}"
snapshot_marker="/opt/paperbanana/control/pre-change-snapshot-id"

if [[ "$mode" != "--apply" && "$mode" != "--dry-run" ]]; then
  echo "usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi
test "${EUID}" -eq 0 || { echo "run as root" >&2; exit 1; }
test -s "$snapshot_marker" || {
  echo "missing completed snapshot marker: $snapshot_marker" >&2
  exit 1
}

openvac_containers=(
  openvac-production-web-1
  openvac-production-worker-1
  openvac-production-postgres-1
)
for container in "${openvac_containers[@]}"; do
  test "$(docker inspect -f '{{.State.Running}}' "$container")" = true || {
    echo "OpenVac precheck failed: $container is not running" >&2
    exit 1
  }
done
curl --fail --silent --show-error http://127.0.0.1:3010/api/health >/dev/null

if [[ "$mode" == "--dry-run" ]]; then
  echo "Snapshot marker and OpenVac prechecks passed. --apply installs runsc and restarts Docker once."
  exit 0
fi

arch="$(dpkg --print-architecture)"
keyring="/usr/share/keyrings/gvisor-archive-keyring.gpg"
curl --fail --silent --show-error https://gvisor.dev/archive.key | gpg --dearmor --yes -o "$keyring"
printf 'deb [arch=%s signed-by=%s] https://storage.googleapis.com/gvisor/releases release main\n' "$arch" "$keyring" > /etc/apt/sources.list.d/gvisor.list
apt-get update
apt-get install -y --no-install-recommends runsc
runsc install
systemctl restart docker

for _ in $(seq 1 90); do
  if docker info --format '{{json .Runtimes}}' 2>/dev/null | grep -q 'runsc'; then
    all_running=true
    for container in "${openvac_containers[@]}"; do
      if [[ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || true)" != true ]]; then
        all_running=false
      fi
    done
    if [[ "$all_running" == true ]] && curl --fail --silent http://127.0.0.1:3010/api/health >/dev/null 2>&1; then
      runsc --version
      echo "gVisor installed; Docker and OpenVac recovered successfully."
      exit 0
    fi
  fi
  sleep 2
done

echo "Docker/OpenVac did not recover within the expected window" >&2
exit 1
