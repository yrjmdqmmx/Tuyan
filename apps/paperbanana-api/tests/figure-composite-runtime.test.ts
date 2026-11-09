import {mockTopology,mockTopologyAudit} from './helpers/topology-fixtures.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdir,writeFile,mkdtemp} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {TAXONOMY_VERSION} from '../../../packages/figure-taxonomy/src/index.js'
import {retrieveFigureCandidates} from '../../../packages/figure-taxonomy/src/library.js'
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><title>Mock workflow for transport QA</title><rect width="600" height="400" fill="white"/><text x="30" y="100" font-size="24">Synthetic Input → Output</text></svg>'
const parts=(w:any)=>[...(Array.isArray(w.input)?w.input:[]),...(w.messages||[])]
const user=(w:any)=>parts(w).filter((m:any)=>m.role==='user').flatMap((m:any)=>typeof m.content==='string'?[m.content]:m.content.filter((p:any)=>['text','input_text'].includes(p.type)).map((p:any)=>p.text)).join('\n')
const images=(w:any)=>parts(w).flatMap((m:any)=>Array.isArray(m.content)?m.content:[]).filter((p:any)=>['image_url','input_image'].includes(p.type)).length
function worker(wire:any):Promise<any>{return new Promise((resolve,reject)=>{
 const child=spawn(process.env.TUYAN_QA_PYTHON||'/Users/a1-6/.cache/tuyan-figure-qa-20261010/bin/python',['../../scripts/figures/render-json.py']),out:Buffer[]=[],err:Buffer[]=[]
 child.stdout.on('data',d=>out.push(d));child.stderr.on('data',d=>err.push(d));child.on('error',reject);child.on('close',code=>{try{if(code)throw Error(Buffer.concat(err).toString());resolve(JSON.parse(Buffer.concat(out).toString()))}catch(e){reject(e)}});child.stdin.end(JSON.stringify(wire))
})}
const data={rows:[{label:'A',value:2},{label:'B',value:5},{label:'C',value:3}],source:'Explicit synthetic test data; no scientific conclusion',units:{value:'arbitrary test units'}}
const base={action:'createJob',provider:'openai',apiKeys:{openai:'fixture'},mainModelName:'gpt-5.6-sol',imageModelName:'gpt-image-2',referenceVisionModelName:'gpt-5.6-sol',visionMode:'none',methodContent:'Synthetic composition only.',caption:'Synthetic QA',taskName:'diagram',figureSpecVersion:TAXONOMY_VERSION,pipelineMode:'planner_critic',retrievalSetting:'auto',maxCriticRounds:1,numCandidates:1,imageSize:'1K',aspectRatio:'16:9'}
test('mixed and repeated panels × PNG/SVG: actual data worker and vector assembly, per-child automatic references, admission and refine guards',async(t)=>{
 const root=process.env.TUYAN_QA_EVIDENCE_DIR || await mkdtemp(join(tmpdir(),'tuyan-composite-qa-'))
 t.diagnostic('Composite mock evidence output: '+root)
 const r=await createRefineRuntime(),previous=process.env.PLOT_WORKER_URL;process.env.PLOT_WORKER_URL='http://plot-fixture.invalid'
 const matrix:any[]=[];await mkdir(root+'/composite-core',{recursive:true})
 try {
  for(const typeId of ['multipanel','small_multiples'])for(const outputFormat of ['png','svg']){
   const calls:any[]=[];let rendered=0
   r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
    if(String(url).endsWith('/models'))return Response.json({data:[]})
    assert.ok(!String(url).includes('/images/'),'composite numerical marks must never use image generation')
    const wire=JSON.parse(String(init.body)),all=JSON.stringify(wire)
    if(String(url).endsWith('/render')){rendered++;const result=await worker(wire);assert.equal(result.ok,true);return Response.json(result)}
    assert.ok(!all.includes('attacker.invalid'));assert.ok(String(url).startsWith('https://api.openai.com/'))
    let kind='plan',answer=JSON.stringify({plan:'Synthetic fixture. Keep all numbers and source facts.',plotStyle:{width:9,height:6,fontSize:12}})
    if(all.includes('Retrieval Agent')){kind='retrieval';const contract=JSON.parse(user(wire).match(/<figure_type_contract[^>]*>\s*([\s\S]*?)\s*<\/figure_type_contract>/)![1]);const ref=retrieveFigureCandidates({figureTypeId:contract.id})[0];answer=JSON.stringify({selections:ref?[{id:ref.id,relevance:.95,visualFit:true,contribution:'Explicit matching structure'}]:[]})}
    else if(all.includes('SVG visual AND code review')){kind='svg-review';const c=JSON.parse(user(wire));answer=JSON.stringify({version:c.version,svgHash:c.svgHash,...(c.topology?{topologyAudit:mockTopologyAudit(c.topology)}:{}),visual:{status:'passed',findings:[]},code:{status:'passed',findings:[]},uncertainties:[],rendererAudit:{originalRequirements:[]},revised_description:'No changes needed.'});assert.equal(images(wire),1)}
    else if(all.includes('Diagram Topology Agent')){kind='topology';const c=JSON.parse(user(wire));answer=JSON.stringify(mockTopology(c.methodology))}
    else if(all.includes('SVG Diagram Agent')){kind='svg';answer=svg}
    else if(all.includes('Decide whether the current candidate')){kind='data-review';answer=JSON.stringify({critic_suggestions:'Mock visual opinion only',rendererAudit:{originalRequirements:[]},revised_description:'No changes needed.'});assert.ok(all.includes('programValidation'));assert.equal(images(wire),1)}
    calls.push({kind,images:images(wire),text:user(wire)})
    return Response.json({output_text:answer,choices:[{message:{content:answer}}]})
   })
   // Unknown child route fields cannot override the authenticated parent routes.
   const panels=[{label:'甲',figureTypeId:typeId==='multipanel'?'workflow':'bar',...(typeId==='multipanel'?{methodContent:'Input then Output'}:{figureData:data}),modelRoutes:{main:{modelId:'attacker',accessProvider:'custom',custom:{baseUrl:'https://attacker.invalid'}}}},{label:'乙',figureTypeId:'bar',figureData:data}]
   const body={...base,figureTypeId:typeId,outputFormat,figurePanels:panels}
   for(const bad of [{...body,figurePanels:[panels[0],{...panels[1],figureData:undefined}]},{...body,figureVariantIds:[typeId+'.v1']},{...body,figurePanels:[panels[0],{...panels[1],label:'甲'}]}]){const response=await r.post(bad);assert.equal(response.data.businessCode,'FIGURE_INPUT_INVALID',JSON.stringify(response));assert.equal(calls.length,0);assert.equal(rendered,0)}
   const created=await r.post(body);assert.equal(created.data.code,0,JSON.stringify(created));await r.legacy.drainJobAdmission()
   const job=(await r.post({action:'getJob',jobId:created.data.jobId})).data.job;assert.equal(job.status,'succeeded',JSON.stringify({typeId,outputFormat,error:job.error}))
   const result=job.resultImages[0],review=result.review;assert.equal(review.status,'passed');assert.equal(review.history.length,1);assert.equal(review.history[0].svgHash,review.deliveredSvgHash)
   assert.deepEqual(review.composition.panels.map((p:any)=>p.label),['甲','乙']);assert.equal(review.composition.sharedFont,'Noto Sans');assert.equal(rendered,typeId==='multipanel'?1:2)
   const plans=calls.filter(c=>c.kind==='plan');assert.equal(plans.length,2);for(const plan of plans)assert.ok(plan.images>0,'Each child must see its automatic licensed references')
   assert.ok(plans[1].text.includes('bar'));if(typeId==='multipanel')assert.ok(plans[0].text.includes('workflow'))
   const saved=[...r.objects.entries()].filter(([key])=>key.includes(created.data.jobId)),vectors=saved.filter(([key,value])=>key.includes('composition-vector')&&value.mimeType==='image/svg+xml'),rasters=saved.filter(([key])=>key.includes('composition-render'))
   assert.equal(vectors.length,1);assert.equal(rasters.length,1);const finalSvg=vectors[0][1].bytes.toString();assert.ok(finalSvg.includes('<text'));assert.ok(!finalSvg.includes('<image'));if(typeId==='small_multiples')assert.ok(finalSvg.includes('Independent scale'))
   assert.ok(saved.some(([key])=>key.includes('panel-1-')));assert.ok(saved.some(([key])=>key.includes('panel-2-')))
   await writeFile(`${root}/composite-core/${typeId}-${outputFormat}.svg`,vectors[0][1].bytes);await writeFile(`${root}/composite-core/${typeId}-${outputFormat}.png`,rasters[0][1].bytes)
   const count=calls.length;const refine=await r.post({...base,action:'refineImage',sourceImageObjectKey:result.objectKey||result.filename,editInstruction:'Move labels only'});assert.equal(refine.data.businessCode,'FIGURE_DATA_REFINE_UNSUPPORTED',JSON.stringify(refine));assert.equal(calls.length,count)
   matrix.push({typeId,format:outputFormat,inputs:'valid_and_missing_data_duplicate_labels_unsupported_variant_checked',references:'automatic_per_child_licensed_pixels',drawing:'actual_program_numeric_panels_mock_schematic_and_actual_vector_assembly',review:'actual_numeric_checks_mock_version_bound_visual_review',refine:'data_image_refine_blocked_before_call',childRoutes:'parent_authenticated_routes_preserved',actualModel:'not_tested',reviewEvidence:review,calls:calls.map(({text,...c})=>c)})
  }
 }finally{await writeFile(root+'/composite-core-matrix.json',JSON.stringify(matrix,null,2));if(previous===undefined)delete process.env.PLOT_WORKER_URL;else process.env.PLOT_WORKER_URL=previous;await r.close()}
})
