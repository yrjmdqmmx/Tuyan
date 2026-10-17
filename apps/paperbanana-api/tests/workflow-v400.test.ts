import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'
import { validateWorkflowCounts, workflowVisionRequirements, workflowVisionError, workflowRequiredRoles } from '../../../packages/api/src/workflow.js'
import { referenceGenerationSupport } from '../../../packages/api/src/reference-generation.js'

const routes = (main = 'gpt-5.6-sol') => ({main:{accessProvider:main.startsWith('deepseek')?'deepseek':'openai',modelId:main}, image:{accessProvider:'openai',modelId:'gpt-image-2'}, vision:{accessProvider:'openai',modelId:'gpt-4.1'}})
const body = (override:Record<string,any>={}) => ({action:'createJob',provider:'openai',configurationMode:'advanced',apiKeys:{openai:'fixture-openai',deepseek:'fixture-deepseek'},modelRoutes:routes(),visionMode:'assist',methodContent:'Input module A connects to processing module B and output C. Preserve values 12 and 35.',caption:'A three-stage workflow.',negativePrompt:'No invented numerical values.',infographicCategory:'method',outputFormat:'png',imageSize:'1K',aspectRatio:'1:1',pipelineMode:'planner_critic',retrievalSetting:'none',numCandidates:1,maxCriticRounds:1,...override})

test('workflow boundaries reject coercion and preserve zero; all vision paths are role-aware',()=>{
  assert.deepEqual(validateWorkflowCounts({}),{numCandidates:1,maxCriticRounds:1})
  assert.deepEqual(validateWorkflowCounts({numCandidates:6,maxCriticRounds:0}),{numCandidates:6,maxCriticRounds:0})
  assert.deepEqual(validateWorkflowCounts({numCandidates:1,maxCriticRounds:5}),{numCandidates:1,maxCriticRounds:5})
  for(const value of [0,7,1.5,NaN,null,'6',true])assert.throws(()=>validateWorkflowCounts({numCandidates:value}))
  for(const value of [-1,6,0.5,NaN,null,'0',false])assert.throws(()=>validateWorkflowCounts({maxCriticRounds:value}))
  assert.match(workflowVisionRequirements(body({outputFormat:'svg'})).join(''),/实际画面和完整代码/)
  assert.deepEqual(workflowVisionRequirements(body({maxCriticRounds:0})),[])
  assert.deepEqual(workflowRequiredRoles(body({visionMode:'none'})),['main','image'])
  assert.deepEqual(workflowRequiredRoles(body({action:'refineImage',visionMode:'none'})),['main','image'])
  assert.match(workflowVisionError(body({visionMode:'none'}),'unknown','supported'),/尚未确认/)
})

