"""Import a saved public Runware directory/schema snapshot. No network or inference.
Usage: python3 scripts/import-runware-audit.py /path/to/snapshot
Run sync-model-catalog.mjs after reviewing the resulting per-SKU contracts.
"""
import sys,json,pathlib,re,hashlib,math
root=pathlib.Path(__file__).resolve().parents[1];src=pathlib.Path(sys.argv[1])
load=lambda p:json.loads(p.read_text())
def save(p,o):p.write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n')
cat=load(root/'config/model-catalog-updates.json');sizes=load(root/'config/image-size-contracts.json');wires=load(root/'config/image-channel-routes.json')
old={x['id']:x for x in cat['providers']['runware']}
baseline={'alibaba:qwen-image@2512','alibaba:qwen-image-edit@2511','google:gemini@3.1-flash-lite'}
contracts={};rows=[];controls={}
# Dedicated operations requiring a different user intent or multiple output artifacts.
exclude={
 'recraft-v4-styles':'仅从参考图片提取风格再生图，不保证保持待精修原图；需要独立风格生图输入契约，当前不作为原图精修显示。',
 'recraft-v4-styles-pro':'仅从参考图片提取风格再生图，不保证保持待精修原图；需要独立风格生图输入契约，当前不作为原图精修显示。',
 'alibaba-qwen-image-layered':'像素图层分解；需要多图层资产返回和编辑工作流，不能作为单张精修结果丢弃其余图层。',
 'ideogram-layerize-text':'文字图层分解工具；需要保留多层结果，不是通用指令精修。',
 'bfl-flux-virtual-try-on':'服装试穿专用，原图与服饰角色不等于科研精修原图与辅助参考。',
 'prunaai-p-image-try-on':'服装试穿专用，超出科研图工作流。',
 'bfl-flux-outpainting':'扩边专用；需要明确四边扩展像素的独立画布操作，当前尺寸/比例选项不能代替。',
 'bfl-flux-1-expand-pro':'扩边专用；需要明确四边扩展像素的独立画布操作。',
 'ideogram-3-0-reframe':'画布重构专用，无自然语言修改入口；不得忽略用户精修指令。',
 'openai-clip-vit-l-14':'详情描述为对比编码/相似度，caption schema 却描述生成文字；语义冲突待确认，不能作为通用问答识图。',
 'bria-fibo-edit-tools':'专用操作集合需要 operation 及操作各自参数；暂未接入操作选择表单，保留为待补齐能力。',
 'bfl-flux-erase':'仅擦除指定区域，无提示词字段；需要独立擦除操作，不能静默忽略自然语言。',
 'ideogram-object-remover':'仅物体移除，无提示词字段；需要独立擦除操作。',
 'object-eraser':'专用擦除工具；提示词不能表达一般对象替换，需独立擦除操作。',
}
def strip(o):
 if isinstance(o,list):return [strip(x) for x in o]
 if not isinstance(o,dict):return o
 return {k:strip(v) for k,v in o.items() if k not in ['title','description','default','$id','examples']}
def pairs(s):
 out=[]
 def walk(v):
  if isinstance(v,dict):
   p=v.get('properties',{});w=p.get('width',{}).get('const');h=p.get('height',{}).get('const');title=v.get('title','')
   if w and h and re.match(r'(?:[0-9.]+K|\d+p) \(',title):out.append((title,w,h))
   for x in v.values():walk(x)
  elif isinstance(v,list):
   for x in v:walk(x)
 walk(s);return out
