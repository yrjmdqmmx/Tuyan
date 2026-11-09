import test from 'node:test'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {DETERMINISTIC_PLOT_TYPES} from '../../../packages/figure-taxonomy/src/plot.js'
import {retrieveFigureCandidates} from '../../../packages/figure-taxonomy/src/library.js'
import {TAXONOMY_VERSION} from '../../../packages/figure-taxonomy/src/index.js'
const root=process.env.TUYAN_QA_EVIDENCE_DIR || '../../docs/infographic-v400/completion/evidence'
const python=process.env.TUYAN_QA_PYTHON || '/Users/a1-6/.cache/tuyan-figure-qa-20261010/bin/python'
export function actualWorker(wire:any):Promise<any>{
 return new Promise((resolve,reject)=>{
  const child=spawn(python,['../../scripts/figures/render-json.py']),parts:Buffer[]=[],errors:Buffer[]=[]
  child.stdout.on('data',d=>parts.push(d));child.stderr.on('data',d=>errors.push(d));child.on('error',reject)
  child.on('close',code=>{try{if(code)throw new Error(Buffer.concat(errors).toString());resolve(JSON.parse(Buffer.concat(parts).toString()))}catch(e){reject(e)}})
  child.stdin.end(JSON.stringify(wire))
 })
}
test('63 typed data routes × PNG/SVG use actual program worker; mocks only replace model planning and visual opinions',async()=>{
 const r=await createRefineRuntime(),prior=process.env.PLOT_WORKER_URL;process.env.PLOT_WORKER_URL='http://plot-fixture.invalid'
 const matrix:any[]=[];await mkdir(root+'/data-core',{recursive:true})
 try {
  for(const typeId of DETERMINISTIC_PLOT_TYPES){
   const fixture=JSON.parse(await readFile('../../docs/infographic-v400/evidence/plots/'+typeId+'.json','utf8')),pair:any[]=[]
   for(const outputFormat of ['png','svg']){
    let actual:any,planImages=0,reviewImages=0,modelCalls=0
    const refs=retrieveFigureCandidates({figureTypeId:typeId}).slice(0,1)
    r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
     if(String(url).endsWith('/models'))return Response.json({data:[]})
     const wire=JSON.parse(String(init.body))
     if(String(url).endsWith('/render')){actual=await actualWorker(wire);assert.equal(actual.ok,true,JSON.stringify({typeId,error:actual.error}));return Response.json(actual)}
     assert.ok(!String(url).includes('/images/'),'Numerical data must never use image generation')
     const serialized=JSON.stringify(wire),review=serialized.includes('Decide whether the current candidate')
     const parts=[...(Array.isArray(wire.input)?wire.input:[]),...(wire.messages||[])].flatMap((m:any)=>Array.isArray(m.content)?m.content:[])
     const images=parts.filter((c:any)=>['image_url','input_image'].includes(c.type))
     if(review){reviewImages+=images.length;assert.ok(serialized.includes('programValidation'))}else planImages+=images.length
     assert.ok(serialized.includes(typeId));modelCalls++
     const answer=review?JSON.stringify({critic_suggestions:'Mock visual opinion only',rendererAudit:{originalRequirements:[]},revised_description:'No changes needed.'}):JSON.stringify({plan:'Synthetic QA only. Preserve all submitted numeric values.',plotStyle:{width:9,height:6,fontSize:12}})
     return Response.json({output_text:answer,choices:[{message:{content:answer}}]})
    })
    const body={...fixture,action:'createJob',provider:'openai',apiKeys:{openai:'fixture'},mainModelName:'gpt-5.6-sol',imageModelName:'gpt-image-2',referenceVisionModelName:'gpt-5.6-sol',visionMode:'none',methodContent:'Explicit synthetic QA dataset, no scientific claims.',caption:'Synthetic QA',figureSpecVersion:TAXONOMY_VERSION,outputFormat,pipelineMode:'planner_critic',retrievalSetting:refs.length?'manual':'none',manualReferenceIds:refs.map(x=>x.id),maxCriticRounds:1,numCandidates:1}
    const bad=await r.post({...body,figureData:undefined});assert.equal(bad.data.businessCode,'FIGURE_INPUT_INVALID');assert.equal(modelCalls,0)
    const created=await r.post(body);assert.equal(created.data.code,0,JSON.stringify(created));await r.legacy.drainJobAdmission()
    const job=(await r.post({action:'getJob',jobId:created.data.jobId})).data.job
    assert.equal(job.status,'succeeded',JSON.stringify({typeId,outputFormat,error:job.error}))
    assert.equal(job.referenceSelection.exactCount+job.referenceSelection.compatibleCount,refs.length)
    const result=job.resultImages[0],audit=result.review.dataValidation
    assert.equal(result.review.status,'passed');assert.equal(audit.program.numeric.typeId,typeId)
    assert.ok(Object.keys(audit.program.numeric.checks).length>0);assert.equal(audit.program.vector,true);assert.equal(audit.program.editableText,true);assert.equal(audit.program.sameScene,true)
    const png=Buffer.from(actual.image_base64,'base64'),svg=Buffer.from(actual.svg_base64,'base64')
    assert.ok(svg.includes('<text'));assert.ok(!svg.includes('<image'))
    assert.equal(planImages,refs.length);assert.equal(reviewImages,1);assert.equal(modelCalls,2)
    await writeFile(root+'/data-core/'+typeId+'.'+outputFormat,outputFormat==='svg'?svg:png)
    const entry={typeId,format:outputFormat,input:'actual_valid_and_missing_rejected',reference:refs.length?'licensed_pixels_in_mock_planning':'no_qualified_match',referenceIds:refs.map(x=>x.id),drawing:'actual_sandboxed_program',review:'actual_numeric_artist_checks_and_mock_visual_opinion',realModel:'not_tested',validation:audit.program}
    pair.push(entry);matrix.push(entry)
    console.log(typeId,outputFormat,'passed')
   }
   assert.equal(pair[0].validation.codeHash,pair[1].validation.codeHash)
   assert.equal(pair[0].validation.pngHash,pair[1].validation.pngHash)
   assert.equal(pair[0].validation.svgHash,pair[1].validation.svgHash)
  }
 } finally {
  await writeFile(root+'/data-core-matrix.json',JSON.stringify(matrix,null,2))
  if(prior===undefined)delete process.env.PLOT_WORKER_URL;else process.env.PLOT_WORKER_URL=prior
  await r.close()
 }
})
