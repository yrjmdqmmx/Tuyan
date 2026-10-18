"""Import pinned GHCR images over a registry-only SSH tunnel; never proxies models."""
import base64, contextlib, fcntl, hashlib, json, os, pathlib, re, socket, subprocess, tempfile, time
KEYDIR=pathlib.Path('/opt/paperbanana/operations/hangzhou/registry-tunnel')
CACHE=pathlib.Path('/var/cache/hangzhou-ci-oci')
LOCK='/run/lock/hangzhou-registry-import.lock'

def cmd(args,**kw):
 p=subprocess.run(args,capture_output=True,**kw)
 if p.returncode:raise RuntimeError('registry import failed: '+args[0])
 return p.stdout

@contextlib.contextmanager
def tunnel():
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 args=['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','IdentitiesOnly=yes','-o','ExitOnForwardFailure=yes','-o','ConnectTimeout=10','-o','ServerAliveInterval=15','-o','HostKeyAlias=47.243.4.247','-o','UserKnownHostsFile='+str(KEYDIR/'known_hosts'),'-i',str(KEYDIR/'id_ed25519'),'-N','-D','127.0.0.1:'+str(port),'root@10.78.0.1']
 p=subprocess.Popen(args,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  for _ in range(150):
   if p.poll() is not None:raise RuntimeError('registry SSH tunnel failed')
   try:
    with socket.create_connection(('127.0.0.1',port),timeout=.2):break
   except OSError:time.sleep(.1)
  else:raise RuntimeError('registry SSH tunnel deadline')
  env=dict(os.environ);env.pop('HTTP_PROXY',None);env.pop('http_proxy',None);env.pop('ALL_PROXY',None);env.pop('all_proxy',None)
  env.update(HTTPS_PROXY='socks5://127.0.0.1:'+str(port),https_proxy='socks5://127.0.0.1:'+str(port),NO_PROXY='localhost,127.0.0.1,::1',no_proxy='localhost,127.0.0.1,::1')
  yield env
 finally:
  p.terminate()
  try:p.wait(timeout=5)
  except subprocess.TimeoutExpired:p.kill();p.wait()

def blob(layout,digest):
 if not re.fullmatch(r'sha256:[a-f0-9]{64}',digest):raise ValueError('invalid OCI digest')
 data=(layout/'blobs/sha256'/digest.split(':')[1]).read_bytes()
 if 'sha256:'+hashlib.sha256(data).hexdigest()!=digest:raise ValueError('OCI blob hash mismatch')
 return json.loads(data)

def config_digest(layout,tag):
 index=json.loads((layout/'index.json').read_text())
 entries=[x for x in index['manifests'] if x.get('annotations',{}).get('org.opencontainers.image.ref.name')==tag]
 if len(entries)!=1:raise ValueError('ambiguous OCI image')
 manifest=blob(layout,entries[0]['digest']);digest=manifest['config']['digest'];config=blob(layout,digest)
 if config['architecture']!='amd64' or config['os']!='linux':raise ValueError('wrong OCI platform')
 return digest

def import_images(images,token,username):
 CACHE.mkdir(mode=0o700,parents=True,exist_ok=True)
 with open(LOCK,'a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX)
  with tempfile.TemporaryDirectory(prefix='hz-registry-',dir='/run') as td,tunnel() as env:
   auth=pathlib.Path(td)/'auth.json';auth.write_text(json.dumps({'auths':{'ghcr.io':{'auth':base64.b64encode((username+':'+token).encode()).decode()}}}));auth.chmod(0o600)
   out={}
   for name,source in images.items():
    if not re.fullmatch(r'ghcr.io/yrjmdqmmx/(?:tuyan-hz-(?:core|gateway|benchmark|plot)|openacad-hz-worker)@sha256:[a-f0-9]{64}',source):raise ValueError('unapproved registry source')
    tag=source.split('@sha256:')[1];local='ghcr.io/yrjmdqmmx/'+source.split('/')[2].split('@')[0]+':hz-import-'+tag
    cmd(['skopeo','--override-arch','amd64','--override-os','linux','copy','--src-authfile',str(auth),'docker://'+source,'oci:'+str(CACHE)+':'+tag],env=env,timeout=900)
    expected=config_digest(CACHE,tag)
    found=subprocess.run(['docker','image','inspect',expected],capture_output=True)
    if found.returncode:
     cmd(['skopeo','copy','oci:'+str(CACHE)+':'+tag,'docker-daemon:'+local],timeout=600)
    actual=json.loads(cmd(['docker','image','inspect',expected]))[0]
    if actual['Id']!=expected or actual['Architecture']!='amd64' or actual['Os']!='linux':raise ValueError('imported image identity mismatch')
    out[name]=expected
   return out
