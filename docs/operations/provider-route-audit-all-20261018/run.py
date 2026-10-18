import argparse,concurrent.futures,json,pathlib,subprocess,time
root=pathlib.Path(__file__).parent
base=['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=10']
hosts={'hangzhou':base+['root@116.62.146.226'],'hongkong':base+['root@47.243.4.247'],'singapore':base+['-o','HostKeyAlias=47.84.201.88','-J','root@47.243.4.247','ecs-user@10.77.0.2'],'hangzhou-via-singapore':base+['root@116.62.146.226']}
p=argparse.ArgumentParser();p.add_argument('--nodes',default=','.join(hosts));p.add_argument('--rounds',type=int,default=5);p.add_argument('--ids',default='');p.add_argument('--suffix',default='');a=p.parse_args()
source=root.joinpath('probe.py').read_text().replace('__MANIFEST__',repr(json.loads(root.joinpath('manifest.json').read_text()))).encode()
def run(node):
 args=['python3','-','--node',node,'--rounds',str(a.rounds)]
 if a.ids:args+=['--ids',a.ids]
 if node=='hangzhou-via-singapore':args+=['--proxy','http://10.77.0.2:3128']
 path=root/(node+a.suffix+'.jsonl')
 with path.open('w') as f:
  p=subprocess.Popen(hosts[node]+args,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  p.stdin.write(source);p.stdin.close();count=0
  for line in p.stdout:
   row=json.loads(line);f.write(json.dumps(row,ensure_ascii=False)+'\n');f.flush();count+=1
   if count%40==0:print(node,count,'probes complete',flush=True)
  p.wait(timeout=30)
  if p.returncode:raise RuntimeError(node+': '+p.stderr.read().decode()[:400])
 print(node,'finished',count,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(run,a.nodes.split(',')))