for item in load(src/'runware-index.json'):
 slug=item['model'];url='https://runware.ai/docs/models/'+slug;file=src/'schemas'/(slug+'.json')
 row={'channel':'runware','directoryId':slug,'apiModelId':item.get('air'),'name':item['title'],'source':url,'checkedAt':'2026-09-22','before':'尚未登记','after':'尚未登记','decision':'','roles':[]}
 rows.append(row)
 if not file.exists():row['decision']='官方 schema 读取失败，准确请求契约待确认。';continue
 doc=load(file);info=doc['info'];schema=doc['components']['schemas']['RequestBody']['items'];p=schema['properties'];model=p['model']['const'];task=p['taskType']['const'];caps=info.get('x-capabilities',[]);ip=p.get('inputs',{}).get('properties',{});required=schema.get('required',[])
 row.update(apiModelId=model,schemaSource=url+'/schema.json',schemaSha256=hashlib.sha256(file.read_bytes()).hexdigest(),officialCapabilities=caps,officialStatus=info.get('x-status'),deactivatesAt=info.get('x-deactivates-at'),replacement=info.get('x-replaced-by'),releasedAt=info.get('x-released-at'),developer=info.get('x-creator',{}).get('name'),price=info.get('x-pricing',{}),before='适配链路已完成但真实调用未验证' if model in baseline else '尚未登记')
 if slug in exclude:
  row['decision']=exclude[slug]
  if model not in baseline:old.pop(model,None);sizes['routes'].pop('runware/'+model,None);wires.pop('runware/'+model,None)
  continue
 if task not in ['imageInference','textInference','caption']:
  row['decision']='超出当前文本规划/图文理解/单张位图生成精修：'+task+'（'+','.join(caps)+'）。';continue
 if task=='caption' and 'prompt' not in p:row['decision']='年龄检测专用，不是科研图问答识图。';continue
 if task=='imageInference' and 'positivePrompt' not in p:row['decision']='固定摄影滤镜，无提示词字段；不能兑现科研修改指令。';continue
 sourceField=next((k for k in ['referenceImages','seedImage','image'] if k in ip),None)
 maskField=next((k for k in ['maskImage','mask'] if k in ip),None)
 gen=task=='imageInference' and 'text-to-image'in caps and 'inputs'not in required
 edit=task=='imageInference' and bool(sourceField)
 # Style references guide generation, not preservation of an original research figure.
 styleOnly=task=='imageInference' and ('style reference' in ip.get(sourceField,{}).get('description','').lower()) and not 'edit'in caps
 if styleOnly:edit=False
 c={'source':url,'schemaSource':url+'/schema.json','schemaSha256':row['schemaSha256'],'taskType':task,'schema':strip(schema),'price':{'source':url,'checkedAt':'2026-09-22','currency':'USD','amount':None,'accountTariffConfirmed':False,'quote':info.get('x-pricing',{})}}
 roles=['main']+(['vision'] if 'images'in ip else []) if task=='textInference' else ['vision'] if task=='caption' else ['image']
 if task=='textInference':c.update(maxImages=min(3,ip.get('images',{}).get('maxItems',3)) if 'images'in ip else 0,maxTokens=min(8192,p.get('settings',{}).get('properties',{}).get('maxTokens',{}).get('maximum',8192)),systemInSettings='systemPrompt'in p.get('settings',{}).get('properties',{}))
 if task=='caption':c.update(maxImages=1,minImages=1)
 if task=='imageInference':
  if not gen and not edit:row['decision']='仅支持特定风格参考模式，当前科研原图精修语义不适用。';continue
  maximgs=ip.get(sourceField,{}).get('maxItems',1) if sourceField=='referenceImages' else 1
  minimgs=ip.get(sourceField,{}).get('minItems',1) if sourceField=='referenceImages' else 1
  # Preserve explicit seed+reference distinction for Luma: source is seed, auxiliaries are referenceImages.
  if 'seedImage'in ip and 'referenceImages'in ip:
   sourceField='seedImage';maximgs=1+ip['referenceImages'].get('maxItems',1);c['auxiliaryField']='referenceImages'
  maskOk=bool(maskField) and 'white' in ip[maskField].get('description','').lower() and 'black'in ip[maskField].get('description','').lower()
  modes=info.get('x-modes',[])
  maskRefs=maskOk and any(maskField in m.get('inputs',[]) and 'referenceImages'in m.get('inputs',[]) for m in modes)
  c.update(sourceField=sourceField,maskField=maskField if maskOk else None,maxImages=maximgs,minImages=minimgs,maskRequired=maskField in p.get('inputs',{}).get('required',[]),generation=gen,editing=edit)
  fixed=pairs(schema)
  if fixed:
   tiers={}
   for title,w,h in fixed:
    tier,ratio=re.match(r'([0-9.]+K|\d+p) \(([^)]+)\)',title).groups();tier={'0.5K':'512','720p':'1K','1080p':'2K'}.get(tier,tier);ratio=ratio.lstrip('~')
    tiers.setdefault(tier,{'sizes':{}})['sizes'].setdefault(ratio,f'{w}x{h}')
   profile={'mode':'table','tiers':tiers,'auto':'square'}
  elif 'width' in p:
   wp=p['width'];hp=p['height'];area=next((x for x in schema.get('x-constraints',[])if x['operation']=='area' and x['parameters']==['width','height']),{});ratio=next((x for x in schema.get('x-constraints',[])if x['operation']=='ratio' and x['parameters']==['width','height']),{})
   minside=max(wp.get('minimum',128),hp.get('minimum',128));maxside=min(wp.get('maximum',4096),hp.get('maximum',4096));maxarea=area.get('maximum',maxside**2);minarea=area.get('minimum',minside**2)
   tiers={k:{'targetPixels':v*v} for k,v in [('512',512),('1K',1024),('1.5K',1536),('2K',2048),('3K',3072),('4K',4096)] if minarea<=v*v<=maxarea and v<=maxside and v>=minside}
   if not tiers:tiers={'1.5K':{'targetPixels':minarea}}
   profile={'mode':'pixels','tiers':tiers,'minSide':minside,'maxSide':maxside,'minPixels':minarea,'maxPixels':maxarea,'maxRatio':min(ratio.get('maximum',16),1/ratio.get('minimum',1/16)),'alignment':math.lcm(wp.get('multipleOf',1),hp.get('multipleOf',1)),'auto':'square'}
  else:profile={'mode':'inherit','tiers':{'auto':{}},'auto':'omit'}
  if not fixed and 'width'in p and 'width'not in required and edit:profile['tiers']['auto']={};profile['auto']='square' # explicit square, no undocumented inheritance claim
  key='runware/'+model;profilekey='runware:'+slug;sizes['profiles'][profilekey]=profile
  sizes['routes'][key]={'generation':profilekey if gen else None,'editing':profilekey if edit else None,'reviewedAt':'2026-09-22','sources':[url,url+'/schema.json'],'notes':'逐型号 schema；保守子集，未静默裁图。预设以实际像素为准；720p/1080p 在清晰度栏分别归入1K/2K。'}
  wires[key]={op:{'endpoint':'/v1','sizeMode':'none' if profile['mode']=='inherit' else 'dimensions','maxPromptLength':p['positivePrompt'].get('maxLength',200000)} for op,b in [('generation',gen),('editing',edit)] if b}
  if edit:controls[key]={'version':1,'maxImages':maximgs,'minImages':minimgs,'sourceCounts':True,'mask':maskOk,'maskRequired':c['maskRequired'],'maskWithReferences':maskRefs,'structured':None,'singleImageInheritsSize':profile['mode']=='inherit','autoAspectRatio':'1:1' if profile['mode']!='inherit' else None,'checkedAt':'2026-09-22','source':url}
 if info.get('x-deactivates-at'):
  c['expiresAt']=info['x-deactivates-at']
  cat['lifecycle'].setdefault('runware',{})[model]={'expirationDate':c['expiresAt'][:10],'expirationAt':c['expiresAt'],'lifecycle':'legacy','lifecycleSourceUrl':url}
 c['roles']=roles;contracts['runware/'+model]=c;row.update(roles=roles,after='待自动化验证',decision='补齐型号专用调用、选择器与恢复。'+('仅生图；官方参考图仅作风格引导，不冒充保留原图的精修。' if styleOnly else ''),limitations='可选高级参数未全部开放；本轮不调用真实服务。')
 features={'referenceImages':bool(c.get('maxImages',0)) if task!='imageInference' else edit,'maxReferenceImages':c.get('maxImages',0)}
 if task=='imageInference':features.update(imageGeneration=gen,imageEditing=edit,imageEditMode='direct-edit' if edit else 'none',outputFormats=['png'])
 vendor=info.get('x-creator',{}).get('id','unknown')
 modelrow={'id':model,'label':item['title'],'roles':roles,'protocol':'provider-images' if task=='imageInference' else 'runware-text','availabilityNotes':'逐型号适配；真实权限/推理/费用未验证。'+('该型号只提供风格参考生图，未开放保留原图精修。' if styleOnly else ''),'capabilities':features,'metadata':{'vendor':vendor,'verified':False,'verificationState':'catalog','lifecycle':'preview' if 'preview'in (info.get('summary','')+' '+info.get('description','')).lower() else 'stable','officialSourceUrl':url,'inputModalities':['text']+(['image'] if edit or 'vision'in roles else []),'outputModalities':['image' if task=='imageInference' else 'text'],'regions':['global-endpoint'],'releasedAt':info.get('x-released-at','')[:10]}}
 old[model]=modelrow
