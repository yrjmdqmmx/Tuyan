#!/usr/bin/env bash
set -Eeuo pipefail

manifest='' manifest_hash='' expected_sha='' max_models='' max_generations='' max_estimated_usd='' confirm='' apply=false
usage() { echo 'invalid bounded Standard batch arguments' >&2; exit 64; }
while (($#)); do
  case "$1" in
    --manifest) manifest="${2:-}"; shift 2 ;; --manifest-hash) manifest_hash="${2:-}"; shift 2 ;;
    --expected-sha) expected_sha="${2:-}"; shift 2 ;; --max-models) max_models="${2:-}"; shift 2 ;;
    --max-generations) max_generations="${2:-}"; shift 2 ;; --max-estimated-usd) max_estimated_usd="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;; --apply) apply=true; shift ;; *) usage ;;
  esac
done
[[ "$manifest_hash" =~ ^[a-f0-9]{64}$ && "$expected_sha" =~ ^[a-f0-9]{40}$ ]] || usage
[[ "$max_models" =~ ^[1-9][0-9]*$ && "$max_generations" =~ ^[1-9][0-9]*$ && "$max_estimated_usd" =~ ^[0-9]+([.][0-9]+)?$ ]] || usage
((max_models <= 48 && max_generations == max_models * 4 && max_generations <= 192)) || usage
[[ "$confirm" == run-exact-approved-standard-batch-disabled-worker ]] || usage

test_root=''
script_dir="${PAPERBANANA_BENCH_BATCH_SCRIPT_DIR:-$(cd "$(dirname "$0")" && pwd -P)}"
if [[ -n "${PAPERBANANA_HK_TEST_ROOT:-}" ]]; then
  test_root="$(realpath "$PAPERBANANA_HK_TEST_ROOT")"
  case "$test_root/" in /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;; *) exit 1 ;; esac
  [[ -f "$test_root/.paperbanana-hk-test-root" && "$(<"$test_root/.paperbanana-hk-test-root")" == paperbanana-hk-test-root-v1 ]] || exit 1
  [[ "$apply" != true ]] || { echo 'test root never permits paid apply' >&2; exit 1; }
  deploy_dir="$test_root/opt/paperbanana/repo/deploy/hk-single-host"
  lock_path="$test_root/run/lock/paperbanana-hk-production.lock"
else
  [[ "$(id -u)" == 0 ]] || { echo 'operator must run as root' >&2; exit 1; }
  deploy_dir='/opt/paperbanana/repo/deploy/hk-single-host'
  lock_path='/run/lock/paperbanana-hk-production.lock'
  case "$manifest" in /opt/paperbanana/bench/manifests/*.json) ;; *) usage ;; esac
fi
[[ -f "$manifest" && ! -L "$manifest" ]] || usage
mode="$(stat -c '%a' "$manifest" 2>/dev/null || stat -f '%Lp' "$manifest")"
[[ "$mode" =~ ^(400|600)$ ]] || usage
actual_hash="$(sha256sum "$manifest" 2>/dev/null | awk '{print $1}' || shasum -a 256 "$manifest" | awk '{print $1}')"
[[ "$actual_hash" == "$manifest_hash" ]] || usage
node "$script_dir/verify-benchmark-standard-batch.mjs" "$manifest"
[[ "$(jq -r '.codeSha' "$manifest")" == "$expected_sha" ]] || usage
[[ "$(jq -r '.maxModels' "$manifest")" == "$max_models" && "$(jq -r '.maxGenerations' "$manifest")" == "$max_generations" ]] || usage
awk -v expected="$max_estimated_usd" -v actual="$(jq -r '.maxEstimatedUsd' "$manifest")" 'BEGIN { if (expected != actual) exit 1 }' || usage

phase_script="$script_dir/run-benchmark-phase-operator.sh"
run_entry() {
  local row="$1" value
  local values=()
  while IFS= read -r value; do values[${#values[@]}]="$value"; done < <(jq -r '.canonicalModelId, .args.runId, .args.provider, .args.modelId, .args.lane, .args.suiteHash, .args.judgeEpoch, .args.judgeStackHash, .args.signedAuthorizationHash, .args.priceHash, .args.runHash, .args.runFactsHash, .args.candidateSnapshotHash, .args.aspectRatiosHash, .args.registryHash, .args.runIntegrityAttestation, .args.immutableFactsHash, (.args.maxEstimatedUsd|tostring), (.args.estimatedPerGenerationUsd|tostring), .args.priceSource, .args.priceCapturedAt' <<<"$row")
  [[ "${#values[@]}" == 21 ]] || usage
  local args=(--phase standard --run-id "${values[1]}" --expected-sha "$expected_sha" --provider "${values[2]}" --model-id "${values[3]}" --lane "${values[4]}"
    --suite-id pb-image-light-v1 --suite-hash "${values[5]}" --judge-epoch "${values[6]}" --judge-stack-hash "${values[7]}"
    --signed-authorization-hash "${values[8]}" --price-hash "${values[9]}" --run-hash "${values[10]}" --run-facts-hash "${values[11]}"
    --candidate-snapshot-hash "${values[12]}" --aspect-ratios-hash "${values[13]}" --registry-hash "${values[14]}"
    --run-integrity-attestation "${values[15]}" --immutable-facts-hash "${values[16]}" --max-generations 4 --max-judgments 0 --max-judge-calls 0
    --max-estimated-usd "${values[17]}" --estimated-per-generation-usd "${values[18]}" --estimated-per-judge-call-usd 0
    --price-currency USD --price-source "${values[19]}" --price-captured-at "${values[20]}" --confirm run-exact-approved-standard-phase-disabled-worker)
  if [[ "$apply" == true ]]; then PAPERBANANA_BENCH_BATCH_LOCK_HELD=1 "$phase_script" "${args[@]}" --apply
  else "$phase_script" "${args[@]}"
  fi
}

if [[ "$apply" == true ]]; then mkdir -p "$(dirname "$lock_path")"; exec 9>"$lock_path"; flock -x 9; fi
total=0 completed=0 failed=0
while IFS= read -r row; do
  total=$((total + 1))
  if run_entry "$row" </dev/null; then completed=$((completed + 1)); else failed=$((failed + 1)); fi
done < <(jq -c '.entries[]' "$manifest")
printf '{"total":%d,"completed":%d,"failed":%d,"maxGenerations":%d}\n' "$total" "$completed" "$failed" "$max_generations"
((failed == 0))
