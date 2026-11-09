import json,datetime,subprocess
from remote import *
build=json.loads((ROOT/'image-build.json').read_text())
assert (ROOT/'deployment-receipt.json').exists()
container='paperbanana-hk-paperbanana-api-1'
manifest=(ROOT.parent/'provider-route-audit-all/manifest.json').read_bytes()
for name,data in [('provider-route-manifest.json',manifest),('runtime-route-probe.cjs',(ROOT/'runtime-route-probe.cjs').read_bytes())]:
 run('hz','docker exec -i '+container+' sh -c '+shlex.quote('cat > /tmp/'+name),data)
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
p=subprocess.Popen(HOSTS['hz']+['docker exec -e NODE_PATH=/app/node_modules '+container+' node /tmp/runtime-route-probe.cjs'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
rows=[]
with (ROOT/'runtime-probe.jsonl').open('w') as f:
 for line in p.stdout:
  row=json.loads(line);rows.append(row);f.write(line);f.flush()
  print(json.dumps(row,ensure_ascii=False),flush=True)
p.wait(timeout=120)
if p.returncode:raise RuntimeError('runtime probe failed '+p.stderr.read()[:300])
summary=rows[-1];assert summary.get('summary') and summary['failures']==0
hk=summary['egress']['hongkong']['hosts']
for m,row in zip(json.loads(manifest),rows[:-1],strict=True):
 expected='hongkong' if m['host'] in hk else ('hangzhou-direct' if m['host']=='api.fireworks.ai' else m['current_route'])
 assert row['dispatches'] and all(d['route']==expected for d in row['dispatches']),(m['id'],expected,row['dispatches'])
(ROOT/'runtime-validation.json').write_text(json.dumps({'started_at':started,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'code_sha':build['code_sha'],'requests':len(rows)-1,'route_assertions_passed':True,'inference_calls':0},indent=2)+'\n')
run('hz','docker exec '+container+' rm /tmp/provider-route-manifest.json /tmp/runtime-route-probe.cjs')