const pngHash = (bytes:Buffer) => createHash('sha256').update(bytes).digest('hex')
function userText(wire:any) {
  if(typeof wire.input==='string')return wire.input
  return [...(wire.input || []),...(wire.messages || [])].filter((message:any)=>message.role==='user').flatMap((message:any)=>typeof message.content==='string'?[message.content]:message.content.filter((part:any)=>part.type==='input_text'||part.type==='text').map((part:any)=>part.text)).join('\n')
}
function imageUrls(wire:any) {
  return [...(Array.isArray(wire.input)?wire.input:[]),...(wire.messages || [])].flatMap((message:any)=>Array.isArray(message.content)?message.content:[]).filter((part:any)=>part.type==='input_image'||part.type==='image_url').map((part:any)=>typeof part.image_url==='string'?part.image_url:part.image_url.url)
}
function generationContext(prompt:string) {
  const separator='\n\ncompletePlan (full original text):\n',start=prompt.indexOf('{'),boundary=prompt.indexOf(separator,start)
  assert.ok(start>=0 && boundary>start,'image requests must contain complete JSON context followed by the unescaped drawing plan')
  return {...JSON.parse(prompt.slice(start,boundary)),completePlan:prompt.slice(boundary+separator.length)}
}
function stub(r:any, {revise=false,failImage=0,invalidReview=false,onImage,pngObservation,pngDecision,imageOutputs}:{revise?:boolean;failImage?:number;invalidReview?:boolean;onImage?:(index:number)=>Promise<void>;pngObservation?:string;pngDecision?:(decision:any,context:any)=>any;imageOutputs?:Buffer[]}={}) {
  const calls:any[]=[]
  let images=0
  r.legacy.configureRuntimeFetch(async(input:any,init:any={})=>{
    const url=String(input)
    if(url.endsWith('/models'))return Response.json({data:[]})
    if(url==='http://plot-fixture.invalid/render')return Response.json({ok:true,image_base64:r.output.toString('base64')})
    if(url.includes('/images/')) {
      images++
      const wire=init.body instanceof FormData?Object.fromEntries(init.body.entries()):JSON.parse(String(init.body))
      calls.push({kind:'image',url,wire})
      await onImage?.(images)
      if(images===failImage)return Response.json({error:{message:'deliberate candidate render failure'}},{status:400})
      return Response.json({data:[{b64_json:(imageOutputs?.[images-1] || r.output).toString('base64')}]})
    }
    const wire=JSON.parse(String(init.body)), text=JSON.stringify(wire)
    const kind=text.includes('visual observer assisting')?'observation':text.includes('Decide whether the current candidate')?'decision':text.includes('SVG Diagram Agent')?'svg':'plan'
    calls.push({kind,url,wire})
    let content:string
    if(kind==='observation' && text.includes('attached current PNG'))content=pngObservation ?? JSON.stringify({content:'OBSERVATION: modules A, B and C with values 12 and 35.',actual_text:['A','B','C','12','35'],layout:'Three connected modules from left to right.',connections:['A → B','B → C'],problems:revise?[{issue:'Label overlaps arrow',location:'module B',evidence:'B label and arrow occupy the same region',suggestion:'Move B above the arrow'}]:[],suggestions:[],uncertainties:[]})
    else if(kind==='decision' && text.includes('PNG visual review')) {
      const context=JSON.parse(userText(wire))
      const decision={visualAdjudications:(context.auxiliaryVisualIssues||[]).map((item:any)=>({id:item.id,decision:revise?'accept':'reject',reason:'Explicit synthetic observer assessment',evidence:'Mocked current label B and arrow positions'})),version:context.version,pngHash:context.pngHash,visual:{status:revise?'issues_found':'passed',findings:revise?[{issue:'MAIN_DECISION: label B overlaps its arrow',location:'module B',evidence:'The current image shows the overlap',suggestion:'Move B above the arrow'}]:[]},uncertainties:[],revised_description:revise?'MAIN_REVISED_PLAN: Preserve values 12 and 35, move B label above the arrow.':'No changes needed.'}
      content=invalidReview?'':JSON.stringify(pngDecision?pngDecision(decision,context):decision)
    } else content=kind==='observation'?'OBSERVATION: label B overlaps arrow; visible values are 12 and 35.':kind==='decision'?invalidReview?'':JSON.stringify({critic_suggestions:'MAIN_DECISION',revised_description:revise?'MAIN_REVISED_PLAN: Preserve values 12 and 35, move B label above the arrow.':'No changes needed.'}):kind==='svg'?'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="10" height="10"/></svg>':'MAIN_COMPLETE_PLAN: A, B and C with labels and a connecting arrow; values 12 and 35.'
    return Response.json({output_text:content,choices:[{message:{content}}]})
  })
  return calls
}
async function create(r:any,payload:any) {
  const response=await r.post(payload)
  assert.equal(response.data.code,0,JSON.stringify(response))
  await r.legacy.drainJobAdmission()
  return (await r.post({action:'getJob',jobId:response.data.jobId})).data.job
}
async function upload(r:any) {
  const prepared=(await r.post({action:'prepareReferenceUpload',files:[{filename:'reference.png',mimeType:'image/png',size:r.image.length}]})).data
  assert.equal(prepared.code,0)
  for(const file of prepared.uploads)await fetch(file.uploadUrl,{method:'PUT',headers:{'Content-Type':'image/png'},body:r.image})
  assert.equal((await r.post({action:'finalizeReferenceUpload',uploads:prepared.uploads})).data.code,0)
  return prepared.uploads
}

