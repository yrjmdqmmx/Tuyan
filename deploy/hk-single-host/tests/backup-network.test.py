"""Behaviour tests: do not need root, network, production data or iptables."""
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).parents[1] / 'scripts/with-backup-oss-network.py'
spec = importlib.util.spec_from_file_location('backup_network', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BackupNetworkTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.config = Path(self.tmp.name) / 'ossutil.conf'
        self.config.write_text('[default]\nendpoint=' + module.ENDPOINT + '\n')
        self.operations = []
        self.dns = ['100.115.61.4', '100.115.61.8']
        self.interface = 'eth0'
        self.tailscale = True
        self.fail_second = False
        self.input_rules = '-P INPUT ACCEPT\n-A INPUT -j ts-input\n'
        self.exit_code = 0
        self.child_started = False
        self.stop_signal = None
        self.handlers = {}

        def firewall(*args, check=True):
            self.operations.append(args)
            if args == ('-S', 'ts-input'):
                return subprocess.CompletedProcess([], 0 if self.tailscale else 1, '')
            if self.fail_second and args[0] == '-I' and '100.115.61.8/32' in args:
                raise subprocess.CalledProcessError(1, 'iptables')
            return subprocess.CompletedProcess([], 0, self.input_rules if args == ('-S', 'INPUT') else '')

        class Child:
            def wait(child):
                if self.stop_signal:
                    signum, self.stop_signal = self.stop_signal, None
                    self.handlers[signum](signum, None)
                return self.exit_code

            def send_signal(child, signum):
                self.operations.append(('signal', signum))

        def start(_command):
            self.child_started = True
            return Child()

        for target, replacement in [
            ('iptables', firewall),
            ('socket.getaddrinfo', lambda *a, **k: [(None, None, None, None, (ip, 443)) for ip in self.dns]),
            ('subprocess.run', lambda *a, **k: subprocess.CompletedProcess([], 0, json.dumps([{'dev': self.interface}]))),
            ('subprocess.Popen', start),
            ('signal.signal', lambda signum, handler: self.handlers.update({signum: handler})),
        ]:
            if '.' not in target:
                mock = patch.object(module, target, replacement)
            else:
                owner, attr = target.split('.')
                mock = patch.object(getattr(module, owner), attr, replacement)
            mock.start()
            self.addCleanup(mock.stop)

    def run_upload(self):
        return module.run(str(self.config), 'private-backup', ['ossutil', 'cp'])

    def test_only_exact_established_https_replies_and_cleanup(self):
        self.assertEqual(self.run_upload(), 0)
        adds = [op[3:] for op in self.operations if op[0] == '-I']
        deletes = [op[2:] for op in self.operations if op[0] == '-D']
        self.assertEqual(deletes, list(reversed(adds)))
        self.assertEqual(len(adds), 2)
        for rule in adds:
            for value in ['eth0', '443', 'ESTABLISHED', 'REPLY', 'ACCEPT']:
                self.assertIn(value, rule)
            self.assertNotIn('NEW', rule)

    def test_upload_failure_is_not_masked_and_rules_removed(self):
        self.exit_code = 3
        self.assertEqual(self.run_upload(), 3)
        self.assertEqual(len([op for op in self.operations if op[0] == '-D']), 2)

    def test_partial_rule_failure_cleans_inserted_rules_without_upload(self):
        self.fail_second = True
        with self.assertRaises(subprocess.CalledProcessError):
            self.run_upload()
        self.assertFalse(self.child_started)
        self.assertEqual(len([op for op in self.operations if op[0] == '-D']), 1)

    def test_invalid_dns_never_mutates_firewall(self):
        for addresses in [[], ['127.0.0.1'], ['1.1.1.1'], [f'100.115.61.{x}' for x in range(1, 34)]]:
            self.dns = addresses
            with self.assertRaises(ValueError):
                self.run_upload()
        self.assertEqual(self.operations, [])

    def test_wrong_route_never_mutates_firewall(self):
        self.interface = 'tailscale0'
        with self.assertRaises(ValueError):
            self.run_upload()
        self.assertEqual(self.operations, [])

    def test_wrong_endpoint_never_mutates_firewall(self):
        self.config.write_text('[default]\nendpoint=http://oss-cn-hongkong-internal.aliyuncs.com\n')
        with self.assertRaises(ValueError):
            self.run_upload()
        self.assertEqual(self.operations, [])

    def test_no_tailscale_needs_no_new_rules(self):
        self.tailscale = False
        self.assertEqual(self.run_upload(), 0)
        self.assertFalse(any(op[0] == '-I' for op in self.operations))

    def test_stale_cleanup_leaves_other_projects_and_tailscale_untouched(self):
        self.input_rules += ('-A INPUT -s 100.115.61.4/32 -m comment --comment "paperbanana-backup-oss:old" -j ACCEPT\n'
                             '-A INPUT -m comment --comment "other-project" -j ACCEPT\n')
        module.cleanup()
        deleted = [op for op in self.operations if op[0] == '-D']
        self.assertEqual(len(deleted), 1)
        self.assertIn('paperbanana-backup-oss:old', deleted[0])

    def test_termination_forwards_signal_and_cleans_rules(self):
        self.stop_signal = signal.SIGTERM
        with self.assertRaises(SystemExit) as result:
            self.run_upload()
        self.assertEqual(result.exception.code, 143)
        self.assertIn(('signal', signal.SIGTERM), self.operations)
        self.assertEqual(len([op for op in self.operations if op[0] == '-D']), 2)


class BackupPublicationTest(unittest.TestCase):
    def scenario(self, fail_upload):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            backups = root / 'backups'
            backups.mkdir()
            env_file = root / 'backup.env'
            env_file.write_text('PAPERBANANA_BACKUP_BUCKET=private-backup\nOSSUTIL_CONFIG_FILE=unused\n')
            source = (SCRIPT.parent / 'backup-mongo.sh').read_text()
            source = source.replace('/opt/paperbanana/backups', str(backups)).replace('/opt/paperbanana/secrets/backup.env', str(env_file))
            runner = root / 'backup.sh'
            runner.write_text(source)
            bindir = root / 'bin'
            bindir.mkdir()
            stubs = {
                'docker': 'printf "fake archive"',
                'sha256sum': 'printf "testhash  %s\\n" "$1"',
                'python3': 'find "$BACKUP_TEST_DIR" -maxdepth 1 -name "*.archive.gz" | /usr/bin/grep . && exit 99; count=0; test ! -f "$BACKUP_TEST_DIR/calls" || count=$(cat "$BACKUP_TEST_DIR/calls"); count=$((count+1)); printf "%s" "$count" > "$BACKUP_TEST_DIR/calls"; test "$count" != "$FAIL_UPLOAD"',
            }
            for name, body in stubs.items():
                stub = bindir / name
                stub.write_text('#!/bin/sh\n' + body + '\n')
                stub.chmod(0o755)
            result = subprocess.run(['bash', str(runner)], env={**os.environ, 'PATH': str(bindir) + ':' + os.environ['PATH'], 'BACKUP_TEST_DIR': str(backups), 'FAIL_UPLOAD': str(fail_upload)}, capture_output=True, text=True)
            completed = list(backups.glob('*.archive.gz'))
            if fail_upload:
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(completed, [])
                self.assertEqual(len(list(backups.glob('*.archive.gz.partial'))), 1)
            else:
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(len(completed), 1)
                self.assertTrue(Path(str(completed[0]) + '.sha256').is_file())
                self.assertNotIn('.partial', Path(str(completed[0]) + '.sha256').read_text())
                self.assertEqual(list(backups.glob('*.partial')), [])

    def test_archive_is_published_only_after_both_uploads(self):
        self.scenario(0)

    def test_archive_upload_failure_keeps_incomplete_files_hidden(self):
        self.scenario(1)

    def test_checksum_upload_failure_keeps_incomplete_files_hidden(self):
        self.scenario(2)


if __name__ == '__main__':
    unittest.main()
