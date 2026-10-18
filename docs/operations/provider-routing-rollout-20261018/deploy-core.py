import datetime,json,os,pathlib,shutil,subprocess,time,urllib.request

os.umask(0o077)
root=pathlib.Path('/opt/paperbanana')
env=root/'repo/deploy/hk-single-host/.env'
core=root/'secrets/core.env'
backup=pathlib.Path('/var/backups/provider-regional-routing-20261018')
marker=root/'control/maintenance'
sha='5f15e5e0bb2e2c67f23ebe09000a9a7ec76e70ad'
image='tuyan-core-hangzhou:5f15e5e0bb2e'
expected_old='sha256:631f11b065a9974c6f6034b4e37546ffc7e17199d2bd81ea2a9edaee775ea85d'
compose=['docker','compose','--env-file',str(env),'-f',str(root/'repo/deploy/hk-single-host/compose.yaml')]
def run(cmd):return subprocess.run(cmd,check=True,capture_output=True,text=True)
def image_id(name):return run(['docker','inspect',name,'--format','{{.Image}}']).stdout.strip()
def update(path,changes):
    lines=path.read_text().splitlines();seen=set();out=[]
    for line in lines:
        key=line.split('=',1)[0]
        if key in changes:
            if key in seen:raise RuntimeError('duplicate config entry '+key)
            seen.add(key);line=key+'='+changes[key]
        out.append(line)
    out.extend(k+'='+v for k,v in changes.items() if k not in seen)
    path.write_text('\n'.join(out)+'\n')
def wait_ready():
    for attempt in range(30):
        state=json.loads(run(['docker','inspect','paperbanana-hk-paperbanana-api-1']).stdout)[0]['State']
        if state.get('Health',{}).get('Status')=='healthy':return
        time.sleep(2)
    raise RuntimeError('Core did not become healthy')

assert image_id('paperbanana-hk-paperbanana-api-1')==expected_old,'Production image changed; stop'
assert not marker.exists(),'Another maintenance operation is active'
backup.mkdir(mode=0o700,exist_ok=False)
shutil.copy2(env,backup/'compose.env.before')
shutil.copy2(core,backup/'core.env.before')
fd=os.open(marker,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o640);os.close(fd);os.chown(marker,0,1000)
changed=False
try:
    check="const fs=require('fs');const c=new Mongo('mongodb://paperbanana_root:'+encodeURIComponent(fs.readFileSync('/run/secrets/mongo_root_password','utf8').trim())+'@127.0.0.1:27017/admin?replicaSet=rs0');const n=c.getDB('paperbanana_business').paperbanana_jobs.countDocuments({status:{$in:['queued','running','processing']}});print(n);if(n)quit(3);"
    run(['docker','exec','paperbanana-hk-mongodb-1','mongosh','--quiet','--eval',check])
    print('Active jobs: 0; maintenance gate enabled.',flush=True)
    changed=True
    update(core,{'PAPERBANANA_PROVIDER_DIRECT_HOSTS':'tokendance.space,ark.cn-beijing.volces.com,api.fireworks.ai','PAPERBANANA_HK_PROXY_URL':'http://10.78.0.1:3128','PAPERBANANA_PROVIDER_HK_HOSTS':'openrouter.ai,api.x.ai,api.novita.ai,api.stability.ai,api.together.ai,api.ideogram.ai,api.runware.ai,api.mistral.ai,api.bfl.ai,api.us.bfl.ai,api.eu.bfl.ai,queue.fal.run,api.fal.ai,external.api.recraft.ai,api.replicate.com,api.minimax.io','PAPERBANANA_CODE_SHA':sha})
    update(env,{'PAPERBANANA_CORE_IMAGE':image,'PAPERBANANA_CODE_SHA':sha})
    changed=True
    run(compose+['config','--quiet'])
    resolved=json.loads(run(compose+['config','--format','json']).stdout)
    assert resolved['services']['paperbanana-api']['image']==image,'Resolved Core image differs from candidate'
    del resolved
    result=run(compose+['up','-d','--no-deps','paperbanana-api'])
    print('Core recreated; waiting for readiness.',flush=True)
    wait_ready()
    actual=image_id('paperbanana-hk-paperbanana-api-1')
    expected=run(['docker','image','inspect',image,'--format','{{.Id}}']).stdout.strip()
    assert actual==expected,'Unexpected running image'
    with urllib.request.urlopen('http://127.0.0.1:13005/ready',timeout=20) as r:
        status=r.status;body=json.load(r)
    assert status==200 and body.get('ok') and body.get('backend',{}).get('data',{}).get('ready'),'Gateway not ready'
    receipt={'changed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'code_sha':sha,'previous_image':expected_old,'image':actual,'direct_hosts':['tokendance.space','ark.cn-beijing.volces.com','api.fireworks.ai'],'hongkong_proxy':'http://10.78.0.1:3128','hongkong_hosts':['openrouter.ai', 'api.x.ai', 'api.novita.ai', 'api.stability.ai', 'api.together.ai', 'api.ideogram.ai', 'api.runware.ai', 'api.mistral.ai', 'api.bfl.ai', 'api.us.bfl.ai', 'api.eu.bfl.ai', 'queue.fal.run', 'api.fal.ai', 'external.api.recraft.ai', 'api.replicate.com', 'api.minimax.io'],'overseas_proxy':'http://10.77.0.2:3128','status':'healthy','active_jobs_before':0,'model_calls':0}
    (backup/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    assert json.loads(run(['docker','exec','paperbanana-hk-paperbanana-api-1','cat','/app/build-provenance.json']).stdout)['codeSha']==sha
    marker.unlink()
    print(json.dumps(receipt),flush=True)
except BaseException:
    if changed:
        shutil.copy2(backup/'compose.env.before',env)
        shutil.copy2(backup/'core.env.before',core)
        run(compose+['up','-d','--no-deps','paperbanana-api'])
        wait_ready()
        assert image_id('paperbanana-hk-paperbanana-api-1')==expected_old
    marker.unlink(missing_ok=True)
    raise
