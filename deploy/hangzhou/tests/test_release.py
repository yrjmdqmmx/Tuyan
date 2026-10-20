import copy, importlib.util, pathlib, unittest, tempfile, json, contextlib
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('release',pathlib.Path(__file__).parents[1]/'release.py');r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)

def manifest():
 return {'version':1,'id':'storage-test-20261018','expected_images':{k:'sha256:'+'a'*64 for k in r.SERVICES},'services':{'core':{'env':{'OSS_REGION':'oss-cn-hangzhou'}}}}

class SafetyTests(unittest.TestCase):
 def test_preserves_unrelated_credentials_and_routes(self):
  text='# operator data\nSECRET=fixture-only\nPAPERBANANA_HK_PROXY_URL=http://10.78.0.1:3128\nOSS_REGION=oss-cn-hongkong\n'
  actual=r.patch_env(text,{'OSS_REGION':'oss-cn-hangzhou','PAPERBANANA_OSS_SERVER_ENDPOINT_MODE':'internal'})
  self.assertIn('SECRET=fixture-only\n',actual);self.assertIn('PAPERBANANA_HK_PROXY_URL=http://10.78.0.1:3128\n',actual)
  self.assertNotIn('oss-cn-hongkong',actual);self.assertEqual(actual.count('OSS_REGION='),1)
 def test_duplicate_keys_stop(self):
  with self.assertRaises(ValueError):r.patch_env('OSS_REGION=a\nOSS_REGION=b',{'OSS_REGION':'oss-cn-hangzhou'})
 def test_cannot_enable_paid_worker_or_replace_secrets(self):
  for key in ['PAPERBANANA_BENCH_ENABLED','OSS_ACCESS_KEY_SECRET','PAPERBANANA_PROVIDER_HK_HOSTS']:
   m=manifest();m['services']['core']['env']={key:'true'}
   with self.assertRaises(ValueError):r.validate(m)
 def test_image_library_switch_is_bounded_to_its_three_consumers(self):
  for name in ['core','gateway','cn-gateway']:
   for value in ['true','false']:
    m=manifest();m['services']={name:{'env':{'PAPERBANANA_IMAGE_LIBRARY_ENABLED':value}}};r.validate(m)
  for name,value in [('benchmark','true'),('plot','true'),('core','yes'),('gateway','true\nSECRET=x')]:
   m=manifest();m['services']={name:{'env':{'PAPERBANANA_IMAGE_LIBRARY_ENABLED':value}}}
   with self.assertRaises(ValueError):r.validate(m)
 def test_rejects_unknown_services_mutable_images_and_wrong_regions(self):
  for bad in [{'mongodb':{}},{'core':{'image':'latest'}},{'core':{'env':{'OSS_PUBLIC_ENDPOINT':'https://evil.example'}}},{'core':{'env':{'OSS_REGION':'oss-cn-hongkong'}}}]:
   m=manifest();m['services']=bad
   with self.assertRaises(ValueError):r.validate(m)
 def test_all_existing_services_must_be_guarded(self):
  m=manifest();del m['expected_images']['cn-gateway']
  with self.assertRaises(ValueError):r.validate(m)
 def test_immutable_release_and_environment_only_change(self):
  m=manifest();r.validate(m)
  m['services']['core']['image']='sha256:'+'b'*64;m['services']['core']['env']['PAPERBANANA_CODE_SHA']='c'*40;r.validate(m)
 def test_rejects_env_interpolation(self):
  for value in ['$(id)','a\nb','${SECRET}','a`id`','a b']:
   m=manifest();m['services']['core']['env']['OSS_REGION']=value
   with self.assertRaises(ValueError):r.validate(m)
 def test_failed_restart_restores_config_and_preserves_unrelated_values(self):
  with tempfile.TemporaryDirectory() as tmp, contextlib.ExitStack() as stack:
   root=pathlib.Path(tmp);co=root/'compose';cn=root/'cn';back=root/'backups'
   for p in [root/'secrets',root/'control',co,cn,back]:p.mkdir()
   for info in [i for i in r.SERVICES.values() if i[2]]:(root/'secrets'/info[2]).write_text('SECRET=fixture\nOSS_REGION=oss-cn-hongkong\n')
   (co/'.env').write_text('UNCHANGED=fixture\n');(cn/'compose.yaml').write_text('services: {}\n')
   for k,v in {'ROOT':root,'COMPOSE':co,'CN':cn,'MARKER':root/'control/maintenance','BACKUPS':back,'LOCK':str(root/'lock')}.items():stack.enter_context(patch.object(r,k,v))
   stack.enter_context(patch.object(r.os,'geteuid',return_value=0));stack.enter_context(patch.object(r.os,'chown'))
   state={'Image':'sha256:'+'a'*64,'Config':{'Env':['PAPERBANANA_BENCH_ENABLED=false']},'State':{'Health':{'Status':'healthy'}}}
   stack.enter_context(patch.object(r,'inspect',return_value=state));stack.enter_context(patch.object(r,'wait_healthy'))
   ups=[]
   def run(args):
    if args==['hostname','-I']:return '172.25.63.224'
    if 'up' in args:
     ups.append(args)
     if len(ups)==1:raise RuntimeError('simulated restart failure')
    return 'idle'
   stack.enter_context(patch.object(r,'run',side_effect=run))
   with self.assertRaisesRegex(RuntimeError,'simulated'):r.main(manifest(),apply=True)
   self.assertEqual((root/'secrets/core.env').read_text(),'SECRET=fixture\nOSS_REGION=oss-cn-hongkong\n')
   self.assertFalse(r.MARKER.exists());self.assertEqual(len(ups),2)

if __name__=='__main__':unittest.main()
