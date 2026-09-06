#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ "$(id -u)" == 0 && "${SCIENTIFIC_V2_ACTIVE_RELEASE_HASH:-}" =~ ^[a-f0-9]{64}$ ]] || exit 64
repo_root=/opt/paperbanana/repo
deploy_env="$repo_root/deploy/hk-single-host/.env"
[[ -f /run/lock/paperbanana-hk-production.lock && ! -L /run/lock/paperbanana-hk-production.lock ]] || exit 1
exec 9</run/lock/paperbanana-hk-production.lock
flock -s 9
read_env_value() { awk -F= -v key="$2" '$1==key {value=substr($0,index($0,"=")+1);count++} END {if(count==1)print value;else exit 1}' "$1"; }
for path in "$deploy_env" /opt/paperbanana/secrets/core.env /opt/paperbanana/secrets/bench.env; do
  [[ -f "$path" && ! -L "$path" && "$(stat -c '%u:%g:%a' "$path")" =~ ^0:0:0?600$ ]] || exit 1
done
deployed_sha="$(git -C "$repo_root" rev-parse --verify HEAD)"
core_code_sha="$(read_env_value /opt/paperbanana/secrets/core.env PAPERBANANA_CODE_SHA)"
worker_code_sha="$(read_env_value /opt/paperbanana/secrets/bench.env PAPERBANANA_CODE_SHA)"
[[ "$deployed_sha" =~ ^[a-f0-9]{40}$
  && "$(read_env_value "$deploy_env" PAPERBANANA_BENCH_SECRET_MODE)" == configured-disabled
  && "$core_code_sha" =~ ^[a-f0-9]{40}$ && "$worker_code_sha" =~ ^[a-f0-9]{40}$
  && "$(read_env_value /opt/paperbanana/secrets/bench.env PAPERBANANA_BENCH_ENABLED)" == false
  && "$(read_env_value /opt/paperbanana/secrets/bench.env PAPERBANANA_BENCH_CONCURRENCY)" == 1 ]] || exit 1
core_image="$(read_env_value "$deploy_env" PAPERBANANA_CORE_IMAGE)"
worker_image="$(read_env_value "$deploy_env" PAPERBANANA_BENCH_WORKER_IMAGE)"
gateway_image="$(read_env_value "$deploy_env" PAPERBANANA_GATEWAY_IMAGE)"
plot_image="$(read_env_value "$deploy_env" PAPERBANANA_PLOT_WORKER_IMAGE)"
mongodb_image="$(read_env_value "$deploy_env" PAPERBANANA_MONGODB_IMAGE)"
validate_scientific_v2_image_lock() {
  local digest='@sha256:[0-9a-f]{64}$'
  [[ "$gateway_image" =~ ^ghcr\.io/[a-z0-9_.-]+/paperbanana-auth-gateway${digest}
    && "$core_image" =~ ^ghcr\.io/[a-z0-9_.-]+/paperbanana-core-api${digest}
    && "$plot_image" =~ ^ghcr\.io/[a-z0-9_.-]+/paperbanana-plot-worker${digest}
    && "$mongodb_image" =~ ^mongo:8\.0\.[0-9]+-noble${digest}
    && "$worker_image" =~ ^ghcr\.io/[a-z0-9_.-]+/paperbanana-benchmark-worker${digest} ]] || return 1
  jq -cn --arg gateway "$gateway_image" --arg core "$core_image" --arg plot "$plot_image" \
    --arg mongodb "$mongodb_image" --arg benchmark "$worker_image" \
    '{gateway_image:$gateway,core_image:$core,worker_image:$plot,mongodb_image:$mongodb,benchmark_image:$benchmark}'
}
image_lock="$(validate_scientific_v2_image_lock)" || exit 1
core_digest="${core_image##*@sha256:}"
worker_digest="${worker_image##*@sha256:}"
for digest in "$core_digest" "$worker_digest"; do [[ "$digest" =~ ^[a-f0-9]{64}$ ]]; done
for service in paperbanana-api benchmark-worker auth-gateway plot-worker mongodb; do
  case "$service" in
    paperbanana-api) expected_image="$core_image"; service_code_sha="$core_code_sha" ;;
    benchmark-worker) expected_image="$worker_image"; service_code_sha="$worker_code_sha" ;;
    auth-gateway) expected_image="$gateway_image" ;;
    plot-worker) expected_image="$plot_image" ;;
    mongodb) expected_image="$mongodb_image" ;;
  esac
  container_id="$(docker ps --filter label=com.docker.compose.project=paperbanana-hk --filter label=com.docker.compose.service="$service" --format '{{.ID}}')"
  [[ "$container_id" =~ ^[a-f0-9]+$ && "$(docker inspect --format '{{.Config.Image}}' "$container_id")" == "$expected_image" ]] || exit 1
  image_id="$(docker inspect --format '{{.Image}}' "$container_id")"
  docker image inspect --format '{{json .RepoDigests}}' "$image_id" | jq -e --arg digest "${expected_image##*@}" 'any(.[]; endswith("@" + $digest))' >/dev/null
  if [[ "$service" == paperbanana-api || "$service" == benchmark-worker ]]; then
    docker exec "$container_id" node -e 'const p=require("/app/build-provenance.json");if(p.codeSha!==process.argv[1]||process.env.PAPERBANANA_CODE_SHA!==process.argv[1]||(process.argv[2]==="benchmark-worker"&&(process.env.PAPERBANANA_BENCH_ENABLED!=="false"||process.env.PAPERBANANA_BENCH_CONCURRENCY!=="1")))process.exit(1)' "$service_code_sha" "$service" >/dev/null
  fi
