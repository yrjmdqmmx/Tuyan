import hashlib
import importlib.util
import json
import pathlib
import tempfile
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location('retention', pathlib.Path(__file__).parents[1] / 'retention.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


class RetentionTests(unittest.TestCase):
    def fixture(self, root):
        projects = {p: root / p for p in ['tuyan', 'openacad']}
        for project, path in projects.items():
            (path / 'releases').mkdir(parents=True)
            for n in range(1, 6):
                sha = str(n) * 40
                folder = path / 'releases' / ('ci-' + str(n) + '-1-' + sha[:12])
                folder.mkdir()
                (folder / 'web').mkdir()
                image = 'sha256:' + str(n) * 64
                (folder / 'receipt.json').write_text(json.dumps({
                    'project': project, 'status': 'healthy', 'source': sha,
                    'images': {'core': image}, 'registrySources': {},
                    'completedAt': '2026-10-0' + str(n) + 'T00:00:00Z'}))
            (path / 'current').symlink_to(folder / 'web')
        return projects

    def test_keeps_three_successes_and_all_container_references(self):
        with tempfile.TemporaryDirectory() as td:
            projects = self.fixture(pathlib.Path(td))
            old = projects['openacad'] / 'releases' / ('ci-1-1-' + '1' * 12)
            containers = [{'Image': 'sha256:' + '1' * 64, 'Config': {'Labels': {
                'com.docker.compose.project.working_dir': str(old)}}, 'Mounts': []}]
            plan = r.release_plan(projects, containers, now=1800000000)
            self.assertEqual(len(plan['kept']), 7)
            self.assertEqual(len(plan['expired']), 3)
            self.assertIn('sha256:' + '1' * 64, plan['protectedImages'])

    def test_current_older_release_is_protected(self):
        with tempfile.TemporaryDirectory() as td:
            projects = self.fixture(pathlib.Path(td))
            link = projects['tuyan'] / 'current'
            link.unlink()
            link.symlink_to(projects['tuyan'] / 'releases' / ('ci-1-1-' + '1' * 12) / 'web')
            plan = r.release_plan(projects, [], now=1800000000)
            self.assertIn(str(link.resolve().parent), [x['path'] for x in plan['kept']])

    def test_malformed_current_receipt_aborts(self):
        with tempfile.TemporaryDirectory() as td:
            projects = self.fixture(pathlib.Path(td))
            ((projects['tuyan'] / 'current').resolve().parent / 'receipt.json').write_text('{}')
            with self.assertRaises(ValueError):
                r.release_plan(projects, [])

    def test_unmanaged_backup_path_and_symlink_are_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            projects = self.fixture(root)
            backup = root / 'backups'
            backup.mkdir()
            with self.assertRaises(ValueError):
                r.assert_deletable_release(backup, projects, [])
            name = 'ci-9-1-' + '9' * 12
            link = projects['tuyan'] / 'releases' / name
            link.symlink_to(backup)
            with self.assertRaises(ValueError):
                r.assert_deletable_release(link, projects, [])
            with self.assertRaises(ValueError):
                r.assert_deletable_release((projects['tuyan'] / 'current').resolve().parent, projects, [])

    def test_removes_only_expired_owned_images_and_never_shared_tags(self):
        image = 'sha256:' + 'a' * 64
        plan = {'expired': [{'images': {'core': image}}], 'protectedImages': []}
        tag = 'ghcr.io/yrjmdqmmx/tuyan-hz-core:hz-import-' + 'b' * 64
        self.assertEqual(len(r.image_candidates(plan, [{'Id': image, 'RepoTags': [tag]}])), 1)
        self.assertEqual(r.image_candidates(plan, [{'Id': image, 'RepoTags': [tag, 'unrelated:latest']}]), [])
        plan['protectedImages'] = [image]
        self.assertEqual(r.image_candidates(plan, [{'Id': image, 'RepoTags': [tag]}]), [])

    def test_oci_gc_preserves_shared_layers_and_rejects_symlinks(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            blobs = root / 'blobs' / 'sha256'
            blobs.mkdir(parents=True)
            def save(data):
                digest = hashlib.sha256(data).hexdigest()
                (blobs / digest).write_bytes(data)
                return {'digest': 'sha256:' + digest, 'size': len(data)}
            layer = save(b'shared layer')
            config = save(b'{}')
            a = save(json.dumps({'config': config, 'layers': [layer]}).encode())
            b = save(json.dumps({'config': config, 'layers': [layer], 'old': True}).encode())
            (root / 'index.json').write_text(json.dumps({'manifests': [
                {**a, 'annotations': {'org.opencontainers.image.ref.name': 'keep'}},
                {**b, 'annotations': {'org.opencontainers.image.ref.name': 'old'}}]}))
            (root / 'oci-layout').write_text('{}')
            plan = r.cache_plan(root, {'keep'}, now=2000000000)
            self.assertEqual(plan['remove'], [str(blobs / b['digest'].split(':')[1])])
            (blobs / ('f' * 64)).symlink_to('/etc/passwd')
            with self.assertRaises(ValueError):
                r.cache_plan(root, {'keep'})

    def test_nonblocking_cleanup_obeys_an_existing_deployment_lock(self):
        with tempfile.TemporaryDirectory() as td:
            lock = str(pathlib.Path(td) / 'deploy.lock')
            with r.locks([lock]):
                with self.assertRaises(BlockingIOError):
                    with r.locks([lock]):
                        self.fail('must not enter concurrent cleanup')

    def test_dry_run_never_deletes_or_runs_docker_rm(self):
        with tempfile.TemporaryDirectory() as td:
            projects = self.fixture(pathlib.Path(td))
            images = [{'Id': 'sha256:' + str(n) * 64, 'RepoTags': [
                'ghcr.io/yrjmdqmmx/tuyan-hz-core:hz-import-' + str(n) * 64]} for n in range(1, 6)]
            with mock.patch.object(r, 'PROJECTS', projects), mock.patch.object(r, 'locks', return_value=__import__('contextlib').nullcontext()), mock.patch.object(r, 'CACHE', pathlib.Path(td) / 'empty'), mock.patch.object(r, 'inspect_all', side_effect=lambda kind: [] if kind == 'containers' else images), mock.patch.object(r, 'command', side_effect=AssertionError('mutation attempted')):
                result = r.cleanup(apply=False)
            self.assertEqual(len(result['removeReleases']), 4)
            self.assertEqual(len(list(projects['tuyan'].joinpath('releases').iterdir())), 5)

    def test_containerd_untagged_running_image_is_resolved_without_deleting_it(self):
        with tempfile.TemporaryDirectory() as td:
            projects = self.fixture(pathlib.Path(td))
            running = 'sha256:' + 'f' * 64
            containers = [{'Image': running, 'Config': {'Labels': {}}, 'Mounts': []}]
            images = [{'Id': 'sha256:' + str(n) * 64, 'RepoTags': []} for n in range(1, 6)]
            def lookup(args):
                self.assertEqual(args, ['docker', 'image', 'inspect', running])
                return json.dumps([{'Id': running}])
            with mock.patch.object(r, 'PROJECTS', projects), mock.patch.object(r, 'locks', return_value=__import__('contextlib').nullcontext()), mock.patch.object(r, 'CACHE', pathlib.Path(td) / 'empty'), mock.patch.object(r, 'inspect_all', side_effect=lambda kind: containers if kind == 'containers' else images), mock.patch.object(r, 'command', side_effect=lookup):
                result = r.cleanup(apply=False)
            self.assertEqual(result['removeImages'], [])


if __name__ == '__main__':
    unittest.main()
