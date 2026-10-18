import json,datetime,concurrent.futures
from remote import *
s="""import json,subprocess,pathlib,hashlib
out=[]
for name in subprocess.check_output(['docker','ps','--format','{{.Names}}'],text=True).splitlines():
 d=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
 out.append({'name':name,'id':d['Id'],'image':d['Image'],'state':d['State']['Status'],'health':d['State'].get('Health',{}).get('Status'),'restarts':d['RestartCount']})
health=[]
for url in ['https://tuyansci.cn/ready','https://api.paperbanana.asia/ready','https://openacad.xyz/api/health']:
 p=subprocess.run(['curl','--connect-timeout','5','--max-time','20','-sS','-o','/dev/null','-w','%{http_code}',url],capture_output=True,text=True)
 health.append({'url':url,'status':p.stdout,'curl_exit':p.returncode})
print(json.dumps({'containers':out,'health_checks':health,'maintenance':pathlib.Path('/opt/paperbanana/control/maintenance').exists(),'bundle_sha256':subprocess.check_output(['docker','exec','paperbanana-hk-paperbanana-api-1','sha256sum','/app/dist/server.cjs'],text=True).split()[0]}))
"""
data=json.loads(py('hz',s));before=json.loads((ROOT/'containers-before.json').read_text());old={x['name']:x for x in before}
assert len(data['containers'])==10 and all(x['health']=='healthy' and x['restarts']==0 for x in data['containers'])
assert all(old[x['name']]['id']==x['id'] for x in data['containers'] if x['name']!='paperbanana-hk-paperbanana-api-1')
assert all(x['status']=='200' and x['curl_exit']==0 for x in data['health_checks']) and not data['maintenance']
assert data['bundle_sha256']==json.loads((ROOT/'image-build.json').read_text())['server_cjs_sha256']
data['other_nine_containers_unchanged']=True
data['checked_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
services={}
for node,iface in [('hk','pbhz0'),('hz','pbhk0'),('sg','pbsg0')]:
 code="""import json,subprocess
units=UNITS
states={u:{'active':subprocess.check_output(['systemctl','is-active',u],text=True).strip(),'enabled':subprocess.check_output(['systemctl','is-enabled',u],text=True).strip()} for u in units}
listeners=[l for l in subprocess.check_output(['ss','-ltn'],text=True).splitlines() if ':3128' in l or ':3129' in l]
print(json.dumps({'units':states,'proxy_listeners':listeners}))
""".replace('UNITS',repr(['wg-quick@'+iface]+(['squid'] if node!='hz' else [])))
 services[node]=json.loads(py(node,code))
 assert all(v['active']=='active' and v['enabled']=='enabled' for v in services[node]['units'].values())
data['egress_services']=services
(ROOT/'final-health.json').write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps({'containers':len(data['containers']),'all_healthy':True,'other_nine_unchanged':True,'public_health':data['health_checks'],'maintenance':False,'egress_services':services},ensure_ascii=False))
