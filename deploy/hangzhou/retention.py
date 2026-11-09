#!/usr/bin/env python3
"""Bounded release retention. Defaults to a dry run; never prunes Docker globally."""
import argparse
import contextlib
import datetime
import fcntl
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import time

PROJECTS = {'tuyan': pathlib.Path('/opt/tuyan-entry'), 'openacad': pathlib.Path('/opt/openacad')}
CACHE = pathlib.Path('/var/cache/hangzhou-ci-oci')
LOCKS = ['/run/lock/hangzhou-release-retention.lock', '/run/lock/hangzhou-registry-import.lock',
         '/run/lock/hangzhou-ci-production.lock', '/run/lock/paperbanana-hk-production.lock']
REPOS = {'ghcr.io/yrjmdqmmx/' + name for name in
         ['tuyan-hz-core', 'tuyan-hz-gateway', 'tuyan-hz-benchmark', 'tuyan-hz-plot', 'openacad-hz-worker']}
RELEASE = re.compile(r'ci-[0-9]{1,14}-[0-9]{1,3}-[a-f0-9]{12}')
DIGEST = re.compile(r'sha256:[a-f0-9]{64}')
GRACE_SECONDS = 24 * 3600
MIN_FREE_BYTES = 8 * 1024**3


def command(args):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE)


@contextlib.contextmanager
def locks(paths=LOCKS, blocking=False):
    with contextlib.ExitStack() as stack:
        for path in paths:
            handle = stack.enter_context(open(path, 'a'))
            fcntl.flock(handle, fcntl.LOCK_EX | (0 if blocking else fcntl.LOCK_NB))
        yield


def disk():
    stat = os.statvfs('/')
    return {'availableBytes': stat.f_bavail * stat.f_frsize, 'totalBytes': stat.f_blocks * stat.f_frsize}


def require_space():
    if disk()['availableBytes'] < MIN_FREE_BYTES:
        raise RuntimeError('fewer than 8 GiB free before deployment; run reviewed release retention first')


def json_file(path):
    if path.is_symlink() or not path.is_file():
        raise ValueError('expected regular metadata file')
    return json.loads(path.read_text())


def inspect_all(kind):
    args = ['docker', 'ps', '-aq'] if kind == 'containers' else ['docker', 'image', 'ls', '-q', '--no-trunc']
    ids = sorted(set(command(args).split()))
    return json.loads(command(['docker', 'inspect', *ids])) if ids else []


def release_plan(projects, containers, now=None):
    now = time.time() if now is None else now
    protected_images = {c['Image'] for c in containers}  # Includes stopped containers.
    kept, expired, sources = [], [], set()
    active_paths = []
    for c in containers:
        labels = c.get('Config', {}).get('Labels') or {}
        if labels.get('com.docker.compose.project.working_dir'):
            active_paths.append(pathlib.Path(labels['com.docker.compose.project.working_dir']).resolve())
        active_paths.extend(pathlib.Path(m['Source']).resolve() for m in c.get('Mounts', []) if m.get('Source'))
    for project, root in projects.items():
        releases = root / 'releases'
        if root.is_symlink() or releases.is_symlink() or not releases.is_dir():
            raise ValueError('invalid release root')
        root = root.resolve(strict=True)
        releases = root / 'releases'
        current = (root / 'current').resolve(strict=True)
        if not current.is_relative_to(releases.resolve()):
            raise ValueError('current release outside managed root')
        rows = []
        for folder in releases.iterdir():
            if not RELEASE.fullmatch(folder.name):
                continue  # Legacy/non-CI directories are deliberately unmanaged.
            if folder.is_symlink() or not folder.is_dir():
                raise ValueError('invalid CI release directory')
            if not (folder / 'receipt.json').exists():
                continue  # Unknown/incomplete releases require a separate review.
            receipt = json_file(folder / 'receipt.json')
            sha = receipt.get('source', '')
            images = receipt.get('images', {})
            refs = receipt.get('registrySources', {})
            if (receipt.get('project') != project or receipt.get('status') != 'healthy'
                    or not re.fullmatch('[a-f0-9]{40}', sha) or not folder.name.endswith(sha[:12])
                    or not images or any(not DIGEST.fullmatch(x) for x in images.values())):
                raise ValueError('invalid healthy release receipt')
            for ref in refs.values():
                repo, sep, digest = ref.partition('@')
                if sep != '@' or repo not in REPOS or not DIGEST.fullmatch(digest):
                    raise ValueError('invalid registry source in receipt')
            completed = datetime.datetime.fromisoformat(receipt['completedAt'].replace('Z', '+00:00'))
            if completed.tzinfo is None:
                raise ValueError('release timestamp lacks timezone')
            rows.append({'path': str(folder), 'project': project, 'source': sha,
                         'completed': completed.timestamp(), 'images': images, 'sources': refs})
        rows.sort(key=lambda r: r['completed'], reverse=True)
        if not any(current.is_relative_to(pathlib.Path(r['path'])) for r in rows):
            raise ValueError('current release lacks a validated receipt')
        current_index = next(i for i, row in enumerate(rows)
                             if current.is_relative_to(pathlib.Path(row['path'])))
        rollback_indices = set(range(current_index, current_index + 3))
        # Keep predecessors too when current has been manually rolled back.
        for index, row in enumerate(rows):
            path = pathlib.Path(row['path']).resolve()
            active = current.is_relative_to(path) or any(p.is_relative_to(path) for p in active_paths)
            if index < 3 or index in rollback_indices or active or now - row['completed'] < GRACE_SECONDS:
                kept.append(row)
                protected_images.update(row['images'].values())
                sources.update(ref.split('@sha256:')[1] for ref in row['sources'].values())
            else:
                expired.append(row)
    return {'kept': kept, 'expired': expired, 'protectedImages': sorted(protected_images),
            'cacheTags': sorted(sources)}


