"""Offline audit of r7 REAL transport evidence. No requests and no image edits."""
import json,hashlib,sys
from pathlib import Path
root=Path.cwd();out=Path(sys.argv[1]);s=json.loads((out/'summary.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def images(value):
 if isinstance(value,dict):
  if {'mime','sha256','bytes','file'}<=value.keys():yield value
  else:
   for v in value.values():yield from images(v)
 elif isinstance(value,list):
  for v in value:yield from images(v)
def user_text(c):
 return '\n'.join(str(p.get('text','')) for m in c['request'].get('messages',[]) if m.get('role')=='user' for p in (m['content'] if isinstance(m.get('content'),list) else [{'text':m.get('content','')}]))
def contains_source(c, source):
 # Prompts can have prose before a JSON document; compare the complete JSON
 # string encoding, not just a substring such as '<svg' or a source filename.
 t=user_text(c)
 return source in t or json.dumps(source,ensure_ascii=False)[1:-1] in t
report={'realProvider':True,'infrastructure':'real browser + Gateway/Core + parsers/renderers; fixture auth/in-memory DB/storage','version':json.loads((root/'docs/material-reader-20261012/integration-20261012/source-r7.json').read_text())['fingerprint'],'httpSuccessAloneIsNotAcceptance':True,'calls':len(s['calls']),'models':{},'runs':[],'allRequestImageFilesVerified':True,'browserErrors':s['browserErrors']}
for c in s['calls']:
 report['models'][c['model']]=report['models'].get(c['model'],0)+1
 for im in images(c['request']):assert sha(out/im['file'])==im['sha256']
 if c['kind']=='review' and c.get('httpStatus')==200:
  context=json.loads(user_text(c));ims=list(images(c['request']));comparison=context.get('originalMaterialComparison')
  assert comparison and comparison['sourcePages'], 'final reviewer must see original page pixels'
  for source in comparison['sourcePages']:assert ims[source['inputIndex']-1]['sha256']==source['submittedImageHash']
base=None
for run in s['runs']:
 if not run.get('jobId') or not run.get('status'):continue
 j=json.loads((out/(run['name']+'-job.json')).read_text());calls=[c for c in s['calls'] if c['scenario']==run['name']];files=j['materialFiles'];browser=json.loads((out/(run['name']+'-browser.json')).read_text())
 for f in files:
  original=next(b for b in browser if b['id']==f['clientFileId']);assert original['sha256']==f['sha256'] and original['bytes']==f['size']
 if base is None:base={f['filename']:f for f in files}
 for f in files:
  if f['filename'] in base:
   old=base[f['filename']];assert (f['clientFileId'],f['sha256'])==(old['clientFileId'],old['sha256']);assert run is s['runs'][0] or old['id']!=f['id']
 assert j['materialCleanup']['status']=='cleared'
 assert all(c['chunks']==0 and c['cleared'] for c in run['materialReplayCaches'])
 read_pages={}
 for record in j['materialReads']:
  if record['type']=='model_received':
   for im in record.get('pageImages',[]):
    name=next(f['filename'] for f in files if f['id']==im['materialId']);key=(name,im.get('page'),im['sha256']);read_pages[key]=True
 current=run.get('review') or {};result=(j.get('resultImages') or [None])[0]
 if result:
  artifact=run['artifacts'][0];assert sha(out/artifact['filename'])==artifact['sha256']
  if result['mimeType']=='image/png':assert artifact['sha256']==current['deliveredPngHash']
  else:assert artifact['sha256']==current['deliveredSvgHash']
  if current.get('reviewedVersion') is not None:assert current['reviewedVersion']==current['deliveredVersion']
 item={'scenario':run['name'],'jobId':j['id'],'status':j['status'],'reviewStatus':current.get('status'),'deliveredVersion':current.get('deliveredVersion'),'reviewedVersion':current.get('reviewedVersion'),'callNumbers':[c['number'] for c in calls],'models':sorted(set(c['model'] for c in calls)),'files':files,'deliveredOriginalPageImages':[{'filename':n,'page':p,'sha256':h} for n,p,h in read_pages],'coverage':[{'phase':r['phase'],'coverage':r.get('coverage'),'limitations':r.get('limitations')} for r in j['materialReads'] if r['type']=='completion'],'cleanup':j['materialCleanup'],'materialReplayCaches':run['materialReplayCaches'],'artifacts':run['artifacts']}
 if run['scenario']=='refine-png':
  image_call=next(c for c in calls if c['kind']=='image');assert j.get('editInstruction') is None or j['editInstruction'] in json.dumps(image_call['request'],ensure_ascii=False)
  # Submission is authoritative even when the public job omits editInstruction.
  instruction=run['submission']['editInstruction'];assert instruction in json.dumps(image_call['request'],ensure_ascii=False)
  review_call=next(c for c in calls if c['kind']=='review');context=json.loads(user_text(review_call));ims=list(images(review_call['request']));assert len(ims)>=2;assert ims[0]['sha256']==context['submittedImageHash'];assert ims[1]['sha256']==context['sourceImageHash'];assert context['modificationGoal']==instruction
  item['refineEvidence']={'sourceObjectKey':run['submission'].get('sourceImageObjectKey'),'originalInstructionOnImageRequest':True,'imageCall':image_call['number'],'reviewCall':review_call['number'],'reviewImageOrder':context['imageOrder'],'submittedImageHash':context['submittedImageHash'],'sourceImageHash':context['sourceImageHash']}
 if j['outputFormat']=='svg':
  assert not any(c['kind']=='image' for c in calls)
  for c in calls:
   if c['kind']=='review':assert '<svg' in user_text(c) and len(list(images(c['request'])))>0
  if result:
   final_source=(out/run['artifacts'][0]['filename']).read_text()
   final_review=[c for c in calls if c['kind']=='review'][-1]
   assert contains_source(final_review,final_source), 'review must receive complete delivered SVG'
 if run['scenario']=='edit-svg':
  prior=next(r for r in s['runs'] if r['name']=='restored-svg-1')
  source_path=out/prior['artifacts'][0]['filename'];source=source_path.read_text()
  source_file=next(f for f in files if f['filename']=='待修改的SVG源码.txt')
  assert source_file['sha256']==sha(source_path)
  for kind in ('plan','svg'):
   assert any(c['kind']==kind and contains_source(c,source) for c in calls), 'exact original code must reach planner and SVG generator'
  item['svgEditEvidence']={'previousJobId':prior['jobId'],'previousDeliveredVersion':prior['review']['deliveredVersion'],'sourceMaterialId':source_file['id'],'sourceSha256':sha(source_path),'fullSourceBytes':source_path.stat().st_size,'fullSourceReceivedByCalls':[c['number'] for c in calls if contains_source(c,source)],'drawnBy':'main-model-source-output','imageModelCalls':0}
 report['runs'].append(item)
report['usageByModel']={model:{'requests':sum(c['model']==model for c in s['calls']), 'reportedUsageTotals':{key:sum((c.get('usage') or {}).get(key,0) for c in s['calls'] if c['model']==model) for key in sorted({key for c in s['calls'] if c['model']==model for key,value in (c.get('usage') or {}).items() if isinstance(value,int)})}} for model in report['models']}
manifest=json.loads((root/'docs/material-reader-20261012/integration-20261012/source-r7.json').read_text());report['changedRuntimeFilesSinceFreeze']=[n for n,h in manifest['files'].items() if sha(root/n)!=h];assert not report['changedRuntimeFilesSinceFreeze']
(out/'integration-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='runs'},ensure_ascii=False));print([(r['scenario'],r['status'],r['reviewStatus'],r['callNumbers']) for r in report['runs']])