test('all main capability × optional vision combinations reject before inference or observe then main decides',async()=>{
  const r=await createRefineRuntime()
  try {
    for(const mainSupports of [true,false])for(const visionMode of ['none','assist']) {
      const calls=stub(r), main=mainSupports?'gpt-5.6-sol':'deepseek-v4-pro'
      const payload=body({provider:mainSupports?'openai':'deepseek',modelRoutes:routes(main),visionMode})
      if(!mainSupports && visionMode==='none') {
        const rejected=await r.post(payload)
        assert.equal(rejected.data.code,400)
        assert.equal(rejected.data.businessCode,'WORKFLOW_VISION_REQUIRED')
        assert.match(rejected.data.error,/视觉评审/)
        assert.equal(calls.length,0)
      } else {
        const job=await create(r,payload)
        assert.equal(job.status,'succeeded',job.error)
        assert.deepEqual(calls.map(c=>c.kind),visionMode==='assist'?['plan','image','observation','decision']:['plan','image','decision'])
        const decision=calls.find(c=>c.kind==='decision')
        assert.match(JSON.stringify(decision.wire),/No invented numerical values/)
        assert.match(JSON.stringify(decision.wire),/completePlan|resolution|outputFormat/)
        if(visionMode==='assist')assert.match(JSON.stringify(decision.wire),/OBSERVATION/)
        else assert.match(JSON.stringify(decision.wire),/data:image\/png;base64/)
        assert.equal(job.resultImages[0].review.status,'passed')
        assert.equal(job.resultImages[0].review.deliveredVersion,1)
        assert.equal(job.resultImages[0].review.reviewedVersion,1)
        assert.equal(job.resultImages[0].review.deliveredPngHash,pngHash(r.output))
        assert.equal(job.resultImages[0].review.reviewedPngHash,pngHash(r.output))
        assert.equal(job.resultImages[0].review.history[0].status,'passed')
      }
    }
  } finally {await r.close()}
})

test('uploaded references need vision even with zero reviews; SVG review also requires vision',async()=>{
  const r=await createRefineRuntime()
  try {
    const uploads=await upload(r)
    for(const mainSupports of [true,false])for(const visionMode of ['none','assist']) {
      const calls=stub(r), main=mainSupports?'gpt-5.6-sol':'deepseek-v4-pro'
      const payload=body({provider:mainSupports?'openai':'deepseek',modelRoutes:routes(main),visionMode,referenceImages:uploads,maxCriticRounds:0})
      if(!mainSupports&&visionMode==='none') {
        const result=await r.post(payload);assert.equal(result.data.code,400);assert.match(result.data.error,/上传/);assert.equal(calls.length,0)
      } else {
        const job=await create(r,payload);assert.equal(job.status,'succeeded',job.error)
        const plan=calls.find(c=>c.kind==='plan')
        assert.match(JSON.stringify(plan.wire),visionMode==='assist'?/OBSERVATION/:/data:image\/png;base64/)
        const prompt=calls.find(c=>c.kind==='image').wire.prompt
        const context=generationContext(prompt)
        assert.equal(context.referenceRequirements.uploaded[0].filename,'reference.png')
        if(visionMode==='assist')assert.match(context.referenceAnalysis,/OBSERVATION/)
        assert.equal(calls.filter(c=>c.kind==='decision').length,0)
      }
    }
    const calls=stub(r)
    const svg=await r.post(body({provider:'deepseek',modelRoutes:routes('deepseek-v4-pro'),visionMode:'none',outputFormat:'svg'}))
    assert.equal(svg.data.businessCode,'WORKFLOW_VISION_REQUIRED')
    assert.deepEqual(calls,[])

  }finally{await r.close()}
})

