import copy, importlib.util, pathlib, unittest, tempfile, json, contextlib
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('release',pathlib.Path(__file__).parents[1]/'release.py');r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)

def manifest():
 return {'version':1,'id':'storage-test-20261018','expected_images':{k:'sha256:'+'a'*64 for k in r.SERVICES},'services':{'core':{'env':{'OSS_REGION':'oss-cn-hangzhou'}}}}

class SafetyTests(unittest.TestCase):
 def test_agent_read_config_is_cn_only_bounded_and_preserves_other_settings(self):
  records=json.dumps([{'id':'grokbot','sha256':'a'*64,'scopes':['overview:read','health:read'],'expiresAt':'2027-01-01T00:00:00.000Z'}],separators=(',',':'))
  settings={'TUYAN_OPS_AGENT_ENABLED':'true','TUYAN_OPS_AGENT_TOKENS':records,'TUYAN_OPS_HOST_SNAPSHOT_FILE':r.AGENT_HOST_FILE,'PAPERBANANA_OPERATIONS_TOKEN':'b'*64}
  m=manifest();m['services']={'cn-gateway':{'env':settings}};r.validate(m)
  for service,key,value in [('gateway','TUYAN_OPS_AGENT_ENABLED','true'),('core','TUYAN_OPS_AGENT_TOKENS',records),('cn-gateway','TUYAN_OPS_AGENT_ENABLED','yes'),('cn-gateway','TUYAN_OPS_HOST_SNAPSHOT_FILE','/etc/shadow'),('cn-gateway','TUYAN_OPS_AGENT_TOKENS',records.replace('overview:read','admin:write')),('cn-gateway','TUYAN_OPS_AGENT_TOKENS',records+'\nSECRET=x')]:
   m=manifest();m['services']={service:{'env':{key:value}}}
   with self.assertRaises(ValueError):r.validate(m)
  text='services:\n  auth-gateway:\n    volumes:\n      - /opt/paperbanana/control:/opt/paperbanana/control:ro\n'
  actual=r.with_agent_host_mount(text);self.assertIn(r.AGENT_HOST_MOUNT,actual)
  self.assertIn('/opt/paperbanana/control:/opt/paperbanana/control:ro',actual)
  self.assertEqual(r.with_agent_host_mount(actual),actual)
  inline='services:\n  auth-gateway:\n    volumes: [/opt/paperbanana/control:/opt/paperbanana/control:ro]\n'
  self.assertEqual(r.with_agent_host_mount(inline),actual)
  with self.assertRaises(ValueError):r.with_agent_host_mount(text.replace('volumes:','other:'))
 def test_plus_patch_is_live_admin_gateway_only_and_rejects_unsafe_values(self):
  settings={'PLUS_ENABLED':'true','PLUS_ADMIN_ONLY':'true','PLUS_PAYMENT_ENVIRONMENT':'live','PLUS_EXECUTION_MODE':'disabled','PLUS_NEW_PURCHASES_ENABLED':'false','PLUS_NEW_TASKS_ENABLED':'false','PLUS_LIVE_COMMERCE_READY':'false','PLUS_PAYMENT_RETURN_URL':'https://tuyansci.cn/?view=account&section=account'}
  for service in ['gateway','cn-gateway']:
   m=manifest();m['services']={service:{'env':settings}};r.validate(m)
  m=manifest();m['services']={'core':{'env':{'PAPERBANANA_PLUS_PREPARED':'false'}}};r.validate(m)
  bad=[('gateway','PAPERBANANA_PLUS_PREPARED','true'),('core','PLUS_ENABLED','true'),('gateway','PLUS_ADMIN_ONLY','false'),('gateway','PLUS_PAYMENT_ENVIRONMENT','sandbox'),('gateway','PLUS_EXECUTION_MODE','simulation'),('gateway','PLUS_BAILIAN_API_KEY','x\nOTHER=value'),('gateway','PLUS_PAYMENT_RETURN_URL','https://example.com/'),('gateway','PLUS_PRICING_FILE','/tmp/unreviewed.json'),('gateway','PLUS_WATCHA_SANDBOX_API_KEY','fixture-'+'x'*30)]
  for service,key,value in bad:
   m=manifest();m['services']={service:{'env':{key:value}}}
   with self.assertRaises(ValueError):r.validate(m)
 def test_identity_configuration_is_gateway_only_and_cannot_enable_sms(self):
  settings={'GOOGLE_OAUTH_ENABLED':'true','GITHUB_OAUTH_ENABLED':'true','AUTH_SMS_ENABLED':'false','AUTH_SMS_DELIVERY_ENABLED':'false','WECHAT_OAUTH_ENABLED':'false','AUTH_IDENTITY_PROXY_URL':'http://10.78.0.1:3129','GOOGLE_CLIENT_ID':'123-localfixture.apps.googleusercontent.com','GOOGLE_CLIENT_SECRET':'fixture-'+'x'*24,'GITHUB_CLIENT_ID':'fixtureclientid','GITHUB_CLIENT_SECRET':'x'*40}
  for service in ['gateway','cn-gateway']:
   m=manifest();m['services']={service:{'env':settings}};r.validate(m)
  for service,key,value in [('core','GITHUB_OAUTH_ENABLED','true'),('gateway','AUTH_SMS_ENABLED','true'),('gateway','AUTH_SMS_DELIVERY_ENABLED','true'),('gateway','WECHAT_OAUTH_ENABLED','true'),('gateway','AUTH_IDENTITY_PROXY_URL','http://10.78.0.1:3128'),('gateway','GOOGLE_CLIENT_SECRET','x\nSECRET=other'),('gateway','GOOGLE_CLIENT_SECRET',None)]:
   m=manifest();m['services']={service:{'env':{key:value}}}
   with self.assertRaises(ValueError):r.validate(m)
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
 def test_operations_configuration_is_core_only_and_bounded(self):
  m=manifest();m['services']['core']['env']={'PAPERBANANA_OPERATIONS_ENABLED':'true','PAPERBANANA_OPERATIONS_TOKEN':'a'*64};r.validate(m)
  for service,key,value in [('gateway','PAPERBANANA_OPERATIONS_ENABLED','true'),('benchmark','PAPERBANANA_OPERATIONS_TOKEN','a'*64),('core','PAPERBANANA_OPERATIONS_TOKEN','short'),('core','PAPERBANANA_OPERATIONS_ENABLED','yes')]:
   m=manifest();m['services']={service:{'env':{key:value}}}
   with self.assertRaises(ValueError):r.validate(m)
 def test_all_existing_services_must_be_guarded(self):
  m=manifest();del m['expected_images']['cn-gateway']
  with self.assertRaises(ValueError):r.validate(m)
 def test_admission_change_is_core_only_and_independently_bounded(self):
  for key in r.ADMISSION_KEYS:
   for value in ['1','2']:
    m=manifest();m['services']={'core':{'env':{key:value}}};r.validate(m)
   for service,value in [('gateway','2'),('cn-gateway','2'),('benchmark','2'),('plot','2'),('core',str(r.ADMISSION_BOUNDS[key][1]+1)),('core','-1'),('core','02'),('core',2),('core','2\nSECRET=x')]:
    m=manifest();m['services']={service:{'env':{key:value}}}
    with self.assertRaises(ValueError):r.validate(m)
  for key in ['PAPERBANANA_CANDIDATE_CONCURRENCY','PAPERBANANA_SINGLE_REPLICA']:
   m=manifest();m['services']={'core':{'env':{key:'2'}}}
   with self.assertRaises(ValueError):r.validate(m)
 def test_authorized_eight_global_two_per_owner_and_bounded_queue(self):
  m=manifest();m['services']={'core':{'env':{'PAPERBANANA_MAX_ACTIVE_JOBS':'8','PAPERBANANA_MAX_JOBS_PER_OWNER':'2','PAPERBANANA_MAX_JOBS_PER_IP':'40','PAPERBANANA_MAX_PENDING_JOBS':'32'}}};r.validate(m)
  m['services']['core']['env']['PAPERBANANA_MAX_PENDING_JOBS']='0';r.validate(m)
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
