import {mkdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {CURATED_REFERENCES} from '../../../packages/figure-taxonomy/src/library.js'
import {TAXONOMY_VERSION} from '../../../packages/figure-taxonomy/src/index.js'
import {createRefineRuntime} from '../../../test-support/refine-runtime.mjs'
import {parseSvgDecision, recraftSvgRequest, recraftSvgPrompt} from '../../../packages/api/src/svg-workflow.js'

const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex')

test('Bailian recognition sends actual image bytes without a public storage URL dependency',async()=>{
  const r=await createRefineRuntime()
  try {
    const calls:any[]=[]
    r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
      const wire=JSON.parse(String(init.body));calls.push(wire)
      return Response.json({choices:[{message:{content:'Observed actual image'}}]})
    })
    const input={mimeType:'image/png',url:'data:image/png;base64,'+r.image.toString('base64')}
    await r.legacy.callTextModel('bailian','qwen3.7-plus','fixture','Read pixels','Inspect this image',[input])
    await r.legacy.callVisionModel('bailian','qwen3.7-plus','fixture','Method','Caption',[input])
    assert.equal(calls.length,2)
    for(const wire of calls)assert.deepEqual(images(wire),[input.url])
    assert.equal([...r.objects.keys()].some(key=>key.startsWith('bailian-vision/')),false)
  }finally{await r.close()}
})

