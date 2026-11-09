from pathlib import Path
import sys,json,base64
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'apps/plot-worker'))
from render_worker import run_render
OUT=ROOT/'docs/infographic-v400/evidence/plots'
if __name__=='__main__':
 results=[]
 for kind in json.loads((OUT/'index.json').read_text()):
  r=run_render((OUT/(kind+'.py')).read_text())
  ok=bool(r.get('ok') and r.get('image_base64'))
  results.append({'typeId':kind,'passed':ok,'error':r.get('error','')})
  if ok:(OUT/(kind+'-worker.png')).write_bytes(base64.b64decode(r['image_base64']))
  print(json.dumps(results[-1]),flush=True)
 (OUT/'worker-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))

 if not all(r["passed"] for r in results): sys.exit(1)
