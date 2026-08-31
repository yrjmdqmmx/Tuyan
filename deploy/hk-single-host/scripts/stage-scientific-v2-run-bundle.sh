#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

expected_sha='' manifest_sha256='' state_sha256='' attestation_sha256='' manifest_hash='' registry_hash='' suite_hash='' price_hash='' execution_phase='' confirm=''
usage() {
  echo 'usage: stage-scientific-v2-run-bundle.sh --expected-sha 40_HEX --manifest-sha256 64_HEX --state-sha256 64_HEX --attestation-result-sha256 64_HEX --manifest-hash 64_HEX --registry-hash 64_HEX --suite-hash 64_HEX --price-hash 64_HEX --execution-phase canary-only|full --confirm stage-scientific-v2-run-bundle' >&2
  exit 64
}
while (($#)); do
  case "$1" in
    --expected-sha) expected_sha="${2:-}"; shift 2 ;;
    --manifest-sha256) manifest_sha256="${2:-}"; shift 2 ;;
    --state-sha256) state_sha256="${2:-}"; shift 2 ;;
    --attestation-result-sha256) attestation_sha256="${2:-}"; shift 2 ;;
    --manifest-hash) manifest_hash="${2:-}"; shift 2 ;;
    --registry-hash) registry_hash="${2:-}"; shift 2 ;;
    --suite-hash) suite_hash="${2:-}"; shift 2 ;;
    --price-hash) price_hash="${2:-}"; shift 2 ;;
    --execution-phase) execution_phase="${2:-}"; shift 2 ;;
    --confirm) confirm="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ && "$manifest_sha256" =~ ^[a-f0-9]{64}$
  && "$state_sha256" =~ ^[a-f0-9]{64}$ && "$attestation_sha256" =~ ^[a-f0-9]{64}$
  && "$manifest_hash" =~ ^[a-f0-9]{64}$ && "$registry_hash" =~ ^[a-f0-9]{64}$
  && "$suite_hash" =~ ^[a-f0-9]{64}$ && "$price_hash" =~ ^[a-f0-9]{64}$
  && "$execution_phase" =~ ^(canary-only|full)$ && "$confirm" == stage-scientific-v2-run-bundle ]] || usage
[[ "$(id -u)" == 0 ]] || { echo 'scientific v2 run-bundle stager must run as root' >&2; exit 1; }

repo_root='/opt/paperbanana/repo'
bundle_dir='/opt/paperbanana/operator-bundles/scientific-v2'
admin_result_dir='/opt/paperbanana/operator-private/scientific-v2/admin-results'
core_env='/opt/paperbanana/secrets/core.env'
manifest_path="$bundle_dir/$manifest_sha256.manifest.json"
state_path="$bundle_dir/$state_sha256.state.json"
attestation_path="$admin_result_dir/$attestation_sha256.attest.json"
lock_path='/run/lock/paperbanana-hk-production.lock'
[[ "$(git -C "$repo_root" rev-parse --verify HEAD)" == "$expected_sha" ]] || exit 1
tracked_run_bundle_paths=(
  deploy/hk-single-host/scripts/stage-scientific-v2-run-bundle.sh
  apps/paperbanana-api/src/scientific-v2-repository.ts
  apps/benchmark-worker/src/scientific-v2-manifest.ts
  apps/benchmark-worker/src/scientific-v2-state-report.ts
)
for tracked_path in "${tracked_run_bundle_paths[@]}"; do
  git -C "$repo_root" ls-files --error-unmatch "$tracked_path" >/dev/null 2>&1 || exit 1
done
git -C "$repo_root" diff --quiet "$expected_sha" -- "${tracked_run_bundle_paths[@]}" || exit 1
install -d -o root -g root -m 0700 "$bundle_dir" "$(dirname "$lock_path")"
exec 9>"$lock_path"
flock -x 9

temporary="$(mktemp /tmp/paperbanana-scientific-v2-run-bundle.XXXXXXXXXXXX)"
cleanup() { rm -f -- "$temporary"; }
trap cleanup EXIT
chmod 0600 "$temporary"
python3 - "$manifest_path" "$manifest_sha256" "$state_path" "$state_sha256" \
  "$attestation_path" "$attestation_sha256" "$core_env" "$execution_phase" "$expected_sha" \
  "$manifest_hash" "$registry_hash" "$suite_hash" "$price_hash" "$temporary" 0 <<'PY'
