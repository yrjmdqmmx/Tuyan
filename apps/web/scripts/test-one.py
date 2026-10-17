#!/usr/bin/env python3
import argparse, json, os, re, signal, subprocess, time
from pathlib import Path
p=argparse.ArgumentParser(description='Run one exact Web test with an external process-group budget (macOS/Linux).');p.add_argument('file');p.add_argument('name');p.add_argument('--output',required=True,help='Directory for bounded logs and resource metrics');p.add_argument('--label',default='single');args=p.parse_args()
root=Path(__file__).resolve().parents[1]
if not (root/args.file).is_file():p.error('Test file does not exist')
if not re.fullmatch(r'[a-zA-Z0-9_-]+',args.label):p.error('Use a simple log label')
out=Path(args.output).expanduser().resolve();out.mkdir(parents=True,exist_ok=True)
cmd=['node','--import','tsx','--import','./tests/dom-setup.mjs']
cmd+=['--test','--test-concurrency=1','--test-name-pattern=^'+re.escape(args.name)+'$',args.file]
env=dict(os.environ,NODE_OPTIONS='--max-old-space-size=384')
logpath=out/(args.label+'.log');started=time.monotonic();samples=[];reason=None
with logpath.open('wb') as log:
 proc=subprocess.Popen(cmd,cwd=root,stdout=log,stderr=log,env=env,start_new_session=True)
 try:
  while proc.poll() is None:
   rows=subprocess.check_output(['ps','-axo','pid=,pgid=,rss=,comm='],text=True,timeout=2)
   members=[]
   for line in rows.splitlines():
    col=line.split(None,3)
    if len(col)==4 and int(col[1])==proc.pid:members.append({'pid':int(col[0]),'rssKiB':int(col[2]),'command':col[3]})
   rss=sum(m['rssKiB'] for m in members);elapsed=time.monotonic()-started
   samples.append({'seconds':round(elapsed,3),'rssMiB':round(rss/1024,1),'members':members})
   if rss>600*1024:reason='RSS group limit 600 MiB'
   elif elapsed>10:reason='external wall timeout 10 seconds'
   elif logpath.stat().st_size>131072:reason='log size limit 128 KiB'
   if reason:break
   time.sleep(.05)
 except KeyboardInterrupt:
  reason='interrupted by operator'
 finally:
  # Also clean up children on interruption or monitoring failure, not just on timeout.
  try:os.killpg(proc.pid,signal.SIGKILL)
  except ProcessLookupError:pass
  proc.wait()
result={'test':args.name,'file':args.file,'exit':proc.returncode,'stopReason':reason,'seconds':round(time.monotonic()-started,2),'peakRssMiB':max((s['rssMiB'] for s in samples),default=0),'samples':samples}
(out/(args.label+'.metrics.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in result.items() if k!='samples'},ensure_ascii=False))

raise SystemExit(1 if reason else proc.returncode)
