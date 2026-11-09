import test from 'node:test'
import assert from 'node:assert/strict'
import { PROVIDER_CATALOGS, readProviderCatalog, normalizeCatalogModel, exactModelDetails, isCatalogRequestAllowed, verifyPublicCatalogOmissions, catalogAbsenceReason, type CatalogResult } from '../../../packages/api/src/provider-catalog.js'
test('all 32 channels have catalog contracts',()=>{assert.equal(Object.keys(PROVIDER_CATALOGS).length,32);for(const d of Object.values(PROVIDER_CATALOGS))assert.match(d.source,/^https:/)})

test('fal browse omissions require exact-ID lookup; failed, empty and resumed directories cannot retire models',async()=>{
 const catalog:CatalogResult={availabilityScope:'public-hosted',state:'ready',models:[{id:'fal-ai/visible'}],pages:1,sourceUrls:[PROVIDER_CATALOGS.fal.source],fetchedAt:new Date().toISOString(),message:''}
 const model={id:'fal-ai/missing',protocol:'provider-images'}
 assert.equal(catalogAbsenceReason('fal',model,catalog),undefined)
 const recovered=await verifyPublicCatalogOmissions('fal',catalog,[model.id],async(input,init)=>{
  assert.ok(isCatalogRequestAllowed(String(input),init));assert.equal(new URL(String(input)).searchParams.get('endpoint_id'),model.id)
  return Response.json({models:[{endpoint_id:model.id}],has_more:false})
 })
 assert.equal(recovered.models.length,2);assert.equal(catalogAbsenceReason('fal',model,recovered),undefined)
 const absent=await verifyPublicCatalogOmissions('fal',catalog,[model.id],async()=>Response.json({models:[],has_more:false}))
 assert.match(catalogAbsenceReason('fal',model,absent)!,/暂停选择与调用/)
 for(const status of [401,404,429,500]){
  const failed=await verifyPublicCatalogOmissions('fal',catalog,[model.id],async()=>new Response('',{status,headers:{'retry-after':'120'}}))
  assert.equal(failed.state,'partial');assert.equal(catalogAbsenceReason('fal',model,failed),undefined)
  if(status===429)assert.equal(failed.retryAfterSeconds,120)
 }
 for(const value of [{...absent,state:'partial' as const},{...absent,continuation:{cursor:'next'}},{...absent,models:[]}])assert.equal(catalogAbsenceReason('fal',model,value),undefined)
})

