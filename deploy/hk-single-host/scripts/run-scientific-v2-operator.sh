#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

mode='inspect'
expected_sha=''
expected_core_digest=''
expected_worker_digest=''
bundle_sha256=''
registry_hash=''
suite_hash=''
price_hash=''
manifest_hash=''
model_count=''
confirm=''
apply=false
zero_provider_modes='inspect reconcile_artifact import_codex render_public_evidence review_pack review_validate review_arbitrate review_finalize'
spool_rw_modes='run reconcile_artifact'

usage() {
  echo 'usage: run-scientific-v2-operator.sh [--mode inspect|run|reconcile_artifact|import_codex|render_public_evidence|review_pack|review_validate|review_arbitrate|review_finalize] --expected-sha 40_HEX --expected-core-digest 64_HEX --expected-worker-digest 64_HEX --bundle-sha256 64_HEX --registry-hash 64_HEX --suite-hash 64_HEX --price-hash 64_HEX --manifest-hash 64_HEX --model-count N --confirm PHRASE [--apply]' >&2
  exit 64
}

while (( $# > 0 )); do
  case "$1" in
    --mode) mode="${2:-}"; shift 2 ;;
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --expected-core-digest) expected_core_digest="${2:-}"; shift 2 ;;
    --expected-worker-digest) expected_worker_digest="${2:-}"; shift 2 ;;
    --bundle-sha256) bundle_sha256="${2:-}"; shift 2 ;;
    --registry-hash) registry_hash="${2:-}"; shift 2 ;;
    --suite-hash) suite_hash="${2:-}"; shift 2 ;;
    --price-hash) price_hash="${2:-}"; shift 2 ;;
    --manifest-hash) manifest_hash="${2:-}"; shift 2 ;;
    --model-count) model_count="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    --apply) apply=true; shift ;;
    *) usage ;;
  esac
done

hash_pattern='^[a-f0-9]{64}$'
[[ "$mode" =~ ^(inspect|run|reconcile_artifact|import_codex|render_public_evidence|review_pack|review_validate|review_arbitrate|review_finalize)$ && "$expected_sha" =~ ^[a-f0-9]{40}$
  && ( -z "$expected_core_digest" || "$expected_core_digest" =~ $hash_pattern )
  && ( -z "$expected_worker_digest" || "$expected_worker_digest" =~ $hash_pattern )
  && "$bundle_sha256" =~ $hash_pattern && "$registry_hash" =~ $hash_pattern
  && "$suite_hash" =~ $hash_pattern && "$price_hash" =~ $hash_pattern
  && "$manifest_hash" =~ $hash_pattern && "$model_count" =~ ^[1-9][0-9]*$
  && "$model_count" -le 257 ]] || usage
case "$mode" in
  inspect)
    [[ "$confirm" == inspect-scientific-v2-disabled-worker ]] || usage
    [[ "$apply" == false ]] || { echo 'inspect never accepts apply' >&2; exit 64; }
    ;;
  run)
    [[ "$confirm" == run-exact-scientific-v2-bundle-disabled-worker ]] || usage
    ;;
  reconcile_artifact) [[ "$confirm" == reconcile-artifact-scientific-v2-disabled-worker ]] || usage ;;
  import_codex) [[ "$confirm" == import-codex-scientific-v2-disabled-worker ]] || usage ;;
  render_public_evidence) [[ "$confirm" == render-public-evidence-scientific-v2-disabled-worker ]] || usage ;;
  review_pack) [[ "$confirm" == review-pack-scientific-v2-disabled-worker ]] || usage ;;
  review_validate) [[ "$confirm" == review-validate-scientific-v2-disabled-worker ]] || usage ;;
  review_arbitrate) [[ "$confirm" == review-arbitrate-scientific-v2-disabled-worker ]] || usage ;;
  review_finalize) [[ "$confirm" == review-finalize-scientific-v2-disabled-worker ]] || usage ;;
esac
if [[ "$mode" != inspect && "$apply" != true ]]; then
  echo "scientific v2 $mode requires --apply" >&2
  exit 64
fi

test_root=''
if [[ -n "${PAPERBANANA_HK_TEST_ROOT:-}" ]]; then
  test_root="$(realpath "$PAPERBANANA_HK_TEST_ROOT")"
  case "$test_root/" in /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;; *) exit 1 ;; esac
  [[ -f "$test_root/.paperbanana-hk-test-root" && ! -L "$test_root/.paperbanana-hk-test-root"
    && "$(<"$test_root/.paperbanana-hk-test-root")" == paperbanana-hk-test-root-v1 ]] || exit 1
  [[ "$apply" == false || "${PAPERBANANA_SCIENTIFIC_V2_TEST_ALLOW_APPLY_DRY_RUN:-false}" == true ]] || {
    echo 'test roots never permit real apply' >&2; exit 1;
  }
else
  [[ "$(id -u)" == 0 ]] || { echo 'scientific v2 operator must run as root' >&2; exit 1; }
  [[ "$expected_core_digest" =~ $hash_pattern && "$expected_worker_digest" =~ $hash_pattern ]] || usage
fi

host_path() { printf '%s%s' "$test_root" "$1"; }
repo_root="$(host_path /opt/paperbanana/repo)"
deploy_dir="$repo_root/deploy/hk-single-host"
secret_dir="$(host_path /opt/paperbanana/secrets)"
deploy_env="$deploy_dir/.env"
core_env="$secret_dir/core.env"
bench_env="$secret_dir/bench.env"
bundle_dir="$(host_path /opt/paperbanana/operator-bundles/scientific-v2)"
bundle_path="$bundle_dir/$bundle_sha256.json"
lock_path="$(host_path /run/lock/paperbanana-hk-production.lock)"
artifact_spool_host="$(host_path /opt/paperbanana/data/scientific-v2-artifact-spool)"
artifact_spool_container='/var/lib/paperbanana/scientific-v2-artifact-spool'
bundle_container='/run/paperbanana-scientific-v2/bundle.json'
input_container_dir='/run/paperbanana-scientific-v2'
output_container_dir='/run/paperbanana-scientific-v2-output'
review_private_dir="$(host_path /opt/paperbanana/operator-private/scientific-v2)"
review_private_path="$review_private_dir/$bundle_sha256.review-private.json"
render_private_path="$review_private_dir/$bundle_sha256.publish-input.json"
review_validate_private_path="$review_private_dir/$bundle_sha256.review-validated.json"
review_arbitrate_private_path="$review_private_dir/$bundle_sha256.review-arbitrated.json"
review_finalize_private_path="$review_private_dir/$bundle_sha256.review-finalized.json"
codex_artifact_dir="$(host_path /opt/paperbanana/operator-private/scientific-v2/codex-artifacts/$manifest_hash)"
codex_artifact_container='/run/paperbanana-scientific-v2-codex-artifacts'

mkdir -p -- "$(dirname -- "$lock_path")"
exec 9>"$lock_path"
portable_lock_dir=''
if command -v flock >/dev/null 2>&1; then
  flock -x 9
elif [[ -n "$test_root" ]]; then
  portable_lock_dir="${lock_path}.d"
  mkdir -- "$portable_lock_dir"
else
  echo 'flock is required for the production scientific v2 operator' >&2
  exit 1
