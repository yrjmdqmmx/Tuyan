#!/usr/bin/env python3
"""Forced-command CI receiver. Installed by an operator; never replaced by a bundle."""
import contextlib, fcntl, hashlib, importlib.util, json, os, pathlib, re, shutil, subprocess, sys, tarfile, tempfile, time, urllib.request
BRANCH='codex/hangzhou-production'
CONFIG={
 'tuyan': {'repo':'yrjmdqmmx/Tuyan','root':'/opt/paperbanana','web':'/opt/tuyan-entry','services':{'core':'paperbanana-hk-paperbanana-api-1','gateway':'paperbanana-hk-auth-gateway-1','cn-gateway':'tuyan-cn-gateway-auth-gateway-1','benchmark':'paperbanana-hk-benchmark-worker-1','plot':'paperbanana-hk-plot-worker-1'},'images':{'core':'tuyan-hz-core','gateway':'tuyan-hz-gateway','benchmark':'tuyan-hz-benchmark','plot':'tuyan-hz-plot'},'url':'https://tuyansci.cn'},
 'openacad': {'repo':'yrjmdqmmx/OpenAcad','root':'/opt/openacad','web':'/opt/openacad','services':{'api':'openacad-api-1','worker-one':'openacad-worker-one-1','worker-two':'openacad-worker-two-1','redis':'openacad-redis-1'},'images':{'worker':'openacad-hz-worker'},'url':'https://openacad.xyz'},
}
def command(args,**kwargs):
 p=subprocess.run(args,capture_output=True,**kwargs)
 if p.returncode: raise RuntimeError('command failed: '+args[0])
 return p.stdout.decode()
def inspect(name):return json.loads(command(['docker','inspect',name]))[0]
def sha(path):
 h=hashlib.sha256()
 with pathlib.Path(path).open('rb') as f:
  for b in iter(lambda:f.read(4*1024*1024),b''):h.update(b)
 return h.hexdigest()
def state(project):
 c=CONFIG[project];root=pathlib.Path(c['root']);configs=[]
 if project=='tuyan':
  configs=list((root/'secrets').glob('*.env'))+[root/'repo/deploy/hk-single-host/.env',root/'ops-releases/icp-domains-20261015/compose.yaml']
 else:
  current=pathlib.Path(inspect(c['services']['api'])['Config']['Labels']['com.docker.compose.project.working_dir']);configs=[current/'compose.yml',current/'release.env']
 return {'images':{k:inspect(v)['Image'] for k,v in c['services'].items()},'configHashes':{str(p):sha(p) for p in configs},'web':str((pathlib.Path(c['web'])/'current').resolve()),'runtime':str(current) if project=='openacad' else None}
def github(c,token,path):
 req=urllib.request.Request('https://api.github.com/repos/'+c['repo']+'/'+path,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'hangzhou-deploy'})
 with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
def validate_header(h,c):
 if set(h)!={'sha','run','attempt','branch','repository','token','username','size','sha256','expected'}:raise ValueError('unexpected header')
 if h['branch']!=BRANCH or h['repository']!=c['repo']:raise ValueError('wrong repository or branch')
 if not re.fullmatch('[a-f0-9]{40}',h['sha']) or not re.fullmatch('[0-9]{1,14}',h['run']) or not re.fullmatch('[0-9]{1,3}',h['attempt']):raise ValueError('invalid provenance')
 if not isinstance(h['size'],int) or not 1<=h['size']<=1024**3 or not re.fullmatch('[a-f0-9]{64}',h['sha256']):raise ValueError('invalid payload size or digest')
def extract(archive,dest):
 total=0;seen=set()
 with tarfile.open(archive,'r:gz') as tf:
  for m in tf:
   p=pathlib.PurePosixPath(m.name)
   if m.name in seen or p.is_absolute() or '..' in p.parts or not p.parts or p.parts[0] not in {'web','manifest.json'} or not(m.isdir() or m.isfile()):raise ValueError('unsafe release archive')
   seen.add(m.name);total+=m.size
   if len(seen)>30000 or total>2*1024**3:raise ValueError('release archive too large')
   target=dest/p
   if m.isdir():target.mkdir(parents=True,exist_ok=True,mode=0o755)
   else:
    target.parent.mkdir(parents=True,exist_ok=True,mode=0o755)
    with tf.extractfile(m) as src,target.open('xb') as out:shutil.copyfileobj(src,out)
    target.chmod(0o644)
 for folder in [dest,*dest.rglob('*')]:
  if folder.is_dir():folder.chmod(0o755)
 if not (dest/'web/index.html').is_file() or not (dest/'manifest.json').is_file():raise ValueError('incomplete release')
def atomic_link(target,link):
 tmp=link.with_name(link.name+'.ci-new');tmp.unlink(missing_ok=True);tmp.symlink_to(target);os.replace(tmp,link)
def ready(url):
 with urllib.request.urlopen(url,timeout=30) as r:
  if r.status!=200:raise RuntimeError('public readiness failed')
  return json.load(r)