test('catalog availability respects scopes and exact aliases, not account or regional absence',()=>{
 const full:CatalogResult={availabilityScope:'public-hosted',state:'ready',models:[{id:'new',catalogAliases:['old-alias']}],pages:1,sourceUrls:[PROVIDER_CATALOGS.runware.source],fetchedAt:new Date().toISOString(),message:''}
 assert.equal(catalogAbsenceReason('runware',{id:'old-alias'},full),undefined)
 assert.ok(catalogAbsenceReason('runware',{id:'not-listed'},full))
 assert.equal(catalogAbsenceReason('runware',{id:'not-listed'},{...full,availabilityScope:undefined}),undefined)
 for(const provider of ['stability','openai','minimax','bailian','replicate','fireworks'])assert.equal(catalogAbsenceReason(provider,{id:'not-listed'},full),undefined)
 const llm={...full,availabilityScope:'public-llm' as const,sourceUrls:[PROVIDER_CATALOGS.novita.source]}
 assert.ok(catalogAbsenceReason('novita',{id:'missing',protocol:'openai-chat-completions'},llm))
 assert.equal(catalogAbsenceReason('novita',{id:'image',protocol:'provider-images'},llm),undefined)
 const retired=normalizeCatalogModel('openai',{id:'example',shutdown_date:'2026-10-01'},PROVIDER_CATALOGS.openai.url!)!
 assert.equal(retired.expirationDate,'2026-10-01');assert.equal(retired.lifecycleSourceUrl,PROVIDER_CATALOGS.openai.url)
 assert.equal(normalizeCatalogModel('together',{id:'example',shutdown_date:'2026-10-01'},PROVIDER_CATALOGS.together.url!)?.expirationDate,undefined)
})
test('fal follows all cursor pages and keeps edit variants',async()=>{
 const calls:string[]=[];const result=await readProviderCatalog('fal',{fetcher:async(input,init)=>{calls.push(String(input));assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');assert.equal(new Headers(init?.headers).has('Authorization'),false);return Response.json({models:[{endpoint_id:calls.length===1?'fal-ai/model':'fal-ai/model/edit',metadata:{category:'text-to-image'}}],has_more:calls.length===1,next_cursor:calls.length===1?'next':null})}})
 assert.equal(result.state,'ready');assert.equal(result.pages,2);assert.equal(result.models.length,2);assert.match(calls[1],/cursor=next/);assert.equal(result.models[1].specifications.modalitiesComplete,false)
})
test('account credentials and input limits stay scoped',async()=>{
 const keys:string[]=[]
 for(const key of ['first','second']){const result=await readProviderCatalog('anthropic',{apiKey:key,fetcher:async(_,init)=>{const h=new Headers(init?.headers);keys.push(h.get('x-api-key')!);assert.equal(h.get('anthropic-version'),'2023-06-01');assert.equal(h.has('Authorization'),false);return Response.json({data:[{id:key,max_input_tokens:900000,max_output_tokens:100000}],has_more:false})}});assert.equal(result.models[0].id,key);assert.equal(result.models[0].specifications.contextWindowTokens,undefined);assert.equal(result.models[0].specifications.maxInputTokens,900000)}
 assert.deepEqual(keys,['first','second'])
})
test('Replicate refuses cross-origin pagination',async()=>{let count=0;const result=await readProviderCatalog('replicate',{apiKey:'secret',fetcher:async()=>{count++;return Response.json({results:[{owner:'vendor',name:'model'}],next:'https://attacker.invalid/v1/models'})}});assert.equal(count,1);assert.equal(result.state,'partial');assert.equal(result.models.length,1)})
test('repeated cursors are partial and input/output never sum to context',async()=>{const r=await readProviderCatalog('gemini',{apiKey:'key',fetcher:async()=>Response.json({models:[{name:'models/test',inputTokenLimit:123,outputTokenLimit:99}],nextPageToken:'repeat'})});assert.equal(r.state,'partial');assert.equal(r.pages,2);assert.equal(r.models[0].specifications.contextWindowTokens,undefined);assert.equal(r.models[0].specifications.maxInputTokens,123)})
test('key and Beijing workspace required, pagination respects total',async()=>{
 let called=false;const fetcher=async()=>{called=true;return Response.json({data:[]})}
 assert.equal((await readProviderCatalog('openai',{fetcher})).state,'needs-key');assert.equal((await readProviderCatalog('bailian',{fetcher,apiKey:'key',workspaceId:'evil.test/path'})).state,'needs-configuration');assert.equal(called,false)
 const urls:string[]=[];const r=await readProviderCatalog('bailian',{apiKey:'key',workspaceId:'workspace-123',fetcher:async(input)=>{urls.push(String(input));return Response.json({output:{total:2,models:[{model:urls.length===1?'a':'b',inference_metadata:{context_length:262144}}]}})}})
 assert.equal(r.models.length,2);assert.match(urls[1],/workspace-123\.cn-beijing\.maas\.aliyuncs\.com\/api\/v1\/models\?page_no=2/)
})
test('Runware uses schema AIR ID instead of documentation slug',()=>{const m=normalizeCatalogModel('runware',{id:'meta-llava-1-6-mistral-7b',capabilities:['image-to-text']},PROVIDER_CATALOGS.runware.url!);assert.ok(m);assert.equal(m.id,'runware:150@2');assert.ok(m.specifications.sourceUrls.some((u:string)=>u.includes('meta-llava-1-6-mistral-7b/schema.json')))})
test('exact snapshots, no inferred pro variants, unpublished image context',()=>{assert.equal(exactModelDetails('openai','gpt-image-2.5-sunburst-2026-09-08').specifications.contextWindowStatus,'not-published');assert.deepEqual(exactModelDetails('openai','gpt-image-2.5-sunburst').specifications.officialOutputModalities,['image']);assert.equal(exactModelDetails('openai','gpt-6-astra-pro-unknown'),undefined)})
test('Novita live modality/context fields preserved',()=>{const m=normalizeCatalogModel('novita',{id:'vendor/model',input_modalities:['text','image','video'],output_modalities:['text'],context_size:1048576},PROVIDER_CATALOGS.novita.url!);assert.ok(m);assert.equal(m.specifications.contextWindowTokens,1048576);assert.deepEqual(m.inputModalities,['text','image','video'])})
test('closed transport accepts only metadata and read-only modelSearch',()=>{assert.equal(isCatalogRequestAllowed('https://api.openai.com/v1/chat/completions',{method:'POST'}),false);assert.equal(isCatalogRequestAllowed('https://api.runware.ai/v1',{method:'POST',body:JSON.stringify([{taskType:'imageInference'}])}),false);assert.equal(isCatalogRequestAllowed('https://api.runware.ai/v1',{method:'POST',body:JSON.stringify([{taskType:'modelSearch',taskUUID:'test',limit:100,offset:0}])}),true);assert.equal(isCatalogRequestAllowed('https://api.replicate.com/v1/models?cursor=abc'),true);assert.equal(isCatalogRequestAllowed('https://user:pass@api.openai.com/v1/models'),false)})

test('429 resumes failed page without repeating or dropping its prefix',async()=>{
 let calls=0
 const first=await readProviderCatalog('fal',{fetcher:async()=>++calls===1?Response.json({models:[{endpoint_id:'fal-ai/a'}],next_cursor:'second'}):new Response('',{status:429,headers:{'retry-after':'12'}})})
 assert.equal(first.state,'partial');assert.equal(first.retryAfterSeconds,12);assert.equal(first.continuation?.cursor,'second')
 const next=await readProviderCatalog('fal',{continuation:first.continuation,fetcher:async(input)=>{assert.equal(new URL(String(input)).searchParams.get('cursor'),'second');return Response.json({models:[{endpoint_id:'fal-ai/b'}],has_more:false})}})
 assert.equal(next.state,'ready');assert.equal(next.rawCount,2);assert.deepEqual([...first.models,...next.models].map(x=>x.id),['fal-ai/a','fal-ai/b'])
})
test('fal exact schema supplies text plus reference images, not character limits as context',()=>{
 const input={properties:{prompt:{type:'string',maxLength:50000},image_urls:{type:'array'}}},output={properties:{images:{type:'array'},request_id:{type:'string'}}}
 const schema={info:{'x-fal-metadata':{endpointId:'fal-ai/test/edit'}},paths:{'/fal-ai/test/edit':{post:{requestBody:{content:{'application/json':{schema:input}}}}},'/fal-ai/test/edit/requests/{request_id}':{get:{responses:{'200':{content:{'application/json':{schema:output}}}}}}}}
 const m=normalizeCatalogModel('fal',{endpoint_id:'fal-ai/test/edit',metadata:{category:'image-to-image'},openapi:schema},PROVIDER_CATALOGS.fal.url!)!
 assert.deepEqual(new Set(m.inputModalities),new Set(['text','image']));assert.deepEqual(m.outputModalities,['image']);assert.equal(m.specifications.contextWindowTokens,undefined)
})
test('Bailian reads documented modality and total-context fields',()=>{
 const m=normalizeCatalogModel('bailian',{model_id:'test',inference_metadata:{request_modality:['Text','Image','Video'],response_modality:['Text']},model_info:{context_window:1000000,max_input_tokens:991808,max_output_tokens:131072}},PROVIDER_CATALOGS.bailian.source)!
 assert.deepEqual(m.inputModalities,['text','image','video']);assert.equal(m.specifications.contextWindowTokens,1000000)
})
test('xAI enumerates all specialized directories and retains aliases',async()=>{
 const paths:string[]=[];const r=await readProviderCatalog('xai',{apiKey:'x',fetcher:async(input)=>{const path=new URL(String(input)).pathname;paths.push(path);const rows=[{id:path.endsWith('/models')?'chat':path.endsWith('language-models')?'chat':path,aliases:['pinned-alias'],...(path.endsWith('/models')?{context_length:256000}:{input_modalities:['text'],output_modalities:[path.endsWith('image-generation-models')?'image':path.endsWith('video-generation-models')?'video':'text']})}];return Response.json(path.endsWith('/models')?{data:rows}:{models:rows})}})
 assert.equal(r.state,'ready');assert.equal(paths.length,4);assert.equal(r.models.length,3);assert.equal(r.models.find(x=>x.id==='chat').specifications.contextWindowTokens,256000);assert.ok(r.models[0].catalogAliases.includes('pinned-alias'))
})
test('Ark requires management credentials and resumes from next unread phase',async()=>{
 const noKey=await readProviderCatalog('ark',{apiKey:'inference-key'});assert.equal(noKey.state,'needs-configuration')
 let calls=0;const credentials={accessKeyId:'AK',secretAccessKey:'SK'}
 const first=await readProviderCatalog('ark',{catalogCredentials:credentials,fetcher:async(input,init)=>{
  const u=new URL(String(input));assert.equal(isCatalogRequestAllowed(String(input),init),true);assert.match(new Headers(init?.headers).get('authorization')!,/^HMAC-SHA256 Credential=AK\//)
  if(++calls===1)return Response.json({Result:{Items:[{Name:'family',DisplayName:'Family'}],TotalCount:1}})
  assert.equal(u.searchParams.get('Action'),'ListFoundationModelVersions');throw new Error('timeout')
 }})
 assert.equal(first.state,'partial');assert.equal(first.pages,1);assert.equal(first.continuation?.ark?.phase,'versions');assert.doesNotMatch(JSON.stringify(first),/"SK"/)
 const actions:string[]=[];const next=await readProviderCatalog('ark',{catalogCredentials:credentials,continuation:first.continuation,fetcher:async(input)=>{const action=new URL(String(input)).searchParams.get('Action')!;actions.push(action);return Response.json({Result:{Items:action==='ListEndpoints'?[{Id:'ep-123'}]:[{FoundationModelName:'family',ModelVersion:'260101'}],TotalCount:1}})}})
 assert.equal(next.state,'ready');assert.deepEqual(actions,['ListFoundationModelVersions','ListEndpoints']);assert.deepEqual(next.models.map(x=>x.id),['family-260101','ep-123'])
})
test('specific Qwen pages distinguish text-only alias and multimodal dated snapshot',()=>{
 assert.deepEqual(exactModelDetails('bailian','qwen3.7-max').specifications.officialInputModalities,['text'])
 assert.deepEqual(exactModelDetails('bailian','qwen3.7-max-2026-06-08').specifications.officialInputModalities,['text','image','video'])
 assert.equal(exactModelDetails('bailian','qwen3.5-35b-a3b').specifications.contextWindowTokens,262144)
 assert.equal(exactModelDetails('openrouter','qwen/qwen3.8-max-prime'),undefined)
})

test('image-specific schema prompt maxLength stays characters and never becomes a context window',()=>{
 const id='fal-ai/exact-image/edit',source='https://api.fal.ai/v1/models'
 const inputSchema={properties:{prompt:{type:'string',maxLength:2000},image_url:{type:'string'}}}
 const row:any={endpoint_id:id,metadata:{category:'image-to-image'},openapi:{
  info:{'x-fal-metadata':{endpointId:id}},
  paths:{['/'+id]:{post:{requestBody:{content:{'application/json':{schema:{$ref:'#/components/schemas/Input'}}}}}}},
  components:{schemas:{Input:inputSchema}},
 }}
 const result=normalizeCatalogModel('fal',row,source)
 assert.ok(result)
 assert.equal(result.specifications.contextWindowTokens,undefined)
 assert.deepEqual(result.specifications.promptLimits,[{kind:'editing',max:2000,unit:'characters',field:'prompt',sourceUrls:['https://fal.ai/models/'+id+'/api']}])
 row.openapi.info['x-fal-metadata'].endpointId='fal-ai/other'
 assert.equal(normalizeCatalogModel('fal',row,source)?.specifications.promptLimits,undefined)
})

test('specific image pages retain independent generation and editing limits without changing adapters',()=>{
 const sun=exactModelDetails('openai','gpt-image-2.5-sunburst').specifications
 assert.equal(sun.contextWindowTokens,undefined);assert.equal(sun.promptLimits.length,2)
 assert.deepEqual(sun.promptLimits.map((x:any)=>[x.kind,x.max,x.unit]),[['generation',32000,'characters'],['editing',32000,'characters']])
 assert.equal(exactModelDetails('runware','alibaba:qwen-image@2.0').specifications.promptLimits[0].max,2000)
 assert.equal(exactModelDetails('openai','gpt-image-2.5-unknown'),undefined)
})

test('Novita image and private model directory preserves all types and uses its own paginated API IDs',async()=>{
 const calls:string[]=[]
 const noKey=await readProviderCatalog('novita',{privateModels:true});assert.equal(noKey.state,'needs-key')
 const result=await readProviderCatalog('novita',{privateModels:true,apiKey:'novita-only',fetcher:async(input,init)=>{
  const url=String(input);calls.push(url);assert.ok(isCatalogRequestAllowed(url,init));assert.equal(new Headers(init?.headers).get('authorization'),'Bearer novita-only');assert.equal(new URL(url).pathname,'/v3/model')
  return Response.json({models:[{id:calls.length,name:'Image asset',sd_name_in_api:calls.length===1?'checkpoint.safetensors':'lora-special',type:{name:calls.length===1?'checkpoint':'lora'},download_url:'https://private.invalid/signed'}],pagination:{next_cursor:calls.length===1?'next':' ' .trim()}})
 }})
 assert.equal(result.state,'ready');assert.deepEqual(result.models.map(row=>row.id),['checkpoint.safetensors','lora-special']);assert.match(calls[1],/pagination.cursor=next/)
 assert.doesNotMatch(JSON.stringify(result),/private.invalid|novita-only/);assert.equal(result.models[1].specifications.contextWindowTokens,undefined)
})

test('Fireworks account directory is validated and remains on its official origin',async()=>{
 const result=await readProviderCatalog('fireworks',{workspaceId:'my-account',apiKey:'key',fetcher:async(input,init)=>{assert.ok(isCatalogRequestAllowed(String(input),init));assert.equal(new URL(String(input)).pathname,'/v1/accounts/my-account/models');return Response.json({models:[{name:'accounts/my-account/models/tuned'}]})}})
 assert.equal(result.state,'ready');assert.equal(result.models[0].id,'accounts/my-account/models/tuned')
 assert.equal((await readProviderCatalog('fireworks',{workspaceId:'../elsewhere',apiKey:'key'})).state,'needs-configuration')
})

test('specific pages distinguish exact versions and metadata from generated text',()=>{
 const f=(provider:string,id:string)=>exactModelDetails(provider,id)?.specifications
 assert.deepEqual(f('anthropic','claude-opus-5-5').officialInputModalities,['text','image'])
 assert.equal(f('anthropic','claude-opus-5-5-unknown'),undefined)
 assert.deepEqual(f('siliconflow','Qwen/Qwen3-Omni-30B-A3B-Instruct').officialOutputModalities,['text','audio'])
 assert.deepEqual(f('novita','qwen/qwen3-omni-30b-a3b-thinking').officialOutputModalities,['text'])
 assert.equal(f('siliconflow','Qwen/Qwen3.8-27B').contextWindowTokens,262144)
 assert.equal(f('fireworks','accounts/fireworks/models/minimax-m3').contextWindowTokens,512000)
 assert.equal(f('bailian','qwen-image-2.0').promptLimits[0].unit,'tokens')
 assert.equal(f('bailian','qwen-image-2.0').promptLimits[0].max,1300)
 assert.equal(f('minimax','image-01').promptLimits[0].unit,'characters')
 assert.deepEqual(f('minimax','image-01-live').promptLimits.map((x:any)=>[x.kind,x.max,x.unit]),[['generation',1500,'characters'],['editing',1500,'characters']])
 assert.equal(f('bailian','wanx2.1-imageedit').promptLimits[0].max,800)
 assert.deepEqual(f('stability','stable-image-core').officialInputModalities,['text'])
 assert.deepEqual(f('stability','sd3.5-flash').promptLimits.map((x:any)=>[x.kind,x.max,x.unit]),[['generation',10000,'characters'],['editing',10000,'characters']])
 assert.equal(f('siliconflow','Qwen/Qwen3-Omni-30B-A3B-Instruct').contextWindowTokens,65536)
 assert.equal(f('deepseek','deepseek-v4-flash').resolvedModel.modelId,'deepseek-v4.1-flash-1017')
 assert.deepEqual(f('deepseek','deepseek-v4-flash').officialInputModalities,['text','image'])
 assert.equal(f('openrouter','deepseek/deepseek-v4-flash').resolvedModel,undefined)
 assert.deepEqual(f('openrouter','deepseek/deepseek-v4-flash').officialInputModalities,['text'])
 assert.equal(f('xiaomi','mimo-v2.5-pro').resolvedModel.modelId,'mimo-v2.6-pro')
 assert.equal(f('tokendance','unifuncs-u3').contextWindowTokens,200000)
 assert.equal(f('tokendance','unifuncs-u3').sourceScope,'service')
 assert.equal(f('tokendance','hy3-preview').contextWindowTokens,256000)
 assert.deepEqual(f('tokendance','seed-2.0-code').officialInputModalities,['text','image','video'])
 assert.equal(f('tokendance','seed-2.1-pro').contextWindowTokens,256000)
 assert.equal(f('tokendance','seedream-5.0-pro').contextWindowStatus,'not-published')
 assert.equal(f('bailian','xiaomi/mimo-v2.5-pro').resolvedModel,undefined)
 const id='fal-ai/test-echo'
 const jsonSchema=(properties:any)=>({'application/json':{schema:{properties}}})
 const schema={info:{'x-fal-metadata':{endpointId:id}},paths:{
   [`/${id}`]:{post:{requestBody:{content:jsonSchema({prompt:{type:'string'}})}}},
   [`/${id}/requests/{request_id}`]:{get:{responses:{'200':{content:jsonSchema({images:{type:'array'},prompt:{type:'string'},seed:{type:'integer'}})}}}},
 }}
 const m=normalizeCatalogModel('fal',{endpoint_id:id,metadata:{category:'text-to-image'},openapi:schema},'https://api.fal.ai/v1/models')
 assert.ok(m)
 assert.deepEqual(m.specifications.officialOutputModalities,['image'])
 assert.deepEqual(m.specifications.officialInputModalities,['text'])
})