fi

input_dir=''
output_dir=''
result_path=''
cleanup() {
  [[ -z "$result_path" ]] || rm -f -- "$result_path"
  if [[ -n "$input_dir" ]]; then
    chmod 0700 "$input_dir" 2>/dev/null || true
    rm -f -- "$input_dir/bundle.json"
    rmdir -- "$input_dir" 2>/dev/null || true
  fi
  if [[ -n "$output_dir" ]]; then
    rm -f -- "$output_dir/review-private.json" "$output_dir/result.json" "$output_dir/race-replacement.json"
    rmdir -- "$output_dir" 2>/dev/null || true
  fi
  [[ -z "$portable_lock_dir" ]] || rmdir -- "$portable_lock_dir" 2>/dev/null || true
}
trap cleanup EXIT

stat_triplet() {
  stat -c '%u:%g:%a' -- "$1" 2>/dev/null || stat -f '%u:%g:%Lp' -- "$1"
}
persist_private_result() {
  local source="$1"
  local destination="$2"
  local source_owner="${3:-$expected_owner}"
  python3 - "$source" "$destination" "$source_owner" "$expected_owner" "$expected_group" <<'PY'
import os
import stat
import sys

source, destination, source_owner_text, owner_text, group_text = sys.argv[1:]
source_owner = int(source_owner_text)
owner = int(owner_text)
group = int(group_text)
source_fd = destination_fd = None
created = False
try:
    source_fd = os.open(source, os.O_RDONLY | os.O_NOFOLLOW)
    source_stat = os.fstat(source_fd)
    if (not stat.S_ISREG(source_stat.st_mode) or source_stat.st_nlink != 1
            or source_stat.st_uid != source_owner or stat.S_IMODE(source_stat.st_mode) != 0o600
            or source_stat.st_size < 2 or source_stat.st_size > 64 * 1024 * 1024):
        raise RuntimeError('source')
    data = b''
    while len(data) <= 64 * 1024 * 1024:
        chunk = os.read(source_fd, min(1024 * 1024, 64 * 1024 * 1024 + 1 - len(data)))
        if not chunk:
            break
        data += chunk
    if len(data) != source_stat.st_size or len(data) > 64 * 1024 * 1024:
        raise RuntimeError('size')
    try:
        destination_fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        created = True
        os.fchown(destination_fd, owner, group)
        os.fchmod(destination_fd, 0o600)
        view = memoryview(data)
        while view:
            written = os.write(destination_fd, view)
            if written < 1:
                raise RuntimeError('write')
            view = view[written:]
        os.fsync(destination_fd)
    except FileExistsError:
        existing_fd = os.open(destination, os.O_RDONLY | os.O_NOFOLLOW)
        try:
            existing_stat = os.fstat(existing_fd)
            existing = os.read(existing_fd, 64 * 1024 * 1024 + 1)
            if (not stat.S_ISREG(existing_stat.st_mode) or existing_stat.st_nlink != 1
                    or existing_stat.st_uid != owner or stat.S_IMODE(existing_stat.st_mode) != 0o600
                    or existing != data):
                raise RuntimeError('collision')
        finally:
            os.close(existing_fd)
except Exception:
    if created:
        try:
            if destination_fd is not None:
                os.close(destination_fd)
                destination_fd = None
            os.unlink(destination)
        except OSError:
            pass
    sys.stderr.write('scientific v2 protected handoff persistence failed\n')
    raise SystemExit(1)
finally:
    if destination_fd is not None:
        os.close(destination_fd)
    if source_fd is not None:
        os.close(source_fd)
PY
}
expected_owner=0
expected_group=0
if [[ -n "$test_root" ]]; then
  expected_owner="$EUID"
  expected_group="$(id -g)"
fi
service_uid=1000
service_gid=1000
if [[ -n "$test_root" ]]; then
  service_uid="$EUID"
  service_gid="$(id -g)"
fi

tracked_operator_paths=(
  .github/workflows/run-scientific-v2-operator.yml
  deploy/hk-single-host/compose.yaml
  deploy/hk-single-host/scripts/run-scientific-v2-operator.sh
)
actual_head="$(git -C "$repo_root" rev-parse --verify HEAD 2>/dev/null)" || {
  echo 'scientific v2 source HEAD is unavailable' >&2; exit 1;
}
[[ "$actual_head" == "$expected_sha" ]] || {
  echo 'scientific v2 source HEAD does not match the expected SHA' >&2; exit 1;
}
for tracked_path in "${tracked_operator_paths[@]}"; do
  git -C "$repo_root" ls-files --error-unmatch "$tracked_path" >/dev/null 2>&1 || {
    echo 'scientific v2 source gate is missing a tracked operator file' >&2; exit 1;
  }
done
git -C "$repo_root" diff --quiet "$expected_sha" -- "${tracked_operator_paths[@]}" || {
  echo 'scientific v2 tracked operator source is dirty or drifted' >&2; exit 1;
}

for path in "$deploy_env"; do
  [[ -f "$path" && ! -L "$path" && "$(stat_triplet "$path")" =~ ^${expected_owner}:${expected_group}:0?600$ ]] || {
    echo 'protected scientific v2 input is unavailable' >&2
    exit 1
  }
done
[[ -d "$bundle_dir" && ! -L "$bundle_dir" && "$(stat_triplet "$bundle_dir")" =~ ^${expected_owner}:${expected_group}:0?700$ ]] || {
  echo 'protected scientific v2 bundle directory is unavailable' >&2
  exit 1
}

command -v python3 >/dev/null 2>&1 || { echo 'python3 is required for the scientific v2 bundle snapshot' >&2; exit 1; }
input_dir="$(mktemp -d "$(host_path /tmp)/paperbanana-scientific-v2-input.XXXXXXXXXXXX")"
output_dir="$(mktemp -d "$(host_path /tmp)/paperbanana-scientific-v2-output.XXXXXXXXXXXX")"
python3 - "$input_dir" "$output_dir" "$expected_owner" "$service_uid" "$service_gid" <<'PY'
import os
import sys

input_path, output_path, input_owner_text, service_owner_text, service_group_text = sys.argv[1:]
for path, owner, mode in (
    (input_path, int(input_owner_text), 0o750),
    (output_path, int(service_owner_text), 0o700),
):
    handle = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fchown(handle, owner, int(service_group_text))
        os.fchmod(handle, mode)
    finally:
        os.close(handle)
PY
snapshot_path="$input_dir/bundle.json"
replace_during_snapshot=false
if [[ -n "$test_root" && "${PAPERBANANA_SCIENTIFIC_V2_TEST_REPLACE_DURING_SNAPSHOT:-false}" == true ]]; then
  replace_during_snapshot=true
