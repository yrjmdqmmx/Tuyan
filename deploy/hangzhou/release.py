#!/usr/bin/env python3
"""Apply a reviewed image/config manifest to the existing Hangzhou Compose services.

No git checkout, secret replacement, model call, image pull, database migration,
provider retry or benchmark enablement is performed by this operator command.
"""
import argparse, datetime, fcntl, hashlib, json, os, pathlib, re, shutil, subprocess, sys, time, urllib.request
ROOT = pathlib.Path('/opt/paperbanana')
COMPOSE = ROOT / 'repo/deploy/hk-single-host'
CN = ROOT / 'ops-releases/icp-domains-20261015'
MARKER = ROOT / 'control/maintenance'
BACKUPS = pathlib.Path('/var/backups')
LOCK = '/run/lock/paperbanana-hk-production.lock'
SERVICES = {
 'core': ('paperbanana-hk-paperbanana-api-1', 'paperbanana-api', 'core.env', 'PAPERBANANA_CORE_IMAGE'),
 'gateway': ('paperbanana-hk-auth-gateway-1', 'auth-gateway', 'gateway.env', 'PAPERBANANA_GATEWAY_IMAGE'),
 'cn-gateway': ('tuyan-cn-gateway-auth-gateway-1', 'auth-gateway', 'tuyan-cn-watcha.env', None),
 'plot': ('paperbanana-hk-plot-worker-1', 'plot-worker', None, 'PAPERBANANA_PLOT_WORKER_IMAGE'),
 'benchmark': ('paperbanana-hk-benchmark-worker-1', 'benchmark-worker', 'bench.env', 'PAPERBANANA_BENCH_WORKER_IMAGE'),
}
OSS_KEYS = {'PAPERBANANA_BUCKET', 'OSS_REGION', 'OSS_INTERNAL_ENDPOINT', 'OSS_PUBLIC_ENDPOINT', 'PAPERBANANA_OSS_SERVER_ENDPOINT_MODE',
 'PAPERBANANA_BENCH_OSS_BUCKET', 'PAPERBANANA_BENCH_OSS_REGION', 'PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT', 'PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT', 'PAPERBANANA_BENCH_OSS_SERVER_ENDPOINT_MODE'}

def run(args):
    p = subprocess.run(args, capture_output=True, text=True)
    if p.returncode: raise RuntimeError('command failed: ' + args[0])  # Never echo credential-bearing output.
    return p.stdout

def inspect(name): return json.loads(run(['docker', 'inspect', name]))[0]
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def patch_env(text, changes):
    seen = set(); lines = []
    for line in text.splitlines():
        key = line.split('=', 1)[0]
        if key in changes:
            if key in seen: raise ValueError('duplicate environment key')
            seen.add(key); line = key + '=' + changes[key]
        lines.append(line)
    lines.extend(k + '=' + v for k, v in changes.items() if k not in seen)
    return '\n'.join(lines) + '\n'

def validate(m):
    if m.get('version') != 1 or not re.fullmatch(r'[a-z0-9-]{8,80}', m.get('id', '')): raise ValueError('invalid manifest')
    if not m.get('services') or set(m['services']) - SERVICES.keys(): raise ValueError('unknown service')
    if set(m.get('expected_images', {})) != SERVICES.keys(): raise ValueError('all five current images are required')
    for image in m['expected_images'].values():
        if not re.fullmatch(r'sha256:[a-f0-9]{64}', image): raise ValueError('expected immutable image ID')
    for name, change in m['services'].items():
        if set(change) - {'image', 'env'}: raise ValueError('unknown change')
        if 'image' in change and not re.fullmatch(r'(?:[a-z0-9./:_-]+@)?sha256:[a-f0-9]{64}', change['image']): raise ValueError('image must be immutable')
        for key, value in change.get('env', {}).items():
            if name == 'plot' or key not in OSS_KEYS | {'PAPERBANANA_CODE_SHA'} or not isinstance(value, str) or re.search(r'[\s\x00$`"\x27\\]', value): raise ValueError('unsupported environment patch')
            if key == 'PAPERBANANA_CODE_SHA':
                if name not in {'core', 'benchmark'} or not re.fullmatch('[a-f0-9]{40}', value): raise ValueError('invalid code provenance')
            elif key.endswith('_BUCKET') or key == 'PAPERBANANA_BUCKET':
                if not re.fullmatch(r'paperbanana-(prod|bench)-hz-[0-9]{8}', value): raise ValueError('expected Hangzhou bucket')
            elif key.endswith('_REGION') and value != 'oss-cn-hangzhou': raise ValueError('expected Hangzhou region')
            elif key.endswith('_INTERNAL_ENDPOINT') and value != 'https://oss-cn-hangzhou-internal.aliyuncs.com': raise ValueError('expected internal Hangzhou endpoint')
            elif key.endswith('_PUBLIC_ENDPOINT') and value != 'https://oss-cn-hangzhou.aliyuncs.com': raise ValueError('expected public Hangzhou endpoint')
            elif key.endswith('_SERVER_ENDPOINT_MODE') and value != 'internal': raise ValueError('expected internal server traffic')