test('full PNG styling receives complete task context without claiming unattached reference images',async()=>{
  const r=await createRefineRuntime()
  try {
    const references=await upload(r),calls=stub(r)
    const job=await create(r,body({pipelineMode:'full',visionMode:'none',referenceImages:references,maxCriticRounds:0,imageSize:'2K'}))
    assert.equal(job.status,'succeeded',job.error)
    const plans=calls.filter(call=>call.kind==='plan')
    assert.equal(plans.length,2)
    assert.equal(imageUrls(plans[0].wire).length,1)
    assert.equal(imageUrls(plans[1].wire).length,0)
    const style=userText(plans[1].wire)
    assert.doesNotMatch(style,/reference images are ATTACHED/)
    const context=JSON.parse(style.slice(style.indexOf('{')))
    assert.equal(context.methodology,body().methodContent)
    assert.equal(context.visualIntent,body().caption)
    assert.equal(context.aspectRatio,'1:1')
    assert.equal(context.resolution,'2K')
    assert.match(context.completePlan,/MAIN_COMPLETE_PLAN/)
  }finally{await r.close()}
})

for(const rounds of [1,5])test(`${rounds} reviews bind each image version and send its prior image with complete context, without a hidden final review`,async()=>{
  const r=await createRefineRuntime()
  try {
    const outputs=await Promise.all(Array.from({length:rounds+1},(_,index)=>sharp({create:{width:1024,height:1024,channels:4,background:{r:100+index*20,g:140,b:180,alpha:1}}}).png().toBuffer()))
    const calls=stub(r,{revise:true,imageOutputs:outputs})
    const payload=body({maxCriticRounds:rounds,methodContent:'ORIGINAL_REQUIREMENT: Preserve values 12 and 35 and label ORIGINAL_ONLY_LABEL.',caption:'CAPTION_ONLY_SENTINEL: three stages.'})
    const job=await create(r,payload)
    assert.equal(job.status,'succeeded',job.error)
    assert.equal(calls.filter(c=>c.kind==='decision').length,rounds)
    assert.equal(calls.filter(c=>c.kind==='observation').length,rounds)
    const images=calls.filter(c=>c.kind==='image')
    assert.equal(images.length,rounds+1)
    for(const call of images) {
      const context=generationContext(call.wire.prompt)
      assert.equal(context.originalRequest,payload.methodContent)
      assert.equal(context.originalRequest,payload.methodContent);assert.equal(context.methodology,undefined,'byte-identical source is represented once')
      assert.equal(context.visualIntent,payload.caption)
      assert.equal(context.figureType,payload.infographicCategory)
      assert.equal(context.aspectRatio,payload.aspectRatio)
      assert.equal(context.resolution,payload.imageSize)
      assert.equal(context.outputFormat,'png')
      assert.equal(context.avoid,payload.negativePrompt)
      assert.match(context.completePlan,/MAIN_(COMPLETE|REVISED)_PLAN/)
      assert.ok(!context.completePlan.includes('ORIGINAL_ONLY_LABEL'),'the original requirement must survive an incomplete model plan')
    }
    for(const [index,call] of images.slice(1).entries()) {
      assert.equal(call.url,'https://api.openai.com/v1/images/edits')
      const blob=call.wire.image ?? call.wire['image[]']
      assert.deepEqual(Buffer.from(await blob.arrayBuffer()),outputs[index])
      assert.match(call.wire.prompt,/MAIN_REVISED_PLAN/)
      assert.match(call.wire.prompt,/not an immutable edit base/)
      assert.match(generationContext(call.wire.prompt).revisionRequirements,/complete revised plan/)
      assert.doesNotMatch(call.wire.prompt,/MAIN_DECISION/)
      assert.equal(call.wire.model,'gpt-image-2')
    }
    const result=job.resultImages[0], review=result.review
    assert.equal(review.roundsUsed,rounds)
    assert.equal(review.status,'modified_unreviewed')
    assert.equal(review.deliveredVersion,rounds+1)
    assert.equal(review.deliveredPngHash,pngHash(outputs[rounds]))
    assert.equal(review.reviewedVersion,rounds)
    assert.equal(review.reviewedPngHash,pngHash(outputs[rounds-1]))
    assert.deepEqual(review.history.map((entry:any)=>[entry.round,entry.version,entry.pngHash,entry.status]),outputs.slice(0,-1).map((bytes,index)=>[index+1,index+1,pngHash(bytes),'issues_found']))
    for(const [index,call] of calls.filter(c=>c.kind==='observation').entries()) {
      const bytes=Buffer.from(imageUrls(call.wire)[0].split(',')[1],'base64')
      const context=JSON.parse(userText(call.wire))
      assert.equal(context.version,index+1)
      assert.equal(context.pngHash,pngHash(outputs[index]))
      assert.equal(review.history[index].submittedImageHash,pngHash(bytes))
      assert.match(review.history[index].assessment,/MAIN_DECISION/)
      const stage=job.stages.find((item:any)=>item.type==='observation' && item.round===index+1)
      const submittedImage=r.objects.get(stage.image.filename)
      assert.ok(submittedImage,'the exact review image must be persisted')
      assert.deepEqual(submittedImage.bytes,bytes)
    }
    const deliveredImage=r.objects.get(result.objectKey)
    assert.ok(deliveredImage,'the delivered version must exist in storage')
    assert.deepEqual(deliveredImage.bytes,outputs[rounds])
    if(rounds>1)assert.match(JSON.stringify(calls.filter(c=>c.kind==='decision').at(-1)),/previousReview.*MAIN_DECISION/s)
  }finally{await r.close()}
})

