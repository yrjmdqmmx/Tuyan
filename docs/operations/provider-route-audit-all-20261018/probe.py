"""Bounded, credential-free GETs only; no POST, inference, redirects or retries."""
import argparse,concurrent.futures,datetime,json,random,subprocess,tempfile,time
MANIFEST = __MANIFEST__
p=argparse.ArgumentParser();p.add_argument('--node',required=True);p.add_argument('--rounds',type=int,default=5);p.add_argument('--proxy',default='');p.add_argument('--ids',default='');p.add_argument('--socks',default='');a=p.parse_args()
rows=[r for r in MANIFEST if not a.ids or r['id'] in a.ids.split(',')]
if a.proxy:rows=[r for r in rows if r['current_route']=='singapore']
def probe(r,rnd):
 assert r['method']=='GET' and not r['credentials'] and not r['inference']
 started=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with tempfile.TemporaryDirectory(prefix='provider-netprobe-') as tmp:
  body=tmp+'/body'
  cmd=['curl','--silent','--show-error','--http1.1','--compressed','--request','GET','--retry','0','--connect-timeout','5','--max-time','12','--max-filesize','2097152','--output',body,'--write-out','%{json}','--header','Accept: application/json','--header','Connection: close']
  if a.proxy:cmd+=['--noproxy','','--proxy',a.proxy]
  elif a.socks:cmd+=['--noproxy','','--proxy','socks5h://'+a.socks]
  else:cmd+=['--noproxy','*','--proxy','']
  cmd.append(r['url'])
  try:
   out=subprocess.run(cmd,capture_output=True,text=True,timeout=15);raw=json.loads(out.stdout or '{}')
   code=out.returncode;error=out.stderr.strip()[:240]
  except subprocess.TimeoutExpired:raw={};code=124;error='subprocess timeout'
  except json.JSONDecodeError:raw={};code=125;error='curl metrics missing'
  safe={k:raw.get(k) for k in ['http_code','http_connect','remote_ip','remote_port','time_namelookup','time_connect','time_appconnect','time_starttransfer','time_total','size_download','ssl_verify_result','num_connects','content_type']}
  hints={}
  try:
   with open(body) as f: obj=json.load(f)
   if isinstance(obj,dict):
    err=obj.get('error',obj.get('message',obj.get('msg')))
    if err is not None:hints['api_error']=str(err)[:400]
    for k in ['code','status','statusCode']:
     if k in obj and isinstance(obj[k],(str,int)):hints[k]=obj[k]
    if isinstance(obj.get('base_resp'),dict):hints['base_resp']=obj['base_resp']
  except (OSError,ValueError):pass
  return dict(node=a.node,id=r['id'],provider=r['provider'],url=r['url'],round=rnd,started_at=started,curl_exit=code,curl_error=error,proxy=a.proxy or ('socks5h://'+a.socks if a.socks else None),**safe,**hints)
for rnd in range(1,a.rounds+1):
 order=rows.copy();random.Random(790+rnd).shuffle(order)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for result in pool.map(lambda r:probe(r,rnd),order):print(json.dumps(result,ensure_ascii=False),flush=True)
 time.sleep(.3)
