"""Exercise the actual spawned worker and vector-output contract for all specialists."""
from pathlib import Path
import sys,json,base64,hashlib,time
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'apps/plot-worker'))
from render_worker import run_render
OUT=ROOT/'docs/infographic-v400/completion/evidence/candidates'
if __name__=='__main__':
 results=[]
 for name in [x['typeId'] for x in json.loads((OUT/'results.json').read_text())['results']]:
  start=time.monotonic();r=run_render((OUT/(name+'.py')).read_text(),vector_output=True)
  ok=bool(r.get('ok') and r.get('image_base64') and r.get('svg_base64'))
  validation=r.get('render_validation',{})
  if ok:
   png=base64.b64decode(r['image_base64']);svg=base64.b64decode(r['svg_base64']);ok=(b'<image' not in svg and validation.get('numeric',{}).get('typeId')==name and len(validation.get('numeric',{}).get('checks',{}))>1 and validation.get('pngHash')==hashlib.sha256(png).hexdigest() and validation.get('svgHash')==hashlib.sha256(svg).hexdigest())
   (OUT/(name+'-worker.png')).write_bytes(png);(OUT/(name+'-worker.svg')).write_bytes(svg)
   (OUT/(name+'-worker.validation.json')).write_text(json.dumps(validation,ensure_ascii=False,indent=2))
  entry={'typeId':name,'passed':ok,'error':r.get('error',''),'elapsedSeconds':round(time.monotonic()-start,3),'validationKeys':list(validation)}
  results.append(entry);print(json.dumps(entry),flush=True)
 (OUT/'worker-results.json').write_text(json.dumps({'total':len(results),'passed':sum(r['passed'] for r in results),'results':results},ensure_ascii=False,indent=2))
 if not all(r['passed'] for r in results):sys.exit(1)