def verify_web(c,h):
 b=ready(c['url']+'/version.json?release='+h['sha'])
 if b.get('revision')!=h['sha']:raise RuntimeError('web revision mismatch')
def load_release():
 p=pathlib.Path(__file__).with_name('release.py');spec=importlib.util.spec_from_file_location('hz_release',p);r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r);return r
@contextlib.contextmanager
def registry(token,username):
 with tempfile.TemporaryDirectory(prefix='hz-registry-',dir='/run') as tmp:
  command(['docker','--config',tmp,'login','ghcr.io','--username',username,'--password-stdin'],input=token.encode())
  yield tmp

def tuy_deploy(c,h,m,dest):
 r=load_release();ident='ci-'+h['run']+'-'+h['attempt'];marker=r.MARKER;previous=pathlib.Path(h['expected']['web']);web_link=pathlib.Path(c['web'])/'current'
 if marker.exists():raise RuntimeError('existing maintenance')
 changes={k:{'image':v} for k,v in m['images'].items()};changes['cn-gateway']={'image':m['images']['gateway']}
 for k in ['core','benchmark']:changes[k]['env']={'PAPERBANANA_CODE_SHA':h['sha']}
 manifest={'version':1,'id':ident,'expected_images':h['expected']['images'],'services':changes}
 changed=False
 try:
  r.main(manifest,apply=True,keep=True);changed=True
  atomic_link(dest/'web',web_link);verify_web(c,h)
  for port in [13005,13006]:
   if not ready('http://127.0.0.1:'+str(port)+'/ready').get('ok'):raise RuntimeError('gateway not ready')
  # Release may only change image references / source revision, never routing or OSS.
  before=json.loads((dest/'protected-before.json').read_text());after=protected_tuyan()
  if before!=after:raise RuntimeError('protected runtime settings changed')
  if marker.read_text().strip()!=ident:raise RuntimeError('maintenance ownership changed')
  marker.unlink()
 except BaseException:
  atomic_link(previous,web_link)
  if changed:
   with open(r.LOCK,'a') as lock:
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    backup=r.BACKUPS/('hangzhou-'+ident);restore=json.loads((backup/'restore-map.json').read_text())
    for path,n in restore.items():shutil.copy2(backup/n,path)
    for name in ['plot','core','benchmark','gateway','cn-gateway']:r.run(r.compose(name)+['up','-d','--no-deps',r.SERVICES[name][1]])
    r.wait_healthy(r.SERVICES)
  if state('tuyan')['images']!=h['expected']['images']:raise RuntimeError('rollback incomplete; maintenance retained')
  if marker.exists() and marker.read_text().strip()==ident:marker.unlink()
  raise

def protected_tuyan():
 out={}
 for name in CONFIG['tuyan']['services'].values():
  env=dict(x.split('=',1) for x in inspect(name)['Config']['Env'])
  out[name]={k:v for k,v in env.items() if 'PROXY' in k or 'PROVIDER_' in k or 'OSS_' in k or k in {'PAPERBANANA_BUCKET','PAPERBANANA_BENCH_ENABLED'}}
 return out

def openacad_deploy(c,h,m,dest):
 root=pathlib.Path(c['root']);old_web=pathlib.Path(h['expected']['web']);old=pathlib.Path(h['expected']['runtime'])
 shutil.copy2(old/'compose.yml',dest/'compose.yml')
 text=(old/'release.env').read_text();new,n=re.subn(r'(?m)^OPENACAD_IMAGE=.*$', 'OPENACAD_IMAGE='+m['images']['worker'],text)
 if n!=1:raise ValueError('unexpected OpenAcad environment')
 (dest/'release.env').write_text(new);(dest/'release.env').chmod(0o600)
 (dest/'REVISION').write_text(h['sha']);(dest/'BACKEND_REVISION').write_text(h['sha'])
 marker=root/'shared/maintenance';ident='ci-'+h['run']+'-'+h['attempt'];changed=False
 if marker.exists():raise RuntimeError('existing OpenAcad maintenance')
 def co(directory,args):return command(['docker','compose','--project-name','openacad','--project-directory',str(directory),'--env-file',str(directory/'release.env'),'-f',str(directory/'compose.yml'),*args])
 def healthy():
  for _ in range(60):
   if all(inspect(c['services'][k])['State'].get('Health',{}).get('Status')=='healthy' for k in ['api','worker-one','worker-two']):return
   time.sleep(2)
  raise RuntimeError('OpenAcad health deadline')
 marker.write_text(ident);marker.chmod(0o644)
 try:
  for _ in range(70):
   count=co(old,['exec','-T','api','python','-c','from app.jobs import connection,queue; q=queue(connection()); print(q.count+q.started_job_registry.count)']).strip()
   if count=='0':break
   time.sleep(5)
  else:raise RuntimeError('OpenAcad queue not drained')
  co(dest,['config','--quiet']);changed=True
  co(dest,['up','-d','--no-deps','api','worker-one','worker-two']);healthy()
  atomic_link(dest,root/'current');verify_web(c,h);ready(c['url']+'/api/health')
  expected=json.loads(command(['docker','image','inspect',m['images']['worker']]))[0]['Id']
  if any(inspect(c['services'][k])['Image']!=expected for k in ['api','worker-one','worker-two']):raise RuntimeError('OpenAcad image mismatch')
  if inspect(c['services']['redis'])['Image']!=h['expected']['images']['redis']:raise RuntimeError('Redis image changed')
  if marker.read_text()!=ident:raise RuntimeError('maintenance ownership changed')
  marker.unlink()
 except BaseException:
  atomic_link(old_web,root/'current')
  if changed:co(old,['up','-d','--no-deps','api','worker-one','worker-two']);healthy()
  if state('openacad')['images']!=h['expected']['images']:raise RuntimeError('OpenAcad rollback incomplete; maintenance retained')
  if marker.exists() and marker.read_text()==ident:marker.unlink()
  raise

