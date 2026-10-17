import {mockTopology,mockTopologyAudit} from './helpers/topology-fixtures.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {writeFile,mkdir} from 'node:fs/promises'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {FIGURE_TYPES,TAXONOMY_VERSION} from '../../../packages/figure-taxonomy/src/index.js'
import {retrieveFigureCandidates} from '../../../packages/figure-taxonomy/src/library.js'
const output=process.env.TUYAN_QA_EVIDENCE_DIR || '../../docs/infographic-v400/completion/evidence'
const hash=(x:any)=>createHash('sha256').update(x).digest('hex')
function parts(w:any){return [...(Array.isArray(w.input)?w.input:[]),...(w.messages||[])]}
function user(w:any){return parts(w).filter((p:any)=>p.role==='user').flatMap((p:any)=>typeof p.content==='string'?[p.content]:(p.content||[]).filter((c:any)=>['text','input_text'].includes(c.type)).map((c:any)=>c.text)).join('\n')}
function images(w:any){return parts(w).flatMap((p:any)=>Array.isArray(p.content)?p.content:[]).filter((c:any)=>['image_url','input_image'].includes(c.type)).map((c:any)=>typeof c.image_url==='string'?c.image_url:c.image_url.url)}
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><title>Mock model output; transport QA only</title><rect width="600" height="400" fill="white"/><text x="30" y="100" font-size="24">Synthetic transport fixture</text></svg>'
const body=(id:string,format:string)=>({action:'createJob',provider:'openai',apiKeys:{openai:'fixture'},mainModelName:'gpt-5.6-sol',imageModelName:'gpt-image-2',referenceVisionModelName:'gpt-5.6-sol',visionMode:'none',methodContent:'Input then Output. Synthetic contract transport fixture. The model response is mocked; no scientific correctness or image quality is certified.',caption:'Synthetic contract transport fixture',taskName:'diagram',figureTypeId:id,figureSpecVersion:TAXONOMY_VERSION,outputFormat:format,pipelineMode:'planner_critic',retrievalSetting:'none',maxCriticRounds:1,numCandidates:1})

test('all 27 schematic/domain types deliver type rules and real licensed reference pixels in both mocked model routes',async()=>{
 const r=await createRefineRuntime(),matrix:any[]=[]
 try {
  for(const type of FIGURE_TYPES.filter(t=>!['data','composite'].includes(t.kind)))for(const format of ['png','svg']){
   const refs=retrieveFigureCandidates({figureTypeId:type.id}).slice(0,1),calls:any[]=[]
   r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
    if(String(url).endsWith('/models'))return Response.json({data:[]})
    const wire=JSON.parse(String(init.body)),all=JSON.stringify(wire)
    const kind=String(url).includes('/images/')?'image':all.includes('SVG visual AND code review')?'svg-review':all.includes('PNG visual review AFTER generation')?'png-review':all.includes('SVG Diagram Agent')?'svg':all.includes('Diagram Topology Agent')?'topology':'plan'
    assert.ok(all.includes(type.id),`${type.id} missing from ${kind}`)
    assert.ok(all.includes(type.encodingRules[0]),`${type.id} rule missing from ${kind}`)
    const picture=images(wire);calls.push({kind,imageCount:picture.length,imageHashes:picture.map((i:string)=>hash(Buffer.from(i.split(',')[1],'base64')))})
    if(kind==='image')return Response.json({data:[{b64_json:r.output.toString('base64')}]})
    let answer=kind==='svg'?svg:'Complete mock plan; preserve the original concrete figure contract.'
    if(kind==='topology'){const c=JSON.parse(user(wire));answer=JSON.stringify(mockTopology(c.methodology))}
    if(kind.endsWith('-review')){const c=JSON.parse(user(wire));answer=JSON.stringify({version:c.version,svgHash:c.svgHash,...(c.topology?{topologyAudit:mockTopologyAudit(c.topology)}:{}),pngHash:c.pngHash,visual:{status:'passed',findings:[]},code:{status:'passed',findings:[]},uncertainties:[],rendererAudit:{originalRequirements:[]},revised_description:'No changes needed.'})}
    return Response.json({output_text:answer,choices:[{message:{content:answer}}]})
   })
   const created=await r.post({...body(type.id,format),retrievalSetting:refs.length?'manual':'none',manualReferenceIds:refs.map(x=>x.id)})
   assert.equal(created.data.code,0,JSON.stringify(created));await r.legacy.drainJobAdmission()
   const job=(await r.post({action:'getJob',jobId:created.data.jobId})).data.job
   assert.equal(job.status,'succeeded',JSON.stringify({type:type.id,format,error:job.error}))
   assert.equal(job.referenceSelection.exactCount+job.referenceSelection.compatibleCount,refs.length)
   assert.equal(job.figureTypeId,type.id);assert.equal(job.outputFormat,format);assert.equal(job.resultImages[0].review.status,'passed')
   assert.equal(calls.find(c=>c.kind==='plan')?.imageCount,refs.length)
   assert.equal(calls.find(c=>c.kind.endsWith('-review'))?.imageCount,1)
   matrix.push({typeId:type.id,format,input:'schematic_evidence_requires_user_and_review',reference:refs.length?'licensed_pixels_transmitted':'no_qualified_match',referenceIds:refs.map(x=>x.id),planning:'type_rules_checked',drawing:'mock_model_response_real_svg_rasterizer_if_svg',review:'mock_model_decision_on_actual_raster',realModel:'not_tested',calls})
  }
  await mkdir(output,{recursive:true});await writeFile(output+'/schematic-mock-matrix.json',JSON.stringify(matrix,null,2))
 }finally{await r.close()}
})
