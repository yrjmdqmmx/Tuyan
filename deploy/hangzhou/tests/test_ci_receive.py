import importlib.util,pathlib,unittest,tempfile,tarfile,io,json
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
if __name__=='__main__':unittest.main()
