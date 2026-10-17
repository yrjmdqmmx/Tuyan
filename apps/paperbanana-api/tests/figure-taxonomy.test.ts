import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {CURATED_REFERENCES,retrieveFigureCandidates} from '../../../packages/figure-taxonomy/src/library.js'
import {TAXONOMY_VERSION,FIGURE_TYPES,figureContract} from '../../../packages/figure-taxonomy/src/index.js'
import {curatedFigureBytes,validateFigureExecution} from '../src/figure-contract.js'
import {pngGenerationPrompt} from '../../../packages/api/src/png-workflow.js'
import {recraftSvgPrompt} from '../../../packages/api/src/svg-workflow.js'
import {workflowContext} from '../../../packages/api/src/workflow-prompts.js'
import {workflowRequiredRoles} from '../../../packages/api/src/workflow.js'
import {distinctReferenceCandidates} from '../../../packages/api/src/reference-selection.js'
const base=(id='method_framework')=>({action:'createJob',provider:'openai',apiKeys:{openai:'fixture-only'},mainModelName:'gpt-5.6-sol',imageModelName:'gpt-image-2',referenceVisionModelName:'gpt-5.6-sol',visionMode:'none',methodContent:'Input A is measured, processed by B, then output C. This is a synthetic QA example, not a scientific result.',caption:'A controlled workflow.',taskName:'diagram',figureTypeId:id,figureSpecVersion:TAXONOMY_VERSION,infographicCategory:id,outputFormat:'png',pipelineMode:'planner_critic',retrievalSetting:'none',maxCriticRounds:1,numCandidates:1})
const dataBody=()=>({...base('bar'),taskName:'plot',figureData:{source:'Synthetic QA only',rows:[{label:'A',value:2},{label:'B',value:7}],units:{value:'mg'}}})
function text(wire:any){return [...(Array.isArray(wire.input)?wire.input:[]),...(wire.messages||[])].flatMap(m=>typeof m.content==='string'?[m.content]:(m.content||[]).filter((c:any)=>['input_text','text'].includes(c.type)).map((c:any)=>c.text)).join('\n')}

test('every concrete type has a versioned full contract; all image renderers and observers receive it',()=>{
 for(const t of FIGURE_TYPES){const body=base(t.id),contract=figureContract(body);assert.equal(contract.id,t.id);assert.ok(contract.encodingRules.length);assert.ok(contract.requiredInputs.length);for(const prompt of [workflowContext(body),pngGenerationPrompt(body,'a complete plan'),recraftSvgPrompt(body,'a complete plan')]){assert.ok(prompt.includes(t.id));assert.ok(prompt.includes(t.encodingRules[0]));}}
 assert.deepEqual(workflowRequiredRoles({...dataBody(),imageSize:'4K',imageRefineMode:'direct-edit',maxCriticRounds:0}),['main'])
 assert.throws(()=>validateFigureExecution({...dataBody(),figureSpecVersion:'old'}),/版本/)
 assert.throws(()=>validateFigureExecution({...dataBody(),figureData:null}),/结构化数据/)
 assert.doesNotThrow(()=>validateFigureExecution({...base('multipanel'),figurePanels:[{label:'A',figureTypeId:'workflow'},{...dataBody(),label:'B'}]}))
})

test('publisher figure query ids remain distinct and curated bytes match retained provenance',async()=>{
 const sameJournal=CURATED_REFERENCES.filter(row=>row.paper.journal==='PLOS Biology')
 assert.equal(distinctReferenceCandidates(sameJournal).length,sameJournal.length)
 const row=sameJournal[0],bytes=await curatedFigureBytes(row.id)
 assert.equal(createHash('sha256').update(bytes).digest('hex'),row.assets.large.sha256)
 assert.equal(bytes.subarray(1,4).toString(),'PNG')
 assert.ok(retrieveFigureCandidates({figureTypeId:'method_framework'}).every(row=>['exact','compatible'].includes(row.match.level)))
})