test('six candidates persist independently; one render failure leaves completed results visible',async()=>{
  const r=await createRefineRuntime()
  try {
    const calls=stub(r,{failImage:2})
    const job=await create(r,body({numCandidates:6,maxCriticRounds:0,visionMode:'none'}))
    assert.equal(job.status,'failed')
    assert.equal(calls.filter(c=>c.kind==='plan').length,6)
    assert.equal(job.resultImages.length,5)
    assert.deepEqual(job.resultImages.map((i:any)=>i.candidateId),[0,2,3,4,5])
    assert.equal(job.candidateProgress.length,6)
    assert.equal(job.candidateProgress[1].status,'failed')
    assert.ok(job.resultImages.every((i:any)=>i.review.status==='not_requested'))
    for(const bad of [{numCandidates:7},{maxCriticRounds:6},{numCandidates:0},{maxCriticRounds:-1}]) {
      const before=calls.length
      assert.equal((await r.post(body(bad))).data.code,400)
      assert.equal(calls.length,before)
    }
  }finally{await r.close()}
})

test('refinement always sends observation to main then executes the main plan; none + text main rejects',async()=>{
  const r=await createRefineRuntime()
  try {
    stub(r)
    const original=await create(r,body({maxCriticRounds:0}))
    for(const mainSupports of [true,false])for(const visionMode of ['none','assist']) {
      const main=mainSupports?'gpt-5.6-sol':'deepseek-v4-pro', calls=stub(r)
      const payload=body({action:'refineImage',provider:mainSupports?'openai':'deepseek',modelRoutes:routes(main),visionMode,sourceImageObjectKey:original.resultImages[0].objectKey,editInstruction:'Move the label B above its arrow.',imageSize:'1K'})
      if(!mainSupports&&visionMode==='none') {
        assert.equal((await r.post(payload)).data.code,400);assert.equal(calls.length,0)
      } else {
        const job=await create(r,payload);assert.equal(job.status,'succeeded',job.error)
        assert.deepEqual(calls.map(c=>c.kind),visionMode==='assist'?['observation','plan','image']:['plan','image'])
        const plan=calls.find(c=>c.kind==='plan')
        assert.match(JSON.stringify(plan.wire),/Preserve values 12 and 35/)
        if(visionMode==='assist')assert.match(JSON.stringify(plan.wire),/OBSERVATION/)
        assert.match(calls.at(-1).wire.prompt,/MAIN_COMPLETE_PLAN/)
      }
    }
  }finally{await r.close()}
})

test('reference transport excludes unknown, generation-only and mandatory-mask routes',()=>{
  const entry={selectable:true,roles:['image'],capabilities:{imageGeneration:true,imageEditMode:'direct-edit'}}
  assert.equal(referenceGenerationSupport({accessProvider:'openai',modelId:'gpt-image-2'},entry).status,'supported')
  assert.equal(referenceGenerationSupport({accessProvider:'unknown',modelId:'x'},entry).status,'unknown')
  assert.equal(referenceGenerationSupport({accessProvider:'openai',modelId:'x'},{...entry,capabilities:{imageGeneration:true,imageEditMode:'none'}}).status,'unsupported')
  assert.equal(referenceGenerationSupport({accessProvider:'runware',modelId:'ideogram:4@3'},entry).status,'unsupported')
  assert.equal(referenceGenerationSupport({accessProvider:'tokenhub',modelId:'hy-image-v3.5-preview'},entry).status,'supported')
})