def deploy(project,stream):
 c=CONFIG[project];line=stream.readline(32769)
 if len(line)>32768:raise ValueError('header too large')
 h=json.loads(line);validate_header(h,c)
 run=github(c,h['token'],'actions/runs/'+h['run'])
 if run['head_sha']!=h['sha'] or run['head_branch']!=BRANCH or run['path']!='.github/workflows/deploy-hangzhou.yml' or run['event'] not in ['push','workflow_dispatch'] or run['status'] not in ['in_progress','queued']:raise ValueError('untrusted CI run')
 branch=github(c,h['token'],'git/ref/heads/'+BRANCH)
 if branch['object']['sha']!=h['sha']:raise ValueError('superseded source commit')
 with tempfile.TemporaryDirectory(prefix='hz-upload-',dir='/var/tmp') as td:
  tmp=pathlib.Path(td);archive=tmp/'web.tar.gz';remaining=h['size']
  with archive.open('wb') as f:
   while remaining:
    b=stream.read(min(4*1024*1024,remaining))
    if not b:raise ValueError('truncated release')
    f.write(b);remaining-=len(b)
  if stream.read(1):raise ValueError('trailing payload')
  if sha(archive)!=h['sha256']:raise ValueError('payload hash mismatch')
  unpack=tmp/'unpack';unpack.mkdir();extract(archive,unpack)
  m=json.loads((unpack/'manifest.json').read_text())
  if set(m)!={'sha','images'} or m['sha']!=h['sha'] or set(m['images'])!=set(c['images']):raise ValueError('manifest mismatch')
  for name,image in m['images'].items():
   if not re.fullmatch('ghcr.io/yrjmdqmmx/'+c['images'][name]+r'@sha256:[a-f0-9]{64}',image):raise ValueError('unapproved image')
  # Only registry bytes use this separate SSH tunnel. Existing model proxies are untouched.
  from registry_import import import_images
  registry_sources=dict(m['images'])
  m['images']=import_images(registry_sources,h['token'],h['username'])
  with open('/run/lock/hangzhou-ci-production.lock','a') as lock:
   fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
   if state(project)!=h['expected']:raise ValueError('production changed after CI preflight')
   latest=github(c,h['token'],'git/ref/heads/'+BRANCH)
   if latest['object']['sha']!=h['sha']:raise ValueError('superseded source commit')
   dest=pathlib.Path(c['web'])/'releases'/('ci-'+h['run']+'-'+h['attempt']+'-'+h['sha'][:12]);dest.mkdir(mode=0o755);dest.chmod(0o755)
   shutil.copytree(unpack/'web',dest/'web');shutil.copy2(unpack/'manifest.json',dest/'manifest.json')
   if project=='tuyan':
    (dest/'protected-before.json').write_text(json.dumps(protected_tuyan()));(dest/'protected-before.json').chmod(0o600);tuy_deploy(c,h,m,dest)
   else:openacad_deploy(c,h,m,dest)
   receipt={'project':project,'source':h['sha'],'run':h['run'],'status':'healthy','target':'Hangzhou','modelCalls':0,'registrySources':registry_sources,'images':{k:inspect(v)['Image'] for k,v in c['services'].items()},'web':str(dest/'web'),'completedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
   (dest/'receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt),flush=True)

def main():
 os.umask(0o077);project=sys.argv[1]
 if project not in CONFIG or os.geteuid()!=0 or '172.25.63.224' not in command(['hostname','-I']).split():raise ValueError('wrong host')
 cmd=os.environ.get('SSH_ORIGINAL_COMMAND','')
 if cmd=='status':print(json.dumps(state(project)))
 elif cmd=='deploy':deploy(project,sys.stdin.buffer)
 else:raise ValueError('only status/deploy commands permitted')
if __name__=='__main__':
 try:main()
 except Exception as e:print('Hangzhou deployment stopped: '+type(e).__name__+': '+str(e),file=sys.stderr);sys.exit(1)