def image_candidates(plan, images):
    eligible = {image for row in plan['expired'] for image in row['images'].values()}
    protected = set(plan['protectedImages'])
    candidates = []
    for image in images:
        ident, tags = image['Id'], image.get('RepoTags') or []
        if ident not in eligible or ident in protected or not tags:
            continue
        if not all(tag.partition(':')[0] in REPOS and
                   re.fullmatch(r'hz-import-[a-f0-9]{64}', tag.partition(':')[2]) for tag in tags):
            continue
        if any(ref.partition('@')[0] not in REPOS for ref in image.get('RepoDigests') or []):
            continue
        candidates.append({'id': ident, 'tags': tags})
    return candidates


def cache_plan(cache, protected_tags, now=None):
    now = time.time() if now is None else now
    if not cache.exists():
        return None
    if cache.is_symlink() or not cache.is_dir():
        raise ValueError('invalid OCI cache root')
    if not list(cache.iterdir()):
        return None
    if set(x.name for x in cache.iterdir()) != {'index.json', 'oci-layout', 'blobs'}:
        raise ValueError('unexpected OCI cache entries')
    if any(p.is_symlink() for p in cache.rglob('*')):
        raise ValueError('symlink in OCI cache')
    blobdir = cache / 'blobs' / 'sha256'
    if set(x.name for x in (cache / 'blobs').iterdir()) != {'sha256'}:
        raise ValueError('unexpected OCI blob namespace')
    files = list(blobdir.iterdir())
    if any(not re.fullmatch('[a-f0-9]{64}', p.name) or not p.is_file() for p in files):
        raise ValueError('invalid OCI blob')
    index = json_file(cache / 'index.json')
    retained, reachable = [], set()

    def walk(descriptor, metadata=False):
        digest = descriptor['digest']
        if not DIGEST.fullmatch(digest):
            raise ValueError('invalid OCI descriptor')
        path = blobdir / digest.split(':')[1]
        if not path.is_file() or path.stat().st_size != descriptor['size']:
            raise ValueError('missing or incomplete OCI blob')
        if digest in reachable:
            return
        reachable.add(digest)
        if metadata:
            data = path.read_bytes()
            if 'sha256:' + hashlib.sha256(data).hexdigest() != digest:
                raise ValueError('OCI metadata digest mismatch')
            value = json.loads(data)
            for child in value.get('manifests', []):
                walk(child, True)
            if 'config' in value:
                walk(value['config'])
            for child in value.get('layers', []):
                walk(child)

    for entry in index['manifests']:
        digest = entry['digest']
        if not DIGEST.fullmatch(digest):
            raise ValueError('invalid OCI index')
        path = blobdir / digest.split(':')[1]
        tag = entry.get('annotations', {}).get('org.opencontainers.image.ref.name')
        if tag in protected_tags or now - path.stat().st_mtime < GRACE_SECONDS:
            retained.append(entry)
            walk(entry, True)
    remove = [p for p in files if 'sha256:' + p.name not in reachable]
    return {'index': {**index, 'manifests': retained}, 'remove': [str(p) for p in remove],
            'bytes': sum(p.stat().st_blocks * 512 for p in remove), 'keptManifests': len(retained)}