import hashlib
import hmac
import json
import math
import os
import re
import stat
import sys
from decimal import Decimal

manifest_path, manifest_file_hash, state_path, state_file_hash, attestation_path, attestation_file_hash, env_path, phase, code_sha, expected_manifest_hash, expected_registry_hash, expected_suite_hash, expected_price_hash, output, expected_owner_text = sys.argv[1:]
expected_owner = int(expected_owner_text)
MAX = 64 * 1024 * 1024
DOMAIN = b'paperbanana/scientific-v2/operator-attestation/v1'
LOCK = '/run/lock/paperbanana-hk-production.lock'
IDENTITY = {
    'suiteId': 'pb-scientific-figure-v2',
    'evaluationMode': 'codex_scientific_v2',
    'evaluationEpoch': 'codex-scientific-2026-09-v1',
    'reviewProtocol': 'codex-independent-double-review-v2',
    'presentationVersion': 'scientific-leaderboard-v2',
}
MANIFEST_KEYS = {
    'schemaVersion','suiteId','evaluationMode','evaluationEpoch','reviewProtocol','presentationVersion',
    'codeSha','registryVersion','registryHash','registrySnapshotHash','registrySnapshot','canonicalManifestHash',
    'suiteHash','priceHash','priceOperatorAuthorizationHash','canonicalManifest','models','cases','executionOrder',
    'providerOrder','providerBudgetsCny','codexLimits','concurrency','lockName','priceSnapshot','createdAt','manifestHash',
}
STATE_KEYS = {
    'schemaVersion','manifestHash','status','pauseReason','blockReason','createdAt','updatedAt',
    'providerSpentCny','providerUnreconciledCny','slots','stateHash',
}
ATTESTATION_KEYS = {
    'schemaVersion','suiteId','evaluationMode','evaluationEpoch','reviewProtocol','presentationVersion','batchId',
    'batchManifestHash','stateHash','daemon','concurrency','lockName','providerBudgetsCny','codexToolCallLimit',
    'modelCount','slotCount','revision','issuedAt','reportHash','attestationHash',
}

def ecmascript_number(value):
    if not math.isfinite(value):
        raise RuntimeError('schema')
    if value == 0:
        return '0'
    text = repr(value).lower()
    absolute = abs(value)
    if 'e' in text:
        mantissa, exponent_text = text.split('e', 1)
        exponent = int(exponent_text)
        if 1e-6 <= absolute < 1e21:
            return format(Decimal(text), 'f')
        mantissa = mantissa.rstrip('0').rstrip('.')
        return f'{mantissa}e{"+" if exponent >= 0 else ""}{exponent}'
    return text[:-2] if text.endswith('.0') else text

def cny_number_from_atoms(atoms_text, value):
    if not isinstance(atoms_text, str) or re.fullmatch(r'(?:0|[1-9][0-9]*)', atoms_text) is None:
        raise RuntimeError('schema')
    atoms = int(atoms_text)
    if atoms > 36_000_000_000 or isinstance(value, bool) or not isinstance(value, (int, float)) or value != atoms / 100_000_000:
        raise RuntimeError('schema')
    return ecmascript_number(float(value))

def canonical(value):
    if isinstance(value, list):
        return '[' + ','.join(canonical(item) for item in value) + ']'
    if isinstance(value, dict):
        parts = []
        for key in sorted(value):
            child = cny_number_from_atoms(value.get('unitCnyAtoms'), value[key]) if key == 'unitCny' and 'unitCnyAtoms' in value else canonical(value[key])
            parts.append(json.dumps(key, ensure_ascii=False, separators=(',', ':')) + ':' + child)
        return '{' + ','.join(parts) + '}'
    if isinstance(value, float):
        return ecmascript_number(value)
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))

def canonical_hash(value):
    return hashlib.sha256(canonical(value).encode('utf-8')).hexdigest()

def without(value, key):
    return {name: item for name, item in value.items() if name != key}

