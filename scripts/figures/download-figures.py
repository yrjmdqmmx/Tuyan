"""Retain publisher originals, captions, and checksums. Approval is a separate review."""
from pathlib import Path
import json, subprocess, concurrent.futures, hashlib
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'docs/infographic-v400/evidence'
ASSETS=ROOT/'apps/paperbanana-api/assets/reference-library'
ASSETS.mkdir(parents=True,exist_ok=True)
SELECTION={
 'pbio.1002128':[1,2], 'pbio.2003779':[1,2], 'pcbi.1009809':[2,3,4],
 'pcbi.1011436':[1,3,4,5], 'pcbi.1013027':[1,3,4,5],
 'pcbi.1005857':[2,9,11], 'pcbi.1010086':[7,8,10],
 'pone.0242453':[3,5,7,11,14,15], 'pone.0281854':[2,3,4,5,6,7,8],
 'pone.0327607':[1,4,9], 'pcbi.1011461':[1], 'pdig.0000364':[1,3],
 'pgen.1011738':[9,10], 'pgen.1008646':[2,3,6],
 'pone.0332415':[2,3], 'pcbi.1008009':[2,3,4], 'pcbi.1012374':[1],
}
def download(task):
 key,number=task; paper=json.loads((BASE/'papers'/(key+'.json')).read_text())
 figure=next(f for f in paper['figures'] if f['id'].endswith(f'g{number:03}'))
 journal=paper['sourceUrl'].split('/')[3]; identifier=figure['id']
 result={'id':identifier,'paper':key,'figure':figure,'metadata':{k:v for k,v in paper.items() if k!='figures'},'assets':{}}
 for size in ['large','original']:
  url=f'https://journals.plos.org/{journal}/article/figure/image?size={size}&id=10.1371/journal.{identifier}'
  p=ASSETS/(identifier+('.png' if size=='large' else '.tif'))
  if not p.exists():
   proc=subprocess.run(['curl','--fail','--location','--silent','--show-error','--retry','3','--retry-all-errors','--max-time','40','--output',str(p),url],capture_output=True)
   if proc.returncode: p.unlink(missing_ok=True);raise RuntimeError(proc.stderr.decode()[:200])
  result['assets'][size]={'url':url,'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 (BASE/'figures').mkdir(exist_ok=True)
 (BASE/'figures'/(identifier+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2))
 return {'id':identifier,'bytes':sum(v['bytes'] for v in result['assets'].values())}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  futures={pool.submit(download,(key,n)):(key,n) for key,ns in SELECTION.items() for n in ns}
  for f in concurrent.futures.as_completed(futures):
   try: print(json.dumps(f.result()),flush=True)
   except Exception as e: print(json.dumps({'failed':futures[f],'reason':str(e)}),flush=True)