done
jq -cn --arg deployedSha "$deployed_sha" --arg coreDigest "$core_digest" --arg workerDigest "$worker_digest" \
  --arg coreCodeSha "$core_code_sha" --arg workerCodeSha "$worker_code_sha" --argjson imageLock "$image_lock" \
  '{operation:"scientific-v2-expansion-preflight",providerCalls:0,deployedSha:$deployedSha,coreDigest:$coreDigest,workerDigest:$workerDigest,coreCodeSha:$coreCodeSha,workerCodeSha:$workerCodeSha,sameSha:($deployedSha == $coreCodeSha and $deployedSha == $workerCodeSha),imageLock:$imageLock,worker:{enabled:false,concurrency:1}}'
docker exec -e SCIENTIFIC_V2_ACTIVE_RELEASE_HASH="$SCIENTIFIC_V2_ACTIVE_RELEASE_HASH" -i paperbanana-hk-mongodb-1 bash -lc 'exec mongosh --quiet --host 127.0.0.1 --username "$MONGO_INITDB_ROOT_USERNAME" --password "$(cat /run/secrets/mongo_root_password)" --authenticationDatabase admin paperbanana_benchmark --file /dev/stdin' <<'JS'
const hash = process.env.SCIENTIFIC_V2_ACTIVE_RELEASE_HASH;
const head = db.getCollection('paperbanana_benchmark_release_heads').findOne({releaseHash: hash});
const lifecycle = head && db.getCollection('paperbanana_benchmark_release_lifecycle').findOne({releaseId: head.releaseId, releaseHash: hash, status: 'active'});
const release = head && lifecycle && db.getCollection('paperbanana_benchmark_releases').findOne({_id: head.releaseId, releaseHash: hash, profileStatus: 'published', suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2', evaluationEpoch: 'codex-scientific-2026-09-v1'});
if (!release || !Array.isArray(release.models)) throw new Error('SCIENTIFIC_V2_ACTIVE_BASELINE_INVALID');
const batch = db.getCollection('paperbanana_benchmark_scientific_v2_batches').findOne({batchId: release.batchId, manifestHash: release.batchManifestHash, status: 'published'});
if (!batch) throw new Error('SCIENTIFIC_V2_ACTIVE_BASELINE_INVALID');
print(JSON.stringify({operation:'scientific-v2-expansion-baseline',providerCalls:0,baseline:{releaseId:release._id,releaseHash:hash,batchId:release.batchId,manifestHash:release.batchManifestHash},modelCount:release.models.length,stateHash:batch.stateHash,manifestCodeSha:batch.manifest.codeSha}));
JS
python3 - <<'PY'
import hashlib, json, os, pathlib, re, stat
root = pathlib.Path('/opt/paperbanana/operator-private/scientific-v2')
groups = [
    ('registry-authorities', {'codeSha','snapshotHash','registryBytesHash','createdAt','issuedAt'}),
    ('signed-price-snapshots', {'codeSha','priceSnapshotHash','registryAuthorityHash','canonicalManifestHash','capturedAt'}),
    ('prepare-source', set()),
]
rows = []
for directory, fields in groups:
    folder = root / directory
    if not folder.is_dir() or folder.is_symlink(): continue
    paths = sorted(folder.glob('*.json'), key=lambda p: p.lstat().st_mtime, reverse=True)[:5]
    for path in paths:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
        try:
            facts = os.fstat(fd)
            if not stat.S_ISREG(facts.st_mode) or facts.st_uid != 0 or facts.st_nlink != 1 or stat.S_IMODE(facts.st_mode) != 0o600 or facts.st_size > 64*1024*1024: raise RuntimeError('protected metadata invalid')
            data = os.read(fd, 64*1024*1024+1)
            digest = hashlib.sha256(data).hexdigest()
            if path.name.split('.')[0] != digest: raise RuntimeError('metadata hash mismatch')
            payload = json.loads(data)
            row = {'kind':directory,'fileSha256':digest}
            if directory == 'prepare-source':
                payload = payload.get('input', {})
                row['codeSha'] = payload.get('codeSha')
                row['createdAt'] = payload.get('createdAt')
                row['expansion'] = payload.get('expansion')
            else:
                row.update({key:payload[key] for key in fields if key in payload})
            rows.append(row)
        finally: os.close(fd)
print(json.dumps({'operation':'scientific-v2-expansion-prepared-metadata','providerCalls':0,'signatureVerification':'performed-again-by-prepare','files':rows},separators=(',',':')))
PY
