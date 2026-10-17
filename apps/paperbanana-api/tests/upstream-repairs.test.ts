import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {TAXONOMY_VERSION} from '../../../packages/figure-taxonomy/src/index.js'

const user=(w:any)=>typeof w.input==='string'?w.input:[...(Array.isArray(w.input)?w.input:[]),...(w.messages||[])].filter((m:any)=>m.role==='user').flatMap((m:any)=>typeof m.content==='string'?[m.content]:m.content.filter((p:any)=>p.type==='input_text'||p.type==='text').map((p:any)=>p.text)).join('\n')
test('full model-v1 gateway workflow preserves local veto, original model verdict and output without additional generation',async()=>{
 const r=await createRefineRuntime(),calls:string[]=[]
 try{
  const svg=await readFile(new URL('./fixtures/svg-quality/restored-svg-1.svg',import.meta.url),'utf8')
  r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
   const u=String(url)
   if(u.endsWith('/models'))return Response.json({data:[]})
   if(u.startsWith(r.baseUrl+'/objects/')){const o=r.objects.get(decodeURIComponent(u.slice((r.baseUrl+'/objects/').length)));return new Response(o?new Uint8Array(o.bytes):'',{status:o?200:404})}
   assert.ok(u.startsWith('https://api.openai.com/'),'No external provider fallback')
   const w=JSON.parse(init.body),sys=JSON.stringify(w.instructions||w.messages?.filter((m:any)=>m.role==='system')||'')
   let content=''
   if(sys.includes('material-aware scientific figure planner')){calls.push('planner');content=JSON.stringify({status:'ready',missingInputs:[],plan:'Draw the fixture workflow with A=35 and B=12.'})}
   else if(sys.includes('Lead Visual Designer')){calls.push('stylist');assert.match(sys,/Soft Tech & Scientific Pastels/);content=JSON.stringify({status:'ready',missingInputs:[],plan:'Draw the complete fixture workflow with A=35 B=12, preserving all facts.'})}
   else if(sys.includes('SVG Diagram Agent')){calls.push('svg');content=svg}
   else if(sys.includes('SVG visual AND code review')){calls.push('review');const c=JSON.parse(user(w));assert.equal(c.localQuality.status,'issues_found');content=JSON.stringify({version:c.version,svgHash:c.svgHash,visual:{status:'passed',findings:[]},code:{status:'passed',findings:[]},numericReview:{applicable:false,reason:'Intentionally false simulated model verdict for veto test',checks:[]},uncertainties:[],revised_description:'No changes needed.'})}
   else throw Error('Unexpected mocked request '+sys.slice(0,100))
   return Response.json({output_text:content,choices:[{message:{content}}]})
  })
  const created=await r.post({action:'createJob',generationPath:'model-v1',provider:'openai',apiKeys:{openai:'fixture'},modelRoutes:{main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:'openai',modelId:'gpt-image-2'},vision:{accessProvider:'openai',modelId:'gpt-4.1'}},visionMode:'none',methodContent:'Draw input to output with values from the supplied requirements.',caption:'Fixture only',figureTypeId:'workflow',figureSpecVersion:TAXONOMY_VERSION,outputFormat:'svg',pipelineMode:'full',retrievalSetting:'none',numCandidates:1,maxCriticRounds:3,aspectRatio:'1:1',imageSize:'1K'})
  assert.equal(created.data.code,0,JSON.stringify(created.data))
  await r.legacy.drainJobAdmission()
  const job=(await r.post({action:'getJob',jobId:created.data.jobId})).data.job
  assert.equal(job.status,'succeeded',job.error)
  assert.deepEqual(calls,['planner','stylist','svg','review'])
  const result=job.resultImages[0]
  assert.equal(result.review.status,'issues_found')
  assert.match(result.review.note,/模型通过结论未采纳/)
  const assessment=JSON.parse(result.review.history[0].assessment)
  assert.equal(assessment.visual.status,'passed');assert.equal(assessment.localAccepted,false)
  assert.equal(r.objects.get(result.objectKey)?.bytes.toString(),svg)
  assert.ok(job.stages.some((s:any)=>s.type==='render'&&JSON.parse(s.text).localQuality?.checked===2))
 }finally{await r.close()}
})

