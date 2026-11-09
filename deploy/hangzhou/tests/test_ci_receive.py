import importlib.util,pathlib,unittest,tempfile,tarfile,io,json,contextlib
from unittest import mock
spec=importlib.util.spec_from_file_location('receiver',pathlib.Path(__file__).parents[1]/'ci_receive.py');r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
class ReceiverTests(unittest.TestCase):
 def header(self):return dict(sha='a'*40,run='123',attempt='1',branch=r.BRANCH,repository='yrjmdqmmx/Tuyan',token='fixture',username='fixture',size=20,sha256='b'*64,expected={})
 def test_rejects_wrong_branch_and_repository(self):
  for key,value in [('branch','main'),('repository','attacker/Tuyan'),('size',1024**3+1),('sha','$(id)')]:
   h=self.header();h[key]=value
   with self.assertRaises(ValueError):r.validate_header(h,r.CONFIG['tuyan'])
 def test_valid_header(self):r.validate_header(self.header(),r.CONFIG['tuyan'])
 def test_archive_rejects_traversal_links_and_config(self):
  for name,kind in [('../escape',tarfile.REGTYPE),('/tmp/escape',tarfile.REGTYPE),('web/link',tarfile.SYMTYPE),('web/dev',tarfile.CHRTYPE),('secret.env',tarfile.REGTYPE)]:
   with tempfile.TemporaryDirectory() as td:
    root=pathlib.Path(td);archive=root/'archive.tar.gz';dest=root/'dest';dest.mkdir()
    with tarfile.open(archive,'w:gz') as tf:
     m=tarfile.TarInfo(name);m.type=kind;tf.addfile(m,io.BytesIO(b''))
    with self.assertRaises(ValueError):r.extract(archive,dest)
 def test_archive_requires_web_and_manifest_and_readable_dirs(self):
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);archive=root/'archive.tar.gz';dest=root/'dest';dest.mkdir()
   with tarfile.open(archive,'w:gz') as tf:
    for name,data in [('web/index.html',b'<h1>fixture</h1>'),('manifest.json',b'{}')]:
     m=tarfile.TarInfo(name);m.size=len(data);tf.addfile(m,io.BytesIO(data))
   r.extract(archive,dest);self.assertEqual((dest/'web').stat().st_mode&0o777,0o755)
 def test_atomic_switch_preserves_previous_target(self):
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);a=root/'a';b=root/'b';a.mkdir();b.mkdir();link=root/'current';link.symlink_to(a)
   r.atomic_link(b,link);self.assertEqual(link.resolve(),b.resolve());self.assertTrue(a.exists())
 def test_failed_deployment_never_runs_retention(self):
  maintenance=mock.Mock();maintenance.LOCKS=['fixture'];maintenance.locks.return_value=contextlib.nullcontext()
  with mock.patch.object(r,'load_retention',return_value=maintenance),mock.patch.object(r,'_deploy',side_effect=RuntimeError('fixture failure')):
   with self.assertRaises(RuntimeError):r.deploy('tuyan',io.BytesIO())
  maintenance.require_space.assert_called_once();maintenance.cleanup.assert_not_called()
 def test_retention_failure_does_not_turn_a_healthy_deployment_into_rollback(self):
  maintenance=mock.Mock();maintenance.LOCKS=['fixture'];maintenance.locks.return_value=contextlib.nullcontext();maintenance.cleanup.side_effect=ValueError('fixture invalid metadata')
  with mock.patch.object(r,'load_retention',return_value=maintenance),mock.patch.object(r,'_deploy') as deploy:
   r.deploy('tuyan',io.BytesIO())
  deploy.assert_called_once();maintenance.cleanup.assert_called_once_with(apply=True,lease_held=True)
if __name__=='__main__':unittest.main()