test('unsupported image route regenerates text only with a visible reason and no model switch',async()=>{
  const r=await createRefineRuntime()
  try {
    const calls=stub(r,{revise:true})
    const job=await create(r,body({modelRoutes:{...routes(),image:{accessProvider:'zhipu',modelId:'glm-image'}},apiKeys:{openai:'fixture-openai',zhipu:'fixture-zhipu'}}))
    assert.equal(job.status,'succeeded',job.error)
    const images=calls.filter(c=>c.kind==='image');assert.equal(images.length,2)
    for(const call of images){assert.equal(call.wire.model,'glm-image');assert.equal(call.wire.image,undefined);assert.match(call.url,/bigmodel/)}
    assert.ok(job.stages.some((stage:any)=>stage.type==='reference' && /仅依据文字方案重新生成/.test(stage.text)))
    assert.equal(job.resultImages[0].review.status,'modified_unreviewed')
  }finally{await r.close()}
})

test('disabled observer ignores invalid custom credentials and does not require guest authentication',async()=>{
  const r=await createRefineRuntime()
  try {
    for(const disabled of [{accessProvider:'custom',modelId:'draft',custom:{}},{accessProvider:'tokendance',modelId:'qwen3.8-flash'}]){
      const calls=stub(r)
      const response=await r.post(body({visionMode:'none',modelRoutes:{...routes(),vision:disabled}}),'anonymous')
      assert.equal(response.data.code,0,JSON.stringify(response))
      await r.legacy.drainJobAdmission()
      assert.deepEqual(calls.map(c=>c.kind),['plan','image','decision'])
    }
  }finally{await r.close()}
})

test('review observation normalizes a 4K copy to the chosen vision budget and keeps the full generation image',async()=>{
  const r=await createRefineRuntime()
  try {
    r.output=await sharp({create:{width:4096,height:4096,channels:4,background:'#a8bcc0'}}).png().toBuffer()
    const calls=stub(r,{revise:true})
    const job=await create(r,body({imageSize:'4K',modelRoutes:{...routes(),vision:{accessProvider:'bailian',modelId:'qwen3.8-flash'}},apiKeys:{openai:'fixture-openai',bailian:'fixture-bailian'}}))
    assert.equal(job.status,'succeeded',job.error)
    const observer=calls.find(c=>c.kind==='observation')
    const imagePart=observer.wire.messages.flatMap((m:any)=>Array.isArray(m.content)?m.content:[]).find((part:any)=>part.type==='image_url')
    const url=imagePart.image_url.url
    let observed:Buffer
    if(url.startsWith('data:'))observed=Buffer.from(url.split(',')[1],'base64')
    else {assert.ok(url.startsWith(r.baseUrl+'/objects/'));observed=Buffer.from(await (await fetch(url)).arrayBuffer())}
    const metadata=await sharp(observed).metadata()
    assert.ok(metadata.width! * metadata.height! <= 8000000)
    assert.notEqual(pngHash(observed),pngHash(r.output))
    assert.equal(job.resultImages[0].review.history[0].submittedImageHash,pngHash(observed))
    assert.equal(job.resultImages[0].review.history[0].pngHash,pngHash(r.output))
    const images=calls.filter(c=>c.kind==='image');assert.equal(images.length,2)
    const reference=images[1].wire.image || images[1].wire['image[]']
    assert.deepEqual(Buffer.from(await reference.arrayBuffer()),r.output)
  }finally{await r.close()}
})