def protected(path, expected_hash=None):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_uid != expected_owner or before.st_nlink != 1 or stat.S_IMODE(before.st_mode) != 0o600 or before.st_size < 2 or before.st_size > MAX:
            raise RuntimeError('facts')
        data = b''
        while len(data) <= MAX:
            chunk = os.read(fd, min(1024 * 1024, MAX + 1 - len(data)))
            if not chunk: break
            data += chunk
        after = os.fstat(fd)
        path_stat = os.stat(path, follow_symlinks=False)
        if len(data) != before.st_size or (before.st_dev, before.st_ino, before.st_mtime_ns, before.st_ctime_ns) != (after.st_dev, after.st_ino, after.st_mtime_ns, after.st_ctime_ns) or (before.st_dev, before.st_ino) != (path_stat.st_dev, path_stat.st_ino):
            raise RuntimeError('drift')
        if expected_hash and hashlib.sha256(data).hexdigest() != expected_hash:
            raise RuntimeError('hash')
        return data
    finally:
        os.close(fd)

try:
    manifest_bytes = protected(manifest_path, manifest_file_hash)
    state_bytes = protected(state_path, state_file_hash)
    attestation_bytes = protected(attestation_path, attestation_file_hash)
    env_bytes = protected(env_path)
    manifest = json.loads(manifest_bytes)
    state = json.loads(state_bytes)
    attestation = json.loads(attestation_bytes)
    env_lines = env_bytes.decode('utf-8', 'strict').splitlines()
    secrets = [line.split('=', 1)[1] for line in env_lines if line.startswith('PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET=')]
    if len(secrets) != 1 or len(secrets[0].encode('utf-8')) < 32 or len(secrets[0].encode('utf-8')) > 4096:
        raise RuntimeError('secret')
    if not isinstance(manifest, dict) or set(manifest) != MANIFEST_KEYS or not isinstance(state, dict) or set(state) != STATE_KEYS or not isinstance(attestation, dict) or set(attestation) != ATTESTATION_KEYS:
        raise RuntimeError('schema')
    if manifest.get('schemaVersion') != 2 or state.get('schemaVersion') != 2 or attestation.get('schemaVersion') != 2:
        raise RuntimeError('schema')
    if any(manifest.get(key) != value or attestation.get(key) != value for key, value in IDENTITY.items()):
        raise RuntimeError('identity')
    if canonical_hash(without(manifest, 'manifestHash')) != manifest.get('manifestHash') or manifest.get('manifestHash') != expected_manifest_hash:
        raise RuntimeError('manifest-hash')
    if canonical_hash(without(state, 'stateHash')) != state.get('stateHash'):
        raise RuntimeError('state-hash')
    canonical_manifest = manifest.get('canonicalManifest')
    registry_snapshot = manifest.get('registrySnapshot')
    price_snapshot = manifest.get('priceSnapshot')
    if not isinstance(canonical_manifest, dict) or not isinstance(registry_snapshot, dict) or not isinstance(price_snapshot, dict):
        raise RuntimeError('nested')
    if canonical_hash(without(canonical_manifest, 'manifestHash')) != canonical_manifest.get('manifestHash') or canonical_manifest.get('manifestHash') != manifest.get('canonicalManifestHash'):
        raise RuntimeError('canonical-manifest')
    if canonical_hash(without(registry_snapshot, 'snapshotHash')) != registry_snapshot.get('snapshotHash') or registry_snapshot.get('snapshotHash') != manifest.get('registrySnapshotHash') or canonical_hash(registry_snapshot.get('registry')) != registry_snapshot.get('registryHash'):
        raise RuntimeError('registry-snapshot')
    if canonical_hash(without(price_snapshot, 'snapshotHash')) != price_snapshot.get('snapshotHash'):
        raise RuntimeError('price-snapshot')
    if manifest.get('codeSha') != code_sha or manifest.get('registryHash') != expected_registry_hash or manifest.get('suiteHash') != expected_suite_hash or manifest.get('priceHash') != expected_price_hash or price_snapshot.get('snapshotHash') != expected_price_hash:
        raise RuntimeError('expected-hashes')
    if manifest.get('manifestHash') != state.get('manifestHash') or manifest.get('manifestHash') != attestation.get('batchManifestHash') or state.get('stateHash') != attestation.get('stateHash'):
        raise RuntimeError('binding')
    if manifest.get('providerBudgetsCny') != {'bailian':180,'ark':180,'openrouter':360} or manifest.get('concurrency') != 1 or manifest.get('lockName') != LOCK or manifest.get('providerOrder') != ['bailian','ark','openrouter']:
        raise RuntimeError('manifest-gate')
    if attestation.get('daemon') != {'enabled':False,'status':'configured-disabled'} or attestation.get('concurrency') != 1 or attestation.get('lockName') != LOCK or attestation.get('providerBudgetsCny') != {'bailian':180,'ark':180,'openrouter':360}:
        raise RuntimeError('attestation-gate')
    if attestation.get('modelCount') != len(manifest.get('models', [])) or attestation.get('slotCount') != len(manifest.get('executionOrder', [])) or attestation.get('codexToolCallLimit') != manifest.get('codexLimits', {}).get('maxToolCalls'):
        raise RuntimeError('attestation-counts')
    report = without(without(attestation, 'reportHash'), 'attestationHash')
    expected_report_hash = canonical_hash(report)
    if attestation.get('reportHash') != expected_report_hash:
        raise RuntimeError('report-hash')
    domain_key = hmac.new(secrets[0].encode('utf-8'), DOMAIN, hashlib.sha256).digest()
    expected_attestation_hash = hmac.new(domain_key, expected_report_hash.encode('ascii'), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(str(attestation.get('attestationHash')), expected_attestation_hash):
        raise RuntimeError('attestation-hmac')
    if phase == 'canary-only' and state.get('status') != 'ready':
        raise RuntimeError('phase')
    if phase == 'full' and state.get('status') != 'canary_complete':
        raise RuntimeError('phase')
    revision = attestation.get('revision')
    issued_at = attestation.get('issuedAt')
    batch_id = attestation.get('batchId')
    if isinstance(revision, bool) or not isinstance(revision, int) or revision < 0 or not isinstance(batch_id, str) or re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._:-]{2,199}', batch_id) is None or not isinstance(issued_at, str) or re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z', issued_at) is None:
        raise RuntimeError('report')
    bundle = {'operation':'run','gate':{'enabled':False,'concurrency':1,'lockName':'/run/lock/paperbanana-hk-production.lock'},'executionPhase':phase,'manifest':manifest,'state':state,'report':{'batchId':batch_id,'revision':revision + 1,'createdAt':issued_at,'attestationSecret':secrets[0]}}
    encoded = json.dumps(bundle, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    fd = os.open(output, os.O_WRONLY | os.O_TRUNC | os.O_NOFOLLOW)
    try:
        os.fchmod(fd, 0o600)
        os.write(fd, encoded)
        os.fsync(fd)
    finally:
        os.close(fd)
except Exception as error:
    allowed_diagnostics = {
        'facts', 'drift', 'hash', 'secret', 'schema', 'identity', 'manifest-hash', 'state-hash',
        'nested', 'canonical-manifest', 'registry-snapshot', 'price-snapshot', 'expected-hashes',
        'binding', 'manifest-gate', 'attestation-gate', 'attestation-counts', 'report-hash',
        'attestation-hmac', 'phase', 'report',
    }
    diagnostic = str(error) if isinstance(error, RuntimeError) and str(error) in allowed_diagnostics else 'unknown'
    sys.stderr.write(f'scientific v2 protected run-bundle assembly failed [{diagnostic}]\n')
    raise SystemExit(1)
PY

run_bundle_hash="$(sha256sum "$temporary" 2>/dev/null | awk '{print $1}' || shasum -a 256 "$temporary" | awk '{print $1}')"
destination="$bundle_dir/$run_bundle_hash.json"
if [[ -e "$destination" ]]; then
  python3 - "$destination" "$temporary" <<'PY'
import os, stat, sys
fd=os.open(sys.argv[1],os.O_RDONLY|os.O_NOFOLLOW)
try:
 s=os.fstat(fd); data=os.read(fd,64*1024*1024+1)
 if not stat.S_ISREG(s.st_mode) or s.st_uid!=0 or s.st_nlink!=1 or stat.S_IMODE(s.st_mode)!=0o600 or data!=open(sys.argv[2],'rb').read(): raise RuntimeError()
finally: os.close(fd)
PY
else
  install -o root -g root -m 0600 "$temporary" "$destination"
fi
jq -cn --arg runBundleHash "$run_bundle_hash" --arg executionPhase "$execution_phase" \
  --arg manifestHash "$(jq -r .manifestHash "$manifest_path")" --arg stateHash "$(jq -r .stateHash "$state_path")" \
  '{operation:"stage-scientific-v2-run-bundle",runBundleHash:$runBundleHash,executionPhase:$executionPhase,manifestHash:$manifestHash,stateHash:$stateHash}'