test('legacy diagnostic evaluation never invents scores or ground truth, and refuses new material contexts before calls',async()=>{
 const previous=process.env.ADMIN_TOKEN;process.env.ADMIN_TOKEN='fixture-admin'
 const r=await createRefineRuntime()
 try{
  let response='invalid judge output',calls:any[]=[]
  r.objects.set('result.png',{bytes:r.image,mimeType:'image/png'})
  r.objects.set('style.png',{bytes:r.image,mimeType:'image/png'})
  r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
   const u=String(url)
   if(u.startsWith(r.baseUrl+'/objects/')){const o=r.objects.get(decodeURIComponent(u.slice((r.baseUrl+'/objects/').length)));return new Response(o?new Uint8Array(o.bytes):'',{status:o?200:404,headers:{'Content-Type':'image/png'}})}
   assert.ok(u.startsWith('https://api.openai.com/'),'No external provider fallback')
   calls.push(JSON.parse(init.body))
   return Response.json({output_text:response,choices:[{message:{content:response}}]})
  })
  const row={_id:'audit-old',status:'succeeded',provider:'openai',mainModelName:'gpt-4.1',methodContent:'A real method',caption:'Target figure',resultImages:[{objectKey:'result.png',mimeType:'image/png'}],referenceImages:[{objectKey:'style.png',mimeType:'image/png'}]}
  await r.db.collection('paperbanana_jobs').insertOne(row)
  const request={action:'evaluateJob',adminToken:'fixture-admin',jobId:'audit-old',provider:'openai',model:'gpt-4.1',apiKey:'fixture'}
  let result=await r.invoke(request)
  assert.equal(result.mode,'reference_free');assert.equal(result.status,'unevaluable');assert.equal(result.overall,null)
  assert.equal(result.errors.length,4);assert.ok(Object.values(result.scores).every(score=>score===null))
  const gt={...request,groundTruthObjectKey:'style.png',groundTruthConfirmed:true}
  result=await r.invoke(gt)
  assert.equal(result.status,'unevaluable');assert.equal(result.overallNumeric,null)
  assert.ok(Object.values(result.winners).every(winner=>winner===null))
  response=JSON.stringify({winner:'Model',comparison_reasoning:'Fixture comparison'})
  result=await r.invoke(gt)
  assert.equal(result.status,'evaluated');assert.equal(result.overall,'Model');assert.equal(result.overallNumeric,9)
  for(const score of [0,7.5,11,'7',null]){
   response=JSON.stringify({score,reasoning:'Fixture score'});result=await r.invoke(request)
   assert.equal(result.status,typeof score==='number'&&score<=10?'evaluated':'unevaluable')
   assert.equal(result.overall,typeof score==='number'&&score<=10?score:null)
  }
  calls=[]
  assert.equal((await r.invoke({...gt,groundTruthConfirmed:false})).businessCode,'EVALUATION_GROUND_TRUTH_CONFIRMATION_REQUIRED')
  assert.equal((await r.invoke({...gt,groundTruthObjectKey:'another-job.png'})).code,400)
  for(const extra of [{generationPath:'model-v1'},{sourceMaterials:[{text:'source fact'}]},{materialFiles:[{id:'cleaned-original'}]},{generationContext:{materialFiles:[{id:'old-file'}]}}]){
   await r.db.collection('paperbanana_jobs').insertOne({...row,...extra,_id:'material-'+JSON.stringify(extra)})
   assert.equal((await r.invoke({...request,jobId:'material-'+JSON.stringify(extra)})).businessCode,'EVALUATION_CONTEXT_UNSUPPORTED')
  }
  assert.equal(calls.length,0)
 }finally{await r.close();if(previous===undefined)delete process.env.ADMIN_TOKEN;else process.env.ADMIN_TOKEN=previous}
})
