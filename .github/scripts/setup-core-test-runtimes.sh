#!/usr/bin/env bash
set -euo pipefail

# The runner's Azure mirror repeatedly stalled large Office/font downloads.
# Keep its official Ubuntu archive/security fallbacks and normal signatures.
if [ -f /etc/apt/apt-mirrors.txt ]; then
  sudo sed -i '/azure\.archive\.ubuntu\.com/d' /etc/apt/apt-mirrors.txt
fi
apt_options=(-o Acquire::Retries=3 -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30)
sudo apt-get "${apt_options[@]}" update -qq
sudo apt-get "${apt_options[@]}" install -y acl python3-venv fontconfig fonts-noto-cjk libreoffice-impress libreoffice-writer
/usr/bin/python3 -m venv "$RUNNER_TEMP/plot-venv"
"$RUNNER_TEMP/plot-venv/bin/python" -m pip install -r apps/plot-worker/requirements.txt
# Linux RLIMIT_NPROC counts all threads for a UID. Keep real plot
# children separate from the runner/pnpm/Node processes, retaining 64.
sudo useradd --system --no-create-home tuyan-plot-qa
sudo setfacl -m u:tuyan-plot-qa:--x /home/runner /home/runner/work "$RUNNER_TEMP" "$GITHUB_WORKSPACE" "$(dirname "$GITHUB_WORKSPACE")"
printf '#!/bin/sh\nexec sudo -n -u tuyan-plot-qa --preserve-env=PYTHONPATH "%s" "$@"\n' "$RUNNER_TEMP/plot-venv/bin/python" > "$RUNNER_TEMP/plot-python"
chmod 755 "$RUNNER_TEMP/plot-python"
echo "TUYAN_QA_PYTHON=$RUNNER_TEMP/plot-python" >> "$GITHUB_ENV"
echo "TUYAN_QA_EVIDENCE_DIR=$RUNNER_TEMP/tuyan-qa-evidence" >> "$GITHUB_ENV"
