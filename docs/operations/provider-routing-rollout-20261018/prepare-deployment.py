import json
from remote import *
build=json.loads((ROOT/'image-build.json').read_text())
source=(ROOT.parent/'provider-route-audit/deploy-routing.py').read_text()
source=source.replace("provider-routing-20261018-retry1","provider-regional-routing-20261018")
source=source.replace("sha='e3c2a9d8e0ee207ac1ad313142007eaf964433e3'","sha="+repr(build['code_sha']))
source=source.replace("image='tuyan-core-hangzhou:e3c2a9d8e0ee'","image="+repr(build['image_tag']))
source=source.replace("sha256:8d3caecae31bccd41923e68660e179f1aee52fbd569e984e7cc10f6619055b81",build['base_image'])
hosts=next(l for l in (ROOT/'hk-squid-candidate.conf').read_text().splitlines() if l.startswith('acl approved dstdomain')).split()[4:]
source=source.replace("marker.touch(mode=0o640);os.chown(marker,0,1000)","fd=os.open(marker,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o640);os.close(fd);os.chown(marker,0,1000)")
source=source.replace("    update(core,{'PAPERBANANA_PROVIDER_DIRECT_HOSTS':'tokendance.space,ark.cn-beijing.volces.com','PAPERBANANA_CODE_SHA':sha})", "    changed=True\n    update(core,{'PAPERBANANA_PROVIDER_DIRECT_HOSTS':'tokendance.space,ark.cn-beijing.volces.com,api.fireworks.ai','PAPERBANANA_HK_PROXY_URL':'http://10.78.0.1:3128','PAPERBANANA_PROVIDER_HK_HOSTS':"+repr(','.join(hosts))+",'PAPERBANANA_CODE_SHA':sha})")
source=source.replace("'direct_hosts':['tokendance.space','ark.cn-beijing.volces.com'],", "'direct_hosts':['tokendance.space','ark.cn-beijing.volces.com','api.fireworks.ai'],'hongkong_proxy':'http://10.78.0.1:3128','hongkong_hosts':"+repr(hosts)+",")
source=source.replace("marker.unlink()\n    print(json.dumps(receipt)","assert json.loads(run(['docker','exec','paperbanana-hk-paperbanana-api-1','cat','/app/build-provenance.json']).stdout)['codeSha']==sha\n    marker.unlink()\n    print(json.dumps(receipt)")
(ROOT/'deploy-core.py').write_text(source)
# Save only safe container identity/status facts before deploying.
before=py('hz',"""import json,subprocess
out=[]
for name in subprocess.check_output(['docker','ps','--format','{{.Names}}'],text=True).splitlines():
 d=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
 out.append({'name':name,'id':d['Id'],'image':d['Image'],'state':d['State']['Status'],'health':d['State'].get('Health',{}).get('Status'),'restarts':d['RestartCount']})
print(json.dumps(out))
""")
(ROOT/'containers-before.json').write_bytes(before)
put('hz',build['staging_directory']+'/deploy-core.py',source.encode(),0o700)
print(build['staging_directory']+'/deploy-core.py')