test('invalid review never passes, retries or hides the last successful render; native 2K zero-review has no extra enhancement',async()=>{
  const r=await createRefineRuntime()
  try {
    let calls=stub(r,{invalidReview:true})
    const job=await create(r,body())
    assert.equal(job.status,'succeeded',job.error)
    assert.equal(job.resultImages[0].review.status,'review_failed')
    assert.equal(job.resultImages[0].review.roundsUsed,1)
    assert.equal(calls.filter(c=>c.kind==='decision').length,1)
    assert.equal(calls.filter(c=>c.kind==='image').length,1)
    calls=stub(r)
    const noReview=await create(r,body({imageSize:'2K',maxCriticRounds:0}))
    assert.equal(noReview.status,'succeeded',noReview.error)
    assert.deepEqual(calls.map(c=>c.kind),['plan','image'])
    assert.equal(noReview.resultImages[0].review.status,'not_requested')
  }finally{await r.close()}
})

for(const scenario of [
  {name:'stale image hash',pngDecision:(decision:any)=>({...decision,pngHash:'0'.repeat(64)}),error:/版本或图片摘要/,decisions:1},
  {name:'wrong image version',pngDecision:(decision:any)=>({...decision,version:decision.version+1}),error:/版本或图片摘要/,decisions:1},
  {name:'non-JSON observation',pngObservation:'Unable to inspect the current image.',error:/有效 JSON/,decisions:0},
  {name:'unresolved structured uncertainty with no-change verdict',pngDecision:(decision:any)=>({...decision,uncertainties:[{item:'B label',detail:'Unreadable in the image',resolution:'Inspect a legible render'}]}),error:/结论与修改方案矛盾/,decisions:1},
  {name:'passed conclusion with explicit findings',pngDecision:(decision:any)=>({...decision,visual:{status:'passed',findings:[{issue:'Missing required label',location:'module B',evidence:'B has no label',suggestion:'Restore label B'}]}}),error:/结论与问题记录矛盾/,decisions:1},
])test(`PNG rejects ${scenario.name} without retrying or discarding the successful image`,async()=>{
  const r=await createRefineRuntime()
  try {
    const calls=stub(r,scenario)
    const job=await create(r,body({maxCriticRounds:5}))
    assert.equal(job.status,'succeeded',job.error)
    const result=job.resultImages[0],review=result.review
    assert.equal(review.status,'review_failed')
    assert.equal(review.roundsUsed,1)
    assert.equal(review.deliveredVersion,1)
    assert.equal(review.deliveredPngHash,pngHash(r.output))
    assert.equal(review.reviewedVersion,undefined)
    assert.equal(review.history.length,1)
    assert.equal(review.history[0].version,1)
    assert.equal(review.history[0].pngHash,pngHash(r.output))
    assert.equal(review.history[0].status,'review_failed')
    assert.match(review.history[0].error,scenario.error)
    assert.equal(calls.filter(call=>call.kind==='observation').length,1)
    assert.equal(calls.filter(call=>call.kind==='decision').length,scenario.decisions)
    assert.equal(calls.filter(call=>call.kind==='image').length,1)
    const deliveredImage=r.objects.get(result.objectKey)
    assert.ok(deliveredImage,'the successful image must remain available after a rejected review')
    assert.deepEqual(deliveredImage.bytes,r.output)
    assert.match(result.description,/MAIN_COMPLETE_PLAN/)
  }finally{await r.close()}
})

