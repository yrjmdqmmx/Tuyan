"""Build exact model-page facts from a locally fetched official-source manifest.
Usage: python3 scripts/refresh-provider-model-details.py /path/to/sources
No model-name/family guessing. Missing fields are not filled from neighboring models.
"""
import hashlib,json,pathlib,re,sys
root=pathlib.Path(__file__).resolve().parents[1]
base=pathlib.Path(sys.argv[1]);manifest=json.loads((base/'detail-manifest.json').read_text())
target=root/'packages/api/src/provider-model-details.ts'
models={};evidence=[]
def unique(xs):return list(dict.fromkeys(xs))
def walk(node):
 if isinstance(node,dict):
  yield node
  for v in node.values():yield from walk(v)
 elif isinstance(node,list):
  for v in node:yield from walk(v)
for item in manifest:
 if 'file' not in item:continue
 url=item['url'];raw=(base/item['file']).read_text();facts={'version':1,'checkedAt':'2026-10-16','sourceUrls':[url.removesuffix('.md')]};ids=[];provider=''
 if url.startswith('https://developers.openai.com/api/docs/models/'):
  provider='openai';mid=re.search(r'Model ID: `([^`]+)`',raw)
  if not mid:continue
  ids=[mid[1]]
  snap=raw.split('## Snapshots',1)
  if len(snap)>1:ids+=re.findall(r'^- `([^`]+)`',snap[1].split('\n## ',1)[0],re.M)
  for source,key in [('Input','officialInputModalities'),('Output','officialOutputModalities')]:
   m=re.search(r'^- '+source+r' modalities: (.+)$',raw,re.M)
   if m:facts[key]=[x.strip() for x in m[1].split(',') if x.strip() in ['text','image','audio','video']]
  ctx=re.search(r'^- ([\d,]+) context window',raw,re.M)
  if ctx:facts['contextWindowTokens']=int(ctx[1].replace(',',''))
  else:facts['contextWindowStatus']='not-published'
  facts['modelId']=mid[1];row={'label':raw.splitlines()[0].removeprefix('# '),'specifications':facts}
 elif url.startswith('https://runware.ai/docs/models/') and url.endswith('/schema.json'):
  provider='runware';data=json.loads(raw);info=data['info'];slug=info.get('x-model-id') or url.split('/')[-2];caps=info.get('x-capabilities',[]);request=data.get('components',{}).get('schemas',{}).get('RequestBody',{})
  ids=unique([slug]+[n['properties']['model']['const'] for n in walk(request) if isinstance(n.get('properties',{}).get('model'),dict) and isinstance(n['properties']['model'].get('const'),str) and n['properties']['model']['const']!='auto'])
  inputs=unique([x.split('-to-')[0] for x in caps if re.fullmatch('(text|image|audio|video)-to-(text|image|audio|video)',x)])
  outputs=unique([x.split('-to-')[1] for x in caps if re.fullmatch('(text|image|audio|video)-to-(text|image|audio|video)',x)])
  if any(any(k in n.get('properties',{}) for k in ['prompt','positivePrompt','messages']) for n in walk(request)):inputs=unique(['text']+inputs)
  if inputs:facts['officialInputModalities']=inputs
  if outputs:facts['officialOutputModalities']=outputs
  text=info.get('summary','')+' '+info.get('description','')
  limits=set()
  for value,unit in re.findall(r'(\d[\d,]*(?:\.\d+)?)\s*(million|[kKmM])?(?:[ -]+tokens?)?(?:\s+of)?\s+context(?:\s+window)?',text,re.I):
   limits.add(int(float(value.replace(',',''))*({'k':1000,'m':1000000,'million':1000000}.get(unit.lower(),1))))
  if len(limits)==1:facts['contextWindowTokens']=limits.pop()
  elif not limits and outputs==['image']:facts['contextWindowStatus']='not-published'
  # Schema descriptions only; no max prompt characters -> tokens conversion.
  prompts=[n['properties'][k] for n in walk(request) for k in ['positivePrompt','prompt'] if isinstance(n.get('properties',{}).get(k),dict)]
  maximums={n['maxLength'] for n in prompts if isinstance(n.get('maxLength'),int) and n['maxLength']>0}
  if len(maximums)==1 and all(isinstance(n.get('maxLength'),int) for n in prompts):
   maximum=maximums.pop();kinds=[]
   if 'text-to-image' in caps:kinds.append('generation')
   if 'image-to-image' in caps:kinds.append('editing')
   if kinds:facts['promptLimits']=[{'kind':kind,'max':maximum,'unit':'characters','field':'positivePrompt','sourceUrls':[url]} for kind in kinds]
  row={'label':info.get('title','').removeprefix('Runware API - '),'vendor':info.get('x-creator',{}).get('name','Runware'),'vendorId':info.get('x-creator',{}).get('id','runware'),'specifications':facts}
  if len(ids)==2:row['apiIdentifier']=ids[1]
 else:continue
 for mid in unique(ids):models[provider+'/'+mid]=row
 evidence.append({'provider':provider,'ids':unique(ids),'source':url,'file':item['file'],'sha256':hashlib.sha256(raw.encode()).hexdigest()})
