import importlib.util,pathlib,tempfile,json,hashlib,unittest
spec=importlib.util.spec_from_file_location('registry',pathlib.Path(__file__).parents[1]/'registry_import.py');r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
from unittest import mock
class RegistryImportTests(unittest.TestCase):
 def test_tuyan_pulls_directly_without_inheriting_proxy_or_changing_other_projects(self):
  with mock.patch.dict(r.os.environ, {'HTTPS_PROXY':'http://unused','no_proxy':'example.org'}), mock.patch.object(r, 'tunnel') as tunnel:
   with r.registry_transport({'core':'ghcr.io/yrjmdqmmx/tuyan-hz-core@sha256:'+'a'*64}) as env:
    self.assertFalse(any(k.lower() in {'http_proxy','https_proxy','all_proxy','no_proxy'} for k in env))
   tunnel.assert_not_called()
   self.assertIs(r.registry_transport({'worker':'ghcr.io/yrjmdqmmx/openacad-hz-worker@sha256:'+'a'*64}), tunnel.return_value)

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

 def test_docker_storage_backends_validate_identical_runtime_and_layers(self):
  config={'architecture':'amd64','os':'linux','config':{'Cmd':['/app/server'],'Env':['SAFE=1']},'rootfs':{'diff_ids':['sha256:'+'a'*64]}}
  actual={'Id':'sha256:'+'b'*64,'Architecture':'amd64','Os':'linux','Config':config['config'],'RootFS':{'Layers':config['rootfs']['diff_ids']}}
  self.assertEqual(r.validate_imported(actual,config),actual['Id'])
  for key,value in [('Config',{'Cmd':['wrong']}),('RootFS',{'Layers':[]}),('Architecture','arm64')]:
   with self.assertRaisesRegex(ValueError,'identity'):r.validate_imported({**actual,key:value},config)
