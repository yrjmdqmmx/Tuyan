import importlib.util,pathlib,tempfile,json,hashlib,unittest
spec=importlib.util.spec_from_file_location('registry',pathlib.Path(__file__).parents[1]/'registry_import.py');r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
class RegistryImportTests(unittest.TestCase):
 def fixture(self,root,arch='amd64'):
  def save(value):
   data=json.dumps(value).encode();digest='sha256:'+hashlib.sha256(data).hexdigest();p=root/'blobs/sha256'/digest.split(':')[1];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);return digest
  config=save({'architecture':arch,'os':'linux'});manifest=save({'config':{'digest':config}})
  (root/'index.json').write_text(json.dumps({'manifests':[{'digest':manifest,'annotations':{'org.opencontainers.image.ref.name':'fixture'}}]}));return config
 def test_exact_config_identity(self):
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);expected=self.fixture(root);self.assertEqual(r.config_digest(root,'fixture'),expected)
 def test_corrupt_blob_rejected(self):
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);digest=self.fixture(root);(root/'blobs/sha256'/digest.split(':')[1]).write_text('{}')
   with self.assertRaisesRegex(ValueError,'hash mismatch'):r.config_digest(root,'fixture')
 def test_wrong_platform_rejected(self):
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);self.fixture(root,'arm64')
   with self.assertRaisesRegex(ValueError,'platform'):r.config_digest(root,'fixture')
 def test_missing_tag_and_bad_digest_rejected(self):
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);self.fixture(root)
   with self.assertRaises(ValueError):r.config_digest(root,'missing')
   with self.assertRaises(ValueError):r.blob(root,'sha256:../../escape')