def assert_deletable_release(path, projects, containers):
    path = pathlib.Path(path)
    if (not RELEASE.fullmatch(path.name) or path.parent not in {r.resolve() / 'releases' for r in projects.values()}
            or path.is_symlink() or path.resolve() != path):
        raise ValueError('release deletion outside approved directory')
    for root in projects.values():
        if (root / 'current').resolve().is_relative_to(path):
            raise ValueError('refusing current release deletion')
    for c in containers:
        labels = c.get('Config', {}).get('Labels') or {}
        sources = [m['Source'] for m in c.get('Mounts', []) if m.get('Source')]
        sources.append(labels.get('com.docker.compose.project.working_dir', '/'))
        if any(pathlib.Path(p).resolve().is_relative_to(path) for p in sources):
            raise ValueError('release used by a container')
    if pathlib.Path('/proc/self/mountinfo').exists():
        for line in pathlib.Path('/proc/self/mountinfo').read_text().splitlines():
            mount = pathlib.Path(line.split()[4].replace('\\040', ' '))
            if mount.is_relative_to(path):
                raise ValueError('mount inside release directory')


def cleanup(apply=False, lease_held=False):
    with locks(LOCKS[1:] if lease_held else LOCKS):
        containers = inspect_all('containers')
        plan = release_plan(PROJECTS, containers)
        all_images = inspect_all('images')
        for ident in set(plan['protectedImages']) - {i['Id'] for i in all_images}:
            # containerd may omit an untagged, still-running image from image ls.
            found = json.loads(command(['docker', 'image', 'inspect', ident]))
            if not any(image['Id'] == ident for image in found):
                raise RuntimeError('a protected runtime or rollback image is missing')
        images = image_candidates(plan, all_images)
        cache = cache_plan(CACHE, plan['cacheTags'])
        for row in plan['expired']:
            assert_deletable_release(row['path'], PROJECTS, containers)
        result = {'time': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  'apply': apply, 'before': disk(), 'keepReleases': [r['path'] for r in plan['kept']],
                  'removeReleases': [r['path'] for r in plan['expired']], 'removeImages': images,
                  'cache': {'removeBlobCount': len(cache['remove']), 'bytes': cache['bytes'],
                            'keptManifests': cache['keptManifests']} if cache else None,
                  'removedImages': [], 'imageFailures': [], 'removedReleases': []}
        if apply:
            if cache:
                temporary = CACHE / '.retention-index.tmp'
                with temporary.open('x') as f:
                    json.dump(cache['index'], f)
                    f.flush()
                    os.fsync(f.fileno())
                os.replace(temporary, CACHE / 'index.json')
                for path in cache['remove']:
                    pathlib.Path(path).unlink()
            for image in images:
                # Recheck all container references immediately before each deletion.
                if image['id'] in {c['Image'] for c in inspect_all('containers')}:
                    raise RuntimeError('container references changed; cleanup stopped')
                try:
                    command(['docker', 'image', 'rm', *image['tags']])  # Never --force.
                    result['removedImages'].append(image['id'])
                except subprocess.CalledProcessError:
                    result['imageFailures'].append(image['id'])
            for row in plan['expired']:
                if set(row['images'].values()) & set(result['imageFailures']):
                    continue  # Preserve the receipt so a later reviewed run can retry.
                assert_deletable_release(row['path'], PROJECTS, inspect_all('containers'))
                shutil.rmtree(row['path'])
                result['removedReleases'].append(row['path'])
        result['after'] = disk()
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if os.geteuid() != 0 or '172.25.63.224' not in command(['hostname', '-I']).split():
        raise RuntimeError('retention is restricted to the Hangzhou production host')
    result = cleanup(apply=args.apply)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result['imageFailures']:
        raise SystemExit(2)


if __name__ == '__main__':
    main()