def compose(name):
    if name == 'cn-gateway': return ['docker','compose','--project-name','tuyan-cn-gateway','--project-directory',str(CN),'-f',str(CN/'compose.yaml')]
    return ['docker','compose','--project-name','paperbanana-hk','--project-directory',str(COMPOSE),'--env-file',str(COMPOSE/'.env'),'-f',str(COMPOSE/'compose.yaml')]

def wait_healthy(names):
    for _ in range(60):
        if all(inspect(SERVICES[n][0])['State'].get('Health',{}).get('Status') == 'healthy' for n in names): return
        time.sleep(2)
    raise RuntimeError('service health deadline exceeded')

def main(m, apply=False, keep=False):
    validate(m)
    if os.geteuid() != 0: raise ValueError('root required on Hangzhou')
    addresses = run(['hostname', '-I']).split()
    if '172.25.63.224' not in addresses: raise ValueError('not the verified Hangzhou host')
    lock = open(LOCK, 'a')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    try:
        before = {name: inspect(info[0]) for name,info in SERVICES.items()}
        for name, image in m['expected_images'].items():
            if before[name]['Image'] != image: raise ValueError('production changed; inspect again')
        bench_env = dict(v.split('=',1) for v in before['benchmark']['Config']['Env'])
        if bench_env.get('PAPERBANANA_BENCH_ENABLED') != 'false': raise ValueError('benchmark executor must remain disabled')
        paths = {ROOT/'secrets'/s[2] for s in SERVICES.values() if s[2]} | {COMPOSE/'.env', CN/'compose.yaml'}
        original = {p: p.read_text() for p in paths}
        files = {}; changes = m['services']; touched = set(changes)
        for name, change in changes.items():
            container, service, envfile, imagevar = SERVICES[name]
            if change.get('env'):
                p = ROOT/'secrets'/envfile; files[p] = patch_env(original[p], change['env'])
                if name == 'gateway': touched.add('cn-gateway')  # shared base environment
            if 'image' in change:
                candidate = json.loads(run(['docker','image','inspect',change['image']]))[0]
                if candidate['Id'] != change['image'] and change['image'] not in candidate.get('RepoDigests',[]): raise ValueError('image identity mismatch')
                if name in {'core', 'benchmark'}:
                    sha = change.get('env',{}).get('PAPERBANANA_CODE_SHA')
                    if not sha: raise ValueError('explicit code SHA required with Core/worker image')
                    actual = json.loads(run(['docker','run','--rm','--network','none','--entrypoint','cat',change['image'],'/app/build-provenance.json']))
                    if actual.get('codeSha') != sha: raise ValueError('image provenance differs from code SHA')
                if imagevar:
                    p = COMPOSE/'.env'; files[p] = patch_env(files.get(p,original[p]), {imagevar:change['image']})
                else:
                    p = CN/'compose.yaml'; text = original[p]
                    text, n = re.subn(r'(?m)^    image: .+$', '    image: '+change['image'], text)
                    if n != 1: raise ValueError('unexpected new-domain Compose layout')
                    files[p] = text
        # Do not expose env values or full Compose output in terminal receipts.
        print(json.dumps({'id':m['id'],'services':sorted(touched),'files':[str(p) for p in files],'apply':apply}), flush=True)
        if not apply: return
        if MARKER.exists() and MARKER.read_text().strip() != m['id']: raise ValueError('another maintenance owner')
        backup = BACKUPS/('hangzhou-'+m['id'])
        backup.mkdir(mode=0o700,exist_ok=False)
        before_hashes = {str(p):hashlib.sha256(original[p].encode()).hexdigest() for p in files}
        for p in files:
            if digest(p) != before_hashes[str(p)]: raise ValueError('configuration changed during preflight')
        for i,p in enumerate(files): shutil.copy2(p,backup/str(i))
        (backup/'restore-map.json').write_text(json.dumps({str(p):str(i) for i,p in enumerate(files)},indent=2))
        (backup/'manifest.json').write_text(json.dumps(m,indent=2))
        if not MARKER.exists():
            fd=os.open(MARKER,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o640)
            os.write(fd,m['id'].encode());os.close(fd);os.chown(MARKER,0,1000)
        changed=False
        try:
            query="const fs=require('fs');const m=new Mongo('mongodb://paperbanana_root:'+encodeURIComponent(fs.readFileSync('/run/secrets/mongo_root_password','utf8').trim())+'@127.0.0.1:27017/admin?replicaSet=rs0');const d=m.getDB('paperbanana_business');if(d.paperbanana_jobs.countDocuments({status:{$in:['queued','running','processing']}})||d.paperbanana_reference_upload_state.countDocuments({}))quit(3);print('idle');"
            run(['docker','exec','paperbanana-hk-mongodb-1','mongosh','--quiet','--nodb','--eval',query])
            for p in files:
                if digest(p) != before_hashes[str(p)]: raise ValueError('configuration changed during preflight')
            changed=True
            for p,text in files.items():
                tmp=p.with_name(p.name+'.hangzhou-new');tmp.write_text(text);shutil.copystat(p,tmp);os.chown(tmp,p.stat().st_uid,p.stat().st_gid);os.replace(tmp,p)
            for name in touched: run(compose(name)+['config','--quiet'])
            for name in ['plot','core','benchmark','gateway','cn-gateway']:
                if name in touched:
                    run(compose(name)+['up','-d','--no-deps',SERVICES[name][1]])
                    wait_healthy([name])
            for name in touched:
                state=inspect(SERVICES[name][0]);expected=changes.get(name,{}).get('image',before[name]['Image'])
                candidate=json.loads(run(['docker','image','inspect',expected]))[0]['Id']
                if state['Image'] != candidate: raise RuntimeError('unexpected running image')
                actual=dict(v.split('=',1) for v in state['Config']['Env'])
                for k,v in changes.get(name,{}).get('env',{}).items():
                    if actual.get(k)!=v: raise RuntimeError('environment not applied')
            for port in [13005,13006]:
                with urllib.request.urlopen('http://127.0.0.1:'+str(port)+'/ready',timeout=30) as response:
                    if response.status!=200 or not json.load(response).get('ok'): raise RuntimeError('gateway readiness')
            receipt={'id':m['id'],'status':'healthy','time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'services':sorted(touched),'backup':str(backup),'model_calls':0,'maintenance_held':keep}
            (backup/'receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt),flush=True)
            if not keep: MARKER.unlink()
        except BaseException:
            if changed:
                for i,p in enumerate(files): shutil.copy2(backup/str(i),p)
                for name in ['plot','core','benchmark','gateway','cn-gateway']:
                    if name in touched: run(compose(name)+['up','-d','--no-deps',SERVICES[name][1]])
                wait_healthy(touched)
                if any(inspect(SERVICES[n][0])['Image']!=before[n]['Image'] for n in touched): raise RuntimeError('rollback failed; maintenance retained')
            if not keep: MARKER.unlink(missing_ok=True)
            raise
    finally:
        lock.close()

if __name__ == '__main__':
    os.umask(0o077)
    parser=argparse.ArgumentParser();parser.add_argument('manifest');parser.add_argument('--apply',action='store_true');parser.add_argument('--keep-maintenance',action='store_true');args=parser.parse_args()
    try: main(json.loads(pathlib.Path(args.manifest).read_text()),args.apply,args.keep_maintenance)
    except Exception as e: print('Release stopped: '+str(e),file=sys.stderr);sys.exit(1)