fi
secure_snapshot() {
  local snapshot_source="$1"
  local snapshot_destination="$2"
  local snapshot_replace="$3"
  local destination_owner="$4"
  local destination_group="$5"
  local destination_mode="$6"
  python3 - "$snapshot_source" "$snapshot_destination" "$expected_owner" "$destination_owner" "$destination_group" "$destination_mode" "$snapshot_replace" <<'PY'
import os
import stat
import sys

source, destination, expected_owner_text, destination_owner_text, destination_group_text, destination_mode_text, replace_text = sys.argv[1:]
expected_owner = int(expected_owner_text)
destination_owner = int(destination_owner_text)
destination_group = int(destination_group_text)
destination_mode = int(destination_mode_text, 8)
source_fd = destination_fd = None
try:
    source_fd = os.open(source, os.O_RDONLY | os.O_NOFOLLOW)
    before = os.fstat(source_fd)
    if (not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_uid != expected_owner
            or stat.S_IMODE(before.st_mode) != 0o600 or before.st_size < 2 or before.st_size > 64 * 1024 * 1024):
        raise RuntimeError('protected source')
    destination_fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, destination_mode)
    os.fchown(destination_fd, destination_owner, destination_group)
    os.fchmod(destination_fd, destination_mode)
    total = 0
    while True:
        chunk = os.read(source_fd, min(1024 * 1024, 64 * 1024 * 1024 + 1 - total))
        if not chunk:
            break
        total += len(chunk)
        if total > 64 * 1024 * 1024:
            raise RuntimeError('size')
        view = memoryview(chunk)
        while view:
            written = os.write(destination_fd, view)
            if written < 1:
                raise RuntimeError('write')
            view = view[written:]
    os.fsync(destination_fd)
    if replace_text == 'true':
        os.replace(source + '.replacement', source)
    after_fd = os.fstat(source_fd)
    after_path = os.stat(source, follow_symlinks=False)
    stable_fd = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns) == (
        after_fd.st_dev, after_fd.st_ino, after_fd.st_size, after_fd.st_mtime_ns, after_fd.st_ctime_ns)
    stable_path = (before.st_dev, before.st_ino) == (after_path.st_dev, after_path.st_ino)
    if total != before.st_size or not stable_fd or not stable_path:
        raise RuntimeError('drift')
except Exception:
    try:
        if destination_fd is not None:
            os.close(destination_fd)
            destination_fd = None
        os.unlink(destination)
    except OSError:
        pass
    sys.stderr.write('scientific v2 bundle snapshot drift or protection failure\n')
    raise SystemExit(1)
finally:
    if destination_fd is not None:
        os.close(destination_fd)
    if source_fd is not None:
        os.close(source_fd)
PY
}
secure_snapshot "$bundle_path" "$snapshot_path" "$replace_during_snapshot" "$expected_owner" "$service_gid" 0440
chmod 0550 "$input_dir"
python3 - "$input_dir" "$service_uid" "$service_gid" <<'PY'
import os
import sys

directory, uid_text, gid_text = sys.argv[1:]
uid = int(uid_text)
gid = int(gid_text)
probe = os.path.join(directory, '.service-write-probe')