test('PNG revision storage failure delivers the previous image with its own plan and version evidence',async()=>{
  const r=await createRefineRuntime()
  const bucket=(globalThis as any).__refineTestCloud.storage.bucket(),write=bucket.writeFile.bind(bucket)
  let failedWrites=0
  try {
    const revision=await sharp({create:{width:1024,height:1024,channels:4,background:'#eea044'}}).png().toBuffer()
    const calls=stub(r,{revise:true,imageOutputs:[r.output,revision]})
    bucket.writeFile=async(key:string,bytes:Buffer,metadata:any)=>{
      if(key.endsWith('/candidate-0-png-v2.png')){failedWrites++;throw new Error('fixture revision storage unavailable')}
      return write(key,bytes,metadata)
    }
    const job=await create(r,body({maxCriticRounds:5}))
    assert.equal(job.status,'succeeded',job.error)
    assert.equal(failedWrites,1)
    assert.equal(calls.filter(call=>call.kind==='image').length,2)
    assert.equal(calls.filter(call=>call.kind==='decision').length,1)
    const result=job.resultImages[0],review=result.review
    const deliveredImage=r.objects.get(result.objectKey)
    assert.ok(deliveredImage,'the previous image must remain available after revision storage fails')
    assert.deepEqual(deliveredImage.bytes,r.output)
    assert.notEqual(pngHash(r.output),pngHash(revision))
    assert.match(result.description,/MAIN_COMPLETE_PLAN/)
    assert.doesNotMatch(result.description,/MAIN_REVISED_PLAN/)
    assert.equal(review.deliveredVersion,1)
    assert.equal(review.deliveredPngHash,pngHash(r.output))
    assert.equal(review.reviewedVersion,1)
    assert.equal(review.reviewedPngHash,pngHash(r.output))
    assert.equal(review.status,'issues_found')
    assert.match(review.note,/已检查且仍有问题.*重新生成未完成/)
    assert.equal(review.history[0].status,'issues_found')
    assert.match(review.history[0].error,/revision storage unavailable/)
    assert.equal(job.stages.filter((stage:any)=>stage.type==='render').length,1)
  }finally{bucket.writeFile=write;await r.close()}
})

test('completed candidate is public while the next candidate is still rendering; default concurrency remains one',async()=>{
  const r=await createRefineRuntime()
  let release!:()=>void, reached!:()=>void
  const gate=new Promise<void>(resolve=>{release=resolve}), second=new Promise<void>(resolve=>{reached=resolve})
  try {
    const calls=stub(r,{onImage:async n=>{if(n===2){reached();await gate}}})
    const response=await r.post(body({numCandidates:3,maxCriticRounds:0}))
    assert.equal(response.data.code,0)
    await Promise.race([second,new Promise((_,reject)=>setTimeout(()=>reject(new Error('second candidate not reached')),8000))])
    const live=(await r.post({action:'getJob',jobId:response.data.jobId})).data.job
    assert.equal(live.status,'running');assert.equal(live.resultImages.length,1)
    assert.deepEqual(live.candidateProgress.map((p:any)=>p.status),['succeeded','running','queued'])
    assert.equal(calls.filter(c=>c.kind==='image').length,2)
    release();await r.legacy.drainJobAdmission()
    assert.equal((await r.post({action:'getJob',jobId:response.data.jobId})).data.job.resultImages.length,3)
  }finally{release();await r.close()}
})

test('oversize complete Wan prompt is rejected before any image request, without truncation',async()=>{
  const r=await createRefineRuntime()
  try {
    const calls=stub(r)
    await assert.rejects(()=>r.legacy.callImageModel('bailian','wan2.7-image-pro','fixture-bailian','方'.repeat(5001),'1:1','','2K',true),/5000/)
    assert.equal(calls.length,0)
  }finally{await r.close()}
})

test('mixed-provider plot retains image capability and labels actual PNG visual review',async()=>{
  const r=await createRefineRuntime(), old=process.env.PLOT_WORKER_URL
  try {
    process.env.PLOT_WORKER_URL='http://plot-fixture.invalid'
    const calls=stub(r)
    const job=await create(r,body({provider:'deepseek',modelRoutes:routes('deepseek-v4-pro'),taskName:'plot',outputFormat:'svg',imageSize:'2K',visionMode:'none',maxCriticRounds:0}))
    assert.equal(job.status,'succeeded',job.error)
    assert.equal(job.criticMode,'image')
    assert.equal(job.imageRefineMode,'direct-edit')
    assert.equal(job.resultImages[0].mimeType,'image/png')
    const images=calls.filter(c=>c.kind==='image')
    assert.equal(images.length,1)
    assert.equal(images[0].wire.size,'2048x2048')
    assert.ok(images[0].wire.image ?? images[0].wire['image[]'])
    assert.equal(calls.filter(c=>c.kind==='observation'||c.kind==='decision').length,0)
  }finally{if(old===undefined)delete process.env.PLOT_WORKER_URL;else process.env.PLOT_WORKER_URL=old;await r.close()}
})