test('gateway/Core admission rejects missing data before calls; typed fields survive storage and actual PNG requests/review',async()=>{
 const r=await createRefineRuntime()
 try {
  const invalid=await r.post({...dataBody(),figureData:null});assert.equal(invalid.data.businessCode,'FIGURE_INPUT_INVALID');assert.equal(r.providerCalls.length,0)
  const wires:any[]=[]
  r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
   if(String(url).endsWith('/models'))return Response.json({data:[]})
   const wire=JSON.parse(String(init.body)),serialized=JSON.stringify(wire);wires.push({url:String(url),wire})
   if(String(url).includes('/images/'))return Response.json({data:[{b64_json:r.output.toString('base64')}]})
   let answer='Complete plan A to B to C, preserve original source constraints.'
   if(serialized.includes('PNG visual review AFTER generation')){
    const raw=text(wire);const user=[...(wire.input||[]),...(wire.messages||[])].filter((m:any)=>m.role==='user').flatMap((m:any)=>typeof m.content==='string'?[m.content]:m.content.filter((c:any)=>['input_text','text'].includes(c.type)).map((c:any)=>c.text)).join('\n');const c=JSON.parse(user)
    answer=JSON.stringify({version:c.version,pngHash:c.pngHash,visual:{status:'passed',findings:[]},uncertainties:[],revised_description:'No changes needed.'});assert.match(raw,/method_framework/)
   }
   return Response.json({output_text:answer,choices:[{message:{content:answer}}]})
  })
  const created=await r.post(base());assert.equal(created.data.code,0,JSON.stringify(created));await r.legacy.drainJobAdmission()
  const job=(await r.post({action:'getJob',jobId:created.data.jobId})).data.job
  assert.equal(job.status,'succeeded',JSON.stringify(job));assert.equal(job.figureTypeId,'method_framework');assert.equal(job.figureSpecVersion,TAXONOMY_VERSION)
  assert.equal(job.resultImages[0].review.status,'passed')
  for(const call of wires){assert.match(JSON.stringify(call.wire),/method_framework/);assert.match(JSON.stringify(call.wire),/输入输出|输入.*输出/)}
  const old=await r.post({action:'referenceLibrary',referenceIds:['ref_279']});assert.equal(old.data.businessCode,'REFERENCE_LICENSE_UNVERIFIED')
  const library=await r.post({action:'referenceLibrary',figureTypeId:'bar'});assert.ok(library.data.references.length);assert.ok(library.data.references.every((row:any)=>row.license.status==='verified'))
 } finally{await r.close()}
})

test('typed plot sends immutable code to worker, retains data checks, and never sends data to image model at 4K',async()=>{
 const r=await createRefineRuntime(),prior=process.env.PLOT_WORKER_URL;process.env.PLOT_WORKER_URL='http://plot-fixture.invalid'
 try {
  let renderCode='',calls=0
  r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
   if(String(url).endsWith('/models'))return Response.json({data:[]})
   const wire=JSON.parse(String(init.body));assert.ok(!String(url).includes('/images/'))
   if(String(url).endsWith('/render')){renderCode=wire.code;const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="5" y="20">Mock transport only</text></svg>';const hash=(v:any)=>createHash('sha256').update(v).digest('hex');return Response.json({ok:true,image_base64:r.output.toString('base64'),svg_base64:Buffer.from(svg).toString('base64'),render_validation:{vector:true,svgHash:hash(svg),pngHash:hash(r.output),codeHash:hash(wire.code.trim())}})}
   calls++;const serialized=JSON.stringify(wire);assert.match(serialized,/"figureTypeId"|bar/)
   const answer=serialized.includes('Decide whether the current candidate')?JSON.stringify({critic_suggestions:'Fixture visual check only',rendererAudit:{originalRequirements:[]},revised_description:'No changes needed.'}):JSON.stringify({plan:'Use submitted data exactly',plotStyle:{width:9,height:6,fontSize:12}})
   return Response.json({output_text:answer,choices:[{message:{content:answer}}]})
  })
  const created=await r.post({...dataBody(),imageSize:'4K'});assert.equal(created.data.code,0,JSON.stringify(created));await r.legacy.drainJobAdmission()
  const job=(await r.post({action:'getJob',jobId:created.data.jobId})).data.job
  assert.equal(job.status,'succeeded',JSON.stringify(job));assert.match(renderCode,/immutable source data/);assert.match(renderCode,/4096/);assert.match(renderCode,/get_width/)
  assert.deepEqual(job.figureData,dataBody().figureData);assert.equal(job.resultImages[0].review.dataValidation.renderer,'deterministic-v1');assert.equal(calls,2)
  const refined=await r.post({...base(),action:'refineImage',sourceImageObjectKey:job.resultImages[0].objectKey || job.resultImages[0].filename,editInstruction:'Move labels only',imageSize:'1K'});assert.equal(refined.data.businessCode,'FIGURE_DATA_REFINE_UNSUPPORTED',JSON.stringify(refined));assert.equal(calls,2)
 }finally{if(prior===undefined)delete process.env.PLOT_WORKER_URL;else process.env.PLOT_WORKER_URL=prior;await r.close()}
})