const svg=(version:number)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect x="10" y="10" width="492" height="492" fill="white"/><text x="40" y="${80+version*20}" font-size="24">Input A → B ${version}</text></svg>`
const routes=(text=false,recraft=false)=>({main:{accessProvider:text?'deepseek':'openai',modelId:text?'deepseek-v4-pro':'gpt-5.6-sol'},vision:{accessProvider:'openai',modelId:'gpt-4.1'},image:{accessProvider:recraft?'recraft':'openai',modelId:recraft?'recraftv4_1_vector':'gpt-image-2'}})
const body=(extra:Record<string,any>={})=>({action:'createJob',configurationMode:'advanced',provider:'openai',apiKeys:{openai:'fixture-main',deepseek:'fixture-deepseek',recraft:'fixture-vector'},modelRoutes:routes(),methodContent:'Input A connects to B with value 35. Preserve scientific label ATP.',caption:'A directed method overview.',negativePrompt:'Never invent measurements.',infographicCategory:'method',outputFormat:'svg',visionMode:'none',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1,aspectRatio:'1:1',imageSize:'1K',...extra})
function userText(wire:any) {
  if(typeof wire.input==='string')return wire.input
  return [...(wire.input || []),...(wire.messages || [])].filter((m:any)=>m.role==='user').flatMap((m:any)=>typeof m.content==='string'?[m.content]:m.content.filter((p:any)=>p.type==='input_text'||p.type==='text').map((p:any)=>p.text)).join('\n')
}
function images(wire:any) {
  return [...(Array.isArray(wire.input)?wire.input:[]),...(wire.messages || [])].flatMap((m:any)=>Array.isArray(m.content)?m.content:[]).filter((p:any)=>p.type==='input_image'||p.type==='image_url').map((p:any)=>typeof p.image_url==='string'?p.image_url:p.image_url.url)
}
function mock(r:any,{revisions=0,invalid='',failGeneration=0,lostGeneration=0,source=''}:{revisions?:number;invalid?:string;failGeneration?:number;lostGeneration?:number;source?:string}={}) {
  const calls:any[]=[];let generated=0,reviewed=0
  r.legacy.configureRuntimeFetch(async(url:any,init:any={})=>{
    url=String(url)
    if(url.endsWith('/models'))return Response.json({data:[]})
    if(url.startsWith(r.baseUrl+'/objects/')) {const o=r.objects.get(decodeURIComponent(url.slice((r.baseUrl+'/objects/').length)));return new Response(o?.bytes || '',{status:o?200:404,headers:{'Content-Type':o?.mimeType || 'image/png'}})}
    const wire=JSON.parse(String(init.body)),all=JSON.stringify(wire)
    const kind=url.includes('/images/')?'recraft':all.includes('SVG visual AND code review')?'review':all.includes('visual observer assisting')?'observer':all.includes('SVG Diagram Agent')?'svg':'plan'
    calls.push({kind,url,wire})
    let content='COMPLETE PLAN: Input A connects to B, value 35, label ATP, leave margins and preserve direction.'
    if(kind==='svg'||kind==='recraft') {
      generated++
      if(generated===lostGeneration)throw new TypeError('fetch failed')
      if(generated===failGeneration)return Response.json({error:{message:'Generation failed deliberately'}},{status:400})
      content=source || svg(generated)
      if(kind==='recraft')return Response.json({data:[{b64_json:Buffer.from(content).toString('base64')}]})
    } else if(kind==='observer')content=JSON.stringify({content:'Visible Input A → B',actual_text:['Input A','B'],layout:'left-to-right',connections:['A → B'],problems:[],suggestions:[],uncertainties:[]})
    if(kind==='observer' && invalid==='empty-observer')content=JSON.stringify({problems:[],suggestions:[],uncertainties:[]})
    else if(kind==='review') {
      reviewed++
      const ctx=JSON.parse(userText(wire)),issues=reviewed<=revisions
      const finding={issue:'Label overlap',location:'node B',evidence:'The label touches the arrow',suggestion:'Move label above the arrow'}
      content=JSON.stringify({version:ctx.version,svgHash:ctx.svgHash,visual:{status:issues?'issues_found':'passed',findings:issues?[finding]:[]},code:{status:'passed',findings:[]},uncertainties:[],revised_description:issues?'FULL REVISED PLAN: Keep A → B, value 35 and ATP; move label above arrow; retain all nodes, margins and grouping.':'No changes needed.'})
      if(invalid==='stale')content=content.replace(ctx.svgHash,'0'.repeat(64))
      if(invalid==='missing-code') {const parsed=JSON.parse(content);delete parsed.code;content=JSON.stringify(parsed)}
      if(invalid==='empty')content=''
    }
    return Response.json({output_text:content,choices:[{message:{content}}]})
  })
  return calls
}
async function create(r:any,payload:any) {
  const accepted=await r.post(payload);assert.equal(accepted.data.code,0,JSON.stringify(accepted))
  await r.legacy.drainJobAdmission()
  return (await r.post({action:'getJob',jobId:accepted.data.jobId})).data.job
}
function delivered(r:any,job:any) {return r.objects.get(job.resultImages[0].objectKey).bytes}
const galleryReference=CURATED_REFERENCES.find((row:any)=>row.id==='journal_pcbi.1009809.g002')!
async function galleryBytes() {
  assert.ok(galleryReference, 'the fixture must be in the licensed catalogue')
  const bytes=await readFile(new URL('../assets/reference-library/'+path.basename(galleryReference.assets.large.path),import.meta.url))
  assert.equal(hash(bytes),galleryReference.assets.large.sha256)
  return bytes
}

async function evidence(name:string,r:any,job:any,calls:any[]) {
  const root=process.env.SVG_WORKFLOW_EVIDENCE_DIR
  if(!root)return
  const dir=path.join(root,name);await mkdir(dir,{recursive:true})
  const images:any[]=[]
  for(const [key,value] of r.objects) if(key.includes(job.id || job._id)) {
    const file=path.basename(key);await writeFile(path.join(dir,file),value.bytes)
    images.push({file,mimeType:value.mimeType,sha256:hash(value.bytes)})
  }
  const trace={scenario:name,simulated:true,realModelEffectsVerified:false,job,artifacts:images,requests:calls}
  await writeFile(path.join(dir,'requests-and-evidence.json'),JSON.stringify(trace,(_key,value)=>{
    if(typeof value==='string' && /^data:image\/[^;]+;base64,/.test(value)) {const bytes=Buffer.from(value.split(',')[1],'base64');return {mediaType:value.slice(5,value.indexOf(';')),bytes:bytes.length,sha256:hash(bytes)}}
    return value
  },2)+'\n')
}

test('one SVG round inspects v1 pixels and full code then generates v2, never secretly re-reviews',async()=>{
  const r=await createRefineRuntime()
  try {
    const calls=mock(r,{revisions:10}),job=await create(r,body())
    assert.equal(job.status,'succeeded',job.error)
    assert.deepEqual(calls.map(c=>c.kind),['plan','svg','review','svg'])
    assert.match(userText(calls[0].wire),/svgRenderingConstraints/)
    assert.match(userText(calls[1].wire),/zero shadow\/filter\/mask\/pattern\/clipPath/)
    await evidence('ordinary-one-round-revision',r,job,calls)
    const review=job.resultImages[0].review,wire=calls[2].wire,ctx=JSON.parse(userText(wire))
    assert.equal(ctx.fullSvgCode,svg(1));assert.match(ctx.methodology,/ATP/);assert.match(ctx.avoid,/Never invent/)
    assert.equal(ctx.svgHash,hash(svg(1)))
    const png=Buffer.from(images(wire)[0].split(',')[1],'base64')
    assert.equal(hash(png),review.history[0].submittedImageHash)
    const render=job.stages.find((s:any)=>s.title==='SVG v1 实际渲染')
    assert.equal(hash(r.objects.get(render.image.filename)!.bytes),review.history[0].pngHash)
    assert.equal(review.status,'modified_unreviewed');assert.equal(review.roundsUsed,1)
    assert.equal(review.deliveredVersion,2);assert.equal(review.reviewedVersion,1)
    assert.equal(review.deliveredSvgHash,hash(delivered(r,job)));assert.notEqual(review.deliveredSvgHash,review.reviewedSvgHash)
    assert.match(userText(calls[3].wire),/FULL REVISED PLAN/);assert.match(userText(calls[3].wire),/previousSvg/)
  }finally{await r.close()}
})

test('two SVG rounds with assistant inspect corresponding revisions; main makes code and final decision',async()=>{
  const r=await createRefineRuntime()
  try {
    const calls=mock(r,{revisions:1}),job=await create(r,body({modelRoutes:routes(true),provider:'deepseek',visionMode:'assist',maxCriticRounds:2}))
    assert.equal(job.status,'succeeded',job.error)
    assert.deepEqual(calls.map(c=>c.kind),['plan','svg','observer','review','svg','observer','review'])
    await evidence('assistant-two-rounds',r,job,calls)
    const decisions=calls.filter(c=>c.kind==='review'),observers=calls.filter(c=>c.kind==='observer')
    for(let i=0;i<2;i++) {
      const ctx=JSON.parse(userText(decisions[i].wire))
      assert.equal(ctx.fullSvgCode,svg(i+1));assert.match(ctx.auxiliaryVisualReport,/Input A/)
      assert.equal(images(decisions[i].wire).length,0);assert.equal(images(observers[i].wire).length,1)
      assert.equal(JSON.parse(userText(observers[i].wire)).fullSvgCode,undefined)
      assert.equal(hash(Buffer.from(images(observers[i].wire)[0].split(',')[1],'base64')),job.resultImages[0].review.history[i].submittedImageHash)
    }
    assert.notEqual(images(observers[0].wire)[0],images(observers[1].wire)[0])
    const review=job.resultImages[0].review
    assert.equal(review.status,'passed',JSON.stringify(review));assert.equal(review.deliveredVersion,2);assert.equal(review.reviewedVersion,2)
    assert.equal(review.reviewedSvgHash,hash(delivered(r,job)))
  }finally{await r.close()}
})

test('zero/basic reviews and five full SVG rounds obey exact generation and inspection budgets',async()=>{
  const r=await createRefineRuntime()
  try {
    for(const [pipelineMode,rounds,actual] of [['planner_critic',0,0],['vanilla',5,0],['planner_critic',5,5]] as const) {
      const calls=mock(r,{revisions:9}),job=await create(r,body({pipelineMode,maxCriticRounds:rounds}))
      assert.equal(job.status,'succeeded',job.error)
      assert.equal(calls.filter(c=>c.kind==='review').length,actual)
      assert.equal(calls.filter(c=>c.kind==='svg').length,actual+1)
      assert.equal(job.resultImages[0].review.status,actual?'modified_unreviewed':'not_requested')
      assert.equal(job.resultImages[0].review.deliveredVersion,actual+1)
    }
  }finally{await r.close()}
})

test('stale, incomplete and failed SVG checks never pass; failed revisions retain inspected problem version',async()=>{
  const r=await createRefineRuntime()
  try {
    for(const invalid of ['stale','missing-code','empty']) {
      const calls=mock(r,{invalid}),job=await create(r,body())
      assert.equal(job.status,'succeeded',job.error);assert.equal(job.resultImages[0].review.status,'review_failed')
      assert.equal(job.resultImages[0].review.deliveredVersion,1);assert.equal(calls.length,3)
    }
    const calls=mock(r,{revisions:1,failGeneration:2}),job=await create(r,body())
    assert.equal(job.resultImages[0].review.status,'issues_found')
    assert.equal(job.resultImages[0].review.deliveredSvgHash,job.resultImages[0].review.reviewedSvgHash)
    assert.equal(job.resultImages[0].review.history[0].status,'issues_found');assert.equal(calls.length,4)
  }finally{await r.close()}
})

test('SVG and basic gallery tasks block without vision; basic references contain title, description and real pixels',async()=>{
  const r=await createRefineRuntime()
  try {
    const bytes=await galleryBytes()
    for(const extra of [{},{pipelineMode:'vanilla',retrievalSetting:'manual',manualReferenceIds:[galleryReference.id]}]) {
      const calls=mock(r),rejected=await r.post(body({...extra,modelRoutes:routes(true),provider:'deepseek'}))
      assert.equal(rejected.data.businessCode,'WORKFLOW_VISION_REQUIRED');assert.equal(calls.length,0)
    }
    for(const text of [true,false]) {
      const calls=mock(r),job=await create(r,body({modelRoutes:routes(text),provider:text?'deepseek':'openai',visionMode:'assist',pipelineMode:'vanilla',retrievalSetting:'manual',manualReferenceIds:[galleryReference.id]}))
      assert.equal(job.status,'succeeded',job.error)
      assert.deepEqual(calls.map(c=>c.kind),text?['observer','plan','svg']:['plan','svg'])
      await evidence(text?'basic-library-assistant':'basic-library-direct',r,job,calls)
      const reader=calls.find(c=>c.kind===(text?'observer':'plan'))
      assert.ok(userText(reader.wire).includes(galleryReference.title));assert.ok(userText(reader.wire).includes(galleryReference.summary))
      assert.equal(images(reader.wire).length,1)
      const image=Buffer.from(images(reader.wire)[0].split(',')[1],'base64')
      assert.deepEqual(await sharp(image).raw().toBuffer(),await sharp(bytes).raw().toBuffer())
      if(text)assert.match(userText(calls.find(c=>c.kind==='plan').wire),/Visible Input A/)
    }
  }finally{await r.close()}
})

test('an unrenderable generated SVG reports a local render failure with no hidden paid repair',async()=>{
  const r=await createRefineRuntime()
  try {
    const calls=mock(r,{source:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><filter id="shadow"><feGaussianBlur stdDeviation="2"/></filter></defs><rect width="100" height="100" filter="url(#shadow)"/></svg>'})
    const job=await create(r,body())
    assert.equal(job.status,'failed')
    assert.deepEqual(calls.map(c=>c.kind),['plan','svg'])
    assert.equal(job.failure.stage,'rendering');assert.equal(job.failure.code,'SVG_RENDER_FAILED');assert.equal(job.failure.requestState,'not_sent');assert.equal(job.failure.billingStatus,'prior_calls');assert.notEqual(job.recovery?.action,'review_request')
    assert.equal(job.failure.requestState,'not_sent');assert.equal(job.failure.billingStatus,'prior_calls')
    assert.match(job.error,/SVG 已生成.*本地格式或渲染/)
    assert.ok(job.stages.some((s:any)=>s.title==='SVG v1 渲染失败'))
  }finally{await r.close()}
})

test('Recraft receives full context, actual style refs, then the exact previous raster on revision',async()=>{
  const r=await createRefineRuntime()
  try {
    await galleryBytes()
    const calls=mock(r,{revisions:1}),job=await create(r,body({modelRoutes:routes(false,true),retrievalSetting:'manual',manualReferenceIds:[galleryReference.id]}))
    assert.equal(job.status,'succeeded',job.error)
    assert.deepEqual(calls.map(c=>c.kind),['plan','recraft','review','recraft'])
    await evidence('recraft-reference-revision',r,job,calls)
    const requests=calls.filter(c=>c.kind==='recraft'),first=requests[0],second=requests[1]
    assert.match(first.url,/\/generations$/);assert.equal(first.wire.style_reference_urls.length,1)
    const referenceBytes=Buffer.from(first.wire.style_reference_urls[0].split(',')[1],'base64')
    assert.deepEqual(await sharp(referenceBytes).raw().toBuffer(),await sharp(await galleryBytes()).raw().toBuffer())
    const initial=JSON.parse(first.wire.prompt)
    assert.equal(initial.originalMethodology,body().methodContent);assert.equal(initial.targetCaption,body().caption)
    assert.match(initial.completeDrawingPlan,/COMPLETE PLAN/);assert.match(initial.mustPreserve,/fact.*label/);assert.match(initial.avoid.join(' '),/Never invent/)
    assert.equal(initial.figureType,'method');assert.equal(initial.aspectRatio,'1:1');assert.ok(initial.referenceContext.includes(galleryReference.title));assert.ok(initial.referenceContext.includes(galleryReference.summary))
    assert.match(second.url,/imageToImage$/);assert.equal(second.wire.style_reference_urls,undefined)
    const original=job.stages.find((s:any)=>s.title==='SVG v1 实际渲染')
    assert.equal(second.wire.image_url,'data:image/png;base64,'+r.objects.get(original.image.filename)!.bytes.toString('base64'))
    assert.match(second.wire.prompt,/FULL REVISED PLAN/);assert.match(second.wire.prompt,/Label overlap/)
    assert.equal(second.wire.model,first.wire.model)
    assert.equal(job.resultImages[0].review.status,'modified_unreviewed')
    assert.ok(job.stages.some((s:any)=>/不同时重传/.test(s.text)))
  }finally{await r.close()}
})

test('fixed compiler contract never leaks into general SVG or an explicitly native typed Recraft route',async()=>{
 const r=await createRefineRuntime()
 try{for(const native of [false,true]){
  const calls=mock(r),job=await create(r,body(native?{figureTypeId:'workflow',figureSpecVersion:TAXONOMY_VERSION,modelRoutes:routes(false,true)}:{}))
  assert.equal(job.status,'succeeded',job.error);assert.equal(job.resultImages[0].review.status,'passed');assert.equal(job.resultImages[0].review.rendererAudit,undefined)
  assert.deepEqual(calls.map(c=>c.kind),native?['plan','recraft','review']:['plan','svg','review'])
  for(const call of calls)assert.doesNotMatch(JSON.stringify(call.wire),/elkjs-0\.12\.0-topology-v1|FIXED RENDERER REQUIREMENT AUDIT|Diagram Topology Agent/)
 }}finally{await r.close()}
})

test('Recraft rejects incomplete capability, excessive context/count/dimensions before its request',async()=>{
  assert.throws(()=>recraftSvgRequest('recraftv4_1_flash','p','1:1'),/尚未适配/)
  assert.throws(()=>recraftSvgRequest('recraftv3_vector','x'.repeat(1001),'1:1'),/未截断/)
  assert.throws(()=>recraftSvgRequest('recraftv4_1_vector','p','1:1',Array(11).fill('url')),/10/)
  const v2=recraftSvgRequest('recraftv2_vector','p','1:1',['original'],'previous')
  assert.match(v2.endpoint,/generations$/);assert.deepEqual(v2.body.style_reference_urls,['original','previous'])
  const r=await createRefineRuntime()
  try {
    const calls=mock(r),response=await r.post(body({modelRoutes:routes(false,true),methodContent:'x'.repeat(10000)}))
    assert.equal(response.data.businessCode,'RECRAFT_CONTEXT_UNSUPPORTED');assert.equal(calls.length,0)
    await assert.rejects((r.legacy as any).callRecraftSvg('recraftv4_1_vector','fixture','complete plan','1:1',[{mimeType:'image/png',url:'data:image/png;base64,'+r.image.toString('base64')}]),/256/)
    assert.equal(calls.length,0)
  }finally{await r.close()}
})

test('contradictory decision and missing evidence fail closed',()=>{
  const valid={version:1,svgHash:'abc',visual:{status:'passed',findings:[]},code:{status:'passed',findings:[]},uncertainties:[],revised_description:'No changes needed.'}
  assert.equal(parseSvgDecision(JSON.stringify(valid),1,'abc').passed,true)
  assert.throws(()=>parseSvgDecision(JSON.stringify({...valid,revised_description:'Move the overlapping ATP label above B.'}),1,'abc'),/矛盾/)
  assert.throws(()=>parseSvgDecision(JSON.stringify({...valid,visual:{status:'passed',findings:[{}]}}),1,'abc'),/矛盾/)
  assert.throws(()=>parseSvgDecision(JSON.stringify({...valid,uncertainties:['cannot read label']}),1,'abc'),/优化方案/)
  const uncertainty={item:'Formula',detail:'Subscript is unclear in the raster',resolution:'Use a larger explicit subscript'}
  const structured=parseSvgDecision(JSON.stringify({...valid,uncertainties:[uncertainty],revised_description:'Complete plan: retain all three nodes and arrows; enlarge the formula subscript.'}),1,'abc')
  assert.equal(structured.passed,false);assert.deepEqual(JSON.parse(structured.assessment).uncertainties,[uncertainty])
  for(const bad of [{},'',{item:'Formula'}])assert.throws(()=>parseSvgDecision(JSON.stringify({...valid,uncertainties:[bad]}),1,'abc'),/不确定项/)
})


test('unknown revision submission preserves the inspected SVG in results and stops all later calls',async()=>{
  const r=await createRefineRuntime()
  try {
    const calls=mock(r,{revisions:1,lostGeneration:2}),job=await create(r,body({maxCriticRounds:3}))
    assert.equal(job.status,'failed');assert.equal(job.resultImages.length,1)
    assert.equal(job.resultImages[0].review.status,'issues_found');assert.equal(job.resultImages[0].review.deliveredVersion,1)
    assert.equal(hash(delivered(r,job)),hash(svg(1)))
    assert.deepEqual(calls.map(c=>c.kind),['plan','svg','review','svg'])
  }finally{await r.close()}
})

test('empty auxiliary observations cannot certify SVG quality',async()=>{
  const r=await createRefineRuntime()
  try {
    const calls=mock(r,{invalid:'empty-observer'}),job=await create(r,body({visionMode:'assist'}))
    assert.equal(job.status,'succeeded',job.error);assert.equal(job.resultImages[0].review.status,'review_failed')
    assert.deepEqual(calls.map(c=>c.kind),['plan','svg','observer'])
  }finally{await r.close()}
})

test('safe internal xlink references survive generation and actual rendering unchanged',async()=>{
  const r=await createRefineRuntime()
  try {
    const source='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512"><defs><rect id="node" width="100" height="100"/></defs><use xlink:href="#node" x="20" y="20"/></svg>'
    mock(r,{source})
    const job=await create(r,body({maxCriticRounds:0}))
    assert.equal(job.status,'succeeded',job.error);assert.equal(delivered(r,job).toString('utf8'),source)
  }finally{await r.close()}
})


test('portrait SVG planning requests a bounded canvas preserving 1:4 ratio',async()=>{
  const r=await createRefineRuntime()
  try {
    const calls=mock(r,{source:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 1600"><rect width="400" height="1600" fill="white"/></svg>'})
    const job=await create(r,body({aspectRatio:'1:4',maxCriticRounds:0}))
    assert.equal(job.status,'succeeded',job.error)
    assert.match(userText(calls.find(c=>c.kind==='svg').wire),/viewBox="0 0 400 1600"/)
    const raster=job.stages.find((s:any)=>s.title==='SVG v1 实际渲染')
    const dimensions=await sharp(r.objects.get(raster.image.filename)!.bytes).metadata()
    assert.equal(dimensions.width,400);assert.equal(dimensions.height,1600)
  }finally{await r.close()}
})


test('basic direct image understanding ignores inactive vision drafts for signed-in users and rejects anonymous submissions',async()=>{
  const r=await createRefineRuntime({tokenDance:true})
  try {
    await galleryBytes()
    for(const vision of [{accessProvider:'custom',modelId:'draft'},{accessProvider:'tokendance',modelId:'qwen3.8-flash'}]) {
      const calls=mock(r),payload=body({pipelineMode:'vanilla',visionMode:'assist',retrievalSetting:'manual',manualReferenceIds:[galleryReference.id],modelRoutes:{...routes(),vision}})
      const anonymous=await r.post(payload,'anonymous');assert.equal(anonymous.status,401);assert.equal(calls.length,0)
      const accepted=await r.post(payload);assert.equal(accepted.data.code,0,JSON.stringify(accepted))
      await r.legacy.drainJobAdmission()
      assert.deepEqual(calls.map(c=>c.kind),['plan','svg'])
      assert.equal(images(calls[0].wire).length,1)
    }
    const calls=mock(r)
    const rejected=await r.post(body({provider:'deepseek',pipelineMode:'vanilla',visionMode:'assist',retrievalSetting:'manual',manualReferenceIds:[galleryReference.id],referenceImageMode:'main_model',modelRoutes:{...routes(true),vision:{accessProvider:'tokendance',modelId:'qwen3.8-flash'}}}),'anonymous')
    assert.notEqual(rejected.data.code,0);assert.equal(calls.length,0)
  }finally{await r.close()}
})