def attempt():
    try:
        handle = os.open(probe, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    except PermissionError:
        return 0
    except OSError:
        return 0
    else:
        os.close(handle)
        try:
            os.unlink(probe)
        except OSError:
            pass
        return 1

if os.geteuid() == 0 and uid != 0:
    child = os.fork()
    if child == 0:
        try:
            os.setgroups([])
            os.setgid(gid)
            os.setuid(uid)
            os._exit(attempt())
        except Exception:
            os._exit(2)
    _, status = os.waitpid(child, 0)
    result = os.waitstatus_to_exitcode(status)
else:
    result = attempt()
if result != 0:
    sys.stderr.write('scientific v2 immutable input directory is service-writable\n')
    raise SystemExit(1)
PY

read_env_value() {
  awk -F= -v key="$2" '$1==key {value=substr($0,index($0,"=")+1);count++} END {if(count==1)print value;else exit 1}' "$1"
}
require_nonempty() {
  local value
  value="$(read_env_value "$1" "$2")" || {
    echo 'protected benchmark configuration is incomplete' >&2
    return 1
  }
  [[ -n "$value" ]] || {
    echo 'protected benchmark configuration is incomplete' >&2
    return 1
  }
}

[[ "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled ]] || {
  echo 'benchmark runtime is not configured-disabled' >&2; exit 1;
}

core_image="$(read_env_value "$deploy_env" PAPERBANANA_CORE_IMAGE)"
worker_image="$(read_env_value "$deploy_env" PAPERBANANA_BENCH_WORKER_IMAGE)"
[[ "$core_image" =~ ^ghcr\.io/[a-z0-9_.-]+/paperbanana-core-api@sha256:[a-f0-9]{64}$
  && "$worker_image" =~ ^ghcr\.io/[a-z0-9_.-]+/paperbanana-benchmark-worker@sha256:[a-f0-9]{64}$ ]] || {
  echo 'Core and Worker images must use immutable digests' >&2; exit 1;
}
core_digest="${core_image##*@sha256:}"
worker_digest="${worker_image##*@sha256:}"
if [[ -n "$test_root" ]]; then
  expected_core_digest="${expected_core_digest:-$core_digest}"
  expected_worker_digest="${expected_worker_digest:-$worker_digest}"
fi
[[ "$core_digest" == "$expected_core_digest" && "$worker_digest" == "$expected_worker_digest" ]] || {
  echo 'Core or Worker deployment digest differs from the expected digest' >&2; exit 1;
}

if [[ "$mode" != inspect ]]; then
  for path in "$core_env" "$bench_env"; do
    [[ -f "$path" && ! -L "$path" && "$(stat_triplet "$path")" =~ ^${expected_owner}:${expected_group}:0?600$ ]] || {
      echo 'protected paid runtime configuration is unavailable' >&2; exit 1;
    }
  done
  [[ "$(read_env_value "$core_env" PAPERBANANA_CODE_SHA)" == "$expected_sha"
    && "$(read_env_value "$bench_env" PAPERBANANA_CODE_SHA)" == "$expected_sha" ]] || {
    echo 'Core and Worker deployed SHA must match the expected SHA' >&2; exit 1;
  }
  [[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_ENABLED)" == false ]] || {
    echo 'resident benchmark Worker must remain disabled' >&2; exit 1;
  }
  [[ "$(read_env_value "$bench_env" PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || {
    echo 'benchmark concurrency must remain one' >&2; exit 1;
  }
  declare -a required_runtime_keys=()
  if [[ "$mode" == run ]]; then
    required_runtime_keys+=(PAPERBANANA_BENCH_BAILIAN_API_KEY PAPERBANANA_BENCH_ARK_API_KEY PAPERBANANA_BENCH_OPENROUTER_API_KEY)
  fi
  if [[ "$mode" =~ ^(run|reconcile_artifact|import_codex|render_public_evidence)$ ]]; then
    required_runtime_keys+=(PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET
      PAPERBANANA_BENCH_OSS_BUCKET PAPERBANANA_BENCH_OSS_REGION PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT)
  fi
  if [[ "$mode" == run ]]; then
    required_runtime_keys+=(PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT)
  fi
  if [[ "$mode" =~ ^(run|reconcile_artifact|render_public_evidence)$ ]]; then
    required_runtime_keys+=(PAPERBANANA_BENCH_MONGODB_URI)
  fi
  if (( ${#required_runtime_keys[@]} )); then
    for key in "${required_runtime_keys[@]}"; do
      require_nonempty "$bench_env" "$key"
    done
  fi
fi

if [[ "$apply" == true && " $spool_rw_modes " == *" $mode "* ]]; then
  [[ -d "$artifact_spool_host" && ! -L "$artifact_spool_host"
    && "$(stat_triplet "$artifact_spool_host")" =~ ^${service_uid}:${service_gid}:0?700$ ]] || {
    echo 'scientific v2 artifact spool ownership or mode is invalid' >&2; exit 1;
  }
  artifact_spool_available_kib="$(df -Pk "$artifact_spool_host" | awk 'NR==2 {print $4}')"
  [[ "$artifact_spool_available_kib" =~ ^[0-9]+$ && "$artifact_spool_available_kib" -ge 1048576 ]] || {
    echo 'scientific v2 artifact spool capacity is below 1 GiB' >&2; exit 1;
  }
fi

actual_bundle_hash=''
if command -v sha256sum >/dev/null 2>&1; then
  actual_bundle_hash="$(sha256sum -- "$snapshot_path" | awk '{print $1}')"
else
  actual_bundle_hash="$(shasum -a 256 -- "$snapshot_path" | awk '{print $1}')"
fi
[[ "$actual_bundle_hash" == "$bundle_sha256" ]] || {
  echo 'scientific v2 bundle content hash mismatch' >&2; exit 1;
}
command -v jq >/dev/null 2>&1 || { echo 'jq is required for scientific v2 bundle preflight' >&2; exit 1; }

common_jq='(.gate == {enabled:false,concurrency:1,lockName:"/run/lock/paperbanana-hk-production.lock"})'
run_batch_id=''
run_revision=''
run_created_at=''
if [[ "$mode" == inspect ]]; then
  jq -e \
    --arg sha "$expected_sha" --arg registry "$registry_hash" --arg suite "$suite_hash" --arg price "$price_hash" \
    --argjson models "$model_count" \
    '.operation == "inspect" and '"$common_jq"' and
     .batchInput.codeSha == $sha and .batchInput.suiteHash == $suite and
     .batchInput.canonicalManifest.registryHash == $registry and
     .batchInput.canonicalManifest.canonicalModelCount == $models and
     .batchInput.priceSnapshot.snapshotHash == $price' "$snapshot_path" >/dev/null || {
    echo 'scientific v2 inspect bundle binding is invalid' >&2; exit 1;
  }
elif [[ "$mode" == run ]]; then
  jq -e \
    --arg sha "$expected_sha" --arg registry "$registry_hash" --arg suite "$suite_hash" \
    --arg price "$price_hash" --arg manifest "$manifest_hash" --argjson models "$model_count" \
    '.operation == "run" and
     ((keys | sort) == ["executionCodeSha","executionPhase","gate","legacyRecoveryStateHash","manifest","manifestCodeSha","operation","report","state"]) and
     (.executionPhase == "canary-only" or .executionPhase == "full") and
     '"$common_jq"' and
     ((.report | keys | sort) == ["attestationSecret","batchId","createdAt","revision"]) and
     (.report.batchId | type) == "string" and (.report.batchId | length) > 0 and
     (.report.revision | type) == "number" and (.report.revision | floor) == .report.revision and .report.revision >= 1 and
     (.report.createdAt | type) == "string" and
     (.report.createdAt | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$")) and
     (.report.attestationSecret | type) == "string" and (.report.attestationSecret | length) > 0 and
     (.manifestCodeSha | type) == "string" and (.manifestCodeSha | test("^[a-f0-9]{40}$")) and
     (.executionCodeSha | type) == "string" and (.executionCodeSha | test("^[a-f0-9]{40}$")) and
     (.legacyRecoveryStateHash == null or ((.legacyRecoveryStateHash | type) == "string" and (.legacyRecoveryStateHash | test("^[a-f0-9]{64}$")))) and
     .manifestCodeSha == .manifest.codeSha and .executionCodeSha == $sha and
     ( (.manifestCodeSha == $sha and .legacyRecoveryStateHash == null) or
       (.manifestCodeSha != $sha and
        ( (.executionPhase == "canary-only" and .state.status == "blocked" and .state.blockReason == "provider_canary_failed" and .state.pauseReason == null and .legacyRecoveryStateHash == .state.stateHash) or
          (.executionPhase == "full" and .state.status == "canary_complete" and (.legacyRecoveryStateHash | type) == "string" and (.legacyRecoveryStateHash | test("^[a-f0-9]{64}$")) )
       )
     )
     ) and
     .manifest.registryHash == $registry and
     .manifest.suiteHash == $suite and .manifest.priceHash == $price and
     .manifest.manifestHash == $manifest and .state.manifestHash == $manifest and
     (.manifest.models | length) == $models and (.manifest.cases | length) == 9 and
     .manifest.providerBudgetsCny == {bailian:180,ark:180,openrouter:360} and
     .manifest.codexLimits == {modelId:"codex:gpt-image-2",successfulSlots:9,maxAttemptsPerSlot:4,maxToolCalls:36} and
     .manifest.concurrency == 1 and
     .manifest.lockName == "/run/lock/paperbanana-hk-production.lock"' "$snapshot_path" >/dev/null || {
    echo 'scientific v2 run bundle binding is invalid' >&2; exit 1;
  }
  python3 - "$snapshot_path" <<'PY'
import datetime
import json
import re
import sys

try:
    with open(sys.argv[1], 'r', encoding='utf-8', errors='strict') as handle:
        report = json.load(handle)['report']
    secret = report['attestationSecret']
    secret_bytes = secret.encode('utf-8', errors='strict')
    created_at = report['createdAt']
    parsed = datetime.datetime.strptime(created_at, '%Y-%m-%dT%H:%M:%S.%fZ')
    normalized = parsed.isoformat(timespec='milliseconds') + 'Z'
    if (len(secret_bytes) < 32 or len(secret_bytes) > 4096 or secret.strip() != secret
            or normalized != created_at
            or re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._:-]{2,199}', report['batchId']) is None
            or isinstance(report['revision'], bool) or not isinstance(report['revision'], int)
            or report['revision'] < 1):
        raise ValueError('metadata')
except Exception:
    sys.stderr.write('scientific v2 run report metadata is invalid\n')
    raise SystemExit(1)
PY
  run_batch_id="$(jq -r '.report.batchId' "$snapshot_path")"
  run_revision="$(jq -r '.report.revision' "$snapshot_path")"
  run_created_at="$(jq -r '.report.createdAt' "$snapshot_path")"
else
  jq -e --arg operation "$mode" '.operation == $operation and .gate == {
    enabled:false,concurrency:1,lockName:"/run/lock/paperbanana-hk-production.lock"
  }' "$snapshot_path" >/dev/null || {
    echo 'scientific v2 phase bundle binding is invalid' >&2; exit 1;
  }
  case "$mode" in
    reconcile_artifact|render_public_evidence)
      jq -e --arg manifest "$manifest_hash" --arg sha "$expected_sha" --arg registry "$registry_hash" \
        --arg suite "$suite_hash" --arg price "$price_hash" --argjson models "$model_count" \
        '.manifest.manifestHash == $manifest and .state.manifestHash == $manifest and .manifest.codeSha == $sha and
         .manifest.registryHash == $registry and .manifest.suiteHash == $suite and .manifest.priceHash == $price and
         (.manifest.models | length) == $models' "$snapshot_path" >/dev/null || exit 1
      ;;
    import_codex)
      jq -e --arg manifest "$manifest_hash" --arg sha "$expected_sha" --arg registry "$registry_hash" \
        --arg suite "$suite_hash" --arg price "$price_hash" --argjson models "$model_count" \
        '.input.manifestHash == $manifest and .input.stateHash == .input.state.stateHash and
         .input.manifest.manifestHash == $manifest and .input.state.manifestHash == $manifest and
         .input.manifest.codeSha == $sha and .input.manifest.registryHash == $registry and
         .input.manifest.suiteHash == $suite and .input.manifest.priceHash == $price and
         (.input.manifest.models | length) == $models' "$snapshot_path" >/dev/null || exit 1
      ;;
    review_pack)
      jq -e --arg manifest "$manifest_hash" --arg sha "$expected_sha" --arg registry "$registry_hash" \
        --arg suite "$suite_hash" --arg price "$price_hash" --argjson models "$model_count" \
        '.input.batchManifestHash == $manifest and .input.manifest.manifestHash == $manifest and
         .input.state.manifestHash == $manifest and .input.manifest.codeSha == $sha and
         .input.manifest.registryHash == $registry and .input.manifest.suiteHash == $suite and
         .input.manifest.priceHash == $price and (.input.manifest.models | length) == $models' "$snapshot_path" >/dev/null || exit 1
      ;;
    review_finalize)
      jq -e --arg manifest "$manifest_hash" \
        '.input.automaticJudges == [] and .input.reviewerA.role == "A" and .input.reviewerB.role == "B" and
         .input.reviewerA.batchManifestHash == $manifest and .input.reviewerB.batchManifestHash == $manifest and
         .input.reviewerA.sourceSetHash == .input.reviewerB.sourceSetHash and
         .input.reviewerA.assignmentSet == .input.reviewerB.assignmentSet' "$snapshot_path" >/dev/null || exit 1
      ;;
    review_validate)
      jq -e --arg manifest "$manifest_hash" \
        '.input.role == .input.publicAssignment.role and
         .input.publicAssignment.assignmentSet.batchManifestHash == $manifest and
         .input.privateAssignment.privateEnvelope.batchManifestHash == $manifest' "$snapshot_path" >/dev/null || exit 1
      ;;
    review_arbitrate)
      jq -e --arg manifest "$manifest_hash" \
        '.input.automaticJudges == [] and .input.reviewerA.role == "A" and .input.reviewerB.role == "B" and
         .input.reviewerA.batchManifestHash == $manifest and .input.reviewerB.batchManifestHash == $manifest and
         .input.reviewerA.sourceSetHash == .input.reviewerB.sourceSetHash and
         .input.arbitration.reasoningEffort == "xhigh"' "$snapshot_path" >/dev/null || exit 1
      ;;
  esac