# Operation-specific constraints: the same SKU can have different generation/edit sizes.
for key,c in contracts.items():
 if key=='runware/bria:11@1':
  c.update(sourceField='image',maxImages=1);c.pop('auxiliaryField',None)
  controls[key]['maxImages']=1;old['bria:11@1']['capabilities']['maxReferenceImages']=1
 if key=='runware/alibaba:wan@2.7-image-pro':
  base=sizes['profiles'][sizes['routes'][key]['editing']]
  edit=json.loads(json.dumps(base));edit['maxSide']=2048;edit['maxPixels']=2048**2
  edit['tiers']={k:v for k,v in edit['tiers'].items() if k not in ['3K','4K']}
  sizes['profiles']['runware:wan27pro-edit']=edit;sizes['routes'][key]['editing']='runware:wan27pro-edit'
 if key=='runware/imagineart:2.0@0':
  base=sizes['profiles'][sizes['routes'][key]['generation']]
  gen=json.loads(json.dumps(base));gen['tiers']={k:v for k,v in gen['tiers'].items()if k!='1.5K'}
  edit={'mode':'table','auto':'square','tiers':{'1.5K':base['tiers']['1.5K']}}
  sizes['profiles']['runware:imagineart20-gen']=gen;sizes['profiles']['runware:imagineart20-edit']=edit
  sizes['routes'][key].update(generation='runware:imagineart20-gen',editing='runware:imagineart20-edit')
cat['providers']['runware']=list(old.values());cat['version']='2026-09-22.v23'
save(root/'config/model-catalog-updates.json',cat);save(root/'config/image-size-contracts.json',sizes);save(root/'config/image-channel-routes.json',wires)
save(root/'config/channel-audit/runware-contracts.json',contracts);save(root/'config/channel-audit/runware-directory.json',rows);save(root/'config/channel-audit/runware-refine-controls.json',controls)
print('Runware rows',len(rows),'adapted',len(contracts),'roles', {r:sum(r in c['roles']for c in contracts.values()) for r in ['main','vision','image']})