extra=root/'config/channel-audit/specific-model-page-overrides.json'
if extra.exists():
 for item in json.loads(extra.read_text()):
  for key in item['keys']:models[key]={'specifications':{'version':1,'checkedAt':'2026-10-16',**item['specifications']}}
  evidence.append({'provider':'exact-route-mapping','ids':item['keys'],'source':item['specifications']['sourceUrls'][0],'note':item.get('note','')})
prompt_overrides=root/'config/channel-audit/image-prompt-limits.json'
if prompt_overrides.exists():
 for item in json.loads(prompt_overrides.read_text()):
  for key in item['keys']:
   if key not in models:raise ValueError('Prompt limits require an existing exact model page: '+key)
   models[key]['specifications']['promptLimits']=item['promptLimits']
  evidence.append({'provider':'exact-prompt-limits','ids':item['keys'],'sources':unique([u for limit in item['promptLimits'] for u in limit['sourceUrls']]),'note':item.get('note','')})
followup=root/'config/channel-audit/model-page-followup-20261016.json'
if followup.exists():
 seen=set()
 for item in json.loads(followup.read_text()):
  facts={'version':1,'checkedAt':'2026-10-16',**item['specifications']}
  if not facts.get('sourceUrls') or any(not u.startswith('https://') for u in facts['sourceUrls']):raise ValueError('Specific model sources are required')
  for field in ['officialInputModalities','officialOutputModalities']:
   if field in facts and (not facts[field] or set(facts[field])-{'text','image','audio','video','file','document'}):raise ValueError('Invalid modalities')
  for limit in facts.get('promptLimits',[]):
   if limit['unit'] not in ['tokens','characters','bytes'] or not isinstance(limit['max'],int) or limit['max']<=0:raise ValueError('Invalid prompt limit')
  for key in item['keys']:
   if key in seen:raise ValueError('Duplicate exact route '+key)
   seen.add(key)
   # A reviewed profile replaces the old profile; never union incompatible channel/native facts.
   models[key]={**models.get(key,{}),'specifications':facts}
  evidence.append({'provider':'specific-page-followup','ids':item['keys'],'sources':facts['sourceUrls'],'note':item.get('note',''),'evidence':item.get('evidence',[])})
header='// Generated by scripts/refresh-provider-model-details.py from individual official model pages.\nconst details: { checkedAt: string; models: Record<string, any> } = '
target.write_text(header+json.dumps({'checkedAt':'2026-10-16','models':models},ensure_ascii=False,indent=2)+'\nexport default details\n')
(root/'docs/model-catalog/2026-10-16-specific-page-sources.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'pages':len(evidence),'exactKeys':len(models)}))