fi

if [[ -n "$test_root" && "${PAPERBANANA_SCIENTIFIC_V2_TEST_REPLACE_AFTER_PREFLIGHT:-false}" == true ]]; then
  python3 - "$snapshot_path" "$output_dir/race-replacement.json" <<'PY'
import os
import sys

destination, replacement = sys.argv[1:]
with open(replacement, 'xb') as handle:
    handle.write(b'{"operation":"replaced-after-preflight"}\n')
try:
    os.replace(replacement, destination)
except PermissionError:
    sys.stderr.write('scientific v2 service replacement denied by immutable input\n')
    raise SystemExit(73)
sys.stderr.write('scientific v2 immutable input replacement unexpectedly succeeded\n')
raise SystemExit(74)
PY
fi

emit_dry_run() {
  jq -cn \
    --arg operation "$mode" --arg codeSha "$expected_sha" --arg bundleHash "$bundle_sha256" \
    --arg registryHash "$registry_hash" --arg suiteHash "$suite_hash" --arg priceHash "$price_hash" \
    --arg manifestHash "$manifest_hash" --argjson modelCount "$model_count" \
    '{schemaVersion:2,operation:$operation,dryRun:true,providerCalls:0,codeSha:$codeSha,bundleHash:$bundleHash,
      registryHash:$registryHash,suiteHash:$suiteHash,priceHash:$priceHash,manifestHash:$manifestHash,
      modelCount:$modelCount,caseCount:9,providerBudgetsCny:{bailian:180,ark:180,openrouter:360},
      codexMaxToolCalls:36,concurrency:1,lockName:"/run/lock/paperbanana-hk-production.lock"}'
}
test_signed_result=false
if [[ -n "$test_root" && -n "${PAPERBANANA_SCIENTIFIC_V2_TEST_SIGNED_RESULT:-}" ]]; then
  test_result_source="$(realpath "$PAPERBANANA_SCIENTIFIC_V2_TEST_SIGNED_RESULT")"
  case "$test_result_source" in "$test_root"/tmp/*) ;; *) exit 1 ;; esac
  result_path="$output_dir/result.json"
  secure_snapshot "$test_result_source" "$result_path" false "$expected_owner" "$expected_group" 0600
  test_signed_result=true
fi
if [[ "$test_signed_result" == false && ( -n "$test_root" || ( "$mode" == run && "$apply" == false ) ) ]]; then
  emit_dry_run
  exit 0
fi

if [[ "$test_signed_result" == false ]]; then
core_id="$(docker ps --filter label=com.docker.compose.project=paperbanana-hk --filter label=com.docker.compose.service=paperbanana-api --format '{{.ID}}')"
worker_id="$(docker ps --filter label=com.docker.compose.project=paperbanana-hk --filter label=com.docker.compose.service=benchmark-worker --format '{{.ID}}')"
[[ "$core_id" =~ ^[a-f0-9]+$ && "$worker_id" =~ ^[a-f0-9]+$ ]] || {
  echo 'Core and resident Worker identity is ambiguous' >&2; exit 1;
}
[[ -n "$core_id" && -n "$worker_id" ]] || { echo 'Core and resident Worker must be running' >&2; exit 1; }
[[ "$(docker inspect --format '{{.Config.Image}}' "$core_id")" == "$core_image"
  && "$(docker inspect --format '{{.Config.Image}}' "$worker_id")" == "$worker_image" ]] || {
  echo 'running Core or Worker image differs from the immutable deployment lock' >&2; exit 1;
}
for pair in "$core_id:$expected_core_digest" "$worker_id:$expected_worker_digest"; do
  container_id="${pair%%:*}"; digest="${pair#*:}"
  image_id="$(docker inspect --format '{{.Image}}' "$container_id")"
  [[ "$image_id" =~ ^sha256:[a-f0-9]{64}$ ]] || {
    echo 'running container image identity is unavailable' >&2; exit 1;
  }
  docker image inspect --format '{{json .RepoDigests}}' "$image_id" | jq -e --arg digest "sha256:$digest" \
    'any(.[]; endswith("@" + $digest))' >/dev/null || {
      echo 'running container RepoDigests does not match the expected digest' >&2; exit 1;
    }
done
provenance_guard='const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1])process.exit(1)'
worker_guard='const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1]||process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")process.exit(1)'
docker exec "$core_id" node -e "$provenance_guard" "$expected_sha" >/dev/null
if [[ "$test_signed_result" == false ]]; then
  docker exec "$worker_id" node -e "$worker_guard" "$expected_sha" >/dev/null
fi

result_path="$(mktemp /tmp/paperbanana-scientific-v2-result.XXXXXXXXXXXX)"
entry_timeout=300
[[ "$mode" == run ]] && entry_timeout=86400
run_inspect() {
  timeout --signal=TERM --kill-after=10s "${entry_timeout}s" \
    docker run --rm --pull=never --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --user "$service_uid:$service_gid" \
    --mount "type=bind,src=$snapshot_path,dst=$bundle_container,readonly" \
    -e PAPERBANANA_SCIENTIFIC_V2_BUNDLE_PATH="$bundle_container" \
    -e PAPERBANANA_SCIENTIFIC_V2_SPOOL_DIR="$input_container_dir" \
    -e PAPERBANANA_SCIENTIFIC_V2_EXPECTED_BUNDLE_SHA256="$bundle_sha256" \
    "$worker_image" node dist/scientific-v2-operator.mjs >"$result_path"
}
run_offline_review() {
  offline_args=(
    --mount "type=bind,src=$snapshot_path,dst=$bundle_container,readonly"
    -e PAPERBANANA_SCIENTIFIC_V2_BUNDLE_PATH="$bundle_container"
    -e PAPERBANANA_SCIENTIFIC_V2_SPOOL_DIR="$input_container_dir"
    -e PAPERBANANA_SCIENTIFIC_V2_EXPECTED_BUNDLE_SHA256="$bundle_sha256"
  )
  if [[ "$mode" =~ ^review_(pack|validate|arbitrate|finalize)$ ]]; then
    offline_args+=(
      --mount "type=bind,src=$output_dir,dst=$output_container_dir"
      -e PAPERBANANA_SCIENTIFIC_V2_PRIVATE_OUTPUT_PATH="$output_container_dir/review-private.json"
      -e PAPERBANANA_SCIENTIFIC_V2_PRIVATE_OUTPUT_DIR="$output_container_dir"
    )
  fi
  timeout --signal=TERM --kill-after=10s "${entry_timeout}s" \
    docker run --rm --pull=never --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --user "$service_uid:$service_gid" \
    "${offline_args[@]}" "$worker_image" node dist/scientific-v2-operator.mjs >"$result_path"
}
run_paid() {
  compose=(docker compose --project-name paperbanana-hk --project-directory "$deploy_dir" --env-file "$deploy_env" -f "$deploy_dir/compose.yaml")
  phase_args=(
    -v "$snapshot_path:$bundle_container:ro"
    -e PAPERBANANA_BENCH_ENABLED=false
    -e PAPERBANANA_BENCH_CONCURRENCY=1
    -e PAPERBANANA_SCIENTIFIC_V2_RUN_ENABLED=true
    -e PAPERBANANA_SCIENTIFIC_V2_HOST_LOCK_PROOF=/run/lock/paperbanana-hk-production.lock
    -e PAPERBANANA_BENCH_LEASE_MS=120000
    -e PAPERBANANA_BENCH_HEARTBEAT_MS=30000
    -e PAPERBANANA_BENCH_PROVIDER_TIMEOUT_MS=300000
    -e PAPERBANANA_SCIENTIFIC_V2_BUNDLE_PATH="$bundle_container"
    -e PAPERBANANA_SCIENTIFIC_V2_SPOOL_DIR="$input_container_dir"
    -e PAPERBANANA_SCIENTIFIC_V2_EXPECTED_BUNDLE_SHA256="$bundle_sha256"
  )
  if [[ " $spool_rw_modes " == *" $mode "* ]]; then
    phase_args+=(
      -v "$artifact_spool_host:$artifact_spool_container:rw"
      -e PAPERBANANA_SCIENTIFIC_V2_ARTIFACT_SPOOL_DIR="$artifact_spool_container"
    )
  fi
  if [[ "$mode" == import_codex ]]; then
    [[ -d "$codex_artifact_dir" && ! -L "$codex_artifact_dir"
      && "$(stat_triplet "$codex_artifact_dir")" =~ ^${expected_owner}:${service_gid}:0?550$ ]] || {
      echo 'protected Codex artifact directory is unavailable' >&2; exit 1;
    }
    phase_args+=(
      -v "$codex_artifact_dir:$codex_artifact_container:ro"
      -e PAPERBANANA_SCIENTIFIC_V2_CODEX_ARTIFACT_DIR="$codex_artifact_container"
    )
  fi
  if [[ " $zero_provider_modes " == *" $mode "* ]]; then
    phase_args+=(
      -e PAPERBANANA_BENCH_BAILIAN_API_KEY=
      -e PAPERBANANA_BENCH_ARK_API_KEY=
      -e PAPERBANANA_BENCH_OPENROUTER_API_KEY=
    )
  fi
  timeout --signal=TERM --kill-after=10s "${entry_timeout}s" \
    "${compose[@]}" run --rm --no-deps \
    --user "$service_uid:$service_gid" \
    "${phase_args[@]}" \
    benchmark-operator node dist/scientific-v2-operator.mjs >"$result_path"
}
if [[ "$mode" == inspect ]]; then
  run_inspect
elif [[ "$mode" =~ ^review_(pack|validate|arbitrate|finalize)$ ]]; then
  run_offline_review
else
  run_paid
fi
fi

if [[ "$mode" == inspect ]]; then
  jq -e --arg manifest "$manifest_hash" --argjson models "$model_count" \
    '.operation == "inspect" and .providerCalls == 0 and .manifestHash == $manifest and
     .modelCount == $models and .slotCount == ($models * 9) and
     .lockName == "/run/lock/paperbanana-hk-production.lock" and
     (.stateHash | test("^[a-f0-9]{64}$")) and
     ((keys | sort) == (["lockName","manifestHash","modelCount","operation","providerCalls","slotCount","stateHash"] | sort))' \
    "$result_path" >/dev/null || { echo 'scientific v2 inspect output contract mismatch' >&2; exit 1; }
elif [[ "$mode" == run ]]; then
  jq -e --slurpfile input "$snapshot_path" \
    --arg manifest "$manifest_hash" --arg batchId "$run_batch_id" --arg createdAt "$run_created_at" \
    --argjson revision "$run_revision" --argjson maximumCalls "$((model_count * 36))" --argjson models "$model_count" \
    'def hash: type == "string" and test("^[a-f0-9]{64}$");
     def providerSlots: [.report.state.slots[] | select(.provider != null and .provider != "codex")];
     (providerSlots | map(.attempts | length) | add // 0) as $providerCalls |
     (providerSlots | length) as $providerSlotCount |
     ((keys | sort) == ["attestationHash","report","reportHash"]) and
     ((.report | keys | sort) == ["batchId","batchManifestHash","codexProvenance","createdAt","disclosure","executionCodeSha","executionOrderAttestation","identity","kind","legacyRecoveryStateHash","manifestCodeSha","previousStateHash","providerCanaryAttestation","reportHash","revision","schemaVersion","state","stateHash"]) and
     .report.schemaVersion == 2 and
     .report.identity == {suiteId:"pb-scientific-figure-v2",evaluationMode:"codex_scientific_v2",evaluationEpoch:"codex-scientific-2026-09-v1",reviewProtocol:"codex-independent-double-review-v2",presentationVersion:"scientific-leaderboard-v2"} and
     .report.kind == "worker" and .report.batchId == $batchId and .report.batchManifestHash == $manifest and
     .report.manifestCodeSha == $input[0].manifestCodeSha and
     .report.executionCodeSha == $input[0].executionCodeSha and
     .report.legacyRecoveryStateHash == $input[0].legacyRecoveryStateHash and
     .report.revision == $revision and .report.createdAt == $createdAt and
     (.report.previousStateHash | hash) and (.report.stateHash | hash) and
     (.report.reportHash | hash) and (.reportHash | hash) and (.attestationHash | hash) and
     .reportHash == .report.reportHash and .report.stateHash == .report.state.stateHash and
     .report.state.manifestHash == $manifest and
     (.report.providerCanaryAttestation | type) == "object" and
     (.report.executionOrderAttestation | type) == "object" and
     .report.codexProvenance == null and .report.disclosure == null and
     (.report.state.slots | type) == "array" and (.report.state.slots | length) == ($models * 9) and
     (providerSlots | all((.attempts | type) == "array" and (.attempts | length) <= 4)) and
     $providerCalls <= ($providerSlotCount * 4) and $providerCalls <= $maximumCalls and
     ([.. | strings] | index($input[0].report.attestationSecret)) == null' \
    "$result_path" >/dev/null || { echo 'scientific v2 run output contract mismatch' >&2; exit 1; }
elif [[ "$mode" == import_codex ]]; then
  jq -e --arg manifest "$manifest_hash" \
    '((keys | sort) == ["attestationHash","report","reportHash"]) and .report.kind == "codex" and
     .report.batchManifestHash == $manifest and .report.state.manifestHash == $manifest and
     .reportHash == .report.reportHash and .report.stateHash == .report.state.stateHash' "$result_path" >/dev/null || {
    echo 'scientific v2 codex import output contract mismatch' >&2; exit 1;
  }
elif [[ "$mode" == review_pack ]]; then
  jq -e --arg manifest "$manifest_hash" \
    '.operation == "review_pack" and .providerCalls == 0 and .batchManifestHash == $manifest and
     .automaticJudges == [] and .privateOutputWritten == true and
     ([.. | objects | keys[]] | index("privateMappings")) == null and
     ([.. | objects | keys[]] | index("privateEnvelope")) == null' "$result_path" >/dev/null || {
    echo 'scientific v2 review pack output contract mismatch' >&2; exit 1;
  }
  [[ -f "$output_dir/review-private.json" && ! -L "$output_dir/review-private.json"
    && "$(stat_triplet "$output_dir/review-private.json")" =~ ^${service_uid}:${service_gid}:0?600$ ]] || {
    echo 'scientific v2 review private output is unavailable' >&2; exit 1;
  }
  [[ -d "$review_private_dir" && ! -L "$review_private_dir"
    && "$(stat_triplet "$review_private_dir")" =~ ^${expected_owner}:${expected_group}:0?700$ ]] || {
    echo 'scientific v2 private review directory is unavailable' >&2; exit 1;
  }
  python3 - "$output_dir/review-private.json" "$review_private_path" "$service_uid" "$expected_owner" "$expected_group" <<'PY'
import os
import stat
import sys

source, destination, source_owner_text, destination_owner_text, destination_group_text = sys.argv[1:]
source_owner = int(source_owner_text)
destination_owner = int(destination_owner_text)
destination_group = int(destination_group_text)
source_fd = destination_fd = None
try:
    source_fd = os.open(source, os.O_RDONLY | os.O_NOFOLLOW)
    source_stat = os.fstat(source_fd)
    if (not stat.S_ISREG(source_stat.st_mode) or source_stat.st_nlink != 1
            or source_stat.st_uid != source_owner or stat.S_IMODE(source_stat.st_mode) != 0o600
            or source_stat.st_size < 2 or source_stat.st_size > 64 * 1024 * 1024):
        raise RuntimeError('source')
    data = b''
    while len(data) <= 64 * 1024 * 1024:
        chunk = os.read(source_fd, min(1024 * 1024, 64 * 1024 * 1024 + 1 - len(data)))
        if not chunk:
            break
        data += chunk
    if len(data) != source_stat.st_size or len(data) > 64 * 1024 * 1024:
        raise RuntimeError('size')
    try:
        destination_fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        os.fchown(destination_fd, destination_owner, destination_group)
        os.fchmod(destination_fd, 0o600)
        view = memoryview(data)
        while view:
            written = os.write(destination_fd, view)
            if written < 1:
                raise RuntimeError('write')
            view = view[written:]
        os.fsync(destination_fd)
    except FileExistsError:
        existing_fd = os.open(destination, os.O_RDONLY | os.O_NOFOLLOW)
        try:
            existing_stat = os.fstat(existing_fd)
            existing = os.read(existing_fd, 64 * 1024 * 1024 + 1)
            if (not stat.S_ISREG(existing_stat.st_mode) or existing_stat.st_nlink != 1
                    or existing_stat.st_uid != destination_owner or stat.S_IMODE(existing_stat.st_mode) != 0o600
                    or existing != data):
                raise RuntimeError('collision')
        finally:
            os.close(existing_fd)
except Exception:
    if destination_fd is not None:
        try:
            os.close(destination_fd)
            destination_fd = None
            os.unlink(destination)
        except OSError:
            pass
    sys.stderr.write('scientific v2 private review persistence failed\n')
    raise SystemExit(1)
finally:
    if destination_fd is not None:
        os.close(destination_fd)
    if source_fd is not None:
        os.close(source_fd)
PY
elif [[ "$mode" == review_validate ]]; then
  jq -e --arg manifest "$manifest_hash" \
    '.operation == "review_validate" and .providerCalls == 0 and
     .batchManifestHash == $manifest and .privateOutputWritten == true and
     (.sourceSetHash | test("^[a-f0-9]{64}$")) and (.resultHash | test("^[a-f0-9]{64}$")) and
     (.resultAttestationHash | test("^[a-f0-9]{64}$")) and
     ([.. | objects | keys[]] | index("privateMappings")) == null and
     ([.. | objects | keys[]] | index("reviewerIdentity")) == null' "$result_path" >/dev/null || {
    echo 'scientific v2 review validation output contract mismatch' >&2; exit 1;
  }
  [[ -f "$output_dir/review-private.json" && ! -L "$output_dir/review-private.json"
    && "$(stat_triplet "$output_dir/review-private.json")" =~ ^${service_uid}:${service_gid}:0?600$ ]] || exit 1
  persist_private_result "$output_dir/review-private.json" "$review_validate_private_path" "$service_uid"
elif [[ "$mode" == review_arbitrate ]]; then
  jq -e \
    '.operation == "review_arbitrate" and .providerCalls == 0 and .canFinalize == true and
     .privateOutputWritten == true and (.disputeCount | type) == "number" and .disputeCount > 0 and
     (.arbitrationHash | test("^[a-f0-9]{64}$")) and (.attestationHash | test("^[a-f0-9]{64}$")) and
     ([.. | objects | keys[]] | index("reviewerIdentity")) == null' "$result_path" >/dev/null || {
    echo 'scientific v2 arbitration output contract mismatch' >&2; exit 1;
  }
  [[ -f "$output_dir/review-private.json" && ! -L "$output_dir/review-private.json"
    && "$(stat_triplet "$output_dir/review-private.json")" =~ ^${service_uid}:${service_gid}:0?600$ ]] || exit 1
  persist_private_result "$output_dir/review-private.json" "$review_arbitrate_private_path" "$service_uid"
elif [[ "$mode" == review_finalize ]]; then
  jq -e --arg manifest "$manifest_hash" \
    '.operation == "review_finalize" and .providerCalls == 0 and .canFinalize == true and
     .privateOutputWritten == true and (.disputeCount | type) == "number" and
     (.resultCount | type) == "number" and .resultCount > 0 and
     (.resultsHash | test("^[a-f0-9]{64}$")) and
     (.attestationHash | test("^[a-f0-9]{64}$")) and
     ([.. | objects | keys[]] | index("results")) == null and
     ([.. | objects | keys[]] | index("disputes")) == null' "$result_path" >/dev/null || {
    echo 'scientific v2 review finalize output contract mismatch' >&2; exit 1;
  }
  [[ -f "$output_dir/review-private.json" && ! -L "$output_dir/review-private.json"
    && "$(stat_triplet "$output_dir/review-private.json")" =~ ^${service_uid}:${service_gid}:0?600$ ]] || exit 1
  persist_private_result "$output_dir/review-private.json" "$review_finalize_private_path" "$service_uid"
elif [[ "$mode" == render_public_evidence ]]; then
  jq -e --arg manifest "$manifest_hash" \
    '.operation == "render_public_evidence" and .providerCalls == 0 and
     (.publishInputHash | test("^[a-f0-9]{64}$")) and
     (.publishInput.batchId | type) == "string" and (.publishInput.batchId | length) > 0 and
     (.publishInput.objectBindings | type) == "array" and (.publishInput.evidence | type) == "array"' \
    "$result_path" >/dev/null || { echo 'scientific v2 render publish input contract mismatch' >&2; exit 1; }
  [[ -d "$review_private_dir" && ! -L "$review_private_dir"
    && "$(stat_triplet "$review_private_dir")" =~ ^${expected_owner}:${expected_group}:0?700$ ]] || {
    echo 'scientific v2 private handoff directory is unavailable' >&2; exit 1;
  }
  persist_private_result "$result_path" "$render_private_path"
else
  jq -e --arg operation "$mode" '.operation == $operation and .providerCalls == 0' "$result_path" >/dev/null || {
    echo 'scientific v2 zero-provider output contract mismatch' >&2; exit 1;
  }
fi

if [[ "$test_signed_result" == false ]]; then
  docker exec "$worker_id" node -e "$worker_guard" "$expected_sha" >/dev/null
fi
if [[ "$mode" == inspect ]]; then
  state_hash="$(jq -r .stateHash "$result_path")"
  jq -cn \
    --arg operation "$mode" --arg codeSha "$expected_sha" --arg bundleHash "$bundle_sha256" \
    --arg registryHash "$registry_hash" --arg suiteHash "$suite_hash" --arg priceHash "$price_hash" \
    --arg manifestHash "$manifest_hash" --arg stateHash "$state_hash" --argjson modelCount "$model_count" \
    '{schemaVersion:2,operation:$operation,dryRun:false,providerCalls:0,codeSha:$codeSha,bundleHash:$bundleHash,
      registryHash:$registryHash,suiteHash:$suiteHash,priceHash:$priceHash,manifestHash:$manifestHash,stateHash:$stateHash,
      modelCount:$modelCount,caseCount:9,providerBudgetsCny:{bailian:180,ark:180,openrouter:360},
      codexMaxToolCalls:36,concurrency:1,lockName:"/run/lock/paperbanana-hk-production.lock"}'
elif [[ "$mode" == run ]]; then
  state_hash="$(jq -r .report.stateHash "$result_path")"
  report_hash="$(jq -r .reportHash "$result_path")"
  state_snapshot="$(mktemp /tmp/paperbanana-scientific-v2-state.XXXXXXXXXXXX)"
  jq -c .report.state "$result_path" >"$state_snapshot"
  chmod 0600 "$state_snapshot"
  state_bundle_hash="$(sha256sum "$state_snapshot" 2>/dev/null | awk '{print $1}' || shasum -a 256 "$state_snapshot" | awk '{print $1}')"
  state_destination="$bundle_dir/$state_bundle_hash.state.json"
  if [[ -e "$state_destination" ]]; then
    [[ -f "$state_destination" && ! -L "$state_destination" && "$(stat_triplet "$state_destination")" =~ ^${expected_owner}:${expected_group}:0?600$ ]] || exit 1
    cmp -s "$state_snapshot" "$state_destination" || exit 1
  else
    install -o "$expected_owner" -g "$expected_group" -m 0600 "$state_snapshot" "$state_destination"
  fi
  rm -f -- "$state_snapshot"
  provider_calls="$(jq -r '[.report.state.slots[] | select(.provider != null and .provider != "codex") | .attempts[]] | length' "$result_path")"
  printf '%s' 'scientific-v2-audit-summary=' >&2
  jq -cn \
    --argjson providerCalls "$provider_calls" --arg stateHash "$state_hash" --arg reportHash "$report_hash" --arg stateBundleHash "$state_bundle_hash" \
    '{providerCalls:$providerCalls,stateHash:$stateHash,reportHash:$reportHash,stateBundleHash:$stateBundleHash}' >&2
  jq -c . "$result_path"
elif [[ "$mode" == import_codex ]]; then
  state_hash="$(jq -r .report.stateHash "$result_path")"
  report_hash="$(jq -r .reportHash "$result_path")"
  printf '%s' 'scientific-v2-audit-summary=' >&2
  jq -cn --arg stateHash "$state_hash" --arg reportHash "$report_hash" \
    '{providerCalls:0,stateHash:$stateHash,reportHash:$reportHash}' >&2
  jq -c . "$result_path"
elif [[ "$mode" == render_public_evidence ]]; then
  batch_id="$(jq -r .publishInput.batchId "$result_path")"
  publish_input_hash="$(jq -r .publishInputHash "$result_path")"
  printf '%s' 'scientific-v2-audit-summary=' >&2
  jq -cn --arg batchId "$batch_id" --arg manifestHash "$manifest_hash" --arg publishInputHash "$publish_input_hash" \
    '{operation:"render_public_evidence",providerCalls:0,batchId:$batchId,manifestHash:$manifestHash,
      publishInputHash:$publishInputHash,privateOutputWritten:true}' >&2
  jq -cn --arg batchId "$batch_id" --arg manifestHash "$manifest_hash" --arg publishInputHash "$publish_input_hash" \
    '{operation:"render_public_evidence",providerCalls:0,batchId:$batchId,manifestHash:$manifestHash,
      publishInputHash:$publishInputHash,privateOutputWritten:true}'
else
  printf '%s' 'scientific-v2-audit-summary=' >&2
  jq -cn --arg operation "$mode" --arg manifestHash "$manifest_hash" \
    '{operation:$operation,providerCalls:0,manifestHash:$manifestHash}' >&2
  jq -c . "$result_path"
fi
