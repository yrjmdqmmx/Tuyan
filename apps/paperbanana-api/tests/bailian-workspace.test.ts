import { TAXONOMY_VERSION } from '../../../packages/figure-taxonomy/src/index.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeBailianWorkspace, bailianTextBaseUrl, bailianRouteFields, BAILIAN_WORKSPACE_REGIONS } from '../../../packages/api/src/bailian-workspace.js'
import { readProviderCatalog } from '../../../packages/api/src/provider-catalog.js'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
const ids=['deepseek-v4.1-flash-1017','MiniMax/MiniMax-M3.1-Flash','xiaomi/mimo-v2.6-pro-ultraspeed']
const bailian={workspaceId:'fixture-workspace',region:'cn-beijing'}
const route=(modelId=ids[0],config:any=bailian)=>({accessProvider:'bailian',modelId,bailian:config})
test('workspace DNS labels and fixed region/model boundaries cannot become arbitrary credential destinations',()=>{
 assert.deepEqual(normalizeBailianWorkspace({...bailian,workspaceId:' fixture-1 '}),{...bailian,workspaceId:'fixture-1'})
 for(const workspaceId of ['','a'.repeat(64),'-a','a-','a.b','a@evil.test','a/path','https://evil.test','a?x','a\n.b'])assert.throws(()=>normalizeBailianWorkspace({...bailian,workspaceId}))
 for(const region of ['cn-hongkong','global','cn','__proto__','constructor','cn-beijing.evil.test'])assert.throws(()=>normalizeBailianWorkspace({...bailian,region}))
 for(const id of ids)assert.throws(()=>bailianTextBaseUrl(id),/业务空间/)
 for(const region of Object.keys(BAILIAN_WORKSPACE_REGIONS))assert.equal(bailianTextBaseUrl(ids[0],{...bailian,region}),`https://fixture-workspace.${region}.maas.aliyuncs.com/compatible-mode/v1`)
 for(const id of ids.slice(1))assert.throws(()=>bailianTextBaseUrl(id,{...bailian,region:'us-east-1'}),/北京/)
 assert.equal(bailianTextBaseUrl('qwen3.7-plus',bailian),'https://dashscope.aliyuncs.com/compatible-mode/v1')
 assert.deepEqual(bailianRouteFields('bailian','qwen3.7-plus',bailian),{})
 assert.deepEqual(bailianRouteFields('openai',ids[0],bailian),{})
})
test('new exact IDs use one workspace request, SSE final text only, fixed sampling defaults and no fallback',async()=>{
 const r:any=await createRefineRuntime();let calls:any[]=[],mode='ok'
 try{
  r.legacy.configureProviderWorkflow({...r.workflow,active:()=>true,call:async(_d:any,fn:any)=>fn()})
  r.legacy.configureRuntimeFetch(async(url:any,init:any)=>{
   calls.push({url:String(url),...init,body:JSON.parse(init.body)})
   if(mode==='reject')return Response.json({error:{message:'unsupported image content'}},{status:400})
   if(mode==='lost')throw Error('fixture lost acknowledgment')
   if(mode==='truncated')return Response.json({choices:[{finish_reason:'length',message:{content:'partial'}}]})
   if(mode==='empty')return Response.json({choices:[{message:{reasoning_content:'private reasoning'}}]})
   return new Response('data: '+JSON.stringify({choices:[{index:0,delta:{reasoning_content:'private reasoning'}}]})+'\n\ndata: '+JSON.stringify({choices:[{index:0,delta:{content:'final answer'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}})
  })
  for(const id of ids)for(const region of id===ids[0]?Object.keys(BAILIAN_WORKSPACE_REGIONS):['cn-beijing']){
   calls=[];assert.equal(await r.legacy.callTextModel('bailian',id,'fixture-key','system','user',[],{bailian:{...bailian,region}}),'final answer')
   assert.equal(calls.length,1);assert.equal(calls[0].url,bailianTextBaseUrl(id,{...bailian,region})+'/chat/completions')
   assert.equal(calls[0].headers.Authorization,'Bearer fixture-key');assert.equal(calls[0].redirect,'error');assert.equal(calls[0].body.model,id);assert.equal(calls[0].body.stream,true)
   for(const key of ['temperature','top_p','thinking','reasoning_effort','enable_thinking','max_tokens','max_completion_tokens'])assert.equal(calls[0].body[key],undefined)
  }
  for(mode of ['reject','lost','truncated','empty']){calls=[];await assert.rejects(r.legacy.callTextModel('bailian',ids[1],'fixture','s','u',[],{bailian}));assert.equal(calls.length,1,mode)}
  calls=[];await assert.rejects(r.legacy.callTextModel('bailian',ids[0],'fixture','s','u'),/业务空间/)
  await assert.rejects(r.legacy.callTextModel('bailian',ids[1],'fixture','s','u',[],{bailian:{...bailian,region:'us-east-1'}}),/北京/)
  assert.equal(calls.length,0)
  mode='ok';await r.legacy.callTextModel('bailian','qwen3.7-plus','fixture','s','u',[],{bailian});assert.equal(calls[0].url,'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')
 }finally{await r.close()}
})
test('Core admission and input optimization preserve workspace identity; unconfigured legacy requests stop locally',async()=>{
 const r:any=await createRefineRuntime();let calls:any[]=[]
 try{
  const registry=await r.legacy.modelRegistry({provider:'bailian'});assert.equal(registry.bailianWorkspaceContractVersion,2)
  for(const id of ids){const m=registry.providers.bailian.models.find((m:any)=>m.id===id);assert.deepEqual(m.roles,['main','vision']);assert.equal(m.verified,false);assert.equal(m.capabilities.referenceImages,true)}
  const body={provider:'bailian',generationPath:'model-v1',outputFormat:'svg',visionMode:'none',modelRoutes:{main:route()}}
  assert.deepEqual(r.legacy.resolveModelRouting(body).modelRoutes.main,route())
  assert.throws(()=>r.legacy.resolveModelRouting({...body,modelRoutes:undefined,mainModelName:ids[0]}),/业务空间/)
  r.legacy.configureRuntimeFetch(async(url:any,init:any)=>{calls.push({url:String(url),body:JSON.parse(init.body)});return Response.json({choices:[{finish_reason:'stop',message:{content:'优化后的文字'}}]})})
  const {data:result}=await r.post({action:'optimizeInputs',target:'methodContent',inputs:{methodContent:'整理研究流程',caption:'',negativePrompt:''},mainRoute:route(),apiKey:'fixture'})
  assert.equal(result.optimizedText,'优化后的文字',JSON.stringify(result));assert.equal(calls.length,1);assert.equal(calls[0].url,bailianTextBaseUrl(ids[0],bailian)+'/chat/completions')
 }finally{await r.close()}
})
test('Beijing directory validation rejects malformed workspaces and non-Beijing requests before sending keys',async()=>{
 let calls=0;const fetcher:any=async()=>{calls++;return Response.json({output:{models:[],total:0}})}
 for(const input of [{workspaceId:'fixture-workspace',region:'us-east-1'},{workspaceId:'-invalid'},{workspaceId:'a'.repeat(64)}])assert.equal((await readProviderCatalog('bailian',{...input,apiKey:'fixture',fetcher})).state,'needs-configuration')
 assert.equal(calls,0)
})

test('Gateway/Core generation carries the same workspace through planning, SVG/PNG rendering and main-model review',async()=>{
 const r:any=await createRefineRuntime();
 try{
  // All provider responses below are deterministic fixtures; no real inference.
  r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
   const u=String(url);
   if(u.startsWith(r.baseUrl+'/objects/')){const o=r.objects.get(decodeURIComponent(u.slice((r.baseUrl+'/objects/').length)));return new Response(o?new Uint8Array(o.bytes):'',{status:o?200:404,headers:{'Content-Type':o?.mimeType||'image/png'}})}
   r.providerCalls.push({url:u,options:init});
   if(u.includes('/images/'))return Response.json({data:[{b64_json:r.image.toString('base64')}]});
   const wire=JSON.parse(init.body),system=JSON.stringify(wire.instructions||wire.messages?.filter((m:any)=>m.role==='system')||'');
   const user=typeof wire.input==='string'?wire.input:[...(Array.isArray(wire.input)?wire.input:[]),...(wire.messages||[])].filter((m:any)=>m.role==='user').flatMap((m:any)=>typeof m.content==='string'?[m.content]:m.content.filter((p:any)=>['text','input_text'].includes(p.type)).map((p:any)=>p.text)).join('\n');
   let content;
   if(system.includes('material-aware scientific figure planner'))content=JSON.stringify({status:'ready',missingInputs:[],plan:{drawing:'A labeled workflow from input to output. Synthetic fixture only.'}});
   else if(system.includes('SVG Diagram Agent'))content='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="white"/><text x="30" y="60">Input to output</text></svg>';
   else if(/SVG visual AND code review|PNG visual review AFTER generation/.test(system)){
    const c=JSON.parse(user);content=JSON.stringify({version:c.version,...(c.svgHash?{svgHash:c.svgHash,code:{status:'passed',findings:[]}}:{pngHash:c.pngHash}),numericReview:{applicable:false,reason:'Synthetic workflow contains no quantitative geometry',checks:[]},visual:{status:'passed',findings:[]},uncertainties:[],revised_description:'No changes needed.'});
   }else if(system.includes('visual observer assisting'))content=JSON.stringify({content:'Synthetic workflow',actual_text:['Input','Output'],layout:'left to right',connections:['Input to Output'],problems:[],suggestions:[],uncertainties:[]});
   else throw Error('Unexpected mocked stage '+system.slice(0,100));
   return Response.json({output_text:content,choices:[{finish_reason:'stop',message:{content}}]});
  });

  for(const id of ids) for(const outputFormat of ['svg','png']){
   r.providerCalls.length=0;
   const result=await r.post({action:'createJob',generationPath:'model-v1',provider:'bailian',apiKeys:{bailian:'fixture',openai:'fixture'},modelRoutes:{main:route(id),image:{accessProvider:'openai',modelId:'gpt-image-2'},vision:route(id)},visionMode:'assist',requirements:'A scientific workflow from input to output',methodContent:'A scientific workflow from input to output',caption:'',figureTypeId:'workflow',figureSpecVersion:TAXONOMY_VERSION,outputFormat,pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1,aspectRatio:'1:1',imageSize:'1K'});
   assert.equal(result.data.code,0,JSON.stringify(result.data));await r.legacy.drainJobAdmission();
   const job=(await r.post({action:'getJob',jobId:result.data.jobId})).data.job;
   assert.equal(job.status,'succeeded',JSON.stringify(job));assert.deepEqual(job.modelRoutes.main,route(id));
   const calls=r.providerCalls.filter((c:any)=>String(c.options.body).includes(id));assert.ok(calls.length>=2,outputFormat);
   for(const c of calls)assert.equal(c.url,bailianTextBaseUrl(ids[0],bailian)+'/chat/completions');
   assert.ok(calls.some((c:any)=>JSON.parse(c.options.body).messages.some((m:any)=>Array.isArray(m.content)&&m.content.some((p:any)=>p.type==='image_url' && p.image_url.url.startsWith('data:image/')))), 'same selected model receives actual review image bytes');
   assert.ok(!r.providerCalls.some((c:any)=>String(c.options.body).includes('gpt-4.1')), 'no separate model or silent fallback');
  }
 }finally{await r.close()}
})
